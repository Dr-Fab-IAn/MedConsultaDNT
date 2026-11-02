/**
 * Utilidades para el Cálculo y Estratificación del Riesgo Cardiovascular Global (RCV)
 * Basado en las Tablas OMS/OPS/HEARTS y la Guía Técnica del MINSA Perú (DNT)
 */

import { DntPatient, RiesgoCardiovascular, ClinicalThresholds, MonthlyControl } from '../types/dnt';

export interface CalculatedCardiovascularRisk {
  categoria: RiesgoCardiovascular; // 'BAJO' | 'MODERADO' | 'ALTO' | 'MUY_ALTO'
  etiqueta: string;
  rangoPorcentaje: string;
  gaugePercent: number; // 0 - 100
  puntuacionPuntos: number;
  criterioPrincipal: string;
  factoresRiesgo: string[];
  factoresFavorables: string[];
  metaTensional: string;
  metaGlucosa: string;
  metaColesterolLdl: string;
  indicacionEstatinas: string;
  indicacionAas: string;
  recomendacionesClinicas: string[];
  recomendacionesEstiloVida: string[];
  badgeClass: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  indicatorColor: string;
  barColor: string;
}

/**
 * Obtiene el último control mensual con atención efectiva
 */
export function getLatestAttendedControl(patient: DntPatient): MonthlyControl | null {
  if (!patient.controles) return null;
  const attended = Object.values(patient.controles)
    .filter((c) => c.atendido)
    .sort((a, b) => b.mes - a.mes);
  return attended.length > 0 ? attended[0] : null;
}

/**
 * Calcula de forma integral el Riesgo Cardiovascular del paciente,
 * considerando factores basales y el estado actual de sus controles mensuales.
 */
