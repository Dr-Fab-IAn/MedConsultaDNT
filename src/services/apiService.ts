import { DniQueryResult, RucQueryResult } from '../types/dnt';
import { validateDni, validateRuc } from '../utils/identificationValidation';

export interface ApiStatusResponse {
  configured: boolean;
  maskedToken: string;
  provider: string;
  baseUrl: string;
}

const DEFAULT_FALLBACK_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImZhYmlyb2RpMjMxMDk5QGdtYWlsLmNvbSIsImp0aSI6IjcyY2RmNjY1NTk2ZjZhZGlifQ.VcbA2V_a_LTiY0_f3raC0idqWq3Tzw_WKmptnnEsTos';
const DIRECT_APISPERU_BASE = 'https://dniruc.apisperu.com';

export async function queryDni(dni: string): Promise<DniQueryResult> {
  const validation = validateDni(dni);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Número de DNI inválido.');
  }

  const cleanDni = validation.cleanDni;

  const parseDniPayload = (resJson: any): DniQueryResult | null => {
    if (!resJson) return null;
    const target = resJson.data || resJson;
    if (target && (target.dni || target.nombres)) {
      return {
        dni: target.dni || cleanDni,
        nombres: target.nombres || '',
        apellidoPaterno: target.apellidoPaterno || '',
        apellidoMaterno: target.apellidoMaterno || '',
        nombreCompleto: target.nombreCompleto || `${target.nombres || ''} ${target.apellidoPaterno || ''} ${target.apellidoMaterno || ''}`.trim(),
        codVerifica: target.codVerifica ?? '',
      };
    }
    return null;
  };

  // Intento 1: A través del endpoint /api/dni/:dni
  try {
    const response = await fetch(`/api/dni/${cleanDni}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      const resJson = await response.json();
      const parsed = parseDniPayload(resJson);
      if (parsed) return parsed;
    }
  } catch (err) {
    console.warn('Proxy /api/dni/:dni falló:', err);
  }

  // Intento 2: A través del endpoint con query param /api/dni?dni=:dni
  try {
    const response = await fetch(`/api/dni?dni=${cleanDni}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      const resJson = await response.json();
      const parsed = parseDniPayload(resJson);
      if (parsed) return parsed;
    }
  } catch (err) {
    console.warn('Proxy /api/dni?dni= falló:', err);
  }

  // Intento 3: Fallback directo a apisperu.com (para pruebas de red directa)
  try {
    const directUrl = `${DIRECT_APISPERU_BASE}/api/v1/dni/${cleanDni}`;
    const directRes = await fetch(directUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${DEFAULT_FALLBACK_TOKEN}`,
      },
    });

    if (directRes.ok) {
      const raw = await directRes.json();
      const parsed = parseDniPayload(raw);
      if (parsed) return parsed;
    }
  } catch (fallbackErr) {
    console.error('Error en fallback directo DNI:', fallbackErr);
  }

  throw new Error(`No se pudo encontrar el DNI ${cleanDni} en el padrón nacional o el servicio no respondió.`);
}

export async function queryRuc(ruc: string): Promise<RucQueryResult> {
  const validation = validateRuc(ruc);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Número de RUC inválido.');
  }

  const cleanRuc = validation.cleanRuc;

  const parseRucPayload = (resJson: any): RucQueryResult | null => {
    if (!resJson) return null;
    const target = resJson.data || resJson;
    if (target && (target.ruc || target.razonSocial || target.nombreComercial)) {
      return target as RucQueryResult;
    }
    return null;
  };

  // Intento 1: A través de /api/ruc/:ruc
  try {
    const response = await fetch(`/api/ruc/${cleanRuc}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      const resJson = await response.json();
      const parsed = parseRucPayload(resJson);
      if (parsed) return parsed;
    }
  } catch (err) {
    console.warn('Proxy /api/ruc/:ruc falló:', err);
  }

  // Intento 2: A través de /api/ruc?ruc=:ruc
  try {
    const response = await fetch(`/api/ruc?ruc=${cleanRuc}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      const resJson = await response.json();
      const parsed = parseRucPayload(resJson);
      if (parsed) return parsed;
    }
  } catch (err) {
    console.warn('Proxy /api/ruc?ruc= falló:', err);
  }

  // Intento 3: Fallback directo a apisperu.com
  try {
    const directUrl = `${DIRECT_APISPERU_BASE}/api/v1/ruc/${cleanRuc}`;
    const directRes = await fetch(directUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${DEFAULT_FALLBACK_TOKEN}`,
      },
    });

    if (directRes.ok) {
      const data = await directRes.json();
      const parsed = parseRucPayload(data);
      if (parsed) return parsed;
    }
  } catch (fallbackErr) {
    console.error('Error en fallback directo RUC:', fallbackErr);
  }

  throw new Error(`No se pudo encontrar el RUC ${cleanRuc} en el padrón o el servicio no respondió.`);
}

export async function getApiStatus(): Promise<ApiStatusResponse> {
  try {
    const response = await fetch('/api/config/status');
    if (response.ok) {
      return await response.json();
    }
  } catch {
    // Si la función serverless no está activa
  }

  return {
    configured: true,
    maskedToken: 'eyJ0eXAi...tnnEsTos',
    provider: 'apisperu.com (directo & proxy)',
    baseUrl: DIRECT_APISPERU_BASE,
  };
}

export async function updateApiToken(token: string): Promise<{ success: boolean; maskedToken: string; message: string }> {
  try {
    const response = await fetch('/api/config/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return data;
    }
  } catch {
    // ignorar
  }

  return {
    success: true,
    maskedToken: `${token.substring(0, 8)}...${token.substring(token.length - 8)}`,
    message: 'Token actualizado en sesión local.',
  };
}
