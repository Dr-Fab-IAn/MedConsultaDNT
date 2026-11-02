import { DniQueryResult, RucQueryResult } from '../types/dnt';
import { validateDni, validateRuc } from '../utils/identificationValidation';

export interface ApiStatusResponse {
  configured: boolean;
  maskedToken: string;
  provider: string;
  baseUrl: string;
}

export async function queryDni(dni: string): Promise<DniQueryResult> {
  const validation = validateDni(dni);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Número de DNI inválido.');
  }

  const cleanDni = validation.cleanDni;

  const response = await fetch(`/api/dni/${cleanDni}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  const resJson = await response.json().catch(() => ({}));

  if (!response.ok || !resJson.success) {
    throw new Error(resJson.message || `No se pudo encontrar el DNI ${cleanDni} en el padrón.`);
  }

  return resJson.data as DniQueryResult;
}

export async function queryRuc(ruc: string): Promise<RucQueryResult> {
  const validation = validateRuc(ruc);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Número de RUC inválido.');
  }

  const cleanRuc = validation.cleanRuc;

  const response = await fetch(`/api/ruc/${cleanRuc}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  const resJson = await response.json().catch(() => ({}));

  if (!response.ok || !resJson.success) {
    throw new Error(resJson.message || `No se pudo encontrar el RUC ${cleanRuc} en el padrón.`);
  }

  return resJson.data as RucQueryResult;
}

export async function getApiStatus(): Promise<ApiStatusResponse> {
  const response = await fetch('/api/config/status');
  if (!response.ok) {
    throw new Error('No se pudo verificar el estado del API');
  }
  return response.json();
}

export async function updateApiToken(token: string): Promise<{ success: boolean; maskedToken: string; message: string }> {
  const response = await fetch('/api/config/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Error al actualizar el token');
  }
  return data;
}
