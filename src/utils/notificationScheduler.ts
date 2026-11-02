import { DntPatient, ClinicalThresholds } from '../types/dnt';

export interface PatientControlDueInfo {
  patient: DntPatient;
  lastControlDate: string | null;
  lastControlSource: 'control' | 'tamizaje' | 'creacion' | 'ninguno';
  nextDueDate: string; // YYYY-MM-DD
  daysSinceLastControl: number;
  daysUntilDue: number; // negativo si ya venció, 0 si es hoy, positivo si faltan días
  status: 'vencido' | 'hoy' | 'proximo' | 'al_dia';
  riskLevel: 'alto' | 'medio' | 'bajo';
  diagnosticoLabel: string;
}

export interface NotificationSettings {
  desktopEnabled: boolean;
  soundEnabled: boolean;
  autoNotifyIntervalMinutes: number; // 0 = deshabilitado, 15, 30, 60
}

const STORAGE_KEY_SETTINGS = 'medconsulta_dnt_notification_settings_v1';
const STORAGE_KEY_NOTIFIED_LOG = 'medconsulta_dnt_notified_log_v1';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  desktopEnabled: true,
  soundEnabled: true,
  autoNotifyIntervalMinutes: 30,
};

/**
 * Obtiene la configuración de notificaciones guardada
 */
export function getStoredNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

/**
 * Guarda la configuración de notificaciones
 */
export function saveNotificationSettings(settings: NotificationSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving notification settings:', e);
  }
}

/**
 * Verifica el estado actual del permiso de notificaciones del navegador
 */
export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Solicita permiso al usuario para mostrar notificaciones de escritorio
 */
export async function requestDesktopNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    console.error('Error requesting notification permission:', e);
    return 'denied';
  }
}

/**
 * Sintetizador Web Audio API para emitir un aviso sonoro agradable y profesional sin dependencias externas
 */
export function playMedicalChime(type: 'alert' | 'urgent' | 'reminder' | 'success' = 'reminder'): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === 'urgent') {
      // Doble tono alto de alerta urgente médica (880Hz -> 1046Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(1046.5, now + 0.12);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(523.25, now + 0.12);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);
    } else {
      // Timbre armónico suave y claro (523.25Hz C5 -> 659.25Hz E5 -> 783.99Hz G5)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.2);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.55);
    }
  } catch (e) {
    console.warn('Audio chime could not be played:', e);
  }
}

/**
 * Envía una notificación nativa de escritorio del navegador
 */
export function sendDesktopNotification(
  title: string,
  options?: NotificationOptions,
  playSound: boolean = true,
  chimeType: 'alert' | 'urgent' | 'reminder' | 'success' = 'reminder'
): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    const defaultOptions: NotificationOptions = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'dnt-control-reminder',
      silent: false,
      ...options,
    };

    const notif = new Notification(title, defaultOptions);
    
    // Auto cerrar notificación después de 8 segundos si el sistema operativo no lo hace
    setTimeout(() => {
      try {
        notif.close();
      } catch {
        // Ignorar si ya se cerró
      }
    }, 8000);

    if (playSound) {
      playMedicalChime(chimeType);
    }

    return true;
  } catch (e) {
    console.error('Error dispatching desktop notification:', e);
    return false;
  }
}

/**
 * Formatea una fecha YYYY-MM-DD o ISO a formato peruano DD/MM/YYYY
 */
export function formatPeruDate(dateStr?: string | null): string {
  if (!dateStr) return 'No registrado';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${d}/${m}/${y}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  } catch {
    // fallback
  }
  return dateStr;
}

/**
 * Calcula la información detallada del vencimiento del próximo control mensual de un paciente
 */
