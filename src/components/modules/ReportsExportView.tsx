import React from 'react';
import { FileSpreadsheet, FileText, Table } from 'lucide-react';
import { SECTOR_PROFILES } from '../../data/sectors';
import { formatCurrency, formatPct } from '../../engine/pricingEngine';
import {
  exportReportCsv,
  exportReportExcel,
  exportReportPdf,
} from '../../utils/fileHandlers';
import type {
  BusinessConfig,
  PricingCalculationResult,
  ProductItem,
  ScenarioSnapshot,
  SensitivityBar,
  StrategicRecommendation,
} from '../../types/pricing';

interface ReportsExportViewProps {
  business: BusinessConfig;
  product: ProductItem;
  calc: PricingCalculationResult;
  scenarios: ScenarioSnapshot[];
  sensitivity: SensitivityBar[];
  recommendations: StrategicRecommendation[];
}

export const ReportsExportView: React.FC<ReportsExportViewProps> = ({
  business,
  product,
  calc,
  scenarios,
  sensitivity,
  recommendations,
}) => {
  const fmt = (v: number) => formatCurrency(v, business.currencyCode, business.currencySymbol);
  const sector = SECTOR_PROFILES[business.sector];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Módulo 9 · Informes ejecutivos y exportación
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Centro de reportes descargables
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Exporta el estudio completo de costos, cálculos, competencia, escenarios y recomendaciones en Excel, PDF o CSV.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => exportReportCsv(business, product, calc)}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Table className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={() =>
              exportReportExcel(business, product, calc, scenarios, recommendations)
            }
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            Exportar Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={() =>
              exportReportPdf(
                business,
                product,
                calc,
                scenarios,
                sensitivity,
                recommendations
              )
            }
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" />
            Descargar PDF ejecutivo
          </button>
        </div>
      </div>

      {/* Report Preview Document */}
      <article className="p-6 sm:p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
        <header className="pb-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Vista previa del informe · {business.companyName}
            </p>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              Estudio Técnico de Determinación de Precios: {product.name}
            </h2>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 sm:text-right">
            <p>{business.countryName} · {business.currencyCode}</p>
            <p>{business.taxRegime}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              01. Información del negocio y ficha técnica
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[
                ['Empresa', business.companyName],
                ['Sector / Actividad', `${sector.name} · ${business.economicActivity}`],
                ['Producto / Servicio', `${product.name} (${product.itemType})`],
                ['Unidad y Volumen', `${product.estimatedVolume} ${product.unitOfMeasure}s / mes (Cap. ${product.capacity})`],
                ['Canal y Cliente', `${business.salesChannel} · ${business.targetCustomer}`],
              ].map(([k, v]) => (
                <div key={k} className="py-2 flex justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400">{k}</span>
                  <span className="text-right font-medium text-slate-900 dark:text-slate-100">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              02. Resultados clave y metodología activa
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[
                ['Metodología aplicada', calc.selectedMethodology.name],
                ['Costo total unitario', fmt(calc.fullUnitCost)],
                ['Precio sugerido neto (sin imp.)', fmt(calc.suggestedNetPrice)],
                [`Precio público (con ${business.taxName} ${business.taxRatePct}%)`, fmt(calc.suggestedGrossPrice)],
                ['Margen operativo / Markup', `${formatPct(calc.operatingMarginPct)} margen · ${formatPct(calc.realMarkupOnCostPct)} markup`],
                ['Punto de equilibrio', calc.breakEvenUnits ? `${calc.breakEvenUnits} ${product.unitOfMeasure}s (${fmt(calc.breakEvenRevenue ?? 0)})` : 'No alcanzable'],
              ].map(([k, v]) => (
                <div key={k} className="py-2 flex justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400">{k}</span>
                  <span className="text-right font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            03. Resumen de estructura de costos ({calc.costDetails.length} partidas)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono tabular-nums pt-1">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <p className="text-slate-500 dark:text-slate-400 font-sans">Directos</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                {fmt(calc.directUnit)}/ud · {fmt(calc.directTotal)}/mes
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <p className="text-slate-500 dark:text-slate-400 font-sans">Indirectos asignados</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                {fmt(calc.indirectUnit)}/ud · {fmt(calc.indirectTotal)}/mes
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <p className="text-slate-500 dark:text-slate-400 font-sans">Admin y comerciales</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                {fmt(calc.adminCommUnit)}/ud · {fmt(calc.adminCommTotal)}/mes
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            04. Síntesis de escenarios y recomendaciones incluidas en la descarga
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            El informe exportado en PDF y Excel incorpora además las 10 metodologías comparadas, los {product.competitors.length} competidores analizados, la matriz de escenarios (Pesimista: {fmt(scenarios[0]?.monthlyProfit ?? 0)}, Realista: {fmt(scenarios[1]?.monthlyProfit ?? 0)}, Optimista: {fmt(scenarios[2]?.monthlyProfit ?? 0)}) y las {recommendations.length} recomendaciones estratégicas generadas.
          </p>
        </div>
      </article>
    </div>
  );
};
