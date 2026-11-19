import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../engine/pricingEngine';
import type {
  BusinessConfig,
  CompetitorItem,
  PricingCalculationResult,
  ProductItem,
} from '../../types/pricing';
import { MarketRangeChart } from '../Charts';

interface MarketCompetitorsViewProps {
  business: BusinessConfig;
  product: ProductItem;
  calc: PricingCalculationResult;
  onUpdateProduct: (updated: ProductItem) => Promise<void>;
}

export const MarketCompetitorsView: React.FC<MarketCompetitorsViewProps> = ({
  business,
  product,
  calc,
  onUpdateProduct,
}) => {
  const fmt = (v: number) => formatCurrency(v, business.currencyCode, business.currencySymbol);
  const [form, setForm] = useState<Omit<CompetitorItem, 'id'>>({
    competitorName: '',
    productName: '',
    price: 0,
    features: '',
    perceivedQuality: 7,
    salesChannel: business.salesChannel,
    differentiators: '',
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.competitorName.trim() || form.price <= 0) return;
    const item: CompetitorItem = {
      ...form,
      id: `comp-${Date.now()}`,
      competitorName: form.competitorName.trim(),
      productName: form.productName.trim() || product.name,
    };
    await onUpdateProduct({
      ...product,
      competitors: [...product.competitors, item],
    });
    setForm((prev) => ({
      ...prev,
      competitorName: '',
      productName: '',
      price: 0,
      features: '',
      differentiators: '',
    }));
  };

  const handleDelete = async (id: string) => {
    await onUpdateProduct({
      ...product,
      competitors: product.competitors.filter((c) => c.id !== id),
    });
  };

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-slate-200 dark:border-slate-800">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Módulo 5 · Análisis del mercado y competencia
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
          Benchmark competitivo y posicionamiento
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Evalúa tu precio sugerido ({fmt(calc.suggestedNetPrice)}) frente a ofertas comparables del mercado.
        </p>
      </div>

      {/* Benchmark KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Promedio mercado</p>
          <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {calc.market.competitorCount > 0 ? fmt(calc.market.avgPrice) : 'N/D'}
          </p>
          <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            Mediana: {calc.market.competitorCount > 0 ? fmt(calc.market.medianPrice) : 'N/D'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Rango competitivo</p>
          <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {calc.market.competitorCount > 0
              ? `${fmt(calc.market.minPrice)} – ${fmt(calc.market.maxPrice)}`
              : 'N/D'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {calc.market.competitorCount} competidores
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Diferencia vs promedio</p>
          <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {calc.market.competitorCount > 0
              ? `${calc.market.diffVsAvgPct >= 0 ? '+' : ''}${calc.market.diffVsAvgPct.toFixed(1)}%`
              : 'N/D'}
          </p>
          <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            Vs mediana: {calc.market.diffVsMedianPct >= 0 ? '+' : ''}
            {calc.market.diffVsMedianPct.toFixed(1)}%
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Índice competitividad</p>
          <p className="text-lg font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
            {calc.market.competitivenessIndex} / 100
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ajustado por calidad ({product.perceivedValueScore}/10)
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Posicionamiento</p>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
            {calc.market.positioningLabel}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Estrategia sugerida</p>
        </div>
      </div>

      {/* Market Range Chart & Rationale */}
      <section className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Mapa visual de precios frente a competidores
        </h2>
        <MarketRangeChart
          competitors={product.competitors}
          unitCost={calc.fullUnitCost}
          currentPrice={product.currentPrice}
          suggestedPrice={calc.suggestedNetPrice}
          avgPrice={calc.market.avgPrice}
          currencyCode={business.currencyCode}
          currencySymbol={business.currencySymbol}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {calc.market.positioningRationale}
        </p>
      </section>

      {/* Add Competitor Form */}
      <form
        onSubmit={handleAdd}
        className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
      >
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Registrar competidor comparable
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
              Nombre del competidor
            </label>
            <input
              type="text"
              required
              value={form.competitorName}
              onChange={(e) => setForm({ ...form, competitorName: e.target.value })}
              placeholder="Ej. Marca Competidora S.A."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
              Producto o servicio equivalente
            </label>
            <input
              type="text"
              value={form.productName}
              onChange={(e) => setForm({ ...form, productName: e.target.value })}
              placeholder="Ej. Presentación similar"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
              Precio venta ({business.currencyCode})
            </label>
            <input
              type="number"
              min={1}
              required
              value={form.price || ''}
              onChange={(e) => setForm({ ...form, price: Math.max(0, Number(e.target.value)) })}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
              Calidad (1–10)
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={form.perceivedQuality}
              onChange={(e) =>
                setForm({
                  ...form,
                  perceivedQuality: Math.max(1, Math.min(10, Number(e.target.value))),
                })
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
              Canal de comercialización
            </label>
            <input
              type="text"
              value={form.salesChannel}
              onChange={(e) => setForm({ ...form, salesChannel: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
              Características principales
            </label>
            <input
              type="text"
              value={form.features}
              onChange={(e) => setForm({ ...form, features: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div className="md:col-span-2 flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                Diferenciadores
              </label>
              <input
                type="text"
                value={form.differentiators}
                onChange={(e) => setForm({ ...form, differentiators: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 h-[38px]"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar
            </button>
          </div>
        </div>
      </form>

      {/* Competitors Table */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <th className="py-3 px-4 font-medium">Competidor</th>
              <th className="py-3 px-3 font-medium">Producto / Servicio</th>
              <th className="py-3 px-3 font-medium">Canal</th>
              <th className="py-3 px-3 font-medium">Características y diferenciadores</th>
              <th className="py-3 px-3 font-medium text-right">Calidad</th>
              <th className="py-3 px-3 font-medium text-right">Precio</th>
              <th className="py-3 px-3 font-medium text-right">Brecha vs sugerido</th>
              <th className="py-3 px-4 font-medium text-right">Eliminar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {product.competitors.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  No hay competidores registrados. Agrega al menos 2 referencias para habilitar el posicionamiento competitivo.
                </td>
              </tr>
            ) : (
              product.competitors.map((comp) => {
                const gapPct =
                  comp.price > 0
                    ? ((calc.suggestedNetPrice - comp.price) / comp.price) * 100
                    : 0;
                return (
                  <tr key={comp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {comp.competitorName}
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      {comp.productName}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-400">
                      {comp.salesChannel}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs">
                      <p>{comp.features}</p>
                      {comp.differentiators && (
                        <p className="text-slate-500 dark:text-slate-500 mt-0.5">
                          Diferenciador: {comp.differentiators}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-xs">
                      {comp.perceivedQuality}/10
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {fmt(comp.price)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-xs">
                      {gapPct >= 0 ? '+' : ''}
                      {gapPct.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(comp.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
