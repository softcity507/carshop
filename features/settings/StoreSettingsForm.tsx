"use client";

import { useEffect, useState } from 'react';
import { FiCheck, FiCreditCard, FiPackage, FiSave, FiShoppingBag } from 'react-icons/fi';
import { CURRENCIES, SHIPPING_COUNTRIES } from '@/lib/constants';
import { SettingsService } from '@/services/settings.service';
import {
  DEFAULT_SETTINGS,
  SETTINGS_LIMITS,
  validateSettings,
  type StoreSettings,
} from '@/types/settings';

type FieldErrors = Partial<Record<keyof StoreSettings, string>>;

export function StoreSettingsForm() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const loaded = await SettingsService.getSettings();
        if (active) setSettings(loaded);
      } catch (err) {
        if (active) setMessage({ tone: 'bad', text: err instanceof Error ? err.message : 'Could not load settings.' });
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  function update<K extends keyof StoreSettings>(field: K, value: StoreSettings[K]) {
    setSettings((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
    setMessage(null);
  }

  function toggleCountry(code: string) {
    setSettings((current) => ({
      ...current,
      shippingCountries: current.shippingCountries.includes(code)
        ? current.shippingCountries.filter((entry) => entry !== code)
        : [...current.shippingCountries, code],
    }));
    setErrors((current) => (current.shippingCountries ? { ...current, shippingCountries: undefined } : current));
    setMessage(null);
  }

  async function save() {
    const found = validateSettings(settings);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setMessage({ tone: 'bad', text: 'Please fix the highlighted fields.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // The saved document comes back, so what is on screen is always what is stored.
      setSettings(await SettingsService.saveSettings(settings));
      setMessage({ tone: 'ok', text: 'Settings saved.' });
    } catch (err) {
      setMessage({ tone: 'bad', text: err instanceof Error ? err.message : 'Could not save settings.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((slot) => (
          <div key={slot} className="h-48 animate-pulse rounded-xl bg-skeleton" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Section
        icon={<FiShoppingBag size={16} />}
        title="Store identity"
        hint="Shown to customers across the storefront."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Text label="Store name" value={settings.storeName} error={errors.storeName}
            maxLength={SETTINGS_LIMITS.storeName} onChange={(value) => update('storeName', value)} />
          <Text label="Support email" type="email" value={settings.supportEmail} error={errors.supportEmail}
            maxLength={SETTINGS_LIMITS.supportEmail} onChange={(value) => update('supportEmail', value)} />
          <Text label="Support phone" type="tel" value={settings.supportPhone} error={errors.supportPhone}
            maxLength={SETTINGS_LIMITS.supportPhone} onChange={(value) => update('supportPhone', value)} />
          <Text label="Tagline" value={settings.tagline} error={errors.tagline}
            maxLength={SETTINGS_LIMITS.tagline} onChange={(value) => update('tagline', value)} />

          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="settings-address">
              Showroom address
            </label>
            <textarea
              id="settings-address"
              rows={2}
              className="field-input mt-2 resize-y"
              maxLength={SETTINGS_LIMITS.address}
              value={settings.address}
              onChange={(event) => update('address', event.target.value)}
            />
            {errors.address && <p className="mt-1.5 text-xs text-brand">{errors.address}</p>}
          </div>
        </div>
      </Section>

      <Section
        icon={<FiCreditCard size={16} />}
        title="Checkout"
        hint="How buyers are allowed to complete an order."
      >
        <div className="space-y-4">
          <Toggle
            label="Accept card payments"
            hint="Sends buyers to Stripe. Needs STRIPE_SECRET_KEY set on the server."
            checked={settings.cardPaymentsEnabled}
            onChange={(value) => update('cardPaymentsEnabled', value)}
          />
          <Toggle
            label="Accept callback requests"
            hint="Buyers can ask sales to call instead of paying online."
            checked={settings.callbackRequestsEnabled}
            onChange={(value) => update('callbackRequestsEnabled', value)}
          />
          {errors.cardPaymentsEnabled && <p className="text-xs text-brand">{errors.cardPaymentsEnabled}</p>}
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="settings-currency">
              Default currency
            </label>
            <select
              id="settings-currency"
              className="field-input mt-2"
              value={settings.defaultCurrency}
              onChange={(event) => update('defaultCurrency', event.target.value)}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} — {currency.name}
                </option>
              ))}
            </select>
            {errors.defaultCurrency && <p className="mt-1.5 text-xs text-brand">{errors.defaultCurrency}</p>}
          </div>
        </div>

        <div className="mt-6">
          <span className="field-label">Ships to</span>
          <p className="mt-1 text-xs text-faint">
            Only these countries can be chosen at checkout. {settings.shippingCountries.length} selected.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SHIPPING_COUNTRIES.map((country) => {
              const on = settings.shippingCountries.includes(country.code);
              return (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => toggleCountry(country.code)}
                  aria-pressed={on}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    on ? 'bg-brand text-white' : 'border border-line bg-panel text-muted hover:bg-chip'
                  }`}
                >
                  {on && <FiCheck size={11} />}
                  {country.name}
                </button>
              );
            })}
          </div>
          {errors.shippingCountries && <p className="mt-2 text-xs text-brand">{errors.shippingCountries}</p>}
        </div>
      </Section>

      <Section icon={<FiPackage size={16} />} title="Catalog" hint="Defaults applied as you add stock.">
        <div className="space-y-4">
          <Toggle
            label="Publish new products immediately"
            hint="Off means every new listing starts as a draft."
            checked={settings.publishNewProducts}
            onChange={(value) => update('publishNewProducts', value)}
          />
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Text label="Featured products on the homepage" type="number" value={String(settings.featuredLimit)}
            error={errors.featuredLimit} onChange={(value) => update('featuredLimit', Number(value))} />
          <Text label="Low stock warning at" type="number" value={String(settings.lowStockThreshold)}
            error={errors.lowStockThreshold} onChange={(value) => update('lowStockThreshold', Number(value))} />
        </div>
      </Section>

      <div className="card flex flex-wrap items-center gap-4 p-5">
        <button type="button" onClick={save} disabled={saving} className="btn-primary">
          <FiSave size={14} /> {saving ? 'Saving…' : 'Save changes'}
        </button>

        {message && (
          <p className={`text-sm font-semibold ${message.tone === 'ok' ? 'text-success' : 'text-brand'}`}>
            {message.text}
          </p>
        )}

        {!message && settings.updatedAt && (
          <p className="text-xs text-faint">Last saved {new Date(settings.updatedAt).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6">
      <div className="flex items-start gap-3 border-b border-line pb-5">
        <span className="mt-0.5 rounded-lg bg-chip p-2 text-heading">{icon}</span>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-heading">{title}</h2>
          <p className="mt-1 text-xs text-muted">{hint}</p>
        </div>
      </div>
      <div className="pt-6">{children}</div>
    </section>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-4 rounded-lg border border-line p-4 text-left transition hover:bg-chip/50"
    >
      <span
        className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
          checked ? 'bg-brand' : 'bg-line'
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white transition ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-heading">{label}</span>
        <span className="mt-0.5 block text-xs text-muted">{hint}</span>
      </span>
    </button>
  );
}

function Text({
  label,
  value,
  onChange,
  error,
  type = 'text',
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  maxLength?: number;
}) {
  const id = `settings-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;

  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className={`field-input mt-2 ${error ? 'border-brand' : ''}`}
        aria-invalid={Boolean(error)}
      />
      {error && <p className="mt-1.5 text-xs text-brand">{error}</p>}
    </div>
  );
}
