import React, { useState } from 'react';
import { 
  X, 
  SlidersHorizontal, 
  Heart, 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  Save, 
  ShieldCheck, 
  Info,
  Calendar,
  Check,
  FlaskConical
} from 'lucide-react';
import { ClinicalThresholds, ClinicalThresholdPreset } from '../types/dnt';
import { CLINICAL_THRESHOLDS_PRESETS, DEFAULT_CLINICAL_THRESHOLDS } from '../utils/storage';
import { getBloodPressureAlertStatus, getGlucoseAlertStatus } from '../utils/clinicalCalculations';

interface ClinicalThresholdsModalProps {
  isOpen: boolean;
  currentThresholds: ClinicalThresholds;
  onClose: () => void;
  onSave: (newThresholds: ClinicalThresholds) => void;
  onReset: () => void;
}

export const ClinicalThresholdsModal: React.FC<ClinicalThresholdsModalProps> = ({
  isOpen,
  currentThresholds,
  onClose,
  onSave,
  onReset,
}) => {
  if (!isOpen) return null;

  const [thresholds, setThresholds] = useState<ClinicalThresholds>({ ...currentThresholds });
  const [activeTab, setActiveTab] = useState<'hta' | 'dm' | 'caducidad' | 'simulador'>('hta');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Estados para el simulador de prueba en vivo
  const [testPas, setTestPas] = useState<number>(138);
  const [testPad, setTestPad] = useState<number>(88);
  const [testGlucose, setTestGlucose] = useState<number>(128);
  const [testDaysSinceControl, setTestDaysSinceControl] = useState<number>(32);

  const handlePresetSelect = (presetKey: Exclude<ClinicalThresholdPreset, 'PERSONALIZADO'>) => {
    const selectedPreset = CLINICAL_THRESHOLDS_PRESETS[presetKey];
    setThresholds({
      ...selectedPreset,
      ultimaActualizacion: new Date().toISOString(),
    });
  };

  const handleNumberChange = (field: keyof ClinicalThresholds, value: string) => {
    const num = parseInt(value, 10);
    setThresholds((prev) => ({
      ...prev,
      [field]: isNaN(num) ? 0 : num,
      preset: 'PERSONALIZADO',
    }));
  };

  const handleFloatChange = (field: keyof ClinicalThresholds, value: string) => {
    const num = parseFloat(value);
    setThresholds((prev) => ({
      ...prev,
      [field]: isNaN(num) ? 0 : num,
      preset: 'PERSONALIZADO',
    }));
  };

  const handleSave = () => {
    onSave(thresholds);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  const handleResetToDefaults = () => {
    if (window.confirm('¿Desea restablecer todos los umbrales a los valores oficiales de la Norma Técnica MINSA NTS Nº 166?')) {
      onReset();
      setThresholds({ ...DEFAULT_CLINICAL_THRESHOLDS });
    }
  };

  // Simulación de alertas con los umbrales actuales en edición
  const bpSimResult = getBloodPressureAlertStatus(testPas, testPad, thresholds);
  const glucoseSimResult = getGlucoseAlertStatus(testGlucose, thresholds);
  const isSimOverdue = testDaysSinceControl > thresholds.diasCaducidadControl;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Cabecera del Modal */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-teal-50/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-700 text-white flex items-center justify-center shadow-sm">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Configuración de Umbrales Clínicos y Alertas
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full font-semibold border bg-white text-slate-700 border-slate-300">
                  {thresholds.preset === 'MINSA_ESTANDAR' && 'MINSA NTS Nº 166'}
                  {thresholds.preset === 'AHA_ESTRICTO' && 'ACC/AHA Estricto'}
                  {thresholds.preset === 'ADULTO_MAYOR' && 'Geriátrico Permisivo'}
                  {thresholds.preset === 'PERSONALIZADO' && 'Personalizado'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Calibre los límites de control de Presión Arterial, Glucosa y el plazo de caducidad para alertas de seguimiento.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Presets Rápidos */}
        <div className="px-6 py-3 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5 shrink-0">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span>Guías / Protocolos Predeterminados:</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handlePresetSelect('MINSA_ESTANDAR')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                thresholds.preset === 'MINSA_ESTANDAR'
                  ? 'bg-teal-700 text-white shadow-xs font-semibold'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              MINSA Estándar (&lt;140/90, 30d)
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('AHA_ESTRICTO')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                thresholds.preset === 'AHA_ESTRICTO'
                  ? 'bg-teal-700 text-white shadow-xs font-semibold'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              ACC/AHA Estricto (&lt;130/80, 30d)
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('ADULTO_MAYOR')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                thresholds.preset === 'ADULTO_MAYOR'
                  ? 'bg-teal-700 text-white shadow-xs font-semibold'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              Adulto Mayor (&lt;150/90, 45d)
            </button>
          </div>
        </div>

        {/* Pestañas de configuración */}
        <div className="flex border-b border-slate-200 bg-white px-6 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('hta')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'hta'
                ? 'border-red-600 text-red-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Heart className="w-4 h-4 text-red-600" />
            <span>Presión Arterial (HTA)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dm')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'dm'
                ? 'border-teal-700 text-teal-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-4 h-4 text-teal-700" />
            <span>Glucosa & Diabetes (DM)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('caducidad')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'caducidad'
                ? 'border-amber-600 text-amber-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Caducidad de Controles</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('simulador')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'simulador'
                ? 'border-indigo-600 text-indigo-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FlaskConical className="w-4 h-4 text-indigo-600" />
            <span>Simulador de Prueba</span>
          </button>
        </div>

        {/* Cuerpo del Modal con Contenido por Pestaña */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          
          {/* TAB 1: PRESIÓN ARTERIAL (HTA) */}
          {activeTab === 'hta' && (
            <div className="space-y-6">
              <div className="bg-red-50/60 border border-red-200 rounded-lg p-4 text-xs text-red-950 flex items-start gap-3">
                <Info className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Criterios de Evaluación Tensional</p>
                  <p className="text-red-900">
                    Los pacientes con valores por debajo de los límites máximos se considerarán <strong>Controlados</strong>.
                    Valores iguales o superiores al umbral de crisis activarán alertas rojas prioritarias de urgencia clínica.
                  </p>
                </div>
              </div>

              {/* Metas de Control */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Metas de Control Tensional Óptimo</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="paSistolicaControlMax" className="block text-xs font-semibold text-slate-700 mb-1">
                      PAS Máxima Controlada (mmHg)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="paSistolicaControlMax"
                        type="number"
                        min="100"
                        max="180"
                        value={thresholds.paSistolicaControlMax}
                        onChange={(e) => handleNumberChange('paSistolicaControlMax', e.target.value)}
                        className="w-full px-3 py-2 font-mono text-sm border border-slate-300 rounded-md bg-white focus:ring-1 focus:ring-teal-700 focus:outline-none"
                      />
                      <span className="text-xs text-slate-500 font-mono">mmHg</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Controlado si PAS &le; {thresholds.paSistolicaControlMax} (o &lt; {thresholds.paSistolicaControlMax + 1})
                    </p>
                  </div>

                  <div>
                    <label htmlFor="paDiastolicaControlMax" className="block text-xs font-semibold text-slate-700 mb-1">
                      PAD Máxima Controlada (mmHg)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="paDiastolicaControlMax"
                        type="number"
                        min="60"
                        max="110"
                        value={thresholds.paDiastolicaControlMax}
                        onChange={(e) => handleNumberChange('paDiastolicaControlMax', e.target.value)}
                        className="w-full px-3 py-2 font-mono text-sm border border-slate-300 rounded-md bg-white focus:ring-1 focus:ring-teal-700 focus:outline-none"
                      />
                      <span className="text-xs text-slate-500 font-mono">mmHg</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Controlado si PAD &le; {thresholds.paDiastolicaControlMax} (o &lt; {thresholds.paDiastolicaControlMax + 1})
                    </p>
                  </div>
                </div>
              </div>

              {/* Umbrales de Crisis Hipertensiva */}
              <div className="border border-red-200 rounded-lg p-4 bg-red-50/30 space-y-4">
                <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Umbral de Crisis Hipertensiva (Emergencia)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="paSistolicaCrisisMin" className="block text-xs font-semibold text-slate-700 mb-1">
                      PAS de Crisis Hipertensiva (&ge; mmHg)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="paSistolicaCrisisMin"
                        type="number"
                        min="160"
                        max="240"
                        value={thresholds.paSistolicaCrisisMin}
                        onChange={(e) => handleNumberChange('paSistolicaCrisisMin', e.target.value)}
                        className="w-full px-3 py-2 font-mono text-sm border border-red-300 rounded-md bg-white focus:ring-1 focus:ring-red-600 focus:outline-none"
                      />
                      <span className="text-xs text-slate-500 font-mono">mmHg</span>
                    </div>
                    <p className="text-[11px] text-red-600 mt-1">
                      Dispara alerta crítica si PAS &ge; {thresholds.paSistolicaCrisisMin}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="paDiastolicaCrisisMin" className="block text-xs font-semibold text-slate-700 mb-1">
                      PAD de Crisis Hipertensiva (&ge; mmHg)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="paDiastolicaCrisisMin"
                        type="number"
                        min="100"
                        max="140"
                        value={thresholds.paDiastolicaCrisisMin}
                        onChange={(e) => handleNumberChange('paDiastolicaCrisisMin', e.target.value)}
                        className="w-full px-3 py-2 font-mono text-sm border border-red-300 rounded-md bg-white focus:ring-1 focus:ring-red-600 focus:outline-none"
                      />
                      <span className="text-xs text-slate-500 font-mono">mmHg</span>
                    </div>
                    <p className="text-[11px] text-red-600 mt-1">
                      Dispara alerta crítica si PAD &ge; {thresholds.paDiastolicaCrisisMin}
                    </p>
                  </div>
                </div>
              </div>

              {/* Guía visual del semáforo tensional */}
              <div className="border border-slate-200 rounded-lg p-3 bg-white text-xs">
                <span className="font-semibold text-slate-600 block mb-2">Escala de Clasificación Activa:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
                    <span className="font-bold block">Controlado</span>
                    <span className="font-mono text-[11px]">&lt; {thresholds.paSistolicaControlMax + 1} / &lt; {thresholds.paDiastolicaControlMax + 1}</span>
                  </div>
                  <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-800">
                    <span className="font-bold block">No Controlado / Alerta</span>
                    <span className="font-mono text-[11px]">{thresholds.paSistolicaControlMax + 1} - {thresholds.paSistolicaCrisisMin - 1}</span>
                  </div>
                  <div className="p-2 rounded bg-red-100 border border-red-300 text-red-900 font-bold">
                    <span className="block">Crisis Hipertensiva</span>
                    <span className="font-mono text-[11px]">&ge; {thresholds.paSistolicaCrisisMin} / &ge; {thresholds.paDiastolicaCrisisMin}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GLUCOSA & DIABETES (DM) */}
          {activeTab === 'dm' && (
            <div className="space-y-6">
              <div className="bg-teal-50/70 border border-teal-200 rounded-lg p-4 text-xs text-teal-950 flex items-start gap-3">
                <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Límites Glucémicos para Diabetes Tipo 2</p>
                  <p className="text-teal-900">
                    Se evalúan tanto los límites superiores de hiperglucemia como los límites inferiores para detectar oportunamente <strong>hipoglucemias</strong> yatrógenas secundarias al tratamiento con antidiabéticos o insulina.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Meta de Glucosa Ayuno */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-2">
                  <label htmlFor="glucosaAyunoControlMax" className="block text-xs font-bold text-slate-800">
                    Glucosa Basal Meta de Control (mg/dL)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="glucosaAyunoControlMax"
                      type="number"
                      min="90"
                      max="180"
                      value={thresholds.glucosaAyunoControlMax}
                      onChange={(e) => handleNumberChange('glucosaAyunoControlMax', e.target.value)}
                      className="w-full px-3 py-2 font-mono text-sm border border-slate-300 rounded-md bg-white focus:ring-1 focus:ring-teal-700 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500 font-mono">mg/dL</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    MINSA recomienda &le; 130 mg/dL en ayunas para DM2 controlado.
                  </p>
                </div>

                {/* Umbral de Hipoglucemia */}
                <div className="border border-purple-200 rounded-lg p-4 bg-purple-50/30 space-y-2">
                  <label htmlFor="glucosaHipoglucemiaMax" className="block text-xs font-bold text-purple-900">
                    Alerta de Hipoglucemia (&lt; mg/dL)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="glucosaHipoglucemiaMax"
                      type="number"
                      min="50"
                      max="90"
                      value={thresholds.glucosaHipoglucemiaMax}
                      onChange={(e) => handleNumberChange('glucosaHipoglucemiaMax', e.target.value)}
                      className="w-full px-3 py-2 font-mono text-sm border border-purple-300 rounded-md bg-white focus:ring-1 focus:ring-purple-700 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500 font-mono">mg/dL</span>
                  </div>
                  <p className="text-[11px] text-purple-700">
                    Valores inferiores a {thresholds.glucosaHipoglucemiaMax} mg/dL disparan alerta morada de riesgo vital.
                  </p>
                </div>

                {/* Alerta de Descontrol Agudo */}
                <div className="border border-amber-200 rounded-lg p-4 bg-amber-50/30 space-y-2">
                  <label htmlFor="glucosaAlertaMin" className="block text-xs font-bold text-amber-900">
                    Alerta de Hiperglucemia (&ge; mg/dL)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="glucosaAlertaMin"
                      type="number"
                      min="140"
                      max="220"
                      value={thresholds.glucosaAlertaMin}
                      onChange={(e) => handleNumberChange('glucosaAlertaMin', e.target.value)}
                      className="w-full px-3 py-2 font-mono text-sm border border-amber-300 rounded-md bg-white focus:ring-1 focus:ring-amber-700 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500 font-mono">mg/dL</span>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    Resalta descompensación franca y necesidad de titulación farmacológica.
                  </p>
                </div>

                {/* Crisis Hiperglucémica */}
                <div className="border border-red-200 rounded-lg p-4 bg-red-50/30 space-y-2">
                  <label htmlFor="glucosaCrisisMin" className="block text-xs font-bold text-red-900">
                    Crisis Hiperglucémica (&ge; mg/dL)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="glucosaCrisisMin"
                      type="number"
                      min="200"
                      max="400"
                      value={thresholds.glucosaCrisisMin}
                      onChange={(e) => handleNumberChange('glucosaCrisisMin', e.target.value)}
                      className="w-full px-3 py-2 font-mono text-sm border border-red-300 rounded-md bg-white focus:ring-1 focus:ring-red-700 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500 font-mono">mg/dL</span>
                  </div>
                  <p className="text-[11px] text-red-700">
                    Sospecha de Estado Hiperosmolar o Cetoacidosis Diabética.
                  </p>
                </div>
              </div>

              {/* Meta HbA1c */}
              <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="hba1cControlMax" className="text-xs font-bold text-slate-800">
                    Meta de Hemoglobina Glicosilada (HbA1c %)
                  </label>
                  <span className="font-mono text-xs font-bold text-teal-800">&le; {thresholds.hba1cControlMax}%</span>
                </div>
                <input
                  id="hba1cControlMax"
                  type="number"
                  step="0.1"
                  min="6.0"
                  max="9.0"
                  value={thresholds.hba1cControlMax}
                  onChange={(e) => handleFloatChange('hba1cControlMax', e.target.value)}
                  className="w-full px-3 py-2 font-mono text-sm border border-slate-300 rounded-md bg-white focus:ring-1 focus:ring-teal-700 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500">
                  Estándar general: &le; 7.0%. Para adultos mayores o con comorbilidad severa puede flexibilizarse a 8.0%.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: PERIODO DE CADUCIDAD DE CONTROLES */}
          {activeTab === 'caducidad' && (
            <div className="space-y-6">
              <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-4 text-xs text-amber-950 flex items-start gap-3">
                <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Vigencia Temporal de Controles de Pacientes Crónicos</p>
                  <p className="text-amber-900">
                    Define el número máximo de días permitidos sin atención médica antes de que el paciente crónico (HTA o DM) sea marcado con <strong>Alerta Roja de Control Vencido</strong> en el padrón nominal y en los indicadores de red.
                  </p>
                </div>
              </div>

              {/* Selector interactivo de días de caducidad */}
              <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Periodo de Caducidad de Controles Mensuales
                    </h4>
                    <p className="text-xs text-slate-500">
                      Tiempo tras el cual un paciente sin control pasa a estado de abandono temporal o desactualizado.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-2xl font-extrabold text-teal-800">
                      {thresholds.diasCaducidadControl}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 ml-1">días</span>
                  </div>
                </div>

                {/* Slider visual */}
                <div className="space-y-2">
                  <input
                    type="range"
                    min="15"
                    max="90"
                    step="5"
                    value={thresholds.diasCaducidadControl}
                    onChange={(e) => handleNumberChange('diasCaducidadControl', e.target.value)}
                    className="w-full accent-teal-700 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>15 días (Quincenal)</span>
                    <span className="font-bold text-teal-700">30 días (MINSA)</span>
                    <span>45 días</span>
                    <span>60 días (Bimestral)</span>
                    <span>90 días (Trimestral)</span>
                  </div>
                </div>

                {/* Botones de selección rápida */}
                <div className="pt-2 flex flex-wrap gap-2">
                  {[15, 30, 45, 60, 90].map((dias) => (
                    <button
                      key={dias}
                      type="button"
                      onClick={() => setThresholds((prev) => ({ ...prev, diasCaducidadControl: dias, preset: 'PERSONALIZADO' }))}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        thresholds.diasCaducidadControl === dias
                          ? 'bg-teal-700 text-white font-bold shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {dias} días {dias === 30 && '(Norma MINSA)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Días para alerta preventiva de vencimiento */}
              <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="alertaPreventivaDias" className="text-xs font-bold text-slate-800 block">
                      Anticipación de Alerta Preventiva
                    </label>
                    <span className="text-xs text-slate-500">
                      Días previos al vencimiento para advertir al personal sobre la próxima cita del paciente.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="alertaPreventivaDias"
                      type="number"
                      min="1"
                      max="15"
                      value={thresholds.alertaPreventivaDias}
                      onChange={(e) => handleNumberChange('alertaPreventivaDias', e.target.value)}
                      className="w-20 px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md text-right bg-white focus:ring-1 focus:ring-teal-700 focus:outline-none"
                    />
                    <span className="text-xs font-semibold text-slate-600">días</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SIMULADOR DE PRUEBA EN VIVO */}
          {activeTab === 'simulador' && (
            <div className="space-y-6">
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-lg p-4 text-xs text-indigo-950 flex items-start gap-3">
                <FlaskConical className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Laboratorio de Prueba de Umbrales en Vivo</p>
                  <p className="text-indigo-900">
                    Compruebe inmediatamente cómo responderá el sistema frente a mediciones clínicas reales de pacientes usando los umbrales que tiene configurados actualmente.
                  </p>
                </div>
              </div>

              {/* Simulador de Presión Arterial */}
              <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-red-600" />
                    <span>Prueba de Presión Arterial</span>
                  </h4>
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${bpSimResult.badgeClass}`}>
                    {bpSimResult.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      PAS Ingresada (mmHg)
                    </label>
                    <input
                      type="number"
                      value={testPas}
                      onChange={(e) => setTestPas(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      PAD Ingresada (mmHg)
                    </label>
                    <input
                      type="number"
                      value={testPad}
                      onChange={(e) => setTestPad(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded text-xs text-slate-600 flex items-center justify-between">
                  <span>Diagnóstico tensional con umbrales activos:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {testPas}/{testPad} mmHg &rarr; {bpSimResult.label} (Meta: &le; {thresholds.paSistolicaControlMax}/{thresholds.paDiastolicaControlMax})
                  </span>
                </div>
              </div>

              {/* Simulador de Glucosa */}
              <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-teal-700" />
                    <span>Prueba de Glucemia en Ayunas</span>
                  </h4>
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${glucoseSimResult.badgeClass}`}>
                    {glucoseSimResult.label}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Glucosa Ingresada (mg/dL)
                  </label>
                  <input
                    type="number"
                    value={testGlucose}
                    onChange={(e) => setTestGlucose(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md"
                  />
                </div>

                <div className="p-2.5 bg-slate-50 rounded text-xs text-slate-600 flex items-center justify-between">
                  <span>Evaluación metabólica:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {testGlucose} mg/dL &rarr; {glucoseSimResult.label} (Rango de control: {thresholds.glucosaHipoglucemiaMax} - {thresholds.glucosaAyunoControlMax} mg/dL)
                  </span>
                </div>
              </div>

              {/* Simulador de Caducidad de Control */}
              <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <span>Prueba de Plazo de Caducidad</span>
                  </h4>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                      isSimOverdue
                        ? 'bg-red-100 text-red-800 border border-red-300 font-bold'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    {isSimOverdue ? 'Alerta: Control Vencido' : 'Control Vigente'}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Días transcurridos sin control: {testDaysSinceControl} días
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="90"
                    value={testDaysSinceControl}
                    onChange={(e) => setTestDaysSinceControl(parseInt(e.target.value, 10) || 0)}
                    className="w-full accent-teal-700"
                  />
                </div>

                <div className="p-2.5 bg-slate-50 rounded text-xs text-slate-600 flex items-center justify-between">
                  <span>Estado del paciente en padrón:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {isSimOverdue 
                      ? `Vencido hace ${testDaysSinceControl - thresholds.diasCaducidadControl} días (Límite: ${thresholds.diasCaducidadControl}d)`
                      : `Vigente (Le quedan ${thresholds.diasCaducidadControl - testDaysSinceControl} días)`
                    }
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer del Modal con Acciones */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Valores MINSA</span>
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md shadow-sm transition-colors"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Guardado</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Umbrales</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
