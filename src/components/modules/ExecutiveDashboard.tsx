import React from 'react';
import { ArrowRight, AlertTriangle, CheckCircle2, Info, TrendingUp } from 'lucide-react';
import { SECTOR_PROFILES } from '../../data/sectors';
import { formatCurrency, formatPct } from '../../engine/pricingEngine';
import type {
  PricingCalculationResult,
  ProductItem,
  ScenarioSnapshot,
  SensitivityBar,
  StatisticalAnalysisResult,
  StrategicRecommendation,
  BusinessConfig,
} from '../../types/pricing';
import {
  CostBreakdownChart,
  CostTrendChart,
  MarketRangeChart,
  PortfolioProfitabilityChart,
  ScenarioComparisonChart,
  SensitivityTornadoChart,
} from '../Charts';

export type ModuleKey =
  | 'dashboard'
  | 'negocio'
  | 'productos'
  | 'costos'
  | 'precios'
  | 'mercado'
  | 'simulador'
  | 'analitica'
  | 'informes';

interface ExecutiveDashboardProps {
  business: BusinessConfig;
  product: ProductItem;
  calc: PricingCalculationResult;
  portfolioCalcs: Array<{ product: ProductItem; calc: PricingCalculationResult }>;
  scenarios: ScenarioSnapshot[];
  sensitivity: SensitivityBar[];
  stats: StatisticalAnalysisResult;
  recommendations: StrategicRecommendation[];
  onNavigate: (module: ModuleKey) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  business,
  product,
  calc,
  portfolioCalcs,
  scenarios,
  sensitivity,
  stats,
  recommendations,
  onNavigate,
}) => {
  const fmt = (v: number) => formatCurrency(v, business.currencyCode, business.currencySymbol);
  const sector = SECTOR_PROFILES[business.sector];

  const hasCurrentPrice = product.currentPrice > 0;
  const priceGap = hasCurrentPrice ? calc.suggestedNetPrice - product.currentPrice : 0;

  return (
    <div className="space-y-6">
      {/* Context Summary Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {business.companyName} · {sector.name} · {business.countryName} ({business.currencyCode})
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {product.name}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            {product.description || 'Resumen ejecutivo de costos, márgenes, mercado y precio recomendado.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('precios')}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            Metodologías de precio
          </button>
          <button
            type="button"
            onClick={() => onNavigate('informes')}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            Generar informe
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Data Completeness Notice if missing info */}
      {(!calc.audit.isReliableForFinalDecision || calc.audit.missingItems.length > 0) && (
        <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-950 dark:text-amber-200">
                {calc.audit.isReliableForFinalDecision
                  ? 'Información complementaria recomendada'
                  : 'Recomendación preliminar: faltan datos críticos'}
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                Pendiente por completar: {calc.audit.missingItems.join(' · ')}. Completitud actual:{' '}
                <span className="font-mono tabular-nums font-semibold">{calc.audit.scorePct}%</span>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('costos')}
            className="text-xs font-semibold text-amber-900 dark:text-amber-200 underline underline-offset-4 hover:opacity-80 whitespace-nowrap shrink-0"
          >
            Completar datos
          </button>
        </div>
      )}

      {/* 4-Column Executive KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Costo total unitario</span>
            <span className="font-mono tabular-nums">/{product.unitOfMeasure}</span>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {fmt(calc.fullUnitCost)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Total mes: {fmt(calc.fullCostTotal)} · Var: {fmt(calc.variableUnit)}
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Precio recomendado neto</span>
            <span>{calc.selectedMethodology.shortName}</span>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
            {fmt(calc.suggestedNetPrice)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Con {business.taxName} ({business.taxRatePct}%): {fmt(calc.suggestedGrossPrice)}
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Margen operativo y Markup</span>
            <span>Sobre ventas vs Costo</span>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {formatPct(calc.operatingMarginPct)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Markup: {formatPct(calc.realMarkupOnCostPct)} · Utilidad: {fmt(calc.operatingProfitUnit)}/ud
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Punto de equilibrio</span>
            <span>Capacidad: {formatPct(calc.capacityUtilizationPct, 0)}</span>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {calc.breakEvenUnits !== null
              ? `${calc.breakEvenUnits.toLocaleString('es-CO')} ${product.unitOfMeasure}s`
              : 'No alcanzable'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {calc.breakEvenRevenue !== null
              ? `Ventas mín.: ${fmt(calc.breakEvenRevenue)}/mes`
              : 'Margen de contribución negativo'}
          </p>
        </div>
      </div>

      {/* Secondary Executive Strip: Current Price vs Recommended + Monthly Profit + Market Index */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Precio actual registrado</p>
            <p className="text-lg font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
              {hasCurrentPrice ? fmt(product.currentPrice) : 'Sin tarifa previa'}
            </p>
          </div>
          {hasCurrentPrice && (
            <div className="text-right text-xs font-mono tabular-nums">
              <p
                className={
                  priceGap > 0
                    ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                    : priceGap < 0
                      ? 'text-amber-700 dark:text-amber-400 font-semibold'
                      : 'text-slate-500'
                }
              >
                {priceGap >= 0 ? '+' : ''}
                {fmt(priceGap)} vs sugerido
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Margen actual: {formatPct(calc.currentMarginPct ?? 0)}
              </p>
            </div>
          )}
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Utilidad mensual proyectada ({calc.volume} uds)
            </p>
            <p
              className={`text-lg font-semibold font-mono tabular-nums mt-0.5 ${
                calc.monthlyOperatingProfit >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {fmt(calc.monthlyOperatingProfit)}
            </p>
          </div>
          <div className="text-right text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            <p>Ingreso: {fmt(calc.monthlyRevenue)}</p>
            <p>Neta est.: {fmt(calc.monthlyEstimatedNetProfit)}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Posicionamiento competitivo</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              {calc.market.positioningLabel}
            </p>
          </div>
          <div className="text-right text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            <p>
              {calc.market.competitorCount > 0
                ? `${calc.market.diffVsAvgPct >= 0 ? '+' : ''}${calc.market.diffVsAvgPct.toFixed(1)}% vs prom.`
                : 'Sin competidores'}
            </p>
            <p>Índice: {calc.market.competitivenessIndex}/100</p>
          </div>
        </div>
      </div>

      {/* Main Charts Row 1: Cost Structure + Market Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Estructura y distribución de costos
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real: {formatPct(calc.audit.realSharePct)} · Estimado:{' '}
                {formatPct(calc.audit.estimatedSharePct)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('costos')}
              className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap shrink-0"
            >
              Editar costos
            </button>
          </div>
          <CostBreakdownChart
            calc={calc}
            currencyCode={business.currencyCode}
            currencySymbol={business.currencySymbol}
          />
        </section>

        <section className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Comparación frente al mercado
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {calc.market.competitorCount > 0
                  ? `Rango mercado: ${fmt(calc.market.minPrice)} – ${fmt(calc.market.maxPrice)} · Mediana: ${fmt(calc.market.medianPrice)}`
                  : 'Agrega referencias competitivas en Mercado y Competencia'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('mercado')}
              className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap shrink-0"
            >
              Ver competencia
            </button>
          </div>
          <MarketRangeChart
            competitors={product.competitors}
            unitCost={calc.fullUnitCost}
            currentPrice={product.currentPrice}
            suggestedPrice={calc.suggestedNetPrice}
            avgPrice={calc.market.avgPrice}
            currencyCode={business.currencyCode}
            currencySymbol={business.currencySymbol}
          />
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
            {calc.market.positioningRationale}
          </p>
        </section>
      </div>

      {/* Main Charts Row 2: Scenarios + Sensitivity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Simulación de escenarios financieros
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Impacto de variaciones en insumos, volumen y descuentos
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('simulador')}
              className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap shrink-0"
            >
              Abrir simulador
            </button>
          </div>
          <ScenarioComparisonChart
            scenarios={scenarios}
            currencyCode={business.currencyCode}
            currencySymbol={business.currencySymbol}
          />
        </section>

        <section className="lg:col-span-5 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Análisis de sensibilidad (Top variables)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Variables con mayor impacto sobre la utilidad mensual
            </p>
          </div>
          <SensitivityTornadoChart
            bars={sensitivity.slice(0, 4)}
            currencyCode={business.currencyCode}
            currencySymbol={business.currencySymbol}
          />
        </section>
      </div>

      {/* Row 3: Portfolio Profitability + Historical Trend + Strategic Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Rentabilidad por producto / servicio
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('productos')}
                className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
              >
                Catálogo ({portfolioCalcs.length})
              </button>
            </div>
            <PortfolioProfitabilityChart
              items={portfolioCalcs}
              currencyCode={business.currencyCode}
              currencySymbol={business.currencySymbol}
            />
          </div>

          <div className="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Evolución histórica de costos y precio
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('analitica')}
                className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
              >
                Series y elasticidad
              </button>
            </div>
            <CostTrendChart
              history={product.historicalData}
              stats={stats}
              currencyCode={business.currencyCode}
              currencySymbol={business.currencySymbol}
            />
          </div>
        </section>

        <section className="lg:col-span-7 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Inteligencia de precios y recomendaciones
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Diagnóstico automático basado en costos reales, márgenes y benchmarks
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('analitica')}
              className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap shrink-0"
            >
              Ver detalle analítico
            </button>
          </div>

          {recommendations.length === 0 ? (
            <div className="p-4 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-900 dark:text-emerald-200">
                Estructura saludable: no se detectan alertas críticas en márgenes, equilibrio ni posicionamiento.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recommendations.slice(0, 5).map((rec) => {
                const icon =
                  rec.severity === 'critico' ? (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : rec.severity === 'advertencia' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : rec.severity === 'oportunidad' ? (
                    <TrendingUp className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  );

                const labelColor =
                  rec.severity === 'critico'
                    ? 'text-rose-700 dark:text-rose-400'
                    : rec.severity === 'advertencia'
                      ? 'text-amber-700 dark:text-amber-400'
                      : rec.severity === 'oportunidad'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-blue-700 dark:text-blue-400';

                return (
                  <div key={rec.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex items-start gap-2.5">
                      {icon}
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 text-xs">
                          <span className={`font-semibold uppercase tracking-wide ${labelColor}`}>
                            {rec.severity}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                            {rec.title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {rec.detail}
                        </p>
                        <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {rec.quantitativeEvidence}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
