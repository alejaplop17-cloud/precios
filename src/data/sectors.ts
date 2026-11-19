import type {
  AllocationMethod,
  BusinessType,
  CostCategory,
  CostSubcategory,
  SectorId,
} from '../types/pricing';

export interface SectorProfile {
  id: SectorId;
  name: string;
  shortName: string;
  defaultBusinessType: BusinessType;
  defaultItemType: 'producto' | 'servicio';
  defaultUnits: string[];
  recommendedAllocation: AllocationMethod;
  typicalDirectMarginRange: [number, number];
  typicalOperatingMarginRange: [number, number];
  indirectAlertThresholdPct: number;
  sectorNotes: string;
  suggestedCostLabels: {
    directo: string[];
    indirecto: string[];
    admin_comercial: string[];
  };
}

export const SECTOR_PROFILES: Record<SectorId, SectorProfile> = {
  manufactura: {
    id: 'manufactura',
    name: 'Manufactura y Producción',
    shortName: 'Manufactura',
    defaultBusinessType: 'fabricante',
    defaultItemType: 'producto',
    defaultUnits: ['unidad', 'lote', 'kg', 'litro', 'metro', 'caja'],
    recommendedAllocation: 'horas_maquina',
    typicalDirectMarginRange: [30, 55],
    typicalOperatingMarginRange: [12, 25],
    indirectAlertThresholdPct: 35,
    sectorNotes:
      'Prioriza la separación entre costo primo (materia prima + MOD), costos indirectos de fabricación (CIF) y capacidad instalada de planta.',
    suggestedCostLabels: {
      directo: ['Materia prima principal', 'Insumos y componentes', 'Mano de obra directa', 'Empaque primario'],
      indirecto: ['Energía industrial', 'Arrendamiento planta', 'Mantenimiento maquinaria', 'Depreciación equipos'],
      admin_comercial: ['Nómina administrativa', 'Marketing B2B/B2C', 'Comisiones comerciales'],
    },
  },
  comercio: {
    id: 'comercio',
    name: 'Comercio y Distribución',
    shortName: 'Comercio',
    defaultBusinessType: 'comercializador',
    defaultItemType: 'producto',
    defaultUnits: ['unidad', 'docena', 'caja', 'paquete', 'kg'],
    recommendedAllocation: 'porcentaje',
    typicalDirectMarginRange: [22, 42],
    typicalOperatingMarginRange: [8, 18],
    indirectAlertThresholdPct: 28,
    sectorNotes:
      'El costo de adquisición y flete entrante dominan la estructura; vigila descuentos comerciales y rotación de inventario.',
    suggestedCostLabels: {
      directo: ['Costo de adquisición mercancía', 'Flete y nacionalización', 'Empaque y embalaje'],
      indirecto: ['Arrendamiento bodega/local', 'Servicios públicos', 'Seguros de inventario'],
      admin_comercial: ['Plataforma e-commerce / POS', 'Pauta digital', 'Comisiones pasarela y vendedores'],
    },
  },
  restaurantes: {
    id: 'restaurantes',
    name: 'Restaurantes y Gastronomía',
    shortName: 'Gastronomía',
    defaultBusinessType: 'fabricante',
    defaultItemType: 'producto',
    defaultUnits: ['plato', 'porción', 'bebida', 'combo', 'evento'],
    recommendedAllocation: 'unidades',
    typicalDirectMarginRange: [58, 72],
    typicalOperatingMarginRange: [10, 20],
    indirectAlertThresholdPct: 32,
    sectorNotes:
      'El food cost (materia prima + merma) suele mantenerse entre 28% y 36% del precio neto; considera mermas y comisiones de plataformas de domicilio.',
    suggestedCostLabels: {
      directo: ['Ingredientes y proteína (incl. merma)', 'Acompañantes e insumos', 'Mano de obra cocina', 'Empaque domicilio'],
      indirecto: ['Gas y energía cocina', 'Arrendamiento local', 'Aseo y mantenimiento equipos'],
      admin_comercial: ['Caja y administración', 'Comisiones apps domicilio', 'Publicidad local'],
    },
  },
  servicios_profesionales: {
    id: 'servicios_profesionales',
    name: 'Servicios Profesionales y Consultoría',
    shortName: 'Consultoría',
    defaultBusinessType: 'servicios',
    defaultItemType: 'servicio',
    defaultUnits: ['hora', 'proyecto', 'sesión', 'contrato', 'prestación'],
    recommendedAllocation: 'horas_trabajo',
    typicalDirectMarginRange: [50, 75],
    typicalOperatingMarginRange: [18, 35],
    indirectAlertThresholdPct: 30,
    sectorNotes:
      'La capacidad se mide en horas facturables reales (no totales); incluye tiempo no facturable de preventa en costos administrativos.',
    suggestedCostLabels: {
      directo: ['Honorarios consultor / especialista', 'Viáticos directos del proyecto', 'Subcontratación técnica'],
      indirecto: ['Oficina y coworking', 'Energía e internet', 'Depreciación equipos cómputo'],
      admin_comercial: ['Software profesional y licencias', 'Prospección y marketing', 'Gestión administrativa'],
    },
  },
  tecnologia: {
    id: 'tecnologia',
    name: 'Tecnología y Desarrollo de Software',
    shortName: 'Tecnología',
    defaultBusinessType: 'servicios',
    defaultItemType: 'servicio',
    defaultUnits: ['licencia', 'hora', 'sprint', 'proyecto', 'usuario/mes'],
    recommendedAllocation: 'horas_trabajo',
    typicalDirectMarginRange: [65, 85],
    typicalOperatingMarginRange: [20, 40],
    indirectAlertThresholdPct: 30,
    sectorNotes:
      'Distingue costo marginal por usuario/licencia (cloud, APIs, soporte) de la inversión fija en ingeniería y producto.',
    suggestedCostLabels: {
      directo: ['Horas desarrollo / soporte dedicado', 'Infraestructura cloud por cliente', 'APIs de terceros'],
      indirecto: ['Servidores base y QA', 'Seguridad y cumplimiento', 'Espacio de trabajo'],
      admin_comercial: ['Herramientas SaaS internas', 'Adquisición de clientes (CAC)', 'Dirección técnica'],
    },
  },
  transporte: {
    id: 'transporte',
    name: 'Transporte y Logística',
    shortName: 'Transporte',
    defaultBusinessType: 'servicios',
    defaultItemType: 'servicio',
    defaultUnits: ['viaje', 'km', 'tonelada', 'hora', 'contrato'],
    recommendedAllocation: 'horas_maquina',
    typicalDirectMarginRange: [25, 45],
    typicalOperatingMarginRange: [10, 20],
    indirectAlertThresholdPct: 35,
    sectorNotes:
      'Controla combustible, peajes y mantenimiento preventivo por kilómetro recorrido para evitar erosión de margen en rutas largas.',
    suggestedCostLabels: {
      directo: ['Combustible', 'Peajes y viáticos ruta', 'Salario conductor por viaje'],
      indirecto: ['Mantenimiento preventivo flota', 'Depreciación vehículos', 'SOAT, pólizas y GPS'],
      admin_comercial: ['Despacho y tráfico', 'Gastos financieros leasing', 'Comercialización carga'],
    },
  },
  construccion: {
    id: 'construccion',
    name: 'Construcción e Ingeniería',
    shortName: 'Construcción',
    defaultBusinessType: 'fabricante',
    defaultItemType: 'servicio',
    defaultUnits: ['m2', 'proyecto', 'obra', 'm3', 'prestación'],
    recommendedAllocation: 'porcentaje',
    typicalDirectMarginRange: [22, 38],
    typicalOperatingMarginRange: [8, 18],
    indirectAlertThresholdPct: 28,
    sectorNotes:
      'Incluye AIU (Administración, Imprevistos y Utilidad) con trazabilidad sobre materiales, subcontratos y pólizas contractuales.',
    suggestedCostLabels: {
      directo: ['Materiales de obra', 'Mano de obra cuadrilla', 'Alquiler maquinaria directa'],
      indirecto: ['Supervisión e interventoría', 'Seguros y pólizas de obra', 'Bodegaje en obra'],
      admin_comercial: ['Administración central', 'Licitaciones y estudios', 'Costos financieros'],
    },
  },
  salud: {
    id: 'salud',
    name: 'Salud y Bienestar',
    shortName: 'Salud',
    defaultBusinessType: 'servicios',
    defaultItemType: 'servicio',
    defaultUnits: ['sesión', 'consulta', 'procedimiento', 'plan', 'prestación'],
    recommendedAllocation: 'horas_trabajo',
    typicalDirectMarginRange: [45, 70],
    typicalOperatingMarginRange: [15, 30],
    indirectAlertThresholdPct: 35,
    sectorNotes:
      'Considera insumos clínicos descartables, tiempo efectivo de sala/consultorio y amortización de equipamiento biomédico.',
    suggestedCostLabels: {
      directo: ['Insumos médicos / estética', 'Honorarios profesional clínico', 'Esterilización'],
      indirecto: ['Arrendamiento consultorio', 'Depreciación equipo biomédico', 'Habilitación y bioseguridad'],
      admin_comercial: ['Recepción y agendamiento', 'Software historia clínica', 'Marketing digital'],
    },
  },
  educacion: {
    id: 'educacion',
    name: 'Educación y Formación',
    shortName: 'Educación',
    defaultBusinessType: 'servicios',
    defaultItemType: 'servicio',
    defaultUnits: ['estudiante', 'curso', 'hora', 'sesión', 'programa'],
    recommendedAllocation: 'horas_trabajo',
    typicalDirectMarginRange: [50, 75],
    typicalOperatingMarginRange: [15, 32],
    indirectAlertThresholdPct: 32,
    sectorNotes:
      'El punto de equilibrio depende críticamente del mínimo de estudiantes por cohorte frente al costo fijo docente y de plataforma.',
    suggestedCostLabels: {
      directo: ['Honorarios docente / tutor', 'Material didáctico y certificados', 'Plataforma streaming por alumno'],
      indirecto: ['LMS y alojamiento', 'Aulas / infraestructura', 'Coordinación académica'],
      admin_comercial: ['Admisiones y mercadeo', 'Pasarela de pagos', 'Administración académica'],
    },
  },
  turismo: {
    id: 'turismo',
    name: 'Turismo y Hotelería',
    shortName: 'Turismo',
    defaultBusinessType: 'servicios',
    defaultItemType: 'servicio',
    defaultUnits: ['noche', 'paquete', 'persona', 'tour', 'prestación'],
    recommendedAllocation: 'unidades',
    typicalDirectMarginRange: [45, 68],
    typicalOperatingMarginRange: [12, 26],
    indirectAlertThresholdPct: 38,
    sectorNotes:
      'Incluye comisiones de OTAs (Booking, Airbnb, agencias) y estacionalidad en la tasa de ocupación mensual.',
    suggestedCostLabels: {
      directo: ['Amenities y lencería', 'Desayuno / alimentación incluida', 'Guía o transporte directo'],
      indirecto: ['Arrendamiento o predial', 'Energía, agua y lavandería', 'Mantenimiento instalaciones'],
      admin_comercial: ['Comisiones OTAs', 'Recepción y reservas', 'Promoción turística'],
    },
  },
  agricultura: {
    id: 'agricultura',
    name: 'Agricultura y Agroindustria',
    shortName: 'Agricultura',
    defaultBusinessType: 'fabricante',
    defaultItemType: 'producto',
    defaultUnits: ['kg', 'tonelada', 'bulto', 'caja', 'litro'],
    recommendedAllocation: 'unidades',
    typicalDirectMarginRange: [25, 48],
    typicalOperatingMarginRange: [10, 22],
    indirectAlertThresholdPct: 30,
    sectorNotes:
      'Contabiliza ciclos de cosecha, fertilizantes, jornales, pérdidas postcosecha y transporte rural hasta centro de acopio.',
    suggestedCostLabels: {
      directo: ['Semillas y plántulas', 'Fertilizantes y fitosanitarios', 'Jornales de cultivo y cosecha', 'Empaque y flete rural'],
      indirecto: ['Riego y energía', 'Arrendamiento tierra', 'Mantenimiento implementos'],
      admin_comercial: ['Asistencia técnica', 'Certificaciones', 'Comercialización'],
    },
  },
  mantenimiento: {
    id: 'mantenimiento',
    name: 'Servicios Técnicos y Mantenimiento',
    shortName: 'Serv. Técnicos',
    defaultBusinessType: 'servicios',
    defaultItemType: 'servicio',
    defaultUnits: ['servicio', 'hora', 'visita', 'contrato', 'prestación'],
    recommendedAllocation: 'horas_trabajo',
    typicalDirectMarginRange: [42, 65],
    typicalOperatingMarginRange: [14, 28],
    indirectAlertThresholdPct: 32,
    sectorNotes:
      'Diferencia repuestos facturados del valor de la hora técnica especializada y el costo de desplazamiento.',
    suggestedCostLabels: {
      directo: ['Repuestos y consumibles', 'Mano de obra técnico', 'Desplazamiento visita'],
      indirecto: ['Taller y herramientas', 'Depreciación instrumentos', 'Seguros y dotación'],
      admin_comercial: ['Coordinación órdenes de servicio', 'Software CRM/tickets', 'Pauta y captación'],
    },
  },
  otro: {
    id: 'otro',
    name: 'Otro Sector Económico',
    shortName: 'General',
    defaultBusinessType: 'servicios',
    defaultItemType: 'producto',
    defaultUnits: ['unidad', 'hora', 'proyecto', 'contrato', 'sesión', 'prestación'],
    recommendedAllocation: 'unidades',
    typicalDirectMarginRange: [30, 60],
    typicalOperatingMarginRange: [12, 25],
    indirectAlertThresholdPct: 35,
    sectorNotes:
      'Configuración multipropósito adaptable a cualquier estructura de costos directos, indirectos y gastos administrativos.',
    suggestedCostLabels: {
      directo: ['Materiales / Insumos directos', 'Mano de obra directa', 'Otros costos directos'],
      indirecto: ['Arrendamiento y servicios', 'Mantenimiento y depreciación', 'Otros costos operativos'],
      admin_comercial: ['Administración', 'Comercialización y marketing', 'Gastos financieros'],
    },
  },
};

