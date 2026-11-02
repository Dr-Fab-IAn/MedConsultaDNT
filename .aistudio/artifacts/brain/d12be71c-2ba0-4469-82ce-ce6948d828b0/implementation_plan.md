# Sistema Clínico de Daños No Transmisibles (DNT) & MedConsulta DNI

Plataforma clínica integral orientada a la Estrategia Sanitaria de Prevención y Control de Daños No Transmisibles (DNT - Hipertensión Arterial, Diabetes Mellitus, Obesidad y Riesgo Cardiovascular) en Perú. Integra la consulta en tiempo real de DNI mediante apisperu.com (RENIEC) para admisión instantánea sin errores de digitación, fichas clínicas con cálculo antropométrico (IMC, perímetro abdominal), seguimiento mensual de controles clínicos, carga masiva y exportación exacta del padrón nominal al formato oficial multicelular en `.xls` / `.xlsx`.

## User Review & Critical Decisions

> [!IMPORTANT]
> Decisiones de diseño y adecuación clínica incorporadas a partir del padrón oficial proporcionado:

- **Especialización en Daños No Transmisibles (DNT)**: El sistema adapta su modelo de datos y formularios clínicos para cubrir exhaustivamente los bloques del padrón nominal:
  1. **Datos Generales e Identificación** (Red, Microred, Establecimiento, DNI verificado vía API, Apellidos, Nombres, Edad, Sexo, Dirección, Tipo de Seguro / SIS).
  2. **Tamizaje y Antropometría DNT** (Peso, Talla, IMC calculado en tiempo real, Perímetro Abdominal, Riesgo Abdominal, Presión Arterial Basal).
  3. **Módulo de Hipertensión Arterial (HTA)** (Fecha de diagnóstico, Clasificación de PA / Estadío, Esquema de tratamiento antihipertensivo, Estado de control).
  4. **Módulo de Diabetes Mellitus (DM2)** (Fecha de diagnóstico, Glucemia en ayunas, HbA1c, Tratamiento antidiabético oral o insulina, Evaluación de complicaciones / pie diabético).
  5. **Dislipidemia y Riesgo Cardiovascular (RCV)** (Colesterol, Triglicéridos, HDL/LDL, Score de riesgo).
  6. **Matriz de Seguimiento Mensual (Enero a Diciembre)** (Registro ordenado por mes de fecha de atención, PA, FC, Peso, Glucosa, Medicación dispensada y condición de paciente controlado).
- **Exportación Fiel a Formato Excel Padrón DNT (`.xls` / `.xlsx`)**:
  - Motor de exportación con la librería `xlsx` que construye la estructura exacta de columnas del padrón oficial con sus bloques de colores temáticos (Azul para filiación, Rosa para antropometría, Naranja/Rojo para HTA/DM y bloques periódicos de control mensual).
  - Incluye opción de exportar el padrón consolidado completo o reportes filtrados por establecimiento, diagnóstico (HTA / DM) o condición de control.
- **Consulta DNI en 1 Clic con apisperu.com**:
  - Consulta individual ultrarrápida que rellena automáticamente el expediente al ingresar los 8 dígitos del DNI.
  - Carga masiva de DNIs mediante lista o importación de archivos de Excel para verificar y normalizar padrones existentes.
- **Módulo de Consulta RUC de SUNAT**:
  - Módulo complementario para validar datos fiscales de clínicas, aseguradoras (SIS, EsSalud, EPS) o proveedores.
- **Seguridad y Persistencia Local**:
  - Proxy Express en el backend (`/api/dni/:dni` y `/api/ruc/:ruc`) con el token provisto para evitar restricciones CORS.
  - Persistencia reactiva local con almacenamiento automático en `localStorage` y respaldo descargable en JSON.

---

## 1. Overview & Core Concept

- **Qué hace**: Automatiza el flujo de captación, diagnóstico, tratamiento y reporte epidemiológico de pacientes crónicos con Daños No Transmisibles. Permite consultar el DNI del paciente en la base de datos de RENIEC, registrar sus antecedentes clínicos y parámetros biométricos (PA, IMC, HbA1c, perímetro abdominal), registrar los controles de cada mes del año y descargar en un clic el archivo Excel listo para entrega a la Microred / DIRESA / MINSA.
- **Público objetivo**: Médicos generales y especialistas, enfermeros(as) encargados de la estrategia de Daños No Transmisibles en establecimientos de salud (I-1, I-2, I-3, I-4, hospitales), secretarías de admisión y coordinadores de programas de salud pública.
- **Valor diferencial**: Reduce el tiempo de registro y llenado del padrón nominal en más de un 80%, previene discrepancias de nombres con RENIEC, calcula el IMC y riesgo cardiovascular de forma automática y elimina la tarea manual de transcribir datos a hojas de cálculo complejas.

---

## 2. User Experience & Visual Design

### Flujos Clave de Usuario

