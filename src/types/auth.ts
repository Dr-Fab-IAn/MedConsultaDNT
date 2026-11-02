export type UserRole = 'admin' | 'medico' | 'enfermero' | 'digitador';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  roleTitle: string;
  colegiatura?: string; // e.g. CMP 64281, CEP 49102
  establecimiento: string;
  codigoRenaes: string;
  createdAt: string;
  lastLogin: string;
}

export const ROLE_DEFINITIONS: Record<UserRole, {
  label: string;
  shortLabel: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  permissions: {
    canRegisterPatients: boolean;
    canEditPatientData: boolean;
    canDeletePatients: boolean;
    canRecordClinicalControls: boolean;
    canEditMedicalNotes: boolean;
    canChangeThresholds: boolean;
    canManageEstablishment: boolean;
    canExportReports: boolean;
    canManageBackups: boolean;
  };
}> = {
  admin: {
    label: 'Médico Jefe / Administrador',
    shortLabel: 'Admin',
    description: 'Control total de la institución, padrón nominal, configuración de umbrales clínicos y gestión de respaldos.',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    badgeBorder: 'border-purple-300',
    permissions: {
      canRegisterPatients: true,
      canEditPatientData: true,
      canDeletePatients: true,
      canRecordClinicalControls: true,
      canEditMedicalNotes: true,
      canChangeThresholds: true,
      canManageEstablishment: true,
      canExportReports: true,
      canManageBackups: true,
    },
  },
  medico: {
    label: 'Médico Tratante / Resp. DNT',
    shortLabel: 'Médico',
    description: 'Atención médica integral, prescripción, notas clínicas confidenciales, evaluación de riesgo cardiovascular y firma de reportes oficiales.',
    badgeBg: 'bg-teal-100',
    badgeText: 'text-teal-800',
    badgeBorder: 'border-teal-300',
    permissions: {
      canRegisterPatients: true,
      canEditPatientData: true,
      canDeletePatients: true,
      canRecordClinicalControls: true,
      canEditMedicalNotes: true,
      canChangeThresholds: true,
      canManageEstablishment: false,
      canExportReports: true,
      canManageBackups: false,
    },
  },
  enfermero: {
    label: 'Lic. Enfermería / Triaje',
    shortLabel: 'Enfermería',
    description: 'Registro de funciones vitales (PA sistólica/diastólica), glucemia en ayunas, cálculo de IMC, tamizaje de pie diabético y entrega de fármacos.',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-800',
    badgeBorder: 'border-sky-300',
    permissions: {
      canRegisterPatients: true,
      canEditPatientData: true,
      canDeletePatients: false,
      canRecordClinicalControls: true,
      canEditMedicalNotes: false,
      canChangeThresholds: false,
      canManageEstablishment: false,
      canExportReports: true,
      canManageBackups: false,
    },
  },
  digitador: {
    label: 'Digitador / Admisión / Estadística',
    shortLabel: 'Digitador',
    description: 'Filiación de pacientes, consulta y validación RENIEC/SUNAT, asignación de tipo de seguro y emisión de listas nominales.',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-300',
    permissions: {
      canRegisterPatients: true,
      canEditPatientData: true,
      canDeletePatients: false,
      canRecordClinicalControls: false,
      canEditMedicalNotes: false,
      canChangeThresholds: false,
      canManageEstablishment: false,
      canExportReports: true,
      canManageBackups: false,
    },
  },
};

export const DEMO_USERS: UserProfile[] = [
  {
    uid: 'demo_medico_01',
    email: 'carlos.mendoza@minsa.gob.pe',
    displayName: 'Dr. Carlos Mendoza Ramos',
    role: 'medico',
    roleTitle: 'Médico Cirujano · Resp. Programa DNT',
    colegiatura: 'CMP 64281 · RNE 32014',
    establecimiento: 'Centro de Salud San Juan de Lurigancho',
    codigoRenaes: '00004128',
    createdAt: '2026-01-10T08:00:00.000Z',
    lastLogin: new Date().toISOString(),
  },
  {
    uid: 'demo_enfermero_01',
    email: 'rosa.paredes@minsa.gob.pe',
    displayName: 'Lic. Rosa Paredes Vilca',
    role: 'enfermero',
    roleTitle: 'Lic. en Enfermería · Triaje y DNT',
    colegiatura: 'CEP 48190',
    establecimiento: 'Centro de Salud San Juan de Lurigancho',
    codigoRenaes: '00004128',
    createdAt: '2026-01-12T08:00:00.000Z',
    lastLogin: new Date().toISOString(),
  },
  {
    uid: 'demo_digitador_01',
    email: 'jorge.quispe@minsa.gob.pe',
    displayName: 'Jorge Quispe Tello',
    role: 'digitador',
    roleTitle: 'Técnico de Estadística e Informática',
    establecimiento: 'Centro de Salud San Juan de Lurigancho',
    codigoRenaes: '00004128',
    createdAt: '2026-01-15T08:00:00.000Z',
    lastLogin: new Date().toISOString(),
  },
  {
    uid: 'demo_admin_01',
    email: 'patricia.alva@minsa.gob.pe',
    displayName: 'Dra. Patricia Alva Morales',
    role: 'admin',
    roleTitle: 'Médico Jefe de Establecimiento',
    colegiatura: 'CMP 49823 · RNE 21087',
    establecimiento: 'Centro de Salud San Juan de Lurigancho',
    codigoRenaes: '00004128',
    createdAt: '2026-01-05T08:00:00.000Z',
    lastLogin: new Date().toISOString(),
  },
];
