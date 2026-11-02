/**
 * Utilidades de validación y verificación de checksum para DNI (RENIEC) y RUC (SUNAT) en el Perú.
 * Implementa las especificaciones matemáticas oficiales de Módulo 11 para evitar consultas
 * erróneas a las APIs externas y brindar retroalimentación visual inmediata al usuario.
 */

export interface DniValidationResult {
  isValid: boolean;
  cleanDni: string;
  error?: string;
  warning?: string;
  calculatedCheckDigit?: number;
  calculatedCheckLetter?: string;
  lengthStatus: 'empty' | 'incomplete' | 'complete' | 'overflow';
}

export interface RucValidationResult {
  isValid: boolean;
  cleanRuc: string;
  error?: string;
  entityType?: string;
  calculatedCheckDigit?: number;
  providedCheckDigit?: number;
  lengthStatus: 'empty' | 'incomplete' | 'complete' | 'overflow';
}

// Factores ponderados oficiales RENIEC para los 8 dígitos del DNI
const DNI_WEIGHTS = [3, 2, 7, 6, 5, 4, 3, 2];

// Tablas de conversión RENIEC según residuo de Módulo 11 (suma % 11)
const DNI_HASH_NUMEROS = [6, 7, 8, 9, 0, 1, 1, 2, 3, 4, 5];
const DNI_HASH_LETRAS = ['K', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

// Factores ponderados oficiales SUNAT para los primeros 10 dígitos del RUC
const RUC_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

// Prefijos válidos de RUC en el Perú
const RUC_VALID_PREFIXES = ['10', '15', '16', '17', '20'];

/**
 * Calcula el Dígito / Carácter Verificador oficial de RENIEC para un DNI de 8 dígitos
 */
export function calculateDniCheckChar(dni8: string): { digit: number; letter: string } | null {
  const clean = dni8.replace(/\D/g, '');
  if (clean.length !== 8) return null;

  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(clean[i], 10) * DNI_WEIGHTS[i];
  }

  const remainder = sum % 11;
  return {
    digit: DNI_HASH_NUMEROS[remainder],
    letter: DNI_HASH_LETRAS[remainder],
  };
}

/**
 * Valida un número de DNI según formato, restricciones de secuencias degeneradas
 * y cálculo de dígito de verificación oficial de RENIEC.
 * Si el usuario ingresa 9 caracteres (ej. "12345678-5" o "12345678K"), valida el checksum completo.
 */
export function validateDni(rawDni: string): DniValidationResult {
  const trimmed = (rawDni || '').trim().toUpperCase();
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (!trimmed) {
    return {
      isValid: false,
      cleanDni: '',
      lengthStatus: 'empty',
    };
  }

  // Comprobar si se ingresó con dígito de verificación (ej. 12345678-5 o 12345678-K o 9 caracteres)
  const hasProvidedCheck = trimmed.includes('-') || (digitsOnly.length === 9) || (digitsOnly.length === 8 && /[A-Z]$/.test(trimmed));
  const baseDni = digitsOnly.slice(0, 8);

  if (digitsOnly.length < 8) {
    return {
      isValid: false,
      cleanDni: digitsOnly,
      lengthStatus: 'incomplete',
      error: `Incompleto: ${digitsOnly.length} de 8 dígitos`,
    };
  }

  if (digitsOnly.length > 9 || (!hasProvidedCheck && digitsOnly.length > 8)) {
    return {
      isValid: false,
      cleanDni: digitsOnly,
      lengthStatus: 'overflow',
      error: 'Longitud excesiva: el DNI consta de 8 dígitos',
    };
  }

  // Comprobar dígitos idénticos o repetidos (ej. 00000000, 11111111, 99999999)
  if (/^(\d)\1{7}$/.test(baseDni)) {
    return {
      isValid: false,
      cleanDni: baseDni,
      lengthStatus: 'complete',
      error: 'DNI inválido: secuencia de dígitos idénticos no permitida',
    };
  }

  // Comprobar secuencias numéricas triviales
  if (baseDni === '12345678' || baseDni === '87654321') {
    return {
      isValid: false,
      cleanDni: baseDni,
      lengthStatus: 'complete',
      error: 'DNI inválido: secuencia numérica de prueba no admitida',
    };
  }

  const check = calculateDniCheckChar(baseDni);
  if (!check) {
    return {
      isValid: false,
      cleanDni: baseDni,
      lengthStatus: 'incomplete',
      error: 'No se pudo calcular el dígito de control',
    };
  }

  // Si se ingresó dígito de control explícito (el noveno caracter o tras un guión)
  if (hasProvidedCheck) {
    const providedCheck = trimmed.split('-')[1] || trimmed.slice(8);
    const normalizedProvided = providedCheck.trim();

    const matchesDigit = normalizedProvided === String(check.digit);
    const matchesLetter = normalizedProvided === check.letter;

    if (!matchesDigit && !matchesLetter) {
      return {
        isValid: false,
        cleanDni: baseDni,
        lengthStatus: 'complete',
        calculatedCheckDigit: check.digit,
        calculatedCheckLetter: check.letter,
        error: `Dígito verificador incorrecto: se esperaba ${check.digit} (o letra ${check.letter}), pero ingresó "${normalizedProvided}"`,
      };
    }
  }

  return {
    isValid: true,
    cleanDni: baseDni,
    lengthStatus: 'complete',
    calculatedCheckDigit: check.digit,
    calculatedCheckLetter: check.letter,
  };
}

