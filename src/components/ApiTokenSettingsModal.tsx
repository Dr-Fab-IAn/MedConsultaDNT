import React, { useState } from 'react';
import { X, KeyRound, CheckCircle2, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { updateApiToken } from '../services/apiService';

interface ApiTokenSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  maskedToken: string;
  onTokenUpdated: () => void;
}

export const ApiTokenSettingsModal: React.FC<ApiTokenSettingsModalProps> = ({
  isOpen,
  onClose,
  maskedToken,
  onTokenUpdated,
}) => {
  if (!isOpen) return null;

  const [newToken, setNewToken] = useState('');
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newToken.trim() || newToken.trim().length < 20) {
      setErrorMsg('Por favor ingrese un token Bearer válido de apisperu.com.');
      return;
    }

    setUpdating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await updateApiToken(newToken.trim());
      setSuccessMsg('Token actualizado exitosamente en el servidor.');
      setNewToken('');
      onTokenUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar el token');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-teal-700" />
            <h3 className="text-base font-bold text-slate-900">
              Configuración de Credenciales API (apisperu.com)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
            <span className="text-xs text-slate-500 block mb-1">Token Activo en el Servidor</span>
            <span className="font-mono text-xs font-semibold text-slate-800 break-all">
              {maskedToken || 'No configurado'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Actualizar Token Bearer
            </label>
            <textarea
              rows={3}
              value={newToken}
              onChange={(e) => setNewToken(e.target.value)}
              placeholder="Pegue aquí el nuevo token JWT de apisperu.com..."
              className="w-full p-2.5 font-mono text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-700 focus:outline-none"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Utilizado automáticamente para las consultas de DNI (RENIEC) y RUC (SUNAT).
            </span>
          </div>

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <a
              href="https://dniruc.apisperu.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-teal-800 hover:underline flex items-center gap-1"
            >
              <span>Panel apisperu.com</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={updating || !newToken.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 rounded-md flex items-center gap-1.5"
              >
                {updating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Actualizar Token</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
