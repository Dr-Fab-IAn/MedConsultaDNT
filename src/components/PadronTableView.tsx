import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  Edit3, 
  Calendar, 
  Trash2, 
  Download, 
  FileDown, 
  Upload, 
  Activity, 
  Heart, 
  CheckCircle2, 
  AlertTriangle,
  UserPlus,
  ChevronDown,
  Loader2,
  Filter,
  RotateCcw,
  SlidersHorizontal,
  FileText,
  Bell,
  ClipboardList,
  Printer
} from 'lucide-react';
import { DntPatient, EstablishmentConfig, ClinicalThresholds } from '../types/dnt';
import { exportPadronToExcel, downloadBlankDntTemplate, parseExcelPatients } from '../services/dntExportService';
import { exportBackupJson, DEFAULT_CLINICAL_THRESHOLDS } from '../utils/storage';
import { DntAnalyticsDashboard } from './DntAnalyticsDashboard';
import { notifyPatientDue, getPatientControlDueInfo, getStoredNotificationSettings } from '../utils/notificationScheduler';
import { ClinicalHandoverModal } from './ClinicalHandoverModal';
import { PatientPrintSheetModal } from './PatientPrintSheetModal';
import { UserProfile } from '../types/auth';

interface PadronTableViewProps {
  patients: DntPatient[];
  establishment: EstablishmentConfig;
  thresholds?: ClinicalThresholds;
  currentUser?: UserProfile;
  onEditPatient: (patient: DntPatient) => void;
  onOpenMonthlyTracking: (patient: DntPatient) => void;
  onDeletePatient: (patientId: string) => void;
  onOpenNewPatient: () => void;
  onImportPatients: (imported: Partial<DntPatient>[]) => void;
  onOpenGerencialReport?: () => void;
  onOpenThresholdsSettings?: () => void;
  onOpenNotifications?: () => void;
}

