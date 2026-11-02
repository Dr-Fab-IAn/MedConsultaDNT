import React, { useState, useMemo } from 'react';
import { 
  Bell, 
  X, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Volume2, 
  VolumeX, 
  Send, 
  Search, 
  Phone, 
  ExternalLink, 
  ShieldAlert, 
  UserCheck,
  RefreshCw,
  BellRing
} from 'lucide-react';
import { DntPatient, ClinicalThresholds } from '../types/dnt';
import { 
  PatientControlDueInfo,
  getAllPatientsDueInfo, 
  getNotificationPermissionStatus, 
  requestDesktopNotificationPermission, 
  sendDesktopNotification, 
  notifyPatientDue, 
  notifyBatchDueSummary, 
  getStoredNotificationSettings, 
  saveNotificationSettings,
  NotificationSettings,
  formatPeruDate,
  playMedicalChime
} from '../utils/notificationScheduler';

interface MedicalNotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  patients: DntPatient[];
  thresholds: ClinicalThresholds;
  onOpenMonthlyTracking: (patient: DntPatient) => void;
  onEditPatient: (patient: DntPatient) => void;
}

export const MedicalNotificationCenter: React.FC<MedicalNotificationCenterProps> = ({
  isOpen,
  onClose,
  patients,
  thresholds,
  onOpenMonthlyTracking,
  onEditPatient,
}) => {
  // Configuración de notificaciones
  const [settings, setSettings] = useState<NotificationSettings>(getStoredNotificationSettings());
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>(getNotificationPermissionStatus());
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [testNotificationSent, setTestNotificationSent] = useState(false);
  const [notifiedPatientIds, setNotifiedPatientIds] = useState<Set<string>>(new Set());

  // Búsqueda y Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'requieren_atencion' | 'vencidos' | 'hoy_proximos' | 'hta' | 'dm' | 'todos'>('requieren_atencion');

  // Calcular la información de vencimientos para todos los pacientes
  const allDueInfo = useMemo(() => {
    return getAllPatientsDueInfo(patients, thresholds);
  }, [patients, thresholds]);

  // Contadores
  const stats = useMemo(() => {
    const overdue = allDueInfo.filter((i) => i.status === 'vencido');
    const today = allDueInfo.filter((i) => i.status === 'hoy');
    const soon = allDueInfo.filter((i) => i.status === 'proximo');
    const upToDate = allDueInfo.filter((i) => i.status === 'al_dia');

    return {
      overdueCount: overdue.length,
      todayCount: today.length,
      soonCount: soon.length,
      upToDateCount: upToDate.length,
      totalRequiringAttention: overdue.length + today.length + soon.length,
    };
  }, [allDueInfo]);

  // Lista filtrada
  const filteredPatients = useMemo(() => {
    return allDueInfo.filter((info) => {
      // Filtro de estado
      if (activeFilter === 'requieren_atencion') {
        if (info.status === 'al_dia') return false;
      } else if (activeFilter === 'vencidos') {
        if (info.status !== 'vencido') return false;
      } else if (activeFilter === 'hoy_proximos') {
        if (info.status !== 'hoy' && info.status !== 'proximo') return false;
      } else if (activeFilter === 'hta') {
        if (!info.patient.tieneHta) return false;
      } else if (activeFilter === 'dm') {
        if (!info.patient.tieneDm) return false;
      }

      // Filtro de texto de búsqueda
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = info.patient.nombreCompleto.toLowerCase().includes(query);
        const matchDni = info.patient.dni.includes(query);
        const matchHc = info.patient.numeroHC?.toLowerCase().includes(query);
        if (!matchName && !matchDni && !matchHc) return false;
      }

      return true;
    }).sort((a, b) => {
      // Orden: vencidos primero (más días de retraso), luego hoy, luego próximos
      const statusOrder: Record<string, number> = { vencido: 0, hoy: 1, proximo: 2, al_dia: 3 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return a.daysUntilDue - b.daysUntilDue;
    });
  }, [allDueInfo, activeFilter, searchQuery]);

  // Manejar solicitud de permisos
  const handleRequestPermission = async () => {
    setPermissionLoading(true);
    const newStatus = await requestDesktopNotificationPermission();
    setPermissionStatus(newStatus);
    setPermissionLoading(false);

    if (newStatus === 'granted') {
      sendDesktopNotification(
        'Notificaciones de Escritorio Activadas',
        {
          body: 'El sistema le avisará automáticamente cuando un paciente deba acudir a su control mensual de HTA o Diabetes.',
        },
        settings.soundEnabled,
        'success'
      );
    }
  };

  // Enviar notificación de prueba al escritorio
  const handleTestNotification = () => {
    if (permissionStatus !== 'granted') {
      handleRequestPermission();
      return;
    }

    sendDesktopNotification(
      'Notificación de Prueba - MedConsulta DNT',
      {
        body: 'Las alertas de escritorio están funcionando correctamente. Recibirá avisos de los pacientes según sus fechas de control.',
      },
      settings.soundEnabled,
      'reminder'
    );

    setTestNotificationSent(true);
    setTimeout(() => setTestNotificationSent(false), 3000);
  };

  // Toggle sonido
  const handleToggleSound = () => {
    const updated = { ...settings, soundEnabled: !settings.soundEnabled };
    setSettings(updated);
    saveNotificationSettings(updated);
    if (updated.soundEnabled) {
      playMedicalChime('reminder');
    }
  };

  // Enviar notificación individual de un paciente al escritorio
  const handleNotifySinglePatient = (info: PatientControlDueInfo) => {
    if (permissionStatus !== 'granted') {
      handleRequestPermission();
      return;
    }

    notifyPatientDue(info, settings.soundEnabled);
    setNotifiedPatientIds((prev) => new Set([...prev, info.patient.id]));
  };

  // Enviar alerta consolidada masiva al escritorio
  const handleNotifyBatch = () => {
    if (permissionStatus !== 'granted') {
      handleRequestPermission();
      return;
    }

    notifyBatchDueSummary(stats.overdueCount, stats.todayCount, settings.soundEnabled);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Principal */}
        <div className="bg-gradient-to-r from-teal-800 to-teal-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-700/80 flex items-center justify-center text-white shadow-inner">
              <Bell className="w-5 h-5 text-teal-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Centro de Notificaciones y Recordatorios DNT
                </h2>
                {stats.totalRequiringAttention > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500 text-white shadow-sm">
                    {stats.totalRequiringAttention} pendientes
                  </span>
                )}
              </div>
              <p className="text-xs text-teal-200">
                Alertas de escritorio y programación de controles mensuales según norma técnica MINSA
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-teal-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Estado de Notificaciones de Escritorio */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Estado de Alertas de Escritorio:</span>
              {permissionStatus === 'granted' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Activas en Navegador
                </span>
              ) : permissionStatus === 'denied' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                  Bloqueadas en Navegador
                </span>
              ) : permissionStatus === 'unsupported' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
                  No soportado por el navegador
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Permiso Pendiente
                </span>
              )}
            </div>

            {permissionStatus !== 'granted' && permissionStatus !== 'unsupported' && (
              <button
                type="button"
                onClick={handleRequestPermission}
                disabled={permissionLoading}
                className="px-3 py-1 text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white rounded-md shadow-sm transition-colors flex items-center gap-1.5"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>{permissionLoading ? 'Solicitando...' : 'Habilitar Notificaciones'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSound}
              title={settings.soundEnabled ? 'Silenciar avisos audibles' : 'Activar avisos audibles'}
              className={`p-1.5 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                settings.soundEnabled 
                  ? 'bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100' 
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {settings.soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-teal-700" />
                  <span className="hidden sm:inline">Sonido Activo</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Silenciado</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleTestNotification}
              className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-md transition-colors flex items-center gap-1 shadow-sm"
              title="Disparar una notificación de prueba en pantalla"
            >
              <Send className="w-3.5 h-3.5 text-teal-700" />
              <span>{testNotificationSent ? '¡Enviada!' : 'Probar Notificación'}</span>
            </button>

            {stats.overdueCount > 0 && (
              <button
                type="button"
                onClick={handleNotifyBatch}
                className="px-2.5 py-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm transition-colors flex items-center gap-1"
                title="Enviar notificación consolidada de pacientes vencidos"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Alertar Vencidos ({stats.overdueCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Resumen Métrico de Alertas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-100/60 border-b border-slate-200 shrink-0">
          <div 
            onClick={() => setActiveFilter('vencidos')}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              activeFilter === 'vencidos'
                ? 'bg-red-50 border-red-300 ring-2 ring-red-400/30'
                : 'bg-white border-slate-200 hover:border-red-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-red-800 font-medium">
              <span>Controles Vencidos</span>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-black text-red-700 mt-1">
              {stats.overdueCount}
            </div>
            <p className="text-[11px] text-red-600/80 mt-0.5">
              Sin control en &gt;{thresholds.diasCaducidadControl} días
            </p>
          </div>

          <div 
            onClick={() => setActiveFilter('hoy_proximos')}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              activeFilter === 'hoy_proximos'
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/30'
                : 'bg-white border-slate-200 hover:border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-amber-800 font-medium">
              <span>Vencen Hoy / Esta Sem.</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-700 mt-1">
              {stats.todayCount + stats.soonCount}
            </div>
            <p className="text-[11px] text-amber-700/80 mt-0.5">
              {stats.todayCount} hoy · {stats.soonCount} en 7 días
            </p>
          </div>

          <div 
            onClick={() => setActiveFilter('requieren_atencion')}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              activeFilter === 'requieren_atencion'
                ? 'bg-teal-50 border-teal-300 ring-2 ring-teal-400/30'
                : 'bg-white border-slate-200 hover:border-teal-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-teal-800 font-medium">
              <span>Total por Notificar</span>
              <Bell className="w-4 h-4 text-teal-700" />
            </div>
            <div className="text-2xl font-black text-teal-800 mt-1">
              {stats.totalRequiringAttention}
            </div>
            <p className="text-[11px] text-teal-700/80 mt-0.5">
              Pacientes con alerta activa
            </p>
          </div>

          <div 
            onClick={() => setActiveFilter('todos')}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              activeFilter === 'todos'
                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/30'
                : 'bg-white border-slate-200 hover:border-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-emerald-800 font-medium">
              <span>Al Día</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              {stats.upToDateCount}
            </div>
            <p className="text-[11px] text-emerald-600/80 mt-0.5">
              Controles vigentes
            </p>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por DNI, Nombres o Historia Clínica..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
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

          {/* Filtros rápidos */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setActiveFilter('requieren_atencion')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeFilter === 'requieren_atencion'
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Con Alerta ({stats.totalRequiringAttention})
            </button>
            <button
              onClick={() => setActiveFilter('vencidos')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeFilter === 'vencidos'
                  ? 'bg-red-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Vencidos ({stats.overdueCount})
            </button>
            <button
              onClick={() => setActiveFilter('hoy_proximos')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeFilter === 'hoy_proximos'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Hoy / 7 Días ({stats.todayCount + stats.soonCount})
            </button>
            <button
              onClick={() => setActiveFilter('hta')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeFilter === 'hta'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              HTA
            </button>
            <button
              onClick={() => setActiveFilter('dm')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeFilter === 'dm'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Diabetes
            </button>
            <button
              onClick={() => setActiveFilter('todos')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeFilter === 'todos'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({allDueInfo.length})
            </button>
          </div>
        </div>

        {/* Lista de Pacientes con Alertas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {filteredPatients.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white rounded-xl border border-dashed border-slate-300">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                No hay alertas de control pendientes
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {searchQuery 
                  ? `No se encontraron pacientes que coincidan con "${searchQuery}".` 
                  : 'Todos los pacientes seleccionados en esta categoría se encuentran al día con sus controles mensuales.'}
              </p>
            </div>
          ) : (
            filteredPatients.map((info) => {
              const p = info.patient;
              const isNotified = notifiedPatientIds.has(p.id);

              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-lg p-4 border transition-all shadow-sm hover:shadow-md ${
                    info.status === 'vencido'
                      ? 'border-red-200 hover:border-red-300 bg-red-50/20'
                      : info.status === 'hoy'
                      ? 'border-amber-200 hover:border-amber-300 bg-amber-50/20'
                      : info.status === 'proximo'
                      ? 'border-blue-200 hover:border-blue-300'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Datos del Paciente */}
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        info.status === 'vencido'
                          ? 'bg-red-100 text-red-700'
                          : info.status === 'hoy'
                          ? 'bg-amber-100 text-amber-700'
                          : info.status === 'proximo'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {info.status === 'vencido' ? (
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        ) : info.status === 'hoy' ? (
                          <Clock className="w-5 h-5 text-amber-600" />
                        ) : info.status === 'proximo' ? (
                          <Calendar className="w-5 h-5 text-blue-600" />
                        ) : (
                          <UserCheck className="w-5 h-5 text-emerald-600" />
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {p.nombreCompleto}
                          </span>
                          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            DNI: {p.dni}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            HC: {p.numeroHC}
                          </span>
                          <span className="text-xs text-slate-500">
                            {p.edad} años ({p.sexo})
                          </span>
                        </div>

                        {/* Etiquetas de Condición Clínica */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {p.tieneHta && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-800 border border-rose-200">
                              HTA
                            </span>
                          )}
                          {p.tieneDm && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-sky-100 text-sky-800 border border-sky-200">
                              {p.tipoDm || 'DM2'}
                            </span>
                          )}
                          {p.tieneDislipidemia && (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-amber-100 text-amber-800 border border-amber-200">
                              Dislipidemia
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

                        {/* Fechas de Seguimiento */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-2">
                          <div>
                            <span className="text-slate-400">Último control:</span>{' '}
                            <span className="font-medium text-slate-800">
                              {formatPeruDate(info.lastControlDate)}
                            </span>
                            <span className="text-slate-400 text-[11px] ml-1">
                              ({info.daysSinceLastControl} días transcurridos)
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400">Fecha de control programada:</span>{' '}
                            <span className="font-semibold text-slate-900">
                              {formatPeruDate(info.nextDueDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Badge de Estado y Acciones */}
                    <div className="flex flex-col sm:items-end justify-between gap-2 shrink-0">
                      <div>
                        {info.status === 'vencido' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-800 border border-red-300 animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                            VENCIDO HACE {Math.abs(info.daysUntilDue)} DÍAS
                          </span>
                        )}
                        {info.status === 'hoy' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            DEBE ACUDIR HOY
                          </span>
                        )}
                        {info.status === 'proximo' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            <Calendar className="w-3.5 h-3.5 text-blue-600" />
                            Vence en {info.daysUntilDue} días
                          </span>
                        )}
                        {info.status === 'al_dia' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Al día ({info.daysUntilDue} días vigentes)
                          </span>
                        )}
                      </div>

                      {/* Botones de Acción */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleNotifySinglePatient(info)}
                          className={`px-2.5 py-1.5 text-xs font-semibold rounded-md border transition-colors flex items-center gap-1.5 shadow-sm ${
                            isNotified
                              ? 'bg-slate-100 text-slate-700 border-slate-300'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                          }`}
                          title="Lanza una notificación nativa de escritorio para este paciente específico"
                        >
                          <Send className="w-3.5 h-3.5 text-teal-700" />
                          <span>{isNotified ? 'Re-Notificar' : 'Notificar al Escritorio'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onOpenMonthlyTracking(p);
                            onClose();
                          }}
                          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-teal-700 hover:bg-teal-800 text-white shadow-sm transition-colors flex items-center gap-1.5"
                          title="Registrar los valores de control mensual del paciente"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Registrar Control</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onEditPatient(p);
                            onClose();
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                          title="Ver o editar ficha de filiación"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pie de Página */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 shrink-0 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Intervalo de control mensual normativo:</span>
            <span className="font-semibold text-slate-900">{thresholds.diasCaducidadControl} días</span>
            <span className="text-slate-400">|</span>
            <span>Alerta preventiva:</span>
            <span className="font-semibold text-slate-900">{thresholds.alertaPreventivaDias} días antes</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-md transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