export function getPatientControlDueInfo(
  patient: DntPatient,
  caducidadDias: number = 30,
  preventivaDias: number = 7
): PatientControlDueInfo {
  // 1. Determinar diagnóstico
  const diagnosticoParts: string[] = [];
  if (patient.tieneHta) diagnosticoParts.push('HTA');
  if (patient.tieneDm) diagnosticoParts.push(patient.tipoDm === 'DM1' ? 'DM 1' : 'DM 2');
  if (patient.tieneDislipidemia) diagnosticoParts.push('Dislipidemia');

  const diagnosticoLabel = diagnosticoParts.length > 0 
    ? diagnosticoParts.join(' + ') 
    : 'Sin diagnóstico crónico';

  // 2. Buscar último control registrado atendido
  let lastDate: Date | null = null;
  let lastDateStr: string | null = null;
  let source: 'control' | 'tamizaje' | 'creacion' | 'ninguno' = 'ninguno';

  if (patient.controles) {
    const controlDates: { date: Date; dateStr: string }[] = [];
    Object.values(patient.controles).forEach((ctrl) => {
      if (ctrl.atendido && ctrl.fecha) {
        const d = new Date(ctrl.fecha);
        if (!isNaN(d.getTime())) {
          controlDates.push({ date: d, dateStr: ctrl.fecha });
        }
      }
    });

    if (controlDates.length > 0) {
      controlDates.sort((a, b) => b.date.getTime() - a.date.getTime());
      lastDate = controlDates[0].date;
      lastDateStr = controlDates[0].dateStr;
      source = 'control';
    }
  }

  // Si no tiene controles mensuales, verificar fecha de tamizaje
  if (!lastDate && patient.fechaTamizaje) {
    const d = new Date(patient.fechaTamizaje);
    if (!isNaN(d.getTime())) {
      lastDate = d;
      lastDateStr = patient.fechaTamizaje;
      source = 'tamizaje';
    }
  }

  // Fallback a fecha de ingreso/creación
  if (!lastDate && patient.fechaCreacion) {
    const d = new Date(patient.fechaCreacion);
    if (!isNaN(d.getTime())) {
      lastDate = d;
      lastDateStr = patient.fechaCreacion.split('T')[0];
      source = 'creacion';
    }
  }

  // Si no hay ninguna fecha registrada, usar fecha de hace caducidadDias + 1
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!lastDate) {
    const fallbackDate = new Date(today);
    fallbackDate.setDate(fallbackDate.getDate() - (caducidadDias + 5));
    lastDate = fallbackDate;
    lastDateStr = fallbackDate.toISOString().split('T')[0];
    source = 'ninguno';
  }

  // 3. Calcular días desde el último control
  const lastDateTime = new Date(lastDate);
  lastDateTime.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - lastDateTime.getTime();
  const daysSinceLastControl = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  // 4. Calcular fecha del próximo control programado (lastDate + caducidadDias)
  const nextDueDateObj = new Date(lastDateTime);
  nextDueDateObj.setDate(nextDueDateObj.getDate() + caducidadDias);
  const nextDueDate = nextDueDateObj.toISOString().split('T')[0];

  // 5. Días restantes hasta la fecha de vencimiento
  // Si nextDueDateObj es hoy -> 0
  // Si nextDueDateObj es futuro -> > 0
  // Si nextDueDateObj es pasado -> < 0
  const diffDueMs = nextDueDateObj.getTime() - today.getTime();
  const daysUntilDue = Math.round(diffDueMs / (1000 * 60 * 60 * 24));

  // 6. Estado de control
  let status: 'vencido' | 'hoy' | 'proximo' | 'al_dia';
  if (daysUntilDue < 0) {
    status = 'vencido';
  } else if (daysUntilDue === 0) {
    status = 'hoy';
  } else if (daysUntilDue <= preventivaDias) {
    status = 'proximo';
  } else {
    status = 'al_dia';
  }

  // 7. Nivel de riesgo clínico para priorización en notificaciones
  let riskLevel: 'alto' | 'medio' | 'bajo' = 'bajo';
  const hasBoth = Boolean(patient.tieneHta && patient.tieneDm);
  const isHighOverdue = daysSinceLastControl > (caducidadDias + 15);
  const isOldAge = patient.edad >= 65;

  if (hasBoth || isHighOverdue || patient.riesgoCardiovascular === 'MUY_ALTO') {
    riskLevel = 'alto';
  } else if (patient.tieneHta || patient.tieneDm || isOldAge || status === 'vencido') {
    riskLevel = 'medio';
  }

  return {
    patient,
    lastControlDate: lastDateStr,
    lastControlSource: source,
    nextDueDate,
    daysSinceLastControl,
    daysUntilDue,
    status,
    riskLevel,
    diagnosticoLabel,
  };
}

