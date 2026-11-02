import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  Auth
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  Firestore 
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { UserProfile, UserRole, DEMO_USERS, ROLE_DEFINITIONS } from '../types/auth';
import { EstablishmentConfig } from '../types/dnt';

const STORAGE_KEY_CURRENT_USER = 'medconsulta_dnt_active_user_v1';

// Error Handler conforming to firebase-integration-rpc specifications
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const auth = getFirebaseAuth();
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })) || [],
    },
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

export function getFirebaseApp() {
  return getApps().length === 0 ? initializeApp(firebaseConfigJson) : getApp();
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    const app = getFirebaseApp();
    authInstance = getAuth(app);
  }
  return authInstance;
}

export function getFirestoreDb(): Firestore {
  if (!dbInstance) {
    const app = getFirebaseApp();
    if (firebaseConfigJson.firestoreDatabaseId) {
      dbInstance = getFirestore(app, firebaseConfigJson.firestoreDatabaseId);
    } else {
      dbInstance = getFirestore(app);
    }
  }
  return dbInstance;
}

/**
 * Obtiene el perfil de usuario actual almacenado localmente o asigna el médico por defecto
 */
export function getStoredCurrentUser(): UserProfile {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Error reading stored user:', e);
  }
  // Por defecto, iniciar con el Médico Tratante demo
  return DEMO_USERS[0];
}

/**
 * Guarda el perfil de usuario activo
 */
export function saveStoredCurrentUser(user: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
  } catch (e) {
    console.error('Error saving user profile:', e);
  }
}

/**
 * Inicia sesión con Google Popup (estándar seguro para entornos Web)
 */
export async function signInWithGoogle(establishment?: EstablishmentConfig): Promise<UserProfile> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(auth, provider);
  const fbUser = result.user;

  // Determinar rol inicial (si el email es de la jefatura o contiene admin/jefe)
  let assignedRole: UserRole = 'medico';
  const emailLower = (fbUser.email || '').toLowerCase();
  if (emailLower.includes('admin') || emailLower.includes('jefe') || emailLower === 'fabirodi231099@gmail.com') {
    assignedRole = 'admin';
  }

  const profile: UserProfile = {
    uid: fbUser.uid,
    email: fbUser.email || '',
    displayName: fbUser.displayName || 'Personal de Salud',
    photoURL: fbUser.photoURL || undefined,
    role: assignedRole,
    roleTitle: ROLE_DEFINITIONS[assignedRole].label,
    establecimiento: establishment?.establecimiento || 'Establecimiento DNT',
    codigoRenaes: establishment?.codigoRenaes || '00000000',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };

  // Intentar sincronizar perfil con Firestore
  try {
    const db = getFirestoreDb();
    const userDocRef = doc(db, 'users', fbUser.uid);
    const existingDoc = await getDoc(userDocRef);
    if (existingDoc.exists()) {
      const data = existingDoc.data() as Partial<UserProfile>;
      profile.role = data.role || profile.role;
      profile.roleTitle = data.roleTitle || profile.roleTitle;
      profile.colegiatura = data.colegiatura || profile.colegiatura;
    }
    await setDoc(userDocRef, profile, { merge: true });
  } catch (err) {
    console.warn('No se pudo guardar el perfil en Firestore (se usará local):', err);
  }

  saveStoredCurrentUser(profile);
  return profile;
}

/**
 * Cierra la sesión activa
 */
export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  try {
    await firebaseSignOut(auth);
  } catch (e) {
    console.warn('Error during firebase signout:', e);
  }
  // Cambiar a demo o mantener perfil mínimo
  saveStoredCurrentUser(DEMO_USERS[0]);
}

/**
 * Cambia manualmente al perfil de un rol clínico específico (ideal para pruebas y turnos)
 */
export async function switchClinicalRole(
  targetRole: UserRole,
  establishment?: EstablishmentConfig,
  customName?: string,
  colegiatura?: string
): Promise<UserProfile> {
  const baseDemo = DEMO_USERS.find((u) => u.role === targetRole) || DEMO_USERS[0];

  const profile: UserProfile = {
    uid: `user_${targetRole}_${Date.now()}`,
    email: baseDemo.email,
    displayName: customName || baseDemo.displayName,
    role: targetRole,
    roleTitle: ROLE_DEFINITIONS[targetRole].label,
    colegiatura: colegiatura || baseDemo.colegiatura,
    establecimiento: establishment?.establecimiento || baseDemo.establecimiento,
    codigoRenaes: establishment?.codigoRenaes || baseDemo.codigoRenaes,
    createdAt: baseDemo.createdAt,
    lastLogin: new Date().toISOString(),
  };

  // Intentar persistir en Firestore
  try {
    const db = getFirestoreDb();
    const userDocRef = doc(db, 'users', profile.uid);
    await setDoc(userDocRef, profile, { merge: true });
  } catch (e) {
    // Si no hay red, opera con perfil local
  }

  saveStoredCurrentUser(profile);
  return profile;
}

/**
 * Escucha cambios de estado de autenticación en Firebase
 */
export function onAuthStatusChange(callback: (user: UserProfile | null) => void) {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
    if (fbUser) {
      const stored = getStoredCurrentUser();
      if (stored && stored.uid === fbUser.uid) {
        callback(stored);
      } else {
        const profile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || 'Personal de Salud',
          photoURL: fbUser.photoURL || undefined,
          role: (fbUser.email || '').toLowerCase().includes('admin') ? 'admin' : 'medico',
          roleTitle: 'Médico Tratante / Resp. DNT',
          establecimiento: stored?.establecimiento || 'Establecimiento DNT',
          codigoRenaes: stored?.codigoRenaes || '00000000',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };
        saveStoredCurrentUser(profile);
        callback(profile);
      }
    } else {
      callback(getStoredCurrentUser());
    }
  });
}
