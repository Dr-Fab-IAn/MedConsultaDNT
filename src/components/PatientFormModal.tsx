import React, { useState, useEffect } from 'react';
import { X, Save, Search, AlertCircle, CheckCircle2, ShieldCheck, FileText, Printer } from 'lucide-react';
import { DntPatient, EstablishmentConfig, Sexo, TipoSeguro, EstadioHta, RiesgoCardiovascular } from '../types/dnt';
import { UserProfile } from '../types/auth';
import { calculateImc, getImcClassification, calculateAbdominalRisk, classifyBloodPressure, createEmptyMonthlyControls } from '../utils/clinicalCalculations';
import { queryDni } from '../services/apiService';
import { validateDni } from '../utils/identificationValidation';
import { IdentificationValidationBadge } from './IdentificationValidationBadge';
import { PatientPrintSheetModal } from './PatientPrintSheetModal';

interface PatientFormModalProps {
  patient: DntPatient | null;
  initialDniData?: { dni: string; nombres: string; apellidoPaterno: string; apellidoMaterno: string; codVerifica?: string } | null;
  establishment: EstablishmentConfig;
  currentUser?: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (patient: DntPatient) => void;
}

export const PatientFormModal: React.FC<PatientFormModalProps> = ({
  patient,
  initialDniData,
  establishment,
  currentUser,
  isOpen,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'filiacion' | 'antropometria' | 'hta' | 'dm' | 'dislipidemia'>('filiacion');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Form states
  const [dni, setDni] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [nombres, setNombres] = useState('');
  const [edad, setEdad] = useState<number>(45);
  const [sexo, setSexo] = useState<Sexo>('F');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [tipoSeguro, setTipoSeguro] = useState<TipoSeguro>('SIS');
  const [numeroHC, setNumeroHC] = useState('');
  const [codVerifica, setCodVerifica] = useState('');
  const [notasMedicas, setNotasMedicas] = useState('');

  // Antropometría
  const [fechaTamizaje, setFechaTamizaje] = useState(new Date().toISOString().split('T')[0]);
  const [pesoKg, setPesoKg] = useState<number | undefined>(undefined);
  const [tallaCm, setTallaCm] = useState<number | undefined>(undefined);
  const [perimetroAbdominalCm, setPerimetroAbdominalCm] = useState<number | undefined>(undefined);
  const [paSistolicaBasal, setPaSistolicaBasal] = useState<number | undefined>(undefined);
  const [paDiastolicaBasal, setPaDiastolicaBasal] = useState<number | undefined>(undefined);

  // HTA
  const [tieneHta, setTieneHta] = useState(false);
  const [fechaDxHta, setFechaDxHta] = useState('');
  const [estadioHta, setEstadioHta] = useState<EstadioHta>('NORMAL');
  const [tratamientoHta, setTratamientoHta] = useState('');

  // DM
  const [tieneDm, setTieneDm] = useState(false);
  const [fechaDxDm, setFechaDxDm] = useState('');
  const [tipoDm, setTipoDm] = useState<'DM1' | 'DM2'>('DM2');
  const [glucosaBasal, setGlucosaBasal] = useState<number | undefined>(undefined);
  const [hba1c, setHba1c] = useState<number | undefined>(undefined);
  const [tratamientoDm, setTratamientoDm] = useState('');
  const [evaluacionPieDiabetico, setEvaluacionPieDiabetico] = useState<'NORMAL' | 'EN_RIESGO' | 'ULCERA'>('NORMAL');

  // Dislipidemia
  const [tieneDislipidemia, setTieneDislipidemia] = useState(false);
  const [colesterolTotal, setColesterolTotal] = useState<number | undefined>(undefined);
  const [trigliceridos, setTrigliceridos] = useState<number | undefined>(undefined);
  const [hdl, setHdl] = useState<number | undefined>(undefined);
  const [ldl, setLdl] = useState<number | undefined>(undefined);
  const [riesgoCardiovascular, setRiesgoCardiovascular] = useState<RiesgoCardiovascular>('MODERADO');

  // Query state
  const [searchingDni, setSearchingDni] = useState(false);
  const [dniError, setDniError] = useState<string | null>(null);

  useEffect(() => {
    if (patient) {
      setDni(patient.dni || '');
      setApellidoPaterno(patient.apellidoPaterno || '');
      setApellidoMaterno(patient.apellidoMaterno || '');
      setNombres(patient.nombres || '');
      setEdad(patient.edad || 45);
      setSexo(patient.sexo || 'F');
      setFechaNacimiento(patient.fechaNacimiento || '');
      setDireccion(patient.direccion || '');
      setTelefono(patient.telefono || '');
      setTipoSeguro(patient.tipoSeguro || 'SIS');
      setNumeroHC(patient.numeroHC || '');
      setCodVerifica(patient.codVerifica || '');

      setFechaTamizaje(patient.fechaTamizaje || new Date().toISOString().split('T')[0]);
      setPesoKg(patient.pesoKg);
      setTallaCm(patient.tallaCm);
      setPerimetroAbdominalCm(patient.perimetroAbdominalCm);
      setPaSistolicaBasal(patient.paSistolicaBasal);
      setPaDiastolicaBasal(patient.paDiastolicaBasal);

      setTieneHta(Boolean(patient.tieneHta));
      setFechaDxHta(patient.fechaDxHta || '');
      setEstadioHta(patient.estadioHta || 'NORMAL');
      setTratamientoHta(patient.tratamientoHta || '');

      setTieneDm(Boolean(patient.tieneDm));
      setFechaDxDm(patient.fechaDxDm || '');
      setTipoDm(patient.tipoDm || 'DM2');
      setGlucosaBasal(patient.glucosaBasal);
      setHba1c(patient.hba1c);
      setTratamientoDm(patient.tratamientoDm || '');
      setEvaluacionPieDiabetico(patient.evaluacionPieDiabetico || 'NORMAL');

      setTieneDislipidemia(Boolean(patient.tieneDislipidemia));
      setColesterolTotal(patient.colesterolTotal);
      setTrigliceridos(patient.trigliceridos);
      setHdl(patient.hdl);
      setLdl(patient.ldl);
      setRiesgoCardiovascular(patient.riesgoCardiovascular || 'MODERADO');
      setNotasMedicas(patient.notasMedicas || '');
    } else if (initialDniData) {
      setDni(initialDniData.dni || '');
      setNombres(initialDniData.nombres || '');
      setApellidoPaterno(initialDniData.apellidoPaterno || '');
      setApellidoMaterno(initialDniData.apellidoMaterno || '');
      setCodVerifica(initialDniData.codVerifica || '');
      setNumeroHC(`HC-${initialDniData.dni.substring(2)}`);
      setNotasMedicas('');
    } else {
      // Formulario vacío por defecto
      setDni('');
      setApellidoPaterno('');
      setApellidoMaterno('');
      setNombres('');
      setEdad(45);
      setSexo('F');
      setFechaNacimiento('');
      setDireccion('');
      setTelefono('');
      setTipoSeguro('SIS');
      setNumeroHC(`HC-${Math.floor(10000 + Math.random() * 90000)}`);
      setCodVerifica('');
      setFechaTamizaje(new Date().toISOString().split('T')[0]);
      setPesoKg(undefined);
      setTallaCm(undefined);
      setPerimetroAbdominalCm(undefined);
      setPaSistolicaBasal(undefined);
      setPaDiastolicaBasal(undefined);
      setTieneHta(false);
      setTieneDm(false);
      setTieneDislipidemia(false);
      setNotasMedicas('');
    }
  }, [patient, initialDniData, isOpen]);

  // Cálculos en tiempo real
  const currentImc = calculateImc(pesoKg, tallaCm);
  const currentImcClass = getImcClassification(currentImc);
  const currentAbdominalRisk = calculateAbdominalRisk(perimetroAbdominalCm, sexo);
  const currentPaClass = classifyBloodPressure(paSistolicaBasal, paDiastolicaBasal);

  // Validación de DNI con Módulo 11 RENIEC
  const formDniValidation = validateDni(dni);

  const handleQueryDniInForm = async () => {
    if (!formDniValidation.isValid) {
      setDniError(formDniValidation.error || 'El DNI ingresado no es válido');
      return;
    }
    setSearchingDni(true);
    setDniError(null);
    try {
      const res = await queryDni(formDniValidation.cleanDni);
      setNombres(res.nombres);
      setApellidoPaterno(res.apellidoPaterno);
      setApellidoMaterno(res.apellidoMaterno);
      setCodVerifica(res.codVerifica || (formDniValidation.calculatedCheckDigit !== undefined ? String(formDniValidation.calculatedCheckDigit) : ''));
    } catch (err: any) {
      setDniError(err.message || 'Error al consultar DNI');
    } finally {
      setSearchingDni(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDniValidation.isValid) {
      alert(formDniValidation.error || 'Por favor ingrese un DNI válido de 8 dígitos según formato RENIEC.');
      return;
    }
    if (!nombres || !apellidoPaterno) {
      alert('Por favor complete los nombres y apellido paterno.');
      return;
    }

    const updatedPatient: DntPatient = {
      id: patient?.id || `p-${Date.now()}`,
      redSalud: patient?.redSalud || establishment.redSalud,
      microred: patient?.microred || establishment.microred,
      establecimiento: patient?.establecimiento || establishment.establecimiento,
      codigoRenaes: patient?.codigoRenaes || establishment.codigoRenaes,
      dni,
      apellidoPaterno: apellidoPaterno.toUpperCase().trim(),
      apellidoMaterno: apellidoMaterno.toUpperCase().trim(),
      nombres: nombres.toUpperCase().trim(),
      nombreCompleto: `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.toUpperCase().trim(),
      edad: Number(edad) || 0,
      sexo,
      fechaNacimiento,
      direccion,
      telefono,
      tipoSeguro,
      numeroHC,
      codVerifica,

      fechaTamizaje,
      pesoKg: pesoKg ? Number(pesoKg) : undefined,
      tallaCm: tallaCm ? Number(tallaCm) : undefined,
      imc: currentImc,
      clasificacionImc: currentImcClass,
      perimetroAbdominalCm: perimetroAbdominalCm ? Number(perimetroAbdominalCm) : undefined,
      riesgoAbdominal: currentAbdominalRisk,
      paSistolicaBasal: paSistolicaBasal ? Number(paSistolicaBasal) : undefined,
      paDiastolicaBasal: paDiastolicaBasal ? Number(paDiastolicaBasal) : undefined,

      tieneHta,
      fechaDxHta: tieneHta ? fechaDxHta : undefined,
      estadioHta: tieneHta ? estadioHta : undefined,
      tratamientoHta: tieneHta ? tratamientoHta : undefined,

      tieneDm,
      fechaDxDm: tieneDm ? fechaDxDm : undefined,
      tipoDm: tieneDm ? tipoDm : undefined,
      glucosaBasal: tieneDm && glucosaBasal ? Number(glucosaBasal) : undefined,
      hba1c: tieneDm && hba1c ? Number(hba1c) : undefined,
      tratamientoDm: tieneDm ? tratamientoDm : undefined,
      evaluacionPieDiabetico: tieneDm ? evaluacionPieDiabetico : undefined,

      tieneDislipidemia,
      colesterolTotal: tieneDislipidemia && colesterolTotal ? Number(colesterolTotal) : undefined,
      trigliceridos: tieneDislipidemia && trigliceridos ? Number(trigliceridos) : undefined,
      hdl: tieneDislipidemia && hdl ? Number(hdl) : undefined,
      ldl: tieneDislipidemia && ldl ? Number(ldl) : undefined,
      riesgoCardiovascular,

      // Notas médicas rápidas
      notasMedicas: notasMedicas.trim() || undefined,

      controles: patient?.controles || createEmptyMonthlyControls(),
      fechaCreacion: patient?.fechaCreacion || new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
    };

    onSave(updatedPatient);
    onClose();
  };

  if (!isOpen) return null;

  const currentPatientForPrint: DntPatient = {
    id: patient?.id || `p-${Date.now()}`,
    redSalud: establishment.redSalud,
    microred: establishment.microred,
    establecimiento: establishment.establecimiento,
    codigoRenaes: establishment.codigoRenaes,
    dni: dni.trim(),
    apellidoPaterno: apellidoPaterno.trim().toUpperCase(),
    apellidoMaterno: apellidoMaterno.trim().toUpperCase(),
    nombres: nombres.trim().toUpperCase(),
    nombreCompleto: `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.trim().toUpperCase() || patient?.nombreCompleto || 'PACIENTE',
    edad: Number(edad) || 0,
    sexo,
    fechaNacimiento,
    direccion,
    telefono,
    tipoSeguro,
    numeroHC,
    codVerifica,
    fechaTamizaje,
    pesoKg: pesoKg ? Number(pesoKg) : undefined,
    tallaCm: tallaCm ? Number(tallaCm) : undefined,
    imc: currentImc,
    clasificacionImc: currentImcClass,
    perimetroAbdominalCm: perimetroAbdominalCm ? Number(perimetroAbdominalCm) : undefined,
    riesgoAbdominal: currentAbdominalRisk,
    paSistolicaBasal: paSistolicaBasal ? Number(paSistolicaBasal) : undefined,
    paDiastolicaBasal: paDiastolicaBasal ? Number(paDiastolicaBasal) : undefined,
    tieneHta,
    fechaDxHta: tieneHta ? fechaDxHta : undefined,
    estadioHta: tieneHta ? estadioHta : undefined,
    tratamientoHta: tieneHta ? tratamientoHta : undefined,
    tieneDm,
    fechaDxDm: tieneDm ? fechaDxDm : undefined,
    tipoDm: tieneDm ? tipoDm : undefined,
    glucosaBasal: tieneDm && glucosaBasal ? Number(glucosaBasal) : undefined,
    hba1c: tieneDm && hba1c ? Number(hba1c) : undefined,
    tratamientoDm: tieneDm ? tratamientoDm : undefined,
    evaluacionPieDiabetico: tieneDm ? evaluacionPieDiabetico : undefined,
    tieneDislipidemia,
    colesterolTotal: tieneDislipidemia && colesterolTotal ? Number(colesterolTotal) : undefined,
    trigliceridos: tieneDislipidemia && trigliceridos ? Number(trigliceridos) : undefined,
    hdl: tieneDislipidemia && hdl ? Number(hdl) : undefined,
    ldl: tieneDislipidemia && ldl ? Number(ldl) : undefined,
    riesgoCardiovascular,
    notasMedicas: notasMedicas.trim() || undefined,
    controles: patient?.controles || createEmptyMonthlyControls(),
    updatedBy: currentUser?.displayName || 'Personal de Salud',
    updatedByRole: currentUser?.role,
    fechaCreacion: patient?.fechaCreacion || new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera del modal */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900">
                {patient ? 'Editar Ficha de Paciente DNT' : 'Nuevo Registro en Padrón DNT'}
              </h3>
              {currentUser && (
                <span className="text-[10px] font-semibold bg-teal-50 border border-teal-200 text-teal-800 px-2 py-0.5 rounded-full">
                  Operador: {currentUser.displayName.split(' ')[0]} ({currentUser.roleTitle.split('/')[0]})
                </span>
              )}
            </div>
            <span className="text-xs text-slate-500">
              {establishment.establecimiento} · RENAES: {establishment.codigoRenaes}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Generar reporte clínico oficial en PDF con riesgo cardiovascular y controles para imprimir o descargar"
            >
              <Printer className="w-4 h-4 text-teal-700" />
              <span className="hidden sm:inline">Reporte Clínico PDF / Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de pestañas */}
        <div className="flex border-b border-slate-200 bg-white px-6 overflow-x-auto gap-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('filiacion')}
            className={`py-2.5 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'filiacion'
                ? 'border-teal-700 text-teal-800 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Filiación y Seguro
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('antropometria')}
            className={`py-2.5 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'antropometria'
                ? 'border-teal-700 text-teal-800 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Antropometría & Tamizaje
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hta')}
            className={`py-2.5 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'hta'
                ? 'border-teal-700 text-teal-800 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            3. Hipertensión (HTA)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dm')}
            className={`py-2.5 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'dm'
                ? 'border-teal-700 text-teal-800 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            4. Diabetes (DM)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dislipidemia')}
            className={`py-2.5 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'dislipidemia'
                ? 'border-teal-700 text-teal-800 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            5. Dislipidemia & RCV
          </button>
        </div>

        {/* Contenido del formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: FILIACIÓN */}
          {activeTab === 'filiacion' && (
            <div className="space-y-4">
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-md text-xs text-teal-900 flex items-center justify-between">
                <span>Consulta instantánea de RENIEC mediante apisperu.com</span>
                <span className="font-mono font-semibold">DNI: 8 dígitos</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Número de DNI *
                    </label>
                    {dni.length > 0 && (
                      <span className={`text-[10px] font-mono font-medium ${
                        formDniValidation.isValid ? 'text-emerald-700' : 'text-slate-400'
                      }`}>
                        {dni.length}/8
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      maxLength={8}
                      value={dni}
                      onChange={(e) => {
                        setDni(e.target.value.replace(/\D/g, ''));
                        setDniError(null);
                      }}
                      placeholder="8 dígitos"
                      className={`w-full px-3 py-1.5 font-mono text-sm border rounded-md transition-colors ${
                        !dni
                          ? 'border-slate-300 focus:ring-1 focus:ring-teal-700'
                          : formDniValidation.isValid
                          ? 'border-emerald-500 bg-emerald-50/20 text-emerald-950 font-semibold focus:ring-1 focus:ring-emerald-600'
                          : dni.length === 8
                          ? 'border-red-500 bg-red-50/20 text-red-950 focus:ring-1 focus:ring-red-600'
                          : 'border-amber-400 bg-amber-50/20 focus:ring-1 focus:ring-amber-500'
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={handleQueryDniInForm}
                      disabled={searchingDni || !formDniValidation.isValid}
                      className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 disabled:bg-slate-100 disabled:text-slate-400 text-teal-800 text-xs font-semibold rounded-md border border-teal-200 disabled:border-slate-300 transition-colors shrink-0 flex items-center gap-1 shadow-2xs"
                      title="Buscar en RENIEC"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>{searchingDni ? '...' : 'RENIEC'}</span>
                    </button>
                  </div>
                  {/* Badge de validación de formato / checksum */}
                  {dni.length > 0 && (
                    <IdentificationValidationBadge
                      type="dni"
                      validation={formDniValidation}
                      className="mt-1"
                    />
                  )}
                  {dniError && <span className="text-xs text-red-600 mt-1 block font-medium">{dniError}</span>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Apellido Paterno *
                  </label>
                  <input
                    type="text"
                    value={apellidoPaterno}
                    onChange={(e) => setApellidoPaterno(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Apellido Materno *
                  </label>
                  <input
                    type="text"
                    value={apellidoMaterno}
                    onChange={(e) => setApellidoMaterno(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-700"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombres *
                  </label>
                  <input
                    type="text"
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dígito Verif. / Cód.
                  </label>
                  <input
                    type="text"
                    value={codVerifica}
                    onChange={(e) => setCodVerifica(e.target.value)}
                    placeholder="Ej: 8"
                    className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Edad (años)
                  </label>
                  <input
                    type="number"
                    min={18}
                    max={120}
                    value={edad}
                    onChange={(e) => setEdad(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sexo
                  </label>
                  <select
                    value={sexo}
                    onChange={(e) => setSexo(e.target.value as Sexo)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-700"
                  >
                    <option value="F">Femenino</option>
                    <option value="M">Masculino</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Seguro
                  </label>
                  <select
                    value={tipoSeguro}
                    onChange={(e) => setTipoSeguro(e.target.value as TipoSeguro)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-700"
                  >
                    <option value="SIS">SIS</option>
                    <option value="ESSALUD">EsSalud</option>
                    <option value="PARTICULAR">Particular</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    N° Historia Clínica
                  </label>
                  <input
                    type="text"
                    value={numeroHC}
                    onChange={(e) => setNumeroHC(e.target.value)}
                    placeholder="HC-00000"
                    className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dirección Domiciliaria
                  </label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Av., Calle, Jr., Mz., Lote"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono / Celular de Contacto
                  </label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="9XXXXXXXX"
                    className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANTROPOMETRÍA */}
          {activeTab === 'antropometria' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Tamizaje
                  </label>
                  <input
                    type="date"
                    value={fechaTamizaje}
                    onChange={(e) => setFechaTamizaje(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="250"
                    value={pesoKg !== undefined ? pesoKg : ''}
                    onChange={(e) => setPesoKg(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="Ej: 72.5"
                    className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Talla (cm)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="220"
                    value={tallaCm !== undefined ? tallaCm : ''}
                    onChange={(e) => setTallaCm(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    placeholder="Ej: 165"
                    className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              {/* Tarjeta de cálculo en vivo de IMC */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider block">
                    Índice de Masa Corporal (IMC) Automático
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-mono text-2xl font-bold text-slate-900">
                      {currentImc !== undefined ? currentImc : '--'}
                    </span>
                    <span className="text-xs text-slate-500">kg/m²</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Estado Nutricional (OMS)</span>
                  <span className={`text-sm font-semibold ${
                    currentImcClass === 'Normal'
                      ? 'text-emerald-700'
                      : currentImcClass === 'Sobrepeso'
                      ? 'text-amber-700'
                      : 'text-red-700'
                  }`}>
                    {currentImcClass || 'Requiere peso y talla'}
                  </span>
                </div>
              </div>

              {/* Perímetro Abdominal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Perímetro Abdominal (cm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="40"
                    max="180"
                    value={perimetroAbdominalCm !== undefined ? perimetroAbdominalCm : ''}
                    onChange={(e) => setPerimetroAbdominalCm(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="Ej: 92"
                    className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Corte de riesgo: Varón &gt; 94cm / Mujer &gt; 80cm
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Riesgo Cardiovascular Abdominal
                  </label>
                  <div className={`p-2 rounded-md border text-xs font-semibold ${
                    currentAbdominalRisk === 'NORMAL'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : currentAbdominalRisk === 'ALTO'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : currentAbdominalRisk === 'MUY ALTO'
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    {currentAbdominalRisk ? `Riesgo ${currentAbdominalRisk}` : 'Ingrese perímetro abdominal'}
                  </div>
                </div>
              </div>

              {/* Presión Basal */}
              <div className="border-t border-slate-200 pt-4">
                <span className="text-xs font-semibold text-slate-900 block mb-2">
                  Presión Arterial Basal de Tamizaje
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Sistólica (PAS mmHg)</label>
                    <input
                      type="number"
                      value={paSistolicaBasal !== undefined ? paSistolicaBasal : ''}
                      onChange={(e) => setPaSistolicaBasal(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                      placeholder="Ej: 130"
                      className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Diastólica (PAD mmHg)</label>
                    <input
                      type="number"
                      value={paDiastolicaBasal !== undefined ? paDiastolicaBasal : ''}
                      onChange={(e) => setPaDiastolicaBasal(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                      placeholder="Ej: 85"
                      className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Clasificación Presión</label>
                    <div className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md">
                      {currentPaClass || '--'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HIPERTENSIÓN ARTERIAL (HTA) */}
          {activeTab === 'hta' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <span className="font-semibold text-sm text-slate-900 block">
                    ¿Paciente con diagnóstico de Hipertensión Arterial (HTA)?
                  </span>
                  <span className="text-xs text-slate-500">
                    Código CIE-10: I10 (Hipertensión esencial)
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tieneHta}
                    onChange={(e) => setTieneHta(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-700"></div>
                </label>
              </div>

              {tieneHta && (
                <div className="space-y-4 p-4 border border-slate-200 rounded-lg bg-white">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Fecha de Diagnóstico de HTA
                      </label>
                      <input
                        type="date"
                        value={fechaDxHta}
                        onChange={(e) => setFechaDxHta(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Estadío Clínico de HTA
                      </label>
                      <select
                        value={estadioHta}
                        onChange={(e) => setEstadioHta(e.target.value as EstadioHta)}
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                      >
                        <option value="PREHIPERTENSION">Prehipertensión</option>
                        <option value="ESTADIO_1">Estadío 1 (PAS 140-159 o PAD 90-99)</option>
                        <option value="ESTADIO_2">Estadío 2 (PAS ≥ 160 o PAD ≥ 100)</option>
                        <option value="NORMAL">Controlado / Normal con medicación</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Esquema Farmacológico / Medicación Antihipertensiva
                    </label>
                    <input
                      type="text"
                      value={tratamientoHta}
                      onChange={(e) => setTratamientoHta(e.target.value)}
                      placeholder="Ej: Losartán 50mg c/12h + Amlodipino 5mg c/24h"
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {['Losartán 50mg', 'Enalapril 20mg', 'Amlodipino 5mg', 'Hidroclorotiazida 25mg', 'Captopril 25mg'].map(med => (
                        <button
                          key={med}
                          type="button"
                          onClick={() => setTratamientoHta(prev => prev ? `${prev}, ${med}` : med)}
                          className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors"
                        >
                          + {med}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DIABETES MELLITUS */}
          {activeTab === 'dm' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <span className="font-semibold text-sm text-slate-900 block">
                    ¿Paciente con diagnóstico de Diabetes Mellitus?
                  </span>
                  <span className="text-xs text-slate-500">
                    CIE-10: E11 (DM Tipo 2 no insulinodependiente) / E10 (DM Tipo 1)
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tieneDm}
                    onChange={(e) => setTieneDm(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-700"></div>
                </label>
              </div>

              {tieneDm && (
                <div className="space-y-4 p-4 border border-slate-200 rounded-lg bg-white">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tipo de Diabetes
                      </label>
                      <select
                        value={tipoDm}
                        onChange={(e) => setTipoDm(e.target.value as 'DM1' | 'DM2')}
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                      >
                        <option value="DM2">Diabetes Tipo 2 (DM2)</option>
                        <option value="DM1">Diabetes Tipo 1 (DM1)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Fecha de Diagnóstico DM
                      </label>
                      <input
                        type="date"
                        value={fechaDxDm}
                        onChange={(e) => setFechaDxDm(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tamizaje de Pie Diabético
                      </label>
                      <select
                        value={evaluacionPieDiabetico}
                        onChange={(e) => setEvaluacionPieDiabetico(e.target.value as any)}
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                      >
                        <option value="NORMAL">Normal / Sin lesión</option>
                        <option value="EN_RIESGO">Pie en Riesgo (Neuropatía/Isquemia)</option>
                        <option value="ULCERA">Con Úlcera activa</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Glucosa Basal en Ayunas (mg/dL)
                      </label>
                      <input
                        type="number"
                        min="40"
                        max="600"
                        value={glucosaBasal !== undefined ? glucosaBasal : ''}
                        onChange={(e) => setGlucosaBasal(e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="Normal: 70 - 130"
                        className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Hemoglobina Glicosilada (HbA1c %)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="4"
                        max="18"
                        value={hba1c !== undefined ? hba1c : ''}
                        onChange={(e) => setHba1c(e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="Meta de control: < 7.0%"
                        className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tratamiento Antidiabético
                    </label>
                    <input
                      type="text"
                      value={tratamientoDm}
                      onChange={(e) => setTratamientoDm(e.target.value)}
                      placeholder="Ej: Metformina 850mg v.o. c/12h"
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {['Metformina 850mg', 'Glibenclamida 5mg', 'Insulina NPH', 'Insulina R', 'Empagliflozina 10mg'].map(med => (
                        <button
                          key={med}
                          type="button"
                          onClick={() => setTratamientoDm(prev => prev ? `${prev}, ${med}` : med)}
                          className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors"
                        >
                          + {med}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: DISLIPIDEMIA & RCV */}
          {activeTab === 'dislipidemia' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <span className="font-semibold text-sm text-slate-900 block">
                    ¿Diagnóstico de Dislipidemia o Perfil Lipídico Alterado?
                  </span>
                  <span className="text-xs text-slate-500">
                    CIE-10: E78 (Trastornos del metabolismo de lipoproteínas)
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tieneDislipidemia}
                    onChange={(e) => setTieneDislipidemia(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-700"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Colesterol Total (mg/dL)
                  </label>
                  <input
                    type="number"
                    value={colesterolTotal !== undefined ? colesterolTotal : ''}
                    onChange={(e) => setColesterolTotal(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    placeholder="< 200"
                    className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Triglicéridos (mg/dL)
                  </label>
                  <input
                    type="number"
                    value={trigliceridos !== undefined ? trigliceridos : ''}
                    onChange={(e) => setTrigliceridos(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    placeholder="< 150"
                    className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    HDL (mg/dL)
                  </label>
                  <input
                    type="number"
                    value={hdl !== undefined ? hdl : ''}
                    onChange={(e) => setHdl(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    placeholder="> 40"
                    className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    LDL (mg/dL)
                  </label>
                  <input
                    type="number"
                    value={ldl !== undefined ? ldl : ''}
                    onChange={(e) => setLdl(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    placeholder="< 100"
                    className="w-full px-3 py-1.5 font-mono text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estratificación de Riesgo Cardiovascular Global (Score OMS/MINSA)
                </label>
                <select
                  value={riesgoCardiovascular}
                  onChange={(e) => setRiesgoCardiovascular(e.target.value as RiesgoCardiovascular)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                >
                  <option value="BAJO">Riesgo Bajo (&lt; 10% en 10 años)</option>
                  <option value="MODERADO">Riesgo Moderado (10% a &lt; 20%)</option>
                  <option value="ALTO">Riesgo Alto (20% a &lt; 30%)</option>
                  <option value="MUY_ALTO">Riesgo Muy Alto (≥ 30% o daño de órgano)</option>
                </select>
              </div>
            </div>
          )}

          {/* Campo de Notas Médicas Rápidas y Condiciones Especiales */}
          <div className="bg-amber-50/60 border border-amber-200/90 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-700" />
                <span>Notas Médicas Rápidas / Condiciones Especiales</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {notasMedicas.length}/300 caracteres
              </span>
            </div>
            <textarea
              value={notasMedicas}
              onChange={(e) => setNotasMedicas(e.target.value.slice(0, 300))}
              rows={2}
              placeholder="Ej: Alérgico a penicilina, toma medicación en el desayuno, control pendiente de fondo de ojo, riesgo de hipoglucemia..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600 placeholder:text-slate-400 shadow-2xs"
            />
            {/* Sugerencias clínicas rápidas */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
              <span className="text-slate-500 font-medium">Sugerencias rápidas:</span>
              {[
                'Dieta estricta hiposódica',
                'Alérgico a sulfas',
                'Monitoreo glucométrico estricto',
                'Revisión pie diabético',
                'Polifarmacia / Adulto mayor',
                'Pendiente fondo de ojo',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setNotasMedicas((prev) => {
                      if (!prev) return chip;
                      if (prev.includes(chip)) return prev;
                      return `${prev}; ${chip}`;
                    });
                  }}
                  className="px-2 py-0.5 rounded-full bg-white hover:bg-amber-100 border border-amber-200 text-slate-700 hover:text-amber-950 transition-colors cursor-pointer text-[10px]"
                >
                  + {chip}
                </button>
              ))}
              {notasMedicas && (
                <button
                  type="button"
                  onClick={() => setNotasMedicas('')}
                  className="text-[10px] text-red-600 hover:underline ml-1"
                >
                  Limpiar nota
                </button>
              )}
            </div>
          </div>

          {/* Pie del modal con acciones */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              * Campos obligatorios para el padrón nominal
            </span>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Generar reporte clínico oficial en PDF con riesgo cardiovascular y controles para imprimir o descargar"
              >
                <Printer className="w-4 h-4 text-teal-700" />
                <span>Reporte Clínico PDF / Imprimir</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Ficha en Padrón</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Modal de Impresión / Ficha Clínica Simplificada */}
      {isPrintModalOpen && (
        <PatientPrintSheetModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          patient={currentPatientForPrint}
          establishment={establishment}
        />
      )}
    </div>
  );
};
