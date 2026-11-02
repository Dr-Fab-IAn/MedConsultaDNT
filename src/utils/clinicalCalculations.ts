import { ClasificacionImc, EstadioHta, MonthlyControl, RiesgoAbdominal, Sexo, ClinicalThresholds, DntPatient } from '../types/dnt';

/**
 * Calcula el Índice de Masa Corporal (IMC) = peso (kg) / (talla (m))^2
 */
export function calculateImc(pesoKg?: number, tallaCm?: number): number | undefined {
  if (!pesoKg || !tallaCm || pesoKg <= 0 || tallaCm <= 0) return undefined;
  const tallaM = tallaCm / 100;
  const imc = pesoKg / (tallaM * tallaM);
  return Number(imc.toFixed(2));
}

/**
 * Clasificación de la OMS del estado nutricional según IMC
 */
export function getImcClassification(imc?: number): ClasificacionImc | undefined {
  if (imc === undefined || isNaN(imc)) return undefined;
  if (imc < 18.5) return 'Bajo Peso';
  if (imc < 25.0) return 'Normal';
  if (imc < 30.0) return 'Sobrepeso';
  if (imc < 35.0) return 'Obesidad Grado I';
  if (imc < 40.0) return 'Obesidad Grado II';
  return 'Obesidad Grado III (Mórbida)';
}

export interface ImcNutritionInfo {
  status: 'sin_datos' | 'bajo_peso' | 'normal' | 'sobrepeso' | 'obesidad_1' | 'obesidad_2' | 'obesidad_3';
  clasificacion: string;
  rangoTexto: string;
  badgeClass: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  indicatorColor: string;
  activeSegment: number; // 0 = sin datos, 1 = Bajo (<18.5), 2 = Normal (18.5-24.9), 3 = Sobrepeso (25-29.9), 4 = Obesidad I (30-34.9), 5 = Obesidad II-III (>=35)
  gaugePercent: number;
  mensajeClinico: string;
  recomendacion: string;
}

/**
 * Clasificación y configuración visual del estado nutricional según rangos estándar de IMC (OMS / MINSA)
 */
