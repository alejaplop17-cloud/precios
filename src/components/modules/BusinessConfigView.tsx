import React, { useState } from 'react';
import { Building2, Plus, Save, RotateCcw } from 'lucide-react';
import {
  ALLOCATION_METHOD_LABELS,
  BUSINESS_TYPE_LABELS,
  COUNTRY_PRESETS,
  SECTOR_PROFILES,
} from '../../data/sectors';
import type {
  AllocationMethod,
  BusinessConfig,
  BusinessType,
  SectorId,
} from '../../types/pricing';

interface BusinessConfigViewProps {
  business: BusinessConfig;
  allBusinessesCount: number;
  onSaveBusiness: (updated: BusinessConfig) => Promise<void>;
  onCreateBusiness: (newBiz: BusinessConfig) => Promise<void>;
  onResetDefaults: () => Promise<void>;
}

export const BusinessConfigView: React.FC<BusinessConfigViewProps> = ({
  business,
  onSaveBusiness,
  onCreateBusiness,
  onResetDefaults,
}) => {
  const [form, setForm] = useState<BusinessConfig>(business);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const [newCompanyName, setNewCompanyName] = useState('');
  const [newSector, setNewSector] = useState<SectorId>('servicios_profesionales');
  const [newActivity, setNewActivity] = useState('');

  React.useEffect(() => {
    setForm(business);
  }, [business]);

  const sectorProfile = SECTOR_PROFILES[form.sector];
  const currentCountry =
    COUNTRY_PRESETS.find((c) => c.countryCode === form.countryCode) ?? COUNTRY_PRESETS[0];

  const handleCountryChange = (countryCode: string) => {
    const preset = COUNTRY_PRESETS.find((c) => c.countryCode === countryCode);
    if (!preset) return;
    setForm((prev) => ({
      ...prev,
      countryCode: preset.countryCode,
      countryName: preset.countryName,
      currencyCode: preset.currencyCode,
      currencySymbol: preset.currencySymbol,
      taxName: preset.defaultTaxName,
      taxRatePct: preset.defaultTaxRatePct,
      incomeTaxProvisionPct: preset.defaultIncomeTaxPct,
      taxRegime: preset.taxRegimes[0],
    }));
  };

  const handleSectorChange = (sector: SectorId) => {
    const profile = SECTOR_PROFILES[sector];
    setForm((prev) => ({
      ...prev,
      sector,
      businessType: profile.defaultBusinessType,
      defaultAllocationMethod: profile.recommendedAllocation,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim()) return;
    setSaving(true);
    setFeedback(null);
    try {
      await onSaveBusiness(form);
      setFeedback('Configuración guardada en la base de datos.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    const profile = SECTOR_PROFILES[newSector];
    const co = COUNTRY_PRESETS[0];
    const created: BusinessConfig = {
      id: `biz-${Date.now()}`,
      companyName: newCompanyName.trim(),
      sector: newSector,
      economicActivity: newActivity.trim() || profile.name,
      countryCode: co.countryCode,
      countryName: co.countryName,
      currencyCode: co.currencyCode,
      currencySymbol: co.currencySymbol,
      businessType: profile.defaultBusinessType,
      taxRegime: co.taxRegimes[0],
      taxName: co.defaultTaxName,
      taxRatePct: co.defaultTaxRatePct,
      incomeTaxProvisionPct: co.defaultIncomeTaxPct,
      salesChannel: 'Directo y digital',
      targetCustomer: 'Clientes B2B y B2C',
      defaultAllocationMethod: profile.recommendedAllocation,
      updatedAt: new Date().toISOString(),
    };
    setSaving(true);
    try {
      await onCreateBusiness(created);
      setNewCompanyName('');
      setNewActivity('');
      setShowNewModal(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Módulo 1 · Configuración inicial del negocio
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Perfil de empresa, sector y régimen tributario
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Adapta moneda, impuestos, métodos de asignación y umbrales analíticos al sector de tu negocio.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onResetDefaults}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar casos ejemplo
          </button>
          <button
            type="button"
            onClick={() => setShowNewModal((v) => !v)}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva empresa
          </button>
        </div>
      </div>

      {showNewModal && (
        <form
          onSubmit={handleCreateNew}
          className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 space-y-4"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Building2 className="w-4 h-4 text-emerald-700" />
            Registrar nueva empresa / espacio de trabajo
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nombre de la empresa
              </label>
              <input
                type="text"
                required
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Ej. Clínica Dental Sonrisa S.A.S."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Sector económico
              </label>
              <select
                value={newSector}
                onChange={(e) => setNewSector(e.target.value as SectorId)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {Object.values(SECTOR_PROFILES).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Actividad económica específica
              </label>
              <input
                type="text"
                value={newActivity}
                onChange={(e) => setNewActivity(e.target.value)}
                placeholder="Ej. Odontología estética e implantología"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowNewModal(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              Crear empresa y producto base
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-8 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nombre de la empresa
              </label>
              <input
                type="text"
                required
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Sector económico
              </label>
              <select
                value={form.sector}
                onChange={(e) => handleSectorChange(e.target.value as SectorId)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {Object.values(SECTOR_PROFILES).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Actividad económica
              </label>
              <input
                type="text"
                value={form.economicActivity}
                onChange={(e) => setForm({ ...form, economicActivity: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tipo de negocio
              </label>
              <select
                value={form.businessType}
                onChange={(e) =>
                  setForm({ ...form, businessType: e.target.value as BusinessType })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {Object.entries(BUSINESS_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                País
              </label>
              <select
                value={form.countryCode}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {COUNTRY_PRESETS.map((c) => (
                  <option key={c.countryCode} value={c.countryCode}>
                    {c.countryName} ({c.currencyCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Moneda (código ISO)
              </label>
              <input
                type="text"
                value={form.currencyCode}
                onChange={(e) =>
                  setForm({ ...form, currencyCode: e.target.value.toUpperCase().slice(0, 3) })
                }
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Símbolo moneda
              </label>
              <input
                type="text"
                value={form.currencySymbol}
                onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Régimen tributario
              </label>
              <select
                value={form.taxRegime}
                onChange={(e) => setForm({ ...form, taxRegime: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {currentCountry.taxRegimes.map((reg) => (
                  <option key={reg} value={reg}>
                    {reg}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Impuesto venta
                </label>
                <input
                  type="text"
                  value={form.taxName}
                  onChange={(e) => setForm({ ...form, taxName: e.target.value })}
                  className="w-full px-2.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tarifa (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={form.taxRatePct}
                  onChange={(e) =>
                    setForm({ ...form, taxRatePct: Math.max(0, Number(e.target.value)) })
                  }
                  className="w-full px-2.5 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Renta est. (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  step={0.5}
                  value={form.incomeTaxProvisionPct}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      incomeTaxProvisionPct: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="w-full px-2.5 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Canal de comercialización principal
              </label>
              <input
                type="text"
                value={form.salesChannel}
                onChange={(e) => setForm({ ...form, salesChannel: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tipo de cliente objetivo
              </label>
              <input
                type="text"
                value={form.targetCustomer}
                onChange={(e) => setForm({ ...form, targetCustomer: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Método predeterminado de asignación de costos indirectos
              </label>
              <select
                value={form.defaultAllocationMethod}
                onChange={(e) =>
                  setForm({
                    ...form,
                    defaultAllocationMethod: e.target.value as AllocationMethod,
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {Object.entries(ALLOCATION_METHOD_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <span className="text-xs text-emerald-700 dark:text-emerald-400">
              {feedback ?? ''}
            </span>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white inline-flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </div>
        </form>

        {/* Sector Adaptive Benchmark Card */}
        <aside className="lg:col-span-4 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 h-fit">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Guía adaptativa del sector
            </p>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {sectorProfile.name}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              {sectorProfile.sectorNotes}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Margen bruto típico</span>
              <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                {sectorProfile.typicalDirectMarginRange[0]}% – {sectorProfile.typicalDirectMarginRange[1]}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Margen operativo típico</span>
              <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                {sectorProfile.typicalOperatingMarginRange[0]}% – {sectorProfile.typicalOperatingMarginRange[1]}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Umbral alerta indirectos</span>
              <span className="font-mono tabular-nums font-medium text-amber-700 dark:text-amber-400">
                &gt; {sectorProfile.indirectAlertThresholdPct}% del costo total
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Unidades recomendadas</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {sectorProfile.defaultUnits.slice(0, 4).join(', ')}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