export interface CountryTaxPreset {
  countryCode: string;
  countryName: string;
  currencyCode: string;
  currencySymbol: string;
  defaultTaxName: string;
  defaultTaxRatePct: number;
  defaultIncomeTaxPct: number;
  taxRegimes: string[];
}

export const COUNTRY_PRESETS: CountryTaxPreset[] = [
  {
    countryCode: 'CO',
    countryName: 'Colombia',
    currencyCode: 'COP',
    currencySymbol: '$',
    defaultTaxName: 'IVA',
    defaultTaxRatePct: 19,
    defaultIncomeTaxPct: 35,
    taxRegimes: [
      'Régimen Ordinario (Responsable de IVA)',
      'Régimen Simple de Tributación (RST)',
      'No Responsable de IVA',
      'Impuesto Nacional al Consumo (8%)',
      'Exento / Excluido de IVA (0%)',
    ],
  },
  {
    countryCode: 'MX',
    countryName: 'México',
    currencyCode: 'MXN',
    currencySymbol: '$',
    defaultTaxName: 'IVA',
    defaultTaxRatePct: 16,
    defaultIncomeTaxPct: 30,
    taxRegimes: [
      'Régimen General de Ley (Personas Morales)',
      'RESICO (Régimen Simplificado de Confianza)',
      'Persona Física con Actividad Empresarial',
    ],
  },
  {
    countryCode: 'PE',
    countryName: 'Perú',
    currencyCode: 'PEN',
    currencySymbol: 'S/',
    defaultTaxName: 'IGV',
    defaultTaxRatePct: 18,
    defaultIncomeTaxPct: 29.5,
    taxRegimes: ['Régimen General', 'Régimen MYPE Tributario', 'Régimen Especial'],
  },
  {
    countryCode: 'CL',
    countryName: 'Chile',
    currencyCode: 'CLP',
    currencySymbol: '$',
    defaultTaxName: 'IVA',
    defaultTaxRatePct: 19,
    defaultIncomeTaxPct: 27,
    taxRegimes: ['Régimen General (14 A)', 'Pro Pyme General (14 D3)', 'Pro Pyme Transparente'],
  },
  {
    countryCode: 'EC',
    countryName: 'Ecuador',
    currencyCode: 'USD',
    currencySymbol: '$',
    defaultTaxName: 'IVA',
    defaultTaxRatePct: 15,
    defaultIncomeTaxPct: 25,
    taxRegimes: ['Régimen General', 'RIMPE Emprendedor', 'RIMPE Negocio Popular'],
  },
  {
    countryCode: 'ES',
    countryName: 'España',
    currencyCode: 'EUR',
    currencySymbol: '€',
    defaultTaxName: 'IVA',
    defaultTaxRatePct: 21,
    defaultIncomeTaxPct: 25,
    taxRegimes: ['Régimen General IVA (21%)', 'IVA Reducido (10%)', 'Autónomo / Estimación Directa'],
  },
  {
    countryCode: 'US',
    countryName: 'Estados Unidos',
    currencyCode: 'USD',
    currencySymbol: '$',
    defaultTaxName: 'Sales Tax',
    defaultTaxRatePct: 7,
    defaultIncomeTaxPct: 21,
    taxRegimes: ['LLC / Pass-Through', 'C-Corporation', 'Sole Proprietorship'],
  },
];

