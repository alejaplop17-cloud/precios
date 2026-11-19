import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ALLOCATION_METHOD_LABELS, COST_SUBCATEGORY_LABELS, SECTOR_PROFILES } from '../data/sectors';
import { formatCurrency, formatPct } from '../engine/pricingEngine';
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
  ScenarioSnapshot,
  SensitivityBar,
  StrategicRecommendation,
} from '../types/pricing';

function normalizeStr(val: unknown): string {
  return String(val ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseCategory(raw: unknown): CostCategory {
  const s = normalizeStr(raw);
  if (s.includes('indirect')) return 'indirecto';
  if (s.includes('admin') || s.includes('comerc') || s.includes('gasto')) return 'admin_comercial';
  return 'directo';
}

function parseSubcategory(raw: unknown, cat: CostCategory): CostSubcategory {
  const s = normalizeStr(raw);
  for (const [key, meta] of Object.entries(COST_SUBCATEGORY_LABELS)) {
    if (normalizeStr(key) === s || normalizeStr(meta.label).includes(s)) {
      return key as CostSubcategory;
    }
  }
  if (cat === 'directo') return 'otros_directos';
  if (cat === 'indirecto') return 'otros_operativos';
  return 'otros_admin';
}

function parseBehavior(raw: unknown): CostBehavior {
  const s = normalizeStr(raw);
  if (s.includes('fij')) return 'fijo';
  return 'variable';
}

function parseBasis(raw: unknown): CostInputBasis {
  const s = normalizeStr(raw);
  if (s.includes('global') || s.includes('mensual')) return 'mensual_global';
  if (s.includes('lote') || s.includes('total')) return 'total_lote';
  return 'unitario';
}

function parseAllocation(raw: unknown): AllocationMethod {
  const s = normalizeStr(raw);
  if (s.includes('hora') && s.includes('maq')) return 'horas_maquina';
  if (s.includes('hora')) return 'horas_trabajo';
  if (s.includes('porcent')) return 'porcentaje';
  if (s.includes('person')) return 'personalizado';
  return 'unidades';
}

function parseNumber(raw: unknown): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  const cleaned = String(raw ?? '')
    .replace(/[^\d.,-]/g, '')
    .replace(/\.(?=\d{3}(?:[^\d]|$))/g, '')
    .replace(',', '.');
  const num = Number(cleaned);
  return Number.isFinite(num) ? Math.max(0, num) : 0;
}

export async function parseCostFile(file: File): Promise<{
  items: CostItem[];
  warnings: string[];
}> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  let rows: Record<string, unknown>[] = [];
  const warnings: string[] = [];

  if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) {
      return { items: [], warnings: ['El archivo Excel no contiene hojas.'] };
    }
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[firstSheet],
      { defval: '' }
    );
  } else if (ext === 'csv' || ext === 'txt') {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      warnings.push('No se pudieron detectar encabezados estándar; se intentó lectura por columnas.');
    }
    rows = parsed.data;
  } else {
    throw new Error('Formato no soportado. Usa archivos .xlsx, .xls, .csv o .txt.');
  }

  if (rows.length === 0) {
    return {
      items: [],
      warnings: ['El archivo está vacío o no tiene filas debajo de los encabezados.'],
    };
  }

  const items: CostItem[] = [];
  rows.forEach((row, idx) => {
    const entries = Object.entries(row);
    const findCol = (keywords: string[]) => {
      const found = entries.find(([k]) => {
        const nk = normalizeStr(k);
        return keywords.some((kw) => nk.includes(kw));
      });
      return found ? found[1] : undefined;
    };

    const nameRaw =
      findCol(['nombre', 'concepto', 'partida', 'descripcion', 'item', 'name', 'costo']) ??
      entries[0]?.[1];
    const name = String(nameRaw ?? '').trim();
    const amountRaw =
      findCol(['monto', 'valor', 'importe', 'costo', 'precio', 'amount', 'total']) ??
      entries[1]?.[1];
    const amount = parseNumber(amountRaw);

    if (!name || amount <= 0) {
      warnings.push(`Fila ${idx + 2} omitida: nombre vacío o monto igual a 0.`);
      return;
    }

    const category = parseCategory(findCol(['categoria', 'tipo_costo', 'grupo', 'category']));
    const subcategory = parseSubcategory(
      findCol(['subcategoria', 'rubro', 'detalle']),
      category
    );
    const behavior = parseBehavior(findCol(['comportamiento', 'fijo', 'variable', 'behavior']));
    const inputBasis = parseBasis(findCol(['base', 'unidad_ingreso', 'basis', 'alcance']));
    const allocationMethod = parseAllocation(findCol(['asignacion', 'metodo', 'prorrateo']));
    const estRaw = normalizeStr(findCol(['estimado', 'real', 'tipo_dato']));
    const isEstimated = estRaw.includes('si') || estRaw.includes('est') || estRaw === 'true';

    items.push({
      id: `imp-${Date.now()}-${idx}`,
      name,
      category,
      subcategory,
      behavior,
      amount,
      inputBasis,
      allocationMethod,
      customAllocationPct: 100,
      isEstimated,
      notes: String(findCol(['nota', 'observacion', 'notes']) ?? '').trim() || undefined,
    });
  });

  return { items, warnings };
}

