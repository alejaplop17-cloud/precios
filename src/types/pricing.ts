export type SectorId =
  | 'manufactura'
  | 'comercio'
  | 'restaurantes'
  | 'servicios_profesionales'
  | 'tecnologia'
  | 'transporte'
  | 'construccion'
  | 'salud'
  | 'educacion'
  | 'turismo'
  | 'agricultura'
  | 'mantenimiento'
  | 'otro';

export type BusinessType =
  | 'fabricante'
  | 'distribuidor'
  | 'comercializador'
  | 'servicios';

export type CostCategory = 'directo' | 'indirecto' | 'admin_comercial';

export type CostSubcategory =
  // Directos
  | 'materia_prima'
  | 'insumos'
  | 'mano_obra_directa'
  | 'empaques'
  | 'transporte_directo'
  | 'comisiones_directas'
  | 'otros_directos'
  // Indirectos
  | 'energia'
  | 'agua'
  | 'gas'
  | 'arrendamiento'
  | 'mantenimiento'
  | 'depreciacion'
  | 'servicios_publicos'
  | 'supervision'
  | 'otros_operativos'
  // Administrativos y comerciales
  | 'nomina_admin'
  | 'marketing'
  | 'software'
  | 'comisiones_comerciales'
  | 'gastos_financieros'
  | 'otros_admin';

export type CostBehavior = 'variable' | 'fijo';

export type CostInputBasis = 'unitario' | 'total_lote' | 'mensual_global';

export type AllocationMethod =
  | 'unidades'
  | 'horas_trabajo'
  | 'horas_maquina'
  | 'porcentaje'
  | 'personalizado';

export type PricingMethodologyId =
  | 'absorbente'
  | 'variable'
  | 'directo'
  | 'margen_contribucion'
  | 'margen_utilidad'
  | 'markup'
  | 'valor_percibido'
  | 'competencia'
  | 'punto_equilibrio'
  | 'rentabilidad_objetivo';

export type PositioningTier =
  | 'economico'
  | 'competitivo'
  | 'estandar'
  | 'premium'
  | 'sin_referencia';

export interface BusinessConfig {
  id: string;
  companyName: string;
  sector: SectorId;
  economicActivity: string;
  countryCode: string;
  countryName: string;
  currencyCode: string;
  currencySymbol: string;
  businessType: BusinessType;
  taxRegime: string;
  taxName: string;
  taxRatePct: number; // e.g., 19 for IVA Colombia
  incomeTaxProvisionPct: number; // Effective corporate tax rate for estimated net margin
  salesChannel: string;
  targetCustomer: string;
  defaultAllocationMethod: AllocationMethod;
  updatedAt: string;
}

export interface CostItem {
  id: string;
  name: string;
  category: CostCategory;
  subcategory: CostSubcategory;
  behavior: CostBehavior;
  amount: number;
  inputBasis: CostInputBasis;
  allocationMethod: AllocationMethod;
  customAllocationPct: number; // 0-100 when allocationMethod === 'personalizado'
  isEstimated: boolean; // Distinguishes real accounting data vs estimates
  notes?: string;
}

export interface CompetitorItem {
  id: string;
  competitorName: string;
  productName: string;
  price: number; // Net price before sales tax or comparable market price
  features: string;
  perceivedQuality: number; // 1 to 10
  salesChannel: string;
  differentiators: string;
}

export interface HistoricalPoint {
  id: string;
  period: string; // YYYY-MM
  unitCost: number;
  price: number;
  unitsSold: number;
}

export interface ProductItem {
  id: string;
  businessId: string;
  name: string;
  description: string;
  category: string;
  itemType: 'producto' | 'servicio';
  unitOfMeasure: string; // unidad, plato, kg, hora, proyecto, sesión, licencia...
  estimatedVolume: number; // Monthly units or service units
  presentation: string;
  capacity: number; // Monthly max capacity in units
  timePerUnitMinutes: number; // Labor/execution time per unit
  machineHoursPerUnit: number;
  participationPct: number; // Manual share % across portfolio (0-100)
  currentPrice: number; // Current net selling price (0 if not yet launched)
  targetMarginPct: number; // Desired margin on sales (0-99)
  targetMarkupPct: number; // Desired markup on cost
  targetMonthlyProfit: number; // Desired monthly profit for rentabilidad_objetivo
  perceivedValueScore: number; // 1-10
  perceivedValuePrice: number; // Customer willingness-to-pay anchor
  discountPct: number; // Average promotional/commercial discount %
  commercialCommissionPct: number; // Variable sales commission % on net price (if not in CostItems)
  selectedMethodology: PricingMethodologyId;
  costItems: CostItem[];
  competitors: CompetitorItem[];
  historicalData: HistoricalPoint[];
}

export interface WorkspaceData {
  business: BusinessConfig;
  products: ProductItem[];
}

export interface AllocatedCostDetail {
  item: CostItem;
  allocationShare: number; // 0..1
  periodTotal: number;
  unitCost: number;
  allocationExplanation: string;
}

export interface MethodologyPriceResult {
  id: PricingMethodologyId;
  name: string;
  shortName: string;
  formulaDescription: string;
  suggestedNetPrice: number;
  suggestedGrossPriceWithTax: number;
  unitProfit: number;
  marginOnSalesPct: number;
  markupOnCostPct: number;
  isValid: boolean;
  warning?: string;
}

