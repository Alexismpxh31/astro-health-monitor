/**
 * NASA Human Research Program (HRP) Data & Clinical Knowledge Base
 * Sources:
 * - https://www.nasa.gov/hrp/hazards/ (The 5 Hazards: Radiation, Isolation, Distance, Gravity, Hostile)
 * - https://www.nasa.gov/hrp/risks/ (HRP Research Element Risks: Cardiovascular, Bone, Muscle, Immune, Behavioral)
 * - https://www.nasa.gov/hrp/ongoing-hrp-research/ (CIPHER & Spaceflight Standard Measures)
 */

export const NASA_HRP_SYSTEMS = [
  {
    id: 'cardiovascular',
    name: 'Sistema Cardiovascular & Fluidos',
    nameEn: 'Cardiovascular System & Fluid Shifts',
    hazard: 'Gravity Fields (Microgravedad) & Hostile Environment',
    riskName: 'Risk of Cardiovascular Adaptations & Orthostatic Intolerance',
    description: 'En ingravidez, los fluidos corporales sufren un desplazamiento cefálico masivo hacia la cabeza y el tórax. El corazón se adapta reduciendo masa ventricular, lo que genera riesgo de arritmias, hipotensión ortostática al aterrizar y congestión.',
    researchProtocol: 'CIPHER Cardiovascular Track & Spaceflight Standard Measures',
    countermeasures: [
      'Uso de manguitos de contrapresión venosa (Chibis / LBNP - Lower Body Negative Pressure) por 20 min.',
      'Sesión de ejercicio aeróbico de alta intensidad (T2 Treadmill / Cycle Ergometer).',
      'Protocolo de carga de electrolitos y agua (Fluid Loading) previo a maniobras de alta aceleración.'
    ],
    indicators: ['HR', 'SPO2', 'SBP', 'DBP', 'RR', 'TSKIN']
  },
  {
    id: 'musculoskeletal',
    name: 'Sistema Óseo-Muscular',
    nameEn: 'Musculoskeletal System',
    hazard: 'Gravity Fields (Microgravedad)',
    riskName: 'Risk of Early Onset Osteopenia & Muscle Atrophy',
    description: 'La ausencia de carga biomecánica desencadena una desmineralización ósea acelerada (~1% de pérdida mensual en fémur y columna) y atrofia de fibras musculares posturales de contracción lenta.',
    researchProtocol: 'HRP Human Health Countermeasures (HHC) - Bone Architecture & CIPHER',
    countermeasures: [
      '2.5 horas diarias obligatorias de ejercicio resistivo pesado en el ARED (Advanced Resistive Exercise Device).',
      'Suplementación oral programada con Vitamina D3 (1000 UI) y bifosfonatos orales.',
      'Monitoreo trimestral de marcadores de resorción ósea (CTX/NTX).'
    ],
    indicators: ['BMD', 'MUSCLE_MASS']
  },
  {
    id: 'radiation',
    name: 'Exposición a Radiación Cósmica',
    nameEn: 'Space Radiation Environment',
    hazard: 'Space Radiation (GCR / SPE / Trapped Belts)',
    riskName: 'Risk of Acute Radiation Syndrome, Carcinogenesis & CNS Damage',
    description: 'Fuera de la magnetosfera terrestre, los astronautas están expuestos a rayos cósmicos galácticos (GCR) de alta energía (iones HZE) y eventos solares de partículas (SPE), con riesgo de toxicidad aguda y mutagénesis celular.',
    researchProtocol: 'Space Radiation Element (SRE) & ISS-RAD Dosimetry',
    countermeasures: [
      'Refugio inmediato en el compartimento blindado (Storm Shelter) protegido con tanques de agua y polietileno hidrogenado.',
      'Suspensión inmediata de toda Actividad Extravehicular (EVA).',
      'Administración de antioxidantes dietéticos y radioprotectores de apoyo.'
    ],
    indicators: ['RAD_DAILY', 'RAD_CUMULATIVE']
  },
  {
    id: 'behavioral',
    name: 'Salud Conductual & Neurocognitiva',
    nameEn: 'Behavioral Health & Performance',
    hazard: 'Isolation and Confinement & Distance from Earth',
    riskName: 'Risk of Behavioral Conditions, Cognitive Decrements & Circadian Disruption',
    description: 'El confinamiento en hábitats cerrados y el aislamiento extremo de la Tierra provocan alteraciones del ritmo circadiano, pérdida de sueño REM, irritabilidad y degradación del tiempo de reacción psicomotora.',
    researchProtocol: 'Human Factors & Behavioral Performance (HFBP) - Spaceflight Standard Measures',
    countermeasures: [
      'Iluminación de cabina dinámica de estado sólido (Solid-State Lighting) con espectro azul enriquecido a 480nm al despertar.',
      'Protocolo de higiene del sueño con siesta reparadora controlada de 45 minutos.',
      'Evaluación diaria de latencia con la prueba de vigilancia psicomotora (PVT).'
    ],
    indicators: ['PVT', 'SLEEP_HOURS']
  },
  {
    id: 'immune',
    name: 'Inmunidad, Infección & SANS',
    nameEn: 'Immune Dysregulation & Closed Environment',
    hazard: 'Hostile / Closed Environments & Altered Gravity',
    riskName: 'Risk of Altered Immune System Responses & SANS',
    description: 'La combinación de radiación, estrés y microgravedad deprime la inmunidad celular mediada por linfocitos T, reactivando virus latentes (Epstein-Barr, VZV) y provocando edema en la papila del nervio óptico (SANS).',
    researchProtocol: 'CIPHER Multi-Omics & Standard Measures Salivary Biomarkers',
    countermeasures: [
      'Monitoreo continuo de citocinas inflamatorias salivales (IL-6, TNF-alfa).',
      'Ecografía ocular de la vaina del nervio óptico (ONSD) para vigilar hipertensión intracraneal.',
      'Soporte inmunoestimulante y control estricto de bioaerosoles en el módulo ECLSS.'
    ],
    indicators: ['WBC', 'IL6', 'CORTISOL']
  }
];