export function downloadCostTemplateExcel() {
  const sampleRows = [
    {
      Concepto: 'Materia prima principal',
      Categoria: 'directo',
      Subcategoria: 'materia_prima',
      Comportamiento: 'variable',
      Monto: 12500,
      Base: 'unitario',
      Asignacion: 'unidades',
      Estimado: 'No',
      Notas: 'Costo por unidad según factura proveedor',
    },
    {
      Concepto: 'Arrendamiento local o planta',
      Categoria: 'indirecto',
      Subcategoria: 'arrendamiento',
      Comportamiento: 'fijo',
      Monto: 3500000,
      Base: 'mensual_global',
      Asignacion: 'porcentaje',
      Estimado: 'No',
      Notas: 'Canon mensual',
    },
    {
      Concepto: 'Marketing y pauta digital',
      Categoria: 'admin_comercial',
      Subcategoria: 'marketing',
      Comportamiento: 'fijo',
      Monto: 1200000,
      Base: 'mensual_global',
      Asignacion: 'unidades',
      Estimado: 'Si',
      Notas: 'Presupuesto mensual estimado',
    },
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla_Costos');
  XLSX.writeFile(wb, 'plantilla_costos_valora.xlsx');
}

export function exportReportExcel(
  business: BusinessConfig,
  product: ProductItem,
  calc: PricingCalculationResult,
  scenarios: ScenarioSnapshot[],
  recommendations: StrategicRecommendation[]
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Resumen Ejecutivo
  const summaryRows = [
    { Indicador: 'Empresa', Valor: business.companyName },
    { Indicador: 'Sector Económico', Valor: SECTOR_PROFILES[business.sector].name },
    { Indicador: 'Actividad Económica', Valor: business.economicActivity },
    { Indicador: 'País / Moneda', Valor: `${business.countryName} (${business.currencyCode})` },
    { Indicador: 'Régimen Tributario', Valor: `${business.taxRegime} · ${business.taxName} ${business.taxRatePct}%` },
    { Indicador: 'Producto / Servicio', Valor: product.name },
    { Indicador: 'Tipo / Unidad de Medida', Valor: `${product.itemType} (${product.unitOfMeasure})` },
    { Indicador: 'Volumen Mensual Estimado', Valor: product.estimatedVolume },
    { Indicador: 'Metodología Seleccionada', Valor: calc.selectedMethodology.name },
    { Indicador: 'Costo Directo Unitario', Valor: calc.directUnit },
    { Indicador: 'Costo Indirecto Unitario', Valor: calc.indirectUnit },
    { Indicador: 'Gasto Admin/Comercial Unitario', Valor: calc.adminCommUnit },
    { Indicador: 'Costo Total Unitario', Valor: calc.fullUnitCost },
    { Indicador: 'Costo Total Mensual', Valor: calc.fullCostTotal },
    { Indicador: 'Precio Mínimo Supervivencia (Var.)', Valor: calc.minimumSurvivalPrice },
    { Indicador: 'Precio de Equilibrio (Total)', Valor: calc.breakEvenUnitPrice },
    { Indicador: 'Precio Sugerido Neto (sin impuesto)', Valor: calc.suggestedNetPrice },
    { Indicador: `Precio Sugerido Público (con ${business.taxName})`, Valor: calc.suggestedGrossPrice },
    { Indicador: 'Utilidad Operativa por Unidad', Valor: calc.operatingProfitUnit },
    { Indicador: 'Margen Bruto (%)', Valor: Number(calc.grossMarginPct.toFixed(2)) },
    { Indicador: 'Margen Operativo (%)', Valor: Number(calc.operatingMarginPct.toFixed(2)) },
    { Indicador: 'Margen Neto Estimado (%)', Valor: Number(calc.estimatedNetMarginPct.toFixed(2)) },
    { Indicador: 'Markup Real sobre Costo (%)', Valor: Number(calc.realMarkupOnCostPct.toFixed(2)) },
    { Indicador: 'Punto de Equilibrio (Unidades)', Valor: calc.breakEvenUnits ?? 'No alcanzable' },
    { Indicador: 'Punto de Equilibrio (Dinero)', Valor: calc.breakEvenRevenue ?? 'No alcanzable' },
    { Indicador: 'Volumen para Utilidad Objetivo', Valor: calc.targetProfitUnits ?? 'No alcanzable' },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Resumen_Ejecutivo');

  // Sheet 2: Estructura de Costos
  const costRows = calc.costDetails.map((d) => ({
    Partida: d.item.name,
    Categoria: d.item.category,
    Subcategoria: COST_SUBCATEGORY_LABELS[d.item.subcategory]?.label ?? d.item.subcategory,
    Comportamiento: d.item.behavior,
    Tipo_Dato: d.item.isEstimated ? 'Estimado' : 'Real',
    Base_Ingreso: d.item.inputBasis,
    Metodo_Asignacion: ALLOCATION_METHOD_LABELS[d.item.allocationMethod],
    Porcentaje_Asignado: Number((d.allocationShare * 100).toFixed(2)),
    Total_Mensual_Asignado: Number(d.periodTotal.toFixed(2)),
    Costo_Unitario: Number(d.unitCost.toFixed(2)),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(costRows), 'Estructura_Costos');

  // Sheet 3: Metodologías
  const methRows = calc.allMethodologies.map((m) => ({
    Metodologia: m.name,
    Precio_Neto_Sugerido: Number(m.suggestedNetPrice.toFixed(2)),
    Precio_Con_Impuesto: Number(m.suggestedGrossPriceWithTax.toFixed(2)),
    Utilidad_Unitaria: Number(m.unitProfit.toFixed(2)),
    Margen_Sobre_Ventas_Pct: Number(m.marginOnSalesPct.toFixed(2)),
    Markup_Sobre_Costo_Pct: Number(m.markupOnCostPct.toFixed(2)),
    Formula: m.formulaDescription,
    Observacion: m.warning ?? 'OK',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(methRows), 'Metodologias_Precio');

  // Sheet 4: Competencia
  const compRows = product.competitors.map((c) => ({
    Competidor: c.competitorName,
    Producto: c.productName,
    Precio: c.price,
    Calidad_Percibida: c.perceivedQuality,
    Canal: c.salesChannel,
    Caracteristicas: c.features,
    Diferenciadores: c.differentiators,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(compRows), 'Competencia');

  // Sheet 5: Escenarios y Recomendaciones
  const scenRows = scenarios.map((s) => ({
    Escenario: s.label,
    Costo_Unitario: Number(s.unitCost.toFixed(2)),
    Precio_Neto_Sugerido: Number(s.suggestedNetPrice.toFixed(2)),
    Utilidad_Mensual: Number(s.monthlyProfit.toFixed(2)),
    Margen_Operativo_Pct: Number(s.operatingMarginPct.toFixed(2)),
    Markup_Pct: Number(s.markupPct.toFixed(2)),
    Equilibrio_Unidades: s.breakEvenUnits ?? 'N/A',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(scenRows), 'Escenarios');

  const recRows = recommendations.map((r) => ({
    Severidad: r.severity,
    Categoria: r.category,
    Titulo: r.title,
    Evidencia: r.quantitativeEvidence,
    Detalle: r.detail,
    Accion_Sugerida: r.suggestedAction,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(recRows), 'Recomendaciones');

  const safeSlug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  XLSX.writeFile(wb, `informe_pricing_${safeSlug}.xlsx`);
}

export function exportReportCsv(
  business: BusinessConfig,
  product: ProductItem,
  calc: PricingCalculationResult
) {
  const rows = calc.costDetails.map((d) => ({
    Empresa: business.companyName,
    Moneda: business.currencyCode,
    Producto: product.name,
    Partida: d.item.name,
    Categoria: d.item.category,
    Comportamiento: d.item.behavior,
    Tipo_Dato: d.item.isEstimated ? 'Estimado' : 'Real',
    Total_Mensual: d.periodTotal.toFixed(2),
    Costo_Unitario: d.unitCost.toFixed(2),
    Precio_Sugerido_Neto: calc.suggestedNetPrice.toFixed(2),
    Margen_Operativo_Pct: calc.operatingMarginPct.toFixed(2),
    Markup_Pct: calc.realMarkupOnCostPct.toFixed(2),
  }));

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `pricing_${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportReportPdf(
  business: BusinessConfig,
  product: ProductItem,
  calc: PricingCalculationResult,
  scenarios: ScenarioSnapshot[],
  sensitivity: SensitivityBar[],
  recommendations: StrategicRecommendation[]
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const fmt = (v: number) => formatCurrency(v, business.currencyCode, business.currencySymbol);

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('Informe Ejecutivo de Inteligencia de Precios', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${business.companyName} · ${SECTOR_PROFILES[business.sector].name} · ${business.countryName} (${business.currencyCode})`,
    14,
    24
  );
  doc.text(
    `Producto/Servicio: ${product.name} · Unidad: ${product.unitOfMeasure} · Fecha: ${new Date().toLocaleDateString('es-CO')}`,
    14,
    29
  );

  // Key Summary Table
  autoTable(doc, {
    startY: 34,
    head: [['Indicador Clave', 'Valor', 'Indicador Clave', 'Valor']],
    body: [
      [
        'Costo Total Unitario',
        fmt(calc.fullUnitCost),
        'Precio Sugerido Neto',
        fmt(calc.suggestedNetPrice),
      ],
      [
        'Costo Fijo Mensual',
        fmt(calc.fixedTotal),
        `Precio Público (${business.taxName} ${business.taxRatePct}%)`,
        fmt(calc.suggestedGrossPrice),
      ],
      [
        'Costo Variable Unitario',
        fmt(calc.variableUnit),
        'Margen Operativo / Ventas',
        formatPct(calc.operatingMarginPct),
      ],
      [
        'Utilidad Unitaria',
        fmt(calc.operatingProfitUnit),
        'Markup Real / Costo',
        formatPct(calc.realMarkupOnCostPct),
      ],
      [
        'Punto Equilibrio (Uds)',
        calc.breakEvenUnits ? `${calc.breakEvenUnits} ${product.unitOfMeasure}s` : 'N/A',
        'Posicionamiento Mercado',
        calc.market.positioningLabel,
      ],
    ],
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [4, 120, 87], textColor: 255 },
  });

  // Cost Structure
  const afterSummaryY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Estructura de Costos y Asignación', 14, afterSummaryY);

  autoTable(doc, {
    startY: afterSummaryY + 3,
    head: [['Partida', 'Categoría', 'Tipo', 'Dato', 'Mensual', 'Unitario']],
    body: calc.costDetails.map((d) => [
      d.item.name,
      d.item.category,
      d.item.behavior,
      d.item.isEstimated ? 'Estimado' : 'Real',
      fmt(d.periodTotal),
      fmt(d.unitCost),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
  });

  // Methodologies Comparison
  const afterCostsY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`2. Comparativa de Metodologías (Activa: ${calc.selectedMethodology.shortName})`, 14, afterCostsY);

  autoTable(doc, {
    startY: afterCostsY + 3,
    head: [['Metodología', 'Precio Neto', 'Precio c/Imp.', 'Margen Ventas', 'Markup Costo']],
    body: calc.allMethodologies.map((m) => [
      m.name,
      fmt(m.suggestedNetPrice),
      fmt(m.suggestedGrossPriceWithTax),
      formatPct(m.marginOnSalesPct),
      formatPct(m.markupOnCostPct),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
  });

  // Scenarios & Recommendations on Page 2
  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. Simulación de Escenarios Financieros', 14, 18);

  autoTable(doc, {
    startY: 22,
    head: [['Escenario', 'Costo Unit.', 'Precio Neto', 'Utilidad Mensual', 'Margen Op.', 'Equilibrio']],
    body: scenarios.map((s) => [
      s.label,
      fmt(s.unitCost),
      fmt(s.suggestedNetPrice),
      fmt(s.monthlyProfit),
      formatPct(s.operatingMarginPct),
      s.breakEvenUnits ? `${s.breakEvenUnits} uds` : 'N/A',
    ]),
    styles: { fontSize: 8, cellPadding: 2.2 },
    headStyles: { fillColor: [4, 120, 87], textColor: 255 },
  });

  const afterScenY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('4. Análisis de Competencia y Sensibilidad', 14, afterScenY);

  autoTable(doc, {
    startY: afterScenY + 3,
    head: [['Variable Analizada', 'Impacto Bajo', 'Impacto Alto', 'Oscilación Utilidad Mensual']],
    body: sensitivity.slice(0, 5).map((b) => [
      b.label,
      `${b.lowInputLabel} (${fmt(b.lowProfit)})`,
      `${b.highInputLabel} (${fmt(b.highProfit)})`,
      fmt(b.profitSwing),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
  });

  const afterSensY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('5. Recomendaciones Estratégicas', 14, afterSensY);

  autoTable(doc, {
    startY: afterSensY + 3,
    head: [['Prioridad', 'Hallazgo', 'Evidencia Cuantitativa', 'Acción Recomendada']],
    body: recommendations.map((r) => [
      r.severity.toUpperCase(),
      r.title,
      r.quantitativeEvidence,
      r.suggestedAction,
    ]),
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
  });

  const safeSlug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  doc.save(`informe_ejecutivo_${safeSlug}.pdf`);
}
