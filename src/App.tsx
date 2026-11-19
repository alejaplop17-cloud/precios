import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  Calculator,
  Download,
  FileSpreadsheet,
  Layers,
  Menu,
  Moon,
  Package,
  Sliders,
  Sparkles,
  Sun,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  buildThreeScenarios,
  computeSensitivityAnalysis,
  generateRecommendations,
  runStatisticalAnalysis,
} from './engine/analyticsEngine';
import { calculateProductPricing } from './engine/pricingEngine';
import { SECTOR_PROFILES } from './data/sectors';
import { SEED_WORKSPACES } from './data/seedWorkspaces';
import { AnalyticsIntelligenceView } from './components/modules/AnalyticsIntelligenceView';
import { BusinessConfigView } from './components/modules/BusinessConfigView';
import { CostStructureView } from './components/modules/CostStructureView';
import { ExecutiveDashboard, type ModuleKey } from './components/modules/ExecutiveDashboard';
import { MarketCompetitorsView } from './components/modules/MarketCompetitorsView';
import { PricingEngineView } from './components/modules/PricingEngineView';
import { ProductsCatalogView } from './components/modules/ProductsCatalogView';
import { ReportsExportView } from './components/modules/ReportsExportView';
import { ScenarioSimulatorView } from './components/modules/ScenarioSimulatorView';
import type { BusinessConfig, ProductItem, WorkspaceData } from './types/pricing';

const NAV_ITEMS: Array<{
  id: ModuleKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Resumen Ejecutivo', icon: BarChart3 },
  { id: 'negocio', label: 'Empresa y Sector', icon: Building2 },
  { id: 'productos', label: 'Productos y Servicios', icon: Package },
  { id: 'costos', label: 'Estructura de Costos', icon: Layers },
  { id: 'precios', label: 'Motor de Precios', icon: Calculator },
  { id: 'mercado', label: 'Mercado y Competencia', icon: TrendingUp },
  { id: 'simulador', label: 'Simulador y Escenarios', icon: Sliders },
  { id: 'analitica', label: 'Inteligencia Analítica', icon: Sparkles },
  { id: 'informes', label: 'Informes y Exportación', icon: FileSpreadsheet },
];

