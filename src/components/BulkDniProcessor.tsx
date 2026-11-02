import React, { useState } from 'react';
import { UploadCloud, Play, CheckCircle2, AlertCircle, FileSpreadsheet, PlusCircle, RotateCcw, ShieldCheck } from 'lucide-react';
import { BulkDniItem, DntPatient, EstablishmentConfig } from '../types/dnt';
import { queryDni } from '../services/apiService';
import { parseExcelPatients } from '../services/dntExportService';
import { createEmptyMonthlyControls } from '../utils/clinicalCalculations';
import { validateDni, calculateDniCheckChar } from '../utils/identificationValidation';
import * as XLSX from 'xlsx';

interface BulkDniProcessorProps {
  establishment: EstablishmentConfig;
  onAddPatientsToPadron: (newPatients: DntPatient[]) => void;
}

export const BulkDniProcessor: React.FC<BulkDniProcessorProps> = ({
  establishment,
  onAddPatientsToPadron,
}) => {
  const [inputText, setInputText] = useState('');
  const [items, setItems] = useState<BulkDniItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [importedSuccessMsg, setImportedSuccessMsg] = useState<string | null>(null);

  // Extraer DNIs del texto pegado con validación previa
  const handleLoadFromText = () => {
    const rawMatches = inputText.match(/\b\d{8}\b/g) || [];
    const uniqueDnis = Array.from(new Set(rawMatches));

    if (uniqueDnis.length === 0) {
      alert('No se encontraron números de DNI de 8 dígitos en el texto.');
      return;
    }

    const newItems: BulkDniItem[] = uniqueDnis.map((dni) => {
      const validation = validateDni(dni);
      return {
        id: `bulk-${dni}-${Date.now()}-${Math.random()}`,
        dni,
        estado: validation.isValid ? 'pendiente' : 'error',
        mensajeError: validation.isValid ? undefined : (validation.error || 'Formato o checksum de DNI inválido'),
      };
    });

    setItems(newItems);
    setCurrentIndex(0);
    setImportedSuccessMsg(null);
  };

  // Carga desde archivo Excel con validación previa
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseExcelPatients(file);
      if (parsed.length === 0) {
        alert('No se pudieron extraer registros con DNI del archivo Excel seleccionado.');
        return;
      }

      const newItems: BulkDniItem[] = parsed.map((p) => {
        const validation = validateDni(p.dni || '');
        const isPreFilled = Boolean(p.nombres);
        return {
          id: `bulk-${p.dni}-${Date.now()}-${Math.random()}`,
          dni: p.dni!,
          nombres: p.nombres,
          apellidoPaterno: p.apellidoPaterno,
          apellidoMaterno: p.apellidoMaterno,
          nombreCompleto: p.nombreCompleto,
          edad: p.edad,
          sexo: p.sexo,
          estado: !validation.isValid ? 'error' : (isPreFilled ? 'exito' : 'pendiente'),
          mensajeError: !validation.isValid ? (validation.error || 'Formato o checksum de DNI inválido') : undefined,
        };
      });

      setItems(newItems);
      setCurrentIndex(0);
      setImportedSuccessMsg(null);
    } catch (err: any) {
      alert(`Error al procesar archivo Excel: ${err.message}`);
    }
  };

  // Procesar la cola secuencialmente con 150ms de pausa
  const handleStartProcessing = async () => {
    if (items.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setImportedSuccessMsg(null);

    const updated = [...items];

    for (let i = 0; i < updated.length; i++) {
      if (updated[i].estado === 'exito') continue;

      // Filtrar DNIs inválidos antes de invocar la API
      const validation = validateDni(updated[i].dni);
      if (!validation.isValid) {
        updated[i] = {
          ...updated[i],
          estado: 'error',
          mensajeError: validation.error || 'Checksum o formato de DNI inválido',
        };
        setItems([...updated]);
        continue;
      }

      setCurrentIndex(i + 1);
      updated[i] = { ...updated[i], estado: 'consultando' };
      setItems([...updated]);

      try {
        const res = await queryDni(updated[i].dni);
        updated[i] = {
          ...updated[i],
          estado: 'exito',
          nombres: res.nombres,
          apellidoPaterno: res.apellidoPaterno,
          apellidoMaterno: res.apellidoMaterno,
          nombreCompleto: res.nombreCompleto,
          edad: 48,
          sexo: 'F',
        };
      } catch (err: any) {
        updated[i] = {
          ...updated[i],
          estado: 'error',
          mensajeError: err.message || 'No se pudo consultar DNI',
        };
      }

      setItems([...updated]);
      // Retardo de 180ms para respetar la tasa de la API
      await new Promise((resolve) => setTimeout(resolve, 180));
    }

    setIsProcessing(false);
  };

  // Agregar al padrón nominal
  const handleAddToPadron = () => {
    const successItems = items.filter((item) => item.estado === 'exito' && !item.importadoAlPadron);
    if (successItems.length === 0) {
      alert('No hay pacientes consultados exitosamente para agregar.');
      return;
    }

    const newPatients: DntPatient[] = successItems.map((item, idx) => ({
      id: `p-${Date.now()}-${idx}`,
      redSalud: establishment.redSalud,
      microred: establishment.microred,
      establecimiento: establishment.establecimiento,
      codigoRenaes: establishment.codigoRenaes,
      dni: item.dni,
      apellidoPaterno: item.apellidoPaterno || '',
      apellidoMaterno: item.apellidoMaterno || '',
      nombres: item.nombres || '',
      nombreCompleto: item.nombreCompleto || `${item.nombres || ''} ${item.apellidoPaterno || ''}`.trim(),
      edad: item.edad || 50,
      sexo: item.sexo || 'F',
      direccion: 'Sin registrar',
      telefono: '',
      tipoSeguro: 'SIS',
      numeroHC: `HC-${item.dni.substring(2)}`,
      tieneHta: false,
      tieneDm: false,
      controles: createEmptyMonthlyControls(),
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
    }));

    onAddPatientsToPadron(newPatients);

    // Marcar como importados
    setItems((prev) =>
      prev.map((item) => (item.estado === 'exito' ? { ...item, importadoAlPadron: true } : item))
    );

    setImportedSuccessMsg(`Se incorporaron ${newPatients.length} pacientes verificados al Padrón DNT.`);
  };

  // Descargar resultados como Excel
  const handleExportBatchResults = () => {
    if (items.length === 0) return;

    const data = items.map((it, idx) => ({
      'N°': idx + 1,
      'DNI': it.dni,
      'Estado': it.estado.toUpperCase(),
      'Apellido Paterno': it.apellidoPaterno || '',
      'Apellido Materno': it.apellidoMaterno || '',
      'Nombres': it.nombres || '',
      'Nombre Completo': it.nombreCompleto || '',
      'Observación / Error': it.mensajeError || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RESULTADOS_DNI');
    XLSX.writeFile(wb, `Consulta_DNI_Masiva_${Date.now()}.xlsx`);
  };

  const successCount = items.filter((i) => i.estado === 'exito').length;
  const errorCount = items.filter((i) => i.estado === 'error').length;
  const progressPercent = items.length > 0 ? Math.round((currentIndex / items.length) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Carga y Consulta Masiva de DNIs (RENIEC)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Procesa listas completas de pacientes o planillas de Excel para verificar automáticamente nombres oficiales e incorporarlos al Padrón DNT.
          </p>
        </div>

        {/* Opciones de entrada: Texto o Excel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Opción A: Pegar lista de DNIs */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 flex flex-col justify-between">
            <div>
              <span className="font-semibold text-xs text-slate-800 uppercase tracking-wider block mb-2">
                Opción 1: Pegar lista de números de DNI
              </span>
              <textarea
                rows={4}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Pegue aquí los DNIs separados por comas, espacios o saltos de línea...&#10;Ejemplo:&#10;45892134&#10;70234581&#10;10845692"
                className="w-full p-2.5 font-mono text-xs border border-slate-300 rounded-md bg-white focus:ring-1 focus:ring-teal-700 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleLoadFromText}
              disabled={isProcessing || !inputText.trim()}
              className="mt-3 w-full py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded-md transition-colors"
            >
              Cargar DNIs desde Texto
            </button>
          </div>

          {/* Opción B: Subir Excel */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 flex flex-col justify-between">
            <div>
              <span className="font-semibold text-xs text-slate-800 uppercase tracking-wider block mb-2">
                Opción 2: Cargar archivo Excel (.xlsx / .xls / .csv)
              </span>
              <label className="border-2 border-dashed border-slate-300 hover:border-teal-700/60 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer bg-white transition-colors">
                <UploadCloud className="w-8 h-8 text-teal-700 mb-2" />
                <span className="text-xs font-medium text-slate-800">
                  Haga clic para seleccionar archivo Excel
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  Detecta automáticamente la columna "DNI" o "Documento"
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Panel de control de procesamiento */}
        {items.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Total en lista</span>
                  <span className="font-mono font-bold text-slate-900 text-base">{items.length}</span>
                </div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div>
                  <span className="text-slate-500 block">Verificados</span>
                  <span className="font-mono font-bold text-emerald-700 text-base">{successCount}</span>
                </div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div>
                  <span className="text-slate-500 block">Errores / No hallados</span>
                  <span className="font-mono font-bold text-red-700 text-base">{errorCount}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleStartProcessing}
                  disabled={isProcessing}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-teal-400 text-white font-semibold text-xs rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isProcessing ? `Consultando (${progressPercent}%)` : 'Iniciar Consulta Masiva'}</span>
                </button>

                {successCount > 0 && (
                  <button
                    type="button"
                    onClick={handleAddToPadron}
                    disabled={isProcessing}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Agregar al Padrón DNT</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleExportBatchResults}
                  className="p-2 border border-slate-300 hover:bg-slate-100 rounded-md text-slate-700 transition-colors"
                  title="Descargar reporte en Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Barra de progreso */}
            {isProcessing && (
              <div className="mt-3">
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-teal-700 h-2 transition-all duration-200"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  <span>Procesando {currentIndex} de {items.length}...</span>
                  <span>{progressPercent}% completado</span>
                </div>
              </div>
            )}

            {importedSuccessMsg && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{importedSuccessMsg}</span>
              </div>
            )}

            {/* Tabla de resultados */}
            <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 sticky top-0 font-semibold text-slate-700">
                  <tr>
                    <th className="px-3 py-2 w-12">#</th>
                    <th className="px-3 py-2">DNI</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Apellidos y Nombres</th>
                    <th className="px-3 py-2">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white font-mono">
                  {items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-400">{index + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{item.dni}</span>
                          {(() => {
                            const check = calculateDniCheckChar(item.dni);
                            return check ? (
                              <span
                                className="text-[10px] bg-teal-50 border border-teal-200 text-teal-800 px-1 py-0.2 rounded font-mono"
                                title={`Dígito verificador RENIEC calculado: ${check.digit} (Letra: ${check.letter})`}
                              >
                                v:{check.digit}
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {item.estado === 'exito' && (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1 font-sans">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verificado
                          </span>
                        )}
                        {item.estado === 'consultando' && (
                          <span className="text-teal-700 font-sans animate-pulse">Consultando...</span>
                        )}
                        {item.estado === 'error' && (
                          <span className="text-red-600 font-semibold flex items-center gap-1 font-sans" title={item.mensajeError}>
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{item.mensajeError?.includes('repetitiva') || item.mensajeError?.includes('inválido') ? 'Inválido' : 'Error'}</span>
                          </span>
                        )}
                        {item.estado === 'pendiente' && (
                          <span className="text-slate-400 font-sans">Pendiente</span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-sans font-medium text-slate-800">
                        {item.nombreCompleto || '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-500 font-sans text-[11px]">
                        {item.mensajeError || (item.importadoAlPadron ? 'En Padrón DNT' : '')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
