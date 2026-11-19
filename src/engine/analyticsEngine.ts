import { SECTOR_PROFILES } from '../data/sectors';
import type {
  BusinessConfig,
  HistoricalPoint,
  ProductItem,
  ScenarioSnapshot,
  SensitivityBar,
  SimulationVariables,
  StatisticalAnalysisResult,
  StrategicRecommendation,
} from '../types/pricing';
import { calculateProductPricing, formatCurrency, formatPct } from './pricingEngine';

export function simulateScenarioProduct(
  product: ProductItem,
  business: BusinessConfig,
  vars: SimulationVariables
): { simProduct: ProductItem; simBusiness: BusinessConfig } {
  const matFactor = 1 + vars.rawMaterialDeltaPct / 100;
  const laborFactor = 1 + vars.laborDeltaPct / 100;
  const indFactor = 1 + vars.indirectDeltaPct / 100;
  const volFactor = Math.max(0.1, 1 + vars.volumeDeltaPct / 100);
  const compFactor = Math.max(0.2, 1 + vars.competitorPriceDeltaPct / 100);

  const simCosts = product.costItems.map((c) => {
    let multiplier = 1;
    if (
      c.subcategory === 'materia_prima' ||
      c.subcategory === 'insumos' ||
      c.subcategory === 'empaques'
    ) {
      multiplier = matFactor;
    } else if (
      c.subcategory === 'mano_obra_directa' ||
      c.subcategory === 'supervision'
    ) {
      multiplier = laborFactor;
    } else if (c.category === 'indirecto') {
      multiplier = indFactor;
    }
    return { ...c, amount: Math.max(0, c.amount * multiplier) };
  });

  const simCompetitors = product.competitors.map((comp) => ({
    ...comp,
    price: Math.max(0, comp.price * compFactor),
  }));

  const simProduct: ProductItem = {
    ...product,
    estimatedVolume: Math.max(1, Math.round(product.estimatedVolume * volFactor)),
    targetMarginPct:
      vars.targetMarginOverridePct !== null
        ? vars.targetMarginOverridePct
        : product.targetMarginPct,
    discountPct: vars.discountPct,
    commercialCommissionPct: vars.commissionPct,
    costItems: simCosts,
    competitors: simCompetitors,
  };

  const simBusiness: BusinessConfig = {
    ...business,
    taxRatePct: vars.taxRatePct,
  };

  return { simProduct, simBusiness };
}