/**
 * Calcula el Dígito Verificador oficial de la SUNAT mediante Módulo 11 para los primeros 10 dígitos de un RUC
 */
export function calculateRucCheckDigit(ruc10: string): number | null {
  const clean = ruc10.replace(/\D/g, '');
  if (clean.length < 10) return null;

  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean[i], 10) * RUC_WEIGHTS[i];
  }

  const remainder = sum % 11;
  const calculated = 11 - remainder;

  if (calculated === 10) return 0;
  if (calculated === 11) return 1;
  return calculated;
}

/**
 * Valida un número de RUC según:
 * 1. Longitud exacta de 11 dígitos numéricos
 * 2. Prefijo oficial SUNAT (10, 15, 16, 17 o 20)
 * 3. Algoritmo oficial SUNAT Módulo 11 para el dígito de control (11º dígito)
 */
export function validateRuc(rawRuc: string): RucValidationResult {
  const cleanRuc = (rawRuc || '').trim().replace(/\D/g, '');

  if (!cleanRuc) {
    return {
      isValid: false,
      cleanRuc: '',
      lengthStatus: 'empty',
    };
  }

  if (cleanRuc.length < 11) {
    return {
      isValid: false,
      cleanRuc,
      lengthStatus: 'incomplete',
      error: `Incompleto: ${cleanRuc.length} de 11 dígitos`,
    };
  }

  if (cleanRuc.length > 11) {
    return {
      isValid: false,
      cleanRuc,
      lengthStatus: 'overflow',
      error: `Longitud excesiva: el RUC debe tener 11 dígitos (${cleanRuc.length} ingresados)`,
    };
  }

  // 1. Validar prefijos oficiales de SUNAT
  const prefix = cleanRuc.slice(0, 2);
  let entityType = '';

  if (prefix === '10') {
    entityType = 'Persona Natural con RUC';
  } else if (prefix === '15') {
    entityType = 'Persona Natural Extranjera (Carné de Extranjería)';
  } else if (prefix === '16') {
    entityType = 'Persona Natural (Rentas Especiales)';
  } else if (prefix === '17') {
    entityType = 'Persona Natural Extranjera (Pasaporte)';
  } else if (prefix === '20') {
    entityType = 'Persona Jurídica (Empresa / Institución Pública)';
  } else {
    return {
      isValid: false,
      cleanRuc,
      lengthStatus: 'complete',
      error: `Prefijo "${prefix}" no válido. SUNAT solo admite RUC iniciados en 10, 15, 16, 17 o 20`,
    };
  }

  // 2. Comprobar secuencias repetitivas degeneradas
  if (/^(\d)\1{10}$/.test(cleanRuc)) {
    return {
      isValid: false,
      cleanRuc,
      lengthStatus: 'complete',
      error: 'RUC inválido: secuencia de dígitos idénticos no permitida',
    };
  }

  // 3. Algoritmo Módulo 11 de la SUNAT
  const calculatedCheck = calculateRucCheckDigit(cleanRuc.slice(0, 10));
  const providedCheck = parseInt(cleanRuc[10], 10);

  if (calculatedCheck === null || calculatedCheck !== providedCheck) {
    return {
      isValid: false,
      cleanRuc,
      lengthStatus: 'complete',
      entityType,
      calculatedCheckDigit: calculatedCheck ?? undefined,
      providedCheckDigit: providedCheck,
      error: `Dígito verificador inválido (Módulo 11 SUNAT): el último dígito debe ser ${calculatedCheck}, pero ingresó ${providedCheck}`,
    };
  }

  return {
    isValid: true,
    cleanRuc,
    lengthStatus: 'complete',
    entityType,
    calculatedCheckDigit: calculatedCheck,
    providedCheckDigit: providedCheck,
  };
}
