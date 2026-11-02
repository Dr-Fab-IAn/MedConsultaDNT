import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocFromServer, 
  writeBatch,
  Firestore 
} from 'firebase/firestore';
import { DntPatient, EstablishmentConfig } from '../types/dnt';
import firebaseConfigJson from '../../firebase-applet-config.json';

export interface CloudSyncSettings {
  enabled: boolean;
  intervalMinutes: number; // e.g. 5, 15, 30, 60
  lastSyncTimestamp?: string;
  lastSyncStatus?: 'success' | 'error' | 'syncing' | 'idle';
  lastSyncMessage?: string;
  autoPullOnStartup: boolean;
}

const STORAGE_KEY_CLOUD_SYNC = 'medconsulta_dnt_cloud_sync_v1';

export const DEFAULT_CLOUD_SYNC_SETTINGS: CloudSyncSettings = {
  enabled: false,
  intervalMinutes: 15,
  autoPullOnStartup: false,
  lastSyncStatus: 'idle',
};

// Inicialización de la instancia de Firebase
let dbInstance: Firestore | null = null;

export function getFirestoreDb(): Firestore {
  if (dbInstance) return dbInstance;

  const app = getApps().length === 0 ? initializeApp(firebaseConfigJson) : getApp();
  
  if (firebaseConfigJson.firestoreDatabaseId) {
    dbInstance = getFirestore(app, firebaseConfigJson.firestoreDatabaseId);
  } else {
    dbInstance = getFirestore(app);
  }

  // Validación de conexión según directiva
  testConnection(dbInstance);

  return dbInstance;
}

async function testConnection(db: Firestore) {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network restricted.');
    }
  }
}

/**
 * Obtiene la configuración de sincronización en la nube guardada en localStorage
 */
export function getStoredCloudSyncSettings(): CloudSyncSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CLOUD_SYNC);
    if (!raw) return DEFAULT_CLOUD_SYNC_SETTINGS;
    return { ...DEFAULT_CLOUD_SYNC_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CLOUD_SYNC_SETTINGS;
  }
}

/**
 * Guarda la configuración de sincronización en la nube
 */
export function saveStoredCloudSyncSettings(settings: CloudSyncSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_CLOUD_SYNC, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving cloud sync settings:', e);
  }
}

/**
 * Sube y persiste el estado actual del padrón nominal de pacientes a Firebase Firestore
 */
export async function pushPatientsToRemoteCloud(
  patients: DntPatient[],
  establishment: EstablishmentConfig
): Promise<{ success: boolean; timestamp: string; count: number; error?: string }> {
  try {
    const db = getFirestoreDb();
    const codigoRenaes = establishment.codigoRenaes?.trim() || 'RENAES_DEFAULT';
    const timestamp = new Date().toISOString();

    // 1. Guardar documento maestro de snapshot del establecimiento
    const establishmentDocRef = doc(db, 'establishments', codigoRenaes);
    const snapshotData = {
      codigoRenaes,
      establecimiento: establishment.establecimiento || 'Establecimiento DNT',
      redSalud: establishment.redSalud || '',
      microred: establishment.microred || '',
      patientCount: patients.length,
      lastSyncTime: timestamp,
      patientsJson: JSON.stringify(patients),
      syncedBy: 'Personal Médico / MedConsulta DNT Web',
      deviceAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Agent',
    };

    await setDoc(establishmentDocRef, snapshotData, { merge: true });

    // 2. Guardar pacientes en lotes individuales (batch de Firestore hasta 500 ops)
    // Para persistencia granular multi-dispositivo
    if (patients.length > 0 && patients.length <= 450) {
      const batch = writeBatch(db);
      patients.forEach((patient) => {
        const patientDocRef = doc(db, 'establishments', codigoRenaes, 'patients', patient.id);
        batch.set(patientDocRef, {
          ...patient,
          codigoRenaes,
          fechaSincronizacionCloud: timestamp,
        }, { merge: true });
      });
      await batch.commit();
    }

    // Actualizar registro de éxito
    const currentSettings = getStoredCloudSyncSettings();
    saveStoredCloudSyncSettings({
      ...currentSettings,
      lastSyncTimestamp: timestamp,
      lastSyncStatus: 'success',
      lastSyncMessage: `Sincronizados ${patients.length} pacientes con Firestore con éxito.`,
    });

    return {
      success: true,
      timestamp,
      count: patients.length,
    };
  } catch (err: unknown) {
    console.error('Error pushing patients to Firebase:', err);
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido al conectar con Firebase';
    
    const currentSettings = getStoredCloudSyncSettings();
    saveStoredCloudSyncSettings({
      ...currentSettings,
      lastSyncStatus: 'error',
      lastSyncMessage: errorMsg,
    });

    return {
      success: false,
      timestamp: new Date().toISOString(),
      count: 0,
      error: errorMsg,
    };
  }
}

/**
 * Descarga el estado remoto de pacientes desde Firebase Firestore (útil para sincronizar otro dispositivo)
 */
export async function pullPatientsFromRemoteCloud(
  establishment: EstablishmentConfig
): Promise<{ success: boolean; patients?: DntPatient[]; timestamp?: string; error?: string }> {
  try {
    const db = getFirestoreDb();
    const codigoRenaes = establishment.codigoRenaes?.trim() || 'RENAES_DEFAULT';
    const establishmentDocRef = doc(db, 'establishments', codigoRenaes);

    const docSnap = await getDoc(establishmentDocRef);
    if (!docSnap.exists()) {
      return {
        success: false,
        error: `No se encontró un respaldo previo para el establecimiento (${codigoRenaes}) en la nube.`,
      };
    }

    const data = docSnap.data();
    if (!data.patientsJson) {
      return {
        success: false,
        error: 'El documento en la nube no contiene registros de pacientes válidos.',
      };
    }

    const remotePatients: DntPatient[] = JSON.parse(data.patientsJson);
    return {
      success: true,
      patients: remotePatients,
      timestamp: data.lastSyncTime || new Date().toISOString(),
    };
  } catch (err: unknown) {
    console.error('Error pulling patients from Firebase:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al descargar datos de Firebase',
    };
  }
}
