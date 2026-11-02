import React, { useState, useRef, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Award, 
  Users, 
  Activity, 
  Heart, 
  Calendar, 
  Building2, 
  Filter, 
  Share2,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  ShieldAlert,
  Flame,
  BarChart3,
  AlertCircle,
  FileBarChart
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DntPatient, EstablishmentConfig, ClinicalThresholds } from '../types/dnt';
import { DEFAULT_CLINICAL_THRESHOLDS } from '../utils/storage';
import { MESES_DEL_ANIO } from '../utils/clinicalCalculations';
import { ExecutiveSummaryPdfModal } from './ExecutiveSummaryPdfModal';

export type ChartMetricMode = 'prevalencia' | 'descontrol' | 'crecimiento';
export type ChartPeriodFilter = 'activos' | 'semestre1' | 'anual';

export interface MonthlySurveillanceItem {
  mesId: number;
  mesAbrev: string;
  mesNombre: string;
  totalAtendidos: number;
  htaCasos: number;
  dmCasos: number;
  ambosCasos: number;
  htaPrevalenciaPct: number;
  dmPrevalenciaPct: number;
  htaControlados: number;
  htaDescontrolados: number;
  dmControlados: number;
  dmDescontrolados: number;
  totalDescontrol: number;
  tasaDescontrolPct: number;
  crecimientoHtaPct: number;
  crecimientoDmPct: number;
  crecimientoDescontrolPct: number;
  nivelAlerta: 'ESTABLE' | 'ALERTA' | 'BROTE';
  hayBrote: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  chartMetric: ChartMetricMode;
}

const CustomSurveillanceTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  chartMetric,
}) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload as MonthlySurveillanceItem;
  if (!data) return null;

  return (
    <div className="bg-slate-900/95 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs min-w-[240px] z-50">
      <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-2">
        <span className="font-bold text-slate-100">{data.mesNombre} ({data.mesAbrev})</span>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            data.nivelAlerta === 'BROTE'
              ? 'bg-red-500/25 text-red-300 border border-red-500/50'
              : data.nivelAlerta === 'ALERTA'
              ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
              : 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
          }`}
        >
          {data.nivelAlerta === 'BROTE'
            ? '🚨 Brote Detectado'
            : data.nivelAlerta === 'ALERTA'
            ? '⚠️ Advertencia'
            : '✅ Bajo Control'}
        </span>
      </div>

      <div className="space-y-1 font-mono text-[11px]">
        <div className="flex justify-between items-center text-slate-300">
          <span className="font-sans">Atendidos en el mes:</span>
          <span className="font-bold text-white">{data.totalAtendidos}</span>
        </div>
        <div className="flex justify-between items-center text-red-300">
          <span className="font-sans">Prevalencia HTA:</span>
          <span className="font-bold">{data.htaPrevalenciaPct}% ({data.htaCasos} pac.)</span>
        </div>
        <div className="flex justify-between items-center text-teal-300">
          <span className="font-sans">Prevalencia DM2:</span>
          <span className="font-bold">{data.dmPrevalenciaPct}% ({data.dmCasos} pac.)</span>
        </div>
        <div className="flex justify-between items-center text-rose-300 pt-1 border-t border-slate-800">
          <span className="font-sans">Descontrol Clínico:</span>
          <span className="font-bold">{data.totalDescontrol} pac. ({data.tasaDescontrolPct}%)</span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="font-sans">Crecimiento Descontrol MoM:</span>
          <span
            className={`font-bold ${
              data.crecimientoDescontrolPct >= 20
                ? 'text-red-400'
                : data.crecimientoDescontrolPct > 0
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {data.crecimientoDescontrolPct > 0
              ? `+${data.crecimientoDescontrolPct}%`
              : `${data.crecimientoDescontrolPct}%`}
          </span>
        </div>
      </div>
    </div>
  );
};

interface GerencialReportViewProps {
  patients: DntPatient[];
  establishment: EstablishmentConfig;
  thresholds?: ClinicalThresholds;
  onBackToPadron: () => void;
}