export const PadronTableView: React.FC<PadronTableViewProps> = ({
  patients,
  establishment,
  thresholds = DEFAULT_CLINICAL_THRESHOLDS,
  currentUser,
  onEditPatient,
  onOpenMonthlyTracking,
  onDeletePatient,
  onOpenNewPatient,
  onImportPatients,
  onOpenGerencialReport,
  onOpenThresholdsSettings,
  onOpenNotifications,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [diagnosisFilter, setDiagnosisFilter] = useState<'all' | 'hta' | 'dm' | 'both' | 'screening'>('all');
  const [insuranceFilter, setInsuranceFilter] = useState<'all' | 'SIS' | 'ESSALUD' | 'PARTICULAR' | 'OTRO'>('all');
  const [ageRangeFilter, setAgeRangeFilter] = useState<'all' | '18-29' | '30-59' | '60+'>('all');
  const [controlFilter, setControlFilter] = useState<'all' | 'controlled' | 'uncontrolled' | 'overdue'>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [selectedPatientForReport, setSelectedPatientForReport] = useState<DntPatient | null>(null);

  // Descripción legible de los filtros activos para el encabezado del reporte de entrega de guardia
  const getFilterDescription = (): string => {
    const parts: string[] = [];
    if (searchTerm.trim()) parts.push(`Búsqueda "${searchTerm}"`);
    if (diagnosisFilter !== 'all') {
      const diagMap: Record<string, string> = {
        hta: 'Hipertensión Arterial',
        dm: 'Diabetes Mellitus',
        both: 'Comorbilidad HTA+DM',
        screening: 'Tamizaje Preventivo',
      };
      parts.push(diagMap[diagnosisFilter]);
    }
    if (insuranceFilter !== 'all') parts.push(`Seguro ${insuranceFilter}`);
    if (ageRangeFilter !== 'all') parts.push(`Edad ${ageRangeFilter}`);
    if (controlFilter !== 'all') {
      const ctrlMap: Record<string, string> = {
        controlled: 'Pacientes Controlados',
        uncontrolled: 'Pacientes No Controlados',
        overdue: `Control Vencido (>${thresholds.diasCaducidadControl}d)`,
      };
      parts.push(ctrlMap[controlFilter]);
    }
    return parts.length > 0 ? parts.join(' · ') : 'Padrón nominal completo';
  };

  /**
   * Calcula los días transcurridos desde el último control médico del paciente
   */
  const getDaysSinceLastControl = (patient: DntPatient): number => {
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
  };

  /**
   * Alerta clínica: Evalúa si un paciente con HTA o Diabetes no ha tenido control en el periodo configurado (ej: 30, 45, 60 días)
   */
  const isControlOverdue = (patient: DntPatient): { overdue: boolean; days: number } => {
    const hasChronicCondition = Boolean(patient.tieneHta || patient.tieneDm);
    if (!hasChronicCondition) {
      return { overdue: false, days: 0 };
    }

    const days = getDaysSinceLastControl(patient);
    const limit = thresholds?.diasCaducidadControl ?? 30;
    return { overdue: days > limit, days };
  };

  // Comprobar si hay filtros activos
  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    diagnosisFilter !== 'all' ||
    insuranceFilter !== 'all' ||
    ageRangeFilter !== 'all' ||
    controlFilter !== 'all'
  );

  const resetFilters = () => {
    setSearchTerm('');
    setDiagnosisFilter('all');
    setInsuranceFilter('all');
    setAgeRangeFilter('all');
    setControlFilter('all');
  };

  // Filtrado de pacientes multifactorial (Búsqueda, Edad, Seguro, Diagnóstico, Control)
  const filteredPatients = patients.filter((p) => {
    // 1. Búsqueda por texto (DNI, nombres, apellidos, HC, teléfono)
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      p.dni.includes(term) ||
      p.nombreCompleto.toLowerCase().includes(term) ||
      p.numeroHC.toLowerCase().includes(term) ||
      (p.telefono && p.telefono.includes(term)) ||
      (p.notasMedicas && p.notasMedicas.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    // 2. Filtro por Rango de Edad
    if (ageRangeFilter === '18-29' && (p.edad < 18 || p.edad > 29)) return false;
    if (ageRangeFilter === '30-59' && (p.edad < 30 || p.edad > 59)) return false;
    if (ageRangeFilter === '60+' && p.edad < 60) return false;

    // 3. Filtro por Tipo de Seguro (SIS, ESSALUD, PARTICULAR, OTRO)
    if (insuranceFilter !== 'all' && p.tipoSeguro !== insuranceFilter) return false;

    // 4. Filtro por Diagnóstico (HTA, DM, Ambos, Tamizaje)
    if (diagnosisFilter === 'hta' && !p.tieneHta) return false;
    if (diagnosisFilter === 'dm' && !p.tieneDm) return false;
    if (diagnosisFilter === 'both' && (!p.tieneHta || !p.tieneDm)) return false;
    if (diagnosisFilter === 'screening' && (p.tieneHta || p.tieneDm)) return false;

    // 5. Filtro por Estado de Control / Vencimiento >30 días
    if (controlFilter === 'controlled') {
      const attended = Object.values(p.controles || {}).filter((c) => c.atendido);
      return attended.length > 0 && attended[attended.length - 1].controlado;
    }
    if (controlFilter === 'uncontrolled') {
      const attended = Object.values(p.controles || {}).filter((c) => c.atendido);
      return attended.length > 0 && !attended[attended.length - 1].controlado;
    }
    if (controlFilter === 'overdue') {
      return isControlOverdue(p).overdue;
    }

    return true;
  });

  // Métricas para los KPIs
  const totalCount = patients.length;
  const htaCount = patients.filter((p) => p.tieneHta).length;
  const dmCount = patients.filter((p) => p.tieneDm).length;
  const bothCount = patients.filter((p) => p.tieneHta && p.tieneDm).length;
  const controlledCount = patients.filter((p) => {
    const attended = Object.values(p.controles || {}).filter((c) => c.atendido);
    return attended.length > 0 && attended[attended.length - 1].controlado;
  }).length;
  const overdueCount = patients.filter((p) => isControlOverdue(p).overdue).length;

  /**
   * Exporta la lista de pacientes al formato oficial de Padrón Nominal DNT usando SheetJS
   */
  const handleExportToExcel = (format: 'xls' | 'xlsx' = 'xls', scope: 'filtered' | 'all' = 'filtered') => {
    setIsExporting(true);
    setShowExportMenu(false);
    setExportSuccessMessage(null);

    const listToExport = scope === 'all' 
      ? patients 
      : (filteredPatients.length > 0 ? filteredPatients : patients);

    try {
      const fileName = exportPadronToExcel(
        listToExport,
        establishment,
        `Padron_Nominal_DNT_${establishment.codigoRenaes || 'MINSA'}`,
        format
      );

      setExportSuccessMessage(
        `Exportación a Excel completada: ${fileName} (${listToExport.length} pacientes incluidos en formato .${format})`
      );

      setTimeout(() => {
        setExportSuccessMessage(null);
      }, 6000);
    } catch (err: any) {
      alert(`Error al generar archivo Excel con SheetJS: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await parseExcelPatients(file);
      if (imported.length === 0) {
        alert('No se encontraron pacientes válidos en el archivo Excel.');
        return;
      }
      onImportPatients(imported);
      alert(`Se procesaron ${imported.length} registros desde el archivo Excel.`);
    } catch (err: any) {
      alert(`Error al importar Excel: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Membrete y Resumen del Establecimiento */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded font-semibold">
              RENAES {establishment.codigoRenaes}
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-600">
              {establishment.redSalud} / {establishment.microred}
            </span>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 mt-1">
            Padrón Nominal de Pacientes con Daños No Transmisibles (DNT) · {establishment.anio || 2026}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {establishment.establecimiento} — {establishment.distrito}, {establishment.provincia}, {establishment.departamento}
          </p>
        </div>

        {/* Acciones principales de exportación e importación */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón principal de Exportación a Excel con SheetJS */}
          <div className="relative inline-flex rounded-md shadow-xs">
            <button
              type="button"
              onClick={() => handleExportToExcel('xls', 'filtered')}
              disabled={isExporting || patients.length === 0}
              className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 disabled:text-slate-500 text-white text-xs font-semibold rounded-l-md transition-colors flex items-center gap-1.5 whitespace-nowrap"
              title="Exportar padrón nominal a formato oficial de Excel (.xls) usando SheetJS"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              <span>Export to Excel (.xls)</span>
              {filteredPatients.length !== patients.length && (
                <span className="text-[10px] bg-teal-800/80 px-1.5 py-0.2 rounded text-teal-100 font-mono">
                  {filteredPatients.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={isExporting || patients.length === 0}
              className="px-2 py-2 bg-teal-800 hover:bg-teal-900 disabled:bg-slate-300 disabled:text-slate-500 text-white text-xs rounded-r-md border-l border-teal-600 transition-colors flex items-center justify-center"
              title="Opciones de exportación"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {/* Menú desplegable de opciones de exportación */}
            {showExportMenu && (
              <div 
                className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1.5 text-xs font-medium text-slate-700 animate-in fade-in-50"
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Formato Oficial Padrón DNT
                </div>
                <button
                  type="button"
                  onClick={() => handleExportToExcel('xls', 'filtered')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors"
                >
                  <span className="font-semibold text-teal-900">Formato Oficial .xls (SheetJS)</span>
                  <span className="font-mono text-[10px] text-slate-400">BIFF8</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportToExcel('xlsx', 'filtered')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors"
                >
                  <span>Formato Moderno .xlsx</span>
                  <span className="font-mono text-[10px] text-slate-400">XML</span>
                </button>

                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-t border-b border-slate-100 mt-1">
                  Alcance de Datos
                </div>
                <button
                  type="button"
                  onClick={() => handleExportToExcel('xls', 'all')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors"
                >
                  <span>Exportar Todo el Padrón</span>
                  <span className="font-mono text-slate-500 font-bold">{patients.length} pacientes</span>
                </button>
                {filteredPatients.length !== patients.length && (
                  <button
                    type="button"
                    onClick={() => handleExportToExcel('xls', 'filtered')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors"
                  >
                    <span>Exportar Vista Filtrada</span>
                    <span className="font-mono text-teal-700 font-bold">{filteredPatients.length} pacientes</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {onOpenGerencialReport && (
            <button
              type="button"
              onClick={onOpenGerencialReport}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap"
              title="Ver Reporte Gerencial y generar resumen en PDF con metas alcanzadas"
            >
              <FileText className="w-3.5 h-3.5 text-teal-700" />
              <span>Reporte Gerencial (PDF)</span>
            </button>
          )}

          {/* Botón de Entrega de Guardia / Resumen Clínico Combinado (PDF) */}
          <button
            type="button"
            onClick={() => setIsHandoverModalOpen(true)}
            disabled={filteredPatients.length === 0}
            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 disabled:bg-slate-100 disabled:text-slate-400 text-indigo-950 border border-indigo-200 disabled:border-slate-300 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap cursor-pointer"
            title="Generar documento PDF combinado con los últimos resúmenes clínicos de los pacientes filtrados para entrega de guardia"
          >
            <ClipboardList className="w-3.5 h-3.5 text-indigo-700" />
            <span>Entrega de Guardia (PDF)</span>
            <span className="font-mono text-[10px] bg-indigo-200/90 text-indigo-950 px-1.5 py-0.2 rounded font-bold">
              {filteredPatients.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => downloadBlankDntTemplate(establishment, 'xls')}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap"
            title="Descargar plantilla de Excel vacía (.xls) para llenado manual"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-500" />
            <span>Plantilla Vacía (.xls)</span>
          </button>

          <label className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Importar Excel</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileImport} className="hidden" />
          </label>

          <button
            type="button"
            onClick={() => exportBackupJson(patients, establishment)}
            className="p-2 bg-white hover:bg-slate-50 text-slate-500 border border-slate-300 rounded-md transition-colors"
            title="Copia de Seguridad en formato JSON"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Banner de Confirmación de Exportación Exitosa */}
      {exportSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 flex items-center justify-between shadow-xs animate-in fade-in-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{exportSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Franja de Indicadores Epidemiológicos (KPIs DNT) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
          <span className="text-xs text-slate-500 block">Total en Padrón</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">{totalCount}</span>
            <span className="text-[11px] text-slate-400">pacientes</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Hipertensión (HTA)</span>
            <Heart className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">{htaCount}</span>
            <span className="text-[11px] text-slate-400">
              ({totalCount > 0 ? Math.round((htaCount / totalCount) * 100) : 0}%)
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Diabetes (DM2)</span>
            <Activity className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">{dmCount}</span>
            <span className="text-[11px] text-slate-400">
              ({totalCount > 0 ? Math.round((dmCount / totalCount) * 100) : 0}%)
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
          <span className="text-xs text-slate-500 block">Comorbilidad (HTA+DM)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">{bothCount}</span>
            <span className="text-[11px] text-slate-400">pacientes</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Controlados</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-mono text-xl font-bold text-emerald-700 tabular-nums">{controlledCount}</span>
            <span className="text-[11px] text-slate-400">compensados</span>
          </div>
        </div>

        {/* Alerta de pacientes HTA/DM sin control > diasCaducidadControl */}
        <div 
          onClick={() => setControlFilter(controlFilter === 'overdue' ? 'all' : 'overdue')}
          className={`border rounded-lg p-3.5 shadow-xs cursor-pointer transition-all ${
            controlFilter === 'overdue'
              ? 'bg-red-100 border-red-400 ring-2 ring-red-500 shadow-sm'
              : overdueCount > 0
              ? 'bg-red-50/70 hover:bg-red-100/60 border-red-200'
              : 'bg-white hover:bg-slate-50 border-slate-200'
          }`}
          title={`Haga clic para filtrar pacientes con HTA o Diabetes sin control en los últimos ${thresholds.diasCaducidadControl} días`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${overdueCount > 0 ? 'text-red-800' : 'text-slate-500'}`}>
              Sin Control &gt;{thresholds.diasCaducidadControl}d
            </span>
            <AlertTriangle className={`w-3.5 h-3.5 ${overdueCount > 0 ? 'text-red-600' : 'text-slate-400'}`} />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`font-mono text-xl font-bold tabular-nums ${overdueCount > 0 ? 'text-red-700' : 'text-slate-900'}`}>
              {overdueCount}
            </span>
            <span className={`text-[11px] font-semibold ${overdueCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
              atrasados
            </span>
          </div>
        </div>
      </div>

      {/* Dashboard Card con Recharts: Distribución HTA/DM y Adherencia Mensual */}
      <DntAnalyticsDashboard patients={patients} />

      {/* Barra de Filtros Clínicos y Búsqueda */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
        {/* Fila 1: Búsqueda y selector de Diagnóstico */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Búsqueda por texto */}
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por DNI, nombres, apellidos o HC..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-700 focus:outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Segmented controls para Diagnóstico DNT */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setDiagnosisFilter('all')}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors whitespace-nowrap ${
                diagnosisFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setDiagnosisFilter('hta')}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors whitespace-nowrap ${
                diagnosisFilter === 'hta' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              HTA ({htaCount})
            </button>
            <button
              type="button"
              onClick={() => setDiagnosisFilter('dm')}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors whitespace-nowrap ${
                diagnosisFilter === 'dm' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Diabetes ({dmCount})
            </button>
            <button
              type="button"
              onClick={() => setDiagnosisFilter('both')}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors whitespace-nowrap ${
                diagnosisFilter === 'both' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ambos ({bothCount})
            </button>
            <button
              type="button"
              onClick={() => setDiagnosisFilter('screening')}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors whitespace-nowrap ${
                diagnosisFilter === 'screening' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              En Tamizaje
            </button>
          </div>
        </div>

        {/* Fila 2: Selectores de Rango de Edad, Tipo de Seguro y Estado de Control */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-medium flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" />
              <span>Filtros:</span>
            </span>

            {/* Filtro: Rango de Edad */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-age" className="text-slate-500 font-medium">Edad:</label>
              <select
                id="filter-age"
                value={ageRangeFilter}
                onChange={(e) => setAgeRangeFilter(e.target.value as any)}
                className={`py-1 px-2.5 border rounded-md text-xs font-medium focus:ring-1 focus:ring-teal-700 focus:outline-none transition-colors ${
                  ageRangeFilter !== 'all'
                    ? 'border-teal-600 bg-teal-50/70 text-teal-900 font-semibold'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                <option value="all">Todas las edades</option>
                <option value="18-29">Jóvenes (18 - 29 años)</option>
                <option value="30-59">Adultos (30 - 59 años)</option>
                <option value="60+">Adultos mayores (60+ años)</option>
              </select>
            </div>

            {/* Filtro: Tipo de Seguro */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-insurance" className="text-slate-500 font-medium">Seguro:</label>
              <select
                id="filter-insurance"
                value={insuranceFilter}
                onChange={(e) => setInsuranceFilter(e.target.value as any)}
                className={`py-1 px-2.5 border rounded-md text-xs font-medium focus:ring-1 focus:ring-teal-700 focus:outline-none transition-colors ${
                  insuranceFilter !== 'all'
                    ? 'border-teal-600 bg-teal-50/70 text-teal-900 font-semibold'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                <option value="all">Todos los seguros</option>
                <option value="SIS">SIS (Seguro Integral)</option>
                <option value="ESSALUD">EsSalud</option>
                <option value="PARTICULAR">Particular</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            {/* Filtro: Estado de Control Clínico */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-control" className="text-slate-500 font-medium">Control:</label>
              <select
                id="filter-control"
                value={controlFilter}
                onChange={(e) => setControlFilter(e.target.value as any)}
                className={`py-1 px-2.5 border rounded-md text-xs font-medium focus:ring-1 focus:ring-teal-700 focus:outline-none transition-colors ${
                  controlFilter !== 'all'
                    ? 'border-teal-600 bg-teal-50/70 text-teal-900 font-semibold'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                <option value="all">Cualquier estado</option>
                <option value="overdue">⚠️ Sin control &gt;{thresholds.diasCaducidadControl} días ({overdueCount})</option>
                <option value="controlled">Controlados en último control</option>
                <option value="uncontrolled">No controlados / Descompensados</option>
              </select>
            </div>

            {/* Chip de Umbrales Configurados */}
            {onOpenThresholdsSettings && (
              <button
                type="button"
                onClick={onOpenThresholdsSettings}
                className="hidden xl:inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-mono text-[11px] font-semibold border border-slate-200 transition-colors"
                title="Configuración de Umbrales de Alerta y Caducidad"
              >
                <SlidersHorizontal className="w-3 h-3 text-teal-700" />
                <span>PA &le;{thresholds.paSistolicaControlMax}/{thresholds.paDiastolicaControlMax} · Caducidad {thresholds.diasCaducidadControl}d</span>
              </button>
            )}

            {/* Botón para reiniciar filtros */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="py-1 px-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1 text-xs shrink-0"
                title="Limpiar todos los filtros"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restablecer</span>
              </button>
            )}
          </div>

          {/* Contador de resultados filtrados con acceso rápido */}
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500 shrink-0 font-medium">
              Mostrando <strong className="text-slate-900 font-mono tabular-nums">{filteredPatients.length}</strong> de <span className="font-mono tabular-nums">{patients.length}</span> pacientes
            </div>
            {filteredPatients.length > 0 && (
              <button
                type="button"
                onClick={() => setIsHandoverModalOpen(true)}
                className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline flex items-center gap-1 cursor-pointer bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-200 transition-colors"
                title="Generar e imprimir resumen clínico de entrega de guardia para estos pacientes filtrados"
              >
                <Printer className="w-3 h-3 text-indigo-600" />
                <span>Imprimir Guardia ({filteredPatients.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla Clínica de Alta Densidad */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5 w-10 text-center">N°</th>
                <th className="px-3 py-2.5">DNI</th>
                <th className="px-3 py-2.5">Apellidos y Nombres</th>
                <th className="px-3 py-2.5">Edad / Sexo</th>
                <th className="px-3 py-2.5">HC / Seguro</th>
                <th className="px-3 py-2.5">IMC / Nutrición</th>
                <th className="px-3 py-2.5">Daños No Transmisibles</th>
                <th className="px-3 py-2.5">Seguimiento 2026</th>
                <th className="px-3 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    <p className="text-sm font-medium text-slate-700">No se encontraron pacientes en este filtro.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Puede realizar una nueva consulta de DNI o agregar un paciente con el botón superior.
                    </p>
                    <button
                      type="button"
                      onClick={onOpenNewPatient}
                      className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Registrar Paciente</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient, index) => {
                  const attendedControls = Object.values(patient.controles || {}).filter((c) => c.atendido);
                  const lastControl = attendedControls[attendedControls.length - 1];
                  const { overdue, days: daysSinceControl } = isControlOverdue(patient);

                  return (
                    <tr 
                      key={patient.id} 
                      className={`transition-colors border-b border-slate-100 ${
                        overdue
                          ? 'bg-red-50/75 hover:bg-red-100/75 border-l-4 border-l-red-500'
                          : 'hover:bg-slate-50/80 bg-white'
                      }`}
                    >
                      <td className="px-3 py-2.5 text-center font-mono text-slate-400 tabular-nums">
                        {index + 1}
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 tracking-wider">
                            {patient.dni}
                          </span>
                          {overdue && (
                            <span title={`Alerta: Paciente crónico sin control en los últimos ${thresholds.diasCaducidadControl} días`}>
                              <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-900">
                          {patient.apellidoPaterno} {patient.apellidoMaterno}, {patient.nombres}
                        </div>
                        {patient.direccion && (
                          <span className="text-[11px] text-slate-500 truncate block max-w-xs">
                            {patient.direccion}
                          </span>
                        )}
                        {patient.notasMedicas && (
                          <div 
                            className="mt-1 flex items-start gap-1 text-[11px] text-amber-900 bg-amber-50 border border-amber-200/90 rounded px-1.5 py-0.5 max-w-xs shadow-2xs group cursor-help"
                            title={`Nota médica: ${patient.notasMedicas}`}
                          >
                            <FileText className="w-3 h-3 text-amber-700 shrink-0 mt-0.5" />
                            <span className="truncate">
                              <span className="font-semibold text-amber-950">Nota:</span> {patient.notasMedicas}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="font-mono tabular-nums font-medium text-slate-800">
                          {patient.edad} años
                        </span>
                        <span className="text-slate-400"> · </span>
                        <span className="text-slate-600 font-medium">
                          {patient.sexo === 'M' ? 'Masc' : 'Fem'}
                        </span>
                      </td>

                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="font-mono text-slate-800 block">
                          {patient.numeroHC || 'S/N'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {patient.tipoSeguro}
                        </span>
                      </td>

                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {patient.imc ? (
                          <div>
                            <span className="font-mono font-bold text-slate-900 tabular-nums">
                              {patient.imc}
                            </span>
                            <span className="text-[11px] text-slate-500 ml-1">
                              ({patient.clasificacionImc})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">--</span>
                        )}
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {patient.tieneHta && (
                            <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                              HTA
                            </span>
                          )}
                          {patient.tieneDm && (
                            <span className="text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                              {patient.tipoDm || 'DM2'}
                            </span>
                          )}
                          {patient.tieneDislipidemia && (
                            <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                              Dislip.
                            </span>
                          )}
                          {!patient.tieneHta && !patient.tieneDm && (
                            <span className="text-xs text-slate-500">En tamizaje</span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-800 tabular-nums">
                            {attendedControls.length}/12
                          </span>
                          {lastControl && (
                            <span
                              className={`text-[11px] font-medium ${
                                lastControl.controlado ? 'text-emerald-700' : 'text-amber-700'
                              }`}
                            >
                              · {lastControl.controlado ? 'Controlado' : 'No controlado'}
                            </span>
                          )}
                        </div>
                        {overdue && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100/90 border border-red-300 rounded px-1.5 py-0.5 whitespace-nowrap shadow-xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            <span>Sin control hace {daysSinceControl >= 900 ? '+90' : daysSinceControl} días</span>
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {overdue && (
                            <button
                              type="button"
                              onClick={() => onOpenMonthlyTracking(patient)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-red-700 bg-red-100 hover:bg-red-200 border border-red-300 rounded transition-colors whitespace-nowrap shadow-xs"
                              title="Registrar control mensual para actualizar seguimiento"
                            >
                              <Calendar className="w-3 h-3 text-red-600" />
                              <span>+ Control</span>
                            </button>
                          )}

                          {(patient.tieneHta || patient.tieneDm) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const info = getPatientControlDueInfo(patient, thresholds.diasCaducidadControl, thresholds.alertaPreventivaDias);
                                const settings = getStoredNotificationSettings();
                                notifyPatientDue(info, settings.soundEnabled);
                              }}
                              className={`p-1.5 rounded transition-colors ${
                                overdue 
                                  ? 'text-red-600 hover:text-red-800 hover:bg-red-50' 
                                  : 'text-slate-500 hover:text-teal-700 hover:bg-teal-50'
                              }`}
                              title="Enviar notificación de escritorio alertando sobre el control mensual de este paciente"
                            >
                              <Bell className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onOpenMonthlyTracking(patient)}
                            className="p-1.5 text-slate-600 hover:text-teal-800 hover:bg-slate-100 rounded transition-colors"
                            title="Registrar Seguimiento Mensual (Ene - Dic)"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedPatientForReport(patient)}
                            className="p-1.5 text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded transition-colors"
                            title="Generar Reporte Clínico en PDF / Imprimir Ficha"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onEditPatient(patient)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                            title="Editar Ficha Clínica DNT"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {currentUser && (currentUser.role === 'digitador' || currentUser.role === 'enfermero') ? (
                            <button
                              type="button"
                              onClick={() => alert(`Acción restringida: El rol de ${currentUser.roleTitle} no tiene permisos para eliminar registros del padrón nominal. Esta acción está reservada para el Médico Tratante o Jefatura.`)}
                              className="p-1.5 text-slate-300 hover:text-slate-400 cursor-not-allowed rounded transition-colors"
                              title="Acción restringida para este rol (Requiere Médico o Administrador)"
                            >
                              <Trash2 className="w-4 h-4 opacity-40" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`¿Desea eliminar a ${patient.nombreCompleto} del padrón nominal?`)) {
                                  onDeletePatient(patient.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Eliminar paciente del padrón nominal"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Reporte de Entrega de Guardia y Resumen Clínico Combinado (PDF) */}
      {isHandoverModalOpen && (
        <ClinicalHandoverModal
          isOpen={isHandoverModalOpen}
          onClose={() => setIsHandoverModalOpen(false)}
          patients={filteredPatients}
          establishment={establishment}
          thresholds={thresholds}
          activeFilterDescription={getFilterDescription()}
        />
      )}

      {/* Modal de Reporte Clínico en PDF e Impresión del Paciente Seleccionado */}
      {selectedPatientForReport && (
        <PatientPrintSheetModal
          isOpen={Boolean(selectedPatientForReport)}
          onClose={() => setSelectedPatientForReport(null)}
          patient={selectedPatientForReport}
          establishment={establishment}
          thresholds={thresholds}
        />
      )}
    </div>
  );
};
