import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { DniValidationResult, RucValidationResult } from '../utils/identificationValidation';

interface IdentificationValidationBadgeProps {
  type: 'dni' | 'ruc';
  validation: DniValidationResult | RucValidationResult;
  showWhenEmpty?: boolean;
  className?: string;
}

export const IdentificationValidationBadge: React.FC<IdentificationValidationBadgeProps> = ({
  type,
  validation,
  showWhenEmpty = false,
  className = '',
}) => {
  if (validation.lengthStatus === 'empty') {
    if (!showWhenEmpty) return null;
    return (
      <div className={`flex items-center gap-1.5 text-xs text-slate-400 py-1 ${className}`}>
        <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        <span>
          {type === 'dni'
            ? 'Validación previa RENIEC activa (8 dígitos)'
            : 'Validación previa SUNAT Módulo 11 activa (11 dígitos)'}
        </span>
      </div>
    );
  }

  if (validation.lengthStatus === 'incomplete') {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50/80 border border-amber-200/80 px-2.5 py-1.5 rounded-md ${className}`}>
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
        <span>{validation.error}</span>
      </div>
    );
  }

  if (!validation.isValid) {
    return (
      <div className={`flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-md ${className}`}>
        <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-semibold">
            {type === 'dni' ? 'Formato de DNI inválido' : 'Validación de RUC fallida'}
          </div>
          <div>{validation.error || 'El número ingresado no cumple con el formato oficial.'}</div>
        </div>
      </div>
    );
  }

  // Válido
  return (
    <div className={`flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-md ${className}`}>
      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
      <div className="flex-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="font-medium">
          {type === 'dni' ? (
            <>
              DNI matemáticamente válido{' '}
              <span className="text-emerald-950 font-mono font-bold">
                (Dígito RENIEC: {(validation as DniValidationResult).calculatedCheckDigit} / {(validation as DniValidationResult).calculatedCheckLetter})
              </span>
            </>
          ) : (
            <>
              RUC válido (SUNAT Módulo 11){' '}
              {(validation as RucValidationResult).entityType && (
                <span className="text-emerald-950 font-semibold">
                  · {(validation as RucValidationResult).entityType}
                </span>
              )}
            </>
          )}
        </span>
        <span className="text-[11px] font-mono uppercase bg-emerald-200/70 text-emerald-900 px-1.5 py-0.5 rounded font-semibold">
          Listo para consultar
        </span>
      </div>
    </div>
  );
};
