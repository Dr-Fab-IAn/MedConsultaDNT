import React, { useState, useEffect } from 'react';
import { X, Save, Building, Cloud, RefreshCw, CheckCircle2, Download, Database, Clock } from 'lucide-react';
import { EstablishmentConfig } from '../types/dnt';
import { 
  CloudSyncSettings, 
  getStoredCloudSyncSettings, 
  saveStoredCloudSyncSettings 
} from '../services/firebaseService';

interface EstablishmentSettingsModalProps {
  config: EstablishmentConfig;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newConfig: EstablishmentConfig) => void;
  onOpenCloudSync?: () => void;
  onOpenScheduledBackups?: () => void;
  onDownloadBackup?: () => void;
  patientsCount?: number;
}

export const EstablishmentSettingsModal: React.FC<EstablishmentSettingsModalProps> = ({
  config,
  isOpen,
  onClose,
  onSave,
  onOpenCloudSync,
  onOpenScheduledBackups,
  onDownloadBackup,
  patientsCount = 0,
}) => {
  if (!isOpen) return null;

  const [form, setForm] = useState<EstablishmentConfig>({ ...config });
  const [syncSettings, setSyncSettings] = useState<CloudSyncSettings>(getStoredCloudSyncSettings());

  useEffect(() => {
    setSyncSettings(getStoredCloudSyncSettings());
  }, [isOpen]);

  const handleToggleSync = (enabled: boolean) => {
    const updated = { ...syncSettings, enabled };
    setSyncSettings(updated);
    saveStoredCloudSyncSettings(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-teal-700" />
            <h3 className="text-base font-bold text-slate-900">
              Datos del Establecimiento de Salud
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-500">
            Estos datos se utilizarán como membrete y encabezado oficial en las columnas de exportación del Padrón Nominal DNT (.xls).
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre del Establecimiento / IPRESS
            </label>
            <input
              type="text"
              value={form.establecimiento}
              onChange={(e) => setForm({ ...form, establecimiento: e.target.value })}
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Código RENAES
              </label>
              <input
                type="text"
                value={form.codigoRenaes}
                onChange={(e) => setForm({ ...form, codigoRenaes: e.target.value })}
                placeholder="Ej: 00003412"
                className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Año del Padrón
              </label>
              <input
                type="number"
                value={form.anio}
                onChange={(e) => setForm({ ...form, anio: parseInt(e.target.value, 10) || 2026 })}
                className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Red de Salud / DIRIS / DISA
              </label>
              <input
                type="text"
                value={form.redSalud}
                onChange={(e) => setForm({ ...form, redSalud: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Microred
              </label>
              <input
                type="text"
                value={form.microred}
                onChange={(e) => setForm({ ...form, microred: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Departamento
              </label>
              <input
                type="text"
                value={form.departamento}
                onChange={(e) => setForm({ ...form, departamento: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Provincia
              </label>
              <input
                type="text"
                value={form.provincia}
                onChange={(e) => setForm({ ...form, provincia: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Distrito
              </label>
              <input
                type="text"
                value={form.distrito}
                onChange={(e) => setForm({ ...form, distrito: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
              />
            </div>
          </div>

          {/* Sección Cloud Sync: Sincronización Remota con Firebase */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  syncSettings.enabled ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      Sincronización en la Nube (Cloud Sync)
                    </span>
                    {syncSettings.enabled && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Firebase Activo
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Respalda y sincroniza el padrón nominal con Firebase Firestore
                  </p>
                </div>
              </div>

              {/* Toggle switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncSettings.enabled}
                  onChange={(e) => handleToggleSync(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-700"></div>
              </label>
            </div>

            {onOpenCloudSync && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 text-xs">
                <span className="text-[11px] text-slate-500">
                  {syncSettings.enabled 
                    ? `Sincronización periódica cada ${syncSettings.intervalMinutes} min` 
                    : 'Sincronización periódica desactivada'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCloudSync();
                  }}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-900 underline"
                >
                  Abrir Panel de Cloud Sync →
                </button>
              </div>
            )}
          </div>

          {/* Sección de Respaldo Manual de Base de Datos */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-md shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      Respaldo Manual de Base de Datos (JSON)
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-white text-indigo-900 border border-indigo-200 rounded">
                      {patientsCount} pacientes
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Descargue una copia de seguridad íntegra de todos los pacientes y controles en un único archivo .json
                  </p>
                </div>
              </div>

              {onDownloadBackup && (
                <button
                  type="button"
                  onClick={onDownloadBackup}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer justify-center"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Descargar JSON</span>
                </button>
              )}
            </div>

            {onOpenScheduledBackups && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 text-xs">
                <span className="text-[11px] text-slate-500">
                  ¿Desea automatizar los respaldos en Google Drive o Dropbox?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenScheduledBackups();
                  }}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-900 underline flex items-center gap-1 cursor-pointer"
                >
                  <Clock className="w-3 h-3 text-teal-700" />
                  <span>Configurar Copias Automáticas →</span>
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Establecimiento</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
