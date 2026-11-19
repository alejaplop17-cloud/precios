import React, { useState } from 'react';
import { Copy, Plus, Save, Trash2 } from 'lucide-react';
import { SECTOR_PROFILES } from '../../data/sectors';
import { calculateProductPricing, formatCurrency, formatPct } from '../../engine/pricingEngine';
import type { BusinessConfig, ProductItem } from '../../types/pricing';

interface ProductsCatalogViewProps {
  business: BusinessConfig;
  products: ProductItem[];
  activeProductId: string;
  onSelectProduct: (id: string) => void;
  onSaveProduct: (product: ProductItem) => Promise<void>;
  onCreateProduct: (product: ProductItem) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
}

export const ProductsCatalogView: React.FC<ProductsCatalogViewProps> = ({
  business,
  products,
  activeProductId,
  onSelectProduct,
  onSaveProduct,
  onCreateProduct,
  onDeleteProduct,
}) => {
  const activeProduct = products.find((p) => p.id === activeProductId) ?? products[0];
  const [form, setForm] = useState<ProductItem | null>(activeProduct ?? null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  React.useEffect(() => {
    setForm(activeProduct ?? null);
    setSavedMsg(null);
  }, [activeProductId, activeProduct]);

  const sectorProfile = SECTOR_PROFILES[business.sector];
  const fmt = (v: number) => formatCurrency(v, business.currencyCode, business.currencySymbol);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setSavedMsg(null);
    try {
      await onSaveProduct(form);
      setSavedMsg('Ficha técnica actualizada.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBlank = async () => {
    const newProd: ProductItem = {
      id: `prod-${Date.now()}`,
      businessId: business.id,
      name: `Nuevo ${sectorProfile.defaultItemType} ${products.length + 1}`,
      description: '',
      category: 'Línea Principal',
      itemType: sectorProfile.defaultItemType,
      unitOfMeasure: sectorProfile.defaultUnits[0] ?? 'unidad',
      estimatedVolume: 100,
      presentation: 'Estándar',
      capacity: 200,
      timePerUnitMinutes: sectorProfile.defaultItemType === 'servicio' ? 60 : 15,
      machineHoursPerUnit: 0.1,
      participationPct: 25,
      currentPrice: 0,
      targetMarginPct: 30,
      targetMarkupPct: 42.86,
      targetMonthlyProfit: 5000000,
      perceivedValueScore: 7,
      perceivedValuePrice: 0,
      discountPct: 0,
      commercialCommissionPct: 0,
      selectedMethodology: 'margen_utilidad',
      costItems: [],
      competitors: [],
      historicalData: [],
    };
    await onCreateProduct(newProd);
  };

  const handleDuplicate = async () => {
    if (!form) return;
    const copy: ProductItem = {
      ...form,
      id: `prod-${Date.now()}`,
      name: `${form.name} (Copia)`,
    };
    await onCreateProduct(copy);
  };

  if (!form) {
    return (
      <div className="p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Esta empresa aún no tiene productos o servicios registrados.
        </p>
        <button
          type="button"
          onClick={handleCreateBlank}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Crear primer producto / servicio
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Módulo 2 · Caracterización del producto o servicio
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Catálogo de productos y servicios
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Administra múltiples líneas dentro de {business.companyName}, definiendo unidad de medida, capacidad y tiempos de ejecución.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleDuplicate}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Copy className="w-3.5 h-3.5" />
            Duplicar activo
          </button>
          <button
            type="button"
            onClick={handleCreateBlank}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar producto / servicio
          </button>
        </div>
      </div>

      {/* Portfolio Comparison Table */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <th className="py-3 px-4 font-medium">Producto / Servicio</th>
              <th className="py-3 px-4 font-medium">Tipo · Unidad</th>
              <th className="py-3 px-4 font-medium text-right">Volumen/mes</th>
              <th className="py-3 px-4 font-medium text-right">Costo Unit.</th>
              <th className="py-3 px-4 font-medium text-right">Precio Sugerido</th>
              <th className="py-3 px-4 font-medium text-right">Margen Op.</th>
              <th className="py-3 px-4 font-medium text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {products.map((prod) => {
              const calc = calculateProductPricing(prod, business, products);
              const isSelected = prod.id === activeProductId;
              return (
                <tr
                  key={prod.id}
                  onClick={() => onSelectProduct(prod.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {prod.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {prod.category}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                    {prod.itemType === 'servicio' ? 'Servicio' : 'Producto'} · {prod.unitOfMeasure}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                    {prod.estimatedVolume.toLocaleString('es-CO')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                    {fmt(calc.fullUnitCost)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                    {fmt(calc.suggestedNetPrice)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                    {formatPct(calc.operatingMarginPct)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {products.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProduct(prod.id);
                        }}
                        title="Eliminar producto"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Product Characterization Form */}
      <form
        onSubmit={handleSave}
        className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Ficha técnica: {form.name}
          </h2>
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setForm({ ...form, itemType: 'producto' })}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                form.itemType === 'producto'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Producto físico
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, itemType: 'servicio' })}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                form.itemType === 'servicio'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Servicio / Contrato
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nombre del producto o servicio
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Categoría
            </label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Descripción técnica o alcance
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Unidad de medida
            </label>
            <input
              type="text"
              list="units-list"
              value={form.unitOfMeasure}
              onChange={(e) => setForm({ ...form, unitOfMeasure: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <datalist id="units-list">
              {Array.from(
                new Set([
                  ...sectorProfile.defaultUnits,
                  'unidad',
                  'hora',
                  'proyecto',
                  'contrato',
                  'sesión',
                  'prestación',
                ])
              ).map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Presentación / Formato
            </label>
            <input
              type="text"
              value={form.presentation}
              onChange={(e) => setForm({ ...form, presentation: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Volumen mensual estimado ({form.unitOfMeasure}s)
            </label>
            <input
              type="number"
              min={1}
              value={form.estimatedVolume}
              onChange={(e) =>
                setForm({ ...form, estimatedVolume: Math.max(1, Number(e.target.value)) })
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Capacidad máxima mensual ({form.unitOfMeasure}s)
            </label>
            <input
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) =>
                setForm({ ...form, capacity: Math.max(1, Number(e.target.value)) })
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tiempo requerido por unidad (minutos)
            </label>
            <input
              type="number"
              min={1}
              value={form.timePerUnitMinutes}
              onChange={(e) =>
                setForm({ ...form, timePerUnitMinutes: Math.max(1, Number(e.target.value)) })
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Horas máquina / equipo por unidad
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.machineHoursPerUnit}
              onChange={(e) =>
                setForm({ ...form, machineHoursPerUnit: Math.max(0, Number(e.target.value)) })
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              % Participación en portafolio (prorrateo)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={form.participationPct}
              onChange={(e) =>
                setForm({ ...form, participationPct: Math.max(0, Math.min(100, Number(e.target.value))) })
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Precio de venta actual neto (0 si es nuevo)
            </label>
            <input
              type="number"
              min={0}
              value={form.currentPrice}
              onChange={(e) =>
                setForm({ ...form, currentPrice: Math.max(0, Number(e.target.value)) })
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Calidad / Valor percibido (1 a 10)
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={form.perceivedValueScore}
              onChange={(e) =>
                setForm({
                  ...form,
                  perceivedValueScore: Math.max(1, Math.min(10, Number(e.target.value))),
                })
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <span className="text-xs text-emerald-700 dark:text-emerald-400">
            {savedMsg ?? ''}
          </span>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white inline-flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Guardando...' : 'Guardar producto'}
          </button>
        </div>
      </form>
    </div>
  );
};
