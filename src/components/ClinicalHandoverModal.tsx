import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Heart, 
  Activity, 
  Calendar, 
  Clock, 
  UserCheck, 
  ShieldAlert, 
  Building2, 
  Scale, 
  Loader2,
  Stethoscope,
  Pill,
  ClipboardList,
  AlertCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DntPatient, EstablishmentConfig, ClinicalThresholds, MonthlyControl } from '../types/dnt';
import { MESES_DEL_ANIO, calculateDaysSinceLastControl, getImcNutritionInfo } from '../utils/clinicalCalculations';
import { DEFAULT_CLINICAL_THRESHOLDS } from '../utils/storage';

interface ClinicalHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: DntPatient[];
  establishment: EstablishmentConfig;
  thresholds?: ClinicalThresholds;
  activeFilterDescription?: string;
}

export const ClinicalHandoverModal: React.FC<ClinicalHandoverModalProps> = ({
  isOpen,
  onClose,
  patients,
  establishment,
  thresholds = DEFAULT_CLINICAL_THRESHOLDS,
  activeFilterDescription,
}) => {
  const [shift, setShift] = useState<'manana' | 'tarde' | 'noche' | 'completa'>('manana');
  const [outgoingStaff, setOutgoingStaff] = useState<string>('');
  const [incomingStaff, setIncomingStaff] = useState<string>('');
  const [generalNotes, setGeneralNotes] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Formato de fecha de hoy en Perú
  const todayFormatted = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const timeFormatted = new Date().toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Métricas del grupo de entrega de guardia
  const totalInList = patients.length;
  const htaCount = patients.filter((p) => p.tieneHta).length;
  const dmCount = patients.filter((p) => p.tieneDm).length;
  const bothCount = patients.filter((p) => p.tieneHta && p.tieneDm).length;

  const getPatientLastControl = (patient: DntPatient): {
    control?: MonthlyControl;
    monthName?: string;
    isRecent: boolean;
    daysAgo: number;
    isControlled: boolean;
  } => {
    const attendedControls = Object.values(patient.controles || {})
      .filter((c) => c.atendido)
      .sort((a, b) => b.mes - a.mes);

    const last = attendedControls[0];
    const daysAgo = calculateDaysSinceLastControl(patient);
    const monthName = last ? MESES_DEL_ANIO.find((m) => m.id === last.mes)?.nombre : undefined;

    return {
      control: last,
      monthName,
      isRecent: daysAgo <= (thresholds.diasCaducidadControl || 30),
      daysAgo,
      isControlled: Boolean(last?.controlado),
    };
  };

  const uncontrolledCount = patients.filter((p) => {
    const last = getPatientLastControl(p);
    return last.control && !last.isControlled;
  }).length;

  const overdueCount = patients.filter((p) => {
    const last = getPatientLastControl(p);
    return last.daysAgo > (thresholds.diasCaducidadControl || 30);
  }).length;

  // Generación de PDF multi-página con html2canvas y jsPDF
  const handleDownloadPdf = async () => {
    if (!printableRef.current) return;
    setIsGeneratingPdf(true);

    try {
      const element = printableRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // Ancho A4 en mm
      const pageHeight = 297; // Alto A4 en mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      const safeRenaes = establishment.codigoRenaes || 'MINSA';
      const cleanDate = new Date().toISOString().split('T')[0];
      const fileName = `Entrega_Guardia_DNT_${safeRenaes}_${cleanDate}.pdf`;
      pdf.save(fileName);
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      // Fallback a impresión nativa si falla la captura de canvas
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const shiftLabels: Record<string, string> = {
    manana: 'Mañana (08:00 - 14:00)',
    tarde: 'Tarde (14:00 - 20:00)',
    noche: 'Noche (20:00 - 08:00)',
    completa: 'Jornada Integral / 24h',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      {/* Estilos específicos de impresión A4 para aislar el documento de guardia */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-handover-report, #printable-handover-report * {
            visibility: visible !important;
          }
          #printable-handover-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 10mm !important;
            background: white !important;
            color: black !important;
            font-size: 10pt !important;
          }
          .page-break-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div 
        className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal (No Imprimible) */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between no-print">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-100 text-indigo-800 rounded-md">
                <ClipboardList className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Resumen Clínico Consolidado para Entrega de Guardia (PDF)
              </h3>
              <span className="font-mono text-xs px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded font-bold">
                {totalInList} {totalInList === 1 ? 'paciente' : 'pacientes'} en lista
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Genera un documento unificado con los últimos controles clínicos, alertas y notas médicas para el relevo asistencial.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Abrir cuadro de diálogo de impresión para imprimir o guardar como PDF"
            >
              <Printer className="w-4 h-4 text-indigo-700" />
              <span>Imprimir Documento</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || totalInList === 0}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 disabled:bg-indigo-400 rounded-md transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Descargar documento PDF generado automáticamente"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isGeneratingPdf ? 'Generando PDF...' : 'Descargar PDF'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de configuración de entrega de guardia (No Imprimible) */}
        <div className="px-6 py-3 bg-indigo-50/60 border-b border-indigo-100 text-xs text-indigo-950 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-700" />
              <span className="font-semibold text-slate-700">Turno de Relevo:</span>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as any)}
                className="bg-white border border-indigo-200 rounded px-2 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              >
                <option value="manana">Mañana (08:00 - 14:00)</option>
                <option value="tarde">Tarde (14:00 - 20:00)</option>
                <option value="noche">Noche (20:00 - 08:00)</option>
                <option value="completa">Jornada 24 Horas</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700">Entrega (Saliente):</span>
              <input
                type="text"
                placeholder="Nombre / CMP"
                value={outgoingStaff}
                onChange={(e) => setOutgoingStaff(e.target.value)}
                className="bg-white border border-indigo-200 rounded px-2 py-1 text-xs text-slate-800 w-36 sm:w-44 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700">Recibe (Entrante):</span>
              <input
                type="text"
                placeholder="Nombre / CMP"
                value={incomingStaff}
                onChange={(e) => setIncomingStaff(e.target.value)}
                className="bg-white border border-indigo-200 rounded px-2 py-1 text-xs text-slate-800 w-36 sm:w-44 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>
          </div>

          {activeFilterDescription && (
            <span className="text-[11px] bg-white px-2 py-0.5 rounded border border-indigo-200 text-indigo-900 font-mono">
              Filtro: {activeFilterDescription}
            </span>
          )}
        </div>

        {/* Vista Previa del Documento Imprimible (Aislado para Print y Captura PDF) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100">
          <div 
            id="printable-handover-report" 
            ref={printableRef}
            className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-lg border border-slate-200 shadow-sm space-y-6 text-slate-900 font-sans"
          >
            {/* Encabezado Oficial MINSA */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-teal-800 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                    +
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Ministerio de Salud del Perú · Dirección Regional de Salud
                    </h2>
                    <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                      REPORTE DE ENTREGA DE GUARDIA Y CONTINUIDAD CLÍNICA DNT
                    </h1>
                    <p className="text-xs text-slate-700 font-medium">
                      {establishment.establecimiento} — RENAES: <span className="font-mono font-bold">{establishment.codigoRenaes || 'SIN RENAES'}</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Red: {establishment.redSalud} · Microred: {establishment.microred} · {establishment.distrito}, {establishment.provincia}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono text-xs font-bold bg-slate-100 border border-slate-300 px-2.5 py-1 rounded inline-block">
                    ACTA DE RELEVO #{safeRenaesNum(establishment.codigoRenaes)}-{new Date().getMonth() + 1}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1">
                    <span>Fecha: </span>
                    <strong className="text-slate-800">{todayFormatted}</strong>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    <span>Hora emisión: </span>
                    <strong className="text-slate-800 font-mono">{timeFormatted}</strong>
                  </div>
                  <div className="text-[11px] text-indigo-900 font-semibold mt-0.5">
                    Turno: {shiftLabels[shift]}
                  </div>
                </div>
              </div>

              {/* Panel de profesionales de relevo */}
              <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Profesional Saliente (Entrega):</span>
                  <span className="font-semibold text-slate-800">
                    {outgoingStaff || 'Médico / Licenciado(a) de Turno'}
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Profesional Entrante (Recibe):</span>
                  <span className="font-semibold text-slate-800">
                    {incomingStaff || 'Médico / Licenciado(a) Receptor'}
                  </span>
                </div>
              </div>
            </div>

            {/* Resumen Ejecutivo del Censo de Pacientes a Entregar */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 page-break-avoid">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-teal-700" />
                  <span>Resumen Epidemiológico del Padrón Seleccionado</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  {totalInList} {totalInList === 1 ? 'paciente censado' : 'pacientes censados'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Total Pacientes</span>
                  <span className="font-mono text-base font-bold text-slate-900">{totalInList}</span>
                </div>

                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-red-600 font-semibold block">Con HTA</span>
                  <span className="font-mono text-base font-bold text-red-700">{htaCount}</span>
                </div>

                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-teal-700 font-semibold block">Con DM2</span>
                  <span className="font-mono text-base font-bold text-teal-800">{dmCount}</span>
                </div>

                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-amber-700 font-semibold block">No Controlados</span>
                  <span className="font-mono text-base font-bold text-amber-800">{uncontrolledCount}</span>
                </div>

                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-red-700 font-semibold block">Control Vencido (&gt;30d)</span>
                  <span className="font-mono text-base font-bold text-red-800">{overdueCount}</span>
                </div>
              </div>
            </div>

            {/* Listado Consolidado de Resúmenes Clínicos por Paciente */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-300">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Detalle Clínico de Pacientes para Relevo Asistencial
                </h3>
                <span className="text-[10px] text-slate-500">
                  Ordenado según vista actual de padrón nominal
                </span>
              </div>

              {patients.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-lg">
                  No hay pacientes en la lista filtrada para generar el reporte de entrega de guardia.
                </div>
              ) : (
                patients.map((patient, index) => {
                  const last = getPatientLastControl(patient);
                  const lastCtrl = last.control;
                  const nutrition = getImcNutritionInfo(lastCtrl?.imc ?? patient.imc);
                  const effectivePas = lastCtrl?.paSistolica ?? patient.paSistolicaBasal;
                  const effectivePad = lastCtrl?.paDiastolica ?? patient.paDiastolicaBasal;
                  const effectiveGlu = lastCtrl?.glucosaMgDl ?? patient.glucosaBasal;
                  const effectiveWeight = lastCtrl?.pesoKg ?? patient.pesoKg;
                  const effectiveHeight = lastCtrl?.tallaCm ?? patient.tallaCm;
                  const effectiveImc = lastCtrl?.imc ?? patient.imc;

                  const isBpHigh = effectivePas && effectivePad && (effectivePas > thresholds.paSistolicaControlMax || effectivePad > thresholds.paDiastolicaControlMax);
                  const isGluHigh = effectiveGlu && effectiveGlu > thresholds.glucosaAyunoControlMax;

                  return (
                    <div 
                      key={patient.id || patient.dni} 
                      className="border border-slate-300 rounded-lg p-3.5 bg-white page-break-avoid space-y-2.5 shadow-2xs"
                    >
                      {/* Cabecera del Paciente */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold bg-slate-200 text-slate-800 w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-slate-900">
                                {patient.nombreCompleto}
                              </h4>
                              <span className="font-mono text-xs px-1.5 py-0.2 bg-teal-50 text-teal-800 border border-teal-200 rounded font-semibold">
                                DNI: {patient.dni}
                              </span>
                              <span className="font-mono text-xs text-slate-500">
                                HC: {patient.numeroHC || 'S/N'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>{patient.edad} años ({patient.sexo === 'M' ? 'Masc.' : 'Fem.'})</span>
                              <span>·</span>
                              <span>Seguro: {patient.tipoSeguro}</span>
                              {patient.telefono && (
                                <>
                                  <span>·</span>
                                  <span>Tel: {patient.telefono}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Badges de Diagnóstico Activo */}
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {patient.tieneHta && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                              <Heart className="w-3 h-3 text-red-600" />
                              <span>HTA {patient.estadioHta ? `(${patient.estadioHta})` : ''}</span>
                            </span>
                          )}

                          {patient.tieneDm && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1">
                              <Activity className="w-3 h-3 text-teal-700" />
                              <span>DM2 {patient.tipoDm ? `(${patient.tipoDm})` : ''}</span>
                            </span>
                          )}

                          {!patient.tieneHta && !patient.tieneDm && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              En Tamizaje Preventivo
                            </span>
                          )}

                          {/* Estado de Control del Paciente */}
                          {lastCtrl ? (
                            lastCtrl.controlado ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Controlado
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                No Controlado
                              </span>
                            )
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                              Sin control del año
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Cuadrícula de Signos Vitales y Último Control */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50/70 p-2.5 rounded border border-slate-200">
                        {/* Presión Arterial */}
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-medium">Última Presión Arterial</span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className={`font-mono text-sm font-bold ${
                              isBpHigh ? 'text-red-700' : 'text-slate-900'
                            }`}>
                              {effectivePas && effectivePad ? `${effectivePas}/${effectivePad}` : 'Sin registro'}
                            </span>
                            {effectivePas && <span className="text-[10px] text-slate-500">mmHg</span>}
                          </div>
                          {lastCtrl?.frecuenciaCardiaca && (
                            <span className="text-[10px] text-slate-500 block">
                              FC: {lastCtrl.frecuenciaCardiaca} lpm
                            </span>
                          )}
                        </div>

                        {/* Glucosa en Ayunas */}
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-medium">Última Glucosa</span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className={`font-mono text-sm font-bold ${
                              isGluHigh ? 'text-amber-700' : 'text-slate-900'
                            }`}>
                              {effectiveGlu ? `${effectiveGlu}` : 'Sin registro'}
                            </span>
                            {effectiveGlu && <span className="text-[10px] text-slate-500">mg/dL</span>}
                          </div>
                          {patient.hba1c && (
                            <span className="text-[10px] text-slate-500 block">
                              HbA1c: {patient.hba1c}%
                            </span>
                          )}
                        </div>

                        {/* Antropometría & Estado Nutricional */}
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-medium">Antropometría & IMC</span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="font-mono text-sm font-bold text-slate-900">
                              {effectiveImc ? effectiveImc.toFixed(1) : '--'}
                            </span>
                            <span className="text-[10px] text-slate-500">kg/m²</span>
                          </div>
                          <span className="text-[10px] text-slate-600 block truncate">
                            {effectiveWeight ? `${effectiveWeight}kg` : ''} {effectiveHeight ? `· ${effectiveHeight}cm` : ''} ({nutrition.clasificacion})
                          </span>
                        </div>

                        {/* Estado de Vencimiento de Control */}
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-medium">Última Atención Registrada</span>
                          <span className="font-semibold text-slate-800 block mt-0.5">
                            {lastCtrl?.fecha ? lastCtrl.fecha : (patient.fechaTamizaje || 'Sin fecha')}
                          </span>
                          <span className={`text-[10px] font-bold block ${
                            last.daysAgo > thresholds.diasCaducidadControl
                              ? 'text-red-700'
                              : 'text-emerald-700'
                          }`}>
                            {last.daysAgo === 999 
                              ? 'Sin controles previos' 
                              : last.daysAgo > thresholds.diasCaducidadControl
                              ? `VENCIDO (hace ${last.daysAgo} días)`
                              : `Al día (hace ${last.daysAgo} días)`}
                          </span>
                        </div>
                      </div>

                      {/* Medicación prescrita / entregada */}
                      {(patient.tratamientoHta || patient.tratamientoDm || lastCtrl?.medicacionEntregada) && (
                        <div className="text-xs bg-white p-2 rounded border border-slate-200 flex items-start gap-2">
                          <Pill className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <span className="font-bold text-slate-800 text-[11px]">Tratamiento Farmacológico / Dispensado: </span>
                            <span className="text-slate-700">
                              {[
                                patient.tratamientoHta ? `HTA: ${patient.tratamientoHta}` : null,
                                patient.tratamientoDm ? `DM: ${patient.tratamientoDm}` : null,
                                lastCtrl?.medicacionEntregada ? `Última entrega: ${lastCtrl.medicacionEntregada}` : null,
                              ].filter(Boolean).join(' | ')}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* NOTAS MÉDICAS RÁPIDAS Y CONDICIONES ESPECIALES (CRÍTICO PARA LA GUARDIA) */}
                      {patient.notasMedicas ? (
                        <div className="text-xs bg-amber-50/80 border border-amber-300 rounded p-2 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <span className="font-bold text-amber-950 uppercase tracking-wide text-[10px] block">
                              Alerta Médica / Condiciones Especiales para el Turno:
                            </span>
                            <p className="text-amber-900 font-medium mt-0.5 text-xs">
                              {patient.notasMedicas}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic px-1">
                          Sin notas médicas rápidas registradas para este paciente.
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Espacio para observaciones del turno */}
            <div className="border border-slate-300 rounded-lg p-3 page-break-avoid space-y-1.5">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                Observaciones Generales y Pendientes Críticos para la Guardia:
              </span>
              <div className="min-h-14 border border-dashed border-slate-300 rounded p-2 text-xs text-slate-700">
                {generalNotes || 'Sin incidentes reportados durante el turno. Continuar con monitoreo según programación nominal.'}
              </div>
            </div>

            {/* Acta de Conformidad y Relevo Médico (Firmas Oficiales) */}
            <div className="pt-4 border-t-2 border-slate-900 page-break-avoid">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-8 text-center">
                CONFORMIDAD DE ENTREGA Y RECEPCIÓN DE GUARDIA MÉDICA / ENFERMERÍA DNT
              </h3>

              <div className="grid grid-cols-2 gap-12 text-center text-xs">
                {/* Profesional que entrega */}
                <div>
                  <div className="border-t border-slate-400 pt-2 w-3/4 mx-auto">
                    <span className="font-bold text-slate-900 block">
                      {outgoingStaff || 'PROFESIONAL SALIENTE'}
                    </span>
                    <span className="text-[11px] text-slate-600 block">
                      Médico / Licenciado(a) — Entrega Turno
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Firma, Sello y Colegiatura (CMP/CEP)
                    </span>
                  </div>
                </div>

                {/* Profesional que recibe */}
                <div>
                  <div className="border-t border-slate-400 pt-2 w-3/4 mx-auto">
                    <span className="font-bold text-slate-900 block">
                      {incomingStaff || 'PROFESIONAL RECEPTOR'}
                    </span>
                    <span className="text-[11px] text-slate-600 block">
                      Médico / Licenciado(a) — Recibe Turno
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Firma, Sello y Colegiatura (CMP/CEP)
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center text-[10px] text-slate-400">
                Documento generado por el Sistema de Gestión del Padrón Nominal DNT · {establishment.establecimiento} · {todayFormatted}
              </div>
            </div>
          </div>
        </div>

        {/* Pie del Modal (No Imprimible) */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between no-print">
          <span className="text-xs text-slate-500">
            Documento optimizado para impresión A4 o exportación PDF con salto de página inteligente.
          </span>

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
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Printer className="w-4 h-4 text-indigo-700" />
              <span>Imprimir Fichas</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || totalInList === 0}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 disabled:bg-indigo-400 rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Descargar Documento PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper para código RENAES seguro
function safeRenaesNum(renaes?: string): string {
  if (!renaes) return '0000';
  return renaes.replace(/\D/g, '') || '0000';
}