export function getImcNutritionInfo(imc?: number): ImcNutritionInfo {
  if (imc === undefined || isNaN(imc) || imc <= 0) {
    return {
      status: 'sin_datos',
      clasificacion: 'Sin datos de IMC',
      rangoTexto: 'Requiere Peso y Talla',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-300',
      borderClass: 'border-slate-200',
      bgClass: 'bg-slate-50',
      textClass: 'text-slate-600',
      indicatorColor: 'bg-slate-400',
      activeSegment: 0,
      gaugePercent: 0,
      mensajeClinico: 'Ingrese el peso en kg y la talla en cm para evaluar el estado nutricional.',
      recomendacion: 'Complete las medidas antropométricas en la consulta.',
    };
  }

  // Cálculo de porcentaje para escala visual continua (mapeado de 14 a 42 kg/m²)
  const clampedImc = Math.min(Math.max(imc, 14), 42);
  const gaugePercent = Math.round(((clampedImc - 14) / (42 - 14)) * 100);

  if (imc < 18.5) {
    return {
      status: 'bajo_peso',
      clasificacion: 'Bajo Peso',
      rangoTexto: '< 18.5 kg/m²',
      badgeClass: 'bg-sky-50 text-sky-800 border-sky-300',
      borderClass: 'border-sky-300',
      bgClass: 'bg-sky-50/50',
      textClass: 'text-sky-800',
      indicatorColor: 'bg-sky-500',
      activeSegment: 1,
      gaugePercent,
      mensajeClinico: 'Desnutrición o bajo peso según estándares OMS/MINSA.',
      recomendacion: 'Evaluar causa de pérdida ponderal involuntaria, descartar fragilidad o comorbilidades y reforzar aporte calórico.',
    };
  }

  if (imc < 25.0) {
    return {
      status: 'normal',
      clasificacion: 'Peso Normal (Eutrófico)',
      rangoTexto: '18.5 - 24.9 kg/m²',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      borderClass: 'border-emerald-300',
      bgClass: 'bg-emerald-50/50',
      textClass: 'text-emerald-800',
      indicatorColor: 'bg-emerald-500',
      activeSegment: 2,
      gaugePercent,
      mensajeClinico: 'Estado nutricional óptimo y saludable según la OMS.',
      recomendacion: 'Mantener hábitos de alimentación saludable, hidratación adecuada y 150 min semanales de actividad física aeróbica.',
    };
  }

  if (imc < 30.0) {
    return {
      status: 'sobrepeso',
      clasificacion: 'Sobrepeso',
      rangoTexto: '25.0 - 29.9 kg/m²',
      badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
      borderClass: 'border-amber-300',
      bgClass: 'bg-amber-50/50',
      textClass: 'text-amber-900',
      indicatorColor: 'bg-amber-500',
      activeSegment: 3,
      gaugePercent,
      mensajeClinico: 'Pre-obesidad con riesgo metabólico y cardiovascular moderado.',
      recomendacion: 'Fomentar reducción ponderal del 5-7%, consejería nutricional baja en sodio y carbohidratos refinados, y ejercicio regular.',
    };
  }

  if (imc < 35.0) {
    return {
      status: 'obesidad_1',
      clasificacion: 'Obesidad Grado I',
      rangoTexto: '30.0 - 34.9 kg/m²',
      badgeClass: 'bg-orange-50 text-orange-900 border-orange-300',
      borderClass: 'border-orange-300',
      bgClass: 'bg-orange-50/50',
      textClass: 'text-orange-900',
      indicatorColor: 'bg-orange-500',
      activeSegment: 4,
      gaugePercent,
      mensajeClinico: 'Obesidad moderada con alto riesgo de descompensación de HTA y DM.',
      recomendacion: 'Plan alimentario estructurado por nutrición, control estricto de presión arterial y glucometría periódica.',
    };
  }

  if (imc < 40.0) {
    return {
      status: 'obesidad_2',
      clasificacion: 'Obesidad Grado II',
      rangoTexto: '35.0 - 39.9 kg/m²',
      badgeClass: 'bg-rose-50 text-rose-900 border-rose-300',
      borderClass: 'border-rose-300',
      bgClass: 'bg-rose-50/50',
      textClass: 'text-rose-900',
      indicatorColor: 'bg-rose-500',
      activeSegment: 5,
      gaugePercent,
      mensajeClinico: 'Obesidad severa. Alto riesgo cardiovascular y resistencia a la insulina.',
      recomendacion: 'Manejo multidisciplinario intensivo (Medicina, Nutrición, Psicología) y detección de daño en órgano blanco.',
    };
  }

  return {
    status: 'obesidad_3',
    clasificacion: 'Obesidad Grado III (Mórbida)',
    rangoTexto: '≥ 40.0 kg/m²',
    badgeClass: 'bg-red-700 text-white border-red-800 font-bold',
    borderClass: 'border-red-500',
    bgClass: 'bg-red-100/70',
    textClass: 'text-red-950 font-bold',
    indicatorColor: 'bg-red-700',
    activeSegment: 5,
    gaugePercent,
    mensajeClinico: 'Obesidad muy severa (mórbida). Riesgo cardiovascular extremo.',
    recomendacion: 'Evaluación médica prioritaria para abordaje integral y derivación especializada.',
  };
}

/**
 * Riesgo Cardiovascular y Metabólico según Perímetro Abdominal (Norma Técnica MINSA / ATP III)
 * Varones: Normal < 94 cm, Alto 94-102 cm, Muy Alto > 102 cm
 * Mujeres: Normal < 80 cm, Alto 80-88 cm, Muy Alto > 88 cm
 */
export function calculateAbdominalRisk(perimetroCm?: number, sexo?: Sexo): RiesgoAbdominal | undefined {
  if (!perimetroCm || perimetroCm <= 0 || !sexo) return undefined;

  if (sexo === 'M') {
    if (perimetroCm < 94) return 'NORMAL';
    if (perimetroCm <= 102) return 'ALTO';
    return 'MUY ALTO';
  } else {
    if (perimetroCm < 80) return 'NORMAL';
    if (perimetroCm <= 88) return 'ALTO';
    return 'MUY ALTO';
  }
}

/**
 * Clasificación de la Presión Arterial según guías clínicas y umbrales configurados
 */
