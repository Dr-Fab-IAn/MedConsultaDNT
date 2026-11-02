import { DntPatient, EstablishmentConfig, ClinicalThresholds, ClinicalThresholdPreset } from '../types/dnt';
import { createEmptyMonthlyControls } from './clinicalCalculations';

const STORAGE_KEY_PATIENTS = 'medconsulta_dnt_patients_v1';
const STORAGE_KEY_ESTABLISHMENT = 'medconsulta_dnt_establishment_v1';
const STORAGE_KEY_THRESHOLDS = 'medconsulta_dnt_thresholds_v1';

export const DEFAULT_ESTABLISHMENT: EstablishmentConfig = {
  redSalud: 'RED DE SALUD LIMA NORTE',
  microred: 'MICRORED TÚPAC AMARU',
  establecimiento: 'C.S. PROYECTO INTEGRAL LA ENSENADA',
  codigoRenaes: '00003412',
  departamento: 'LIMA',
  provincia: 'LIMA',
  distrito: 'PUENTE PIEDRA',
  anio: 2026,
};

// Pacientes iniciales para demostración con patologías no transmisibles
const INITIAL_PATIENTS: DntPatient[] = [
  {
    id: 'p-1',
    redSalud: 'RED DE SALUD LIMA NORTE',
    microred: 'MICRORED TÚPAC AMARU',
    establecimiento: 'C.S. PROYECTO INTEGRAL LA ENSENADA',
    codigoRenaes: '00003412',
    dni: '45892134',
    apellidoPaterno: 'QUISPE',
    apellidoMaterno: 'MAMANI',
    nombres: 'JUAN CARLOS',
    nombreCompleto: 'JUAN CARLOS QUISPE MAMANI',
    edad: 58,
    sexo: 'M',
    fechaNacimiento: '1968-04-12',
    direccion: 'Mz. C Lote 14 Asoc. Las Palmeras',
    telefono: '984512301',
    tipoSeguro: 'SIS',
    numeroHC: 'HC-04521',
    codVerifica: '3',
    fechaTamizaje: '2026-01-15',
    pesoKg: 78.5,
    tallaCm: 165,
    imc: 28.83,
    clasificacionImc: 'Sobrepeso',
    perimetroAbdominalCm: 104,
    riesgoAbdominal: 'MUY ALTO',
    paSistolicaBasal: 145,
    paDiastolicaBasal: 92,
    tieneHta: true,
    fechaDxHta: '2022-03-10',
    estadioHta: 'ESTADIO_1',
    tratamientoHta: 'Losartán 50mg c/12h + Amlodipino 5mg',
    tieneDm: false,
    tieneDislipidemia: true,
    colesterolTotal: 220,
    trigliceridos: 195,
    hdl: 42,
    ldl: 140,
    riesgoCardiovascular: 'ALTO',
    controles: {
      ...createEmptyMonthlyControls(),
      1: {
        mes: 1,
        atendido: true,
        fecha: '2026-01-15',
        paSistolica: 140,
        paDiastolica: 88,
        frecuenciaCardiaca: 74,
        pesoKg: 78.5,
        imc: 28.83,
        medicacionEntregada: 'Losartán 50mg x 60 tab',
        controlado: true,
        observaciones: 'Tolera tratamiento sin eventos adversos.',
      },
      2: {
        mes: 2,
        atendido: true,
        fecha: '2026-02-18',
        paSistolica: 135,
        paDiastolica: 85,
        frecuenciaCardiaca: 72,
        pesoKg: 78.0,
        imc: 28.65,
        medicacionEntregada: 'Losartán 50mg x 60 tab',
        controlado: true,
        observaciones: 'Presión controlada, se insiste en dieta hiposódica.',
      },
      3: {
        mes: 3,
        atendido: true,
        fecha: '2026-03-20',
        paSistolica: 132,
        paDiastolica: 82,
        frecuenciaCardiaca: 70,
        pesoKg: 77.2,
        imc: 28.36,
        medicacionEntregada: 'Losartán 50mg x 60 tab',
        controlado: true,
        observaciones: 'Buen control tensional.',
      },
    },
    notasMedicas: 'Tolera Losartán; se indicó dieta estricta hiposódica y caminatas 30 min diarios.',
    fechaCreacion: '2026-01-15T08:30:00Z',
    fechaActualizacion: '2026-03-20T10:00:00Z',
  },
  {
    id: 'p-2',
    redSalud: 'RED DE SALUD LIMA NORTE',
    microred: 'MICRORED TÚPAC AMARU',
    establecimiento: 'C.S. PROYECTO INTEGRAL LA ENSENADA',
    codigoRenaes: '00003412',
    dni: '70234581',
    apellidoPaterno: 'FLORES',
    apellidoMaterno: 'HUAMAN',
    nombres: 'MARIA ELENA',
    nombreCompleto: 'MARIA ELENA FLORES HUAMAN',
    edad: 52,
    sexo: 'F',
    fechaNacimiento: '1974-09-22',
    direccion: 'Jr. Los Claveles 320 Int. B',
    telefono: '992145876',
    tipoSeguro: 'SIS',
    numeroHC: 'HC-05892',
    codVerifica: '7',
    fechaTamizaje: '2026-01-20',
    pesoKg: 69.0,
    tallaCm: 152,
    imc: 29.86,
    clasificacionImc: 'Sobrepeso',
    perimetroAbdominalCm: 91,
    riesgoAbdominal: 'MUY ALTO',
    paSistolicaBasal: 125,
    paDiastolicaBasal: 80,
    tieneHta: false,
    tieneDm: true,
    fechaDxDm: '2021-08-14',
    tipoDm: 'DM2',
    glucosaBasal: 142,
    hba1c: 7.8,
    tratamientoDm: 'Metformina 850mg c/12h v.o.',
    evaluacionPieDiabetico: 'NORMAL',
    tieneDislipidemia: false,
    riesgoCardiovascular: 'MODERADO',
    controles: {
      ...createEmptyMonthlyControls(),
      1: {
        mes: 1,
        atendido: true,
        fecha: '2026-01-20',
        paSistolica: 125,
        paDiastolica: 80,
        frecuenciaCardiaca: 76,
        pesoKg: 69.0,
        imc: 29.86,
        glucosaMgDl: 138,
        medicacionEntregada: 'Metformina 850mg x 60 tab',
        controlado: false,
        observaciones: 'Glucemia en ayunas limítrofe.',
      },
      2: {
        mes: 2,
        atendido: true,
        fecha: '2026-02-22',
        paSistolica: 122,
        paDiastolica: 78,
        frecuenciaCardiaca: 74,
        pesoKg: 68.3,
        imc: 29.56,
        glucosaMgDl: 124,
        medicacionEntregada: 'Metformina 850mg x 60 tab',
        controlado: true,
        observaciones: 'Mejoría con incremento de actividad física.',
      },
    },
    notasMedicas: 'Requiere revisión anual de fondo de ojo y examen con monofilamento para pie diabético.',
    fechaCreacion: '2026-01-20T09:15:00Z',
    fechaActualizacion: '2026-02-22T11:20:00Z',
  },
  {
    id: 'p-3',
    redSalud: 'RED DE SALUD LIMA NORTE',
    microred: 'MICRORED TÚPAC AMARU',
    establecimiento: 'C.S. PROYECTO INTEGRAL LA ENSENADA',
    codigoRenaes: '00003412',
    dni: '10845692',
    apellidoPaterno: 'RODRIGUEZ',
    apellidoMaterno: 'SANCHEZ',
    nombres: 'ROBERTO CESAR',
    nombreCompleto: 'ROBERTO CESAR RODRIGUEZ SANCHEZ',
    edad: 64,
    sexo: 'M',
    fechaNacimiento: '1962-11-05',
    direccion: 'Av. Universitaria 1420',
    telefono: '978120455',
    tipoSeguro: 'ESSALUD',
    numeroHC: 'HC-01980',
    codVerifica: '1',
    fechaTamizaje: '2026-02-05',
    pesoKg: 85.0,
    tallaCm: 168,
    imc: 30.12,
    clasificacionImc: 'Obesidad Grado I',
    perimetroAbdominalCm: 108,
    riesgoAbdominal: 'MUY ALTO',
    paSistolicaBasal: 155,
    paDiastolicaBasal: 95,
    tieneHta: true,
    fechaDxHta: '2019-05-18',
    estadioHta: 'ESTADIO_2',
    tratamientoHta: 'Enalapril 20mg c/12h + Hidroclorotiazida 12.5mg',
    tieneDm: true,
    fechaDxDm: '2020-02-11',
    tipoDm: 'DM2',
    glucosaBasal: 165,
    hba1c: 8.4,
    tratamientoDm: 'Metformina 850mg c/8h + Glibenclamida 5mg',
    evaluacionPieDiabetico: 'EN_RIESGO',
    tieneDislipidemia: true,
    colesterolTotal: 245,
    trigliceridos: 260,
    riesgoCardiovascular: 'MUY_ALTO',
    controles: {
      ...createEmptyMonthlyControls(),
      2: {
        mes: 2,
        atendido: true,
        fecha: '2026-02-05',
        paSistolica: 150,
        paDiastolica: 94,
        frecuenciaCardiaca: 82,
        pesoKg: 85.0,
        imc: 30.12,
        glucosaMgDl: 162,
        medicacionEntregada: 'Enalapril 20mg, Metformina 850mg',
        controlado: false,
        observaciones: 'Descompensado. Refuerzo de consejería nutricional y adherencia.',
      },
      3: {
        mes: 3,
        atendido: true,
        fecha: '2026-03-08',
        paSistolica: 142,
        paDiastolica: 88,
        frecuenciaCardiaca: 78,
        pesoKg: 83.8,
        imc: 29.69,
        glucosaMgDl: 135,
        medicacionEntregada: 'Enalapril 20mg, Metformina 850mg',
        controlado: false,
        observaciones: 'Evolución favorable, en camino a compensación.',
      },
    },
    notasMedicas: 'Comorbilidad HTA+DM2: polifarmacia, verificar adherencia en ayunas y riesgo de hipoglucemia.',
    fechaCreacion: '2026-02-05T10:00:00Z',
    fechaActualizacion: '2026-03-08T12:00:00Z',
  },
];

