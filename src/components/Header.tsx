import React, { useState } from 'react';
import { 
  Activity, 
  Search, 
  UploadCloud, 
  Building2, 
  Settings, 
  UserPlus, 
  FileText, 
  SlidersHorizontal, 
  Bell, 
  Calendar, 
  Cloud,
  Download,
  Database,
  ChevronDown,
  KeyRound,
  CheckCircle2,
  Clock,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { EstablishmentConfig } from '../types/dnt';
import { UserProfile, ROLE_DEFINITIONS } from '../types/auth';
import { RealtimeSyncStatus } from '../services/realtimeDbService';

export type AppNavTab = 'padron' | 'calendario' | 'reporte-gerencial' | 'consulta-dni' | 'carga-masiva' | 'consulta-ruc';

interface HeaderProps {
  currentTab: AppNavTab;
  onSelectTab: (tab: AppNavTab) => void;
  onOpenNewPatient: () => void;
  onOpenEstablishmentSettings: () => void;
  onOpenTokenSettings: () => void;
  onOpenThresholdsSettings: () => void;
  onOpenNotifications: () => void;
  onOpenCloudSync?: () => void;
  onOpenScheduledBackups?: () => void;
  onDownloadBackupJson?: () => void;
  onOpenAuth?: () => void;
  currentUser?: UserProfile;
  realtimeStatus?: RealtimeSyncStatus;
  realtimeDetail?: string;
  patientsCount?: number;
  cloudSyncActive?: boolean;
  alertsCount?: number;
  hasOverdue?: boolean;
  establishment: EstablishmentConfig;
  apiConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenNewPatient,
  onOpenEstablishmentSettings,
  onOpenTokenSettings,
  onOpenThresholdsSettings,
  onOpenNotifications,
  onOpenCloudSync,
  onOpenScheduledBackups,
  onDownloadBackupJson,
  onOpenAuth,
  currentUser,
  realtimeStatus,
  realtimeDetail,
  patientsCount = 0,
  cloudSyncActive = false,
  alertsCount = 0,
  hasOverdue = false,
  establishment,
  apiConnected,
}) => {
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [backupDownloadedFeedback, setBackupDownloadedFeedback] = useState(false);

  const handleDownloadBackup = () => {
    if (onDownloadBackupJson) {
      onDownloadBackupJson();
      setBackupDownloadedFeedback(true);
      setTimeout(() => {
        setBackupDownloadedFeedback(false);
      }, 3500);
    }
  };
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      {/* Zona 1: Contrato de 3 zonas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand title wordmark */}
        <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => onSelectTab('padron')}>
          <div className="w-9 h-9 rounded-lg bg-teal-700 flex items-center justify-center text-white shadow-sm">
            <Activity className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
              MedConsulta DNT
            </span>
            <span className="text-xs text-slate-500 whitespace-nowrap hidden sm:inline">
              Padrón Nominal · Daños No Transmisibles
            </span>
          </div>
        </div>

        {/* Zone 2: Clean single-line nav links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <button
            onClick={() => onSelectTab('padron')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              currentTab === 'padron'
                ? 'bg-slate-100 text-teal-800 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>Padrón Nominal</span>
          </button>

          <button
            onClick={() => onSelectTab('calendario')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              currentTab === 'calendario'
                ? 'bg-slate-100 text-teal-800 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-4 h-4 text-teal-700" />
            <span>Calendario</span>
          </button>

          <button
            onClick={() => onSelectTab('reporte-gerencial')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              currentTab === 'reporte-gerencial'
                ? 'bg-slate-100 text-teal-800 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4 text-teal-700" />
            <span>Reporte Gerencial</span>
          </button>

          <button
            onClick={() => onSelectTab('consulta-dni')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              currentTab === 'consulta-dni'
                ? 'bg-slate-100 text-teal-800 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Search className="w-4 h-4 text-slate-500" />
            <span>Consulta DNI</span>
          </button>

          <button
            onClick={() => onSelectTab('carga-masiva')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              currentTab === 'carga-masiva'
                ? 'bg-slate-100 text-teal-800 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <UploadCloud className="w-4 h-4 text-slate-500" />
            <span>Carga Masiva</span>
          </button>

          <button
            onClick={() => onSelectTab('consulta-ruc')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              currentTab === 'consulta-ruc'
                ? 'bg-slate-100 text-teal-800 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-4 h-4 text-slate-500" />
            <span>Consulta RUC</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action button + notifications + settings */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenEstablishmentSettings}
            title={`${establishment.establecimiento} (${establishment.codigoRenaes})`}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors whitespace-nowrap"
          >
            <span className="font-semibold">{establishment.codigoRenaes || 'RENAES'}</span>
            <span className="text-slate-400">·</span>
            <span className="max-w-[130px] truncate">{establishment.establecimiento}</span>
          </button>

          {/* Botón Centro de Notificaciones y Alertas DNT */}
          <button
            type="button"
            onClick={onOpenNotifications}
            title={`Centro de Notificaciones y Recordatorios (${alertsCount} controles por atender)`}
            className={`relative p-2 rounded-md transition-colors flex items-center justify-center ${
              hasOverdue 
                ? 'text-red-700 bg-red-50 hover:bg-red-100' 
                : alertsCount > 0 
                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100' 
                : 'text-slate-600 hover:text-teal-800 hover:bg-slate-100'
            }`}
          >
            <Bell className={`w-4 h-4 ${hasOverdue ? 'animate-bounce' : ''}`} />
            {alertsCount > 0 && (
              <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-black rounded-full flex items-center justify-center text-white shadow-sm ring-2 ring-white ${
                hasOverdue ? 'bg-red-600' : 'bg-amber-500'
              }`}>
                {alertsCount > 99 ? '99+' : alertsCount}
              </span>
            )}
          </button>

          {onOpenCloudSync && (
            <button
              type="button"
              onClick={onOpenCloudSync}
              title={cloudSyncActive ? 'Sincronización en la Nube Activa (Firebase Firestore)' : 'Configurar Sincronización en la Nube (Cloud Sync)'}
              className={`p-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                cloudSyncActive 
                  ? 'text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Cloud className="w-4 h-4 text-teal-700" />
              <span className="hidden xl:inline text-xs font-semibold text-slate-700">Cloud Sync</span>
              {cloudSyncActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenThresholdsSettings}
            title="Personalizar Umbrales Clínicos (PA, Glucosa y Caducidad de Controles)"
            className="p-1.5 text-slate-600 hover:text-teal-800 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1"
          >
            <SlidersHorizontal className="w-4 h-4 text-teal-700" />
            <span className="hidden xl:inline text-xs font-semibold text-slate-700">Umbrales</span>
          </button>

          {/* Menú Desplegable de Configuración & Respaldo */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
              title="Menú de Configuración y Respaldo del Sistema"
              className={`p-1.5 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                isSettingsMenuOpen 
                  ? 'bg-teal-50 text-teal-800 border border-teal-200' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-4 h-4" />
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isSettingsMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSettingsMenuOpen && (
              <div 
                className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setIsSettingsMenuOpen(false)}
              >
                {/* Cabecera del menú */}
                <div className="px-4 py-2 border-b border-slate-100">
                  <span className="font-bold text-slate-900 block text-xs">
                    Configuración del Sistema
                  </span>
                  <span className="text-[11px] text-slate-500 truncate block">
                    {establishment.establecimiento} (RENAES: {establishment.codigoRenaes || 'S/N'})
                  </span>
                </div>

                {/* Sección 1: Accesos de configuración */}
                <div className="py-1">
                  {onOpenAuth && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsMenuOpen(false);
                        onOpenAuth();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5 transition-colors border-b border-slate-100"
                    >
                      <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
                      <div className="flex-1 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-slate-800 block">Autenticación & Roles (RBAC)</span>
                          <span className="text-[10px] text-slate-500 block">Médico, Enfermería, Digitador, Admin</span>
                        </div>
                        {currentUser && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${ROLE_DEFINITIONS[currentUser.role]?.badgeBg} ${ROLE_DEFINITIONS[currentUser.role]?.badgeText}`}>
                            {ROLE_DEFINITIONS[currentUser.role]?.shortLabel}
                          </span>
                        )}
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsMenuOpen(false);
                      onOpenEstablishmentSettings();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                  >
                    <Building2 className="w-4 h-4 text-teal-700 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-800 block">Datos del Establecimiento</span>
                      <span className="text-[10px] text-slate-500 block">RENAES, Red y Microred oficial</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsMenuOpen(false);
                      onOpenThresholdsSettings();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-teal-700 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-800 block">Umbrales Clínicos & Metas</span>
                      <span className="text-[10px] text-slate-500 block">Metas de PA, glucosa y caducidad</span>
                    </div>
                  </button>

                  {onOpenCloudSync && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsMenuOpen(false);
                        onOpenCloudSync();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                    >
                      <Cloud className="w-4 h-4 text-teal-700 shrink-0" />
                      <div className="flex-1 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-slate-800 block">Sincronización en la Nube</span>
                          <span className="text-[10px] text-slate-500 block">Firebase Firestore</span>
                        </div>
                        {cloudSyncActive && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                            Activo
                          </span>
                        )}
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsMenuOpen(false);
                      onOpenTokenSettings();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                  >
                    <KeyRound className="w-4 h-4 text-teal-700 shrink-0" />
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800 block">Token API (apisperu.com)</span>
                        <span className="text-[10px] text-slate-500 block">Consultas automáticas DNI / RUC</span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${apiConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {apiConnected ? 'Conectado' : 'Pendiente'}
                      </span>
                    </div>
                  </button>
                </div>

                {/* Sección 2: Respaldo Manual de Base de Datos (DESTACADO) */}
                <div className="p-3 mx-2 my-1 bg-teal-50/70 border border-teal-200/80 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-teal-950 uppercase tracking-wide flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-teal-700" />
                      <span>Respaldo Manual de Datos</span>
                    </span>
                    <span className="text-[10px] bg-white px-1.5 py-0.2 rounded font-mono text-teal-900 border border-teal-200 font-bold">
                      {patientsCount} pacientes
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 mb-2.5">
                    Descargue el archivo JSON con toda la base de datos de pacientes actual y sus controles para respaldo local seguro.
                  </p>

                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="w-full py-1.5 px-3 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-semibold rounded-md flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Backup JSON (.json)</span>
                  </button>

                  {onOpenScheduledBackups && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsMenuOpen(false);
                        onOpenScheduledBackups();
                      }}
                      className="w-full mt-2 py-1.5 px-3 bg-white hover:bg-teal-100/60 text-teal-900 border border-teal-300 font-semibold rounded-md flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer text-xs"
                    >
                      <Clock className="w-3.5 h-3.5 text-teal-700" />
                      <span>Programar Copias (Drive / Dropbox)</span>
                    </button>
                  )}

                  {backupDownloadedFeedback && (
                    <div className="mt-2 text-[10px] text-emerald-800 bg-emerald-100/90 py-1 px-2 rounded border border-emerald-300 font-medium flex items-center gap-1 animate-fadeIn">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700 shrink-0" />
                      <span>¡Respaldo JSON descargado con éxito!</span>
                    </div>
                  )}
                </div>

                <div className="px-4 pt-1 pb-0.5 text-[10px] text-slate-400 text-center border-t border-slate-100 mt-1">
                  MedConsulta DNT v1.0 · Padrón Nominal MINSA
                </div>
              </div>
            )}
          </div>

          {/* Indicador de conexión Multi-equipo en tiempo real */}
          {realtimeStatus && (
            <div 
              title={`Estado multi-equipo: ${realtimeDetail || realtimeStatus}`}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${
                realtimeStatus === 'connected'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : realtimeStatus === 'syncing'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${
                realtimeStatus === 'connected' 
                  ? 'bg-emerald-500 animate-pulse' 
                  : realtimeStatus === 'syncing'
                  ? 'bg-amber-500 animate-ping'
                  : 'bg-slate-400'
              }`} />
              <span className="hidden xl:inline text-[11px]">
                {realtimeStatus === 'connected' ? 'Multi-equipo' : realtimeStatus === 'syncing' ? 'Sincronizando' : 'Local'}
              </span>
            </div>
          )}

          {/* Botón de Perfil y Rol Clínico (RBAC) */}
          {currentUser && onOpenAuth && (
            <button
              type="button"
              onClick={onOpenAuth}
              title={`Usuario actual: ${currentUser.displayName} (${currentUser.roleTitle}). Clic para cambiar de rol o iniciar sesión.`}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="text-left hidden lg:block">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-xs font-bold text-slate-800 max-w-[120px] truncate block">
                    {currentUser.displayName.split(' ')[0]} {currentUser.displayName.split(' ')[1] || ''}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${ROLE_DEFINITIONS[currentUser.role]?.badgeBg} ${ROLE_DEFINITIONS[currentUser.role]?.badgeText}`}>
                    {ROLE_DEFINITIONS[currentUser.role]?.shortLabel}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block leading-tight mt-0.5">
                  {currentUser.colegiatura ? currentUser.colegiatura.split('·')[0].trim() : currentUser.roleTitle.split('/')[0].trim()}
                </span>
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenNewPatient}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 active:bg-teal-900 rounded-md shadow-sm transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Paciente</span>
          </button>
        </div>
      </div>

      {/* Sub-header móvil para navegación táctil */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-100 py-1.5 px-2 bg-slate-50 text-xs">
        <button
          onClick={() => onSelectTab('padron')}
          className={`px-2 py-1 rounded ${currentTab === 'padron' ? 'font-bold text-teal-800 bg-white' : 'text-slate-600'}`}
        >
          Padrón
        </button>
        <button
          onClick={() => onSelectTab('calendario')}
          className={`px-2 py-1 rounded flex items-center gap-1 ${currentTab === 'calendario' ? 'font-bold text-teal-800 bg-white' : 'text-slate-600'}`}
        >
          <Calendar className="w-3 h-3 text-teal-700" />
          <span>Agenda</span>
        </button>
        <button
          onClick={() => onSelectTab('reporte-gerencial')}
          className={`px-2 py-1 rounded ${currentTab === 'reporte-gerencial' ? 'font-bold text-teal-800 bg-white' : 'text-slate-600'}`}
        >
          Reporte
        </button>
        <button
          onClick={onOpenNotifications}
          className={`relative px-2 py-1 rounded flex items-center gap-1 font-semibold ${
            hasOverdue ? 'text-red-700 bg-red-100' : alertsCount > 0 ? 'text-amber-800 bg-amber-100' : 'text-slate-600'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Alertas ({alertsCount})</span>
        </button>
        <button
          onClick={() => onSelectTab('consulta-dni')}
          className={`px-2 py-1 rounded ${currentTab === 'consulta-dni' ? 'font-bold text-teal-800 bg-white' : 'text-slate-600'}`}
        >
          DNI
        </button>
        <button
          onClick={() => onSelectTab('carga-masiva')}
          className={`px-2 py-1 rounded ${currentTab === 'carga-masiva' ? 'font-bold text-teal-800 bg-white' : 'text-slate-600'}`}
        >
          Masivo
        </button>
        <button
          onClick={() => onSelectTab('consulta-ruc')}
          className={`px-2 py-1 rounded ${currentTab === 'consulta-ruc' ? 'font-bold text-teal-800 bg-white' : 'text-slate-600'}`}
        >
          RUC
        </button>
      </div>
    </header>
  );
};
