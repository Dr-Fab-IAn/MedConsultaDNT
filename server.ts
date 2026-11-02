import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateDni, validateRuc } from './src/utils/identificationValidation';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Token default from user credentials or environment variable
let activeToken = process.env.APISPERU_TOKEN || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImZhYmlyb2RpMjMxMDk5QGdtYWlsLmNvbSIsImp0aSI6IjcyY2RmNjY1NTk2ZjZhZGlifQ.VcbA2V_a_LTiY0_f3raC0idqWq3Tzw_WKmptnnEsTos';

const BASE_URL = 'https://dniruc.apisperu.com';

// Endpoint para consultar DNI (8 dígitos) por ruta o query param
const handleDniQuery = async (rawDni: string, res: Response): Promise<void> => {
  const dni = (rawDni || '').trim();
  const validation = validateDni(dni);
  if (!validation.isValid) {
    res.status(400).json({
      success: false,
      message: validation.error || 'El número de DNI es inválido según especificación RENIEC.',
    });
    return;
  }

  const cleanDni = validation.cleanDni;

  try {
    const url = `${BASE_URL}/api/v1/dni/${cleanDni}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${activeToken}`,
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `Error del servicio externo (${response.status})`;
      res.status(response.status).json({
        success: false,
        message: errorMsg,
        status: response.status,
      });
      return;
    }

    // Normalizar respuesta
    const normalized = {
      dni: data?.dni || dni,
      nombres: data?.nombres || '',
      apellidoPaterno: data?.apellidoPaterno || '',
      apellidoMaterno: data?.apellidoMaterno || '',
      nombreCompleto: data?.nombreCompleto || `${data?.nombres || ''} ${data?.apellidoPaterno || ''} ${data?.apellidoMaterno || ''}`.trim(),
      codVerifica: data?.codVerifica || '',
    };

    res.json({
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
};

app.get('/api/dni/:dni', (req: Request, res: Response) => handleDniQuery(req.params.dni, res));
app.get('/api/dni', (req: Request, res: Response) => handleDniQuery((req.query.dni as string) || '', res));

// Endpoint para consultar RUC (11 dígitos) por ruta o query param
const handleRucQuery = async (rawRuc: string, res: Response): Promise<void> => {
  const ruc = (rawRuc || '').trim();
  const validation = validateRuc(ruc);
  if (!validation.isValid) {
    res.status(400).json({
      success: false,
      message: validation.error || 'El número de RUC es inválido según Módulo 11 SUNAT.',
    });
    return;
  }

  const cleanRuc = validation.cleanRuc;

  try {
    const url = `${BASE_URL}/api/v1/ruc/${cleanRuc}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${activeToken}`,
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `Error del servicio externo (${response.status})`;
      res.status(response.status).json({
        success: false,
        message: errorMsg,
        status: response.status,
      });
      return;
    }

    res.json({
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
};

app.get('/api/ruc/:ruc', (req: Request, res: Response) => handleRucQuery(req.params.ruc, res));
app.get('/api/ruc', (req: Request, res: Response) => handleRucQuery((req.query.ruc as string) || '', res));

// Estado de configuración y token
app.get('/api/config/status', (req: Request, res: Response) => {
  const isConfigured = Boolean(activeToken && activeToken.length > 20);
  const masked = isConfigured
    ? `${activeToken.substring(0, 8)}...${activeToken.substring(activeToken.length - 8)}`
    : 'No configurado';

  res.json({
    configured: isConfigured,
    maskedToken: masked,
    provider: 'apisperu.com',
    baseUrl: BASE_URL,
  });
});

// Actualizar token en memoria
app.post('/api/config/token', (req: Request, res: Response): void => {
  const { token } = req.body;
  if (!token || typeof token !== 'string' || token.trim().length < 15) {
    res.status(400).json({
      success: false,
      message: 'Token inválido. Ingrese el token Bearer completo proporcionado por apisperu.com.',
    });
    return;
  }

  activeToken = token.trim();
  res.json({
    success: true,
    message: 'Token actualizado exitosamente en el servidor.',
    maskedToken: `${activeToken.substring(0, 8)}...${activeToken.substring(activeToken.length - 8)}`,
  });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Servidor MedConsulta DNT escuchando en http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
