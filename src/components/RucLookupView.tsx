import React, { useState } from 'react';
import { Search, Loader2, Building2, CheckCircle2, AlertCircle, MapPin, BookmarkPlus, Trash2, ShieldCheck, XCircle } from 'lucide-react';
import { queryRuc } from '../services/apiService';
import { RucQueryResult } from '../types/dnt';
import { validateRuc } from '../utils/identificationValidation';
import { IdentificationValidationBadge } from './IdentificationValidationBadge';

const STORAGE_KEY_SAVED_RUCS = 'medconsulta_saved_rucs_v1';

export const RucLookupView: React.FC = () => {
  const [rucInput, setRucInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentRucData, setCurrentRucData] = useState<RucQueryResult | null>(null);

  // Lista guardada de convenios / entidades
  const [savedRucs, setSavedRucs] = useState<RucQueryResult[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SAVED_RUCS);
      return raw ? JSON.parse(raw) : [
        {
          ruc: '20524660858',
          razonSocial: 'SEGURO INTEGRAL DE SALUD - SIS',
          estado: 'ACTIVO',
          condicion: 'HABIDO',
          direccion: 'AV. PASEO DE LA REPUBLICA NRO. 1645',
          departamento: 'LIMA',
          provincia: 'LIMA',
          distrito: 'LA VICTORIA',
        },
        {
          ruc: '20131257750',
          razonSocial: 'SEGURO SOCIAL DE SALUD - ESSALUD',
          estado: 'ACTIVO',
          condicion: 'HABIDO',
          direccion: 'JR. DOMINGO CUETO NRO. 120',
          departamento: 'LIMA',
          provincia: 'LIMA',
          distrito: 'JESUS MARIA',
        }
      ];
    } catch {
      return [];
    }
  });

  const rucValidation = validateRuc(rucInput);
  const cleanRuc = rucValidation.cleanRuc;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rucValidation.isValid) {
      setError(rucValidation.error || 'Por favor ingrese un número de RUC válido de 11 dígitos.');
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentRucData(null);

    try {
      const data = await queryRuc(cleanRuc);
      setCurrentRucData(data);
    } catch (err: any) {
      setError(err.message || 'No se pudo consultar el RUC en SUNAT.');
    } finally {
      setLoading(false);
    }
  };

  // Clases dinámicas del input según estado de validación
  const getInputStateClasses = () => {
    if (!rucInput) {
      return 'border-slate-300 focus:border-teal-700 focus:ring-teal-700/20';
    }
    if (rucValidation.isValid) {
      return 'border-emerald-500 bg-emerald-50/20 focus:border-emerald-600 focus:ring-emerald-500/20 text-emerald-950 font-semibold';
    }
    if (rucInput.length === 11 && !rucValidation.isValid) {
      return 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-red-500/20 text-red-950';
    }
    return 'border-amber-400 bg-amber-50/20 focus:border-amber-500 focus:ring-amber-400/20 text-slate-900';
  };

  const handleSaveToDirectory = () => {
    if (!currentRucData) return;
    const exists = savedRucs.some((r) => r.ruc === currentRucData.ruc);
    if (exists) {
      alert('Esta entidad ya está guardada en el directorio de convenios.');
      return;
    }

    const updated = [currentRucData, ...savedRucs];
    setSavedRucs(updated);
    localStorage.setItem(STORAGE_KEY_SAVED_RUCS, JSON.stringify(updated));
  };

  const handleDeleteSaved = (rucToDelete: string) => {
    const updated = savedRucs.filter((r) => r.ruc !== rucToDelete);
    setSavedRucs(updated);
    localStorage.setItem(STORAGE_KEY_SAVED_RUCS, JSON.stringify(updated));
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-teal-800 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span>Validación SUNAT Módulo 11 con Checksum Previo</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Consulta de RUC (SUNAT / apisperu.com)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Verifique la razón social, estado de contribuyente (Activo) y condición fiscal (Habido) de aseguradoras, clínicas aliadas o proveedores de medicamentos.
          </p>
        </div>

        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                maxLength={11}
                value={rucInput}
                onChange={(e) => {
                  setRucInput(e.target.value.replace(/\D/g, ''));
                  setError(null);
                }}
                placeholder="Ejemplo: 20524660858"
                className={`w-full pl-11 pr-11 py-2.5 font-mono text-base border rounded-md focus:outline-none focus:ring-2 transition-colors ${getInputStateClasses()}`}
              />
              <Building2 className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />

              {/* Indicador visual de estado a la derecha del input */}
              <div className="absolute right-3.5 top-3">
                {rucInput.length === 0 ? (
                  <span className="text-[11px] font-mono text-slate-400">11 dgt</span>
                ) : rucValidation.isValid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : rucInput.length === 11 ? (
                  <XCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <span className="text-xs font-mono text-amber-600 font-medium">
                    {rucInput.length}/11
                  </span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !rucValidation.isValid}
              className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium text-sm rounded-md transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Consultando SUNAT...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Consultar RUC</span>
                </>
              )}
            </button>
          </div>

          {/* Badge de validación en tiempo real */}
          <IdentificationValidationBadge
            type="ruc"
            validation={rucValidation}
            showWhenEmpty={true}
          />

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Tarjeta de resultado */}
        {currentRucData && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                <div>
                  <span className="font-mono text-sm font-bold text-slate-900">
                    RUC: {currentRucData.ruc}
                  </span>
                  <h3 className="text-base font-bold text-teal-900 mt-0.5">
                    {currentRucData.razonSocial || 'Razón Social no disponible'}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded ${
                    currentRucData.estado?.toUpperCase().includes('ACTIVO')
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {currentRucData.estado || 'ESTADO DESCONOCIDO'}
                  </span>

                  <span className={`px-2.5 py-1 text-xs font-semibold rounded ${
                    currentRucData.condicion?.toUpperCase().includes('HABIDO')
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {currentRucData.condicion || 'CONDICIÓN'}
                  </span>
                </div>
              </div>

              <div className="pt-3 text-xs text-slate-700 space-y-1">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Dirección Fiscal:</strong> {currentRucData.direccion || '-'}
                    {currentRucData.distrito ? ` - ${currentRucData.distrito}, ${currentRucData.provincia}, ${currentRucData.departamento}` : ''}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/80 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveToDirectory}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>Guardar en Directorio de Convenios</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Directorio de convenios y aseguradoras guardadas */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
          Entidades y Convenios Registrados ({savedRucs.length})
        </h3>

        {savedRucs.length === 0 ? (
          <p className="text-xs text-slate-500">No hay entidades registradas en el directorio.</p>
        ) : (
          <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
            {savedRucs.map((item) => (
              <div key={item.ruc} className="p-3.5 bg-white hover:bg-slate-50 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">{item.ruc}</span>
                    <span className="text-xs px-2 py-0.2 bg-slate-100 text-slate-700 rounded font-medium">
                      {item.estado} · {item.condicion}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                    {item.razonSocial}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate">{item.direccion}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteSaved(item.ruc)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                  title="Eliminar de lista"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