export function buildThreeScenarios(
  product: ProductItem,
  business: BusinessConfig,
  allProducts: ProductItem[],
  customRealistaVars?: Partial<SimulationVariables>
): ScenarioSnapshot[] {
  const baseVars: SimulationVariables = {
    rawMaterialDeltaPct: customRealistaVars?.rawMaterialDeltaPct ?? 0,
    laborDeltaPct: customRealistaVars?.laborDeltaPct ?? 0,
    indirectDeltaPct: customRealistaVars?.indirectDeltaPct ?? 0,
    volumeDeltaPct: customRealistaVars?.volumeDeltaPct ?? 0,
    targetMarginOverridePct: customRealistaVars?.targetMarginOverridePct ?? null,
    discountPct: customRealistaVars?.discountPct ?? product.discountPct,
    commissionPct: customRealistaVars?.commissionPct ?? product.commercialCommissionPct,
    taxRatePct: customRealistaVars?.taxRatePct ?? business.taxRatePct,
    competitorPriceDeltaPct: customRealistaVars?.competitorPriceDeltaPct ?? 0,
  };

  const configs: Array<{
    id: ScenarioSnapshot['id'];
    label: string;
    description: string;
    vars: SimulationVariables;
  }> = [
    {
      id: 'pesimista',
      label: 'Escenario Pesimista',
      description: 'Alza de insumos (+15%), mano de obra (+8%), indirectos (+10%), caída de volumen (-20%) y presión de descuentos (+4%).',
      vars: {
        ...baseVars,
        rawMaterialDeltaPct: baseVars.rawMaterialDeltaPct + 15,
        laborDeltaPct: baseVars.laborDeltaPct + 8,
        indirectDeltaPct: baseVars.indirectDeltaPct + 10,
        volumeDeltaPct: baseVars.volumeDeltaPct - 20,
        discountPct: Math.min(40, baseVars.discountPct + 4),
        competitorPriceDeltaPct: baseVars.competitorPriceDeltaPct - 5,
      },
    },
    {
      id: 'realista',
      label: 'Escenario Realista (Base)',
      description: 'Parámetros actuales configurados en el simulador con condiciones esperadas de operación.',
      vars: baseVars,
    },
    {
      id: 'optimista',
      label: 'Escenario Optimista',
      description: 'Optimización de compras (-6%), mayor escala (+20% volumen), menor descuento comercial y mejora de eficiencia.',
      vars: {
        ...baseVars,
        rawMaterialDeltaPct: baseVars.rawMaterialDeltaPct - 6,
        indirectDeltaPct: baseVars.indirectDeltaPct - 4,
        volumeDeltaPct: baseVars.volumeDeltaPct + 20,
        discountPct: Math.max(0, baseVars.discountPct - 2),
        competitorPriceDeltaPct: baseVars.competitorPriceDeltaPct + 4,
      },
    },
  ];

  return configs.map((cfg) => {
    const { simProduct, simBusiness } = simulateScenarioProduct(
      product,
      business,
      cfg.vars
    );
    const updatedPortfolio = allProducts.map((p) =>
      p.id === simProduct.id ? simProduct : p
    );
    const calc = calculateProductPricing(simProduct, simBusiness, updatedPortfolio);
    return {
      id: cfg.id,
      label: cfg.label,
      description: cfg.description,
      variables: cfg.vars,
      unitCost: calc.fullUnitCost,
      suggestedNetPrice: calc.suggestedNetPrice,
      suggestedGrossPrice: calc.suggestedGrossPrice,
      monthlyRevenue: calc.monthlyRevenue,
      monthlyProfit: calc.monthlyOperatingProfit,
      operatingMarginPct: calc.operatingMarginPct,
      markupPct: calc.realMarkupOnCostPct,
      breakEvenUnits: calc.breakEvenUnits,
      marketDiffPct: calc.market.diffVsAvgPct,
    };
  });
}