1. **Admisión Rápida & Consulta DNI**:
   - El personal digita el DNI del paciente.
   - El sistema invoca el backend proxy y recupera al instante: nombres, apellido paterno, apellido materno y dígito verificador.
   - Si el paciente ya existe en el padrón DNT, muestra su resumen clínico y último control; si es nuevo, habilita el botón *"Añadir al Padrón DNT"*.
2. **Ficha Clínica Especializada DNT**:
   - Pestaña 1: **Filiación y Seguro**: DNI, Nombres, Edad (calculada), Sexo, Dirección, Teléfono, Historia Clínica (HC), Seguro (SIS, EsSalud, Particular).
   - Pestaña 2: **Antropometría y Factores de Riesgo**: Talla, Peso, cálculo automático de IMC ($IMC = \frac{peso}{(talla/100)^2}$) con clasificación (Bajo peso, Normal, Sobrepeso, Obesidad I/II/III), Perímetro Abdominal con alerta de riesgo cardiovascular según sexo, Hábitos (Tabaquismo, Sedentarismo).
   - Pestaña 3: **Enfermedades No Transmisibles**:
     - *Hipertensión Arterial (HTA)*: Marcador activo, fecha de diagnóstico, medicación actual (Losartán, Enalapril, Amlodipino, etc.).
     - *Diabetes Mellitus (DM)*: Marcador activo, tipo (DM1/DM2), fecha de diagnóstico, valor de glucosa basal, HbA1c, tratamiento (Metformina, Glibenclamida, Insulina), tamizaje de pie diabético.
     - *Dislipidemia*: Colesterol Total, Triglicéridos, HDL, LDL.
   - Pestaña 4: **Monitoreo y Controles Mensuales**:
     - Cuadrícula con los 12 meses del año (Enero a Diciembre). Cada mes permite ingresar: Fecha de atención, Presión Arterial (PAS/PAD), FC, Peso, Glucemia, Medicación entregada y estado *"Paciente Controlado"* (Sí/No).
3. **Padrón Nominal y Exportación Oficial en `.xls`**:
   - Vista en tabla de alta densidad con filtros rápidos (Todos, Hipertensos, Diabéticos, Controlados, No controlados, Sin control en el mes).
   - Botón principal de exportación: *"Exportar Padrón Nominal DNT (.xls)"* que genera la hoja de cálculo idéntica a la estructura oficial con sus cabeceras multinivel y colores normativos.
4. **Carga Masiva de DNIs**:
   - Permite arrastrar un Excel con columna de DNIs o pegar una lista de números.
   - Consulta secuencial con barra de progreso y estado en tiempo real.
   - Posibilidad de incorporar los resultados automáticamente al padrón DNT.
5. **Consulta RUC**:
   - Módulo para verificar RUCs (11 dígitos) con razón social, estado tributario y dirección para convenios y facturación de medicamentos/servicios.

### Identidad Visual y Estilo

- **Alineación con SaaS & Dashboard Reference**:
  - Interfaz de trabajo con barra lateral colapsable (260px) + encabezado de 3 zonas con breadcrumbs y selector de establecimiento + lienzo de datos de alta densidad.
  - Paleta sobria y profesional: Fondos `#F8FAFC` (Slate 50) y `#FFFFFF`, acento clínico teal `#0F766E` / `#0D9488`, bordes sutiles de 1px (`border-slate-200`).
  - Cero píldoras estáticas decorativas: Metadatos limpios con separadores tipográficos (`·`, `/`).
  - Tipografía `Plus Jakarta Sans` para encabezados y `font-mono tabular-nums` para DNIs, RUCs, presiones arteriales y medidas de laboratorio.

---

## 3. Key Product Decisions & Trade-Offs

- **Librería de Exportación `xlsx` (SheetJS)**:
  - *Decisión*: Se integra `xlsx` para la generación en el cliente de archivos de Excel compatibles tanto con versiones antiguas (`.xls`) como modernas (`.xlsx`).
  - *Razón*: Permite estructurar con precisión las cabeceras complejas de 2 filas y colores de sección que requiere el formato ministerial peruano sin requerir procesamiento pesado en el servidor.
- **Estructura de Datos Normalizada vs. Formato Plano**:
  - *Decisión*: El estado interno de React maneja el paciente como una entidad rica con historial de controles array, y una capa de transformación (`dntExportAdapter`) aplana los datos a las 40+ columnas exactas del padrón para exportación.
  - *Razón*: Facilita la edición en formularios modales modernos sin perder la compatibilidad estricta con la plantilla del usuario.
- **Configuración de Establecimiento (IPRESS)**:
  - *Decisión*: Se añade un panel de cabecera de establecimiento (Red, Microred, Establecimiento, Código RENAES) que se guarda en memoria y se propaga automáticamente a todas las filas del padrón exportado.
  - *Razón*: Evita que el usuario tenga que tipear su establecimiento en cada paciente.

---

## 4. Technical Architecture & Data Strategy

