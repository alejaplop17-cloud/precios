import type {
  AllocatedCostDetail,
  BusinessConfig,
  CompetitorItem,
  CostItem,
  DataCompletenessAudit,
  MarketBenchmarkResult,
  MethodologyPriceResult,
  PositioningTier,
  PricingCalculationResult,
  PricingMethodologyId,
  ProductItem,
} from '../types/pricing';

export const METHODOLOGY_META: Record<
  PricingMethodologyId,
  { name: string; shortName: string; formulaDescription: string }
> = {
  absorbente: {
    name: '1. Costeo total o absorbente',
    shortName: 'Costeo absorbente',
    formulaDescription:
      'Precio = (Costo directo + Indirecto asignado + Admin/Comercial unitario) / (1 - Margen objetivo)',
  },
  variable: {
    name: '2. Costeo variable',
    shortName: 'Costeo variable',
    formulaDescription:
      'Precio = Costo variable unitario / (1 - Margen contribución objetivo), validando cobertura de costos fijos',
  },
  directo: {
    name: '3. Costeo directo',
    shortName: 'Costeo directo',
    formulaDescription:
      'Precio = Costo directo unitario × (1 + Recargo cobertura indirectos y utilidad)',
  },
  margen_contribucion: {
    name: '4. Precio basado en margen de contribución',
    shortName: 'Margen contribución',
    formulaDescription:
      'Precio = Costo variable unitario / (1 - % Margen de contribución deseado)',
  },
  margen_utilidad: {
    name: '5. Precio basado en margen de utilidad sobre ventas',
    shortName: 'Margen sobre ventas',
    formulaDescription:
      'Precio = Costo total unitario / (1 - % Margen operativo deseado sobre el precio de venta)',
  },
  markup: {
    name: '6. Método Markup (recargo sobre costos)',
    shortName: 'Markup sobre costo',
    formulaDescription:
      'Precio = Costo total unitario × (1 + % Recargo sobre el costo)',
  },
  valor_percibido: {
    name: '7. Precio basado en valor percibido',
    shortName: 'Valor percibido',
    formulaDescription:
      'Precio anclado en la disposición a pagar del cliente ajustada por atributo de valor (piso = costo unitario)',
  },
  competencia: {
    name: '8. Precio basado en competencia',
    shortName: 'Basado en competencia',
    formulaDescription:
      'Precio alineado con la mediana/promedio del mercado y el diferencial de calidad percibida',
  },
  punto_equilibrio: {
    name: '9. Precio basado en punto de equilibrio',
    shortName: 'Punto de equilibrio',
    formulaDescription:
      'Precio = Costo variable unitario + (Costos fijos totales / Volumen estimado)',
  },
  rentabilidad_objetivo: {
    name: '10. Precio basado en rentabilidad objetivo',
    shortName: 'Rentabilidad objetivo',
    formulaDescription:
      'Precio = Costo variable unitario + ((Costos fijos + Utilidad mensual deseada) / Volumen estimado)',
  },
};

