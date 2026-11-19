import React, { useState } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { formatCurrency, formatPct } from '../../engine/pricingEngine';
import type {
  BusinessConfig,
  PricingCalculationResult,
  PricingMethodologyId,
  ProductItem,
} from '../../types/pricing';

interface PricingEngineViewProps {
  business: BusinessConfig;
  product: ProductItem;
  calc: PricingCalculationResult;
  onUpdateProduct: (updated: ProductItem) => Promise<void>;
}

export const PricingEngineView: React.FC<PricingEngineViewProps> = ({
  business,
  product,
  calc,
  onUpdateProduct,
}) => {
  const fmt = (v: number) => formatCurrency(v, business.currencyCode, business.currencySymbol);
  const [converterMargin, setConverterMargin] = useState<number>(product.targetMarginPct || 30);

  const equivalentMarkupFromMargin =
    converterMargin > 0 && converterMargin < 100
      ? (converterMargin / (100 - converterMargin)) * 100
      : 0;
  const equivalentMarginFromMarkup =
    product.targetMarkupPct > 0
      ? (product.targetMarkupPct / (100 + product.targetMarkupPct)) * 100
      : 0;

  const updateParam = async (patch: Partial<ProductItem>) => {
    await onUpdateProduct({ ...product, ...patch });
  };

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-slate-200 dark:border-slate-800">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Módulo 4 · Motor de cálculo de precios y rentabilidad
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
          Metodologías de fijación de precios
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Compara 10 metodologías contables y comerciales en tiempo real, con trazabilidad completa de fórmulas y diferenciación entre margen y recargo (Markup).
        </p>
      </div>

      {calc.audit.doubleCountRiskWarnings.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>{calc.audit.doubleCountRiskWarnings[0]}</div>
        </div>
      )}

      {/* Commercial Parameters Control Strip */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Margen objetivo s/ventas (%)
          </label>
          <input
            type="number"
            min={1}
            max={89}
            step={0.5}
            value={product.targetMarginPct}
            onChange={(e) => {
              const val = Math.max(1, Math.min(89, Number(e.target.value)));
              setConverterMargin(val);
              updateParam({ targetMarginPct: val });
            }}
            className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Markup s/costo (%)
          </label>
          <input
            type="number"
            min={0}
            max={500}
            step={0.5}
            value={product.targetMarkupPct}
            onChange={(e) =>
              updateParam({ targetMarkupPct: Math.max(0, Number(e.target.value)) })
            }
            className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Utilidad mensual objetivo
          </label>
          <input
            type="number"
            min={0}
            value={product.targetMonthlyProfit}
            onChange={(e) =>
              updateParam({ targetMonthlyProfit: Math.max(0, Number(e.target.value)) })
            }
            className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Valor percibido ({business.currencyCode})
          </label>
          <input
            type="number"
            min={0}
            value={product.perceivedValuePrice}
            onChange={(e) =>
              updateParam({ perceivedValuePrice: Math.max(0, Number(e.target.value)) })
            }
            className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Descuento promedio (%)
          </label>
          <input
            type="number"
            min={0}
            max={60}
            step={0.5}
            value={product.discountPct}
            onChange={(e) =>
              updateParam({ discountPct: Math.max(0, Math.min(60, Number(e.target.value))) })
            }
            className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Comisión venta (%)
          </label>
          <input
            type="number"
            min={0}
            max={40}
            step={0.5}
            value={product.commercialCommissionPct}
            onChange={(e) =>
              updateParam({
                commercialCommissionPct: Math.max(0, Math.min(40, Number(e.target.value))),
              })
            }
            className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
        </div>
      </div>

      {/* Margin vs Markup Clarification Module */}
      <section className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-7 space-y-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Diferenciación matemática: Margen sobre ventas vs Recargo (Markup) sobre costo
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Confundir ambos conceptos erosiona la rentabilidad real. El <strong>Margen</strong> divide la utilidad entre el precio de venta (<code className="font-mono">(P − C) / P</code>); el <strong>Markup</strong> divide la utilidad entre el costo (<code className="font-mono">(P − C) / C</code>).
          </p>
        </div>

        <div className="lg:col-span-5 grid grid-cols-2 gap-4 text-xs border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-6">
          <div>
            <p className="text-slate-500 dark:text-slate-400">
              Para lograr {formatPct(converterMargin)} de margen
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5">
              Requiere {formatPct(equivalentMarkupFromMargin)} Markup
            </p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">
              Un Markup de {formatPct(product.targetMarkupPct)}
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-blue-700 dark:text-blue-400 mt-0.5">
              Equivale a {formatPct(equivalentMarginFromMarkup)} Margen
            </p>
          </div>
        </div>
      </section>

      {/* 10 Methodologies Comparison Table */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <th className="py-3 px-4 font-medium">Metodología</th>
              <th className="py-3 px-3 font-medium text-right">Precio neto</th>
              <th className="py-3 px-3 font-medium text-right">
                Con {business.taxName} ({business.taxRatePct}%)
              </th>
              <th className="py-3 px-3 font-medium text-right">Utilidad / ud</th>
              <th className="py-3 px-3 font-medium text-right">Margen s/ventas</th>
              <th className="py-3 px-3 font-medium text-right">Markup s/costo</th>
              <th className="py-3 px-4 font-medium text-right">Seleccionar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {calc.allMethodologies.map((m) => {
              const isSelected = m.id === product.selectedMethodology;
              return (
                <tr
                  key={m.id}
                  onClick={() =>
                    updateParam({ selectedMethodology: m.id as PricingMethodologyId })
                  }
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/25'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <td className="py-3.5 px-4 max-w-md">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {m.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {m.formulaDescription}
                    </p>
                    {m.warning && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                        Nota: {m.warning}
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {m.isValid ? fmt(m.suggestedNetPrice) : 'N/D'}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {m.isValid ? fmt(m.suggestedGrossPriceWithTax) : 'N/D'}
                  </td>
                  <td
                    className={`py-3.5 px-3 text-right font-mono tabular-nums whitespace-nowrap ${
                      m.unitProfit < 0
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {m.isValid ? fmt(m.unitProfit) : 'N/D'}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {m.isValid ? formatPct(m.marginOnSalesPct) : 'N/D'}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {m.isValid ? formatPct(m.markupOnCostPct) : 'N/D'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg inline-flex items-center gap-1 whitespace-nowrap ${
                        isSelected
                          ? 'bg-emerald-700 text-white'
                          : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      {isSelected ? 'Activa' : 'Aplicar'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Full Traceability Breakdown for Active Methodology */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Trazabilidad unitaria del precio activo
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {[
              ['Costo directo unitario', fmt(calc.directUnit)],
              ['Costo indirecto unitario asignado', fmt(calc.indirectUnit)],
              ['Costo de producción unitario (Directo + Indirecto)', fmt(calc.productionUnit)],
              ['Gasto administrativo y comercial unitario', fmt(calc.adminCommUnit)],
              ['Costo total unitario (Piso de equilibrio total)', fmt(calc.fullUnitCost)],
              ['Precio mínimo supervivencia (Costo variable)', fmt(calc.minimumSurvivalPrice)],
              ['Precio sugerido neto (antes de descuentos)', fmt(calc.suggestedNetPrice)],
              ['Precio efectivo realizado (neto tras desc./comis.)', fmt(calc.effectiveRealizedPrice)],
              [`Precio final al público (incl. ${business.taxName} ${business.taxRatePct}%)`, fmt(calc.suggestedGrossPrice)],
            ].map(([label, val]) => (
              <div key={label} className="py-2.5 flex items-center justify-between gap-4">
                <span className="text-slate-600 dark:text-slate-400">{label}</span>
                <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                  {val}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Márgenes, punto de equilibrio y volumen objetivo
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {[
              ['Margen bruto (sobre costo producción)', formatPct(calc.grossMarginPct)],
              ['Margen de contribución unitario', `${fmt(calc.contributionMarginUnit)} (${formatPct(calc.contributionMarginPct)})`],
              ['Margen operativo (EBIT sobre ventas)', formatPct(calc.operatingMarginPct)],
              [`Margen neto estimado (prov. renta ${business.incomeTaxProvisionPct}%)`, formatPct(calc.estimatedNetMarginPct)],
              ['Recargo real sobre costo total (Markup)', formatPct(calc.realMarkupOnCostPct)],
              ['Punto de equilibrio en unidades', calc.breakEvenUnits !== null ? `${calc.breakEvenUnits.toLocaleString('es-CO')} ${product.unitOfMeasure}s / mes` : 'No alcanzable'],
              ['Punto de equilibrio en dinero', calc.breakEvenRevenue !== null ? `${fmt(calc.breakEvenRevenue)} / mes` : 'No alcanzable'],
              [`Volumen para utilidad objetivo (${fmt(product.targetMonthlyProfit)})`, calc.targetProfitUnits !== null ? `${calc.targetProfitUnits.toLocaleString('es-CO')} ${product.unitOfMeasure}s / mes` : 'No alcanzable'],
              ['Tarifa efectiva equivalente por hora', `${fmt(calc.effectiveHourlyPrice)} / hora`],
            ].map(([label, val]) => (
              <div key={label} className="py-2.5 flex items-center justify-between gap-4">
                <span className="text-slate-600 dark:text-slate-400">{label}</span>
                <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                  {val}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