### Diagrama del Sistema

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Cliente React (Vite SPA)                        │
├─────────────────┬───────────────────┬──────────────────┬───────────────┤
│ Consulta DNI    │ Ficha Clínica DNT │ Padrón Nominal   │ Carga Masiva  │
│ (RENIEC 1-clic) │ (HTA, DM, Triaje) │ (Matriz Mensual) │ & Export .xls │
└────────┬────────┴─────────┬─────────┴─────────┬────────┴───────┬───────┘
         │                  │                   │                │
         ▼                  ▼                   ▼                ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │                  Motor Padrón DNT & Exportador                  │
   │           - Cálculo automático IMC / Riesgo CV                  │
   │           - Adaptador de columnas oficiales MINSA/DNT           │
   │           - Generador de archivo .xls con SheetJS               │
   └────────────────────────────────┬────────────────────────────────┘
                                    │
                                    ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │         Servidor Express Proxy (/api/dni y /api/ruc)            │
   │           - Inyección de Token Bearer de apisperu.com           │
   │           - Manejo de CORS y validación de 8 y 11 dígitos       │
   └────────────────────────────────┬────────────────────────────────┘
                                    │
                                    ▼
         ┌─────────────────────────────────────────────────────┐
         │  Servicio Externo: https://dniruc.apisperu.com       │
         │  - GET /api/v1/dni/{dni} (RENIEC Perú)              │
         │  - GET /api/v1/ruc/{ruc} (SUNAT Perú)               │
         └─────────────────────────────────────────────────────┘
```

### Modelo de Datos del Padrón DNT

```typescript
export interface DntPatient {
  id: string;
  // Ubicación y Establecimiento
  redSalud: string;
  microred: string;
  establecimiento: string;
  codigoRenaes?: string;
  
  // Filiación (autocompletado con DNI)
  dni: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombres: string;
  edad: number;
  sexo: 'M' | 'F';
  fechaNacimiento?: string;
  direccion: string;
  telefono: string;
  tipoSeguro: 'SIS' | 'ESSALUD' | 'PARTICULAR' | 'OTRO';
  numeroHC: string;
  
  // Antropometría y Tamizaje
  fechaTamizaje?: string;
  pesoKg?: number;
  tallaCm?: number;
  imc?: number;
  clasificacionImc?: string;
  perimetroAbdominalCm?: number;
  riesgoAbdominal?: 'NORMAL' | 'ALTO' | 'MUY ALTO';
  paSistolicaBasal?: number;
  paDiastolicaBasal?: number;
  
  // Diagnósticos DNT
  tieneHta: boolean;
  fechaDxHta?: string;
  estadioHta?: 'PREHIPERTENSION' | 'ESTADIO_1' | 'ESTADIO_2';
  tratamientoHta?: string[]; // Ej: Losartán 50mg, Enalapril 20mg, Amlodipino 5mg
  
  tieneDm: boolean;
  fechaDxDm?: string;
  tipoDm?: 'DM1' | 'DM2';
  glucosaBasal?: number;
  hba1c?: number;
  tratamientoDm?: string[]; // Ej: Metformina 850mg, Glibenclamida, Insulina NPH
  evaluacionPieDiabetico?: 'NORMAL' | 'EN_RIESGO' | 'ULCERA';
  
  tieneDislipidemia?: boolean;
  colesterolTotal?: number;
  trigliceridos?: number;
  riesgoCardiovascular?: 'BAJO' | 'MODERADO' | 'ALTO' | 'MUY_ALTO';
  
  // Seguimiento Mensual (Enero a Diciembre)
  controlesMensuales: {
    [mes: number]: { // 1 = Enero ... 12 = Diciembre
      atendido: boolean;
      fecha?: string;
      paSistolica?: number;
      paDiastolica?: number;
      frecuenciaCardiaca?: number;
      pesoKg?: number;
      imc?: number;
      glucosaMgDl?: number;
      medicacionEntregada?: string;
      pacienteControlado?: boolean; // PA < 140/90 y/o Glucosa < 130
      observaciones?: string;
    };
  };
  
  fechaCreacion: string;
  fechaActualizacion: string;
}
```

### Plan de Verificación

1. **Consulta DNI & Proxy**:
   - Verificar consulta rápida y recuperación de nombres y apellidos completos.
   - Comprobar que al consultar se cree un paciente con cálculo automático de edad y enlace a la ficha DNT.
2. **Cálculos Clínicos**:
   - Validar fórmula de IMC ($kg / m^2$) y categorización clínica.
   - Validar alerta de perímetro abdominal por sexo ($>94$cm en varones, $>80$cm en mujeres).
   - Validar criterio de compensación / paciente controlado en HTA ($<140/90$) y DM ($<130$ mg/dL).
3. **Generación del Archivo de Padrón (.xls)**:
   - Probar la descarga del padrón completo con la librería `xlsx`.
   - Verificar que el archivo generado se abra correctamente en Excel y contenga todas las columnas con las cabeceras agrupadas idénticas a la imagen del usuario.
4. **Carga Masiva e Importación**:
   - Probar la carga de una lista de DNIs y verificar que procese y asigne nombres automáticamente.
