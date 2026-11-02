import * as XLSX from 'xlsx';
import { DntPatient, EstablishmentConfig } from '../types/dnt';
import { MESES_DEL_ANIO } from '../utils/clinicalCalculations';

/**
 * Genera la estructura de filas y celdas para el Padrón Nominal Oficial de Daños No Transmisibles
 */
export function exportPadronToExcel(
  patients: DntPatient[],
  establishment: EstablishmentConfig,
  fileName: string = 'Padron_DNT_Oficial',
  fileFormat: 'xls' | 'xlsx' = 'xls'
): string {
  // Fila 1: Encabezados de Grupos Mayores
  const row1: string[] = [
    // Identificación (15 columnas)
    'DATOS DE IDENTIFICACIÓN Y UBICACIÓN',
    '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    // Antropometría y Tamizaje (8 columnas)
    'TAMIZAJE Y VALORACIÓN ANTROPOMÉTRICA',
    '', '', '', '', '', '', '',
    // Hipertensión Arterial (4 columnas)
    'HIPERTENSIÓN ARTERIAL (HTA)',
    '', '', '',
    // Diabetes Mellitus (7 columnas)
    'DIABETES MELLITUS (DM)',
    '', '', '', '', '', '',
    // Dislipidemia y RCV (5 columnas)
    'DISLIPIDEMIA Y RIESGO CARDIOVASCULAR',
    '', '', '', ''
  ];

  // Agregar títulos de grupo para los 12 meses
  MESES_DEL_ANIO.forEach((mes) => {
    row1.push(`SEGUIMIENTO - ${mes.nombre.toUpperCase()}`);
    row1.push('', '', '', '', '', '', '');
  });
  row1.push('OBSERVACIONES CLÍNICAS');

  // Fila 2: Sub-encabezados específicos de columnas
  const row2: string[] = [
    'N°',
    'RED',
    'MICRORED',
    'ESTABLECIMIENTO',
    'RENAES',
    'DNI',
    'APELLIDO PATERNO',
    'APELLIDO MATERNO',
    'NOMBRES',
    'EDAD',
    'SEXO',
    'DIRECCIÓN',
    'TELÉFONO',
    'TIPO SEGURO',
    'N° HISTORIA CLÍNICA',
    
    // Antropometría
    'FECHA TAMIZAJE',
    'PESO (kg)',
    'TALLA (cm)',
    'IMC (kg/m²)',
    'ESTADO NUTRICIONAL',
    'PERÍM. ABDOMINAL (cm)',
    'RIESGO ABDOMINAL',
    'PA BASAL (PAS/PAD)',

    // HTA
    'DX HTA (SÍ/NO)',
    'FECHA DX HTA',
    'ESTADÍO HTA',
    'TRATAMIENTO HTA',

    // DM
    'DX DM (SÍ/NO)',
    'TIPO DM',
    'FECHA DX DM',
    'GLUCOSA BASAL (mg/dL)',
    'HbA1c (%)',
    'TRATAMIENTO DM',
    'PIE DIABÉTICO',

    // Dislipidemia & RCV
    'DISLIPIDEMIA (SÍ/NO)',
    'COLESTEROL TOTAL (mg/dL)',
    'TRIGLICÉRIDOS (mg/dL)',
    'HDL / LDL (mg/dL)',
    'RIESGO CARDIOVASCULAR'
  ];

  // Columnas de cada mes
  MESES_DEL_ANIO.forEach((mes) => {
    row2.push(
      `${mes.abrev} - FECHA`,
      `${mes.abrev} - PA`,
      `${mes.abrev} - FC`,
      `${mes.abrev} - PESO`,
      `${mes.abrev} - IMC`,
      `${mes.abrev} - GLUCOSA`,
      `${mes.abrev} - TRATAMIENTO`,
      `${mes.abrev} - CONTROLADO`
    );
  });
  row2.push('NOTAS MÉDICAS RÁPIDAS / CONDICIONES ESPECIALES');

  // Filas de datos
  const dataRows: any[][] = patients.map((p, index) => {
    const row: any[] = [
      index + 1,
      p.redSalud || establishment.redSalud || '',
      p.microred || establishment.microred || '',
      p.establecimiento || establishment.establecimiento || '',
      p.codigoRenaes || establishment.codigoRenaes || '',
      p.dni,
      p.apellidoPaterno,
      p.apellidoMaterno,
      p.nombres,
      p.edad || '',
      p.sexo || '',
      p.direccion || '',
      p.telefono || '',
      p.tipoSeguro || 'SIS',
      p.numeroHC || '',

      // Antropometría
      p.fechaTamizaje || '',
      p.pesoKg !== undefined ? p.pesoKg : '',
      p.tallaCm !== undefined ? p.tallaCm : '',
      p.imc !== undefined ? p.imc : '',
      p.clasificacionImc || '',
      p.perimetroAbdominalCm !== undefined ? p.perimetroAbdominalCm : '',
      p.riesgoAbdominal || '',
      (p.paSistolicaBasal && p.paDiastolicaBasal) ? `${p.paSistolicaBasal}/${p.paDiastolicaBasal}` : '',

      // HTA
      p.tieneHta ? 'SÍ' : 'NO',
      p.fechaDxHta || '',
      p.estadioHta || '',
      p.tratamientoHta || '',

      // DM
      p.tieneDm ? 'SÍ' : 'NO',
      p.tipoDm || '',
      p.fechaDxDm || '',
      p.glucosaBasal !== undefined ? p.glucosaBasal : '',
      p.hba1c !== undefined ? p.hba1c : '',
      p.tratamientoDm || '',
      p.evaluacionPieDiabetico || '',

      // Dislipidemia & RCV
      p.tieneDislipidemia ? 'SÍ' : 'NO',
      p.colesterolTotal !== undefined ? p.colesterolTotal : '',
      p.trigliceridos !== undefined ? p.trigliceridos : '',
      (p.hdl && p.ldl) ? `${p.hdl} / ${p.ldl}` : '',
      p.riesgoCardiovascular || ''
    ];

    // Datos mensuales
    for (let m = 1; m <= 12; m++) {
      const ctrl = p.controles?.[m];
      if (ctrl && ctrl.atendido) {
        row.push(
          ctrl.fecha || '',
          (ctrl.paSistolica && ctrl.paDiastolica) ? `${ctrl.paSistolica}/${ctrl.paDiastolica}` : '',
          ctrl.frecuenciaCardiaca || '',
          ctrl.pesoKg || '',
          ctrl.imc || '',
          ctrl.glucosaMgDl || '',
          ctrl.medicacionEntregada || '',
          ctrl.controlado ? 'CONTROLADO' : 'NO CONTROLADO'
        );
      } else {
        row.push('', '', '', '', '', '', '', '');
      }
    }

    // Notas médicas rápidas
    row.push(p.notasMedicas || '');

    return row;
  });

  // Combinar todo en matriz para SheetJS
  const wsData = [row1, row2, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Definir merges para la fila 1 de grupos
  const merges: XLSX.Range[] = [
    // Identificación: col 0 a 14
    { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } },
    // Antropometría: col 15 a 22
    { s: { r: 0, c: 15 }, e: { r: 0, c: 22 } },
    // HTA: col 23 a 26
    { s: { r: 0, c: 23 }, e: { r: 0, c: 26 } },
    // DM: col 27 a 33
    { s: { r: 0, c: 27 }, e: { r: 0, c: 33 } },
    // Dislipidemia: col 34 a 38
    { s: { r: 0, c: 34 }, e: { r: 0, c: 38 } },
  ];

  // Merges para cada mes (8 columnas por mes)
  let colOffset = 39;
  for (let i = 0; i < 12; i++) {
    merges.push({
      s: { r: 0, c: colOffset },
      e: { r: 0, c: colOffset + 7 },
    });
    colOffset += 8;
  }

  ws['!merges'] = merges;

  // Ajuste automático de anchos de columna
  const colWidths = row2.map((colName) => ({
    wch: Math.max(colName.length + 3, 10),
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PADRON_NOMINAL_DNT');

  const fullFileName = `${fileName}_${establishment.anio || 2026}.${fileFormat}`;

  // Para .xls oficial se utiliza bookType 'biff8' (formato binario Excel 97-2004)
  if (fileFormat === 'xls') {
    XLSX.writeFile(wb, fullFileName, { bookType: 'biff8' });
  } else {
    XLSX.writeFile(wb, fullFileName, { bookType: 'xlsx' });
  }

  return fullFileName;
}

/**
 * Genera y descarga una plantilla vacía para que el centro médico la diligencie
 */
export function downloadBlankDntTemplate(
  establishment: EstablishmentConfig,
  fileFormat: 'xls' | 'xlsx' = 'xls'
): string {
  return exportPadronToExcel([], establishment, 'Plantilla_Padron_DNT_EnBlanco', fileFormat);
}

/**
 * Importa pacientes desde un archivo Excel / CSV
 */
export async function parseExcelPatients(file: File): Promise<Partial<DntPatient>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (jsonRows.length === 0) {
          resolve([]);
          return;
        }

        // Buscar la fila de encabezados que contenga "DNI"
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(jsonRows.length, 5); i++) {
          const row = jsonRows[i];
          if (Array.isArray(row) && row.some(cell => typeof cell === 'string' && /dni|documento/i.test(cell))) {
            headerRowIndex = i;
            break;
          }
        }

        const headers: string[] = (jsonRows[headerRowIndex] || []).map((h: any) => String(h || '').trim().toLowerCase());
        const dniColIdx = headers.findIndex((h: string) => /dni|documento/i.test(h));
        const apePatColIdx = headers.findIndex((h: string) => /apellido.*paterno|paterno/i.test(h));
        const apeMatColIdx = headers.findIndex((h: string) => /apellido.*materno|materno/i.test(h));
        const nombresColIdx = headers.findIndex((h: string) => /nombre|nombres/i.test(h));
        const edadColIdx = headers.findIndex((h: string) => /edad/i.test(h));
        const sexoColIdx = headers.findIndex((h: string) => /sexo|genero/i.test(h));
        const hcColIdx = headers.findIndex((h: string) => /hc|historia/i.test(h));
        const telColIdx = headers.findIndex((h: string) => /telefono|celular|fono/i.test(h));

        const parsed: Partial<DntPatient>[] = [];

        for (let i = headerRowIndex + 1; i < jsonRows.length; i++) {
          const row = jsonRows[i];
          if (!row || !Array.isArray(row)) continue;

          const rawDni = String(row[dniColIdx] || '').trim().replace(/\D/g, '');
          if (rawDni.length === 8) {
            const apePat = apePatColIdx >= 0 ? String(row[apePatColIdx] || '').trim() : '';
            const apeMat = apeMatColIdx >= 0 ? String(row[apeMatColIdx] || '').trim() : '';
            const nom = nombresColIdx >= 0 ? String(row[nombresColIdx] || '').trim() : '';
            const edad = edadColIdx >= 0 ? parseInt(String(row[edadColIdx]), 10) || 0 : 0;
            const sexoRaw = sexoColIdx >= 0 ? String(row[sexoColIdx] || '').toUpperCase().trim() : '';
            const sexo = (sexoRaw.startsWith('M') ? 'M' : sexoRaw.startsWith('F') ? 'F' : 'M') as 'M' | 'F';

            parsed.push({
              dni: rawDni,
              apellidoPaterno: apePat,
              apellidoMaterno: apeMat,
              nombres: nom,
              nombreCompleto: `${nom} ${apePat} ${apeMat}`.trim(),
              edad: edad > 0 ? edad : 40,
              sexo: sexo,
              numeroHC: hcColIdx >= 0 ? String(row[hcColIdx] || '').trim() : '',
              telefono: telColIdx >= 0 ? String(row[telColIdx] || '').trim() : '',
            });
          }
        }

        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