export const COST_SUBCATEGORY_LABELS: Record<
  CostSubcategory,
  { label: string; category: CostCategory }
> = {
  materia_prima: { label: 'Materia prima', category: 'directo' },
  insumos: { label: 'Insumos', category: 'directo' },
  mano_obra_directa: { label: 'Mano de obra directa', category: 'directo' },
  empaques: { label: 'Empaques', category: 'directo' },
  transporte_directo: { label: 'Transporte directo', category: 'directo' },
  comisiones_directas: { label: 'Comisiones directamente atribuibles', category: 'directo' },
  otros_directos: { label: 'Otros costos directos', category: 'directo' },

  energia: { label: 'Energía', category: 'indirecto' },
  agua: { label: 'Agua', category: 'indirecto' },
  gas: { label: 'Gas', category: 'indirecto' },
  arrendamiento: { label: 'Arrendamiento', category: 'indirecto' },
  mantenimiento: { label: 'Mantenimiento', category: 'indirecto' },
  depreciacion: { label: 'Depreciación', category: 'indirecto' },
  servicios_publicos: { label: 'Servicios públicos', category: 'indirecto' },
  supervision: { label: 'Supervisión', category: 'indirecto' },
  otros_operativos: { label: 'Otros gastos operativos', category: 'indirecto' },

  nomina_admin: { label: 'Nómina administrativa', category: 'admin_comercial' },
  marketing: { label: 'Marketing y publicidad', category: 'admin_comercial' },
  software: { label: 'Software y tecnología', category: 'admin_comercial' },
  comisiones_comerciales: { label: 'Comisiones comerciales', category: 'admin_comercial' },
  gastos_financieros: { label: 'Gastos financieros', category: 'admin_comercial' },
  otros_admin: { label: 'Otros gastos administrativos', category: 'admin_comercial' },
};

export const ALLOCATION_METHOD_LABELS: Record<AllocationMethod, string> = {
  unidades: 'Por unidades producidas / prestadas',
  horas_trabajo: 'Por horas de mano de obra',
  horas_maquina: 'Por horas máquina / equipo',
  porcentaje: 'Por % de participación del producto',
  personalizado: 'Porcentaje personalizado en la partida',
};

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  fabricante: 'Fabricante / Productor',
  distribuidor: 'Distribuidor mayorista',
  comercializador: 'Comercializador / Retail',
  servicios: 'Prestador de servicios',
};