export function calculateCardiovascularRisk(
  patient: DntPatient,
  thresholds?: ClinicalThresholds
): CalculatedCardiovascularRisk {
  const latestCtrl = getLatestAttendedControl(patient);

  // Valores de presión arterial actuales o basales
  const pas = latestCtrl?.paSistolica ?? patient.paSistolicaBasal ?? 120;
  const pad = latestCtrl?.paDiastolica ?? patient.paDiastolicaBasal ?? 80;

  // Valores metabólicos actuales o basales
  const glucosa = latestCtrl?.glucosaMgDl ?? patient.glucosaBasal;
  const imc = latestCtrl?.imc ?? patient.imc;

  const factoresRiesgo: string[] = [];
  const factoresFavorables: string[] = [];
  let puntos = 0;

  // 1. Edad y Sexo
  if (patient.sexo === 'M') {
    if (patient.edad >= 55) {
      puntos += 2;
      factoresRiesgo.push(`Varón de ${patient.edad} años (edad ≥ 55)`);
    } else if (patient.edad >= 45) {
      puntos += 1;
      factoresRiesgo.push(`Varón de ${patient.edad} años (edad 45-54)`);
    } else {
      factoresFavorables.push(`Edad favorable (${patient.edad} años)`);
    }
  } else {
    if (patient.edad >= 65) {
      puntos += 2;
      factoresRiesgo.push(`Mujer de ${patient.edad} años (edad ≥ 65)`);
    } else if (patient.edad >= 55) {
      puntos += 1;
      factoresRiesgo.push(`Mujer de ${patient.edad} años (edad 55-64)`);
    } else {
      factoresFavorables.push(`Edad favorable (${patient.edad} años)`);
    }
  }

  // 2. Comorbilidad Hipertensión Arterial (HTA)
  if (patient.tieneHta) {
    puntos += 2;
    factoresRiesgo.push(`Diagnóstico confirmado de HTA (${patient.estadioHta || 'Estadío I'})`);

    if (pas >= 160 || pad >= 100) {
      puntos += 2;
      factoresRiesgo.push(`Presión arterial actual no controlada (PAS ${pas} / PAD ${pad} mmHg)`);
    } else if (pas >= 140 || pad >= 90) {
      puntos += 1;
      factoresRiesgo.push(`Presión arterial fuera de meta terapéutica (${pas}/${pad} mmHg)`);
    } else {
      factoresFavorables.push(`Control tensional óptimo (${pas}/${pad} mmHg)`);
    }
  } else {
    if (pas >= 140 || pad >= 90) {
      puntos += 1;
      factoresRiesgo.push(`Cifras tensionales elevadas en tamizaje (${pas}/${pad} mmHg)`);
    } else {
      factoresFavorables.push(`Presión arterial normal (${pas}/${pad} mmHg)`);
    }
  }

  // 3. Comorbilidad Diabetes Mellitus (DM)
  if (patient.tieneDm) {
    puntos += 3;
    factoresRiesgo.push(`Diagnóstico de Diabetes Mellitus (${patient.tipoDm || 'DM2'})`);

    if (glucosa && glucosa >= 140) {
      puntos += 1;
      factoresRiesgo.push(`Glicemia basal descompensada (${glucosa} mg/dL)`);
    } else if (glucosa) {
      factoresFavorables.push(`Glicemia basal en rango meta (${glucosa} mg/dL)`);
    }

    if (patient.hba1c && patient.hba1c >= 8.0) {
      puntos += 2;
      factoresRiesgo.push(`Hemoglobina Glicosilada (HbA1c ${patient.hba1c}%) descontrolada`);
    } else if (patient.hba1c && patient.hba1c <= 7.0) {
      factoresFavorables.push(`HbA1c óptima (${patient.hba1c}%)`);
    }

    if (patient.evaluacionPieDiabetico === 'EN_RIESGO' || patient.evaluacionPieDiabetico === 'ULCERA') {
      puntos += 2;
      factoresRiesgo.push(`Pie diabético clasificado: ${patient.evaluacionPieDiabetico}`);
    }
  }

  // 4. Perfil Lipídico / Dislipidemia
  if (patient.tieneDislipidemia || (patient.colesterolTotal && patient.colesterolTotal >= 200)) {
    puntos += 1;
    factoresRiesgo.push('Dislipidemia documentada');

    if (patient.colesterolTotal && patient.colesterolTotal >= 240) {
      puntos += 1;
      factoresRiesgo.push(`Hipercolesterolemia severa (${patient.colesterolTotal} mg/dL)`);
    }
    if (patient.ldl && patient.ldl >= 160) {
      puntos += 1;
      factoresRiesgo.push(`Colesterol LDL aterogénico elevado (${patient.ldl} mg/dL)`);
    }
    if (patient.trigliceridos && patient.trigliceridos >= 200) {
      puntos += 1;
      factoresRiesgo.push(`Hipertrigliceridemia (${patient.trigliceridos} mg/dL)`);
    }
  } else if (patient.colesterolTotal && patient.colesterolTotal < 200) {
    factoresFavorables.push(`Colesterol total normal (${patient.colesterolTotal} mg/dL)`);
  }

  // 5. Antropometría: Obesidad e IMC
  if (imc) {
    if (imc >= 35) {
      puntos += 2;
      factoresRiesgo.push(`Obesidad Grado II/III (IMC: ${imc} kg/m²)`);
    } else if (imc >= 30) {
      puntos += 1;
      factoresRiesgo.push(`Obesidad Grado I (IMC: ${imc} kg/m²)`);
    } else if (imc >= 25) {
      factoresRiesgo.push(`Sobrepeso (IMC: ${imc} kg/m²)`);
    } else {
      factoresFavorables.push(`Peso eutrófico (IMC: ${imc} kg/m²)`);
    }
  }

  // 6. Riesgo Abdominal (Grasa visceral)
  if (patient.riesgoAbdominal === 'MUY ALTO') {
    puntos += 1;
    factoresRiesgo.push(`Perímetro abdominal muy aumentado (${patient.perimetroAbdominalCm || '--'} cm)`);
  } else if (patient.riesgoAbdominal === 'ALTO') {
    factoresRiesgo.push(`Perímetro abdominal limítrofe (${patient.perimetroAbdominalCm || '--'} cm)`);
  }

  // -------------------------------------------------------------------------
  // Determinación de la Categoría Final según Guía Técnica MINSA / OPS
  // -------------------------------------------------------------------------
  let categoria: RiesgoCardiovascular = 'BAJO';
  let criterioPrincipal = '';
  let etiqueta = '';
  let rangoPorcentaje = '';
  let gaugePercent = 25;

  // Criterios automáticos de Riesgo MUY ALTO:
  // - Comorbilidad simultánea de Hipertensión + Diabetes
  // - Diabetes con complicaciones (pie diabético con úlcera o en riesgo)
  // - HTA severa (PAS >= 180 o PAD >= 110)
  // - Puntuación acumulada >= 6 puntos
  // - Asignación explícita previa 'MUY_ALTO'
  if (
    (patient.tieneHta && patient.tieneDm) ||
    (patient.tieneDm && (patient.evaluacionPieDiabetico === 'ULCERA' || patient.evaluacionPieDiabetico === 'EN_RIESGO')) ||
    pas >= 180 || pad >= 110 ||
    puntos >= 6 ||
    patient.riesgoCardiovascular === 'MUY_ALTO'
  ) {
    categoria = 'MUY_ALTO';
    etiqueta = 'Riesgo Muy Alto (≥ 20% - 30%)';
    rangoPorcentaje = '≥ 20% a 10 años';
    gaugePercent = 90;
    criterioPrincipal = (patient.tieneHta && patient.tieneDm)
      ? 'Comorbilidad doble (Hipertensión Arterial + Diabetes Mellitus Tipo 2) con daño endotelial acumulativo.'
      : (pas >= 180 || pad >= 110)
      ? 'Crisis o cifras de presión arterial severamente elevadas (Estadío 2 severo).'
      : 'Múltiples factores de riesgo aterogénicos mayores concurrentes.';
  } else if (
    puntos >= 4 ||
    (patient.tieneDm) ||
    (patient.tieneHta && (patient.edad >= 55 || (patient.colesterolTotal && patient.colesterolTotal >= 240))) ||
    patient.riesgoCardiovascular === 'ALTO'
  ) {
    categoria = 'ALTO';
    etiqueta = 'Riesgo Alto (10% - 19%)';
    rangoPorcentaje = '10% a 19% a 10 años';
    gaugePercent = 68;
    criterioPrincipal = patient.tieneDm
      ? 'Diabetes Mellitus diagnosticada sin evidencia de complicación macrovascular actual.'
      : 'Hipertensión arterial con factores aterogénicos adicionales (edad avanzada o dislipidemia).';
  } else if (
    puntos >= 2 ||
    patient.tieneHta ||
    (imc && imc >= 30) ||
    patient.riesgoCardiovascular === 'MODERADO'
  ) {
    categoria = 'MODERADO';
    etiqueta = 'Riesgo Moderado (5% - 9%)';
    rangoPorcentaje = '5% a 9% a 10 años';
    gaugePercent = 42;
    criterioPrincipal = patient.tieneHta
      ? 'Hipertensión arterial aislada con cifras limítrofes o bajo esquema farmacológico inicial.'
      : 'Presencia de sobrepeso/obesidad y/o dislipidemia moderada en paciente adulto.';
  } else {
    categoria = 'BAJO';
    etiqueta = 'Riesgo Bajo (< 5%)';
    rangoPorcentaje = '< 5% a 10 años';
    gaugePercent = 15;
    criterioPrincipal = 'Cifras tensionales y metabólicas dentro de los rangos de normalidad poblacional.';
  }

  // Metas terapéuticas personalizadas
  let metaTensional = '< 140/90 mmHg (MINSA Estándar)';
  let metaGlucosa = 'Glucosa basal < 130 mg/dL';
  let metaColesterolLdl = '< 115 mg/dL';
  let indicacionEstatinas = 'Modificación de estilo de vida; evaluar si no hay respuesta.';
  let indicacionAas = 'No recomendada de forma rutinaria para prevención primaria.';

  if (categoria === 'MUY_ALTO') {
    metaTensional = '< 130/80 mmHg (Meta Estricta AHA/ACC / MINSA Comórbido)';
    metaGlucosa = 'Glucosa basal 80-130 mg/dL y HbA1c < 7.0%';
    metaColesterolLdl = '< 55 - 70 mg/dL (Reducción ≥ 50%)';
    indicacionEstatinas = 'Estatinas de alta intensidad recomendadas (Atorvastatina 40-80mg o Rosuvastatina 20mg).';
    indicacionAas = 'Aspirina 100 mg/día recomendada en prevención secundaria o muy alto riesgo cardiovascular.';
  } else if (categoria === 'ALTO') {
    metaTensional = '< 130/80 mmHg';
    metaGlucosa = 'Glucosa basal < 130 mg/dL y HbA1c < 7.0%';
    metaColesterolLdl = '< 70 - 100 mg/dL';
    indicacionEstatinas = 'Estatinas de intensidad moderada/alta (Atorvastatina 20-40mg).';
    indicacionAas = 'Evaluar riesgo/beneficio gastrointestinal con médico tratante.';
  } else if (categoria === 'MODERADO') {
    metaTensional = '< 140/90 mmHg';
    metaGlucosa = 'Glucosa basal < 100 mg/dL';
    metaColesterolLdl = '< 100 - 115 mg/dL';
    indicacionEstatinas = 'Estatinas de intensidad moderada si persiste LDL > 130 mg/dL tras 3 meses de dieta.';
  }

  // Recomendaciones clínicas
  const recomendacionesClinicas: string[] = [];
  if (categoria === 'MUY_ALTO' || categoria === 'ALTO') {
    recomendacionesClinicas.push(`Monitoreo clínico mensual riguroso con toma de PA estandarizada y registro en padrón nominal.`);
    recomendacionesClinicas.push(`Perfil lipídico completo (Colesterol total, HDL, LDL, Triglicéridos) cada 6 meses.`);
    recomendacionesClinicas.push(`Control de función renal: creatinina sérica, tasa de filtrado glomerular y microalbuminuria anual.`);
    if (patient.tieneDm) {
      recomendacionesClinicas.push(`Examen con monofilamento para detección precoz de pie diabético y evaluación de agudeza visual/fondo de ojo.`);
    }
  } else {
    recomendacionesClinicas.push(`Controles clínicos periódicos cada 2-3 meses para tamizaje y seguimiento.`);
    recomendacionesClinicas.push(`Evaluación de laboratorio anual (glicemia en ayunas y perfil lipídico).`);
  }

  const recomendacionesEstiloVida: string[] = [
    'Dieta cardiosaludable (estilo DASH): reducir sodio a < 2 g/día (menos de 1 cucharadita cafetera).',
    'Actividad física aeróbica regular: mínimo 150 minutos semanales de caminata rápida o bicicleta.',
    'Evitar el consumo de tabaco y limitar al mínimo el consumo de bebidas alcohólicas.',
    'Mantenimiento o reducción del 5-10% del peso corporal si presenta sobrepeso u obesidad.',
  ];

  // Configuración de estilos visuales
  let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
  let borderClass = 'border-emerald-300';
  let bgClass = 'bg-emerald-50/60';
  let textClass = 'text-emerald-900';
  let indicatorColor = 'bg-emerald-500';
  let barColor = '#10b981';

  if (categoria === 'MUY_ALTO') {
    badgeClass = 'bg-red-100 text-red-800 border-red-300 font-bold';
    borderClass = 'border-red-400';
    bgClass = 'bg-red-50/80';
    textClass = 'text-red-950';
    indicatorColor = 'bg-red-600';
    barColor = '#dc2626';
  } else if (categoria === 'ALTO') {
    badgeClass = 'bg-orange-100 text-orange-900 border-orange-300 font-bold';
    borderClass = 'border-orange-300';
    bgClass = 'bg-orange-50/70';
    textClass = 'text-orange-950';
    indicatorColor = 'bg-orange-500';
    barColor = '#f97316';
  } else if (categoria === 'MODERADO') {
    badgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-semibold';
    borderClass = 'border-amber-300';
    bgClass = 'bg-amber-50/60';
    textClass = 'text-amber-950';
    indicatorColor = 'bg-amber-500';
    barColor = '#f59e0b';
  }

  return {
    categoria,
    etiqueta,
    rangoPorcentaje,
    gaugePercent,
    puntuacionPuntos: puntos,
    criterioPrincipal,
    factoresRiesgo,
    factoresFavorables,
    metaTensional,
    metaGlucosa,
    metaColesterolLdl,
    indicacionEstatinas,
    indicacionAas,
    recomendacionesClinicas,
    recomendacionesEstiloVida,
    badgeClass,
    borderClass,
    bgClass,
    textClass,
    indicatorColor,
    barColor,
  };
}
