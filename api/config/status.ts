const DEFAULT_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImZhYmlyb2RpMjMxMDk5QGdtYWlsLmNvbSIsImp0aSI6IjcyY2RmNjY1NTk2ZjZhZGlifQ.VcbA2V_a_LTiY0_f3raC0idqWq3Tzw_WKmptnnEsTos';
const BASE_URL = 'https://dniruc.apisperu.com';

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const activeToken = process.env.APISPERU_TOKEN || DEFAULT_TOKEN;
  const isConfigured = Boolean(activeToken && activeToken.length > 20);
  const masked = isConfigured
    ? `${activeToken.substring(0, 8)}...${activeToken.substring(activeToken.length - 8)}`
    : 'No configurado';

  res.status(200).json({
    configured: isConfigured,
    maskedToken: masked,
    provider: 'apisperu.com',
    baseUrl: BASE_URL,
  });
}
