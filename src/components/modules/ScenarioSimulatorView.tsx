import React, { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  buildThreeScenarios,
  computeSensitivityAnalysis,
} from '../../engine/analyticsEngine';
import { formatCurrency, formatPct } from '../../engine/pricingEngine';
import type {
  BusinessConfig,
  ProductItem,
  SimulationVariables,
} from '../../types/pricing';
import { ScenarioComparisonChart, SensitivityTornadoChart } from '../Charts';

interface ScenarioSimulatorViewProps {
  business: BusinessConfig;
  product: ProductItem;
  allProducts: ProductItem[];
}

export const ScenarioSimulatorView: React.FC<ScenarioSimulatorViewProps> = ({
  business,
  product,
  allProducts,
}) => {
  const defaultVars: SimulationVariables = {
    rawMaterialDeltaPct: 0,
    laborDeltaPct: 0,
    indirectDeltaPct: 0,
    volumeDeltaPct: 0,
    targetMarginOverridePct: product.targetMarginPct,
    discountPct: product.discountPct,
    commissionPct: product.commercialCommissionPct,
    taxRatePct: business.taxRatePct,
    competitorPriceDeltaPct: 0,
  };

  const [vars, setVars] = useState<SimulationVariables>(defaultVars);

  React.useEffect(() => {
    setVars({
      rawMaterialDeltaPct: 0,
      laborDeltaPct: 0,
      indirectDeltaPct: 0,
      volumeDeltaPct: 0,
      targetMarginOverridePct: product.targetMarginPct,
      discountPct: product.discountPct,
      commissionPct: product.commercialCommissionPct,
      taxRatePct: business.taxRatePct,
      competitorPriceDeltaPct: 0,
    });
  }, [product.id, business.taxRatePct]);

  const fmt = (v: number) => formatCurrency(v, business.currencyCode, business.currencySymbol);

  const scenarios = useMemo(
    () => buildThreeScenarios(product, business, allProducts, vars),
    [product, business, allProducts, vars]
  );

  const sensitivity = useMemo(
    () => computeSensitivityAnalysis(product, business, allProducts, vars),
    [product, business, allProducts, vars]
  );

  const sliders: Array<{
    key: keyof SimulationVariables;
    label: string;
    min: number;
    max: number;
    step: number;
    suffix: string;
  }> = [
    { key: 'rawMaterialDeltaPct', label: 'Variación materias primas e insumos', min: -30, max: 50, step: 1, suffix: '%' },
    { key: 'laborDeltaPct', label: 'Variación mano de obra directa', min: -30, max: 50, step: 1, suffix: '%' },
    { key: 'indirectDeltaPct', label: 'Variación costos indirectos', min: -30, max: 50, step: 1, suffix: '%' },
    { key: 'volumeDeltaPct', label: 'Variación volumen de producción / ventas', min: -50, max: 100, step: 2, suffix: '%' },
    { key: 'targetMarginOverridePct', label: 'Margen de utilidad esperado', min: 5, max: 75, step: 1, suffix: '%' },
    { key: 'discountPct', label: 'Descuento comercial promedio', min: 0, max: 40, step: 0.5, suffix: '%' },
    { key: 'commissionPct', label: 'Comisión comercial sobre venta', min: 0, max: 25, step: 0.5, suffix: '%' },
    { key: 'taxRatePct', label: `Tarifa ${business.taxName}`, min: 0, max: 30, step: 0.5, suffix: '%' },
    { key: 'competitorPriceDeltaPct', label: 'Movimiento precios competencia', min: -30, max: 30, step: 1, suffix: '%' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Módulo 6 · Simulador de escenarios y análisis de sensibilidad
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Simulación dinámica: {product.name}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Evalúa cómo cambian el costo unitario, el precio sugerido y las utilidades bajo escenarios Pesimista, Realista y Optimista.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setVars(defaultVars)}
          className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restablecer base
        </button>
      </div>

      {/* Controls Grid */}
      <section className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Parámetros interactivos del escenario realista
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
          {sliders.map((s) => {
            const val = Number(vars[s.key] ?? 0);
            return (
              <div key={s.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 dark:text-slate-300">{s.label}</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                    {s.key === 'targetMarginOverridePct' ||
                    s.key === 'discountPct' ||
                    s.key === 'commissionPct' ||
                    s.key === 'taxRatePct'
                      ? `${val}${s.suffix}`
                      : `${val > 0 ? '+' : ''}${val}${s.suffix}`}
                  </span>
                </div>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={val}
                  onChange={(e) =>
                    setVars((prev) => ({ ...prev, [s.key]: Number(e.target.value) }))
                  }
                  className="w-full accent-emerald-700 cursor-pointer"
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Visual Scenario Comparison */}
      <section className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Comparación de escenarios (Pesimista · Realista · Optimista)
        </h2>
        <ScenarioComparisonChart
          scenarios={scenarios}
          currencyCode={business.currencyCode}
          currencySymbol={business.currencySymbol}
        />

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3 font-medium">Escenario</th>
                <th className="py-2.5 px-3 font-medium text-right">Costo Unit.</th>
                <th className="py-2.5 px-3 font-medium text-right">Precio Neto</th>
                <th className="py-2.5 px-3 font-medium text-right">Precio c/{business.taxName}</th>
                <th className="py-2.5 px-3 font-medium text-right">Ingreso Mensual</th>
                <th className="py-2.5 px-3 font-medium text-right">Utilidad Mensual</th>
                <th className="py-2.5 px-3 font-medium text-right">Margen Op.</th>
                <th className="py-2.5 px-3 font-medium text-right">Equilibrio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {scenarios.map((s) => (
                <tr key={s.id}>
                  <td className="py-3 px-3">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{s.label}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{s.description}</p>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    {fmt(s.unitCost)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold">
                    {fmt(s.suggestedNetPrice)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    {fmt(s.suggestedGrossPrice)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    {fmt(s.monthlyRevenue)}
                  </td>
                  <td
                    className={`py-3 px-3 text-right font-mono tabular-nums font-semibold ${
                      s.monthlyProfit < 0
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {fmt(s.monthlyProfit)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    {formatPct(s.operatingMarginPct)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-xs">
                    {s.breakEvenUnits !== null ? `${s.breakEvenUnits} uds` : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sensitivity Tornado */}
      <section className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Análisis de sensibilidad (Gráfico Tornado sobre utilidad mensual)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ordenado de mayor a menor impacto al perturbar cada variable individualmente desde el escenario realista.
          </p>
        </div>
        <SensitivityTornadoChart
          bars={sensitivity}
          currencyCode={business.currencyCode}
          currencySymbol={business.currencySymbol}
        />
      </section>
    </div>
  );
};
