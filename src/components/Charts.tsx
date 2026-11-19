import React, { useState } from 'react';
import { formatCurrency, formatPct } from '../engine/pricingEngine';
import type {
  CompetitorItem,
  HistoricalPoint,
  PricingCalculationResult,
  ProductItem,
  ScenarioSnapshot,
  SensitivityBar,
  StatisticalAnalysisResult,
} from '../types/pricing';

interface CostChartProps {
  calc: PricingCalculationResult;
  currencyCode: string;
  currencySymbol: string;
}

export const CostBreakdownChart: React.FC<CostChartProps> = ({
  calc,
  currencyCode,
  currencySymbol,
}) => {
  const fmt = (v: number) => formatCurrency(v, currencyCode, currencySymbol);
  const total = Math.max(1, calc.fullCostTotal);
  const directPct = (calc.directTotal / total) * 100;
  const indirectPct = (calc.indirectTotal / total) * 100;
  const adminPct = (calc.adminCommTotal / total) * 100;

  const fixedPct = (calc.fixedTotal / total) * 100;
  const variablePct = (calc.variableTotal / total) * 100;

  const segments = [
    {
      label: 'Costos directos',
      value: calc.directTotal,
      unit: calc.directUnit,
      pct: directPct,
      color: 'bg-emerald-700 dark:bg-emerald-600',
      dotColor: '#047857',
    },
    {
      label: 'Costos indirectos',
      value: calc.indirectTotal,
      unit: calc.indirectUnit,
      pct: indirectPct,
      color: 'bg-blue-700 dark:bg-blue-600',
      dotColor: '#1d4ed8',
    },
    {
      label: 'Admin y comerciales',
      value: calc.adminCommTotal,
      unit: calc.adminCommUnit,
      pct: adminPct,
      color: 'bg-slate-600 dark:bg-slate-500',
      dotColor: '#475569',
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-baseline justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
          <span>Distribución funcional del costo mensual</span>
          <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
            Total: {fmt(calc.fullCostTotal)}
          </span>
        </div>
        <div className="h-4 w-full rounded-md overflow-hidden flex bg-slate-100 dark:bg-slate-800">
          {segments.map((seg) =>
            seg.pct > 0 ? (
              <div
                key={seg.label}
                style={{ width: `${seg.pct}%` }}
                className={`${seg.color} transition-all duration-300`}
                title={`${seg.label}: ${formatPct(seg.pct)} (${fmt(seg.value)})`}
              />
            ) : null
          )}
        </div>
        <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {segments.map((seg) => (
            <div
              key={seg.label}
              className="py-2 flex items-center justify-between text-sm gap-4"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: seg.dotColor }}
                />
                <span className="text-slate-700 dark:text-slate-300 truncate">
                  {seg.label}
                </span>
              </div>
              <div className="flex items-center gap-4 shrink-0 font-mono tabular-nums text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  {formatPct(seg.pct)}
                </span>
                <span className="text-slate-900 dark:text-slate-100 font-medium w-28 text-right">
                  {fmt(seg.value)}
                </span>
                <span className="text-slate-500 dark:text-slate-400 w-24 text-right hidden sm:inline">
                  {fmt(seg.unit)}/ud
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-baseline justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
          <span>Comportamiento (Fijos vs Variables)</span>
          <span className="font-mono tabular-nums">
            Fijo {formatPct(fixedPct)} · Variable {formatPct(variablePct)}
          </span>
        </div>
        <div className="h-2.5 w-full rounded-md overflow-hidden flex bg-slate-100 dark:bg-slate-800">
          <div
            style={{ width: `${fixedPct}%` }}
            className="bg-amber-600 dark:bg-amber-500"
            title={`Costos fijos: ${fmt(calc.fixedTotal)}`}
          />
          <div
            style={{ width: `${variablePct}%` }}
            className="bg-teal-600 dark:bg-teal-500"
            title={`Costos variables: ${fmt(calc.variableTotal)}`}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums">
          <span>Fijos: {fmt(calc.fixedTotal)}/mes</span>
          <span>Variables: {fmt(calc.variableUnit)}/ud</span>
        </div>
      </div>
    </div>
  );
};

interface MarketRangeChartProps {
  competitors: CompetitorItem[];
  unitCost: number;
  currentPrice: number;
  suggestedPrice: number;
  avgPrice: number;
  currencyCode: string;
  currencySymbol: string;
}

export const MarketRangeChart: React.FC<MarketRangeChartProps> = ({
  competitors,
  unitCost,
  currentPrice,
  suggestedPrice,
  avgPrice,
  currencyCode,
  currencySymbol,
}) => {
  const fmt = (v: number) => formatCurrency(v, currencyCode, currencySymbol);
  const allValues = [
    unitCost,
    suggestedPrice,
    ...(currentPrice > 0 ? [currentPrice] : []),
    ...competitors.map((c) => c.price),
  ].filter((v) => v > 0);

  if (allValues.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
        Ingresa costos o competidores para visualizar el posicionamiento de precios.
      </div>
    );
  }

  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const span = Math.max(1, rawMax - rawMin);
  const minBound = Math.max(0, rawMin - span * 0.12);
  const maxBound = rawMax + span * 0.12;
  const toX = (val: number) =>
    8 + ((val - minBound) / Math.max(1, maxBound - minBound)) * 84;

  return (
    <div className="space-y-4">
      <div className="relative pt-8 pb-6 px-2">
        <div className="relative h-2 bg-slate-200 dark:bg-slate-800 rounded-full">
          {competitors.length >= 2 && (
            <div
              className="absolute top-0 h-2 bg-slate-300 dark:bg-slate-700 rounded-full"
              style={{
                left: `${toX(Math.min(...competitors.map((c) => c.price)))}%`,
                width: `${Math.max(
                  1,
                  toX(Math.max(...competitors.map((c) => c.price))) -
                    toX(Math.min(...competitors.map((c) => c.price)))
                )}%`,
              }}
            />
          )}

          {/* Unit cost floor marker */}
          {unitCost > 0 && (
            <div
              className="absolute -top-2 w-0.5 h-6 bg-rose-600"
              style={{ left: `${toX(unitCost)}%` }}
              title={`Costo unitario (Equilibrio): ${fmt(unitCost)}`}
            >
              <span className="absolute -top-5 -translate-x-1/2 text-[11px] font-mono tabular-nums text-rose-700 dark:text-rose-400 whitespace-nowrap">
                Costo {fmt(unitCost)}
              </span>
            </div>
          )}

          {/* Competitors */}
          {competitors.map((comp) => (
            <div
              key={comp.id}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-slate-500 dark:bg-slate-400 border-2 border-white dark:border-slate-900 cursor-help"
              style={{ left: `${toX(comp.price)}%` }}
              title={`${comp.competitorName} (${comp.productName}): ${fmt(comp.price)}`}
            />
          ))}

          {/* Market Average */}
          {avgPrice > 0 && (
            <div
              className="absolute -top-1.5 w-0.5 h-5 bg-blue-600"
              style={{ left: `${toX(avgPrice)}%` }}
              title={`Promedio mercado: ${fmt(avgPrice)}`}
            />
          )}

          {/* Current Price */}
          {currentPrice > 0 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rotate-45 bg-amber-600 border-2 border-white dark:border-slate-900"
              style={{ left: `${toX(currentPrice)}%` }}
              title={`Precio actual: ${fmt(currentPrice)}`}
            />
          )}

          {/* Suggested Price */}
          {suggestedPrice > 0 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-emerald-700 border-2 border-white dark:border-slate-900 shadow-sm"
              style={{ left: `${toX(suggestedPrice)}%` }}
              title={`Precio sugerido: ${fmt(suggestedPrice)}`}
            >
              <span className="absolute top-5 -translate-x-1/2 text-[11px] font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                Sugerido {fmt(suggestedPrice)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-700" />
          Precio sugerido
        </span>
        {currentPrice > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rotate-45 bg-amber-600" />
            Precio actual ({fmt(currentPrice)})
          </span>
        )}
        {avgPrice > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-0.5 h-3 bg-blue-600" />
            Promedio mercado ({fmt(avgPrice)})
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
          Competidores ({competitors.length})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-0.5 h-3 bg-rose-600" />
          Piso de costo ({fmt(unitCost)})
        </span>
      </div>
    </div>
  );
};

interface PortfolioChartProps {
  items: Array<{ product: ProductItem; calc: PricingCalculationResult }>;
  currencyCode: string;
  currencySymbol: string;
}

export const PortfolioProfitabilityChart: React.FC<PortfolioChartProps> = ({
  items,
  currencyCode,
  currencySymbol,
}) => {
  const fmt = (v: number) => formatCurrency(v, currencyCode, currencySymbol);
  const maxProfit = Math.max(
    1,
    ...items.map((i) => Math.abs(i.calc.monthlyOperatingProfit))
  );

  return (
    <div className="space-y-3">
      {items.map(({ product, calc }) => {
        const pctWidth = Math.min(
          100,
          (Math.abs(calc.monthlyOperatingProfit) / maxProfit) * 100
        );
        const isNegative = calc.monthlyOperatingProfit < 0;
        return (
          <div key={product.id} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs gap-3">
              <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                {product.name}
              </span>
              <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400 shrink-0">
                {fmt(calc.monthlyOperatingProfit)}/mes · Margen{' '}
                {formatPct(calc.operatingMarginPct)}
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-sm overflow-hidden">
              <div
                className={`h-full rounded-sm ${
                  isNegative
                    ? 'bg-rose-600'
                    : 'bg-emerald-700 dark:bg-emerald-600'
                }`}
                style={{ width: `${Math.max(2, pctWidth)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface ScenarioChartProps {
  scenarios: ScenarioSnapshot[];
  currencyCode: string;
  currencySymbol: string;
}

export const ScenarioComparisonChart: React.FC<ScenarioChartProps> = ({
  scenarios,
  currencyCode,
  currencySymbol,
}) => {
  const fmt = (v: number) => formatCurrency(v, currencyCode, currencySymbol);
  const maxVal = Math.max(
    1,
    ...scenarios.map((s) => Math.max(s.monthlyRevenue, Math.abs(s.monthlyProfit), s.suggestedNetPrice))
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {scenarios.map((s) => {
        const revBar = Math.max(4, (s.monthlyRevenue / maxVal) * 100);
        const profBar = Math.max(4, (Math.max(0, s.monthlyProfit) / maxVal) * 100);
        const accentText =
          s.id === 'pesimista'
            ? 'text-rose-700 dark:text-rose-400'
            : s.id === 'optimista'
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-blue-700 dark:text-blue-400';
        return (
          <div
            key={s.id}
            className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`text-sm font-semibold ${accentText}`}>
                {s.label}
              </span>
              <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
                {formatPct(s.operatingMarginPct)}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-1">
                  <span>Ingreso mensual</span>
                  <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                    {fmt(s.monthlyRevenue)}
                  </span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-slate-700 dark:bg-slate-400"
                    style={{ width: `${revBar}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-1">
                  <span>Utilidad operativa</span>
                  <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                    {fmt(s.monthlyProfit)}
                  </span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-sm overflow-hidden">
                  <div
                    className={`h-full ${
                      s.monthlyProfit < 0 ? 'bg-rose-600' : 'bg-emerald-700'
                    }`}
                    style={{ width: `${profBar}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-xs font-mono tabular-nums">
              <span className="text-slate-500 dark:text-slate-400">Precio neto</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {fmt(s.suggestedNetPrice)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface TornadoChartProps {
  bars: SensitivityBar[];
  currencyCode: string;
  currencySymbol: string;
}

export const SensitivityTornadoChart: React.FC<TornadoChartProps> = ({
  bars,
  currencyCode,
  currencySymbol,
}) => {
  const fmt = (v: number) => formatCurrency(v, currencyCode, currencySymbol);
  const maxSwing = Math.max(1, ...bars.map((b) => b.profitSwing));

  return (
    <div className="space-y-3">
      {bars.map((bar) => {
        const lowDelta = bar.lowProfit - bar.baseProfit;
        const highDelta = bar.highProfit - bar.baseProfit;
        const leftVal = Math.min(lowDelta, highDelta);
        const rightVal = Math.max(lowDelta, highDelta);
        const leftWidth = Math.min(48, (Math.abs(Math.min(0, leftVal)) / maxSwing) * 48);
        const rightWidth = Math.min(48, (Math.max(0, rightVal) / maxSwing) * 48);

        return (
          <div key={bar.variableKey} className="space-y-1">
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {bar.label}
              </span>
              <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                Oscilación: {fmt(bar.profitSwing)}/mes
              </span>
            </div>
            <div className="relative h-6 bg-slate-100 dark:bg-slate-800/80 rounded flex items-center">
              {/* Center baseline */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-400 dark:bg-slate-600 z-10" />
              {/* Negative impact side */}
              <div
                className="absolute right-1/2 h-3.5 bg-rose-600/85 rounded-l-xs"
                style={{ width: `${leftWidth}%` }}
                title={`Escenario adverso: ${fmt(bar.baseProfit + leftVal)}`}
              />
              {/* Positive impact side */}
              <div
                className="absolute left-1/2 h-3.5 bg-emerald-700/85 rounded-r-xs"
                style={{ width: `${rightWidth}%` }}
                title={`Escenario favorable: ${fmt(bar.baseProfit + rightVal)}`}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              <span>
                {bar.lowInputLabel}: {fmt(bar.lowProfit)}
              </span>
              <span>
                {bar.highInputLabel}: {fmt(bar.highProfit)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface CostTrendChartProps {
  history: HistoricalPoint[];
  stats: StatisticalAnalysisResult;
  currencyCode: string;
  currencySymbol: string;
}

export const CostTrendChart: React.FC<CostTrendChartProps> = ({
  history,
  stats,
  currencyCode,
  currencySymbol,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const sorted = [...history].sort((a, b) => a.period.localeCompare(b.period));
  const fmt = (v: number) => formatCurrency(v, currencyCode, currencySymbol);

  if (sorted.length < 2) {
    return (
      <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Registra al menos 2 períodos históricos para visualizar la evolución de costos y precios.
      </div>
    );
  }

  const width = 620;
  const height = 210;
  const padX = 54;
  const padY = 24;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const allY = sorted.flatMap((d) => [d.unitCost, d.price]);
  if (stats.projectedNextUnitCost) allY.push(stats.projectedNextUnitCost);
  const minY = Math.min(...allY) * 0.92;
  const maxY = Math.max(...allY) * 1.06;
  const spanY = Math.max(1, maxY - minY);

  const count = stats.projectedNextUnitCost ? sorted.length + 1 : sorted.length;
  const xFor = (i: number) => padX + (i / Math.max(1, count - 1)) * innerW;
  const yFor = (val: number) => padY + innerH - ((val - minY) / spanY) * innerH;

  const costPoints = sorted.map((d, i) => `${xFor(i)},${yFor(d.unitCost)}`).join(' ');
  const pricePoints = sorted.map((d, i) => `${xFor(i)},${yFor(d.price)}`).join(' ');

  return (
    <div className="space-y-3">
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-52 min-w-[440px]">
          {[0, 0.5, 1].map((ratio) => {
            const yVal = minY + spanY * ratio;
            const yPos = yFor(yVal);
            return (
              <g key={ratio}>
                <line
                  x1={padX}
                  x2={width - padX}
                  y1={yPos}
                  y2={yPos}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeDasharray="3 3"
                />
                <text
                  x={padX - 6}
                  y={yPos + 4}
                  textAnchor="end"
                  className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
                >
                  {Math.round(yVal).toLocaleString('es-CO')}
                </text>
              </g>
            );
          })}

          <polyline
            fill="none"
            stroke="#1d4ed8"
            strokeWidth="2.2"
            points={pricePoints}
          />
          <polyline
            fill="none"
            stroke="#d97706"
            strokeWidth="2.2"
            points={costPoints}
          />

          {stats.projectedNextUnitCost !== null && (
            <line
              x1={xFor(sorted.length - 1)}
              y1={yFor(sorted[sorted.length - 1].unitCost)}
              x2={xFor(sorted.length)}
              y2={yFor(stats.projectedNextUnitCost)}
              stroke="#d97706"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          )}

          {sorted.map((d, i) => (
            <g
              key={d.id}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <circle cx={xFor(i)} cy={yFor(d.price)} r={hoveredIdx === i ? 5 : 3.5} fill="#1d4ed8" />
              <circle cx={xFor(i)} cy={yFor(d.unitCost)} r={hoveredIdx === i ? 5 : 3.5} fill="#d97706" />
              <text
                x={xFor(i)}
                y={height - 6}
                textAnchor="middle"
                className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
              >
                {d.period}
              </text>
            </g>
          ))}

          {stats.projectedNextUnitCost !== null && (
            <g>
              <circle
                cx={xFor(sorted.length)}
                cy={yFor(stats.projectedNextUnitCost)}
                r={4}
                fill="#ffffff"
                stroke="#d97706"
                strokeWidth="2"
              />
              <text
                x={xFor(sorted.length)}
                y={height - 6}
                textAnchor="middle"
                className="fill-amber-700 dark:fill-amber-400 text-[10px] font-mono font-medium"
              >
                Proy.
              </text>
            </g>
          )}
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-700" />
            Precio histórico
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-600" />
            Costo unitario histórico
          </span>
        </div>
        {hoveredIdx !== null && sorted[hoveredIdx] && (
          <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {sorted[hoveredIdx].period}: Precio {fmt(sorted[hoveredIdx].price)} · Costo{' '}
            {fmt(sorted[hoveredIdx].unitCost)} · {sorted[hoveredIdx].unitsSold} uds
          </span>
        )}
      </div>
    </div>
  );
};
