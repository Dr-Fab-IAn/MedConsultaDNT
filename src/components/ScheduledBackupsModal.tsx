import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Cloud, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  RefreshCw, 
  Database, 
  HardDrive, 
  Check, 
  ExternalLink, 
  FileCode, 
  ShieldCheck, 
  FolderCheck,
  Loader2,
  Trash2,
  Play
} from 'lucide-react';
import { DntPatient, EstablishmentConfig } from '../types/dnt';
import { 
  BackupScheduleConfig, 
  BackupProvider, 
  BackupFrequency, 
  BackupHistoryItem,
  getStoredBackupScheduleConfig, 
  saveStoredBackupScheduleConfig, 
  executeCloudBackup, 
  downloadBackupFromHistory 
} from '../services/backupSchedulerService';

interface ScheduledBackupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: DntPatient[];
  establishment: EstablishmentConfig;
  onManualJsonExport?: () => void;
}

export const ScheduledBackupsModal: React.FC<ScheduledBackupsModalProps> = ({
  isOpen,
  onClose,
  patients,
  establishment,
  onManualJsonExport,
}) => {
  if (!isOpen) return null;

  const [config, setConfig] = useState<BackupScheduleConfig>(getStoredBackupScheduleConfig());
  const [activeTab, setActiveTab] = useState<'programacion' | 'proveedores' | 'historial'>('programacion');
  const [isExecutingNow, setIsExecutingNow] = useState(false);
  const [executionMessage, setExecutionMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setConfig(getStoredBackupScheduleConfig());
  }, [isOpen]);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveStoredBackupScheduleConfig(config);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 900);
  };

  const handleExecuteBackupNow = async (providerOverride?: BackupProvider) => {
    setIsExecutingNow(true);
    setExecutionMessage(null);

    try {
      const result = await executeCloudBackup(patients, establishment, providerOverride);
      if (result.success) {
        setExecutionMessage({
          text: `¡Respaldo automático generado y sincronizado con éxito! (${result.fileName})`,
          isError: false,
        });
        setConfig(getStoredBackupScheduleConfig());
      } else {
        setExecutionMessage({
          text: `Fallo en el respaldo: ${result.message}`,
          isError: true,
        });
      }
    } catch (err: any) {
      setExecutionMessage({
        text: `Error al ejecutar copia: ${err.message}`,
        isError: true,
      });
    } finally {
      setIsExecutingNow(false);
    }
  };

  const handleConnectGoogleDrive = () => {
    // Simula o registra la vinculación de cuenta institucional de Google Drive
    const mockEmail = `${establishment.codigoRenaes || 'minsa'}.salud@gmail.com`;
    setConfig((prev) => ({
      ...prev,
      googleDrive: {
        ...prev.googleDrive,
        connected: true,
        accountEmail: prev.googleDrive.accountEmail || mockEmail,
        lastSync: new Date().toISOString(),
      },
    }));
  };

  const handleConnectDropbox = () => {
    // Simula o registra la vinculación de cuenta institucional de Dropbox
    setConfig((prev) => ({
      ...prev,
      dropbox: {
        ...prev.dropbox,
        connected: true,
        accountName: prev.dropbox.accountName || `MINSA - ${establishment.establecimiento}`,
        accessToken: prev.dropbox.accessToken || 'sl.u.AF9_mock_dropbox_token_dnt_peru',
        lastSync: new Date().toISOString(),
      },
    }));
  };

  const handleClearHistory = () => {
    if (window.confirm('¿Desea limpiar el historial de copias de seguridad anteriores?')) {
      const updated = { ...config, history: [] };
      setConfig(updated);
      saveStoredBackupScheduleConfig(updated);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shadow-2xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Copias de Seguridad Automáticas en la Nube</span>
                {config.enabled && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                    Programación Activa
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">
                Respaldo programado de la base de datos hacia Google Drive o Dropbox · {establishment.establecimiento}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de Navegación Interna */}
        <div className="flex border-b border-slate-200 bg-white px-6 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('programacion')}
            className={`py-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'programacion'
                ? 'border-indigo-600 text-indigo-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Frecuencia & Horario</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('proveedores')}
            className={`py-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'proveedores'
                ? 'border-indigo-600 text-indigo-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HardDrive className="w-4 h-4 text-indigo-600" />
            <span>Google Drive / Dropbox</span>
            {(config.googleDrive.connected || config.dropbox.connected) && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('historial')}
            className={`py-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'historial'
                ? 'border-indigo-600 text-indigo-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4 text-indigo-600" />
            <span>Historial de Respaldos ({config.history.length})</span>
          </button>
        </div>

        {/* Contenido del Modal */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {/* Banner de Feedback de Ejecución Inmediata */}
          {executionMessage && (
            <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
              executionMessage.isError 
                ? 'bg-red-50 text-red-900 border-red-200' 
                : 'bg-emerald-50 text-emerald-900 border-emerald-200'
            }`}>
              <div className="flex items-center gap-2">
                {executionMessage.isError ? (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>{executionMessage.text}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setExecutionMessage(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold ml-2"
              >
                ×
              </button>
            </div>
          )}

          {/* PESTAÑA 1: PROGRAMACIÓN Y FRECUENCIA */}
          {activeTab === 'programacion' && (
            <div className="space-y-5">
              {/* Switch Principal: Activar / Desactivar Respaldos Automáticos */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      Activar Copias de Seguridad Automáticas
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Base de datos: {patients.length} pacientes
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Genera periódicamente una copia cifrada en JSON y la envía a la nube según el horario configurado.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Selector de Proveedor Cloud Destino */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. Proveedor de Almacenamiento en la Nube
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Opción: Google Drive */}
                  <div
                    onClick={() => setConfig({ ...config, provider: 'google-drive' })}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      config.provider === 'google-drive'
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {/* Icono estilizado Google Drive */}
                        <div className="w-7 h-7 rounded bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                          ▲
                        </div>
                        <span className="text-sm font-bold text-slate-900">Google Drive</span>
                      </div>
                      {config.googleDrive.connected ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Conectado
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Sin vincular</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">
                      Guarda las copias en tu unidad de Google Drive (Google Workspace / Personal).
                    </p>
                    <span className="text-[10px] font-mono text-slate-500 block mt-1.5 truncate">
                      Carpeta: /{config.googleDrive.folderId || config.targetFolder}
                    </span>
                  </div>

                  {/* Opción: Dropbox */}
                  <div
                    onClick={() => setConfig({ ...config, provider: 'dropbox' })}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      config.provider === 'dropbox'
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {/* Icono estilizado Dropbox */}
                        <div className="w-7 h-7 rounded bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                          ❖
                        </div>
                        <span className="text-sm font-bold text-slate-900">Dropbox</span>
                      </div>
                      {config.dropbox.connected ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Conectado
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Sin vincular</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">
                      Sincroniza y archiva los respaldos JSON en tu espacio de almacenamiento de Dropbox.
                    </p>
                    <span className="text-[10px] font-mono text-slate-500 block mt-1.5 truncate">
                      Ruta: {config.dropbox.folderPath || '/Apps/MedConsulta_DNT'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Frecuencia y Horario */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    2. Frecuencia de Ejecución
                  </label>
                  <select
                    value={config.frequency}
                    onChange={(e) => setConfig({ ...config, frequency: e.target.value as BackupFrequency })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 font-medium"
                  >
                    <option value="diario">Diario (al finalizar el turno de atención)</option>
                    <option value="turno">Cada Cambio de Guardia (08:00 y 20:00)</option>
                    <option value="semanal">Semanal (Viernes al cierre estadístico)</option>
                    <option value="mensual">Mensual (Cierre de mes para informe DNT)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {config.frequency === 'diario' && 'Se ejecutará automáticamente una vez al día a la hora indicada.'}
                    {config.frequency === 'turno' && 'Ideal para relevo médico de guardia cada 12 horas.'}
                    {config.frequency === 'semanal' && 'Consolida y respalda los viernes al término de la semana.'}
                    {config.frequency === 'mensual' && 'Coincide con la generación del padrón mensual para la Red.'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    3. Hora Programada de Ejecución
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={config.executionTime}
                      onChange={(e) => setConfig({ ...config, executionTime: e.target.value })}
                      className="px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 flex-1"
                    />
                    <span className="text-xs text-slate-500 font-medium">Hora Perú</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Horario recomendado: 19:00 a 21:00 (cierre de turno).
                  </span>
                </div>
              </div>

              {/* Carpeta y Retención */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    4. Nombre de Carpeta Destino
                  </label>
                  <input
                    type="text"
                    value={config.targetFolder}
                    onChange={(e) => setConfig({ ...config, targetFolder: e.target.value })}
                    placeholder="MINSA_DNT_Backups"
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    5. Retención de Copias (Rotación)
                  </label>
                  <select
                    value={config.retentionCount}
                    onChange={(e) => setConfig({ ...config, retentionCount: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                  >
                    <option value={15}>Conservar últimas 15 copias</option>
                    <option value={30}>Conservar últimas 30 copias (Recomendado)</option>
                    <option value={60}>Conservar últimas 60 copias (2 meses)</option>
                    <option value={90}>Conservar últimas 90 copias (1 trimestre)</option>
                  </select>
                </div>
              </div>

              {/* Botón de Prueba Rápida Inmediata */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-200">
                <span className="text-xs text-slate-500">
                  Prueba la conexión y la carga inmediata en la nube:
                </span>
                <button
                  type="button"
                  onClick={() => handleExecuteBackupNow()}
                  disabled={isExecutingNow}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 disabled:bg-slate-100 text-indigo-900 border border-indigo-200 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  {isExecutingNow ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-700" />
                  ) : (
                    <Play className="w-3.5 h-3.5 text-indigo-700" />
                  )}
                  <span>{isExecutingNow ? 'Subiendo copia...' : `Respaldar ahora en ${config.provider === 'google-drive' ? 'Google Drive' : 'Dropbox'}`}</span>
                </button>
              </div>
            </div>
          )}

          {/* PESTAÑA 2: CONEXIÓN DE PROVEEDORES (GOOGLE DRIVE / DROPBOX) */}
          {activeTab === 'proveedores' && (
            <div className="space-y-5">
              {/* Proveedor 1: Google Drive */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                      ▲
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Google Drive</h4>
                      <p className="text-xs text-slate-500">Almacenamiento en Google Cloud / Workspace</p>
                    </div>
                  </div>

                  {config.googleDrive.connected ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Vinculado
                      </span>
                      <button
                        type="button"
                        onClick={() => setConfig({
                          ...config,
                          googleDrive: { ...config.googleDrive, connected: false }
                        })}
                        className="text-[11px] text-red-600 hover:underline"
                      >
                        Desconectar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectGoogleDrive}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-indigo-700" />
                      <span>Conectar Google Drive</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Cuenta de Google Asociada:
                    </label>
                    <input
                      type="email"
                      value={config.googleDrive.accountEmail}
                      onChange={(e) => setConfig({
                        ...config,
                        googleDrive: { ...config.googleDrive, accountEmail: e.target.value }
                      })}
                      placeholder="ejemplo@minsa.gob.pe"
                      className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Carpeta Remota en Drive:
                    </label>
                    <input
                      type="text"
                      value={config.googleDrive.folderId}
                      onChange={(e) => setConfig({
                        ...config,
                        googleDrive: { ...config.googleDrive, folderId: e.target.value }
                      })}
                      placeholder="MINSA_DNT_Cloud_Drive"
                      className="w-full px-2.5 py-1 text-xs font-mono border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>

                {config.googleDrive.lastSync && (
                  <div className="text-[11px] text-slate-500 pt-1 flex items-center gap-1">
                    <span>Última sincronización exitosa con Drive:</span>
                    <strong className="text-slate-700 font-mono">
                      {new Date(config.googleDrive.lastSync).toLocaleString('es-PE')}
                    </strong>
                  </div>
                )}
              </div>

              {/* Proveedor 2: Dropbox */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded bg-sky-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                      ❖
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Dropbox</h4>
                      <p className="text-xs text-slate-500">Almacenamiento en Dropbox Business o Personal</p>
                    </div>
                  </div>

                  {config.dropbox.connected ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Vinculado
                      </span>
                      <button
                        type="button"
                        onClick={() => setConfig({
                          ...config,
                          dropbox: { ...config.dropbox, connected: false }
                        })}
                        className="text-[11px] text-red-600 hover:underline"
                      >
                        Desconectar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectDropbox}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-sky-700" />
                      <span>Conectar Dropbox</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Espacio / Nombre de Cuenta:
                    </label>
                    <input
                      type="text"
                      value={config.dropbox.accountName}
                      onChange={(e) => setConfig({
                        ...config,
                        dropbox: { ...config.dropbox, accountName: e.target.value }
                      })}
                      placeholder="MINSA Establecimiento Salud"
                      className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Ruta de Carpeta en Dropbox:
                    </label>
                    <input
                      type="text"
                      value={config.dropbox.folderPath}
                      onChange={(e) => setConfig({
                        ...config,
                        dropbox: { ...config.dropbox, folderPath: e.target.value }
                      })}
                      placeholder="/Apps/MedConsulta_DNT/Backups"
                      className="w-full px-2.5 py-1 text-xs font-mono border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>

                {config.dropbox.lastSync && (
                  <div className="text-[11px] text-slate-500 pt-1 flex items-center gap-1">
                    <span>Última sincronización exitosa con Dropbox:</span>
                    <strong className="text-slate-700 font-mono">
                      {new Date(config.dropbox.lastSync).toLocaleString('es-PE')}
                    </strong>
                  </div>
                )}
              </div>

              {/* Recordatorio de Respaldo Manual JSON */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-amber-950 block">¿Necesitas una copia inmediata para tu equipo?</span>
                  <span className="text-amber-800 text-[11px]">
                    También puedes descargar directamente el archivo JSON completo en tu dispositivo en cualquier momento.
                  </span>
                </div>
                {onManualJsonExport && (
                  <button
                    type="button"
                    onClick={onManualJsonExport}
                    className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-xs font-semibold shrink-0"
                  >
                    Descargar JSON Manual
                  </button>
                )}
              </div>
            </div>
          )}

          {/* PESTAÑA 3: HISTORIAL DE RESPALDOS REALIZADOS */}
          {activeTab === 'historial' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Historial de Copias Automáticas y Manuales ({config.history.length})
                </span>
                {config.history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="text-[11px] text-red-600 hover:text-red-800 hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Limpiar historial</span>
                  </button>
                )}
              </div>

              {config.history.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-lg">
                  No hay copias de seguridad registradas aún en el historial.
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => handleExecuteBackupNow()}
                      className="text-indigo-600 font-semibold hover:underline"
                    >
                      Ejecutar primer respaldo ahora
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold">
                      <tr>
                        <th className="px-3 py-2">Fecha y Hora</th>
                        <th className="px-3 py-2">Proveedor</th>
                        <th className="px-3 py-2">Nombre de Archivo</th>
                        <th className="px-3 py-2 text-center">Pacientes</th>
                        <th className="px-3 py-2 text-right">Tamaño</th>
                        <th className="px-3 py-2 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {config.history.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                            {new Date(item.timestamp).toLocaleString('es-PE')}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 font-bold text-[10px] px-1.5 py-0.2 rounded ${
                              item.provider === 'google-drive'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-sky-100 text-sky-900'
                            }`}>
                              {item.provider === 'google-drive' ? 'Google Drive' : 'Dropbox'}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-800 truncate max-w-[200px]" title={item.fileName}>
                            {item.fileName}
                          </td>
                          <td className="px-3 py-2 text-center font-mono font-bold text-slate-700">
                            {item.patientCount}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-slate-600">
                            {(item.fileSizeBytes / 1024).toFixed(1)} KB
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => downloadBackupFromHistory(item)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-800 text-slate-700 rounded border border-slate-200 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                              title="Descargar este archivo JSON de respaldo"
                            >
                              <Download className="w-3 h-3 text-indigo-700" />
                              <span>Descargar</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Copias automáticas con rotación de retención de hasta {config.retentionCount} versiones.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 active:bg-indigo-900 rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Guardado!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Programación</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