export function computeSensitivityAnalysis(
  product: ProductItem,
  business: BusinessConfig,
  allProducts: ProductItem[],
  baseVars: SimulationVariables
): SensitivityBar[] {
  const { simProduct: baseProd, simBusiness: baseBiz } = simulateScenarioProduct(
    product,
    business,
    baseVars
  );
  const baseCalc = calculateProductPricing(
    baseProd,
    baseBiz,
    allProducts.map((p) => (p.id === baseProd.id ? baseProd : p))
  );

  const perturbations: Array<{
    key: string;
    label: string;
    lowLabel: string;
    highLabel: string;
    applyLow: (v: SimulationVariables) => SimulationVariables;
    applyHigh: (v: SimulationVariables) => SimulationVariables;
  }> = [
    {
      key: 'rawMaterial',
      label: 'Materias primas e insumos',
      lowLabel: '-15%',
      highLabel: '+15%',
      applyLow: (v) => ({ ...v, rawMaterialDeltaPct: v.rawMaterialDeltaPct - 15 }),
      applyHigh: (v) => ({ ...v, rawMaterialDeltaPct: v.rawMaterialDeltaPct + 15 }),
    },
    {
      key: 'volume',
      label: 'Volumen mensual de ventas',
      lowLabel: '-20%',
      highLabel: '+20%',
      applyLow: (v) => ({ ...v, volumeDeltaPct: v.volumeDeltaPct - 20 }),
      applyHigh: (v) => ({ ...v, volumeDeltaPct: v.volumeDeltaPct + 20 }),
    },
    {
      key: 'labor',
      label: 'Mano de obra directa',
      lowLabel: '-15%',
      highLabel: '+15%',
      applyLow: (v) => ({ ...v, laborDeltaPct: v.laborDeltaPct - 15 }),
      applyHigh: (v) => ({ ...v, laborDeltaPct: v.laborDeltaPct + 15 }),
    },
    {
      key: 'indirect',
      label: 'Costos indirectos',
      lowLabel: '-15%',
      highLabel: '+15%',
      applyLow: (v) => ({ ...v, indirectDeltaPct: v.indirectDeltaPct - 15 }),
      applyHigh: (v) => ({ ...v, indirectDeltaPct: v.indirectDeltaPct + 15 }),
    },
    {
      key: 'discount',
      label: 'Descuento comercial',
      lowLabel: '0%',
      highLabel: '+10 pts',
      applyLow: (v) => ({ ...v, discountPct: 0 }),
      applyHigh: (v) => ({ ...v, discountPct: Math.min(40, v.discountPct + 10) }),
    },
    {
      key: 'margin',
      label: 'Margen objetivo',
      lowLabel: '-5 pts',
      highLabel: '+5 pts',
      applyLow: (v) => ({
        ...v,
        targetMarginOverridePct: Math.max(5, (v.targetMarginOverridePct ?? product.targetMarginPct) - 5),
      }),
      applyHigh: (v) => ({
        ...v,
        targetMarginOverridePct: Math.min(80, (v.targetMarginOverridePct ?? product.targetMarginPct) + 5),
      }),
    },
  ];

  const bars: SensitivityBar[] = perturbations.map((p) => {
    const lowSim = simulateScenarioProduct(product, business, p.applyLow(baseVars));
    const lowCalc = calculateProductPricing(
      lowSim.simProduct,
      lowSim.simBusiness,
      allProducts.map((item) => (item.id === lowSim.simProduct.id ? lowSim.simProduct : item))
    );

    const highSim = simulateScenarioProduct(product, business, p.applyHigh(baseVars));
    const highCalc = calculateProductPricing(
      highSim.simProduct,
      highSim.simBusiness,
      allProducts.map((item) => (item.id === highSim.simProduct.id ? highSim.simProduct : item))
    );

    const profitSwing = Math.abs(highCalc.monthlyOperatingProfit - lowCalc.monthlyOperatingProfit);
    const priceSwing = Math.abs(highCalc.suggestedNetPrice - lowCalc.suggestedNetPrice);

    return {
      variableKey: p.key,
      label: p.label,
      lowInputLabel: p.lowLabel,
      highInputLabel: p.highLabel,
      lowProfit: lowCalc.monthlyOperatingProfit,
      highProfit: highCalc.monthlyOperatingProfit,
      baseProfit: baseCalc.monthlyOperatingProfit,
      lowPrice: lowCalc.suggestedNetPrice,
      highPrice: highCalc.suggestedNetPrice,
      basePrice: baseCalc.suggestedNetPrice,
      profitSwing,
      priceSwing,
    };
  });

  return bars.sort((a, b) => b.profitSwing - a.profitSwing);
}

// OLS linear regression helper
function linearRegression(x: number[], y: number[]) {
  const n = x.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0, xVariance: 0 };
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let ssXX = 0;
  let ssYY = 0;
  let ssXY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    ssXX += dx * dx;
    ssYY += dy * dy;
    ssXY += dx * dy;
  }

  if (ssXX === 0) return { slope: 0, intercept: meanY, r2: 0, xVariance: 0 };

  const slope = ssXY / ssXX;
  const intercept = meanY - slope * meanX;
  const r2 = ssYY > 0 ? (ssXY * ssXY) / (ssXX * ssYY) : 1;

  return { slope, intercept, r2, xVariance: ssXX / n };
}

