/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { PadronTableView } from './components/PadronTableView';
import { DniLookupView } from './components/DniLookupModal';
import { BulkDniProcessor } from './components/BulkDniProcessor';
import { RucLookupView } from './components/RucLookupView';
import { PatientFormModal } from './components/PatientFormModal';
import { MonthlyTrackingModal } from './components/MonthlyTrackingModal';
import { EstablishmentSettingsModal } from './components/EstablishmentSettingsModal';
import { ApiTokenSettingsModal } from './components/ApiTokenSettingsModal';
import { GerencialReportView } from './components/GerencialReportView';
import { ClinicalThresholdsModal } from './components/ClinicalThresholdsModal';
import { MedicalNotificationCenter } from './components/MedicalNotificationCenter';
import { CalendarView } from './components/CalendarView';
import { CloudSyncModal } from './components/CloudSyncModal';
import { ScheduledBackupsModal } from './components/ScheduledBackupsModal';
import { AuthModal } from './components/AuthModal';
import { DntPatient, EstablishmentConfig, DniQueryResult, ClinicalThresholds } from './types/dnt';
import { UserProfile } from './types/auth';
import { 
  getStoredPatients, 
  savePatients, 
  getStoredEstablishment, 
  saveEstablishment,
  getStoredClinicalThresholds,
  saveClinicalThresholds,
  resetClinicalThresholds,
  exportBackupJson
} from './utils/storage';
import { getApiStatus } from './services/apiService';
import { createEmptyMonthlyControls } from './utils/clinicalCalculations';
import { 
  getAllPatientsDueInfo, 
  notifyBatchDueSummary, 
  getStoredNotificationSettings,
  getNotificationPermissionStatus 
} from './utils/notificationScheduler';
import { 
  CloudSyncSettings, 
  getStoredCloudSyncSettings, 
  pushPatientsToRemoteCloud 
} from './services/firebaseService';
import { checkAndRunScheduledBackup } from './services/backupSchedulerService';
import { getStoredCurrentUser, onAuthStatusChange } from './services/authService';
import { 
  subscribeToEstablishmentPatients, 
  savePatientRealtime, 
  deletePatientRealtime, 
  seedInitialPatients, 
  RealtimeSyncStatus 
} from './services/realtimeDbService';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'padron' | 'calendario' | 'consulta-dni' | 'carga-masiva' | 'consulta-ruc' | 'reporte-gerencial'>('padron');
  const [patients, setPatients] = useState<DntPatient[]>([]);
  const [establishment, setEstablishment] = useState<EstablishmentConfig>(getStoredEstablishment());
  const [thresholds, setThresholds] = useState<ClinicalThresholds>(getStoredClinicalThresholds());
  const [cloudSyncSettings, setCloudSyncSettings] = useState<CloudSyncSettings>(getStoredCloudSyncSettings());
  const [apiConnected, setApiConnected] = useState<boolean>(true);
  const [maskedToken, setMaskedToken] = useState<string>('');

  // Estado de Usuario y Control de Roles (RBAC)
  const [currentUser, setCurrentUser] = useState<UserProfile>(getStoredCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Estado de Sincronización Multi-equipo en Tiempo Real (Firestore onSnapshot)
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeSyncStatus>('syncing');
  const [realtimeDetail, setRealtimeDetail] = useState<string>('Conectando en tiempo real...');

  // Modales
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedPatientForEdit, setSelectedPatientForEdit] = useState<DntPatient | null>(null);
  const [selectedDniForNew, setSelectedDniForNew] = useState<DniQueryResult | null>(null);
  const [selectedPatientForMonthly, setSelectedPatientForMonthly] = useState<DntPatient | null>(null);
  const [isEstablishmentModalOpen, setIsEstablishmentModalOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isThresholdsModalOpen, setIsThresholdsModalOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false);
  const [isScheduledBackupsModalOpen, setIsScheduledBackupsModalOpen] = useState(false);

  // Cargar datos al iniciar y escuchar cambios de sesión
  useEffect(() => {
    const loadedEstablishment = getStoredEstablishment();
    setEstablishment(loadedEstablishment);

    const loadedThresholds = getStoredClinicalThresholds();
    setThresholds(loadedThresholds);

    checkApiStatus();

    // Escuchar sesión en Firebase Auth
    const unsubAuth = onAuthStatusChange((user) => {
      if (user) {
        setCurrentUser(user);
      }
    });

    return () => unsubAuth();
  }, []);

  // Suscripción Multi-equipo en Tiempo Real con Firestore (onSnapshot)
  useEffect(() => {
    const initialLocalPatients = getStoredPatients();
    setPatients(initialLocalPatients);

    const unsubscribe = subscribeToEstablishmentPatients(
      establishment,
      initialLocalPatients,
      {
        onPatientsUpdate: (remotePatients) => {
          setPatients(remotePatients);
          savePatients(remotePatients); // Respaldo local sincronizado
        },
        onStatusChange: (status, detail) => {
          setRealtimeStatus(status);
          if (detail) setRealtimeDetail(detail);
        },
      }
    );

    return () => {
      unsubscribe();
    };
  }, [establishment.codigoRenaes]);

  const checkApiStatus = async () => {
    try {
      const status = await getApiStatus();
      setApiConnected(status.configured);
      setMaskedToken(status.maskedToken);
    } catch (e) {
      console.warn('API status error:', e);
      setApiConnected(false);
    }
  };

  // Guardar paciente (nuevo o editado) con sincronización Multi-equipo en tiempo real
  const handleSavePatient = async (savedPatient: DntPatient) => {
    // 1. Actualización optimista local
    setPatients((prev) => {
      const index = prev.findIndex((p) => p.id === savedPatient.id);
      let updated: DntPatient[];
      if (index >= 0) {
        updated = [...prev];
        updated[index] = savedPatient;
      } else {
        updated = [savedPatient, ...prev];
      }
      savePatients(updated);
      return updated;
    });

    // 2. Persistencia en tiempo real en Firestore
    try {
      await savePatientRealtime(savedPatient, establishment, currentUser);
    } catch (e) {
      console.warn('Error al persistir paciente en tiempo real:', e);
    }
  };

  // Eliminar paciente con control de acceso por roles (RBAC) y en tiempo real
  const handleDeletePatient = async (patientId: string) => {
    // Verificación de RBAC: Solo Médicos y Administradores pueden eliminar pacientes
    if (currentUser.role === 'digitador' || currentUser.role === 'enfermero') {
      alert(`Permiso denegado: El rol de ${currentUser.roleTitle} no tiene permisos para eliminar registros del padrón. Esta acción requiere autorización del Médico Tratante o Jefatura.`);
      return;
    }

    // 1. Actualización optimista local
    setPatients((prev) => {
      const updated = prev.filter((p) => p.id !== patientId);
      savePatients(updated);
      return updated;
    });

    // 2. Eliminación en tiempo real en Firestore
    try {
      await deletePatientRealtime(patientId, establishment, currentUser);
    } catch (e) {
      console.warn('Error al eliminar paciente en tiempo real:', e);
    }
  };

  // Abrir nuevo paciente desde consulta de DNI
  const handleCreatePatientFromDni = (dniData: DniQueryResult) => {
    setSelectedPatientForEdit(null);
    setSelectedDniForNew(dniData);
    setIsFormModalOpen(true);
  };

  // Abrir paciente existente desde búsqueda de DNI
  const handleSelectExistingFromDni = (patient: DntPatient) => {
    setSelectedPatientForEdit(patient);
    setSelectedDniForNew(null);
    setIsFormModalOpen(true);
  };

  // Agregar lote de pacientes al padrón con sincronización
  const handleAddBatchPatients = async (newPatients: DntPatient[]) => {
    setPatients((prev) => {
      // Filtrar los que ya existen por DNI
      const existingDnis = new Set(prev.map((p) => p.dni));
      const toAdd = newPatients.filter((p) => !existingDnis.has(p.dni));
      const updated = [...toAdd, ...prev];
      savePatients(updated);
      return updated;
    });

    try {
      await seedInitialPatients(establishment.codigoRenaes || '00004128', newPatients, establishment);
    } catch (e) {
      console.warn('Error al persistir lote en Firestore:', e);
    }
  };

  // Importar desde Excel
  const handleImportPatientsFromExcel = (importedList: Partial<DntPatient>[]) => {
    setPatients((prev) => {
      const existingMap = new Map(prev.map((p) => [p.dni, p]));
      const newItems: DntPatient[] = [];

      importedList.forEach((imp, idx) => {
        if (!imp.dni) return;
        if (!existingMap.has(imp.dni)) {
          newItems.push({
            id: `p-imp-${Date.now()}-${idx}`,
            redSalud: establishment.redSalud,
            microred: establishment.microred,
            establecimiento: establishment.establecimiento,
            codigoRenaes: establishment.codigoRenaes,
            dni: imp.dni,
            apellidoPaterno: imp.apellidoPaterno || '',
            apellidoMaterno: imp.apellidoMaterno || '',
            nombres: imp.nombres || '',
            nombreCompleto: imp.nombreCompleto || `${imp.nombres || ''} ${imp.apellidoPaterno || ''}`.trim(),
            edad: imp.edad || 48,
            sexo: imp.sexo || 'F',
            direccion: imp.direccion || '',
            telefono: imp.telefono || '',
            tipoSeguro: imp.tipoSeguro || 'SIS',
            numeroHC: imp.numeroHC || `HC-${imp.dni.substring(2)}`,
            tieneHta: false,
            tieneDm: false,
            controles: createEmptyMonthlyControls(),
            fechaCreacion: new Date().toISOString(),
            fechaActualizacion: new Date().toISOString(),
          });
        }
      });

      const updated = [...newItems, ...prev];
      savePatients(updated);
      return updated;
    });
  };

  // Actualizar configuración del establecimiento
  const handleSaveEstablishment = (newConfig: EstablishmentConfig) => {
    setEstablishment(newConfig);
    saveEstablishment(newConfig);
  };

  // Actualizar umbrales clínicos y alertas
  const handleSaveThresholds = (newThresholds: ClinicalThresholds) => {
    setThresholds(newThresholds);
    saveClinicalThresholds(newThresholds);
  };

  const handleResetThresholds = () => {
    const defaults = resetClinicalThresholds();
    setThresholds(defaults);
  };

  // Cálculo de controles pendientes y vencidos
  const dueInfoList = useMemo(() => {
    return getAllPatientsDueInfo(patients, thresholds);
  }, [patients, thresholds]);

  const overduePatients = useMemo(() => {
    return dueInfoList.filter((i) => i.status === 'vencido');
  }, [dueInfoList]);

  const dueTodayPatients = useMemo(() => {
    return dueInfoList.filter((i) => i.status === 'hoy');
  }, [dueInfoList]);

  const totalAlertsCount = useMemo(() => {
    return dueInfoList.filter((i) => i.status !== 'al_dia').length;
  }, [dueInfoList]);

  const hasOverdueAlerts = overduePatients.length > 0;

  // Verificación periódica y notificación al personal médico en segundo plano
  useEffect(() => {
    if (patients.length === 0) return;

    const timer = setTimeout(() => {
      const permission = getNotificationPermissionStatus();
      const settings = getStoredNotificationSettings();

      if (permission === 'granted' && settings.desktopEnabled && overduePatients.length > 0) {
        notifyBatchDueSummary(overduePatients.length, dueTodayPatients.length, settings.soundEnabled);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [patients.length, overduePatients.length, dueTodayPatients.length]);

  // Sincronización periódica en la nube con Firebase Firestore
  useEffect(() => {
    const settings = getStoredCloudSyncSettings();
    setCloudSyncSettings(settings);

    if (!settings.enabled || patients.length === 0) return;

    const intervalMinutes = Math.max(1, settings.intervalMinutes || 15);
    const intervalMs = intervalMinutes * 60 * 1000;

    // Sincronización inicial diferida para no interferir con la carga inicial
    const initialTimer = setTimeout(() => {
      pushPatientsToRemoteCloud(patients, establishment);
    }, 3500);

    // Intervalo de sincronización periódica
    const interval = setInterval(() => {
      pushPatientsToRemoteCloud(patients, establishment);
    }, intervalMs);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [patients, establishment, cloudSyncSettings.enabled, cloudSyncSettings.intervalMinutes]);

  // Verificación y ejecución periódica de copias de seguridad programadas (Drive / Dropbox)
  useEffect(() => {
    if (patients.length === 0) return;

    // Chequeo inicial suave tras 4 segundos
    const initialCheck = setTimeout(() => {
      checkAndRunScheduledBackup(patients, establishment);
    }, 4000);

    // Chequeo periódico cada minuto para detectar la hora programada exacta
    const interval = setInterval(() => {
      checkAndRunScheduledBackup(patients, establishment);
    }, 60 * 1000);

    return () => {
      clearTimeout(initialCheck);
      clearInterval(interval);
    };
  }, [patients, establishment]);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Barra de navegación superior con Contrato de 3 zonas */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenNewPatient={() => {
          setSelectedPatientForEdit(null);
          setSelectedDniForNew(null);
          setIsFormModalOpen(true);
        }}
        onOpenEstablishmentSettings={() => setIsEstablishmentModalOpen(true)}
        onOpenTokenSettings={() => setIsTokenModalOpen(true)}
        onOpenThresholdsSettings={() => setIsThresholdsModalOpen(true)}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
        onOpenCloudSync={() => setIsCloudSyncModalOpen(true)}
        onOpenScheduledBackups={() => setIsScheduledBackupsModalOpen(true)}
        onDownloadBackupJson={() => exportBackupJson(patients, establishment)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        currentUser={currentUser}
        realtimeStatus={realtimeStatus}
        realtimeDetail={realtimeDetail}
        patientsCount={patients.length}
        cloudSyncActive={cloudSyncSettings.enabled}
        alertsCount={totalAlertsCount}
        hasOverdue={hasOverdueAlerts}
        establishment={establishment}
        apiConnected={apiConnected}
      />

      {/* Contenido principal según la vista seleccionada */}
      <main className="flex-1 pb-16">
        {currentTab === 'padron' && (
          <PadronTableView
            patients={patients}
            establishment={establishment}
            thresholds={thresholds}
            currentUser={currentUser}
            onEditPatient={(patient) => {
              setSelectedPatientForEdit(patient);
              setSelectedDniForNew(null);
              setIsFormModalOpen(true);
            }}
            onOpenMonthlyTracking={(patient) => {
              setSelectedPatientForMonthly(patient);
            }}
            onDeletePatient={handleDeletePatient}
            onOpenNewPatient={() => {
              setSelectedPatientForEdit(null);
              setSelectedDniForNew(null);
              setIsFormModalOpen(true);
            }}
            onImportPatients={handleImportPatientsFromExcel}
            onOpenGerencialReport={() => setCurrentTab('reporte-gerencial')}
            onOpenThresholdsSettings={() => setIsThresholdsModalOpen(true)}
            onOpenNotifications={() => setIsNotificationCenterOpen(true)}
          />
        )}

        {currentTab === 'calendario' && (
          <CalendarView
            patients={patients}
            thresholds={thresholds}
            onOpenMonthlyTracking={(patient) => setSelectedPatientForMonthly(patient)}
            onEditPatient={(patient) => {
              setSelectedPatientForEdit(patient);
              setSelectedDniForNew(null);
              setIsFormModalOpen(true);
            }}
            onOpenThresholdsSettings={() => setIsThresholdsModalOpen(true)}
          />
        )}

        {currentTab === 'consulta-dni' && (
          <DniLookupView
            existingPatients={patients}
            onSelectExistingPatient={handleSelectExistingFromDni}
            onCreatePatientFromDni={handleCreatePatientFromDni}
          />
        )}

        {currentTab === 'carga-masiva' && (
          <BulkDniProcessor
            establishment={establishment}
            onAddPatientsToPadron={handleAddBatchPatients}
          />
        )}

        {currentTab === 'consulta-ruc' && (
          <RucLookupView />
        )}

        {currentTab === 'reporte-gerencial' && (
          <GerencialReportView
            patients={patients}
            establishment={establishment}
            thresholds={thresholds}
            onBackToPadron={() => setCurrentTab('padron')}
          />
        )}
      </main>

      {/* Modales de la aplicación */}
      <MedicalNotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        patients={patients}
        thresholds={thresholds}
        onOpenMonthlyTracking={(patient) => setSelectedPatientForMonthly(patient)}
        onEditPatient={(patient) => {
          setSelectedPatientForEdit(patient);
          setSelectedDniForNew(null);
          setIsFormModalOpen(true);
        }}
      />

      <PatientFormModal
        isOpen={isFormModalOpen}
        patient={selectedPatientForEdit}
        initialDniData={selectedDniForNew}
        establishment={establishment}
        currentUser={currentUser}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedPatientForEdit(null);
          setSelectedDniForNew(null);
        }}
        onSave={handleSavePatient}
      />

      <MonthlyTrackingModal
        isOpen={Boolean(selectedPatientForMonthly)}
        patient={selectedPatientForMonthly}
        thresholds={thresholds}
        establishment={establishment}
        currentUser={currentUser}
        onClose={() => setSelectedPatientForMonthly(null)}
        onSave={handleSavePatient}
      />

      <EstablishmentSettingsModal
        isOpen={isEstablishmentModalOpen}
        config={establishment}
        onClose={() => setIsEstablishmentModalOpen(false)}
        onSave={handleSaveEstablishment}
        onOpenCloudSync={() => setIsCloudSyncModalOpen(true)}
        onOpenScheduledBackups={() => setIsScheduledBackupsModalOpen(true)}
        onDownloadBackup={() => exportBackupJson(patients, establishment)}
        patientsCount={patients.length}
      />

      <ScheduledBackupsModal
        isOpen={isScheduledBackupsModalOpen}
        onClose={() => setIsScheduledBackupsModalOpen(false)}
        patients={patients}
        establishment={establishment}
        onManualJsonExport={() => exportBackupJson(patients, establishment)}
      />

      <CloudSyncModal
        isOpen={isCloudSyncModalOpen}
        onClose={() => {
          setIsCloudSyncModalOpen(false);
          setCloudSyncSettings(getStoredCloudSyncSettings());
        }}
        patients={patients}
        establishment={establishment}
        onPatientsImportedFromCloud={(remote) => {
          setPatients(remote);
          savePatients(remote);
        }}
      />

      <ApiTokenSettingsModal
        isOpen={isTokenModalOpen}
        maskedToken={maskedToken}
        onClose={() => setIsTokenModalOpen(false)}
        onTokenUpdated={checkApiStatus}
      />

      <ClinicalThresholdsModal
        isOpen={isThresholdsModalOpen}
        currentThresholds={thresholds}
        onClose={() => setIsThresholdsModalOpen(false)}
        onSave={handleSaveThresholds}
        onReset={handleResetThresholds}
      />

      {/* Modal de Autenticación y Control de Roles Clínicos (RBAC) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        establishment={establishment}
        onUserChange={(updated) => setCurrentUser(updated)}
      />
    </div>
  );
}
