import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  CloudUpload, 
  CloudDownload, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  RefreshCw, 
  Database, 
  ShieldCheck, 
  Smartphone, 
  Laptop, 
  Clock 
} from 'lucide-react';
import { DntPatient, EstablishmentConfig } from '../types/dnt';
import { 
  CloudSyncSettings, 
  getStoredCloudSyncSettings, 
  saveStoredCloudSyncSettings, 
  pushPatientsToRemoteCloud, 
  pullPatientsFromRemoteCloud 
} from '../services/firebaseService';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: DntPatient[];
  establishment: EstablishmentConfig;
  onPatientsImportedFromCloud: (remotePatients: DntPatient[]) => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  patients,
  establishment,
  onPatientsImportedFromCloud,
}) => {
  const [settings, setSettings] = useState<CloudSyncSettings>(getStoredCloudSyncSettings());
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSettings(getStoredCloudSyncSettings());
      setFeedbackMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleSync = (enabled: boolean) => {
    const updated: CloudSyncSettings = { ...settings, enabled };
    setSettings(updated);
    saveStoredCloudSyncSettings(updated);

    if (enabled) {
      setFeedbackMessage({
        type: 'success',
        text: `Sincronización en la nube activada. Se sincronizará periódicamente cada ${updated.intervalMinutes} minutos.`,
      });
      // Disparar sincronización inmediata al activar
      handleManualPush();
    } else {
      setFeedbackMessage({
        type: 'success',
        text: 'Sincronización automática en la nube pausada.',
      });
    }
  };

  const handleChangeInterval = (intervalMinutes: number) => {
    const updated: CloudSyncSettings = { ...settings, intervalMinutes };
    setSettings(updated);
    saveStoredCloudSyncSettings(updated);
  };

  const handleManualPush = async () => {
    setIsPushing(true);
    setFeedbackMessage(null);

    const result = await pushPatientsToRemoteCloud(patients, establishment);
    setIsPushing(false);

    if (result.success) {
      setSettings(getStoredCloudSyncSettings());
      setFeedbackMessage({
        type: 'success',
        text: `¡Sincronización exitosa! ${result.count} pacientes respaldados en Firebase Firestore.`,
      });
    } else {
      setFeedbackMessage({
        type: 'error',
        text: `Error al sincronizar con la nube: ${result.error || 'Fallo de red'}`,
      });
    }
  };

  const handleManualPull = async () => {
    if (!confirm('¿Desea restaurar y sincronizar los pacientes desde la base de datos Firebase? Se actualizará el padrón local con los registros remotos.')) {
      return;
    }

    setIsPulling(true);
    setFeedbackMessage(null);

    const result = await pullPatientsFromRemoteCloud(establishment);
    setIsPulling(false);

    if (result.success && result.patients) {
      onPatientsImportedFromCloud(result.patients);
      setFeedbackMessage({
        type: 'success',
        text: `¡Descarga exitosa! Se cargaron ${result.patients.length} pacientes desde Firestore.`,
      });
    } else {
      setFeedbackMessage({
        type: 'error',
        text: `No se pudieron descargar los datos: ${result.error || 'Sin respuesta'}`,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="bg-gradient-to-r from-teal-800 to-slate-900 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-700/80 flex items-center justify-center text-teal-200">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>Sincronización en la Nube (Cloud Sync)</span>
                {settings.enabled && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                    Activo
                  </span>
                )}
              </h3>
              <p className="text-xs text-teal-200">
                Persistencia en Firebase Firestore entre diferentes dispositivos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Tarjeta de Interruptor Principal (Cloud Sync Toggle) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-slate-900 block">
                Activar Sincronización Automática
              </span>
              <p className="text-xs text-slate-500">
                Envía periódicamente el estado actual del padrón nominal a Firebase Firestore.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => handleToggleSync(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-700"></div>
            </label>
          </div>

          {/* Opciones cuando está habilitado */}
          {settings.enabled && (
            <div className="space-y-3 bg-teal-50/40 border border-teal-200/80 rounded-xl p-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-700" />
                  <span>Frecuencia de sincronización periódica:</span>
                </label>
                <select
                  value={settings.intervalMinutes}
                  onChange={(e) => handleChangeInterval(parseInt(e.target.value, 10))}
                  className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-700"
                >
                  <option value={5}>Cada 5 minutos</option>
                  <option value={15}>Cada 15 minutos</option>
                  <option value={30}>Cada 30 minutos</option>
                  <option value={60}>Cada 1 hora</option>
                </select>
              </div>

              <div className="text-[11px] text-teal-900/80 flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>
                  Los cambios realizados en este dispositivo se respaldarán en segundo plano automáticamente.
                </span>
              </div>
            </div>
          )}

          {/* Información del Estado de la Base de Datos Remota */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-slate-700 pb-2 border-b border-slate-100">
              <span className="font-semibold flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-teal-700" />
                <span>Base de Datos Remota:</span>
              </span>
              <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                Firebase Firestore
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-700">
              <span className="text-slate-500">Establecimiento / RENAES:</span>
              <span className="font-bold text-slate-900">
                {establishment.establecimiento} ({establishment.codigoRenaes})
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-700">
              <span className="text-slate-500">Pacientes actuales en local:</span>
              <span className="font-bold text-slate-900">
                {patients.length} pacientes
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-700">
              <span className="text-slate-500">Última sincronización:</span>
              <span className="font-medium text-slate-800">
                {settings.lastSyncTimestamp 
                  ? new Date(settings.lastSyncTimestamp).toLocaleString('es-PE', {
                      dateStyle: 'short',
                      timeStyle: 'medium',
                    })
                  : 'Nunca sincronizado'}
              </span>
            </div>
          </div>

          {/* Mensajes de retroalimentación */}
          {feedbackMessage && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                feedbackMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                  : 'bg-red-50 border border-red-300 text-red-900'
              }`}
            >
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
          )}

          {/* Acciones Manuales (Push y Pull) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={handleManualPush}
              disabled={isPushing}
              className="px-3.5 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-teal-400 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <CloudUpload className={`w-4 h-4 ${isPushing ? 'animate-bounce' : ''}`} />
              <span>{isPushing ? 'Subiendo...' : 'Sincronizar a la Nube (Push)'}</span>
            </button>

            <button
              type="button"
              onClick={handleManualPull}
              disabled={isPulling}
              className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 disabled:opacity-50 rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5"
              title="Descargar y restaurar datos desde la base de datos remota para este establecimiento"
            >
              <CloudDownload className={`w-4 h-4 text-teal-700 ${isPulling ? 'animate-bounce' : ''}`} />
              <span>{isPulling ? 'Descargando...' : 'Restaurar de Nube (Pull)'}</span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <Laptop className="w-3.5 h-3.5" />
              <span>Consultorio A</span>
            </span>
            <span>⇄</span>
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-teal-600" />
              <span>Firebase Cloud</span>
            </span>
            <span>⇄</span>
            <span className="flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Móvil / Consultorio B</span>
            </span>
          </div>
        </div>

        {/* Pie */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
