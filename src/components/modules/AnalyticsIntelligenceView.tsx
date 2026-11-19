import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Plus, Trash2, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../engine/pricingEngine';
import type {
  BusinessConfig,
  HistoricalPoint,
  PricingCalculationResult,
  ProductItem,
  StatisticalAnalysisResult,
  StrategicRecommendation,
} from '../../types/pricing';
import { CostTrendChart } from '../Charts';

interface AnalyticsIntelligenceViewProps {
  business: BusinessConfig;
  product: ProductItem;
  calc: PricingCalculationResult;
  stats: StatisticalAnalysisResult;
  recommendations: StrategicRecommendation[];
  onUpdateProduct: (updated: ProductItem) => Promise<void>;
}

export const AnalyticsIntelligenceView: React.FC<AnalyticsIntelligenceViewProps> = ({
  business,
  product,
  calc,
  stats,
  recommendations,
  onUpdateProduct,
}) => {
  const fmt = (v: number) => formatCurrency(v, business.currencyCode, business.currencySymbol);
  const [newPoint, setNewPoint] = useState({
    period: '2026-11',
    unitCost: Math.round(calc.fullUnitCost),
    price: Math.round(calc.suggestedNetPrice),
    unitsSold: product.estimatedVolume,
  });

  const handleAddHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoint.period.trim() || newPoint.unitCost <= 0 || newPoint.price <= 0 || newPoint.unitsSold <= 0) {
      return;
    }
    const item: HistoricalPoint = {
      id: `hist-${Date.now()}`,
      ...newPoint,
    };
    await onUpdateProduct({
      ...product,
      historicalData: [...product.historicalData, item],
    });
  };

  const handleDeleteHistory = async (id: string) => {
    await onUpdateProduct({
      ...product,
      historicalData: product.historicalData.filter((h) => h.id !== id),
    });
  };

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-slate-200 dark:border-slate-800">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Módulo 7 · Inteligencia de precios y analítica estadística
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
          Motor de recomendaciones, tendencias y elasticidad
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Reglas cuantitativas sobre costos y márgenes, más modelos de regresión y elasticidad únicamente cuando existen observaciones históricas reales suficientes.
        </p>
      </div>

      {/* Automated Quantitative Recommendations */}
      <section className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Hallazgos y recomendaciones automáticas ({recommendations.length})
          </h2>
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            Completitud de datos: {calc.audit.scorePct}%
          </span>
        </div>

        {recommendations.length === 0 ? (
          <div className="p-4 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-900 dark:text-emerald-200">
              No se detectan desviaciones críticas ni desequilibrios en la estructura actual.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recommendations.map((rec) => {
              const Icon =
                rec.severity === 'critico' || rec.severity === 'advertencia'
                  ? AlertTriangle
                  : rec.severity === 'oportunidad'
                    ? TrendingUp
                    : Info;
              const iconColor =
                rec.severity === 'critico'
                  ? 'text-rose-600'
                  : rec.severity === 'advertencia'
                    ? 'text-amber-600'
                    : rec.severity === 'oportunidad'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-blue-600';

              return (
                <div key={rec.id} className="py-4 first:pt-0 last:pb-0 space-y-1.5">
                  <div className="flex items-start gap-3">
                    <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`font-semibold uppercase ${iconColor}`}>
                          {rec.severity}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500 dark:text-slate-400 capitalize">
                          {rec.category}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {rec.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {rec.detail}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
                        <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          Evidencia: {rec.quantitativeEvidence}
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          Acción: {rec.suggestedAction}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Statistical & Predictive Module */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Modelos estadísticos: Tendencia de costos y elasticidad de demanda
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Regresión lineal OLS y modelo log-log. Nunca asume elasticidad sin al menos {stats.minimumRequired} períodos reales con variación.
            </p>
          </div>

          {!stats.hasSufficientData ? (
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Modelo estadístico en espera de datos suficientes
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {stats.insufficientReason}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                <p className="text-xs text-slate-500 dark:text-slate-400">Tendencia costo unitario</p>
                <p className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                  {stats.costTrendSlope !== null
                    ? `${stats.costTrendSlope >= 0 ? '+' : ''}${fmt(stats.costTrendSlope)}/período`
                    : 'N/D'}
                </p>
                <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                  Proy. próximo: {stats.projectedNextUnitCost ? fmt(stats.projectedNextUnitCost) : 'N/D'} (R²={' '}
                  {stats.costTrendR2?.toFixed(2)})
                </p>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                <p className="text-xs text-slate-500 dark:text-slate-400">Elasticidad precio (Log-Log)</p>
                <p className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                  {stats.priceElasticity !== null ? stats.priceElasticity.toFixed(2) : 'N/D'}
                </p>
                <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                  {stats.elasticityR2 !== null ? `Ajuste R² = ${stats.elasticityR2.toFixed(2)}` : 'Sin variación de precio'}
                </p>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                <p className="text-xs text-slate-500 dark:text-slate-400">Precio óptimo (Regla Lerner)</p>
                <p className="text-base font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
                  {stats.optimalElasticityPrice ? fmt(stats.optimalElasticityPrice) : 'No aplicable'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {stats.optimalElasticityPrice
                    ? 'Maximiza margen total según elasticidad'
                    : 'Requiere E < -1.05'}
                </p>
              </div>
            </div>
          )}

          {stats.hasSufficientData && (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {stats.elasticityInterpretation}
            </p>
          )}

          <CostTrendChart
            history={product.historicalData}
            stats={stats}
            currencyCode={business.currencyCode}
            currencySymbol={business.currencySymbol}
          />
        </section>

        {/* Historical Observations Editor */}
        <section className="lg:col-span-5 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Registro histórico de precios y demanda
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Observaciones reales para alimentar los modelos predictivos ({product.historicalData.length} registradas).
            </p>
          </div>

          <form onSubmit={handleAddHistory} className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                Período (AAAA-MM)
              </label>
              <input
                type="text"
                required
                value={newPoint.period}
                onChange={(e) => setNewPoint({ ...newPoint, period: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                Costo unitario real
              </label>
              <input
                type="number"
                min={1}
                required
                value={newPoint.unitCost}
                onChange={(e) => setNewPoint({ ...newPoint, unitCost: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                Precio venta aplicado
              </label>
              <input
                type="number"
                min={1}
                required
                value={newPoint.price}
                onChange={(e) => setNewPoint({ ...newPoint, price: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                Unidades vendidas
              </label>
              <input
                type="number"
                min={1}
                required
                value={newPoint.unitsSold}
                onChange={(e) => setNewPoint({ ...newPoint, unitsSold: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="col-span-2 flex justify-end pt-1">
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar período
              </button>
            </div>
          </form>

          <div className="overflow-x-auto max-h-72 overflow-y-auto border-t border-slate-100 dark:border-slate-800 pt-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2 font-medium">Período</th>
                  <th className="py-2 font-medium text-right">Costo</th>
                  <th className="py-2 font-medium text-right">Precio</th>
                  <th className="py-2 font-medium text-right">Uds</th>
                  <th className="py-2 font-medium text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono tabular-nums">
                {product.historicalData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center font-sans text-slate-500">
                      Sin observaciones históricas registradas.
                    </td>
                  </tr>
                ) : (
                  [...product.historicalData]
                    .sort((a, b) => b.period.localeCompare(a.period))
                    .map((h) => (
                      <tr key={h.id}>
                        <td className="py-2">{h.period}</td>
                        <td className="py-2 text-right">{fmt(h.unitCost)}</td>
                        <td className="py-2 text-right">{fmt(h.price)}</td>
                        <td className="py-2 text-right">{h.unitsSold}</td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteHistory(h.id)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