export function runStatisticalAnalysis(
  historicalData: HistoricalPoint[],
  variableUnitCost: number
): StatisticalAnalysisResult {
  const minimumRequired = 4;
  const clean = [...historicalData]
    .filter((d) => d.unitCost > 0 && d.price > 0 && d.unitsSold > 0)
    .sort((a, b) => a.period.localeCompare(b.period));

  if (clean.length < minimumRequired) {
    return {
      hasSufficientData: false,
      observationsCount: clean.length,
      minimumRequired,
      insufficientReason: `Solo existen ${clean.length} observaciones históricas válidas (se requieren al menos ${minimumRequired} períodos con costo, precio y unidades reales). No se asume elasticidad ni tendencia sin datos suficientes.`,
      costTrendSlope: null,
      costTrendR2: null,
      projectedNextUnitCost: null,
      priceElasticity: null,
      elasticityR2: null,
      elasticityInterpretation:
        'Sin datos suficientes para estimar elasticidad precio-demanda.',
      optimalElasticityPrice: null,
    };
  }

  // Cost trend regression over period index
  const tIdx = clean.map((_, i) => i + 1);
  const costs = clean.map((d) => d.unitCost);
  const costReg = linearRegression(tIdx, costs);
  const projectedNextUnitCost = Math.max(
    0,
    costReg.intercept + costReg.slope * (clean.length + 1)
  );

  // Log-Log Demand Elasticity: ln(Q) = a + E * ln(P)
  const lnP = clean.map((d) => Math.log(d.price));
  const lnQ = clean.map((d) => Math.log(d.unitsSold));
  const elastReg = linearRegression(lnP, lnQ);

  if (elastReg.xVariance < 1e-6) {
    return {
      hasSufficientData: true,
      observationsCount: clean.length,
      minimumRequired,
      costTrendSlope: costReg.slope,
      costTrendR2: costReg.r2,
      projectedNextUnitCost,
      priceElasticity: null,
      elasticityR2: null,
      elasticityInterpretation:
        'Los precios históricos no presentan variación suficiente para estimar elasticidad de demanda.',
      optimalElasticityPrice: null,
    };
  }

  const elasticity = elastReg.slope;
  let elasticityInterpretation = '';
  let optimalElasticityPrice: number | null = null;

  if (elasticity >= 0) {
    elasticityInterpretation =
      'Correlación positiva o nula observada en los datos históricos (posible efecto estacional o de posicionamiento; la regla estándar de elasticidad negativa no aplica).';
  } else if (elasticity < -1) {
    elasticityInterpretation = `Demanda elástica (E = ${elasticity.toFixed(2)}): variaciones porcentuales en precio generan cambios más que proporcionales en volumen.`;
    // Lerner index profit-maximizing rule: P* = CVu * (E / (1 + E))
    if (variableUnitCost > 0 && elasticity < -1.05) {
      optimalElasticityPrice = variableUnitCost * (elasticity / (1 + elasticity));
    }
  } else {
    elasticityInterpretation = `Demanda inelástica (E = ${elasticity.toFixed(2)}): los clientes son relativamente poco sensibles a alzas moderadas de precio.`;
  }

  return {
    hasSufficientData: true,
    observationsCount: clean.length,
    minimumRequired,
    costTrendSlope: costReg.slope,
    costTrendR2: costReg.r2,
    projectedNextUnitCost,
    priceElasticity: elasticity,
    elasticityR2: elastReg.r2,
    elasticityInterpretation,
    optimalElasticityPrice,
  };
}

