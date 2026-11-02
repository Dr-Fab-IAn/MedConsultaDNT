import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  Unsubscribe,
  serverTimestamp
} from 'firebase/firestore';
import { getFirestoreDb, handleFirestoreError, OperationType } from './authService';
import { DntPatient, EstablishmentConfig } from '../types/dnt';
import { UserProfile } from '../types/auth';

export type RealtimeSyncStatus = 'connected' | 'syncing' | 'offline' | 'error';

export interface RealtimeListenerCallbacks {
  onPatientsUpdate: (patients: DntPatient[]) => void;
  onStatusChange: (status: RealtimeSyncStatus, detail?: string) => void;
}

/**
 * Normaliza el código RENAES para usar como ID seguro de colección
 */
export function getSafeRenaesKey(establishment?: EstablishmentConfig): string {
  const code = establishment?.codigoRenaes?.trim();
  if (code && code.length >= 4) {
    return code;
  }
  return '00004128';
}

/**
 * Suscribe la aplicación a la colección de pacientes del establecimiento en tiempo real.
 * Cualquier cambio hecho en otra PC o pestaña se sincroniza inmediatamente.
 */
export function subscribeToEstablishmentPatients(
  establishment: EstablishmentConfig,
  initialLocalPatients: DntPatient[],
  callbacks: RealtimeListenerCallbacks
): Unsubscribe {
  const db = getFirestoreDb();
  const renaesKey = getSafeRenaesKey(establishment);
  const patientsColRef = collection(db, 'establishments', renaesKey, 'patients');
  const pathForListener = `establishments/${renaesKey}/patients`;

  callbacks.onStatusChange('syncing', 'Conectando con base de datos en tiempo real...');

  let isFirstLoad = true;

  const unsubscribe = onSnapshot(
    patientsColRef,
    async (snapshot) => {
      try {
        callbacks.onStatusChange('syncing', 'Recibiendo actualización en vivo...');

        // Si la base de datos en la nube está vacía pero tenemos pacientes locales, migramos inicialmente
        if (isFirstLoad && snapshot.empty && initialLocalPatients.length > 0) {
          console.log(`[Multi-equipo] Migrando ${initialLocalPatients.length} pacientes locales iniciales a Firestore...`);
          await seedInitialPatients(renaesKey, initialLocalPatients, establishment);
          isFirstLoad = false;
          callbacks.onStatusChange('connected', 'Sincronizado y conectado en tiempo real');
          return;
        }

        isFirstLoad = false;

        const remotePatients: DntPatient[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as DntPatient;
          if (data && data.id && data.dni) {
            remotePatients.push(data);
          }
        });

        // Ordenar por fecha de actualización o nombre
        remotePatients.sort((a, b) => {
          const tA = new Date(a.fechaActualizacion || a.fechaCreacion || 0).getTime();
          const tB = new Date(b.fechaActualizacion || b.fechaCreacion || 0).getTime();
          return tB - tA;
        });

        callbacks.onPatientsUpdate(remotePatients);
        callbacks.onStatusChange('connected', `Multi-equipo activo (${remotePatients.length} pacientes)`);
      } catch (err) {
        console.error('Error procesando snapshot de pacientes:', err);
        callbacks.onStatusChange('error', 'Error al procesar actualización remota');
      }
    },
    (error) => {
      console.warn('Error en listener de Firestore onSnapshot:', error);
      callbacks.onStatusChange('offline', 'Modo local (Sin conexión con Firestore)');
      try {
        handleFirestoreError(error, OperationType.GET, pathForListener);
      } catch (e) {
        // Logueado como error estructurado
      }
    }
  );

  return unsubscribe;
}

/**
 * Guarda o actualiza un paciente en Firestore en tiempo real
 */
export async function savePatientRealtime(
  patient: DntPatient,
  establishment: EstablishmentConfig,
  currentUser: UserProfile
): Promise<void> {
  const db = getFirestoreDb();
  const renaesKey = getSafeRenaesKey(establishment);
  const patientDocRef = doc(db, 'establishments', renaesKey, 'patients', patient.id);
  const pathForWrite = `establishments/${renaesKey}/patients/${patient.id}`;

  const payload: DntPatient = {
    ...patient,
    codigoRenaes: renaesKey,
    establecimiento: establishment.establecimiento || patient.establecimiento,
    fechaActualizacion: new Date().toISOString(),
    updatedBy: currentUser.displayName || currentUser.email,
    updatedByRole: currentUser.role,
  };

  try {
    await setDoc(patientDocRef, payload, { merge: true });

    // Actualizar metadatos del establecimiento
    const establishmentDocRef = doc(db, 'establishments', renaesKey);
    await setDoc(
      establishmentDocRef,
      {
        codigoRenaes: renaesKey,
        establecimiento: establishment.establecimiento,
        redSalud: establishment.redSalud || '',
        microred: establishment.microred || '',
        lastModified: new Date().toISOString(),
        lastModifiedBy: currentUser.displayName,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathForWrite);
  }
}

/**
 * Elimina un paciente de Firestore en tiempo real
 */
export async function deletePatientRealtime(
  patientId: string,
  establishment: EstablishmentConfig,
  currentUser: UserProfile
): Promise<void> {
  const db = getFirestoreDb();
  const renaesKey = getSafeRenaesKey(establishment);
  const patientDocRef = doc(db, 'establishments', renaesKey, 'patients', patientId);
  const pathForDelete = `establishments/${renaesKey}/patients/${patientId}`;

  try {
    await deleteDoc(patientDocRef);

    // Actualizar metadatos del establecimiento
    const establishmentDocRef = doc(db, 'establishments', renaesKey);
    await setDoc(
      establishmentDocRef,
      {
        lastModified: new Date().toISOString(),
        lastModifiedBy: currentUser.displayName,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, pathForDelete);
  }
}

/**
 * Carga inicial de pacientes a Firestore si la base de datos está vacía
 */
export async function seedInitialPatients(
  renaesKey: string,
  patients: DntPatient[],
  establishment: EstablishmentConfig
): Promise<void> {
  if (patients.length === 0) return;
  const db = getFirestoreDb();

  // Firestore permite hasta 500 operaciones por batch
  const chunks: DntPatient[][] = [];
  for (let i = 0; i < patients.length; i += 450) {
    chunks.push(patients.slice(i, i + 450));
  }

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((p) => {
      const pRef = doc(db, 'establishments', renaesKey, 'patients', p.id);
      batch.set(pRef, {
        ...p,
        codigoRenaes: renaesKey,
        establecimiento: establishment.establecimiento,
        fechaActualizacion: new Date().toISOString(),
      }, { merge: true });
    });
    await batch.commit();
  }

  // Marcar snapshot de cabecera
  const establishmentDocRef = doc(db, 'establishments', renaesKey);
  await setDoc(establishmentDocRef, {
    codigoRenaes: renaesKey,
    establecimiento: establishment.establecimiento,
    redSalud: establishment.redSalud || '',
    microred: establishment.microred || '',
    lastSyncTime: new Date().toISOString(),
    patientCount: patients.length,
    seededAt: new Date().toISOString(),
  }, { merge: true });
}