export default function App() {
  const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string>('');
  const [activeProductId, setActiveProductId] = useState<string>('');
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const loadWorkspaces = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/workspaces');
      if (!res.ok) throw new Error('Error consultando espacios de trabajo');
      const data = (await res.json()) as { workspaces: WorkspaceData[] };
      const list = data.workspaces.length > 0 ? data.workspaces : SEED_WORKSPACES;
      setWorkspaces(list);
      setActiveBusinessId((prev) =>
        list.some((w) => w.business.id === prev) ? prev : list[0].business.id
      );
    } catch {
      // Fallback to in-memory seed if offline
      setWorkspaces(SEED_WORKSPACES);
      setActiveBusinessId(SEED_WORKSPACES[0].business.id);
      setErrorMsg('Modo local activo: no se pudo conectar con la API de persistencia.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const activeWorkspace = useMemo(
    () =>
      workspaces.find((w) => w.business.id === activeBusinessId) ?? workspaces[0],
    [workspaces, activeBusinessId]
  );

  useEffect(() => {
    if (!activeWorkspace) return;
    setActiveProductId((prev) => {
      if (activeWorkspace.products.some((p) => p.id === prev)) return prev;
      return activeWorkspace.products[0]?.id ?? '';
    });
  }, [activeWorkspace]);

  const activeProduct = useMemo(
    () =>
      activeWorkspace?.products.find((p) => p.id === activeProductId) ??
      activeWorkspace?.products[0],
    [activeWorkspace, activeProductId]
  );

  const portfolioCalcs = useMemo(() => {
    if (!activeWorkspace) return [];
    return activeWorkspace.products.map((p) => ({
      product: p,
      calc: calculateProductPricing(
        p,
        activeWorkspace.business,
        activeWorkspace.products
      ),
    }));
  }, [activeWorkspace]);

  const activeCalc = useMemo(() => {
    if (!activeWorkspace || !activeProduct) return null;
    return calculateProductPricing(
      activeProduct,
      activeWorkspace.business,
      activeWorkspace.products
    );
  }, [activeWorkspace, activeProduct]);

  const scenarios = useMemo(() => {
    if (!activeWorkspace || !activeProduct) return [];
    return buildThreeScenarios(
      activeProduct,
      activeWorkspace.business,
      activeWorkspace.products
    );
  }, [activeWorkspace, activeProduct]);

  const sensitivity = useMemo(() => {
    if (!activeWorkspace || !activeProduct) return [];
    return computeSensitivityAnalysis(
      activeProduct,
      activeWorkspace.business,
      activeWorkspace.products,
      {
        rawMaterialDeltaPct: 0,
        laborDeltaPct: 0,
        indirectDeltaPct: 0,
        volumeDeltaPct: 0,
        targetMarginOverridePct: activeProduct.targetMarginPct,
        discountPct: activeProduct.discountPct,
        commissionPct: activeProduct.commercialCommissionPct,
        taxRatePct: activeWorkspace.business.taxRatePct,
        competitorPriceDeltaPct: 0,
      }
    );
  }, [activeWorkspace, activeProduct]);

  const stats = useMemo(() => {
    if (!activeProduct || !activeCalc) {
      return runStatisticalAnalysis([], 0);
    }
    return runStatisticalAnalysis(activeProduct.historicalData, activeCalc.variableUnit);
  }, [activeProduct, activeCalc]);

  const recommendations = useMemo(() => {
    if (!activeWorkspace || !activeProduct) return [];
    return generateRecommendations(
      activeProduct,
      activeWorkspace.business,
      activeWorkspace.products
    );
  }, [activeWorkspace, activeProduct]);

  const handleSaveBusiness = async (updated: BusinessConfig) => {
    setWorkspaces((prev) =>
      prev.map((w) => (w.business.id === updated.id ? { ...w, business: updated } : w))
    );
    await fetch(`/api/businesses/${updated.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
  };

  const handleCreateBusiness = async (newBiz: BusinessConfig) => {
    const profile = SECTOR_PROFILES[newBiz.sector];
    const initialProduct: ProductItem = {
      id: `prod-${Date.now()}`,
      businessId: newBiz.id,
      name:
        profile.defaultItemType === 'servicio'
          ? 'Servicio Principal'
          : 'Producto Principal',
      description: `Línea base de ${newBiz.companyName}`,
      category: 'General',
      itemType: profile.defaultItemType,
      unitOfMeasure: profile.defaultUnits[0] ?? 'unidad',
      estimatedVolume: 100,
      presentation: 'Estándar',
      capacity: 250,
      timePerUnitMinutes: profile.defaultItemType === 'servicio' ? 60 : 15,
      machineHoursPerUnit: 0.1,
      participationPct: 100,
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
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business: newBiz, initialProduct }),
    });
    if (res.ok) {
      const data = (await res.json()) as { workspaces: WorkspaceData[] };
      setWorkspaces(data.workspaces);
      setActiveBusinessId(newBiz.id);
      setActiveProductId(initialProduct.id);
      setActiveModule('costos');
    }
  };

  const handleResetDefaults = async () => {
    const res = await fetch('/api/workspaces/reset', { method: 'POST' });
    if (res.ok) {
      const data = (await res.json()) as { workspaces: WorkspaceData[] };
      setWorkspaces(data.workspaces);
      setActiveBusinessId(data.workspaces[0]?.business.id ?? '');
    }
  };

  const handleUpdateProduct = async (updated: ProductItem) => {
    setWorkspaces((prev) =>
      prev.map((w) =>
        w.business.id === updated.businessId
          ? {
              ...w,
              products: w.products.map((p) => (p.id === updated.id ? updated : p)),
            }
          : w
      )
    );
    await fetch(`/api/products/${updated.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
  };

  const handleCreateProduct = async (created: ProductItem) => {
    setWorkspaces((prev) =>
      prev.map((w) =>
        w.business.id === created.businessId
          ? { ...w, products: [...w.products, created] }
          : w
      )
    );
    setActiveProductId(created.id);
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(created),
    });
  };

  const handleDeleteProduct = async (id: string) => {
    if (!activeWorkspace) return;
    const remaining = activeWorkspace.products.filter((p) => p.id !== id);
    setWorkspaces((prev) =>
      prev.map((w) =>
        w.business.id === activeWorkspace.business.id
          ? { ...w, products: remaining }
          : w
      )
    );
    if (activeProductId === id) {
      setActiveProductId(remaining[0]?.id ?? '');
    }
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
  };

  const activeNavMeta = NAV_ITEMS.find((n) => n.id === activeModule) ?? NAV_ITEMS[0];

  if (loading || !activeWorkspace) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl space-y-4">
          <div className="h-8 w-56 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/40 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Workspace Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[264px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:shrink-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActiveModule('dashboard')}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
          >
            Valora Pricing
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace & Product Selectors */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div>
            <label
              htmlFor="ws-select"
              className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
            >
              Empresa activa
            </label>
            <select
              id="ws-select"
              value={activeWorkspace.business.id}
              onChange={(e) => setActiveBusinessId(e.target.value)}
              className="w-full px-2.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 truncate"
            >
              {workspaces.map((w) => (
                <option key={w.business.id} value={w.business.id}>
                  {w.business.companyName} ({SECTOR_PROFILES[w.business.sector].shortName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="prod-select"
              className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
            >
              Producto o servicio analizado
            </label>
            <select
              id="prod-select"
              value={activeProduct?.id ?? ''}
              onChange={(e) => setActiveProductId(e.target.value)}
              className="w-full px-2.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 truncate"
            >
              {activeWorkspace.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Módulos principales">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveModule(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2.5 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
          {activeWorkspace.business.countryName} · {activeWorkspace.business.currencyCode} ·{' '}
          {activeWorkspace.business.taxName} {activeWorkspace.business.taxRatePct}%
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on left, 1 primary action + theme toggle on right */}
        <header className="h-16 px-4 sm:px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Abrir navegación"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
              <span className="hidden sm:inline truncate max-w-[180px]">
                {activeWorkspace.business.companyName}
              </span>
              <span className="hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="truncate max-w-[160px] text-slate-700 dark:text-slate-300">
                {activeProduct?.name ?? 'Catálogo'}
              </span>
              <span aria-hidden="true">/</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                {activeNavMeta.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label="Alternar tema visual"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveModule('informes')}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1280px] w-full mx-auto">
          {errorMsg && (
            <div className="mb-6 p-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200">
              {errorMsg}
            </div>
          )}

          {activeModule === 'negocio' && (
            <BusinessConfigView
              business={activeWorkspace.business}
              allBusinessesCount={workspaces.length}
              onSaveBusiness={handleSaveBusiness}
              onCreateBusiness={handleCreateBusiness}
              onResetDefaults={handleResetDefaults}
            />
          )}

          {activeModule === 'productos' && (
            <ProductsCatalogView
              business={activeWorkspace.business}
              products={activeWorkspace.products}
              activeProductId={activeProduct?.id ?? ''}
              onSelectProduct={setActiveProductId}
              onSaveProduct={handleUpdateProduct}
              onCreateProduct={handleCreateProduct}
              onDeleteProduct={handleDeleteProduct}
            />
          )}

          {activeProduct && activeCalc && (
            <>
              {activeModule === 'dashboard' && (
                <ExecutiveDashboard
                  business={activeWorkspace.business}
                  product={activeProduct}
                  calc={activeCalc}
                  portfolioCalcs={portfolioCalcs}
                  scenarios={scenarios}
                  sensitivity={sensitivity}
                  stats={stats}
                  recommendations={recommendations}
                  onNavigate={setActiveModule}
                />
              )}

              {activeModule === 'costos' && (
                <CostStructureView
                  business={activeWorkspace.business}
                  product={activeProduct}
                  calc={activeCalc}
                  onUpdateProduct={handleUpdateProduct}
                />
              )}

              {activeModule === 'precios' && (
                <PricingEngineView
                  business={activeWorkspace.business}
                  product={activeProduct}
                  calc={activeCalc}
                  onUpdateProduct={handleUpdateProduct}
                />
              )}

              {activeModule === 'mercado' && (
                <MarketCompetitorsView
                  business={activeWorkspace.business}
                  product={activeProduct}
                  calc={activeCalc}
                  onUpdateProduct={handleUpdateProduct}
                />
              )}

              {activeModule === 'simulador' && (
                <ScenarioSimulatorView
                  business={activeWorkspace.business}
                  product={activeProduct}
                  allProducts={activeWorkspace.products}
                />
              )}

              {activeModule === 'analitica' && (
                <AnalyticsIntelligenceView
                  business={activeWorkspace.business}
                  product={activeProduct}
                  calc={activeCalc}
                  stats={stats}
                  recommendations={recommendations}
                  onUpdateProduct={handleUpdateProduct}
                />
              )}

              {activeModule === 'informes' && (
                <ReportsExportView
                  business={activeWorkspace.business}
                  product={activeProduct}
                  calc={activeCalc}
                  scenarios={scenarios}
                  sensitivity={sensitivity}
                  recommendations={recommendations}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
