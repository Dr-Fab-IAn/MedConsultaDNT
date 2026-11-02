import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Save, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Activity, 
  Heart, 
  Edit3,
  AlertTriangle,
  Scale,
  ArrowDown,
  ArrowUp,
  Minus,
  Info,
  Printer,
  FileText
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { DntPatient, MonthlyControl, ClinicalThresholds, EstablishmentConfig } from '../types/dnt';
import { 
  MESES_DEL_ANIO, 
  calculateImc, 
  isPatientControlled, 
  getImcNutritionInfo 
} from '../utils/clinicalCalculations';
import { DEFAULT_CLINICAL_THRESHOLDS, getStoredEstablishment } from '../utils/storage';
import { PatientPrintSheetModal } from './PatientPrintSheetModal';
import { UserProfile } from '../types/auth';

interface MonthlyTrackingModalProps {
  patient: DntPatient | null;
  isOpen: boolean;
  thresholds?: ClinicalThresholds;
  establishment?: EstablishmentConfig;
  currentUser?: UserProfile;
  onClose: () => void;
  onSave: (updatedPatient: DntPatient) => void;
}

export const MonthlyTrackingModal: React.FC<MonthlyTrackingModalProps> = ({
  patient,
  isOpen,
  thresholds = DEFAULT_CLINICAL_THRESHOLDS,
  establishment,
  currentUser,
  onClose,
  onSave,
}) => {
  if (!isOpen || !patient) return null;

  const [activeView, setActiveView] = useState<'registro' | 'tendencia'>('registro');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [controles, setControles] = useState<Record<number, MonthlyControl>>({
    ...patient.controles,
  });

  const activeControl = controles[selectedMonth] || {
    mes: selectedMonth,
    atendido: false,
  };

  // Talla efectiva: la registrada en este control o la heredada de la filiación del paciente
  const currentControlTalla = activeControl.tallaCm ?? patient.tallaCm;
  const currentControlPeso = activeControl.pesoKg;

  // IMC dinámico: el explícitamente guardado o recalculado en vivo
  const currentControlImc = activeControl.imc ?? (
    currentControlPeso && currentControlTalla
      ? calculateImc(currentControlPeso, currentControlTalla)
      : undefined
  );

  // Clasificación nutricional basada en rangos estándar de la OMS/MINSA
  const nutritionInfo = getImcNutritionInfo(currentControlImc);

  // Comparativa respecto al IMC basal registrado durante el tamizaje inicial
  const baselineImc = patient.imc;
  const imcDelta = (currentControlImc !== undefined && baselineImc !== undefined)
    ? Number((currentControlImc - baselineImc).toFixed(2))
    : null;

  const handleUpdateMonth = (field: keyof MonthlyControl, value: any) => {
    setControles((prev) => {
      const current = prev[selectedMonth] || { mes: selectedMonth, atendido: true };
      const updated = {
        ...current,
        [field]: value,
      };

      // Si se ingresa fecha, marcar atendido automáticamente
      if (field === 'fecha' && value) {
        updated.atendido = true;
      }

      // Si se ingresa o modifica peso o talla, recalcular IMC usando peso y talla
      const currentWeight = field === 'pesoKg' 
        ? (value ? parseFloat(value) : undefined) 
        : updated.pesoKg;
      const currentHeight = field === 'tallaCm' 
        ? (value ? parseInt(value, 10) : undefined) 
        : (updated.tallaCm ?? patient.tallaCm);

      if (currentWeight && currentHeight && currentWeight > 0 && currentHeight > 0) {
        updated.imc = calculateImc(currentWeight, currentHeight);
      } else if (!currentWeight) {
        updated.imc = undefined;
      }

      // Auto-evaluar estado de control si se actualizan PA o glucosa
      if (field === 'paSistolica' || field === 'paDiastolica' || field === 'glucosaMgDl') {
        const pas = field === 'paSistolica' ? value : updated.paSistolica;
        const pad = field === 'paDiastolica' ? value : updated.paDiastolica;
        const glu = field === 'glucosaMgDl' ? value : updated.glucosaMgDl;

        updated.controlado = isPatientControlled(pas, pad, glu, patient.tieneHta, patient.tieneDm, thresholds);
      }

      return {
        ...prev,
        [selectedMonth]: updated,
      };
    });
  };

  const handleToggleAttendance = (mesNum: number) => {
    setControles((prev) => {
      const current = prev[mesNum] || { mes: mesNum, atendido: false };
      const isNowAttended = !current.atendido;
      return {
        ...prev,
        [mesNum]: {
          ...current,
          atendido: isNowAttended,
          fecha: isNowAttended && !current.fecha ? new Date().toISOString().split('T')[0] : current.fecha,
        },
      };
    });
  };

  const handleSaveAll = () => {
    const updatedPatient: DntPatient = {
      ...patient,
      controles,
      updatedBy: currentUser?.displayName || 'Personal de Salud',
      updatedByRole: currentUser?.role,
      fechaActualizacion: new Date().toISOString(),
    };
    onSave(updatedPatient);
    onClose();
  };

  // Contar controles realizados
  const attendedCount = Object.values(controles).filter((c) => c.atendido).length;
  const controlledCount = Object.values(controles).filter((c) => c.atendido && c.controlado).length;

  // 1. Preparar datos de tendencia para Recharts (los 12 meses)
  const historicalTrendData = MESES_DEL_ANIO.map((mes) => {
    const ctrl = controles[mes.id];
    return {
      mesId: mes.id,
      mes: mes.abrev,
      nombre: mes.nombre,
      atendido: Boolean(ctrl?.atendido),
      fecha: ctrl?.fecha,
      paSistolica: ctrl?.paSistolica !== undefined ? ctrl.paSistolica : null,
      paDiastolica: ctrl?.paDiastolica !== undefined ? ctrl.paDiastolica : null,
      glucosa: ctrl?.glucosaMgDl !== undefined ? ctrl.glucosaMgDl : null,
      peso: ctrl?.pesoKg !== undefined ? ctrl.pesoKg : null,
      imc: ctrl?.imc !== undefined ? ctrl.imc : null,
      controlado: ctrl?.controlado,
    };
  });

  // Filtrar meses con al menos una medición válida de PA o Glucosa
  const validBpPoints = historicalTrendData.filter((d) => d.paSistolica !== null && d.paDiastolica !== null);
  const validGlucosePoints = historicalTrendData.filter((d) => d.glucosa !== null);

  // Calcular promedios históricos
  const avgPas = validBpPoints.length > 0 
    ? Math.round(validBpPoints.reduce((acc, d) => acc + (d.paSistolica || 0), 0) / validBpPoints.length)
    : null;
  const avgPad = validBpPoints.length > 0 
    ? Math.round(validBpPoints.reduce((acc, d) => acc + (d.paDiastolica || 0), 0) / validBpPoints.length)
    : null;
  const avgGlucose = validGlucosePoints.length > 0
    ? Math.round(validGlucosePoints.reduce((acc, d) => acc + (d.glucosa || 0), 0) / validGlucosePoints.length)
    : null;

  // Obtener último control con IMC registrado o basal del paciente para métricas
  const controlsWithImc = Object.values(controles)
    .filter((c) => c.atendido && c.imc !== undefined && c.imc > 0)
    .sort((a, b) => b.mes - a.mes);
  const latestRecordedImc = controlsWithImc.length > 0 ? controlsWithImc[0].imc : patient.imc;
  const latestNutritionInfo = getImcNutritionInfo(latestRecordedImc);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera del modal */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Seguimiento Mensual DNT · {patient.nombreCompleto}
              </h3>
              <span className="font-mono text-xs px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-semibold">
                DNI: {patient.dni}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <span>HC: {patient.numeroHC || 'S/N'}</span>
              <span>·</span>
              <span>
                Diagnósticos: {patient.tieneHta ? 'HTA ' : ''}{patient.tieneDm ? 'DM2 ' : ''}
                {!patient.tieneHta && !patient.tieneDm ? 'En tamizaje preventivo' : ''}
              </span>
              <span>·</span>
              <span className="font-semibold text-teal-800">
                {attendedCount} de 12 controles ({controlledCount} controlados)
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de pestañas de navegación interna: Formulario vs Tendencias vs Reporte Clínico */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 text-xs font-semibold">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveView('registro')}
              className={`py-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeView === 'registro'
                  ? 'border-teal-700 text-teal-900 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Registro del Mes (Ene - Dic)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('tendencia')}
              className={`py-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeView === 'tendencia'
                  ? 'border-teal-700 text-teal-900 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-teal-700" />
              <span>Tendencias Históricas (PA y Glucosa)</span>
              {(validBpPoints.length > 0 || validGlucosePoints.length > 0) && (
                <span className="font-mono text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded font-bold">
                  {Math.max(validBpPoints.length, validGlucosePoints.length)} datos
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="my-1.5 px-3 py-1.5 bg-slate-50 hover:bg-teal-50 text-teal-900 border border-teal-200 rounded-md transition-colors flex items-center gap-1.5 font-semibold text-xs shadow-2xs cursor-pointer"
            title="Generar reporte clínico completo en PDF con riesgo cardiovascular y controles para imprimir o guardar"
          >
            <Printer className="w-4 h-4 text-teal-700" />
            <span className="hidden sm:inline">Reporte Clínico PDF / Imprimir</span>
          </button>
        </div>

        {/* VISTA 1: REGISTRO DEL MES */}
        {activeView === 'registro' && (
          <>
            {/* Matriz de los 12 meses */}
            <div className="p-4 bg-slate-100 border-b border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-600 block">
                  Seleccione el mes para registrar o revisar atención:
                </span>
                <button
                  type="button"
                  onClick={() => setActiveView('tendencia')}
                  className="text-xs font-semibold text-teal-800 hover:text-teal-950 flex items-center gap-1 hover:underline"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Ver gráfico de evolución</span>
                </button>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
                {MESES_DEL_ANIO.map((mes) => {
                  const ctrl = controles[mes.id];
                  const isSelected = selectedMonth === mes.id;
                  const isAttended = Boolean(ctrl?.atendido);
                  const isControlled = Boolean(ctrl?.controlado);

                  return (
                    <button
                      key={mes.id}
                      type="button"
                      onClick={() => setSelectedMonth(mes.id)}
                      className={`p-2 rounded-md border text-center transition-all ${
                        isSelected
                          ? 'border-teal-700 bg-white ring-2 ring-teal-700/20 shadow-xs'
                          : isAttended
                          ? 'border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100/70'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-bold block text-slate-800">
                        {mes.abrev}
                      </span>
                      <div className="mt-1 flex items-center justify-center">
                        {isAttended ? (
                          isControlled ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-amber-500" title="Atendido no controlado"></span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-400">-</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Formulario del mes seleccionado */}
            <div className="p-6 flex-1 overflow-y-auto space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-700" />
                  <h4 className="text-base font-bold text-slate-900">
                    Atención de {MESES_DEL_ANIO.find((m) => m.id === selectedMonth)?.nombre}
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleAttendance(selectedMonth)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                    activeControl.atendido
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{activeControl.atendido ? 'Marcado como Atendido' : 'Marcar como No Atendido'}</span>
                </button>
              </div>

              {/* Bloque 1: Signos Vitales y Fecha de Control */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Control
                  </label>
                  <input
                    type="date"
                    value={activeControl.fecha || ''}
                    onChange={(e) => handleUpdateMonth('fecha', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-700 focus:border-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Presión Sistólica (PAS)
                  </label>
                  <input
                    type="number"
                    min="60"
                    max="260"
                    value={activeControl.paSistolica !== undefined ? activeControl.paSistolica : ''}
                    onChange={(e) => handleUpdateMonth('paSistolica', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    placeholder="mmHg"
                    className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-700 focus:border-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Presión Diastólica (PAD)
                  </label>
                  <input
                    type="number"
                    min="40"
                    max="160"
                    value={activeControl.paDiastolica !== undefined ? activeControl.paDiastolica : ''}
                    onChange={(e) => handleUpdateMonth('paDiastolica', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    placeholder="mmHg"
                    className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-700 focus:border-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Frecuencia Cardíaca (FC)
                  </label>
                  <input
                    type="number"
                    min="40"
                    max="200"
                    value={activeControl.frecuenciaCardiaca !== undefined ? activeControl.frecuenciaCardiaca : ''}
                    onChange={(e) => handleUpdateMonth('frecuenciaCardiaca', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    placeholder="Ej: 72 lpm"
                    className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-700 focus:border-teal-700"
                  />
                </div>
              </div>

              {/* Bloque 2: Antropometría y Bioquímica */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-teal-700" />
                      <span>Peso del Mes (kg)</span>
                    </span>
                    {patient.pesoKg && (
                      <span className="text-[10px] text-slate-400 font-normal">
                        Basal: {patient.pesoKg} kg
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="250"
                    value={activeControl.pesoKg !== undefined ? activeControl.pesoKg : ''}
                    onChange={(e) => handleUpdateMonth('pesoKg', e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="Ej: 74.5"
                    className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-700 focus:border-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Talla de Control (cm)</span>
                    {patient.tallaCm && !activeControl.tallaCm && (
                      <span className="text-[10px] text-teal-700 font-medium">
                        (Heredada de filiación)
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="220"
                    value={activeControl.tallaCm !== undefined ? activeControl.tallaCm : (patient.tallaCm || '')}
                    onChange={(e) => handleUpdateMonth('tallaCm', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    placeholder="Ej: 165"
                    className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-700 focus:border-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Glucosa en Ayunas (mg/dL)
                  </label>
                  <input
                    type="number"
                    min="40"
                    max="600"
                    value={activeControl.glucosaMgDl !== undefined ? activeControl.glucosaMgDl : ''}
                    onChange={(e) => handleUpdateMonth('glucosaMgDl', e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="Ej: 110"
                    className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-700 focus:border-teal-700"
                  />
                </div>
              </div>

              {/* Bloque 3: Campo de Cálculo de IMC e Indicador Visual de Clasificación Nutricional (OMS / MINSA) */}
              <div className={`p-4 rounded-lg border transition-all ${nutritionInfo.bgClass} ${nutritionInfo.borderClass}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-white shadow-2xs border border-slate-200 flex items-center justify-center shrink-0">
                      <Scale className="w-5 h-5 text-teal-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Cálculo de IMC (Peso / Talla²)
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {currentControlPeso && currentControlTalla
                            ? `${currentControlPeso} kg / ${(currentControlTalla / 100).toFixed(2)} m²`
                            : 'Requiere Peso y Talla'}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="font-mono text-2xl font-black text-slate-900 tracking-tight">
                          {currentControlImc !== undefined ? currentControlImc.toFixed(2) : '--'}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">kg/m²</span>

                        {/* Comparativa con el IMC de Tamizaje Inicial */}
                        {imcDelta !== null && (
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 ${
                            imcDelta < 0
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : imcDelta > 0
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {imcDelta < 0 ? (
                              <>
                                <ArrowDown className="w-3 h-3 text-emerald-700" />
                                <span>{Math.abs(imcDelta)} kg/m² vs tamizaje inicial</span>
                              </>
                            ) : imcDelta > 0 ? (
                              <>
                                <ArrowUp className="w-3 h-3 text-amber-700" />
                                <span>+{imcDelta} kg/m² vs tamizaje inicial</span>
                              </>
                            ) : (
                              <>
                                <Minus className="w-3 h-3 text-slate-500" />
                                <span>Sin variación vs tamizaje</span>
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Badge de Clasificación Nutricional (Estándar OMS) */}
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-slate-500 block mb-0.5">
                      Estado Nutricional (OMS/MINSA)
                    </span>
                    <div className="inline-flex items-center gap-1.5">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold border shadow-2xs ${nutritionInfo.badgeClass}`}>
                        {nutritionInfo.clasificacion}
                      </span>
                      {currentControlImc !== undefined && (
                        <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                          ({nutritionInfo.rangoTexto})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Indicador Visual: Escala Segmentada de Rangos de IMC */}
                <div className="pt-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                    <span>Rangos Estándar de Clasificación Nutricional:</span>
                    {currentControlImc !== undefined && (
                      <span className="font-semibold text-slate-800">
                        Valor en control: <strong className="text-teal-800 font-mono">{currentControlImc.toFixed(2)} kg/m²</strong>
                      </span>
                    )}
                  </div>

                  {/* 5 Rangos Estándar: Bajo Peso | Normal | Sobrepeso | Obesidad I | Obesidad II-III */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {/* 1. Bajo Peso */}
                    <div 
                      className={`p-2 rounded-md border text-center transition-all ${
                        nutritionInfo.activeSegment === 1
                          ? 'bg-sky-100/90 border-sky-400 ring-2 ring-sky-500/30 shadow-xs'
                          : 'bg-white/80 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="text-[11px] font-bold text-sky-950 flex items-center justify-center gap-1">
                        {nutritionInfo.activeSegment === 1 && <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse"></span>}
                        <span>Bajo Peso</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block">&lt; 18.5</span>
                    </div>

                    {/* 2. Peso Normal */}
                    <div 
                      className={`p-2 rounded-md border text-center transition-all ${
                        nutritionInfo.activeSegment === 2
                          ? 'bg-emerald-100/90 border-emerald-400 ring-2 ring-emerald-500/30 shadow-xs'
                          : 'bg-white/80 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="text-[11px] font-bold text-emerald-950 flex items-center justify-center gap-1">
                        {nutritionInfo.activeSegment === 2 && <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>}
                        <span>Normal</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block">18.5 - 24.9</span>
                    </div>

                    {/* 3. Sobrepeso */}
                    <div 
                      className={`p-2 rounded-md border text-center transition-all ${
                        nutritionInfo.activeSegment === 3
                          ? 'bg-amber-100/90 border-amber-400 ring-2 ring-amber-500/30 shadow-xs'
                          : 'bg-white/80 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="text-[11px] font-bold text-amber-950 flex items-center justify-center gap-1">
                        {nutritionInfo.activeSegment === 3 && <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>}
                        <span>Sobrepeso</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block">25.0 - 29.9</span>
                    </div>

                    {/* 4. Obesidad I */}
                    <div 
                      className={`p-2 rounded-md border text-center transition-all ${
                        nutritionInfo.activeSegment === 4
                          ? 'bg-orange-100/90 border-orange-400 ring-2 ring-orange-500/30 shadow-xs'
                          : 'bg-white/80 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="text-[11px] font-bold text-orange-950 flex items-center justify-center gap-1">
                        {nutritionInfo.activeSegment === 4 && <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></span>}
                        <span>Obesidad I</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block">30.0 - 34.9</span>
                    </div>

                    {/* 5. Obesidad II - III */}
                    <div 
                      className={`p-2 rounded-md border text-center transition-all ${
                        nutritionInfo.activeSegment === 5
                          ? 'bg-red-100/90 border-red-400 ring-2 ring-red-500/30 shadow-xs'
                          : 'bg-white/80 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="text-[11px] font-bold text-red-950 flex items-center justify-center gap-1">
                        {nutritionInfo.activeSegment === 5 && <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>}
                        <span>Obesidad II-III</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block">&ge; 35.0</span>
                    </div>
                  </div>

                  {/* Orientación clínica y recomendación */}
                  <div className="pt-1 flex items-start gap-1.5 text-xs text-slate-700">
                    <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-800">{nutritionInfo.mensajeClinico}</strong>{' '}
                      <span className="text-slate-600">{nutritionInfo.recomendacion}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Medicación Entregada / Dispensada
                  </label>
                  <input
                    type="text"
                    value={activeControl.medicacionEntregada || ''}
                    onChange={(e) => handleUpdateMonth('medicacionEntregada', e.target.value)}
                    placeholder="Ej: Losartán 50mg x 60 tab, Metformina 850mg x 60 tab"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Condición del Paciente en este Control
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateMonth('controlado', true)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md border flex items-center justify-center gap-1.5 ${
                        activeControl.controlado === true
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Controlado (PA &le; {thresholds.paSistolicaControlMax}/{thresholds.paDiastolicaControlMax})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateMonth('controlado', false)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md border flex items-center justify-center gap-1.5 ${
                        activeControl.controlado === false
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>No Controlado</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observaciones Clínicas / Evolución
                </label>
                <textarea
                  rows={2}
                  value={activeControl.observaciones || ''}
                  onChange={(e) => handleUpdateMonth('observaciones', e.target.value)}
                  placeholder="Consejería de estilos de vida, adherencia, síntomas de alarma o derivaciones..."
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                />
              </div>
            </div>
          </>
        )}

        {/* VISTA 2: PANEL DE TENDENCIAS HISTÓRICAS (RECHARTS) */}
        {activeView === 'tendencia' && (
          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            {/* Tarjetas resumen de promedios clínicos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[11px] text-slate-500 font-medium block">PA Promedio Sistólica</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className={`font-mono text-xl font-bold ${
                    avgPas && avgPas >= 140 ? 'text-red-600' : 'text-slate-900'
                  }`}>
                    {avgPas || '--'}
                  </span>
                  <span className="text-xs text-slate-500">mmHg</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">Meta: &lt; 140 mmHg</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[11px] text-slate-500 font-medium block">PA Promedio Diastólica</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className={`font-mono text-xl font-bold ${
                    avgPad && avgPad >= 90 ? 'text-red-600' : 'text-slate-900'
                  }`}>
                    {avgPad || '--'}
                  </span>
                  <span className="text-xs text-slate-500">mmHg</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">Meta: &lt; 90 mmHg</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[11px] text-slate-500 font-medium block">Glucosa Promedio</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className={`font-mono text-xl font-bold ${
                    avgGlucose && (avgGlucose > 130 || avgGlucose < 70) ? 'text-amber-600' : 'text-slate-900'
                  }`}>
                    {avgGlucose || '--'}
                  </span>
                  <span className="text-xs text-slate-500">mg/dL</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">Meta: 70 - 130 mg/dL</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[11px] text-slate-500 font-medium block">Último IMC Registrado</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-mono text-xl font-bold text-slate-900">
                    {latestRecordedImc ? latestRecordedImc.toFixed(1) : '--'}
                  </span>
                  <span className="text-xs text-slate-500">kg/m²</span>
                </div>
                <div className="mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border inline-block ${latestNutritionInfo.badgeClass}`}>
                    {latestNutritionInfo.clasificacion}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[11px] text-slate-500 font-medium block">Adherencia Anual</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-mono text-xl font-bold text-teal-800">
                    {attendedCount} / 12
                  </span>
                  <span className="text-xs text-slate-500">meses</span>
                </div>
                <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">
                  {controlledCount} controles en meta
                </span>
              </div>
            </div>

            {/* Gráfico 1: Evolución de Presión Arterial (PAS / PAD) */}
            <div className="border border-slate-200 rounded-lg p-4 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Evolución de Presión Arterial (PAS / PAD mmHg)
                  </h4>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-3 h-1 bg-red-600 rounded inline-block"></span>
                    <span>Sistólica (PAS)</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-3 h-1 bg-blue-600 rounded inline-block"></span>
                    <span>Diastólica (PAD)</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <span className="w-3 border-t border-dashed border-red-400 inline-block"></span>
                    <span>Meta 140/90</span>
                  </span>
                </div>
              </div>

              <div className="h-56 w-full">
                {validBpPoints.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 text-xs">
                    <AlertTriangle className="w-6 h-6 text-amber-500 mb-1" />
                    <span>No hay registros de presión arterial guardados aún para este paciente.</span>
                    <button
                      type="button"
                      onClick={() => setActiveView('registro')}
                      className="mt-2 text-teal-700 font-semibold hover:underline"
                    >
                      Ir al registro del mes para ingresar PA
                    </button>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={historicalTrendData}
                      margin={{ top: 10, right: 25, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis 
                        dataKey="mes" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: '#64748B', fontSize: 11 }}
                      />
                      <YAxis 
                        domain={[40, 200]} 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: '#64748B', fontSize: 11 }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded shadow-lg font-mono space-y-1">
                                <div className="font-sans font-bold text-slate-200 border-b border-slate-700 pb-0.5">
                                  {data.nombre} {data.fecha ? `(${data.fecha})` : ''}
                                </div>
                                {data.paSistolica && data.paDiastolica ? (
                                  <>
                                    <div className="text-red-400">PAS: {data.paSistolica} mmHg</div>
                                    <div className="text-blue-400">PAD: {data.paDiastolica} mmHg</div>
                                    <div className={data.controlado ? 'text-emerald-400' : 'text-amber-400'}>
                                      Estado: {data.controlado ? 'Controlado' : 'No Controlado'}
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-slate-400">Sin atención registrada</div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      {/* Líneas de referencia para metas clínicas */}
                      <ReferenceLine y={thresholds.paSistolicaControlMax + 1} stroke="#EF4444" strokeDasharray="4 4" strokeWidth={1.5} />
                      <ReferenceLine y={thresholds.paDiastolicaControlMax + 1} stroke="#3B82F6" strokeDasharray="4 4" strokeWidth={1.5} />

                      {/* Curvas de PAS y PAD conectando puntos existentes */}
                      <Line
                        type="monotone"
                        dataKey="paSistolica"
                        name="PAS"
                        stroke="#DC2626"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#DC2626', strokeWidth: 1 }}
                        activeDot={{ r: 6 }}
                        connectNulls={true}
                      />
                      <Line
                        type="monotone"
                        dataKey="paDiastolica"
                        name="PAD"
                        stroke="#2563EB"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#2563EB', strokeWidth: 1 }}
                        activeDot={{ r: 6 }}
                        connectNulls={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Gráfico 2: Evolución de Glucosa en Ayunas (mg/dL) */}
            <div className="border border-slate-200 rounded-lg p-4 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-700" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Evolución de Glucosa en Ayunas (mg/dL)
                  </h4>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-3 h-1 bg-teal-600 rounded inline-block"></span>
                    <span>Glucosa basal</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <span className="w-3 border-t border-dashed border-amber-400 inline-block"></span>
                    <span>Meta &le; {thresholds.glucosaAyunoControlMax} mg/dL</span>
                  </span>
                </div>
              </div>

              <div className="h-52 w-full">
                {validGlucosePoints.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 text-xs">
                    <Activity className="w-6 h-6 text-slate-400 mb-1" />
                    <span>No hay registros de glucosa ingresados aún para este paciente.</span>
                    <button
                      type="button"
                      onClick={() => setActiveView('registro')}
                      className="mt-2 text-teal-700 font-semibold hover:underline"
                    >
                      Ir al registro del mes para ingresar valor de glucosa
                    </button>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={historicalTrendData}
                      margin={{ top: 10, right: 25, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis 
                        dataKey="mes" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: '#64748B', fontSize: 11 }}
                      />
                      <YAxis 
                        domain={[50, 250]} 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: '#64748B', fontSize: 11 }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const isGluControlled = data.glucosa && data.glucosa <= thresholds.glucosaAyunoControlMax && data.glucosa >= thresholds.glucosaHipoglucemiaMax;
                            return (
                              <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded shadow-lg font-mono space-y-1">
                                <div className="font-sans font-bold text-slate-200 border-b border-slate-700 pb-0.5">
                                  {data.nombre} {data.fecha ? `(${data.fecha})` : ''}
                                </div>
                                {data.glucosa ? (
                                  <>
                                    <div className="text-teal-300">Glucosa: {data.glucosa} mg/dL</div>
                                    <div className={isGluControlled ? 'text-emerald-400' : 'text-amber-400'}>
                                      Estado: {isGluControlled ? 'En meta terapéutica' : 'Fuera de rango'}
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-slate-400">Sin glucosa registrada</div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      {/* Línea de referencia meta diabetes */}
                      <ReferenceLine y={thresholds.glucosaAyunoControlMax} stroke="#F59E0B" strokeDasharray="4 4" strokeWidth={1.5} />
                      <ReferenceLine y={thresholds.glucosaHipoglucemiaMax} stroke="#9333EA" strokeDasharray="2 2" strokeWidth={1.5} />

                      <Line
                        type="monotone"
                        dataKey="glucosa"
                        name="Glucosa"
                        stroke="#0D9488"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#0D9488', strokeWidth: 1 }}
                        activeDot={{ r: 6 }}
                        connectNulls={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pie del modal */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {activeView === 'registro' 
              ? 'Los datos se sincronizan con las columnas del Padrón Nominal DNT para la exportación a Excel.'
              : 'Las líneas punteadas indican las metas terapéuticas clínicas del MINSA (PA < 140/90 y Glucosa < 130).'}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Seguimiento</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Reporte Clínico en PDF e Impresión Directa */}
      {isReportModalOpen && (
        <PatientPrintSheetModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          patient={{
            ...patient,
            controles,
            fechaActualizacion: new Date().toISOString(),
          }}
          establishment={establishment || getStoredEstablishment()}
          thresholds={thresholds}
        />
      )}
    </div>
  );
};