export function generateRecommendations(
  product: ProductItem,
  business: BusinessConfig,
  allProducts: ProductItem[]
): StrategicRecommendation[] {
  const calc = calculateProductPricing(product, business, allProducts);
  const sector = SECTOR_PROFILES[business.sector];
  const recs: StrategicRecommendation[] = [];
  const fmt = (v: number) => formatCurrency(v, business.currencyCode, business.currencySymbol);

  // 1. Data Completeness Guardrail
  if (!calc.audit.isReliableForFinalDecision || calc.audit.missingItems.length > 0) {
    recs.push({
      id: 'data-completeness',
      severity: calc.audit.isReliableForFinalDecision ? 'informativo' : 'critico',
      category: 'datos',
      title: calc.audit.isReliableForFinalDecision
        ? 'Completitud parcial de información'
        : 'Datos insuficientes para precio definitivo',
      detail: `Faltan elementos clave para emitir un precio definitivo: ${calc.audit.missingItems.join(', ')}.`,
      quantitativeEvidence: `Completitud actual: ${calc.audit.scorePct}% · Datos estimados: ${formatPct(calc.audit.estimatedSharePct)}`,
      suggestedAction:
        'Completa las partidas faltantes o valida los costos estimados con facturas reales antes de publicar tarifas.',
    });
  }

  // 2. Current price below break-even / unit cost
  if (product.currentPrice > 0 && product.currentPrice * (1 - product.discountPct / 100 - product.commercialCommissionPct / 100) < calc.fullUnitCost) {
    const deficit = calc.fullUnitCost - product.currentPrice * (1 - product.discountPct / 100 - product.commercialCommissionPct / 100);
    recs.push({
      id: 'below-breakeven',
      severity: 'critico',
      category: 'rentabilidad',
      title: 'El precio actual opera por debajo del punto de equilibrio unitario',
      detail: `Con tu precio actual (${fmt(product.currentPrice)}) estás perdiendo ${fmt(deficit)} por cada ${product.unitOfMeasure} vendido después de descuentos y comisiones.`,
      quantitativeEvidence: `Precio actual neto: ${fmt(product.currentPrice)} vs Costo total unitario: ${fmt(calc.fullUnitCost)}`,
      suggestedAction: `Ajustar el precio al menos al equilibrio (${fmt(calc.breakEvenUnitPrice)}) o al precio sugerido (${fmt(calc.suggestedNetPrice)}).`,
    });
  }

  // 3. Operating margin below target
  if (calc.currentMarginPct !== null && calc.currentMarginPct < product.targetMarginPct - 1) {
    recs.push({
      id: 'margin-below-target',
      severity: 'advertencia',
      category: 'rentabilidad',
      title: 'El margen operativo actual es inferior al objetivo establecido',
      detail: `El margen real con tu tarifa vigente (${formatPct(calc.currentMarginPct)}) está ${(product.targetMarginPct - calc.currentMarginPct).toFixed(1)} puntos por debajo de tu meta (${formatPct(product.targetMarginPct)}).`,
      quantitativeEvidence: `Utilidad mensual actual: ${fmt(calc.currentMonthlyProfit ?? 0)} vs Proyectada: ${fmt(calc.monthlyOperatingProfit)}`,
      suggestedAction:
        'Evalúa una actualización gradual de tarifa o reduce el descuento comercial promedio.',
    });
  }

  // 4. Indirect costs proportion alert
  const indirectShare = calc.fullCostTotal > 0 ? (calc.indirectTotal / calc.fullCostTotal) * 100 : 0;
  if (indirectShare > sector.indirectAlertThresholdPct) {
    recs.push({
      id: 'high-indirects',
      severity: 'advertencia',
      category: 'costos',
      title: 'Los costos indirectos representan una proporción elevada del costo total',
      detail: `Los costos indirectos absorben ${formatPct(indirectShare)} de la estructura total, superando el umbral típico de ${sector.shortName} (${sector.indirectAlertThresholdPct}%).`,
      quantitativeEvidence: `Indirectos: ${fmt(calc.indirectTotal)} / mes (${fmt(calc.indirectUnit)} por ${product.unitOfMeasure})`,
      suggestedAction:
        'Aumenta la utilización de capacidad instalada o renegocia arriendos, energía y contratos operativos fijos.',
    });
  }

  // 5. Direct acquisition / raw material optimization opportunity
  const directShare = calc.fullCostTotal > 0 ? (calc.directTotal / calc.fullCostTotal) * 100 : 0;
  if (directShare > 62) {
    const potentialSavings = calc.directTotal * 0.08;
    recs.push({
      id: 'direct-cost-dominant',
      severity: 'oportunidad',
      category: 'costos',
      title: 'Alto peso de costos directos: oportunidad de negociación con proveedores',
      detail: `El ${formatPct(directShare)} del costo proviene de partidas directas. Reducir un 8% el costo de adquisición incrementaría la utilidad mensual en ${fmt(potentialSavings)} sin subir el precio al cliente.`,
      quantitativeEvidence: `Costo directo unitario: ${fmt(calc.directUnit)} · Ahorro potencial 8%: ${fmt(potentialSavings)}/mes`,
      suggestedAction:
        'Consolida compras por volumen, evalúa proveedores alternativos o revisa mermas operativas.',
    });
  }

  // 6. Market price comparison
  if (calc.market.competitorCount >= 2) {
    if (calc.market.diffVsAvgPct > 15) {
      recs.push({
        id: 'above-market',
        severity: 'advertencia',
        category: 'mercado',
        title: 'Precio sugerido por encima del promedio del mercado',
        detail: `Tu precio sugerido supera en +${calc.market.diffVsAvgPct.toFixed(1)}% el promedio competitivo (${fmt(calc.market.avgPrice)}).`,
        quantitativeEvidence: `Tu precio: ${fmt(calc.suggestedNetPrice)} · Mediana mercado: ${fmt(calc.market.medianPrice)} · Máximo: ${fmt(calc.market.maxPrice)}`,
        suggestedAction:
          product.perceivedValueScore >= 8
            ? 'Refuerza la propuesta de valor premium y diferenciadores visibles en la oferta.'
            : 'Revisa eficiencia de costos o ajusta el margen objetivo para evitar pérdida de participación.',
      });
    } else if (calc.market.diffVsAvgPct < -12 && calc.operatingMarginPct >= sector.typicalOperatingMarginRange[0]) {
      recs.push({
        id: 'pricing-power-room',
        severity: 'oportunidad',
        category: 'mercado',
        title: 'Margen para capturar mayor precio frente al mercado',
        detail: `Tu precio está ${Math.abs(calc.market.diffVsAvgPct).toFixed(1)}% por debajo del promedio del mercado (${fmt(calc.market.avgPrice)}), dejando dinero sobre la mesa si tu calidad es comparable.`,
        quantitativeEvidence: `Brecha hacia promedio de mercado: +${fmt(calc.market.avgPrice - calc.suggestedNetPrice)} por ${product.unitOfMeasure}`,
        suggestedAction:
          'Prueba un incremento escalonado del 5% al 8% acercándote a la mediana sin perder competitividad.',
      });
    }
  }

  // 7. Capacity constraint check
  if (calc.breakEvenUnits !== null && product.capacity > 0 && calc.breakEvenUnits > product.capacity * 0.85) {
    recs.push({
      id: 'capacity-breakeven-tight',
      severity: 'critico',
      category: 'capacidad',
      title: 'Punto de equilibrio cercano o superior a la capacidad instalada',
      detail: `Necesitas vender ${calc.breakEvenUnits.toLocaleString('es-CO')} ${product.unitOfMeasure}(s) para alcanzar equilibrio, lo que representa el ${((calc.breakEvenUnits / product.capacity) * 100).toFixed(1)}% de tu capacidad máxima (${product.capacity.toLocaleString('es-CO')}).`,
      quantitativeEvidence: `Equilibrio: ${calc.breakEvenUnits} uds · Capacidad: ${product.capacity} uds`,
      suggestedAction:
        'Amplía el margen de contribución unitario o reduce costos fijos mensuales para dar holgura operativa.',
    });
  }

  // 8. Estimated costs share warning
  if (calc.audit.estimatedSharePct > 40) {
    recs.push({
      id: 'high-estimated-costs',
      severity: 'informativo',
      category: 'datos',
      title: 'Alta proporción de costos marcados como estimados',
      detail: `El ${formatPct(calc.audit.estimatedSharePct)} del costo total se basa en estimaciones y no en registros reales confirmados.`,
      quantitativeEvidence: `Real: ${formatPct(calc.audit.realSharePct)} · Estimado: ${formatPct(calc.audit.estimatedSharePct)}`,
      suggestedAction:
        'Actualiza las partidas estimadas con facturas de compra y recibos de servicios públicos del último trimestre.',
    });
  }

  return recs;
}
