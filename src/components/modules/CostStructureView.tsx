import React, { useRef, useState } from 'react';
import { Download, FileSpreadsheet, Plus, Sparkles, Trash2, Upload } from 'lucide-react';
import {
  ALLOCATION_METHOD_LABELS,
  COST_SUBCATEGORY_LABELS,
  SECTOR_PROFILES,
} from '../../data/sectors';
import { formatCurrency, formatPct } from '../../engine/pricingEngine';
import { downloadCostTemplateExcel, parseCostFile } from '../../utils/fileHandlers';
import type {
  AllocationMethod,
  BusinessConfig,
  CostBehavior,
  CostCategory,
  CostInputBasis,
  CostItem,
  CostSubcategory,
  PricingCalculationResult,
  ProductItem,
} from '../../types/pricing';

interface CostStructureViewProps {
  business: BusinessConfig;
  product: ProductItem;
  calc: PricingCalculationResult;
  onUpdateProduct: (updated: ProductItem) => Promise<void>;
}

const SUBCATEGORIES_BY_CAT: Record<CostCategory, CostSubcategory[]> = {
  directo: [
    'materia_prima',
    'insumos',
    'mano_obra_directa',
    'empaques',
    'transporte_directo',
    'comisiones_directas',
    'otros_directos',
  ],
  indirecto: [
    'energia',
    'agua',
    'gas',
    'arrendamiento',
    'mantenimiento',
    'depreciacion',
    'servicios_publicos',
    'supervision',
    'otros_operativos',
  ],
  admin_comercial: [
    'nomina_admin',
    'marketing',
    'software',
    'comisiones_comerciales',
    'gastos_financieros',
    'otros_admin',
  ],
};

