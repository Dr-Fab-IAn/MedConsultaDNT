import { validateRuc } from '../../src/utils/identificationValidation';

const DEFAULT_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImZhYmlyb2RpMjMxMDk5QGdtYWlsLmNvbSIsImp0aSI6IjcyY2RmNjY1NTk2ZjZhZGlifQ.VcbA2V_a_LTiY0_f3raC0idqWq3Tzw_WKmptnnEsTos';
const BASE_URL = 'https://dniruc.apisperu.com';

export default async function handler(req: any, res: any) {
  // Manejo de CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const rucParam = req.query?.ruc || (typeof req.url === 'string' ? req.url.split('?')[0].split('/').filter(Boolean).pop() : '');
  const ruc = String(rucParam || '').trim();

  const validation = validateRuc(ruc);
  if (!validation.isValid) {
    res.status(400).json({
      success: false,
      message: validation.error || 'El número de RUC es inválido según Módulo 11 SUNAT.',
    });
    return;
  }

  const activeToken = process.env.APISPERU_TOKEN || DEFAULT_TOKEN;

  try {
    const url = `${BASE_URL}/api/v1/ruc/${validation.cleanRuc}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${activeToken}`,
      },
    });

    const data: any = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `Error del servicio externo (${response.status})`;
      res.status(response.status).json({
        success: false,
        message: errorMsg,
        status: response.status,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error: any) {
    console.error('Error al consultar RUC:', error);
    res.status(500).json({
      success: false,
      message: error?.message || 'Error interno al comunicarse con apisperu.com',
    });
  }
}
