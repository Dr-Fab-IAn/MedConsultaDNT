import React, { useState } from 'react';
import { Search, Loader2, CheckCircle2, AlertCircle, FileText, UserPlus, ArrowRight, ShieldCheck, XCircle } from 'lucide-react';
import { queryDni } from '../services/apiService';
import { DniQueryResult, DntPatient } from '../types/dnt';
import { validateDni } from '../utils/identificationValidation';
import { IdentificationValidationBadge } from './IdentificationValidationBadge';

interface DniLookupViewProps {
  existingPatients: DntPatient[];
  onSelectExistingPatient: (patient: DntPatient) => void;
  onCreatePatientFromDni: (dniData: DniQueryResult) => void;
}

export const DniLookupView: React.FC<DniLookupViewProps> = ({
  existingPatients,
  onSelectExistingPatient,
  onCreatePatientFromDni,
}) => {
  const [dniInput, setDniInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DniQueryResult | null>(null);

  const dniValidation = validateDni(dniInput);
  const cleanDni = dniValidation.cleanDni;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!dniValidation.isValid) {
      setError(dniValidation.error || 'Por favor ingrese un número de DNI válido de 8 dígitos.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await queryDni(cleanDni);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'No se pudo consultar el DNI. Verifique su conexión y el token del servicio.');
    } finally {
      setLoading(false);
    }
  };

  // Buscar si ya está en el padrón local
  const existingPatient = result
    ? existingPatients.find((p) => p.dni === result.dni)
    : null;

  // Clases dinámicas del input según estado de validación
  const getInputStateClasses = () => {
    if (!dniInput) {
      return 'border-slate-300 focus:border-teal-700 focus:ring-teal-700/20';
    }
    if (dniValidation.isValid) {
      return 'border-emerald-500 bg-emerald-50/20 focus:border-emerald-600 focus:ring-emerald-500/20 text-emerald-950 font-semibold';
    }
    if (dniInput.length === 8 && !dniValidation.isValid) {
      return 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-red-500/20 text-red-950';
    }
    return 'border-amber-400 bg-amber-50/20 focus:border-amber-500 focus:ring-amber-400/20 text-slate-900';
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 shadow-xs">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-teal-800 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span>Validación de Identidad RENIEC con Checksum Previo</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Consulta Oficial de DNI (RENIEC / apisperu.com)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            El sistema comprueba matemáticamente el formato y dígito verificador antes de consultar la API para optimizar cuotas y prevenir registros erróneos.
          </p>
        </div>

        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                maxLength={8}
                value={dniInput}
                onChange={(e) => {
                  setDniInput(e.target.value.replace(/\D/g, ''));
                  setError(null);
                }}
                placeholder="Ejemplo: 45892134"
                className={`w-full pl-11 pr-11 py-2.5 text-base font-mono tracking-wider border rounded-md focus:outline-none focus:ring-2 transition-colors ${getInputStateClasses()}`}
                autoFocus
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />

              {/* Indicador visual de estado a la derecha del input */}
              <div className="absolute right-3.5 top-3">
                {dniInput.length === 0 ? (
                  <span className="text-[11px] font-mono text-slate-400">8 dgt</span>
                ) : dniValidation.isValid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : dniInput.length === 8 ? (
                  <XCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <span className="text-xs font-mono text-amber-600 font-medium">
                    {dniInput.length}/8
                  </span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !dniValidation.isValid}
              className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium text-sm rounded-md transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Consultando...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Consultar DNI</span>
                </>
              )}
            </button>
          </div>

          {/* Badge de validación en tiempo real */}
          <IdentificationValidationBadge
            type="dni"
            validation={dniValidation}
            showWhenEmpty={true}
          />

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Resultado */}
        {result && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Datos Verificados con RENIEC</span>
              </div>
              <span className="font-mono text-xs text-slate-500">
                Código de Verificación: <strong className="text-slate-800">{result.codVerifica || '-'}</strong>
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider block">DNI</span>
                  <span className="font-mono font-bold text-slate-900 text-base">{result.dni}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider block">Apellido Paterno</span>
                  <span className="font-semibold text-slate-900">{result.apellidoPaterno || '-'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider block">Apellido Materno</span>
                  <span className="font-semibold text-slate-900">{result.apellidoMaterno || '-'}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80">
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Nombres Completos</span>
                <span className="font-bold text-slate-900 text-base">{result.nombres || '-'}</span>
              </div>
            </div>

            {/* Acciones contextuales */}
            <div className="mt-5 flex flex-col sm:flex-row items-center justify-end gap-3">
              {existingPatient ? (
                <div className="w-full flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="text-xs text-amber-800">
                    <strong>Paciente ya registrado:</strong> Este DNI ya figura en el Padrón DNT con Historia Clínica <strong>{existingPatient.numeroHC || 'S/N'}</strong>.
                  </div>
                  <button
                    onClick={() => onSelectExistingPatient(existingPatient)}
                    className="ml-3 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded transition-colors whitespace-nowrap flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ver Ficha DNT</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onCreatePatientFromDni(result)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-medium text-sm rounded-md transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Crear Ficha en Padrón DNT</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Guía rápida de uso */}
      <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600 flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <span className="font-semibold text-slate-800">Consejo de Admisión:</span> Puedes presionar Enter tras digitar el DNI para autocompletar la ficha clínica en un instante.
        </div>
        <div className="font-mono text-slate-500">
          Servicio: apisperu.com · RENIEC Perú
        </div>
      </div>
    </div>
  );
};