export const NASA_INDICATORS_MAP = {
  HR: {
    code: 'HR',
    name: 'Frecuencia Cardíaca',
    nameEn: 'Heart Rate',
    systemId: 'cardiovascular',
    unit: 'bpm',
    minCritical: 45,
    minNormal: 55,
    maxNormal: 95,
    maxCritical: 130,
    typical: 72,
    desc: 'Ritmo cardíaco continuo obtenido por fotopletismografía o electrocardiografía Astroskin.'
  },
  SPO2: {
    code: 'SPO2',
    name: 'Saturación de Oxígeno',
    nameEn: 'Oxygen Saturation',
    systemId: 'cardiovascular',
    unit: '%',
    minCritical: 90,
    minNormal: 95,
    maxNormal: 100,
    maxCritical: 100,
    typical: 98,
    desc: 'Porcentaje de saturación arterial de O2 monitoreado por oximetría de pulso.'
  },
  SBP: {
    code: 'SBP',
    name: 'Presión Arterial Sistólica',
    nameEn: 'Systolic Blood Pressure',
    systemId: 'cardiovascular',
    unit: 'mmHg',
    minCritical: 80,
    minNormal: 95,
    maxNormal: 130,
    maxCritical: 155,
    typical: 118,
    desc: 'Presión arterial máxima en fase de contracción ventricular.'
  },
  DBP: {
    code: 'DBP',
    name: 'Presión Arterial Diastólica',
    nameEn: 'Diastolic Blood Pressure',
    systemId: 'cardiovascular',
    unit: 'mmHg',
    minCritical: 50,
    minNormal: 60,
    maxNormal: 85,
    maxCritical: 100,
    typical: 76,
    desc: 'Presión arterial en fase de relajación diastólica.'
  },
  RR: {
    code: 'RR',
    name: 'Frecuencia Respiratoria',
    nameEn: 'Respiratory Rate',
    systemId: 'cardiovascular',
    unit: 'rpm',
    minCritical: 8,
    minNormal: 12,
    maxNormal: 18,
    maxCritical: 28,
    typical: 14,
    desc: 'Ciclos respiratorios por minuto medidos por pletismografía de inductancia torácica.'
  },
  TSKIN: {
    code: 'TSKIN',
    name: 'Temperatura Cutánea',
    nameEn: 'Skin Temperature',
    systemId: 'cardiovascular',
    unit: '°C',
    minCritical: 34.5,
    minNormal: 35.8,
    maxNormal: 37.3,
    maxCritical: 38.5,
    typical: 36.6,
    desc: 'Temperatura periférica continua del tronco.'
  },
  BMD: {
    code: 'BMD',
    name: 'Densidad Mineral Ósea Relativa',
    nameEn: 'Relative Bone Mineral Density Loss',
    systemId: 'musculoskeletal',
    unit: '%',
    minCritical: -5.0,
    minNormal: -2.0,
    maxNormal: 0.5,
    maxCritical: 2.0,
    typical: -0.8,
    desc: 'Variación mensual en densidad ósea de cuello femoral y columna lumbar respecto a baseline.'
  },
  MUSCLE_MASS: {
    code: 'MUSCLE_MASS',
    name: 'Masa Muscular Funcional',
    nameEn: 'Functional Muscle Mass Retention',
    systemId: 'musculoskeletal',
    unit: '%',
    minCritical: 80,
    minNormal: 90,
    maxNormal: 105,
    maxCritical: 120,
    typical: 96,
    desc: 'Conservación de masa magra evaluada por impedancia bioeléctrica en vuelo.'
  },
  RAD_DAILY: {
    code: 'RAD_DAILY',
    name: 'Tasa Diaria de Radiación',
    nameEn: 'Daily Radiation Dose',
    systemId: 'radiation',
    unit: 'mSv/d',
    minCritical: 0,
    minNormal: 0.05,
    maxNormal: 0.8,
    maxCritical: 1.8,
    typical: 0.35,
    desc: 'Dosis absorbida equivalente en 24h medida por dosímetros de silicio y TEPC.'
  },
  RAD_CUMULATIVE: {
    code: 'RAD_CUMULATIVE',
    name: 'Dosis Acumulada de Misión',
    nameEn: 'Cumulative Mission Dose',
    systemId: 'radiation',
    unit: 'mSv',
    minCritical: 0,
    minNormal: 0,
    maxNormal: 150,
    maxCritical: 250,
    typical: 42,
    desc: 'Exposición total acumulada en la trayectoria de vuelo hacia la Luna.'
  },
  PVT: {
    code: 'PVT',
    name: 'Vigilancia Psicomotora (PVT)',
    nameEn: 'Psychomotor Vigilance Test',
    systemId: 'behavioral',
    unit: 'ms',
    minCritical: 150,
    minNormal: 180,
    maxNormal: 300,
    maxCritical: 450,
    typical: 232,
    desc: 'Tiempo medio de reacción ante estímulos luminosos impredecibles.'
  },
  SLEEP_HOURS: {
    code: 'SLEEP_HOURS',
    name: 'Horas de Sueño Continuo',
    nameEn: 'Sleep Duration',
    systemId: 'behavioral',
    unit: 'h',
    minCritical: 4.0,
    minNormal: 6.5,
    maxNormal: 9.0,
    maxCritical: 14.0,
    typical: 7.4,
    desc: 'Horas efectivas de descanso en el compartimento personal del astronauta.'
  },
  WBC: {
    code: 'WBC',
    name: 'Recuento Leucocitario Total',
    nameEn: 'White Blood Cell Count',
    systemId: 'immune',
    unit: 'k/µL',
    minCritical: 2.5,
    minNormal: 4.5,
    maxNormal: 10.5,
    maxCritical: 15.0,
    typical: 6.4,
    desc: 'Población total de glóbulos blancos en muestra de punción capilar.'
  },
  IL6: {
    code: 'IL6',
    name: 'Interleucina 6 (IL-6)',
    nameEn: 'Interleukin-6 Salivary',
    systemId: 'immune',
    unit: 'pg/mL',
    minCritical: 0,
    minNormal: 0.5,
    maxNormal: 5.0,
    maxCritical: 12.0,
    typical: 1.8,
    desc: 'Biomarcador salival de respuesta proinflamatoria y estrés fisiológico de vuelo.'
  },
  CORTISOL: {
    code: 'CORTISOL',
    name: 'Cortisol Salival Libre',
    nameEn: 'Salivary Free Cortisol',
    systemId: 'immune',
    unit: 'nmol/L',
    minCritical: 2,
    minNormal: 5,
    maxNormal: 25,
    maxCritical: 45,
    typical: 12,
    desc: 'Hormona glucocorticoide indicadora de activación del eje hipotálamo-hipófisis-adrenal.'
  }
};