export interface MarketBenchmarkResult {
  competitorCount: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  medianPrice: number;
  diffVsAvgPct: number; // ((referencePrice - avgPrice) / avgPrice) * 100
  diffVsMedianPct: number;
  competitivenessIndex: number; // 100 = parity with market avg; >100 cheaper/value advantage or quality-adjusted
  recommendedPositioning: PositioningTier;
  positioningLabel: string;
  positioningRationale: string;
}

export interface DataCompletenessAudit {
  scorePct: number;
  isReliableForFinalDecision: boolean;
  missingItems: string[];
  estimatedSharePct: number;
  realSharePct: number;
  doubleCountRiskWarnings: string[];
}

export interface PricingCalculationResult {
  productId: string;
  volume: number;
  // Cost totals (Period = monthly)
  directTotal: number;
  indirectTotal: number;
  adminCommTotal: number;
  productionTotal: number; // direct + indirect
  fullCostTotal: number; // direct + indirect + adminComm
  fixedTotal: number;
  variableTotal: number;
  // Unit costs
  directUnit: number;
  indirectUnit: number;
  adminCommUnit: number;
  productionUnit: number;
  fullUnitCost: number;
  fixedUnit: number;
  variableUnit: number;
  // Service metrics
  costPerHour: number;
  effectiveHourlyPrice: number;
  // Allocated item trace
  costDetails: AllocatedCostDetail[];
  // Key price levels (Net before IVA/tax)
  minimumSurvivalPrice: number; // Variable unit cost
  breakEvenUnitPrice: number; // Full unit cost at estimatedVolume
  selectedMethodology: MethodologyPriceResult;
  allMethodologies: MethodologyPriceResult[];
  // Effective reference price (suggested price of selected methodology)
  suggestedNetPrice: number;
  suggestedGrossPrice: number; // Including sales tax (e.g., IVA)
  effectiveRealizedPrice: number; // After discountPct & variable commercialCommissionPct
  // Margins & Profitability at suggested price
  grossProfitUnit: number; // P - productionUnit
  grossMarginPct: number;
  operatingProfitUnit: number; // P_eff - fullUnitCost
  operatingMarginPct: number;
  estimatedNetProfitUnit: number;
  estimatedNetMarginPct: number;
  contributionMarginUnit: number; // P_eff - variableUnit
  contributionMarginPct: number;
  realMarkupOnCostPct: number; // (P_eff - fullUnitCost) / fullUnitCost
  marginVsMarkupGapPct: number; // Difference between Markup % and Margin on Sales %
  monthlyRevenue: number;
  monthlyOperatingProfit: number;
  monthlyEstimatedNetProfit: number;
  // Current price comparison (when currentPrice > 0)
  currentMarginPct: number | null;
  currentMarkupPct: number | null;
  currentMonthlyProfit: number | null;
  // Break-even & Target Volume
  breakEvenUnits: number | null; // null if contributionMarginUnit <= 0
  breakEvenRevenue: number | null;
  targetProfitUnits: number | null;
  targetProfitRevenue: number | null;
  capacityUtilizationPct: number;
  // Market
  market: MarketBenchmarkResult;
  // Data quality & warnings
  audit: DataCompletenessAudit;
}

export interface SimulationVariables {
  rawMaterialDeltaPct: number; // -50 to +100
  laborDeltaPct: number;
  indirectDeltaPct: number;
  volumeDeltaPct: number;
  targetMarginOverridePct: number | null;
  discountPct: number;
  commissionPct: number;
  taxRatePct: number;
  competitorPriceDeltaPct: number;
}

export interface ScenarioSnapshot {
  id: 'pesimista' | 'realista' | 'optimista';
  label: string;
  description: string;
  variables: SimulationVariables;
  unitCost: number;
  suggestedNetPrice: number;
  suggestedGrossPrice: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  operatingMarginPct: number;
  markupPct: number;
  breakEvenUnits: number | null;
  marketDiffPct: number;
}

export interface SensitivityBar {
  variableKey: string;
  label: string;
  lowInputLabel: string;
  highInputLabel: string;
  lowProfit: number;
  highProfit: number;
  baseProfit: number;
  lowPrice: number;
  highPrice: number;
  basePrice: number;
  profitSwing: number;
  priceSwing: number;
}

export interface StrategicRecommendation {
  id: string;
  severity: 'critico' | 'advertencia' | 'oportunidad' | 'informativo';
  category: 'rentabilidad' | 'costos' | 'mercado' | 'capacidad' | 'datos';
  title: string;
  detail: string;
  quantitativeEvidence: string;
  suggestedAction: string;
}

export interface StatisticalAnalysisResult {
  hasSufficientData: boolean;
  observationsCount: number;
  minimumRequired: number;
  insufficientReason?: string;
  costTrendSlope: number | null; // Change per period
  costTrendR2: number | null;
  projectedNextUnitCost: number | null;
  priceElasticity: number | null; // Log-log elasticity (% dQ / % dP)
  elasticityR2: number | null;
  elasticityInterpretation: string;
  optimalElasticityPrice: number | null;
}