export const CostStructureView: React.FC<CostStructureViewProps> = ({
  business,
  product,
  calc,
  onUpdateProduct,
}) => {
  const [filterCat, setFilterCat] = useState<'all' | CostCategory>('all');
  const [newItem, setNewItem] = useState<Omit<CostItem, 'id'>>({
    name: '',
    category: 'directo',
    subcategory: 'materia_prima',
    behavior: 'variable',
    amount: 0,
    inputBasis: 'unitario',
    allocationMethod: business.defaultAllocationMethod,
    customAllocationPct: 100,
    isEstimated: false,
  });
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fmt = (v: number) => formatCurrency(v, business.currencyCode, business.currencySymbol);
  const sectorProfile = SECTOR_PROFILES[business.sector];

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim() || newItem.amount <= 0) return;
    const item: CostItem = {
      ...newItem,
      id: `cost-${Date.now()}`,
      name: newItem.name.trim(),
    };
    await onUpdateProduct({
      ...product,
      costItems: [...product.costItems, item],
    });
    setNewItem((prev) => ({ ...prev, name: '', amount: 0 }));
  };

  const handleUpdateItem = async (id: string, patch: Partial<CostItem>) => {
    const updated = product.costItems.map((c) => (c.id === id ? { ...c, ...patch } : c));
    await onUpdateProduct({ ...product, costItems: updated });
  };

  const handleDeleteItem = async (id: string) => {
    const updated = product.costItems.filter((c) => c.id !== id);
    await onUpdateProduct({ ...product, costItems: updated });
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportFeedback(null);
    try {
      const { items, warnings } = await parseCostFile(file);
      if (items.length === 0) {
        setImportError(warnings[0] || 'No se encontraron partidas válidas en el archivo.');
        return;
      }
      await onUpdateProduct({
        ...product,
        costItems: [...product.costItems, ...items],
      });
      setImportFeedback(
        `Se importaron ${items.length} partidas desde ${file.name}.${
          warnings.length > 0 ? ` (${warnings.length} filas omitidas)` : ''
        }`
      );
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Error al procesar el archivo.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddSectorSuggested = async (cat: CostCategory, label: string) => {
    const sub = SUBCATEGORIES_BY_CAT[cat][0];
    const item: CostItem = {
      id: `cost-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: label,
      category: cat,
      subcategory: sub,
      behavior: cat === 'directo' ? 'variable' : 'fijo',
      amount: 0,
      inputBasis: cat === 'directo' ? 'unitario' : 'mensual_global',
      allocationMethod: business.defaultAllocationMethod,
      customAllocationPct: product.participationPct || 100,
      isEstimated: true,
    };
    await onUpdateProduct({
      ...product,
      costItems: [...product.costItems, item],
    });
  };

  const filteredDetails =
    filterCat === 'all'
      ? calc.costDetails
      : calc.costDetails.filter((d) => d.item.category === filterCat);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Módulo 3 · Estructura de costos y asignación de indirectos
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Costos de {product.name}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Clasificación independiente por función (directo, indirecto, admin) y comportamiento (fijo vs variable) sin doble contabilización.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={downloadCostTemplateExcel}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Plantilla Excel
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            onChange={handleFileImport}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            Importar Excel / CSV / TXT
          </button>
        </div>
      </div>

      {importFeedback && (
        <div className="p-3.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 shrink-0" />
          <span>{importFeedback}</span>
        </div>
      )}

      {importError && (
        <div className="p-3.5 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-900 dark:text-rose-200">
          {importError}
        </div>
      )}

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">A. Costos directos</p>
          <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {fmt(calc.directUnit)}/ud
          </p>
          <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {fmt(calc.directTotal)} / mes
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">B. Costos indirectos</p>
          <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {fmt(calc.indirectUnit)}/ud
          </p>
          <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {fmt(calc.indirectTotal)} / mes
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">C. Admin y comerciales</p>
          <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {fmt(calc.adminCommUnit)}/ud
          </p>
          <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {fmt(calc.adminCommTotal)} / mes
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Costo total unitario</p>
          <p className="text-lg font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
            {fmt(calc.fullUnitCost)}/{product.unitOfMeasure}
          </p>
          <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            Fijo: {fmt(calc.fixedTotal)} · Var: {fmt(calc.variableUnit)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {product.itemType === 'servicio' ? 'Costo por hora servicio' : 'Costo por hora operación'}
          </p>
          <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {fmt(calc.costPerHour)}/hora
          </p>
          <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            Tiempo: {product.timePerUnitMinutes} min/{product.unitOfMeasure}
          </p>
        </div>
      </div>

      {/* Add Cost Item Form */}
      <form
        onSubmit={handleAddCost}
        className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Agregar partida de costo
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Distingue entre dato real verificado y estimado
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-3">
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
              Concepto / Partida
            </label>
            <input
              type="text"
              required
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              placeholder="Ej. Materia prima, energía..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
              Categoría
            </label>
            <select
              value={newItem.category}
              onChange={(e) => {
                const cat = e.target.value as CostCategory;
                setNewItem({
                  ...newItem,
                  category: cat,
                  subcategory: SUBCATEGORIES_BY_CAT[cat][0],
                  behavior: cat === 'directo' ? 'variable' : 'fijo',
                  inputBasis: cat === 'directo' ? 'unitario' : 'mensual_global',
                });
              }}
              className="w-full px-2.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="directo">A. Directo</option>
              <option value="indirecto">B. Indirecto</option>
              <option value="admin_comercial">C. Admin / Com.</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
              Subcategoría
            </label>
            <select
              value={newItem.subcategory}
              onChange={(e) =>
                setNewItem({ ...newItem, subcategory: e.target.value as CostSubcategory })
              }
              className="w-full px-2.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {SUBCATEGORIES_BY_CAT[newItem.category].map((sub) => (
                <option key={sub} value={sub}>
                  {COST_SUBCATEGORY_LABELS[sub].label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
              Valor ({business.currencyCode})
            </label>
            <input
              type="number"
              min={0}
              step="any"
              required
              value={newItem.amount || ''}
              onChange={(e) =>
                setNewItem({ ...newItem, amount: Math.max(0, Number(e.target.value)) })
              }
              placeholder="0"
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          <div className="md:col-span-3 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                Base ingreso
              </label>
              <select
                value={newItem.inputBasis}
                onChange={(e) =>
                  setNewItem({ ...newItem, inputBasis: e.target.value as CostInputBasis })
                }
                className="w-full px-2 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="unitario">Unitario</option>
                <option value="total_lote">Total producto</option>
                <option value="mensual_global">Global empresa</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                Comportamiento
              </label>
              <select
                value={newItem.behavior}
                onChange={(e) =>
                  setNewItem({ ...newItem, behavior: e.target.value as CostBehavior })
                }
                className="w-full px-2 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="variable">Variable</option>
                <option value="fijo">Fijo</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {newItem.inputBasis === 'mensual_global' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">Prorrateo:</span>
                <select
                  value={newItem.allocationMethod}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      allocationMethod: e.target.value as AllocationMethod,
                    })
                  }
                  className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                >
                  {Object.entries(ALLOCATION_METHOD_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
                {newItem.allocationMethod === 'personalizado' && (
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newItem.customAllocationPct}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        customAllocationPct: Math.max(0, Math.min(100, Number(e.target.value))),
                      })
                    }
                    className="w-16 px-2 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    title="% asignado a este producto"
                  />
                )}
              </div>
            )}

            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={newItem.isEstimated}
                onChange={(e) => setNewItem({ ...newItem, isEstimated: e.target.checked })}
                className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
              />
              Marcar como valor estimado
            </label>
          </div>

          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar partida
          </button>
        </div>
      </form>

      {/* Sector quick-add suggestions */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 inline-flex items-center gap-1.5 mr-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
          Plantilla rápida ({sectorProfile.shortName}):
        </span>
        {(['directo', 'indirecto', 'admin_comercial'] as CostCategory[]).map((cat) =>
          sectorProfile.suggestedCostLabels[cat].slice(0, 2).map((label) => (
            <button
              key={`${cat}-${label}`}
              type="button"
              onClick={() => handleAddSectorSuggested(cat, label)}
              className="px-2.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              + {label}
            </button>
          ))
        )}
      </div>

      {/* Filter Tabs + Cost Ledger Table */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {[
              { id: 'all', label: `Todas (${product.costItems.length})` },
              { id: 'directo', label: 'A. Directos' },
              { id: 'indirecto', label: 'B. Indirectos' },
              { id: 'admin_comercial', label: 'C. Admin / Com.' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterCat(tab.id as 'all' | CostCategory)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  filterCat === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            Real: {formatPct(calc.audit.realSharePct)} · Estimado: {formatPct(calc.audit.estimatedSharePct)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-medium">Concepto</th>
                <th className="py-3 px-3 font-medium">Categoría</th>
                <th className="py-3 px-3 font-medium">Base y Asignación</th>
                <th className="py-3 px-3 font-medium">Tipo</th>
                <th className="py-3 px-3 font-medium text-right">Valor ingresado</th>
                <th className="py-3 px-3 font-medium text-right">Mensual asignado</th>
                <th className="py-3 px-3 font-medium text-right">Costo unit.</th>
                <th className="py-3 px-3 font-medium text-right">Eliminar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDetails.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    No hay partidas registradas en esta categoría. Agrega una manualmente o importa desde Excel/CSV.
                  </td>
                </tr>
              ) : (
                filteredDetails.map(({ item, periodTotal, unitCost, allocationExplanation }) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-4 min-w-[200px]">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                        className="w-full bg-transparent font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 rounded px-1 -mx-1"
                      />
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {COST_SUBCATEGORY_LABELS[item.subcategory]?.label} ·{' '}
                        {item.isEstimated ? 'Estimado' : 'Real'}
                      </p>
                    </td>

                    <td className="py-3 px-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {item.category === 'directo'
                        ? 'Directo'
                        : item.category === 'indirecto'
                          ? 'Indirecto'
                          : 'Admin/Com.'}
                    </td>

                    <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-400 min-w-[210px]">
                      <div className="flex items-center gap-1.5">
                        <select
                          value={item.inputBasis}
                          onChange={(e) =>
                            handleUpdateItem(item.id, {
                              inputBasis: e.target.value as CostInputBasis,
                            })
                          }
                          className="px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                        >
                          <option value="unitario">Unitario</option>
                          <option value="total_lote">Total producto</option>
                          <option value="mensual_global">Global</option>
                        </select>
                        {item.inputBasis === 'mensual_global' && (
                          <select
                            value={item.allocationMethod}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                allocationMethod: e.target.value as AllocationMethod,
                              })
                            }
                            className="px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs max-w-[140px]"
                          >
                            <option value="unidades">Unidades</option>
                            <option value="horas_trabajo">Horas trabajo</option>
                            <option value="horas_maquina">Horas máquina</option>
                            <option value="porcentaje">% Producto</option>
                            <option value="personalizado">% Manual</option>
                          </select>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {allocationExplanation}
                      </p>
                    </td>

                    <td className="py-3 px-3 text-xs whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateItem(item.id, {
                            behavior: item.behavior === 'fijo' ? 'variable' : 'fijo',
                          })
                        }
                        className="text-slate-700 dark:text-slate-300 underline decoration-dotted underline-offset-4 hover:text-emerald-700"
                      >
                        {item.behavior === 'fijo' ? 'Fijo' : 'Variable'}
                      </button>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={item.amount}
                        onChange={(e) =>
                          handleUpdateItem(item.id, {
                            amount: Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="w-28 text-right font-mono tabular-nums px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </td>

                    <td className="py-3 px-3 text-right font-mono tabular-nums text-xs text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {fmt(periodTotal)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono tabular-nums text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {fmt(unitCost)}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="Eliminar partida"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