export function getStoredPatients(): DntPatient[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PATIENTS);
    if (!raw) {
      savePatients(INITIAL_PATIENTS);
      return INITIAL_PATIENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PATIENTS;
  } catch (e) {
    console.error('Error al cargar pacientes de localStorage:', e);
    return INITIAL_PATIENTS;
  }
}

export function savePatients(patients: DntPatient[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(patients));
  } catch (e) {
    console.error('Error al guardar pacientes en localStorage:', e);
  }
}

export function getStoredEstablishment(): EstablishmentConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ESTABLISHMENT);
    if (!raw) {
      saveEstablishment(DEFAULT_ESTABLISHMENT);
      return DEFAULT_ESTABLISHMENT;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_ESTABLISHMENT;
  }
}

export function saveEstablishment(config: EstablishmentConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_ESTABLISHMENT, JSON.stringify(config));
  } catch (e) {
    console.error('Error al guardar configuración de establecimiento:', e);
  }
}

export function exportBackupJson(patients: DntPatient[], establishment: EstablishmentConfig): string {
  const safeRenaes = establishment.codigoRenaes ? establishment.codigoRenaes.replace(/\D/g, '') : 'MINSA';
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `MedConsulta_DNT_Backup_${safeRenaes}_${dateStr}.json`;

  const backup = {
    sistema: 'MedConsulta DNT - Padrón Nominal MINSA',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    totalPacientes: patients.length,
    establecimiento: establishment,
    patients,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  return fileName;
}

// -------------------------------------------------------------
// Umbrales Clínicos y Periodo de Caducidad de Controles
// -------------------------------------------------------------

export const DEFAULT_CLINICAL_THRESHOLDS: ClinicalThresholds = {
  preset: 'MINSA_ESTANDAR',
  paSistolicaControlMax: 139,
  paDiastolicaControlMax: 89,
  paSistolicaCrisisMin: 180,
  paDiastolicaCrisisMin: 110,
  glucosaAyunoControlMax: 130,
  glucosaHipoglucemiaMax: 70,
  glucosaAlertaMin: 180,
  glucosaCrisisMin: 250,
  hba1cControlMax: 7.0,
  diasCaducidadControl: 30,
  alertaPreventivaDias: 7,
  ultimaActualizacion: new Date().toISOString(),
  actualizadoPor: 'Guía MINSA NTS Nº 166-MINSA/2020',
};

export const CLINICAL_THRESHOLDS_PRESETS: Record<Exclude<ClinicalThresholdPreset, 'PERSONALIZADO'>, ClinicalThresholds> = {
  MINSA_ESTANDAR: {
    preset: 'MINSA_ESTANDAR',
    paSistolicaControlMax: 139,
    paDiastolicaControlMax: 89,
    paSistolicaCrisisMin: 180,
    paDiastolicaCrisisMin: 110,
    glucosaAyunoControlMax: 130,
    glucosaHipoglucemiaMax: 70,
    glucosaAlertaMin: 180,
    glucosaCrisisMin: 250,
    hba1cControlMax: 7.0,
    diasCaducidadControl: 30,
    alertaPreventivaDias: 7,
    actualizadoPor: 'Norma Técnica de Salud NTS Nº 166-MINSA/2020',
  },
  AHA_ESTRICTO: {
    preset: 'AHA_ESTRICTO',
    paSistolicaControlMax: 129,
    paDiastolicaControlMax: 79,
    paSistolicaCrisisMin: 180,
    paDiastolicaCrisisMin: 110,
    glucosaAyunoControlMax: 120,
    glucosaHipoglucemiaMax: 70,
    glucosaAlertaMin: 160,
    glucosaCrisisMin: 250,
    hba1cControlMax: 6.5,
    diasCaducidadControl: 30,
    alertaPreventivaDias: 7,
    actualizadoPor: 'Guía ACC/AHA Criterio Estricto de Protección Renal/CV',
  },
  ADULTO_MAYOR: {
    preset: 'ADULTO_MAYOR',
    paSistolicaControlMax: 149,
    paDiastolicaControlMax: 89,
    paSistolicaCrisisMin: 180,
    paDiastolicaCrisisMin: 110,
    glucosaAyunoControlMax: 150,
    glucosaHipoglucemiaMax: 80,
    glucosaAlertaMin: 200,
    glucosaCrisisMin: 300,
    hba1cControlMax: 8.0,
    diasCaducidadControl: 45,
    alertaPreventivaDias: 10,
    actualizadoPor: 'Criterio Gerátrico Permisivo (Prevención de Hipotensión e Hipoglucemias)',
  },
};

export function getStoredClinicalThresholds(): ClinicalThresholds {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_THRESHOLDS);
    if (!raw) {
      return DEFAULT_CLINICAL_THRESHOLDS;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CLINICAL_THRESHOLDS,
      ...parsed,
    };
  } catch (e) {
    console.error('Error al recuperar umbrales clínicos de localStorage:', e);
    return DEFAULT_CLINICAL_THRESHOLDS;
  }
}

export function saveClinicalThresholds(thresholds: ClinicalThresholds): void {
  try {
    const toSave: ClinicalThresholds = {
      ...thresholds,
      ultimaActualizacion: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_THRESHOLDS, JSON.stringify(toSave));
  } catch (e) {
    console.error('Error al guardar umbrales clínicos en localStorage:', e);
  }
}

export function resetClinicalThresholds(): ClinicalThresholds {
  try {
    localStorage.removeItem(STORAGE_KEY_THRESHOLDS);
  } catch (e) {
    console.error('Error al restablecer umbrales clínicos:', e);
  }
  return DEFAULT_CLINICAL_THRESHOLDS;
}
