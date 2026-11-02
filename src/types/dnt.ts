/**
 * Tipos de datos para el Padrón Nominal y Registro Clínico de Daños No Transmisibles (DNT - MINSA Perú)
 */

export type Sexo = 'M' | 'F';

export type TipoSeguro = 'SIS' | 'ESSALUD' | 'PARTICULAR' | 'OTRO';

export type EstadioHta = 'NORMAL' | 'PREHIPERTENSION' | 'ESTADIO_1' | 'ESTADIO_2' | 'CRISIS';

export type RiesgoAbdominal = 'NORMAL' | 'ALTO' | 'MUY ALTO';

export type ClasificacionImc = 
  | 'Bajo Peso'
  | 'Normal'
  | 'Sobrepeso'
  | 'Obesidad Grado I'
  | 'Obesidad Grado II'
  | 'Obesidad Grado III (Mórbida)';

export type RiesgoCardiovascular = 'BAJO' | 'MODERADO' | 'ALTO' | 'MUY_ALTO';

export interface MonthlyControl {
  mes: number; // 1 = Enero ... 12 = Diciembre
  atendido: boolean;
  fecha?: string;
  paSistolica?: number;
  paDiastolica?: number;
  frecuenciaCardiaca?: number;
  pesoKg?: number;
  tallaCm?: number;
  imc?: number;
  glucosaMgDl?: number;
  medicacionEntregada?: string;
  controlado?: boolean; // PA < 140/90 y Glucosa < 130
  observaciones?: string;
}

export interface DntPatient {
  id: string;
  // Ubicación / Establecimiento
  redSalud: string;
  microred: string;
  establecimiento: string;
  codigoRenaes?: string;
  
  // Filiación (RENIEC / DNI)
  dni: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombres: string;
  nombreCompleto: string;
  edad: number;
  sexo: Sexo;
  fechaNacimiento?: string;
  direccion: string;
  telefono: string;
  tipoSeguro: TipoSeguro;
  numeroHC: string;
  codVerifica?: string;

  // Tamizaje y Antropometría
  fechaTamizaje?: string;
  pesoKg?: number;
  tallaCm?: number;
  imc?: number;
  clasificacionImc?: ClasificacionImc;
  perimetroAbdominalCm?: number;
  riesgoAbdominal?: RiesgoAbdominal;
  paSistolicaBasal?: number;
  paDiastolicaBasal?: number;

  // Módulo Hipertensión Arterial (HTA)
  tieneHta: boolean;
  fechaDxHta?: string;
  estadioHta?: EstadioHta;
  tratamientoHta?: string; // Ej: Losartán 50mg c/12h, Enalapril 10mg

  // Módulo Diabetes Mellitus (DM)
  tieneDm: boolean;
  fechaDxDm?: string;
  tipoDm?: 'DM1' | 'DM2';
  glucosaBasal?: number;
  hba1c?: number;
  tratamientoDm?: string; // Ej: Metformina 850mg v.o., Glibenclamida, Insulina
  evaluacionPieDiabetico?: 'NORMAL' | 'EN_RIESGO' | 'ULCERA';

  // Dislipidemia y Riesgo Cardiovascular
  tieneDislipidemia?: boolean;
  colesterolTotal?: number;
  trigliceridos?: number;
  hdl?: number;
  ldl?: number;
  riesgoCardiovascular?: RiesgoCardiovascular;

  // Seguimiento Mensual (Enero a Diciembre)
  controles: Record<number, MonthlyControl>;

  // Notas médicas rápidas y observaciones especiales
  notasMedicas?: string;

  // Auditoría y trazabilidad clínica
  updatedBy?: string;
  updatedByRole?: string;

  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface EstablishmentConfig {
  redSalud: string;
  microred: string;
  establecimiento: string;
  codigoRenaes: string;
  departamento: string;
  provincia: string;
  distrito: string;
  anio: number;
}

export interface DniQueryResult {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
  codVerifica?: string;
}

export interface RucQueryResult {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  estado: string; // ACTIVO, BAJA, etc.
  condicion: string; // HABIDO, NO HABIDO
  direccion: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  ubigeo?: string;
  telefonos?: string[];
}

export interface BulkDniItem {
  id: string;
  dni: string;
  estado: 'pendiente' | 'consultando' | 'exito' | 'error';
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  nombreCompleto?: string;
  edad?: number;
  sexo?: Sexo;
  mensajeError?: string;
  importadoAlPadron?: boolean;
}

export type ClinicalThresholdPreset = 'MINSA_ESTANDAR' | 'AHA_ESTRICTO' | 'ADULTO_MAYOR' | 'PERSONALIZADO';

export interface ClinicalThresholds {
  preset: ClinicalThresholdPreset;
  // Presión Arterial
  paSistolicaControlMax: number;   // e.g. 139 (controlado si < 140)
  paDiastolicaControlMax: number;  // e.g. 89 (controlado si < 90)
  paSistolicaCrisisMin: number;    // e.g. 180 (alerta roja de crisis)
  paDiastolicaCrisisMin: number;   // e.g. 110 (alerta roja de crisis)
  
  // Glucosa en Ayunas
  glucosaAyunoControlMax: number;  // e.g. 130 mg/dL (meta de control)
  glucosaHipoglucemiaMax: number;  // e.g. 70 mg/dL (alerta de hipoglucemia si < 70)
  glucosaAlertaMin: number;        // e.g. 180 mg/dL (descontrol agudo/hiperglucemia)
  glucosaCrisisMin: number;        // e.g. 250 mg/dL (crisis glucémica)
  hba1cControlMax: number;         // e.g. 7.0 %

  // Caducidad de Controles Mensuales
  diasCaducidadControl: number;    // e.g. 30 días (sin control > X días activa alerta roja)
  alertaPreventivaDias: number;    // e.g. 7 días antes de caducar

  // Metadatos
  ultimaActualizacion?: string;
  actualizadoPor?: string;
}