function safeDiv(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return numerator / denominator;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function formatCurrency(
  amount: number,
  currencyCode = 'COP',
  currencySymbol = '$'
): string {
  if (!Number.isFinite(amount)) return `${currencySymbol}0`;
  const decimals = currencyCode === 'COP' || currencyCode === 'CLP' ? 0 : 2;
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch {
    return `${currencySymbol}${amount.toLocaleString('es-CO', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  }
}

export function formatPct(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '0.0%';
  return `${value.toFixed(decimals)}%`;
}

export function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function computePortfolioDenominators(products: ProductItem[]) {
  const totalUnits = products.reduce(
    (acc, p) => acc + Math.max(0, p.estimatedVolume),
    0
  );
  const totalLaborHours = products.reduce(
    (acc, p) => acc + Math.max(0, p.estimatedVolume) * (Math.max(0, p.timePerUnitMinutes) / 60),
    0
  );
  const totalMachineHours = products.reduce(
    (acc, p) => acc + Math.max(0, p.estimatedVolume) * Math.max(0, p.machineHoursPerUnit),
    0
  );
  const totalParticipation = products.reduce(
    (acc, p) => acc + Math.max(0, p.participationPct),
    0
  );

  return {
    totalUnits,
    totalLaborHours,
    totalMachineHours,
    totalParticipation,
  };
}

export function allocateCostItem(
  item: CostItem,
  product: ProductItem,
  allProducts: ProductItem[]
): AllocatedCostDetail {
  const volume = Math.max(1, product.estimatedVolume);
  const amount = Math.max(0, item.amount);

  if (item.inputBasis === 'unitario') {
    const periodTotal = amount * volume;
    return {
      item,
      allocationShare: 1,
      periodTotal,
      unitCost: amount,
      allocationExplanation: 'Costo unitario directo multiplicado por volumen',
    };
  }

  if (item.inputBasis === 'total_lote') {
    return {
      item,
      allocationShare: 1,
      periodTotal: amount,
      unitCost: safeDiv(amount, volume),
      allocationExplanation: 'Total del período / lote asignado 100% al producto',
    };
  }

  // inputBasis === 'mensual_global' -> distribute across portfolio using chosen method
  const denominators = computePortfolioDenominators(
    allProducts.length > 0 ? allProducts : [product]
  );

  let share = 1;
  let explanation = '100% asignado (único producto activo)';

  if (allProducts.length > 1 || item.allocationMethod === 'personalizado' || item.allocationMethod === 'porcentaje') {
    switch (item.allocationMethod) {
      case 'unidades': {
        share = denominators.totalUnits > 0 ? volume / denominators.totalUnits : 1;
        explanation = `Por unidades (${volume.toLocaleString('es-CO')} / ${denominators.totalUnits.toLocaleString('es-CO')} = ${(share * 100).toFixed(1)}%)`;
        break;
      }
      case 'horas_trabajo': {
        const prodHours = volume * (Math.max(0, product.timePerUnitMinutes) / 60);
        share =
          denominators.totalLaborHours > 0
            ? prodHours / denominators.totalLaborHours
            : 1 / Math.max(1, allProducts.length);
        explanation = `Por horas hombre (${prodHours.toFixed(1)}h / ${denominators.totalLaborHours.toFixed(1)}h = ${(share * 100).toFixed(1)}%)`;
        break;
      }
      case 'horas_maquina': {
        const prodMachine = volume * Math.max(0, product.machineHoursPerUnit);
        share =
          denominators.totalMachineHours > 0
            ? prodMachine / denominators.totalMachineHours
            : 1 / Math.max(1, allProducts.length);
        explanation = `Por horas máquina (${prodMachine.toFixed(1)}h / ${denominators.totalMachineHours.toFixed(1)}h = ${(share * 100).toFixed(1)}%)`;
        break;
      }
      case 'porcentaje': {
        const rawPct = clamp(product.participationPct, 0, 100);
        share =
          denominators.totalParticipation > 0
            ? rawPct / Math.max(100, denominators.totalParticipation)
            : rawPct / 100;
        explanation = `Por participación definida del producto (${(share * 100).toFixed(1)}%)`;
        break;
      }
      case 'personalizado': {
        share = clamp(item.customAllocationPct, 0, 100) / 100;
        explanation = `Porcentaje personalizado en partida (${(share * 100).toFixed(1)}%)`;
        break;
      }
    }
  }

  const periodTotal = amount * share;
  return {
    item,
    allocationShare: share,
    periodTotal,
    unitCost: safeDiv(periodTotal, volume),
    allocationExplanation: explanation,
  };
}

export function analyzeMarketBenchmark(
  competitors: CompetitorItem[],
  referenceNetPrice: number,
  productPerceivedQuality: number
): MarketBenchmarkResult {
  const validCompetitors = competitors.filter((c) => c.price > 0);
  if (validCompetitors.length === 0) {
    return {
      competitorCount: 0,
      avgPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      medianPrice: 0,
      diffVsAvgPct: 0,
      diffVsMedianPct: 0,
      competitivenessIndex: 100,
      recommendedPositioning: 'sin_referencia',
      positioningLabel: 'Sin referencia de competencia',
      positioningRationale:
        'Registra al menos 2 competidores comparables para calcular el índice de competitividad y el rango de mercado.',
    };
  }

  const prices = validCompetitors.map((c) => c.price);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const medianPrice = computeMedian(prices);
  const avgCompQuality =
    validCompetitors.reduce((a, b) => a + clamp(b.perceivedQuality, 1, 10), 0) /
    validCompetitors.length;

  const diffVsAvgPct = avgPrice > 0 ? ((referenceNetPrice - avgPrice) / avgPrice) * 100 : 0;
  const diffVsMedianPct =
    medianPrice > 0 ? ((referenceNetPrice - medianPrice) / medianPrice) * 100 : 0;

  // Competitiveness Index: baseline 100 = price parity adjusted by quality parity
  // > 100 implies stronger value-for-money vs market
  const priceRatio = referenceNetPrice > 0 ? avgPrice / referenceNetPrice : 1;
  const qualityRatio = avgCompQuality > 0 ? productPerceivedQuality / avgCompQuality : 1;
  const competitivenessIndex = clamp(Math.round(priceRatio * qualityRatio * 100), 10, 250);

  let recommendedPositioning: PositioningTier = 'estandar';
  let positioningLabel = 'Estándar de mercado';
  let positioningRationale = '';

  if (diffVsAvgPct <= -12) {
    recommendedPositioning = 'economico';
    positioningLabel = 'Económico / Penetración';
    positioningRationale = `El precio evaluado se ubica ${Math.abs(diffVsAvgPct).toFixed(1)}% por debajo del promedio de mercado, favorable para captación rápida por volumen si el margen lo permite.`;
  } else if (diffVsAvgPct > -12 && diffVsAvgPct <= 4) {
    recommendedPositioning = 'competitivo';
    positioningLabel = 'Competitivo';
    positioningRationale = `Precio alineado dentro de la banda central del mercado (${diffVsAvgPct >= 0 ? '+' : ''}${diffVsAvgPct.toFixed(1)}% vs promedio), equilibrando conversión y rentabilidad.`;
  } else if (diffVsAvgPct > 4 && diffVsAvgPct <= 15) {
    recommendedPositioning = 'estandar';
    positioningLabel = 'Estándar superior';
    positioningRationale = `Precio moderadamente por encima del promedio (+${diffVsAvgPct.toFixed(1)}%). Requiere comunicar diferenciadores tangibles frente a la oferta base.`;
  } else {
    recommendedPositioning = 'premium';
    positioningLabel = 'Premium / Diferenciado';
    positioningRationale =
      productPerceivedQuality >= avgCompQuality + 1
        ? `Precio +${diffVsAvgPct.toFixed(1)}% sobre el promedio respaldado por mayor calidad percibida (${productPerceivedQuality}/10 vs ${avgCompQuality.toFixed(1)}/10 del mercado).`
        : `Precio +${diffVsAvgPct.toFixed(1)}% sobre el promedio, pero la calidad percibida (${productPerceivedQuality}/10) no supera claramente al mercado (${avgCompQuality.toFixed(1)}/10). Riesgo de resistencia comercial.`;
  }

  return {
    competitorCount: validCompetitors.length,
    avgPrice,
    minPrice,
    maxPrice,
    medianPrice,
    diffVsAvgPct,
    diffVsMedianPct,
    competitivenessIndex,
    recommendedPositioning,
    positioningLabel,
    positioningRationale,
  };
}

export function calculateProductPricing(
  product: ProductItem,
  business: BusinessConfig,
  allProducts: ProductItem[] = [product]
): PricingCalculationResult {
  const volume = Math.max(1, product.estimatedVolume);
  const taxMultiplier = 1 + Math.max(0, business.taxRatePct) / 100;

  const costDetails = product.costItems.map((item) =>
    allocateCostItem(item, product, allProducts)
  );

  const directTotal = costDetails
    .filter((d) => d.item.category === 'directo')
    .reduce((acc, d) => acc + d.periodTotal, 0);
  const indirectTotal = costDetails
    .filter((d) => d.item.category === 'indirecto')
    .reduce((acc, d) => acc + d.periodTotal, 0);
  const adminCommTotal = costDetails
    .filter((d) => d.item.category === 'admin_comercial')
    .reduce((acc, d) => acc + d.periodTotal, 0);

  const productionTotal = directTotal + indirectTotal;
  const fullCostTotal = directTotal + indirectTotal + adminCommTotal;

  // Orthogonal classification: Fixed vs Variable (guarantees no double counting)
  const fixedTotal = costDetails
    .filter((d) => d.item.behavior === 'fijo')
    .reduce((acc, d) => acc + d.periodTotal, 0);
  const variableTotal = costDetails
    .filter((d) => d.item.behavior === 'variable')
    .reduce((acc, d) => acc + d.periodTotal, 0);

  const directUnit = safeDiv(directTotal, volume);
  const indirectUnit = safeDiv(indirectTotal, volume);
  const adminCommUnit = safeDiv(adminCommTotal, volume);
  const productionUnit = safeDiv(productionTotal, volume);
  const fullUnitCost = safeDiv(fullCostTotal, volume);
  const fixedUnit = safeDiv(fixedTotal, volume);
  const variableUnit = safeDiv(variableTotal, volume);

  const hoursPerUnit = Math.max(0.01, product.timePerUnitMinutes / 60);
  const costPerHour = fullUnitCost / hoursPerUnit;

  // Check if commercial commissions already exist as CostItem to warn against double counting
  const hasCommissionCostItem = product.costItems.some(
    (c) =>
      (c.subcategory === 'comisiones_directas' ||
        c.subcategory === 'comisiones_comerciales') &&
      c.amount > 0
  );
  const doubleCountRiskWarnings: string[] = [];
  if (hasCommissionCostItem && product.commercialCommissionPct > 0) {
    doubleCountRiskWarnings.push(
      `Tienes comisiones cargadas en la estructura de costos y además un ${product.commercialCommissionPct}% de comisión comercial variable en parámetros de venta. Verifica que no correspondan al mismo concepto para evitar doble contabilización.`
    );
  }

  // Discount + variable commercial commission realization factor
  const discountRate = clamp(product.discountPct, 0, 70) / 100;
  const commissionRate = clamp(product.commercialCommissionPct, 0, 50) / 100;
  const realizationFactor = Math.max(0.1, 1 - discountRate - commissionRate);

  const targetMargin = clamp(product.targetMarginPct, 1, 90) / 100;
  const targetMarkup = Math.max(0, product.targetMarkupPct) / 100;

  // Market baseline for competition-based pricing
  const marketRaw = analyzeMarketBenchmark(
    product.competitors,
    fullUnitCost / (1 - targetMargin),
    product.perceivedValueScore
  );

  // Build all 10 pricing methodologies
  const buildMethodResult = (
    id: PricingMethodologyId,
    rawNetPrice: number,
    isValid = true,
    warning?: string
  ): MethodologyPriceResult => {
    const meta = METHODOLOGY_META[id];
    const cleanPrice = Math.max(0, rawNetPrice);
    const realized = cleanPrice * realizationFactor;
    const unitProfit = realized - fullUnitCost;
    const marginOnSalesPct = realized > 0 ? (unitProfit / realized) * 100 : 0;
    const markupOnCostPct = fullUnitCost > 0 ? (unitProfit / fullUnitCost) * 100 : 0;
    return {
      id,
      name: meta.name,
      shortName: meta.shortName,
      formulaDescription: meta.formulaDescription,
      suggestedNetPrice: cleanPrice,
      suggestedGrossPriceWithTax: cleanPrice * taxMultiplier,
      unitProfit,
      marginOnSalesPct,
      markupOnCostPct,
      isValid,
      warning,
    };
  };

  // 1. Absorbente: covers full cost with target operating margin over realized revenue
  const pAbsorbente =
    fullUnitCost > 0 ? fullUnitCost / ((1 - targetMargin) * realizationFactor) : 0;

  // 2. Costeo variable: targets variable cost coverage + fixed cost absorption
  // Target contribution margin sufficient to cover fixed costs plus desired margin
  const pVariableFloor =
    variableUnit > 0 ? variableUnit / ((1 - Math.max(targetMargin, 0.35)) * realizationFactor) : 0;
  const pVariable = Math.max(pVariableFloor, fullUnitCost / realizationFactor);
  const varWarning =
    pVariableFloor < fullUnitCost / realizationFactor
      ? 'El margen variable puro no cubría costos fijos totales; se ajustó al umbral de cobertura total.'
      : undefined;

  // 3. Costeo directo: direct unit cost + markup covering overhead & profit
  const overheadFactor = directUnit > 0 ? (indirectUnit + adminCommUnit) / directUnit : 0;
  const pDirecto =
    directUnit > 0
      ? (directUnit * (1 + overheadFactor + targetMarkup)) / realizationFactor
      : 0;

  // 4. Margen de contribución: P = CVu / (1 - MC_obj)
  // Ensure MC_obj > fixedCost / (volume * P) or warn
  const desiredContributionMargin = clamp(
    Math.max(targetMargin, fixedTotal > 0 && fullUnitCost > 0 ? fixedUnit / fullUnitCost + targetMargin * 0.6 : targetMargin),
    0.1,
    0.9
  );
  const pMargenContrib =
    variableUnit > 0
      ? variableUnit / ((1 - desiredContributionMargin) * realizationFactor)
      : fullUnitCost / ((1 - targetMargin) * realizationFactor);

  // 5. Margen de utilidad sobre ventas: P = CU / (1 - m_obj)
  const pMargenUtilidad =
    fullUnitCost > 0 ? fullUnitCost / ((1 - targetMargin) * realizationFactor) : 0;

  // 6. Método Markup: P = CU * (1 + r)
  const pMarkup =
    fullUnitCost > 0 ? (fullUnitCost * (1 + targetMarkup)) / realizationFactor : 0;

  // 7. Valor percibido
  const hasPerceivedAnchor = product.perceivedValuePrice > 0;
  const pValorPercibido = hasPerceivedAnchor
    ? product.perceivedValuePrice
    : marketRaw.avgPrice > 0
      ? marketRaw.avgPrice * (0.85 + (product.perceivedValueScore / 10) * 0.3)
      : pAbsorbente;
  const valorWarning = !hasPerceivedAnchor
    ? 'No registraste un precio de valor percibido explícito; se estimó con base en mercado y puntaje de valor.'
    : pValorPercibido * realizationFactor < fullUnitCost
      ? 'El valor percibido ingresado está por debajo del costo unitario total.'
      : undefined;

  // 8. Basado en competencia
  let pCompetencia = 0;
  let compWarning: string | undefined;
  if (marketRaw.competitorCount > 0) {
    const qualityAdj =
      product.perceivedValueScore >= 8
        ? 1.08
        : product.perceivedValueScore <= 4
          ? 0.92
          : 1.0;
    pCompetencia = marketRaw.medianPrice * qualityAdj;
    if (pCompetencia * realizationFactor < fullUnitCost) {
      compWarning =
        'El precio de referencia de la competencia es inferior a tu costo unitario total.';
    }
  } else {
    compWarning = 'Faltan datos de competidores para calcular este método.';
  }

  // 9. Punto de equilibrio
  const pPuntoEquilibrio = fullUnitCost > 0 ? fullUnitCost / realizationFactor : 0;

  // 10. Rentabilidad objetivo (utilidad mensual deseada)
  const desiredMonthlyProfit =
    product.targetMonthlyProfit > 0
      ? product.targetMonthlyProfit
      : fullCostTotal * (targetMarkup > 0 ? targetMarkup : 0.25);
  const pRentabilidadObj =
    volume > 0
      ? (variableUnit + (fixedTotal + desiredMonthlyProfit) / volume) / realizationFactor
      : 0;

  const allMethodologies: MethodologyPriceResult[] = [
    buildMethodResult('absorbente', pAbsorbente, fullUnitCost > 0),
    buildMethodResult('variable', pVariable, fullUnitCost > 0, varWarning),
    buildMethodResult('directo', pDirecto, directUnit > 0),
    buildMethodResult('margen_contribucion', pMargenContrib, fullUnitCost > 0),
    buildMethodResult('margen_utilidad', pMargenUtilidad, fullUnitCost > 0),
    buildMethodResult('markup', pMarkup, fullUnitCost > 0),
    buildMethodResult('valor_percibido', pValorPercibido, pValorPercibido > 0, valorWarning),
    buildMethodResult('competencia', pCompetencia, marketRaw.competitorCount > 0, compWarning),
    buildMethodResult('punto_equilibrio', pPuntoEquilibrio, fullUnitCost > 0),
    buildMethodResult('rentabilidad_objetivo', pRentabilidadObj, fullUnitCost > 0),
  ];

  const selectedMethodology =
    allMethodologies.find((m) => m.id === product.selectedMethodology) ||
    allMethodologies[0];

  const suggestedNetPrice = selectedMethodology.suggestedNetPrice;
  const suggestedGrossPrice = suggestedNetPrice * taxMultiplier;
  const effectiveRealizedPrice = suggestedNetPrice * realizationFactor;

  // Margins & Profitability at suggested realized price
  const grossProfitUnit = effectiveRealizedPrice - productionUnit;
  const grossMarginPct =
    effectiveRealizedPrice > 0 ? (grossProfitUnit / effectiveRealizedPrice) * 100 : 0;

  const operatingProfitUnit = effectiveRealizedPrice - fullUnitCost;
  const operatingMarginPct =
    effectiveRealizedPrice > 0 ? (operatingProfitUnit / effectiveRealizedPrice) * 100 : 0;

  const incomeTaxFactor =
    operatingProfitUnit > 0 ? 1 - clamp(business.incomeTaxProvisionPct, 0, 60) / 100 : 1;
  const estimatedNetProfitUnit = operatingProfitUnit * incomeTaxFactor;
  const estimatedNetMarginPct =
    effectiveRealizedPrice > 0 ? (estimatedNetProfitUnit / effectiveRealizedPrice) * 100 : 0;

  const contributionMarginUnit = effectiveRealizedPrice - variableUnit;
  const contributionMarginPct =
    effectiveRealizedPrice > 0 ? (contributionMarginUnit / effectiveRealizedPrice) * 100 : 0;

  const realMarkupOnCostPct =
    fullUnitCost > 0 ? (operatingProfitUnit / fullUnitCost) * 100 : 0;
  const marginVsMarkupGapPct = realMarkupOnCostPct - operatingMarginPct;

  const monthlyRevenue = effectiveRealizedPrice * volume;
  const monthlyOperatingProfit = operatingProfitUnit * volume;
  const monthlyEstimatedNetProfit = estimatedNetProfitUnit * volume;

  // Current price comparison
  let currentMarginPct: number | null = null;
  let currentMarkupPct: number | null = null;
  let currentMonthlyProfit: number | null = null;
  if (product.currentPrice > 0) {
    const currentRealized = product.currentPrice * realizationFactor;
    const currProfit = currentRealized - fullUnitCost;
    currentMarginPct = currentRealized > 0 ? (currProfit / currentRealized) * 100 : 0;
    currentMarkupPct = fullUnitCost > 0 ? (currProfit / fullUnitCost) * 100 : 0;
    currentMonthlyProfit = currProfit * volume;
  }

  // Break-even & Target Volume
  const breakEvenUnits =
    contributionMarginUnit > 0 ? Math.ceil(fixedTotal / contributionMarginUnit) : null;
  const breakEvenRevenue =
    breakEvenUnits !== null ? breakEvenUnits * effectiveRealizedPrice : null;

  const targetProfitUnits =
    contributionMarginUnit > 0
      ? Math.ceil((fixedTotal + desiredMonthlyProfit) / contributionMarginUnit)
      : null;
  const targetProfitRevenue =
    targetProfitUnits !== null ? targetProfitUnits * effectiveRealizedPrice : null;

  const capacityUtilizationPct =
    product.capacity > 0 ? (volume / product.capacity) * 100 : 100;

  const market = analyzeMarketBenchmark(
    product.competitors,
    suggestedNetPrice,
    product.perceivedValueScore
  );

  // Data Completeness Audit (Quality Criterion #12)
  const missingItems: string[] = [];
  if (directTotal <= 0) missingItems.push('Costos directos (materia prima, insumos o MOD)');
  if (indirectTotal <= 0) missingItems.push('Costos indirectos de operación');
  if (product.estimatedVolume <= 0) missingItems.push('Volumen mensual estimado');
  if (product.competitors.length < 2) missingItems.push('Al menos 2 competidores de referencia');
  if (product.costItems.length === 0) missingItems.push('Partidas de costos registradas');

  const estimatedTotal = costDetails
    .filter((d) => d.item.isEstimated)
    .reduce((acc, d) => acc + d.periodTotal, 0);
  const estimatedSharePct = fullCostTotal > 0 ? (estimatedTotal / fullCostTotal) * 100 : 0;
  const realSharePct = fullCostTotal > 0 ? 100 - estimatedSharePct : 0;

  const scorePct = Math.max(
    0,
    Math.round(
      100 -
        (directTotal <= 0 ? 30 : 0) -
        (indirectTotal <= 0 ? 20 : 0) -
        (adminCommTotal <= 0 ? 10 : 0) -
        (product.competitors.length < 2 ? 20 : 0) -
        (estimatedSharePct > 70 ? 15 : 0)
    )
  );

  const isReliableForFinalDecision =
    directTotal > 0 && product.estimatedVolume > 0 && product.costItems.length >= 2;

  return {
    productId: product.id,
    volume,
    directTotal,
    indirectTotal,
    adminCommTotal,
    productionTotal,
    fullCostTotal,
    fixedTotal,
    variableTotal,
    directUnit,
    indirectUnit,
    adminCommUnit,
    productionUnit,
    fullUnitCost,
    fixedUnit,
    variableUnit,
    costPerHour,
    effectiveHourlyPrice: effectiveRealizedPrice / hoursPerUnit,
    costDetails,
    minimumSurvivalPrice: variableUnit / realizationFactor,
    breakEvenUnitPrice: fullUnitCost / realizationFactor,
    selectedMethodology,
    allMethodologies,
    suggestedNetPrice,
    suggestedGrossPrice,
    effectiveRealizedPrice,
    grossProfitUnit,
    grossMarginPct,
    operatingProfitUnit,
    operatingMarginPct,
    estimatedNetProfitUnit,
    estimatedNetMarginPct,
    contributionMarginUnit,
    contributionMarginPct,
    realMarkupOnCostPct,
    marginVsMarkupGapPct,
    monthlyRevenue,
    monthlyOperatingProfit,
    monthlyEstimatedNetProfit,
    currentMarginPct,
    currentMarkupPct,
    currentMonthlyProfit,
    breakEvenUnits,
    breakEvenRevenue,
    targetProfitUnits,
    targetProfitRevenue,
    capacityUtilizationPct,
    market,
    audit: {
      scorePct,
      isReliableForFinalDecision,
      missingItems,
      estimatedSharePct,
      realSharePct,
      doubleCountRiskWarnings,
    },
  };
}