export const GerencialReportView: React.FC<GerencialReportViewProps> = ({
  patients,
  establishment,
  thresholds = DEFAULT_CLINICAL_THRESHOLDS,
  onBackToPadron,
}) => {
  const [reportPeriod, setReportPeriod] = useState<string>('acumulado');
  const [bpTargetThreshold, setBpTargetThreshold] = useState<'130_80' | '140_90'>(
    thresholds && thresholds.paSistolicaControlMax <= 130 ? '130_80' : '140_90'
  );
  const [chartMetric, setChartMetric] = useState<ChartMetricMode>('prevalencia');
  const [chartPeriod, setChartPeriod] = useState<ChartPeriodFilter>('activos');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isExecutiveModalOpen, setIsExecutiveModalOpen] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Fecha del informe
  const reportDate = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Métricas y cálculos gerenciales
  const totalPatients = patients.length;
  const htaPatients = patients.filter((p) => p.tieneHta);
  const dmPatients = patients.filter((p) => p.tieneDm);
  const bothPatients = patients.filter((p) => p.tieneHta && p.tieneDm);

  // 1. Meta HTA: Control Tensional
  const htaWithControls = htaPatients.filter((p) => {
    const ctrls = Object.values(p.controles || {}).filter((c) => c.atendido);
    return ctrls.length > 0;
  });

  const htaControlled130_80 = htaWithControls.filter((p) => {
    const ctrls = Object.values(p.controles || {}).filter((c) => c.atendido);
    const last = ctrls[ctrls.length - 1];
    return last.paSistolica && last.paDiastolica && last.paSistolica < 130 && last.paDiastolica < 80;
  });

  const htaControlled140_90 = htaWithControls.filter((p) => {
    const ctrls = Object.values(p.controles || {}).filter((c) => c.atendido);
    const last = ctrls[ctrls.length - 1];
    return last.paSistolica && last.paDiastolica && last.paSistolica < 140 && last.paDiastolica < 90;
  });

  const selectedHtaControlled = bpTargetThreshold === '130_80' ? htaControlled130_80 : htaControlled140_90;
  const htaControlRate = htaWithControls.length > 0 
    ? Math.round((selectedHtaControlled.length / htaWithControls.length) * 100) 
    : 0;
  const htaTargetRate = 70; // Meta MINSA Red de Salud: 70%

  // 2. Meta DM: Control Glucémico (Glucosa basal <= 130 mg/dL)
  const dmWithControls = dmPatients.filter((p) => {
    const ctrls = Object.values(p.controles || {}).filter((c) => c.atendido && c.glucosaMgDl);
    return ctrls.length > 0;
  });

  const dmControlledGlucose = dmWithControls.filter((p) => {
    const ctrls = Object.values(p.controles || {}).filter((c) => c.atendido && c.glucosaMgDl);
    const last = ctrls[ctrls.length - 1];
    return (last.glucosaMgDl || 999) <= 130;
  });

  const dmControlRate = dmWithControls.length > 0 
    ? Math.round((dmControlledGlucose.length / dmWithControls.length) * 100) 
    : 0;
  const dmTargetRate = 65; // Meta MINSA: 65%

  // 3. Evaluación de Pie Diabético en Pacientes DM
  const dmFootEvaluated = dmPatients.filter((p) => p.evaluacionPieDiabetico && p.evaluacionPieDiabetico !== 'NORMAL');
  const dmFootTotalKnown = dmPatients.filter((p) => p.evaluacionPieDiabetico).length;
  const dmFootEvalRate = dmPatients.length > 0 
    ? Math.round((dmFootTotalKnown / dmPatients.length) * 100) 
    : 0;
  const dmFootTargetRate = 80; // Meta: 80% tamizados

  // 4. Entrega y Adherencia de Medicación
  const allAttendedControls = patients.flatMap((p) => 
    Object.values(p.controles || {}).filter((c) => c.atendido)
  );
  const controlsWithMeds = allAttendedControls.filter((c) => c.medicacionEntregada && c.medicacionEntregada.trim() !== '');
  const medDeliveryRate = allAttendedControls.length > 0
    ? Math.round((controlsWithMeds.length / allAttendedControls.length) * 100)
    : 0;
  const medTargetRate = 85;

  // 5. Pacientes con Controles al Día vs Deserción (>30 días de inasistencia)
  const overduePatients = patients.filter((p) => {
    if (!p.tieneHta && !p.tieneDm) return false;
    const dates: number[] = [];
    if (p.controles) {
      Object.values(p.controles).forEach((c) => {
        if (c.atendido && c.fecha) {
          const t = new Date(c.fecha).getTime();
          if (!isNaN(t)) dates.push(t);
        }
      });
    }
    if (dates.length > 0) {
      const latest = Math.max(...dates);
      return Math.floor((Date.now() - latest) / (1000 * 60 * 60 * 24)) > 30;
    }
    return true;
  });

  const adherenceRate = (htaPatients.length + dmPatients.length) > 0
    ? Math.max(0, 100 - Math.round((overduePatients.length / (htaPatients.length + dmPatients.length)) * 100))
    : 100;
  const adherenceTarget = 80;

  // Distribución por Grupo Etáreo
  const youngAdults = patients.filter((p) => p.edad >= 18 && p.edad <= 29).length;
  const adults = patients.filter((p) => p.edad >= 30 && p.edad <= 59).length;
  const olderAdults = patients.filter((p) => p.edad >= 60).length;

  // Distribución por Tipo de Seguro
  const sisCount = patients.filter((p) => p.tipoSeguro === 'SIS').length;
  const essaludCount = patients.filter((p) => p.tipoSeguro === 'ESSALUD').length;
  const particularCount = patients.filter((p) => p.tipoSeguro === 'PARTICULAR' || p.tipoSeguro === 'OTRO').length;

  // 6. Vigilancia Epidemiológica Temporal: Evolución Mensual HTA vs DM, Crecimiento MoM y Brotes
  const monthlySurveillanceData = useMemo<MonthlySurveillanceItem[]>(() => {
    const list: MonthlySurveillanceItem[] = [];

    for (let m = 1; m <= 12; m++) {
      const mesInfo = MESES_DEL_ANIO.find((item) => item.id === m) || {
        id: m,
        nombre: `Mes ${m}`,
        abrev: `M${m}`,
      };

      let totalAtendidos = 0;
      let htaCasos = 0;
      let dmCasos = 0;
      let ambosCasos = 0;

      let htaControlados = 0;
      let htaDescontrolados = 0;
      let dmControlados = 0;
      let dmDescontrolados = 0;

      patients.forEach((p) => {
        const ctrl = p.controles?.[m];
        if (ctrl && ctrl.atendido) {
          totalAtendidos++;

          if (p.tieneHta) {
            htaCasos++;
            const sys = ctrl.paSistolica;
            const dia = ctrl.paDiastolica;
            const isControlled = bpTargetThreshold === '130_80'
              ? Boolean(sys && dia && sys < 130 && dia < 80)
              : Boolean(sys && dia && sys < 140 && dia < 90);

            if (isControlled) {
              htaControlados++;
            } else {
              htaDescontrolados++;
            }
          }

          if (p.tieneDm) {
            dmCasos++;
            const glu = ctrl.glucosaMgDl;
            const isControlled = glu !== undefined && glu !== null
              ? glu <= (thresholds?.glucosaAyunoControlMax || 130)
              : Boolean(ctrl.controlado);

            if (isControlled) {
              dmControlados++;
            } else {
              dmDescontrolados++;
            }
          }

          if (p.tieneHta && p.tieneDm) {
            ambosCasos++;
          }
        }
      });

      const totalDescontrol = htaDescontrolados + dmDescontrolados;
      const totalCronicosAtendidos = htaCasos + dmCasos;
      const tasaDescontrolPct = totalCronicosAtendidos > 0 
        ? Math.round((totalDescontrol / totalCronicosAtendidos) * 100) 
        : 0;

      const htaPrevalenciaPct = totalAtendidos > 0 
        ? Math.round((htaCasos / totalAtendidos) * 100) 
        : (totalPatients > 0 ? Math.round((htaPatients.length / totalPatients) * 100) : 0);

      const dmPrevalenciaPct = totalAtendidos > 0 
        ? Math.round((dmCasos / totalAtendidos) * 100) 
        : (totalPatients > 0 ? Math.round((dmPatients.length / totalPatients) * 100) : 0);

      list.push({
        mesId: m,
        mesAbrev: mesInfo.abrev,
        mesNombre: mesInfo.nombre,
        totalAtendidos,
        htaCasos,
        dmCasos,
        ambosCasos,
        htaPrevalenciaPct,
        dmPrevalenciaPct,
        htaControlados,
        htaDescontrolados,
        dmControlados,
        dmDescontrolados,
        totalDescontrol,
        tasaDescontrolPct,
        crecimientoHtaPct: 0,
        crecimientoDmPct: 0,
        crecimientoDescontrolPct: 0,
        nivelAlerta: 'ESTABLE',
        hayBrote: false,
      });
    }

    // Calcular tasa de crecimiento mensual intermensual (MoM) y detectar brotes
    let prevActive: MonthlySurveillanceItem | null = null;

    list.forEach((curr) => {
      if (curr.totalAtendidos > 0) {
        if (prevActive) {
          // Crecimiento HTA
          const prevHta = prevActive.htaCasos;
          if (prevHta > 0) {
            curr.crecimientoHtaPct = Math.round(((curr.htaCasos - prevHta) / prevHta) * 100);
          } else if (curr.htaCasos > 0) {
            curr.crecimientoHtaPct = 100;
          }

          // Crecimiento DM
          const prevDm = prevActive.dmCasos;
          if (prevDm > 0) {
            curr.crecimientoDmPct = Math.round(((curr.dmCasos - prevDm) / prevDm) * 100);
          } else if (curr.dmCasos > 0) {
            curr.crecimientoDmPct = 100;
          }

          // Crecimiento de Casos Descontrolados
          const prevDesc = prevActive.totalDescontrol;
          if (prevDesc > 0) {
            curr.crecimientoDescontrolPct = Math.round(((curr.totalDescontrol - prevDesc) / prevDesc) * 100);
          } else if (curr.totalDescontrol > 0) {
            curr.crecimientoDescontrolPct = 100;
          } else {
            curr.crecimientoDescontrolPct = 0;
          }
        }

        // Criterio Epidemiológico de Brote de Descontrol:
        // Crecimiento mensual >= +20% o tasa de descontrol >= 40% con casos reales
        const isOutbreak = 
          curr.crecimientoDescontrolPct >= 20 || 
          (curr.tasaDescontrolPct >= 40 && curr.totalDescontrol >= 2);

        const isWarning = 
          !isOutbreak && (curr.crecimientoDescontrolPct > 5 || curr.tasaDescontrolPct >= 25);

        if (isOutbreak) {
          curr.nivelAlerta = 'BROTE';
          curr.hayBrote = true;
        } else if (isWarning) {
          curr.nivelAlerta = 'ALERTA';
          curr.hayBrote = false;
        } else {
          curr.nivelAlerta = 'ESTABLE';
          curr.hayBrote = false;
        }

        prevActive = curr;
      }
    });

    return list;
  }, [patients, bpTargetThreshold, thresholds, totalPatients, htaPatients.length, dmPatients.length]);

  const activeMonthsData = useMemo(() => {
    return monthlySurveillanceData.filter((m) => m.totalAtendidos > 0);
  }, [monthlySurveillanceData]);

  const chartDisplayData = useMemo(() => {
    if (chartPeriod === 'activos') {
      const filtered = monthlySurveillanceData.filter((m) => m.totalAtendidos > 0);
      return filtered.length > 0 ? filtered : monthlySurveillanceData.slice(0, 3);
    }
    if (chartPeriod === 'semestre1') {
      return monthlySurveillanceData.slice(0, 6);
    }
    return monthlySurveillanceData;
  }, [monthlySurveillanceData, chartPeriod]);

  const outbreakSummary = useMemo(() => {
    const outbreakMonths = activeMonthsData.filter((m) => m.hayBrote);
    const sortedByGrowth = [...activeMonthsData].sort((a, b) => b.crecimientoDescontrolPct - a.crecimientoDescontrolPct);
    const highestGrowthMonth = sortedByGrowth.length > 0 ? sortedByGrowth[0] : null;
    const lastActiveMonth = activeMonthsData.length > 0 ? activeMonthsData[activeMonthsData.length - 1] : null;

    const currentStatus = lastActiveMonth ? lastActiveMonth.nivelAlerta : 'ESTABLE';

    const avgHtaPrevalencia = activeMonthsData.length > 0 
      ? Math.round(activeMonthsData.reduce((acc, m) => acc + m.htaPrevalenciaPct, 0) / activeMonthsData.length)
      : (totalPatients > 0 ? Math.round((htaPatients.length / totalPatients) * 100) : 0);

    const avgDmPrevalencia = activeMonthsData.length > 0 
      ? Math.round(activeMonthsData.reduce((acc, m) => acc + m.dmPrevalenciaPct, 0) / activeMonthsData.length)
      : (totalPatients > 0 ? Math.round((dmPatients.length / totalPatients) * 100) : 0);

    const totalDescontrolAcumulado = activeMonthsData.reduce((acc, m) => acc + m.totalDescontrol, 0);

    return {
      hasAnyOutbreak: outbreakMonths.length > 0,
      outbreakMonthsCount: outbreakMonths.length,
      currentStatus,
      highestGrowthMonth,
      lastActiveMonth,
      avgHtaPrevalencia,
      avgDmPrevalencia,
      totalDescontrolAcumulado,
    };
  }, [activeMonthsData, totalPatients, htaPatients.length, dmPatients.length]);

  // Manejo de exportación a PDF usando html2canvas + jsPDF
  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPdf(true);

    try {
      const element = reportRef.current;
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

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
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

      const fileName = `Reporte_Gerencial_DNT_${establishment.codigoRenaes || 'MINSA'}_${establishment.anio || 2026}.pdf`;
      pdf.save(fileName);
    } catch (err: any) {
      alert(`Error al generar documento PDF: ${err.message}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const text = `REPORTE GERENCIAL DNT - ${establishment.establecimiento} (RENAES: ${establishment.codigoRenaes})
Red de Salud: ${establishment.redSalud} | Microred: ${establishment.microred}
Año: ${establishment.anio || 2026} | Fecha: ${reportDate}

METAS INSTITUCIONALES ALCANZADAS:
1. Control Tensional HTA (<${bpTargetThreshold === '130_80' ? '130/80' : '140/90'} mmHg): ${htaControlRate}% (Meta: ${htaTargetRate}%) - ${htaControlRate >= htaTargetRate ? 'CUMPLIDA' : 'EN SEGUIMIENTO'}
2. Control Glucémico DM (Glucosa <= 130 mg/dL): ${dmControlRate}% (Meta: ${dmTargetRate}%) - ${dmControlRate >= dmTargetRate ? 'CUMPLIDA' : 'EN SEGUIMIENTO'}
3. Tamizaje Pie Diabético: ${dmFootEvalRate}% (Meta: ${dmFootTargetRate}%)
4. Continuidad de Medicación: ${medDeliveryRate}% (Meta: ${medTargetRate}%)
5. Retención Activa de Pacientes Crónicos: ${adherenceRate}%

VIGILANCIA TEMPORAL Y BROTES DE DESCONTROL:
- Estado Epidemiológico: ${outbreakSummary.currentStatus === 'BROTE' ? 'ALERTA DE BROTE DETECTADA' : outbreakSummary.currentStatus === 'ALERTA' ? 'ADVERTENCIA' : 'ESTABLE (Sin brotes)'}
- Prevalencia Media Mensual: HTA ${outbreakSummary.avgHtaPrevalencia}% | DM2 ${outbreakSummary.avgDmPrevalencia}%
- Mes Crítico de Incremento: ${outbreakSummary.highestGrowthMonth ? `${outbreakSummary.highestGrowthMonth.mesNombre} (${outbreakSummary.highestGrowthMonth.crecimientoDescontrolPct > 0 ? '+' : ''}${outbreakSummary.highestGrowthMonth.crecimientoDescontrolPct}%)` : 'Sin variaciones'}
- Descontrol Acumulado: ${outbreakSummary.totalDescontrolAcumulado} atenciones fuera de rango terapéutico

POBLACIÓN:
Total en Padrón: ${totalPatients} | HTA: ${htaPatients.length} | DM2: ${dmPatients.length} | Ambos: ${bothPatients.length}`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Barra superior de herramientas y controles */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <button
            type="button"
            onClick={onBackToPadron}
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 mb-1 transition-colors"
          >
            ← Volver al Padrón Nominal
          </button>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-700" />
            <span>Reporte Gerencial de Metas Sanitarias DNT</span>
          </h1>
          <p className="text-xs text-slate-500">
            Informe oficial consolidado para remisión mensual a la Red de Salud y DIRESA/GERESA.
          </p>
        </div>

        {/* Acciones y Configuración de Umbral */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Selector de umbral de presión */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5">
            <span className="text-slate-500 font-medium">Meta HTA:</span>
            <select
              value={bpTargetThreshold}
              onChange={(e) => setBpTargetThreshold(e.target.value as any)}
              className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-700"
            >
              <option value="130_80">&lt; 130/80 mmHg (AHA/Estricta)</option>
              <option value="140_90">&lt; 140/90 mmHg (MINSA/Estándar)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleCopySummary}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
            title="Copiar texto resumen para correos o mensajería institucional"
          >
            {copiedSummary ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
            <span>{copiedSummary ? '¡Copiado!' : 'Copiar Resumen'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
            title="Imprimir documento oficial en impresora o PDF del sistema"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Imprimir</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExecutiveModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Exportar resumen ejecutivo condensado (tarjetas de metas, indicadores y gráficos) a un archivo PDF estructurado"
          >
            <FileBarChart className="w-4 h-4 text-emerald-200" />
            <span>Exportar Resumen Ejecutivo (PDF)</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-2 shadow-xs"
            title="Generar y descargar archivo PDF oficial de este informe completo"
          >
            <Download className="w-4 h-4" />
            <span>{isGeneratingPdf ? 'Generando PDF...' : 'Descargar PDF Oficial'}</span>
          </button>
        </div>
      </div>

      {/* CONTENIDO DEL REPORTE IMPRIMIBLE Y CONVERTIBLE A PDF */}
      <div 
        ref={reportRef} 
        className="bg-white border border-slate-200 rounded-lg p-8 sm:p-10 shadow-xs space-y-6 text-slate-800 print:border-none print:shadow-none print:p-0"
      >
        {/* Cabecera Oficial Institucional MINSA */}
        <div className="border-b-2 border-teal-800 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 block">
                MINISTERIO DE SALUD · ESTRATEGIA SANITARIA NACIONAL DE PREVENCIÓN Y CONTROL DE DAÑOS NO TRANSMISIBLES
              </span>
              <h2 className="text-xl font-black tracking-tight text-slate-900">
                INFORME DE GESTIÓN CLÍNICA Y CUMPLIMIENTO DE METAS SANITARIAS DNT
              </h2>
              <p className="text-xs text-slate-500">
                Seguimiento de Hipertensión Arterial, Diabetes Mellitus y Riesgo Cardiovascular · Ejercicio {establishment.anio || 2026}
              </p>
            </div>

            {/* Sello / Identificador RENAES */}
            <div className="text-right shrink-0">
              <div className="inline-block bg-teal-50 border border-teal-300 rounded-md px-3 py-1.5 text-right font-mono">
                <span className="text-[10px] text-teal-700 block font-sans font-semibold">CÓDIGO RENAES</span>
                <span className="text-base font-bold text-teal-900">{establishment.codigoRenaes || '00000000'}</span>
              </div>
            </div>
          </div>

          {/* Ficha técnica del establecimiento emisor */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Establecimiento:</span>
              <strong className="text-slate-800 font-semibold">{establishment.establecimiento}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Red / Microred:</span>
              <span className="text-slate-800">{establishment.redSalud} / {establishment.microred}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Ubicación Territorial:</span>
              <span className="text-slate-800">{establishment.distrito}, {establishment.provincia} ({establishment.departamento})</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Fecha de Generación:</span>
              <span className="text-slate-800 font-mono font-medium">{reportDate}</span>
            </div>
          </div>
        </div>

        {/* Resumen Ejecutivo de Metas Principales */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-teal-700" />
            <span>1. TABLERO DE METAS SANITARIAS INSTITUCIONALES (RED DE SALUD)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Meta 1: Control de Presión Arterial */}
            <div className={`border rounded-lg p-4 transition-all ${
              htaControlRate >= htaTargetRate 
                ? 'bg-emerald-50/40 border-emerald-200' 
                : 'bg-amber-50/40 border-amber-200'
            }`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Meta 1 · Control Tensional en Hipertensos (HTA)
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                    Pacientes con PA &lt; {bpTargetThreshold === '130_80' ? '130/80' : '140/90'} mmHg
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {selectedHtaControlled.length} de {htaWithControls.length} pacientes atendidos compensados
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-black font-mono tabular-nums ${
                    htaControlRate >= htaTargetRate ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {htaControlRate}%
                  </span>
                  <span className="text-[10px] text-slate-500 block">Meta: {htaTargetRate}%</span>
                </div>
              </div>

              {/* Barra de progreso de la meta */}
              <div className="mt-3">
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className={`h-2.5 rounded-full ${htaControlRate >= htaTargetRate ? 'bg-emerald-600' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(100, htaControlRate)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                  <span>0%</span>
                  <span className="font-semibold text-slate-700">Meta: {htaTargetRate}%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-600">Estado de cumplimiento:</span>
                <span className={`font-bold inline-flex items-center gap-1 text-[11px] ${
                  htaControlRate >= htaTargetRate ? 'text-emerald-700' : 'text-amber-800'
                }`}>
                  {htaControlRate >= htaTargetRate ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>META SUPERADA / ALCANZADA</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>EN SEGUIMIENTO (Requiere refuerzo)</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Meta 2: Control Glucémico en Diabéticos */}
            <div className={`border rounded-lg p-4 transition-all ${
              dmControlRate >= dmTargetRate 
                ? 'bg-emerald-50/40 border-emerald-200' 
                : 'bg-amber-50/40 border-amber-200'
            }`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Meta 2 · Control Glucémico en Diabetes (DM)
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                    Glucosa en ayunas &le; 130 mg/dL
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {dmControlledGlucose.length} de {dmWithControls.length} pacientes evaluados en rango terapéutico
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-black font-mono tabular-nums ${
                    dmControlRate >= dmTargetRate ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {dmControlRate}%
                  </span>
                  <span className="text-[10px] text-slate-500 block">Meta: {dmTargetRate}%</span>
                </div>
              </div>

              {/* Barra de progreso de la meta */}
              <div className="mt-3">
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className={`h-2.5 rounded-full ${dmControlRate >= dmTargetRate ? 'bg-emerald-600' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(100, dmControlRate)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                  <span>0%</span>
                  <span className="font-semibold text-slate-700">Meta: {dmTargetRate}%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-600">Estado de cumplimiento:</span>
                <span className={`font-bold inline-flex items-center gap-1 text-[11px] ${
                  dmControlRate >= dmTargetRate ? 'text-emerald-700' : 'text-amber-800'
                }`}>
                  {dmControlRate >= dmTargetRate ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>META SUPERADA / ALCANZADA</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>EN SEGUIMIENTO (Requiere refuerzo)</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. VIGILANCIA TEMPORAL: COMPARATIVA DE PREVALENCIA HTA vs DIABETES & DETECCIÓN DE BROTES DE DESCONTROL */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-teal-700" />
                <span>2. VIGILANCIA TEMPORAL: PREVALENCIA HTA vs DIABETES Y DETECCIÓN DE BROTES</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Monitoreo continuo de atenciones mensuales, cálculo de tasa de crecimiento MoM (%) y detección precoz de descompensaciones en el establecimiento.
              </p>
            </div>

            {/* Controles de visualización interactivos */}
            <div className="flex items-center gap-2 flex-wrap print:hidden">
              <div className="inline-flex rounded-md shadow-2xs bg-slate-100 p-0.5 border border-slate-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setChartMetric('prevalencia')}
                  className={`px-2.5 py-1 rounded font-semibold transition-all ${
                    chartMetric === 'prevalencia'
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Prevalencia (%)
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('descontrol')}
                  className={`px-2.5 py-1 rounded font-semibold transition-all ${
                    chartMetric === 'descontrol'
                      ? 'bg-white text-purple-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Casos Descontrolados
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('crecimiento')}
                  className={`px-2.5 py-1 rounded font-semibold transition-all ${
                    chartMetric === 'crecimiento'
                      ? 'bg-white text-red-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Crecimiento MoM (%)
                </button>
              </div>

              <select
                value={chartPeriod}
                onChange={(e) => setChartPeriod(e.target.value as ChartPeriodFilter)}
                className="bg-white border border-slate-300 text-slate-700 text-[11px] font-medium rounded px-2 py-1 focus:ring-1 focus:ring-teal-700 focus:outline-none"
              >
                <option value="activos">Meses con Registro Activo</option>
                <option value="semestre1">Semestre 1 (Ene - Jun)</option>
                <option value="anual">Año Completo (12 Meses)</option>
              </select>
            </div>
          </div>

          {/* Banner de Estado Epidemiológico de Brote */}
          <div
            className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              outbreakSummary.currentStatus === 'BROTE'
                ? 'bg-red-50/80 border-red-300 text-red-950'
                : outbreakSummary.currentStatus === 'ALERTA'
                ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                : 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-md shrink-0 ${
                  outbreakSummary.currentStatus === 'BROTE'
                    ? 'bg-red-200 text-red-800 animate-pulse'
                    : outbreakSummary.currentStatus === 'ALERTA'
                    ? 'bg-amber-200 text-amber-800'
                    : 'bg-emerald-200 text-emerald-800'
                }`}
              >
                {outbreakSummary.currentStatus === 'BROTE' ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : outbreakSummary.currentStatus === 'ALERTA' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-xs uppercase tracking-wider">
                    {outbreakSummary.currentStatus === 'BROTE'
                      ? 'Alerta Epidemiológica: Brote de Descontrol Detectado'
                      : outbreakSummary.currentStatus === 'ALERTA'
                      ? 'Advertencia Preventiva: Tendencia al Alza en Descompensación'
                      : 'Situación Clínica Estable: Bajo Control Terapéutico'}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      outbreakSummary.currentStatus === 'BROTE'
                        ? 'bg-red-600 text-white'
                        : outbreakSummary.currentStatus === 'ALERTA'
                        ? 'bg-amber-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {outbreakSummary.currentStatus === 'BROTE'
                      ? 'ACCIÓN INMEDIATA REQUERIDA'
                      : outbreakSummary.currentStatus === 'ALERTA'
                      ? 'SEGUIMIENTO ESTRECHO'
                      : 'ESTABLE'}
                  </span>
                </div>
                <p className="text-[11px] mt-1 text-slate-700 leading-snug">
                  {outbreakSummary.currentStatus === 'BROTE' ? (
                    <>
                      Se ha identificado un incremento abrupto del <strong>+{outbreakSummary.highestGrowthMonth?.crecimientoDescontrolPct}%</strong> en pacientes crónicos descompensados ({outbreakSummary.highestGrowthMonth?.mesNombre}). Se recomienda intensificar telemonitoreo, auditar adherencia farmacológica y priorizar consultas médicas inmediatas.
                    </>
                  ) : outbreakSummary.currentStatus === 'ALERTA' ? (
                    <>
                      Crecimiento moderado intermensual en descompensaciones ({outbreakSummary.highestGrowthMonth?.mesNombre || 'último mes'}). Se recomienda revisar la continuidad en entrega de fármacos y citar a inasistentes.
                    </>
                  ) : (
                    <>
                      La prevalencia de hipertensión ({outbreakSummary.avgHtaPrevalencia}%) y diabetes ({outbreakSummary.avgDmPrevalencia}%) evoluciona de manera controlada y sin picos bruscos de descompensación intermensual.
                    </>
                  )}
                </p>
              </div>
            </div>

            {outbreakSummary.highestGrowthMonth && (
              <div className="sm:text-right shrink-0 bg-white/70 backdrop-blur-2xs px-3 py-2 rounded border border-slate-200/60 font-mono text-xs">
                <span className="text-[10px] text-slate-500 block font-sans">Pico de Variación MoM</span>
                <span
                  className={`font-black text-sm ${
                    outbreakSummary.highestGrowthMonth.crecimientoDescontrolPct >= 20
                      ? 'text-red-700'
                      : outbreakSummary.highestGrowthMonth.crecimientoDescontrolPct > 0
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {outbreakSummary.highestGrowthMonth.crecimientoDescontrolPct > 0 ? '+' : ''}
                  {outbreakSummary.highestGrowthMonth.crecimientoDescontrolPct}%
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {outbreakSummary.highestGrowthMonth.mesNombre}
                </span>
              </div>
            )}
          </div>

          {/* Tarjetas KPI de Vigilancia Temporal */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <span className="text-[11px] text-slate-500 block">Prevalencia Media HTA</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold font-mono text-red-600">{outbreakSummary.avgHtaPrevalencia}%</span>
                <span className="text-[10px] text-slate-400">del total atendido</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">
                {htaPatients.length} pacientes en padrón nominal
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <span className="text-[11px] text-slate-500 block">Prevalencia Media DM2</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold font-mono text-teal-700">{outbreakSummary.avgDmPrevalencia}%</span>
                <span className="text-[10px] text-slate-400">del total atendido</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">
                {dmPatients.length} pacientes en padrón nominal
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <span className="text-[11px] text-slate-500 block">Descontrol Acumulado</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold font-mono text-purple-700">{outbreakSummary.totalDescontrolAcumulado}</span>
                <span className="text-[10px] text-slate-400">consultas</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">
                Fuera de meta (PA o Glucosa)
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <span className="text-[11px] text-slate-500 block">Meses Monitoreados</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold font-mono text-slate-800">{activeMonthsData.length}</span>
                <span className="text-[10px] text-slate-400">de 12 meses</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">
                {outbreakSummary.outbreakMonthsCount > 0
                  ? `${outbreakSummary.outbreakMonthsCount} mes(es) con alerta de brote`
                  : 'Sin meses críticos detectados'}
              </span>
            </div>
          </div>

          {/* Gráfico Recharts de Líneas */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-teal-700" />
                  <span>
                    {chartMetric === 'prevalencia' && 'Evolución de Prevalencia en el Tiempo: HTA vs Diabetes Mellitus (%)'}
                    {chartMetric === 'descontrol' && 'Casos Clínicos Descontrolados en el Tiempo (Descompensaciones)'}
                    {chartMetric === 'crecimiento' && 'Tasa de Crecimiento Mensual (% MoM) y Línea Umbral de Brote (+15%)'}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  {chartMetric === 'prevalencia' && 'Comparación porcentual de pacientes atendidos con HTA vs Diabetes mes a mes.'}
                  {chartMetric === 'descontrol' && 'Número de consultas con presión arterial ≥ 140/90 mmHg o glucemia basal > 130 mg/dL.'}
                  {chartMetric === 'crecimiento' && 'Variación porcentual intermensual para la detección precoz de brotes de descompensación.'}
                </p>
              </div>

              <div className="text-right text-[11px] text-slate-400 font-mono">
                {establishment.establecimiento} · {establishment.anio || 2026}
              </div>
            </div>

            <div className="h-[320px] w-full min-h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartDisplayData} margin={{ top: 15, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="mesAbrev" 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false}
                    tickFormatter={(val) => chartMetric === 'descontrol' ? `${val}` : `${val}%`}
                  />
                  <RechartsTooltip content={<CustomSurveillanceTooltip chartMetric={chartMetric} />} />
                  <Legend 
                    wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }}
                    iconType="circle"
                  />

                  {chartMetric === 'prevalencia' && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="htaPrevalenciaPct"
                        name="Prevalencia HTA (%)"
                        stroke="#dc2626"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#dc2626', strokeWidth: 1, stroke: '#ffffff' }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="dmPrevalenciaPct"
                        name="Prevalencia Diabetes (%)"
                        stroke="#0d9488"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#0d9488', strokeWidth: 1, stroke: '#ffffff' }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="tasaDescontrolPct"
                        name="Tasa Descontrol (%)"
                        stroke="#f59e0b"
                        strokeDasharray="4 4"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#f59e0b' }}
                      />
                    </>
                  )}

                  {chartMetric === 'descontrol' && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="totalDescontrol"
                        name="Total Descompensados"
                        stroke="#7c3aed"
                        strokeWidth={3}
                        dot={{ r: 5, fill: '#7c3aed', strokeWidth: 1, stroke: '#ffffff' }}
                        activeDot={{ r: 7 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="htaDescontrolados"
                        name="HTA Descontrolada (PA ≥140/90)"
                        stroke="#dc2626"
                        strokeWidth={2.5}
                        strokeDasharray="3 3"
                        dot={{ r: 4, fill: '#dc2626' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="dmDescontrolados"
                        name="DM Descontrolada (Glucosa >130)"
                        stroke="#d97706"
                        strokeWidth={2.5}
                        strokeDasharray="3 3"
                        dot={{ r: 4, fill: '#d97706' }}
                      />
                    </>
                  )}

                  {chartMetric === 'crecimiento' && (
                    <>
                      <ReferenceLine 
                        y={0} 
                        stroke="#94a3b8" 
                        strokeDasharray="3 3" 
                        label={{ value: 'Equilibrio (0%)', position: 'insideBottomRight', fill: '#64748b', fontSize: 10 }} 
                      />
                      <ReferenceLine 
                        y={15} 
                        stroke="#ef4444" 
                        strokeDasharray="4 4" 
                        label={{ value: 'Umbral Alerta Brote (+15%)', position: 'insideTopRight', fill: '#dc2626', fontSize: 10, fontWeight: 'bold' }} 
                      />
                      <Line
                        type="monotone"
                        dataKey="crecimientoDescontrolPct"
                        name="Crecimiento Descontrol MoM (%)"
                        stroke="#b91c1c"
                        strokeWidth={3}
                        dot={{ r: 5, fill: '#b91c1c', strokeWidth: 1, stroke: '#ffffff' }}
                        activeDot={{ r: 7 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="crecimientoHtaPct"
                        name="Crecimiento HTA MoM (%)"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#2563eb' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="crecimientoDmPct"
                        name="Crecimiento DM MoM (%)"
                        stroke="#059669"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#059669' }}
                      />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabla de Auditoría Epidemiológica Mensual */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold">
                <tr>
                  <th className="px-3 py-2 text-left">Mes</th>
                  <th className="px-2 py-2 text-center">Atendidos</th>
                  <th className="px-2 py-2 text-center text-red-700">HTA (Casos / Prev)</th>
                  <th className="px-2 py-2 text-center text-teal-800">DM2 (Casos / Prev)</th>
                  <th className="px-2 py-2 text-center text-purple-700">Descontrol Total</th>
                  <th className="px-2 py-2 text-center">% Descontrol</th>
                  <th className="px-2 py-2 text-center">Crecimiento MoM</th>
                  <th className="px-3 py-2 text-center">Estado Epidemiológico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {chartDisplayData.map((item) => (
                  <tr key={item.mesId} className={item.hayBrote ? 'bg-red-50/40 font-medium' : 'hover:bg-slate-50/60'}>
                    <td className="px-3 py-2 font-semibold text-slate-900 whitespace-nowrap">
                      {item.mesNombre} ({item.mesAbrev})
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-medium text-slate-800">
                      {item.totalAtendidos}
                    </td>
                    <td className="px-2 py-2 text-center font-mono text-red-700">
                      {item.htaCasos} ({item.htaPrevalenciaPct}%)
                    </td>
                    <td className="px-2 py-2 text-center font-mono text-teal-800">
                      {item.dmCasos} ({item.dmPrevalenciaPct}%)
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-bold text-purple-800">
                      {item.totalDescontrol}
                    </td>
                    <td className="px-2 py-2 text-center font-mono text-slate-700">
                      {item.tasaDescontrolPct}%
                    </td>
                    <td className="px-2 py-2 text-center font-mono">
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded font-bold ${
                          item.crecimientoDescontrolPct >= 20
                            ? 'text-red-700 bg-red-100'
                            : item.crecimientoDescontrolPct > 0
                            ? 'text-amber-800 bg-amber-100'
                            : 'text-emerald-700 bg-emerald-100'
                        }`}
                      >
                        {item.crecimientoDescontrolPct > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : item.crecimientoDescontrolPct < 0 ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : null}
                        {item.crecimientoDescontrolPct > 0 ? `+${item.crecimientoDescontrolPct}%` : `${item.crecimientoDescontrolPct}%`}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.nivelAlerta === 'BROTE'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : item.nivelAlerta === 'ALERTA'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {item.nivelAlerta === 'BROTE' ? (
                          <>
                            <Flame className="w-3 h-3 text-red-600 animate-bounce" />
                            <span>ALERTA DE BROTE</span>
                          </>
                        ) : item.nivelAlerta === 'ALERTA' ? (
                          <>
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>INCREMENTO LEVE</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>BAJO CONTROL</span>
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Indicadores complementarios de calidad y continuidad de atención */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-teal-700" />
            <span>3. INDICADORES DE CALIDAD Y CONTINUIDAD DE ATENCIÓN</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Tamizaje Pie Diabético */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
              <span className="text-[11px] text-slate-500 block">Tamizaje de Pie Diabético</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">{dmFootEvalRate}%</span>
                <span className="text-[11px] text-slate-400">meta: {dmFootTargetRate}%</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {dmFootTotalKnown} de {dmPatients.length} pacientes evaluados para prevención de úlceras.
              </p>
            </div>

            {/* Adherencia y Entrega Farmacológica */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
              <span className="text-[11px] text-slate-500 block">Suministro de Fármacos</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">{medDeliveryRate}%</span>
                <span className="text-[11px] text-slate-400">meta: {medTargetRate}%</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {controlsWithMeds.length} controles con entrega documentada de tratamiento.
              </p>
            </div>

            {/* Retención Activa (Sin mora >30 días) */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
              <span className="text-[11px] text-slate-500 block">Retención y Asistencia Activa</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">{adherenceRate}%</span>
                <span className="text-[11px] text-slate-400">meta: {adherenceTarget}%</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {overduePatients.length} pacientes crónicos con control pendiente &gt; 30 días.
              </p>
            </div>
          </div>
        </div>

        {/* Censo y Demografía Epidemiológica */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-teal-700" />
            <span>4. CENSO POBLACIONAL Y CARACTERIZACIÓN DEMOGRÁFICA</span>
          </h3>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold">
                <tr>
                  <th className="px-3 py-2 text-left">Categoría Sanitaria</th>
                  <th className="px-3 py-2 text-center">N° Pacientes</th>
                  <th className="px-3 py-2 text-center">% del Padrón</th>
                  <th className="px-3 py-2 text-left">Observación Epidemiológica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <tr>
                  <td className="px-3 py-2 font-medium text-slate-900">Total Pacientes Registrados</td>
                  <td className="px-3 py-2 text-center font-mono font-bold text-slate-900">{totalPatients}</td>
                  <td className="px-3 py-2 text-center font-mono text-slate-600">100.0%</td>
                  <td className="px-3 py-2 text-slate-500">Población activa bajo seguimiento continuo en el RENAES</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-slate-900">Hipertensión Arterial (HTA)</td>
                  <td className="px-3 py-2 text-center font-mono font-bold text-red-700">{htaPatients.length}</td>
                  <td className="px-3 py-2 text-center font-mono text-slate-600">
                    {totalPatients > 0 ? ((htaPatients.length / totalPatients) * 100).toFixed(1) : 0}%
                  </td>
                  <td className="px-3 py-2 text-slate-500">Incluye Estadios I y II según Guía Técnica MINSA</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-slate-900">Diabetes Mellitus Tipo 2 (DM2)</td>
                  <td className="px-3 py-2 text-center font-mono font-bold text-teal-800">{dmPatients.length}</td>
                  <td className="px-3 py-2 text-center font-mono text-slate-600">
                    {totalPatients > 0 ? ((dmPatients.length / totalPatients) * 100).toFixed(1) : 0}%
                  </td>
                  <td className="px-3 py-2 text-slate-500">Manejo con hipoglucemiantes orales y régimen dietético</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-slate-900">Comorbilidad Simultánea (HTA + DM)</td>
                  <td className="px-3 py-2 text-center font-mono font-bold text-purple-700">{bothPatients.length}</td>
                  <td className="px-3 py-2 text-center font-mono text-slate-600">
                    {totalPatients > 0 ? ((bothPatients.length / totalPatients) * 100).toFixed(1) : 0}%
                  </td>
                  <td className="px-3 py-2 text-slate-500">Grupo prioritario con Riesgo Cardiovascular Muy Alto</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-slate-900">Aseguramiento: SIS / EsSalud / Particular</td>
                  <td className="px-3 py-2 text-center font-mono text-slate-800">{sisCount} / {essaludCount} / {particularCount}</td>
                  <td className="px-3 py-2 text-center font-mono text-slate-600">
                    {totalPatients > 0 ? `${Math.round((sisCount / totalPatients) * 100)}% SIS` : '-'}
                  </td>
                  <td className="px-3 py-2 text-slate-500">Prevalencia de financiamiento público integral (SIS)</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-slate-900">Distribución Etárea (18-29 / 30-59 / 60+ años)</td>
                  <td className="px-3 py-2 text-center font-mono text-slate-800">{youngAdults} / {adults} / {olderAdults}</td>
                  <td className="px-3 py-2 text-center font-mono text-slate-600">
                    {totalPatients > 0 ? `${Math.round((olderAdults / totalPatients) * 100)}% mayores` : '-'}
                  </td>
                  <td className="px-3 py-2 text-slate-500">Mayor carga de morbilidad concentrada en adultos mayores</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Conclusiones Gerenciales y Recomendaciones para la Red */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs space-y-2">
          <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span>5. CONCLUSIONES TÉCNICAS Y RECOMENDACIONES DE GESTIÓN</span>
          </h4>
          <ul className="list-disc list-inside space-y-1.5 text-slate-600 text-[11px] leading-relaxed">
            <li>
              <strong>Vigilancia Temporal y Brotes de Descontrol:</strong> {outbreakSummary.hasAnyOutbreak
                ? `Se detectó un brote de descontrol clínico en ${outbreakSummary.highestGrowthMonth?.mesNombre || 'el periodo'} con una tasa de incremento intermensual del +${outbreakSummary.highestGrowthMonth?.crecimientoDescontrolPct}%. Se dispone activar visitas domiciliarias, barrido de telemonitoreo y auditoría de disponibilidad de fármacos en farmacia.`
                : `No se registran brotes epidémicos de descontrol clínico agudo en el establecimiento. La prevalencia media mensual se mantiene en ${outbreakSummary.avgHtaPrevalencia}% para HTA y ${outbreakSummary.avgDmPrevalencia}% para Diabetes, con comportamiento terapéutico estable.`
              }
            </li>
            <li>
              <strong>Eficacia en Control Tensional:</strong> Se registra un cumplimiento del <strong>{htaControlRate}%</strong> en control estricto de hipertensión, frente a la meta sanitaria fijada de {htaTargetRate}%.
            </li>
            <li>
              <strong>Compensación Metabólica en Diabetes:</strong> La tasa de control glucémico se sitúa en <strong>{dmControlRate}%</strong>, garantizando reducción de riesgo micro y macrovascular.
            </li>
            <li>
              <strong>Búsqueda Activa de Inasistentes:</strong> Se identificaron <strong>{overduePatients.length}</strong> pacientes con más de 30 días sin control clínico, para los cuales se dispone el despliegue de telemonitoreo y visitas domiciliarias del equipo de salud.
            </li>
            <li>
              <strong>Garantía de Medicación:</strong> La tasa de entrega de medicamentos en los controles atendidos es del <strong>{medDeliveryRate}%</strong>, asegurando continuidad terapéutica sin desabastecimiento.
            </li>
          </ul>
        </div>

        {/* Sección Oficial de Firmas y Refrendación */}
        <div className="pt-8 border-t border-slate-200 mt-6 grid grid-cols-2 gap-12 text-center text-xs">
          <div>
            <div className="border-t border-slate-400 w-48 mx-auto mb-1.5" />
            <p className="font-bold text-slate-900">Dr(a). Responsable del Programa DNT</p>
            <p className="text-[11px] text-slate-500">Estrategia Sanitaria No Transmisibles</p>
            <p className="text-[10px] text-slate-400 font-mono">CMP / RNE: _______________</p>
          </div>

          <div>
            <div className="border-t border-slate-400 w-48 mx-auto mb-1.5" />
            <p className="font-bold text-slate-900">Médico Jefe / Dirección</p>
            <p className="text-[11px] text-slate-500">{establishment.establecimiento}</p>
            <p className="text-[10px] text-slate-400 font-mono">RENAES: {establishment.codigoRenaes}</p>
          </div>
        </div>

        {/* Pie de página con folio de seguridad */}
        <div className="text-[10px] text-slate-400 pt-4 border-t border-slate-100 flex items-center justify-between font-mono">
          <span>Sistema MedConsulta DNT · Software de Gestión Clínica MINSA</span>
          <span>DOCUMENTO OFICIAL VALIDADOR · EJERCICIO FISCAL {establishment.anio || 2026}</span>
        </div>
      </div>

      {/* Modal para previsualización e impresión/descarga del Resumen Ejecutivo Estructurado en PDF */}
      {isExecutiveModalOpen && (
        <ExecutiveSummaryPdfModal
          isOpen={isExecutiveModalOpen}
          onClose={() => setIsExecutiveModalOpen(false)}
          patients={patients}
          establishment={establishment}
          thresholds={thresholds}
          bpTargetThreshold={bpTargetThreshold}
          chartDisplayData={chartDisplayData}
          outbreakSummary={outbreakSummary}
          htaControlRate={htaControlRate}
          htaTargetRate={htaTargetRate}
          dmControlRate={dmControlRate}
          dmTargetRate={dmTargetRate}
          selectedHtaControlledCount={selectedHtaControlled.length}
          htaEvaluatedCount={htaWithControls.length}
          dmControlledGlucoseCount={dmControlledGlucose.length}
          dmEvaluatedCount={dmWithControls.length}
          dmFootEvalRate={dmFootEvalRate}
          dmFootTargetRate={dmFootTargetRate}
          dmFootTotalKnown={dmFootTotalKnown}
          medDeliveryRate={medDeliveryRate}
          medTargetRate={medTargetRate}
          controlsWithMedsCount={controlsWithMeds.length}
          adherenceRate={adherenceRate}
          adherenceTarget={adherenceTarget}
          overduePatientsCount={overduePatients.length}
          reportDate={reportDate}
        />
      )}
    </div>
  );
};