/**
 * Obtiene la lista completa de información de control para todos los pacientes
 */
export function getAllPatientsDueInfo(
  patients: DntPatient[],
  thresholds?: ClinicalThresholds
): PatientControlDueInfo[] {
  const caducidad = thresholds?.diasCaducidadControl ?? 30;
  const preventiva = thresholds?.alertaPreventivaDias ?? 7;

  return patients.map((p) => getPatientControlDueInfo(p, caducidad, preventiva));
}

/**
 * Envía una notificación de escritorio específica para un paciente que debe acudir a su control
 */
export function notifyPatientDue(
  info: PatientControlDueInfo,
  playSound: boolean = true
): boolean {
  const p = info.patient;
  let title = '';
  let body = '';
  let chime: 'alert' | 'urgent' | 'reminder' | 'success' = 'reminder';

  if (info.status === 'vencido') {
    const diasVencido = Math.abs(info.daysUntilDue);
    title = `Control Vencido (${diasVencido} d): ${p.nombreCompleto}`;
    body = `DNI: ${p.dni} | HC: ${p.numeroHC} | Condición: ${info.diagnosticoLabel}\nDebió acudir el ${formatPeruDate(info.nextDueDate)}. Contactar al ${p.telefono || 'sin teléfono'}.`;
    chime = 'urgent';
  } else if (info.status === 'hoy') {
    title = `Control Programado HOY: ${p.nombreCompleto}`;
    body = `DNI: ${p.dni} | HC: ${p.numeroHC} | Condición: ${info.diagnosticoLabel}\nEl paciente tiene programado su control mensual el día de hoy.`;
    chime = 'alert';
  } else {
    title = `Próximo Control (${info.daysUntilDue} días): ${p.nombreCompleto}`;
    body = `DNI: ${p.dni} | HC: ${p.numeroHC} | Condición: ${info.diagnosticoLabel}\nFecha estimada de control: ${formatPeruDate(info.nextDueDate)}.`;
    chime = 'reminder';
  }

  return sendDesktopNotification(
    title,
    {
      body,
      tag: `patient-due-${p.id}`,
      data: { patientId: p.id, dni: p.dni },
    },
    playSound,
    chime
  );
}

/**
 * Notificación consolidada de resumen cuando hay varios pacientes pendientes
 */
export function notifyBatchDueSummary(
  overdueCount: number,
  dueTodayCount: number,
  playSound: boolean = true
): boolean {
  const title = `Aviso Clínico DNT: ${overdueCount} Controles Vencidos`;
  const body = `${overdueCount} pacientes con HTA/Diabetes han superado los 30 días sin control mensual. ${dueTodayCount > 0 ? `${dueTodayCount} pacientes programados para hoy.` : ''} Revise el Centro de Notificaciones.`;

  return sendDesktopNotification(
    title,
    {
      body,
      tag: 'batch-due-summary',
    },
    playSound,
    'urgent'
  );
}

/**
 * Verifica si ya se notificó a este paciente hoy para evitar alertas repetitivas
 */
export function shouldNotifyPatientToday(patientId: string, status: string): boolean {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFIED_LOG);
    const log: Record<string, string> = raw ? JSON.parse(raw) : {};

    const key = `${patientId}_${status}`;
    if (log[key] === todayStr) {
      return false; // Ya fue notificado hoy con ese estado
    }
    return true;
  } catch {
    return true;
  }
}

/**
 * Registra que se ha notificado a un paciente el día de hoy
 */
export function markPatientNotifiedToday(patientId: string, status: string): void {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFIED_LOG);
    const log: Record<string, string> = raw ? JSON.parse(raw) : {};

    const key = `${patientId}_${status}`;
    log[key] = todayStr;
    localStorage.setItem(STORAGE_KEY_NOTIFIED_LOG, JSON.stringify(log));
  } catch (e) {
    console.error('Error logging notified patient:', e);
  }
}