export function classifyBloodPressure(
  pas?: number, 
  pad?: number, 
  thresholds?: ClinicalThresholds
): EstadioHta | undefined {
  if (!pas || !pad) return undefined;

  const crisisPas = thresholds?.paSistolicaCrisisMin ?? 180;
  const crisisPad = thresholds?.paDiastolicaCrisisMin ?? 120;
  if (pas >= crisisPas || pad >= crisisPad) return 'CRISIS';

  const controlPas = thresholds?.paSistolicaControlMax ?? 139;
  const controlPad = thresholds?.paDiastolicaControlMax ?? 89;

  if (pas >= 160 || pad >= 100) return 'ESTADIO_2';
  if (pas > controlPas || pad > controlPad) return 'ESTADIO_1';
  if (pas >= 120 || pad >= 80) return 'PREHIPERTENSION';
  return 'NORMAL';
}

/**
 * Clasifica el estado de presión arterial para alertas visuales
 */
export function getBloodPressureAlertStatus(
  pas?: number,
  pad?: number,
  thresholds?: ClinicalThresholds
): {
  level: 'normal' | 'controlado' | 'alerta' | 'crisis' | 'indeterminado';
  label: string;
  badgeClass: string;
} {
  if (!pas || !pad) {
    return { level: 'indeterminado', label: 'Sin datos', badgeClass: 'bg-slate-100 text-slate-600' };
  }

  const crisisPas = thresholds?.paSistolicaCrisisMin ?? 180;
  const crisisPad = thresholds?.paDiastolicaCrisisMin ?? 110;
  if (pas >= crisisPas || pad >= crisisPad) {
    return { level: 'crisis', label: 'Crisis Hipertensiva', badgeClass: 'bg-red-700 text-white font-bold animate-pulse' };
  }

  const maxPas = thresholds?.paSistolicaControlMax ?? 139;
  const maxPad = thresholds?.paDiastolicaControlMax ?? 89;

  if (pas > maxPas || pad > maxPad) {
    return { level: 'alerta', label: 'No Controlado', badgeClass: 'bg-red-100 text-red-800 border border-red-300' };
  }

  return { level: 'controlado', label: 'Control Óptimo', badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300' };
}

/**
 * Clasifica el estado de glucosa para alertas visuales
 */
export function getGlucoseAlertStatus(
  glucosa?: number,
  thresholds?: ClinicalThresholds
): {
  level: 'normal' | 'hipoglucemia' | 'controlado' | 'alerta' | 'crisis' | 'indeterminado';
  label: string;
  badgeClass: string;
} {
  if (!glucosa) {
    return { level: 'indeterminado', label: 'Sin datos', badgeClass: 'bg-slate-100 text-slate-600' };
  }

  const minHypo = thresholds?.glucosaHipoglucemiaMax ?? 70;
  if (glucosa < minHypo) {
    return { level: 'hipoglucemia', label: 'Alerta: Hipoglucemia', badgeClass: 'bg-purple-100 text-purple-900 border border-purple-300 font-bold' };
  }

  const crisisGlu = thresholds?.glucosaCrisisMin ?? 250;
  if (glucosa >= crisisGlu) {
    return { level: 'crisis', label: 'Crisis Hiperglucémica', badgeClass: 'bg-red-700 text-white font-bold animate-pulse' };
  }

  const maxGlu = thresholds?.glucosaAyunoControlMax ?? 130;
  if (glucosa > maxGlu) {
    return { level: 'alerta', label: 'Hiperglucemia / No Controlado', badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300' };
  }

  return { level: 'controlado', label: 'Glucemia Controlada', badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300' };
}

/**
 * Determina si el paciente se encuentra con su condición clínica controlada en el mes
 * Respeta los umbrales configurados por el personal médico o los defaults de MINSA
 */
export function isPatientControlled(
  pas?: number,
  pad?: number,
  glucosa?: number,
  tieneHta: boolean = false,
  tieneDm: boolean = false,
  thresholds?: ClinicalThresholds
): boolean {
  let controlled = true;
  const maxPas = thresholds?.paSistolicaControlMax ?? 139;
  const maxPad = thresholds?.paDiastolicaControlMax ?? 89;
  const maxGlu = thresholds?.glucosaAyunoControlMax ?? 130;
  const minGlu = thresholds?.glucosaHipoglucemiaMax ?? 70;

  if (tieneHta) {
    if (!pas || !pad || pas > maxPas || pad > maxPad) {
      controlled = false;
    }
  }

  if (tieneDm) {
    if (!glucosa || glucosa > maxGlu || glucosa < minGlu) {
      controlled = false;
    }
  }

  // Si no tiene diagnósticos específicos marcados, evalúa con los límites de alerta clínica
  if (!tieneHta && !tieneDm) {
    if (pas && pad && (pas > maxPas || pad > maxPad)) controlled = false;
    if (glucosa && (glucosa > maxGlu || glucosa < minGlu)) controlled = false;
  }

  return controlled;
}

/**
 * Calcula los días transcurridos desde el último control o tamizaje del paciente
 */
export function calculateDaysSinceLastControl(patient: DntPatient): number {
  const dates: number[] = [];

  if (patient.controles) {
    Object.values(patient.controles).forEach((ctrl) => {
      if (ctrl.atendido && ctrl.fecha) {
        const time = new Date(ctrl.fecha).getTime();
        if (!isNaN(time)) dates.push(time);
      }
    });
  }

  if (dates.length > 0) {
    const latest = Math.max(...dates);
    const diff = Math.floor((Date.now() - latest) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }

  if (patient.fechaTamizaje) {
    const time = new Date(patient.fechaTamizaje).getTime();
    if (!isNaN(time)) {
      const diff = Math.floor((Date.now() - time) / (1000 * 60 * 60 * 24));
      return Math.max(0, diff);
    }
  }

  if (patient.fechaCreacion) {
    const time = new Date(patient.fechaCreacion).getTime();
    if (!isNaN(time)) {
      const diff = Math.floor((Date.now() - time) / (1000 * 60 * 60 * 24));
      return Math.max(0, diff);
    }
  }

  return 999;
}

/**
 * Evalúa la caducidad del control mensual según el periodo configurado (ej: 30, 45, 60 días)
 */
export function checkControlCaducidad(
  patient: DntPatient,
  diasCaducidad: number = 30,
  alertaPreventivaDias: number = 7
): {
  overdue: boolean;
  days: number;
  daysRemaining: number;
  isWarning: boolean;
  status: 'al-dia' | 'proximo-a-vencer' | 'vencido';
} {
  const hasChronicCondition = Boolean(patient.tieneHta || patient.tieneDm);
  if (!hasChronicCondition) {
    return { overdue: false, days: 0, daysRemaining: diasCaducidad, isWarning: false, status: 'al-dia' };
  }

  const days = calculateDaysSinceLastControl(patient);
  const overdue = days > diasCaducidad;
  const daysRemaining = Math.max(0, diasCaducidad - days);
  const isWarning = !overdue && daysRemaining <= alertaPreventivaDias && daysRemaining > 0;

  let status: 'al-dia' | 'proximo-a-vencer' | 'vencido' = 'al-dia';
  if (overdue) status = 'vencido';
  else if (isWarning) status = 'proximo-a-vencer';

  return { overdue, days, daysRemaining, isWarning, status };
}

/**
 * Crea la estructura inicial vacía de los 12 meses para seguimiento
 */
export function createEmptyMonthlyControls(): Record<number, MonthlyControl> {
  const controls: Record<number, MonthlyControl> = {};
  for (let m = 1; m <= 12; m++) {
    controls[m] = {
      mes: m,
      atendido: false,
    };
  }
  return controls;
}

export const MESES_DEL_ANIO = [
  { id: 1, nombre: 'Enero', abrev: 'ENE' },
  { id: 2, nombre: 'Febrero', abrev: 'FEB' },
  { id: 3, nombre: 'Marzo', abrev: 'MAR' },
  { id: 4, nombre: 'Abril', abrev: 'ABR' },
  { id: 5, nombre: 'Mayo', abrev: 'MAY' },
  { id: 6, nombre: 'Junio', abrev: 'JUN' },
  { id: 7, nombre: 'Julio', abrev: 'JUL' },
  { id: 8, nombre: 'Agosto', abrev: 'AGO' },
  { id: 9, nombre: 'Setiembre', abrev: 'SET' },
  { id: 10, nombre: 'Octubre', abrev: 'OCT' },
  { id: 11, nombre: 'Noviembre', abrev: 'NOV' },
  { id: 12, nombre: 'Diciembre', abrev: 'DIC' },
];
