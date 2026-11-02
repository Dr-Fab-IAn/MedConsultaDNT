const DEFAULT_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImZhYmlyb2RpMjMxMDk5QGdtYWlsLmNvbSIsImp0aSI6IjcyY2RmNjY1NTk2ZjZhZGlifQ.VcbA2V_a_LTiY0_f3raC0idqWq3Tzw_WKmptnnEsTos';
const BASE_URL = 'https://dniruc.apisperu.com';

export default async function handler(req: any, res: any) {
  // Configuración exhaustiva de CORS para evitar bloqueos en el navegador
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Extraer DNI de req.query.dni o de la URL (/api/dni/12345678)
  let rawDni = req.query?.dni;
  if (!rawDni && typeof req.url === 'string') {
    const urlParts = req.url.split('?')[0].split('/').filter(Boolean);
    const candidate = urlParts[urlParts.length - 1];
    if (candidate && candidate !== '[dni]' && candidate !== 'dni') {
      rawDni = candidate;
    }
  }

  const cleanDni = String(rawDni || '').replace(/\D/g, '').slice(0, 8);

  if (!cleanDni || cleanDni.length !== 8) {
    res.status(400).json({
      success: false,
      message: `DNI inválido (${rawDni || 'vacío'}). Debe constar de 8 dígitos numéricos.`,
    });
    return;
  }

  const activeToken = (process.env.APISPERU_TOKEN || DEFAULT_TOKEN).trim();

  try {
    const url = `${BASE_URL}/api/v1/dni/${cleanDni}`;
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

    const normalized = {
      dni: data?.dni || cleanDni,
      nombres: data?.nombres || '',
      apellidoPaterno: data?.apellidoPaterno || '',
      apellidoMaterno: data?.apellidoMaterno || '',
      nombreCompleto: data?.nombreCompleto || `${data?.nombres || ''} ${data?.apellidoPaterno || ''} ${data?.apellidoMaterno || ''}`.trim(),
      codVerifica: data?.codVerifica ?? '',
    };

    res.status(200).json({
      success: true,
      data: normalized,
      raw: data,
    });
  } catch (error: any) {
    console.error('Error al consultar DNI:', error);
    res.status(500).json({
      success: false,
      message: error?.message || 'Error interno al comunicarse con apisperu.com',
    });
  }
}
