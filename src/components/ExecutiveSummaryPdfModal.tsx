import React, { useRef, useState } from 'react';
import { 
  Printer, 
  X, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Loader2, 
  ShieldAlert, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Heart, 
  Users, 
  Award, 
  Building2, 
  FileCheck2,
  Calendar,
  AlertCircle,
  Flame,
  Check
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DntPatient, EstablishmentConfig, ClinicalThresholds } from '../types/dnt';
import { DEFAULT_CLINICAL_THRESHOLDS } from '../utils/storage';
import { MonthlySurveillanceItem } from './GerencialReportView';

export interface ExecutiveSummaryPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: DntPatient[];
  establishment: EstablishmentConfig;
  thresholds?: ClinicalThresholds;
  bpTargetThreshold: '130_80' | '140_90';
  chartDisplayData: MonthlySurveillanceItem[];
  outbreakSummary: {
    hasAnyOutbreak: boolean;
    currentStatus: 'ESTABLE' | 'ALERTA' | 'BROTE';
    outbreakMonthsCount: number;
    highestGrowthMonth: MonthlySurveillanceItem | null;
    lastActiveMonth: MonthlySurveillanceItem | null;
    avgHtaPrevalencia: number;
    avgDmPrevalencia: number;
    totalDescontrolAcumulado: number;
  };
  htaControlRate: number;
  htaTargetRate: number;
  dmControlRate: number;
  dmTargetRate: number;
  selectedHtaControlledCount: number;
  htaEvaluatedCount: number;
  dmControlledGlucoseCount: number;
  dmEvaluatedCount: number;
  dmFootEvalRate: number;
  dmFootTargetRate: number;
  dmFootTotalKnown: number;
  medDeliveryRate: number;
  medTargetRate: number;
  controlsWithMedsCount: number;
  adherenceRate: number;
  adherenceTarget: number;
  overduePatientsCount: number;
  reportDate: string;
}