export const CLINICAL_RECOMMENDATIONS = {
  HR_CRITICAL_HIGH: {
    level: 'critical',
    title: 'Taquicardia Severa en Microgravedad',
    action: 'Detén de inmediato cualquier ejercicio en el ARED/T2. Realiza maniobra vagal de Valsalva controlada (soplo 15s) e ingiere 300 ml de solución de rehidratación oral.'
  },
  SPO2_CRITICAL_LOW: {
    level: 'critical',
    title: 'Hipoxia Aguda en Cabina',
    action: 'Colócate de inmediato la mascarilla de oxígeno suplementario del módulo y verifica la presión parcial de O2 en la consola ECLSS.'
  },
  RAD_CRITICAL_HIGH: {
    level: 'critical',
    title: 'Alerta de Evento Solar de Protones (SPE)',
    action: 'Trasládate inmediatamente al compartimento central blindado con polietileno y tanques de agua (Storm Shelter). Espera confirmación radiológica de Tierra.'
  },
  SBP_CAUTION_HIGH: {
    level: 'caution',
    title: 'Elevación de Presión por Desplazamiento Cefálico',
    action: 'Colócate los manguitos de contrapresión venosa en piernas (Chibis) durante 20 minutos para redirigir el volumen sanguíneo hacia las extremidades inferiores.'
  },
  PVT_CAUTION_HIGH: {
    level: 'caution',
    title: 'Fatiga Neurocognitiva Detectada',
    action: 'Tiempo de respuesta degradado (>300 ms). Ajusta la iluminación de cabina al espectro azul 480nm y programa una siesta recuperadora de 45 min antes de tareas críticas.'
  }
};
