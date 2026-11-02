import React, { useRef, useState } from 'react';
import { 
  Printer, 
  X, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Building, 
  Heart, 
  Activity, 
  Download, 
  Loader2, 
  ShieldAlert, 
  ShieldCheck, 
  Scale, 
  Pill, 
  Calendar, 
  User, 
  Check, 
  FileCheck2,
  TrendingUp,
  Stethoscope,
  Info
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DntPatient, EstablishmentConfig, ClinicalThresholds } from '../types/dnt';
import { MESES_DEL_ANIO, getImcNutritionInfo } from '../utils/clinicalCalculations';
import { formatPeruDate } from '../utils/notificationScheduler';
import { calculateCardiovascularRisk } from '../utils/cardiovascularRisk';
import { DEFAULT_CLINICAL_THRESHOLDS } from '../utils/storage';

export interface PatientPrintSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: DntPatient;
  establishment: EstablishmentConfig;
  thresholds?: ClinicalThresholds;
}

export const PatientPrintSheetModal: React.FC<PatientPrintSheetModalProps> = ({
  isOpen,
  onClose,
  patient,
  establishment,
  thresholds = DEFAULT_CLINICAL_THRESHOLDS,
}) => {
  if (!isOpen) return null;

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  // Cálculo del riesgo cardiovascular global calculado y actualizado
  const cvRisk = calculateCardiovascularRisk(patient, thresholds);

  // Controles atendidos para la tabla resumen
  const attendedControls = Object.values(patient.controles || {})
    .filter((c) => c.atendido)
    .sort((a, b) => a.mes - b.mes);

  const controlledCount = attendedControls.filter((c) => c.controlado).length;
  const latestControl = attendedControls.length > 0 ? attendedControls[attendedControls.length - 1] : null;

  // Clasificación nutricional basada en IMC actual o basal
  const effectiveImc = latestControl?.imc ?? patient.imc;
  const nutritionInfo = getImcNutritionInfo(effectiveImc);

  // Impresión nativa del navegador optimizada
  const handlePrint = () => {
    window.print();
  };

  // Generación de documento PDF de alta fidelidad con jsPDF + html2canvas
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

      const todayStr = new Date().toISOString().split('T')[0];
      const safeName = patient.nombreCompleto.replace(/\s+/g, '_').substring(0, 20);
      const fileName = `Reporte_Clinico_DNT_${patient.dni}_${safeName}_${todayStr}.pdf`;

      pdf.save(fileName);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error generando PDF:', err);
      alert(`Error al generar documento PDF del paciente: ${err?.message || 'Error desconocido'}`);
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
          #printable-patient-sheet, #printable-patient-sheet * {
            visibility: visible !important;
          }
          #printable-patient-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 10mm !important;
            background: white !important;
            color: black !important;
            font-size: 10.5pt !important;
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
            <div className="p-2 bg-teal-500/20 text-teal-400 rounded-lg">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Reporte Clínico y Ficha de Salud DNT
                </h3>
                <span className="text-[11px] font-mono font-bold px-1.5 py-0.2 rounded bg-teal-900 text-teal-200 border border-teal-700">
                  DNI: {patient.dni}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Resumen de salud, riesgo cardiovascular calculado e histórico de controles mensuales
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botón Descargar PDF */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer ${
                downloadSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
              }`}
              title="Descargar este reporte clínico completo en formato PDF oficial"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
                  <span>Generando PDF...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡PDF Descargado!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-teal-700" />
                  <span>Descargar PDF</span>
                </>
              )}
            </button>

            {/* Botón Imprimir Directamente */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 active:bg-teal-900 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Imprimir reporte en impresora física o imprimir a PDF de sistema (Ctrl + P)"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hoja Imprimible / Vista Previa (A4 / Documento Clínico Oficial) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 flex justify-center">
          <div 
            id="printable-patient-sheet"
            ref={printableRef}
            className="bg-white w-full max-w-3xl p-6 sm:p-8 border border-slate-300 shadow-md print:shadow-none print:border-none space-y-4 text-slate-900 font-sans"
          >
            {/* ENCABEZADO INSTITUCIONAL MINSA */}
            <div className="border-b-2 border-slate-900 pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="text-[10px] font-bold text-slate-600 tracking-wider uppercase">
                    República del Perú · Ministerio de Salud
                  </div>
                  <h1 className="text-base font-black uppercase tracking-tight text-slate-950 mt-0.5">
                    Informe y Resumen de Salud del Paciente Crónico DNT
                  </h1>
                  <h2 className="text-xs font-bold text-teal-800 uppercase tracking-wide">
                    Estrategia Sanitaria de Prevención y Control de Daños No Transmisibles
                  </h2>
                </div>

                <div className="text-right text-[11px] font-mono border-l pl-3 border-slate-300 shrink-0">
                  <div><strong>RENAES:</strong> {establishment.codigoRenaes || 'S/C'}</div>
                  <div><strong>AÑO:</strong> {establishment.anio || new Date().getFullYear()}</div>
                  <div className="text-[10px] text-slate-500">
                    Emisión: {new Date().toLocaleDateString('es-PE')}
                  </div>
                </div>
              </div>

              {/* Membrete del Establecimiento */}
              <div className="mt-2 text-[11px] bg-slate-50 border border-slate-200 p-2 rounded grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-slate-500 block text-[10px]">Establecimiento / IPRESS:</span>
                  <span className="font-bold text-slate-900 truncate block">{establishment.establecimiento}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Red de Salud:</span>
                  <span className="font-semibold text-slate-800 truncate block">{establishment.redSalud || '--'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Microred:</span>
                  <span className="font-semibold text-slate-800 truncate block">{establishment.microred || '--'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Ubicación Territorial:</span>
                  <span className="font-semibold text-slate-800 truncate block">
                    {establishment.distrito || 'LIMA'} ({establishment.departamento || 'LIMA'})
                  </span>
                </div>
              </div>
            </div>

            {/* SECCIÓN 1: DATOS DE FILIACIÓN Y SEGURO */}
            <div className="space-y-1">
              <div className="bg-slate-900 text-white px-2 py-1 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                <span>I. Datos de Identificación y Filiación del Paciente</span>
                <span className="font-mono text-[11px]">HISTORIA CLÍNICA: {patient.numeroHC || 'SIN NÚMERO'}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs border border-slate-300 p-2.5 rounded bg-white">
                <div>
                  <span className="text-slate-500 block text-[10px]">Documento de Identidad (DNI):</span>
                  <span className="font-mono font-bold text-sm text-slate-950">{patient.dni}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block text-[10px]">Apellidos y Nombres:</span>
                  <span className="font-bold text-sm text-slate-950 uppercase">{patient.nombreCompleto}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">Edad / Sexo:</span>
                  <span className="font-bold text-slate-900">{patient.edad} años ({patient.sexo === 'M' ? 'MASCULINO' : 'FEMENINO'})</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Fecha de Nacimiento:</span>
                  <span className="font-medium text-slate-900">{formatPeruDate(patient.fechaNacimiento)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Tipo de Seguro de Salud:</span>
                  <span className="font-bold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200 inline-block font-mono">
                    {patient.tipoSeguro}
                  </span>
                </div>

                <div className="col-span-2">
                  <span className="text-slate-500 block text-[10px]">Dirección Domiciliaria:</span>
                  <span className="font-medium text-slate-900">{patient.direccion || 'No especificada'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Teléfono / Celular de Contacto:</span>
                  <span className="font-mono font-bold text-slate-900">{patient.telefono || 'Sin teléfono'}</span>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: VALORACIÓN ANTROPOMÉTRICA Y NUTRICIONAL */}
            <div className="space-y-1">
              <div className="bg-slate-800 text-white px-2 py-1 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                <span>II. Valoración Antropométrica y Estado Nutricional</span>
                <span className="text-[10px] font-normal">Rangos oficiales OMS / MINSA</span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-xs border border-slate-300 p-2.5 rounded bg-white">
                <div>
                  <span className="text-slate-500 block text-[10px]">Fecha Tamizaje Inicial:</span>
                  <span className="font-semibold text-slate-900">{formatPeruDate(patient.fechaTamizaje)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Peso / Talla:</span>
                  <span className="font-semibold text-slate-900">
                    {patient.pesoKg ? `${patient.pesoKg} kg` : '--'} / {patient.tallaCm ? `${patient.tallaCm} cm` : '--'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">IMC / Clasificación:</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono font-bold text-slate-950">{effectiveImc ? `${effectiveImc} kg/m²` : '--'}</span>
                    <span className={`text-[10px] px-1 py-0.2 rounded font-semibold ${nutritionInfo.badgeClass}`}>
                      {nutritionInfo.clasificacion}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Perímetro Abdominal:</span>
                  <span className="font-bold text-slate-900">
                    {patient.perimetroAbdominalCm ? `${patient.perimetroAbdominalCm} cm` : '--'} ({patient.riesgoAbdominal || 'NORMAL'})
                  </span>
                </div>

                <div className="col-span-2">
                  <span className="text-slate-500 block text-[10px]">Presión Arterial Basal (Tamizaje):</span>
                  <span className="font-mono font-bold text-slate-900">
                    {patient.paSistolicaBasal && patient.paDiastolicaBasal 
                      ? `${patient.paSistolicaBasal} / ${patient.paDiastolicaBasal} mmHg` 
                      : 'No registrada'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block text-[10px]">Última Presión Registrada (Control):</span>
                  <span className="font-mono font-bold text-slate-900">
                    {latestControl?.paSistolica && latestControl?.paDiastolica
                      ? `${latestControl.paSistolica} / ${latestControl.paDiastolica} mmHg (${formatPeruDate(latestControl.fecha)})`
                      : 'Sin controles registrados'}
                  </span>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: ESTRATIFICACIÓN DEL RIESGO CARDIOVASCULAR CALCULADO (DESTACADO) */}
            <div className="space-y-1">
              <div className="bg-teal-900 text-white px-2 py-1 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-teal-300" />
                  III. Estratificación del Riesgo Cardiovascular Calculado (RCV Global - OMS/MINSA)
                </span>
                <span className="text-[10px] font-mono text-teal-200">
                  Puntuación de Factores: {cvRisk.puntuacionPuntos} pts
                </span>
              </div>

              <div className={`border p-3 rounded space-y-2.5 ${cvRisk.bgClass} ${cvRisk.borderClass}`}>
                {/* Cabecera del cálculo de riesgo */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 uppercase">
                        Nivel de Riesgo Calculado:
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-extrabold uppercase tracking-wide border shadow-2xs ${cvRisk.badgeClass}`}>
                        {cvRisk.etiqueta}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700 mt-0.5">
                      <strong>Criterio diagnóstico principal:</strong> {cvRisk.criterioPrincipal}
                    </p>
                  </div>

                  <div className="text-right sm:shrink-0 font-mono">
                    <span className="text-[10px] text-slate-500 block">Probabilidad de Evento CV a 10 años:</span>
                    <span className="text-sm font-black text-slate-950">{cvRisk.rangoPorcentaje}</span>
                  </div>
                </div>

                {/* Barra visual de escala de riesgo */}
                <div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                    <span>Bajo (&lt;5%)</span>
                    <span>Moderado (5-9%)</span>
                    <span>Alto (10-19%)</span>
                    <span className="font-bold text-red-700">Muy Alto (&ge;20%)</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
                    <div className="bg-emerald-500 h-full w-1/4" title="Bajo" />
                    <div className="bg-amber-400 h-full w-1/4" title="Moderado" />
                    <div className="bg-orange-500 h-full w-1/4" title="Alto" />
                    <div className="bg-red-600 h-full w-1/4" title="Muy Alto" />
                  </div>
                  <div className="relative w-full h-3">
                    <div 
                      className="absolute -top-1 w-2.5 h-2.5 bg-slate-900 border-2 border-white rounded-full shadow-xs -translate-x-1/2"
                      style={{ left: `${Math.min(98, Math.max(2, cvRisk.gaugePercent))}%` }}
                      title={`Nivel actual: ${cvRisk.categoria}`}
                    />
                  </div>
                </div>

                {/* Metas terapéuticas e indicaciones clínicas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-white/80 p-2 rounded border border-slate-200">
                    <span className="text-slate-500 block font-semibold text-[10px]">Meta de Presión Arterial:</span>
                    <strong className="text-slate-900 font-mono">{cvRisk.metaTensional}</strong>
                  </div>
                  <div className="bg-white/80 p-2 rounded border border-slate-200">
                    <span className="text-slate-500 block font-semibold text-[10px]">Meta de Glucemia / HbA1c:</span>
                    <strong className="text-slate-900 font-mono">{cvRisk.metaGlucosa}</strong>
                  </div>
                  <div className="bg-white/80 p-2 rounded border border-slate-200">
                    <span className="text-slate-500 block font-semibold text-[10px]">Meta de Colesterol LDL:</span>
                    <strong className="text-slate-900 font-mono">{cvRisk.metaColesterolLdl}</strong>
                  </div>
                </div>

                {/* Factores de Riesgo Identificados */}
                <div className="text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/80">
                  <div>
                    <span className="font-bold text-red-950 flex items-center gap-1 mb-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-700" />
                      Factores de Riesgo Presentes:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-700 text-[10px]">
                      {cvRisk.factoresRiesgo.length > 0 ? (
                        cvRisk.factoresRiesgo.map((f, idx) => <li key={idx}>{f}</li>)
                      ) : (
                        <li>Sin factores de riesgo mayores detectados.</li>
                      )}
                    </ul>
                  </div>

                  <div>
                    <span className="font-bold text-emerald-950 flex items-center gap-1 mb-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      Indicación Terapéutica Recomendada:
                    </span>
                    <div className="space-y-1 text-[10px] text-slate-700">
                      <div><strong>Estatinas:</strong> {cvRisk.indicacionEstatinas}</div>
                      <div><strong>AAS / Antiagregación:</strong> {cvRisk.indicacionAas}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: DIAGNÓSTICO Y TRATAMIENTOS FARMACOLÓGICOS ACTUALES */}
            <div className="space-y-1">
              <div className="bg-slate-800 text-white px-2 py-1 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                <span>IV. Diagnósticos y Esquemas Terapéuticos Crónicos</span>
                <span className="text-[10px] font-normal">Prescripción farmacológica</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Módulo HTA */}
                <div className="border border-slate-300 p-2.5 rounded bg-white">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 mb-1.5">
                    <span className="font-bold text-rose-950 flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-rose-700" />
                      Hipertensión Arterial (HTA)
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      patient.tieneHta ? 'bg-rose-100 text-rose-900 border border-rose-300' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {patient.tieneHta ? (patient.estadioHta || 'ESTADIO I') : 'NO REPORTADO'}
                    </span>
                  </div>
                  {patient.tieneHta ? (
                    <div className="space-y-1 text-[11px]">
                      <div><span className="text-slate-500">Fecha Dx:</span> {formatPeruDate(patient.fechaDxHta)}</div>
                      <div>
                        <span className="text-slate-500 block">Tratamiento Actual:</span>
                        <div className="font-semibold text-slate-900 bg-slate-50 p-1 rounded border border-slate-200 mt-0.5">
                          {patient.tratamientoHta || 'Sin esquema registrado'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 italic text-[11px]">Sin diagnóstico de hipertensión arterial.</div>
                  )}
                </div>

                {/* Módulo DM2 */}
                <div className="border border-slate-300 p-2.5 rounded bg-white">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 mb-1.5">
                    <span className="font-bold text-cyan-950 flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-cyan-700" />
                      Diabetes Mellitus (DM)
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      patient.tieneDm ? 'bg-cyan-100 text-cyan-900 border border-cyan-300' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {patient.tieneDm ? (patient.tipoDm || 'DM2') : 'NO REPORTADO'}
                    </span>
                  </div>
                  {patient.tieneDm ? (
                    <div className="space-y-1 text-[11px]">
                      <div><span className="text-slate-500">Fecha Dx:</span> {formatPeruDate(patient.fechaDxDm)}</div>
                      <div>
                        <span className="text-slate-500">Glucosa / HbA1c:</span>{' '}
                        <strong className="font-mono">{patient.glucosaBasal ? `${patient.glucosaBasal} mg/dL` : '--'} / {patient.hba1c ? `${patient.hba1c}%` : '--'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Pie Diabético:</span>{' '}
                        <span className="font-semibold">{patient.evaluacionPieDiabetico || 'NORMAL'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Tratamiento Actual:</span>
                        <div className="font-semibold text-slate-900 bg-slate-50 p-1 rounded border border-slate-200 mt-0.5">
                          {patient.tratamientoDm || 'Sin esquema registrado'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 italic text-[11px]">Sin diagnóstico de diabetes mellitus.</div>
                  )}
                </div>
              </div>
            </div>

            {/* SECCIÓN 5: NOTAS MÉDICAS RÁPIDAS Y CONDICIONES ESPECIALES */}
            <div className="space-y-1">
              <div className="bg-amber-100 text-amber-950 border border-amber-300 px-2 py-1 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-800" />
                <span>V. Notas Médicas Rápidas / Alergias y Condiciones Especiales</span>
              </div>
              <div className="border border-amber-300 bg-amber-50/50 p-2.5 rounded text-xs text-amber-950 font-medium">
                {patient.notasMedicas ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{patient.notasMedicas}</p>
                ) : (
                  <p className="text-slate-400 italic">No se registraron notas médicas o advertencias especiales.</p>
                )}
              </div>
            </div>

            {/* SECCIÓN 6: HISTÓRICO DE CONTROLES MENSUALES (TABLA DETALLADA) */}
            <div className="space-y-1">
              <div className="bg-slate-800 text-white px-2 py-1 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                <span>VI. Histórico de Controles Mensuales Registrados ({establishment.anio || 2026})</span>
                <span className="font-mono text-[10px]">
                  {attendedControls.length} de 12 meses atendidos ({controlledCount} compensados)
                </span>
              </div>

              <div className="border border-slate-300 rounded overflow-hidden bg-white">
                <table className="w-full text-[10.5px] text-left divide-y divide-slate-200">
                  <thead className="bg-slate-100 font-bold text-slate-700">
                    <tr>
                      <th className="p-1.5">Mes</th>
                      <th className="p-1.5">Fecha</th>
                      <th className="p-1.5">P.A. (mmHg)</th>
                      <th className="p-1.5">F.C.</th>
                      <th className="p-1.5">Glucosa</th>
                      <th className="p-1.5">Peso/IMC</th>
                      <th className="p-1.5">Medicación Entregada</th>
                      <th className="p-1.5 text-center">Estado Clínico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {attendedControls.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-3 text-center text-slate-400 italic">
                          Aún no se han registrado controles mensuales para este paciente en el presente año fiscal.
                        </td>
                      </tr>
                    ) : (
                      attendedControls.map((ctrl) => {
                        const mesObj = MESES_DEL_ANIO.find((m) => m.id === ctrl.mes);
                        return (
                          <tr key={ctrl.mes} className="hover:bg-slate-50">
                            <td className="p-1.5 font-bold text-slate-900 whitespace-nowrap">
                              {mesObj ? mesObj.nombre : `Mes ${ctrl.mes}`}
                            </td>
                            <td className="p-1.5 font-mono text-slate-700 whitespace-nowrap">
                              {formatPeruDate(ctrl.fecha)}
                            </td>
                            <td className="p-1.5 font-mono font-bold text-slate-950 whitespace-nowrap">
                              {ctrl.paSistolica && ctrl.paDiastolica ? `${ctrl.paSistolica}/${ctrl.paDiastolica}` : '--'}
                            </td>
                            <td className="p-1.5 font-mono text-slate-700">
                              {ctrl.frecuenciaCardiaca ? `${ctrl.frecuenciaCardiaca} lpm` : '--'}
                            </td>
                            <td className="p-1.5 font-mono font-medium text-slate-900 whitespace-nowrap">
                              {ctrl.glucosaMgDl ? `${ctrl.glucosaMgDl} mg/dL` : '--'}
                            </td>
                            <td className="p-1.5 text-slate-700 whitespace-nowrap">
                              {ctrl.pesoKg ? `${ctrl.pesoKg}kg` : '--'} {ctrl.imc ? `(${ctrl.imc})` : ''}
                            </td>
                            <td className="p-1.5 truncate max-w-[160px] text-slate-800" title={ctrl.medicacionEntregada}>
                              {ctrl.medicacionEntregada || '--'}
                            </td>
                            <td className="p-1.5 text-center whitespace-nowrap">
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                ctrl.controlado 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}>
                                {ctrl.controlado ? 'COMPENSADO' : 'NO COMPENSADO'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECCIÓN 7: SELLO Y FIRMA DEL PROFESIONAL TRATANTE */}
            <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
              <div>
                <div className="border-t border-slate-400 pt-1.5 mx-6">
                  <div className="font-bold text-slate-900">Firma / Huella del Paciente o Familiar</div>
                  <div className="text-[10px] text-slate-500">Conforme con el plan terapéutico brindado</div>
                </div>
              </div>

              <div>
                <div className="border-t border-slate-400 pt-1.5 mx-6">
                  <div className="font-bold text-slate-900">Médico / Licenciado Tratante</div>
                  <div className="text-[10px] text-slate-500">Colegiatura y Registro Nacional MINSA</div>
                </div>
              </div>
            </div>

            {/* Pie de página con folio de seguridad */}
            <div className="text-[9px] text-slate-400 pt-3 border-t border-slate-200 flex items-center justify-between font-mono">
              <span>MedConsulta DNT · Sistema de Padrón Nominal y Seguimiento Clínico MINSA</span>
              <span>DOCUMENTO OFICIAL VALIDADOR · {establishment.codigoRenaes || 'MINSA'}</span>
            </div>
          </div>
        </div>

        {/* Barra inferior de acciones (no-print) */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-teal-700" />
            <span>Documento listo para impresión física o descarga en PDF con formato oficial A4.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
                  <span>Generando PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-teal-700" />
                  <span>Descargar PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Ficha</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Alias para garantizar compatibilidad con cualquier importación previa
export const PatientClinicalReportModal = PatientPrintSheetModal;
