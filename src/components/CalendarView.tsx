import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  User, 
  Phone, 
  Activity, 
  Heart, 
  FileSpreadsheet, 
  X, 
  ExternalLink, 
  Bell, 
  SlidersHorizontal 
} from 'lucide-react';
import { DntPatient, MonthlyControl, ClinicalThresholds } from '../types/dnt';
import { 
  getPatientControlDueInfo, 
  formatPeruDate, 
  notifyPatientDue, 
  getStoredNotificationSettings 
} from '../utils/notificationScheduler';

export type CalendarStatusFilter = 'todos' | 'atendido' | 'pendiente';
export type CalendarPathologyFilter = 'todas' | 'HTA' | 'DM' | 'AMBOS';

export interface CalendarControlEvent {
  id: string;
  patient: DntPatient;
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  status: 'atendido' | 'pendiente';
  pathology: 'HTA' | 'DM' | 'AMBOS' | 'TAMIZAJE';
  control?: MonthlyControl;
  isOverdue?: boolean;
  daysOverdue?: number;
  monthIndex: number; // 0..11
  year: number;
}

interface CalendarViewProps {
  patients: DntPatient[];
  thresholds: ClinicalThresholds;
  onOpenMonthlyTracking: (patient: DntPatient) => void;
  onEditPatient: (patient: DntPatient) => void;
  onOpenThresholdsSettings?: () => void;
}

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const CalendarView: React.FC<CalendarViewProps> = ({
  patients,
  thresholds,
  onOpenMonthlyTracking,
  onEditPatient,
  onOpenThresholdsSettings,
}) => {
  // Estado de navegación del calendario (por defecto el mes actual)
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(today.getMonth()); // 0..11

  // Filtros
  const [statusFilter, setStatusFilter] = useState<CalendarStatusFilter>('todos');
  const [pathologyFilter, setPathologyFilter] = useState<CalendarPathologyFilter>('todas');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Día seleccionado para inspección detallada
  const [selectedDayEvents, setSelectedDayEvents] = useState<{
    dateStr: string;
    events: CalendarControlEvent[];
  } | null>(null);

  // Navegar meses
  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonthIndex((m) => m - 1);
    }
    setSelectedDayEvents(null);
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonthIndex((m) => m + 1);
    }
    setSelectedDayEvents(null);
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonthIndex(now.getMonth());
    setSelectedDayEvents(null);
  };

  // Generar todos los eventos de controles para el año y mes seleccionado
  const allEventsForMonth = useMemo(() => {
    const events: CalendarControlEvent[] = [];
    const targetMonthStr = String(currentMonthIndex + 1).padStart(2, '0');
    const targetYearStr = String(currentYear);

    patients.forEach((patient) => {
      // Determinar patología principal del paciente
      let pathology: 'HTA' | 'DM' | 'AMBOS' | 'TAMIZAJE' = 'TAMIZAJE';
      if (patient.tieneHta && patient.tieneDm) pathology = 'AMBOS';
      else if (patient.tieneHta) pathology = 'HTA';
      else if (patient.tieneDm) pathology = 'DM';

      // 1. Controles Atendidos que tienen fecha registrada en este mes y año
      if (patient.controles) {
        Object.values(patient.controles).forEach((ctrl) => {
          if (ctrl.atendido && ctrl.fecha) {
            const [y, m, d] = ctrl.fecha.split('-');
            if (y === targetYearStr && m === targetMonthStr) {
              const dayNum = parseInt(d, 10);
              events.push({
                id: `ctrl-${patient.id}-${ctrl.mes}-${ctrl.fecha}`,
                patient,
                dateStr: ctrl.fecha,
                dayNumber: dayNum,
                status: 'atendido',
                pathology,
                control: ctrl,
                monthIndex: currentMonthIndex,
                year: currentYear,
              });
            }
          }
        });
      }

      // 2. Controles Pendientes o Programados:
      // Calculamos la fecha programada de control según el intervalo normativo
      const dueInfo = getPatientControlDueInfo(
        patient, 
        thresholds.diasCaducidadControl, 
        thresholds.alertaPreventivaDias
      );

      if (dueInfo.nextDueDate) {
        const [dueY, dueM, dueD] = dueInfo.nextDueDate.split('-');
        if (dueY === targetYearStr && dueM === targetMonthStr) {
          // Verificar si ya tiene un control atendido en esta misma fecha para no duplicar
          const alreadyAttendedOnDate = events.some(
            (e) => e.patient.id === patient.id && e.dateStr === dueInfo.nextDueDate && e.status === 'atendido'
          );

          if (!alreadyAttendedOnDate) {
            const dayNum = parseInt(dueD, 10);
            events.push({
              id: `due-${patient.id}-${dueInfo.nextDueDate}`,
              patient,
              dateStr: dueInfo.nextDueDate,
              dayNumber: dayNum,
              status: 'pendiente',
              pathology,
              isOverdue: dueInfo.status === 'vencido',
              daysOverdue: dueInfo.status === 'vencido' ? Math.abs(dueInfo.daysUntilDue) : undefined,
              monthIndex: currentMonthIndex,
              year: currentYear,
            });
          }
        }
      }
    });

    return events;
  }, [patients, currentYear, currentMonthIndex, thresholds]);

  // Aplicar filtros de estado, patología y búsqueda de texto
  const filteredEvents = useMemo(() => {
    return allEventsForMonth.filter((event) => {
      // Filtro de estado
      if (statusFilter !== 'todos' && event.status !== statusFilter) {
        return false;
      }

      // Filtro de patología
      if (pathologyFilter !== 'todas') {
        if (pathologyFilter === 'HTA' && event.pathology !== 'HTA' && event.pathology !== 'AMBOS') return false;
        if (pathologyFilter === 'DM' && event.pathology !== 'DM' && event.pathology !== 'AMBOS') return false;
        if (pathologyFilter === 'AMBOS' && event.pathology !== 'AMBOS') return false;
      }

      // Filtro de búsqueda por nombre o DNI
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = event.patient.nombreCompleto.toLowerCase().includes(query);
        const matchDni = event.patient.dni.includes(query);
        const matchHc = event.patient.numeroHC?.toLowerCase().includes(query);
        if (!matchName && !matchDni && !matchHc) return false;
      }

      return true;
    });
  }, [allEventsForMonth, statusFilter, pathologyFilter, searchQuery]);

  // Agrupar eventos filtrados por número de día del mes (1..31)
  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarControlEvent[]>();
    filteredEvents.forEach((ev) => {
      const list = map.get(ev.dayNumber) || [];
      list.push(ev);
      map.set(ev.dayNumber, list);
    });
    return map;
  }, [filteredEvents]);

  // Métricas del mes actual
  const monthStats = useMemo(() => {
    const total = filteredEvents.length;
    const atendidos = filteredEvents.filter((e) => e.status === 'atendido').length;
    const pendientes = filteredEvents.filter((e) => e.status === 'pendiente').length;
    const vencidos = filteredEvents.filter((e) => e.isOverdue).length;
    const pctCumplimiento = total > 0 ? Math.round((atendidos / total) * 100) : 0;

    return { total, atendidos, pendientes, vencidos, pctCumplimiento };
  }, [filteredEvents]);

  // Construir la matriz de días del mes (semana de Lunes a Domingo)
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonthIndex, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonthIndex + 1, 0);

    const totalDaysInMonth = lastDayOfMonth.getDate();
    // getDay() devuelve 0 para domingo, 1 para lunes, etc.
    // Convertimos para que Lunes = 0, ..., Domingo = 6
    const firstDayWeekday = (firstDayOfMonth.getDay() + 6) % 7;

    const cells: {
      type: 'prev' | 'current' | 'next';
      dayNumber: number;
      dateStr: string;
      isToday: boolean;
    }[] = [];

    // Días del mes anterior para rellenar la primera semana
    const prevMonthLastDay = new Date(currentYear, currentMonthIndex, 0).getDate();
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      cells.push({
        type: 'prev',
        dayNumber: dayNum,
        dateStr: `${currentMonthIndex === 0 ? currentYear - 1 : currentYear}-${String(currentMonthIndex === 0 ? 12 : currentMonthIndex).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`,
        isToday: false,
      });
    }

    // Días del mes actual
    const now = new Date();
    const isCurrentYearAndMonth = now.getFullYear() === currentYear && now.getMonth() === currentMonthIndex;
    const todayDate = now.getDate();

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const isToday = isCurrentYearAndMonth && d === todayDate;
      const monthStr = String(currentMonthIndex + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      cells.push({
        type: 'current',
        dayNumber: d,
        dateStr: `${currentYear}-${monthStr}-${dayStr}`,
        isToday,
      });
    }

    // Días del mes siguiente para completar la cuadrícula de 35 o 42 celdas
    const remainingCells = 7 - (cells.length % 7);
    if (remainingCells < 7) {
      for (let n = 1; n <= remainingCells; n++) {
        cells.push({
          type: 'next',
          dayNumber: n,
          dateStr: `${currentMonthIndex === 11 ? currentYear + 1 : currentYear}-${String(currentMonthIndex === 11 ? 1 : currentMonthIndex + 2).padStart(2, '0')}-${String(n).padStart(2, '0')}`,
          isToday: false,
        });
      }
    }

    return cells;
  }, [currentYear, currentMonthIndex]);

  // Helper para enviar notificación individual de un paciente
  const handleSendReminder = (e: React.MouseEvent, patient: DntPatient) => {
    e.stopPropagation();
    const info = getPatientControlDueInfo(patient, thresholds.diasCaducidadControl, thresholds.alertaPreventivaDias);
    const settings = getStoredNotificationSettings();
    notifyPatientDue(info, settings.soundEnabled);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Cabecera Principal y Barra de Navegación del Mes */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <span>Calendario de Controles Mensuales DNT</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  {currentYear}
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Visualización y seguimiento de controles programados y atendidos para Hipertensión Arterial y Diabetes
              </p>
            </div>
          </div>
        </div>

        {/* Controles de Navegación del Mes */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={handleGoToday}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            Hoy
          </button>

          <div className="flex items-center bg-slate-50 border border-slate-300 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-colors"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-4 py-1 text-sm font-bold text-slate-800 min-w-[150px] text-center select-none">
              {NOMBRES_MESES[currentMonthIndex]} {currentYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-colors"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {onOpenThresholdsSettings && (
            <button
              type="button"
              onClick={onOpenThresholdsSettings}
              className="p-2 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              title="Ajustar umbrales y periodo de caducidad"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tarjetas Métricas del Mes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total Controles del Mes</span>
            <CalendarIcon className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {monthStats.total}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Atendidos y pendientes en {NOMBRES_MESES[currentMonthIndex]}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-medium">
            <span>Controles Atendidos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-700">{monthStats.atendidos}</span>
            <span className="text-xs font-semibold text-emerald-600">
              ({monthStats.pctCumplimiento}% cobertura)
            </span>
          </div>
          <p className="text-[11px] text-emerald-600/80 mt-0.5">
            Registrados con éxito en el padrón
          </p>
        </div>

        <div className="bg-white rounded-xl border border-amber-200 bg-amber-50/20 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-800 font-medium">
            <span>Controles Pendientes</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1">
            {monthStats.pendientes}
          </div>
          <p className="text-[11px] text-amber-700/80 mt-0.5">
            Pacientes por acudir a su cita
          </p>
        </div>

        <div className="bg-white rounded-xl border border-red-200 bg-red-50/20 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-red-800 font-medium">
            <span>Atrasados / Vencidos</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-700 mt-1">
            {monthStats.vencidos}
          </div>
          <p className="text-[11px] text-red-600/80 mt-0.5">
            Sin control en &gt;{thresholds.diasCaducidadControl} días
          </p>
        </div>
      </div>

      {/* Barra de Filtros: Estado y Patología */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Buscador de Pacientes en el Calendario */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por DNI, nombres o HC en este mes..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Segmented controls para Estado (Atendido / Pendiente) */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Estado:</span>
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('todos')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'todos'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('atendido')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  statusFilter === 'atendido'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Atendidos</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pendiente')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  statusFilter === 'pendiente'
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-amber-700'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Pendientes</span>
              </button>
            </div>
          </div>

          {/* Segmented controls para Patología */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Patología:</span>
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setPathologyFilter('todas')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  pathologyFilter === 'todas'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setPathologyFilter('HTA')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  pathologyFilter === 'HTA'
                    ? 'bg-rose-700 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                <Heart className="w-3 h-3" />
                <span>HTA</span>
              </button>
              <button
                type="button"
                onClick={() => setPathologyFilter('DM')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  pathologyFilter === 'DM'
                    ? 'bg-cyan-700 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-cyan-700'
                }`}
              >
                <Activity className="w-3 h-3" />
                <span>Diabetes</span>
              </button>
              <button
                type="button"
                onClick={() => setPathologyFilter('AMBOS')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  pathologyFilter === 'AMBOS'
                    ? 'bg-purple-700 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-purple-700'
                }`}
              >
                <span>HTA + DM</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cuadrícula del Calendario Mensual */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Cabecera de días de la semana */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-bold text-slate-700 py-2.5">
          {DIAS_SEMANA.map((dia, idx) => (
            <div key={dia} className={idx >= 5 ? 'text-slate-400' : 'text-slate-700'}>
              {dia}
            </div>
          ))}
        </div>

        {/* Celdas de los días */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 min-h-[580px]">
          {calendarCells.map((cell, index) => {
            const isCurrentMonth = cell.type === 'current';
            const dayEvents = isCurrentMonth ? eventsByDay.get(cell.dayNumber) || [] : [];
            const hasEvents = dayEvents.length > 0;
            const hasOverdue = dayEvents.some((e) => e.isOverdue);
            const isSelected = selectedDayEvents?.dateStr === cell.dateStr;

            return (
              <div
                key={`${cell.type}-${cell.dayNumber}-${index}`}
                onClick={() => {
                  if (isCurrentMonth) {
                    setSelectedDayEvents({
                      dateStr: cell.dateStr,
                      events: dayEvents,
                    });
                  }
                }}
                className={`min-h-[110px] p-2 flex flex-col transition-colors cursor-pointer relative ${
                  !isCurrentMonth 
                    ? 'bg-slate-50/50 text-slate-300 pointer-events-none' 
                    : isSelected
                    ? 'bg-teal-50/40 ring-2 ring-teal-600 z-10'
                    : cell.isToday
                    ? 'bg-amber-50/30 hover:bg-slate-50'
                    : 'bg-white hover:bg-slate-50/80'
                }`}
              >
                {/* Número del día y badges de conteo */}
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-bold inline-flex items-center justify-center rounded-full w-6 h-6 ${
                      cell.isToday
                        ? 'bg-teal-700 text-white shadow-xs'
                        : isCurrentMonth
                        ? 'text-slate-800'
                        : 'text-slate-300'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {isCurrentMonth && hasEvents && (
                    <div className="flex items-center gap-1">
                      {hasOverdue && (
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Controles atrasados" />
                      )}
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {dayEvents.length}
                      </span>
                    </div>
                  )}
                </div>

                {/* Lista de chips de pacientes en el día */}
                <div className="flex-1 space-y-1 overflow-hidden">
                  {dayEvents.slice(0, 3).map((event) => {
                    const isAttended = event.status === 'atendido';
                    const isOverdue = event.isOverdue;

                    // Estilo según patología
                    let chipStyle = 'border-slate-200 bg-slate-50 text-slate-800';
                    if (event.pathology === 'HTA') {
                      chipStyle = 'border-rose-200 bg-rose-50/80 text-rose-900';
                    } else if (event.pathology === 'DM') {
                      chipStyle = 'border-cyan-200 bg-cyan-50/80 text-cyan-900';
                    } else if (event.pathology === 'AMBOS') {
                      chipStyle = 'border-purple-200 bg-purple-50/80 text-purple-900';
                    }

                    return (
                      <div
                        key={event.id}
                        title={`${event.patient.nombreCompleto} (${event.pathology}) - ${isAttended ? 'Atendido' : isOverdue ? 'Atrasado' : 'Programado'}`}
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded border truncate flex items-center justify-between gap-1 shadow-2xs ${chipStyle}`}
                      >
                        <div className="flex items-center gap-1 min-w-0 truncate">
                          {isAttended ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          ) : isOverdue ? (
                            <AlertTriangle className="w-3 h-3 text-red-600 shrink-0 animate-pulse" />
                          ) : (
                            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                          )}
                          <span className="truncate">
                            {event.patient.apellidoPaterno} {event.patient.nombres.charAt(0)}.
                          </span>
                        </div>

                        <span className="text-[9px] font-bold uppercase shrink-0 px-1 py-0.2 rounded bg-white/70">
                          {event.pathology === 'AMBOS' ? 'HTA+DM' : event.pathology}
                        </span>
                      </div>
                    );
                  })}

                  {dayEvents.length > 3 && (
                    <div className="text-[10px] font-semibold text-slate-500 pl-1">
                      +{dayEvents.length - 3} más...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Panel Detallado del Día Seleccionado (Inspector de Agenda Diaria) */}
      {selectedDayEvents && (
        <div className="bg-white rounded-xl shadow-md border border-teal-200 p-5 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm">
                {parseInt(selectedDayEvents.dateStr.split('-')[2], 10)}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Agenda del {formatPeruDate(selectedDayEvents.dateStr)}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedDayEvents.events.length} controles registrados o programados en esta fecha
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedDayEvents(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedDayEvents.events.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No hay controles programados ni atendidos en este día.
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {selectedDayEvents.events.map((ev) => {
                const p = ev.patient;
                const isAttended = ev.status === 'atendido';

                return (
                  <div
                    key={ev.id}
                    className={`rounded-lg p-3.5 border transition-all ${
                      isAttended
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : ev.isOverdue
                        ? 'border-red-200 bg-red-50/20'
                        : 'border-amber-200 bg-amber-50/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-xs text-slate-900">
                          {p.nombreCompleto}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          DNI: {p.dni} · HC: {p.numeroHC} · {p.edad} años
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                          isAttended
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : ev.isOverdue
                            ? 'bg-red-100 text-red-800 border border-red-300 animate-pulse'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {isAttended ? 'Atendido' : ev.isOverdue ? 'Atrasado' : 'Pendiente'}
                      </span>
                    </div>

                    {/* Patología y Teléfono */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {p.tieneHta && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                          HTA
                        </span>
                      )}
                      {p.tieneDm && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800">
                          {p.tipoDm || 'DM2'}
                        </span>
                      )}
                      {p.telefono && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 ml-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <a href={`tel:${p.telefono}`} className="hover:text-teal-700 hover:underline">
                            {p.telefono}
                          </a>
                        </span>
                      )}
                    </div>

                    {/* Notas Médicas Rápidas */}
                    {p.notasMedicas && (
                      <div className="mt-2 text-[11px] text-amber-900 bg-amber-50/90 border border-amber-200/90 rounded px-2 py-1">
                        <span className="font-semibold text-amber-950">Nota médica:</span> {p.notasMedicas}
                      </div>
                    )}

                    {/* Datos clínicos si fue atendido */}
                    {isAttended && ev.control && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/80 text-[11px] text-slate-700 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Presión Arterial:</span>
                          <span className="font-mono font-bold">
                            {ev.control.paSistolica || '--'}/{ev.control.paDiastolica || '--'} mmHg
                          </span>
                        </div>
                        {ev.control.glucosaMgDl && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Glucosa:</span>
                            <span className="font-mono font-bold">
                              {ev.control.glucosaMgDl} mg/dL
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Control Clínico:</span>
                          <span className={`font-semibold ${ev.control.controlado ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {ev.control.controlado ? 'Compensado' : 'No Compensado'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={(e) => handleSendReminder(e, p)}
                        className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors"
                        title="Enviar notificación de escritorio para este paciente"
                      >
                        <Bell className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenMonthlyTracking(p)}
                        className="px-2.5 py-1 text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white rounded transition-colors shadow-2xs"
                      >
                        {isAttended ? 'Ver Control' : 'Registrar Control'}
                      </button>

                      <button
                        type="button"
                        onClick={() => onEditPatient(p)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                        title="Ver ficha completa"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