export const ExecutiveSummaryPdfModal: React.FC<ExecutiveSummaryPdfModalProps> = ({
  isOpen,
  onClose,
  patients,
  establishment,
  thresholds = DEFAULT_CLINICAL_THRESHOLDS,
  bpTargetThreshold,
  chartDisplayData,
  outbreakSummary,
  htaControlRate,
  htaTargetRate,
  dmControlRate,
  dmTargetRate,
  selectedHtaControlledCount,
  htaEvaluatedCount,
  dmControlledGlucoseCount,
  dmEvaluatedCount,
  dmFootEvalRate,
  dmFootTargetRate,
  dmFootTotalKnown,
  medDeliveryRate,
  medTargetRate,
  controlsWithMedsCount,
  adherenceRate,
  adherenceTarget,
  overduePatientsCount,
  reportDate,
}) => {
  if (!isOpen) return null;

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  // Totales demográficos para el resumen
  const totalPatients = patients.length;
  const htaCount = patients.filter((p) => p.tieneHta).length;
  const dmCount = patients.filter((p) => p.tieneDm).length;
  const bothCount = patients.filter((p) => p.tieneHta && p.tieneDm).length;
  const sisCount = patients.filter((p) => p.tipoSeguro === 'SIS').length;

  const htaPct = totalPatients > 0 ? ((htaCount / totalPatients) * 100).toFixed(1) : '0';
  const dmPct = totalPatients > 0 ? ((dmCount / totalPatients) * 100).toFixed(1) : '0';
  const bothPct = totalPatients > 0 ? ((bothCount / totalPatients) * 100).toFixed(1) : '0';
  const sisPct = totalPatients > 0 ? Math.round((sisCount / totalPatients) * 100) : 0;

  // Impresión directa del navegador optimizada
  const handlePrint = () => {
    window.print();
  };

  // Generación y descarga directa del PDF estructurado
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

      const fileName = `Resumen_Ejecutivo_DNT_${establishment.codigoRenaes || 'MINSA'}_${establishment.anio || 2026}.pdf`;
      pdf.save(fileName);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error al generar resumen ejecutivo PDF:', err);
      alert(`Error al generar documento PDF estructurado: ${err?.message || 'Error desconocido'}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      {/* Estilos específicos para impresión estándar A4 */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-executive-summary, #printable-executive-summary * {
            visibility: visible !important;
          }
          #printable-executive-summary {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 8mm !important;
            background: white !important;
            color: black !important;
            font-size: 10pt !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div 
        className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra superior de acciones (no-print) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between no-print shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Resumen Ejecutivo Estructurado (PDF)
                </h3>
                <span className="text-[11px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  RENAES: {establishment.codigoRenaes || '00000000'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Consolidado de metas sanitarias, tarjetas KPI, vigilancia temporal de brotes y gráficos Recharts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              title="Imprimir documento oficial del resumen"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              title="Descargar archivo PDF estructurado del resumen ejecutivo"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generando PDF...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>¡PDF Descargado!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Descargar PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer ml-1"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido scrolleable para previsualización y exportación A4 */}
        <div className="overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          <div 
            id="printable-executive-summary"
            ref={printableRef}
            className="bg-white w-full max-w-[800px] border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5 text-slate-800 rounded-lg print:border-none print:shadow-none print:p-0 print:max-w-none print:w-full"
          >
            {/* Cabecera Oficial Institucional MINSA */}
            <div className="border-b-2 border-emerald-800 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                    MINISTERIO DE SALUD · ESTRATEGIA SANITARIA NACIONAL DE PREVENCIÓN Y CONTROL DE DAÑOS NO TRANSMISIBLES
                  </span>
                  <h2 className="text-lg font-black tracking-tight text-slate-900 leading-tight">
                    RESUMEN EJECUTIVO · GESTIÓN CLÍNICA Y VIGILANCIA EPIDEMIOLÓGICA DNT
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Monitoreo Estratégico de Metas Sanitarias, Indicadores de Calidad y Detección de Brotes · Ejercicio {establishment.anio || 2026}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="inline-block bg-emerald-50 border border-emerald-300 rounded-md px-3 py-1 text-right font-mono">
                    <span className="text-[9px] text-emerald-700 block font-sans font-semibold">CÓDIGO RENAES</span>
                    <span className="text-sm font-bold text-emerald-950">{establishment.codigoRenaes || '00000000'}</span>
                  </div>
                </div>
              </div>

              {/* Ficha técnica del establecimiento emisor */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-2.5 border-t border-slate-100 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Establecimiento:</span>
                  <strong className="text-slate-800 font-semibold">{establishment.establecimiento}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Red / Microred:</span>
                  <span className="text-slate-800">{establishment.redSalud} / {establishment.microred}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Ubicación:</span>
                  <span className="text-slate-800">{establishment.distrito}, {establishment.provincia}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Fecha de Emisión:</span>
                  <span className="text-slate-800 font-mono font-medium">{reportDate}</span>
                </div>
              </div>
            </div>

            {/* 1. Tablero de Metas Sanitarias Principales (Tarjetas de progreso) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-emerald-700" />
                  <span>1. TABLERO DE METAS SANITARIAS INSTITUCIONALES</span>
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">
                  Criterio HTA: &lt; {bpTargetThreshold === '130_80' ? '130/80' : '140/90'} mmHg
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Meta 1 HTA */}
                <div className={`border rounded-lg p-3.5 transition-all ${
                  htaControlRate >= htaTargetRate 
                    ? 'bg-emerald-50/50 border-emerald-200' 
                    : 'bg-amber-50/50 border-amber-200'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Meta 1 · Control Tensional en Hipertensos (HTA)
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 mt-0.5">
                        PA &lt; {bpTargetThreshold === '130_80' ? '130/80' : '140/90'} mmHg
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {selectedHtaControlledCount} de {htaEvaluatedCount} evaluados compensados
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xl font-black font-mono tabular-nums ${
                        htaControlRate >= htaTargetRate ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        {htaControlRate}%
                      </span>
                      <span className="text-[9px] text-slate-500 block">Meta: {htaTargetRate}%</span>
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-2 rounded-full ${htaControlRate >= htaTargetRate ? 'bg-emerald-600' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(100, htaControlRate)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                    <span className="text-slate-600">Estado:</span>
                    <span className={`font-bold inline-flex items-center gap-1 ${
                      htaControlRate >= htaTargetRate ? 'text-emerald-700' : 'text-amber-800'
                    }`}>
                      {htaControlRate >= htaTargetRate ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>META CUMPLIDA</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>EN SEGUIMIENTO</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Meta 2 DM */}
                <div className={`border rounded-lg p-3.5 transition-all ${
                  dmControlRate >= dmTargetRate 
                    ? 'bg-emerald-50/50 border-emerald-200' 
                    : 'bg-amber-50/50 border-amber-200'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Meta 2 · Control Glucémico en Diabetes (DM)
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 mt-0.5">
                        Glucosa en ayunas &le; 130 mg/dL
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {dmControlledGlucoseCount} de {dmEvaluatedCount} evaluados en rango
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xl font-black font-mono tabular-nums ${
                        dmControlRate >= dmTargetRate ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        {dmControlRate}%
                      </span>
                      <span className="text-[9px] text-slate-500 block">Meta: {dmTargetRate}%</span>
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-2 rounded-full ${dmControlRate >= dmTargetRate ? 'bg-emerald-600' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(100, dmControlRate)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                    <span className="text-slate-600">Estado:</span>
                    <span className={`font-bold inline-flex items-center gap-1 ${
                      dmControlRate >= dmTargetRate ? 'text-emerald-700' : 'text-amber-800'
                    }`}>
                      {dmControlRate >= dmTargetRate ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>META CUMPLIDA</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>EN SEGUIMIENTO</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Estado Epidemiológico y Alerta Temprana de Brotes */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                <span>2. ESTADO EPIDEMIOLÓGICO Y DETECCIÓN DE BROTES DE DESCONTROL</span>
              </h3>

              {/* Banner de alerta */}
              <div className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                outbreakSummary.currentStatus === 'BROTE'
                  ? 'bg-red-50/90 border-red-300 text-red-950'
                  : outbreakSummary.currentStatus === 'ALERTA'
                  ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                  : 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
              }`}>
                <div className="flex items-start gap-2.5">
                  <div className={`p-1.5 rounded shrink-0 ${
                    outbreakSummary.currentStatus === 'BROTE'
                      ? 'bg-red-200 text-red-800'
                      : outbreakSummary.currentStatus === 'ALERTA'
                      ? 'bg-amber-200 text-amber-800'
                      : 'bg-emerald-200 text-emerald-800'
                  }`}>
                    {outbreakSummary.currentStatus === 'BROTE' ? (
                      <ShieldAlert className="w-4 h-4" />
                    ) : outbreakSummary.currentStatus === 'ALERTA' ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-[11px] uppercase tracking-wider">
                        {outbreakSummary.currentStatus === 'BROTE'
                          ? 'ALERTA EPIDEMIOLÓGICA: BROTE DE DESCONTROL DETECTADO'
                          : outbreakSummary.currentStatus === 'ALERTA'
                          ? 'ADVERTENCIA PREVENTIVA: TENDENCIA AL ALZA EN DESCOMPENSACIÓN'
                          : 'SITUACIÓN CLÍNICA ESTABLE: BAJO CONTROL TERAPÉUTICO'}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                        outbreakSummary.currentStatus === 'BROTE'
                          ? 'bg-red-600 text-white'
                          : outbreakSummary.currentStatus === 'ALERTA'
                          ? 'bg-amber-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}>
                        {outbreakSummary.currentStatus}
                      </span>
                    </div>
                    <p className="text-[10px] mt-0.5 text-slate-700 leading-tight">
                      {outbreakSummary.currentStatus === 'BROTE'
                        ? `Incremento crítico de descompensación (+${outbreakSummary.highestGrowthMonth?.crecimientoDescontrolPct}% en ${outbreakSummary.highestGrowthMonth?.mesNombre}). Se requiere citar inasistentes y auditar stock farmacológico.`
                        : outbreakSummary.currentStatus === 'ALERTA'
                        ? `Variación intermensual moderada observada (${outbreakSummary.highestGrowthMonth?.mesNombre || 'último mes'}). Seguimiento reforzado de adherencia.`
                        : `Prevalencia HTA (${outbreakSummary.avgHtaPrevalencia}%) y DM2 (${outbreakSummary.avgDmPrevalencia}%) con evolución controlada y sin descompensaciones atípicas.`
                      }
                    </p>
                  </div>
                </div>

                {outbreakSummary.highestGrowthMonth && (
                  <div className="text-right shrink-0 bg-white/80 px-2.5 py-1.5 rounded border border-slate-200 text-[10px] font-mono">
                    <span className="text-[9px] text-slate-500 block font-sans">Variación Máx MoM</span>
                    <span className={`font-black text-xs ${
                      outbreakSummary.highestGrowthMonth.crecimientoDescontrolPct >= 20 ? 'text-red-700' : 'text-slate-800'
                    }`}>
                      {outbreakSummary.highestGrowthMonth.crecimientoDescontrolPct > 0 ? '+' : ''}
                      {outbreakSummary.highestGrowthMonth.crecimientoDescontrolPct}%
                    </span>
                    <span className="text-[9px] text-slate-400 block">{outbreakSummary.highestGrowthMonth.mesNombre}</span>
                  </div>
                )}
              </div>

              {/* 4 Tarjetas KPI de Vigilancia */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-500 block">Prevalencia Media HTA</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base font-bold font-mono text-red-600">{outbreakSummary.avgHtaPrevalencia}%</span>
                    <span className="text-[9px] text-slate-400">del total</span>
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">{htaCount} pacientes HTA</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-500 block">Prevalencia Media DM2</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base font-bold font-mono text-teal-700">{outbreakSummary.avgDmPrevalencia}%</span>
                    <span className="text-[9px] text-slate-400">del total</span>
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">{dmCount} pacientes DM2</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-500 block">Descontrol Acumulado</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base font-bold font-mono text-purple-700">{outbreakSummary.totalDescontrolAcumulado}</span>
                    <span className="text-[9px] text-slate-400">consultas</span>
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">Fuera de meta clínica</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-500 block">Meses Monitoreados</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base font-bold font-mono text-slate-800">{chartDisplayData.length}</span>
                    <span className="text-[9px] text-slate-400">periodos</span>
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    {outbreakSummary.outbreakMonthsCount > 0 ? `${outbreakSummary.outbreakMonthsCount} alerta(s)` : 'Sin brotes activos'}
                  </span>
                </div>
              </div>

              {/* 3. Gráfico Recharts de Líneas para el Resumen Ejecutivo */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Curva Temporal: Prevalencia HTA (%) vs Diabetes (%) y Tasa de Descontrol</span>
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    {establishment.establecimiento} · {establishment.anio || 2026}
                  </span>
                </div>

                <div className="w-full flex justify-center overflow-hidden">
                  <LineChart 
                    width={720} 
                    height={230} 
                    data={chartDisplayData} 
                    margin={{ top: 10, right: 25, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="mesAbrev" 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false} 
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false} 
                      tickFormatter={(val) => `${val}%`} 
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '4px', fontSize: '10px' }} 
                      iconType="circle" 
                    />
                    <Line
                      type="monotone"
                      dataKey="htaPrevalenciaPct"
                      name="Prevalencia HTA (%)"
                      stroke="#dc2626"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#dc2626', strokeWidth: 1, stroke: '#ffffff' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="dmPrevalenciaPct"
                      name="Prevalencia DM2 (%)"
                      stroke="#0d9488"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#0d9488', strokeWidth: 1, stroke: '#ffffff' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="tasaDescontrolPct"
                      name="Tasa Descontrol (%)"
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      dot={{ r: 2.5, fill: '#f59e0b' }}
                    />
                  </LineChart>
                </div>
              </div>
            </div>

            {/* 4. Indicadores de Calidad y Censo Resumido */}
            <div className="space-y-2.5">
              <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>3. INDICADORES DE CALIDAD Y CENSO POBLACIONAL RESUMIDO</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-500 block">Tamizaje de Pie Diabético</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-mono text-base font-bold text-slate-900">{dmFootEvalRate}%</span>
                    <span className="text-[9px] text-slate-400">meta: {dmFootTargetRate}%</span>
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    {dmFootTotalKnown} de {dmCount} pacientes evaluados
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-500 block">Suministro de Fármacos</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-mono text-base font-bold text-slate-900">{medDeliveryRate}%</span>
                    <span className="text-[9px] text-slate-400">meta: {medTargetRate}%</span>
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    {controlsWithMedsCount} controles con tratamiento
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-500 block">Retención y Asistencia Activa</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-mono text-base font-bold text-slate-900">{adherenceRate}%</span>
                    <span className="text-[9px] text-slate-400">meta: {adherenceTarget}%</span>
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    {overduePatientsCount} pacientes en mora &gt; 30 días
                  </span>
                </div>
              </div>

              {/* Censo poblacional compacto */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-[10px] divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-slate-700 font-semibold">
                    <tr>
                      <th className="px-3 py-1.5 text-left">Población en Seguimiento</th>
                      <th className="px-2 py-1.5 text-center">N° Pacientes</th>
                      <th className="px-2 py-1.5 text-center">% Padrón</th>
                      <th className="px-3 py-1.5 text-left">Aseguramiento / Criterio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    <tr>
                      <td className="px-3 py-1 font-semibold text-slate-800">Total Pacientes Registrados</td>
                      <td className="px-2 py-1 text-center font-mono font-bold text-slate-900">{totalPatients}</td>
                      <td className="px-2 py-1 text-center font-mono text-slate-600">100%</td>
                      <td className="px-3 py-1 text-slate-500">{sisPct}% asegurados SIS ({sisCount} usuarios)</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1 text-slate-800">Hipertensión Arterial (HTA)</td>
                      <td className="px-2 py-1 text-center font-mono font-bold text-red-700">{htaCount}</td>
                      <td className="px-2 py-1 text-center font-mono text-slate-600">{htaPct}%</td>
                      <td className="px-3 py-1 text-slate-500">Manejo antihipertensivo continuo</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1 text-slate-800">Diabetes Mellitus Tipo 2 (DM2)</td>
                      <td className="px-2 py-1 text-center font-mono font-bold text-teal-800">{dmCount}</td>
                      <td className="px-2 py-1 text-center font-mono text-slate-600">{dmPct}%</td>
                      <td className="px-3 py-1 text-slate-500">Monitoreo glucémico y estilos de vida</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1 text-slate-800">Comorbilidad HTA + DM2 (Riesgo Alto)</td>
                      <td className="px-2 py-1 text-center font-mono font-bold text-purple-700">{bothCount}</td>
                      <td className="px-2 py-1 text-center font-mono text-slate-600">{bothPct}%</td>
                      <td className="px-3 py-1 text-slate-500">Prioridad máxima en telemonitoreo</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. Conclusiones y Recomendaciones Ejecutivas */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[10px] space-y-1.5">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>4. CONCLUSIONES TÉCNICAS EJECUTIVAS PARA LA DIRECCIÓN / RED DE SALUD</span>
              </h4>
              <ul className="list-disc list-inside space-y-1 text-slate-600 leading-tight">
                <li>
                  <strong>Cumplimiento de Metas:</strong> Control tensional HTA al <strong>{htaControlRate}%</strong> (meta {htaTargetRate}%) y control glucémico DM al <strong>{dmControlRate}%</strong> (meta {dmTargetRate}%).
                </li>
                <li>
                  <strong>Vigilancia Epidemiológica:</strong> {outbreakSummary.hasAnyOutbreak
                    ? `Alerta activa de brote con pico de variación intermensual (+${outbreakSummary.highestGrowthMonth?.crecimientoDescontrolPct}%). Se indica priorizar recaptación de inasistentes.`
                    : `Estabilidad clínica sostenida con prevalencia media HTA de ${outbreakSummary.avgHtaPrevalencia}% y DM2 de ${outbreakSummary.avgDmPrevalencia}%, sin brotes epidémicos agudos.`}
                </li>
                <li>
                  <strong>Garantía de Suministro:</strong> Abastecimiento de medicación documentada al <strong>{medDeliveryRate}%</strong> en atenciones registradas.
                </li>
              </ul>
            </div>

            {/* 6. Refrendación y Firmas Oficiales */}
            <div className="pt-6 border-t border-slate-200 mt-4 grid grid-cols-2 gap-8 text-center text-[10px]">
              <div>
                <div className="border-t border-slate-400 w-40 mx-auto mb-1" />
                <p className="font-bold text-slate-900">Dr(a). Responsable DNT</p>
                <p className="text-[9px] text-slate-500">Estrategia Sanitaria de No Transmisibles</p>
                <p className="text-[8px] text-slate-400 font-mono">CMP / RNE: _______________</p>
              </div>

              <div>
                <div className="border-t border-slate-400 w-40 mx-auto mb-1" />
                <p className="font-bold text-slate-900">Médico Jefe / Dirección</p>
                <p className="text-[9px] text-slate-500">{establishment.establecimiento}</p>
                <p className="text-[8px] text-slate-400 font-mono">RENAES: {establishment.codigoRenaes}</p>
              </div>
            </div>

            {/* Pie de página con folio de seguridad */}
            <div className="text-[9px] text-slate-400 pt-3 border-t border-slate-100 flex items-center justify-between font-mono">
              <span>Sistema MedConsulta DNT · Software de Gestión Clínica MINSA</span>
              <span>RESUMEN EJECUTIVO ESTRUCTURADO · EJERCICIO FISCAL {establishment.anio || 2026}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
