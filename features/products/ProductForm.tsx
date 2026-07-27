"use client";

import {  useRef, useState } from 'react';
import { cloudinaryThumb, isCloudinaryConfigured, uploadManyToCloudinary } from '@/lib/cloudinary';
import {
  BODY_STYLES,
  CAR_CONDITIONS,
  DRIVETRAINS,
  FUEL_TYPES,
  PART_CATEGORIES,
  PART_CONDITIONS,
  TRANSMISSIONS,
  type CarSpec,
  type PartSpec,
  type Product,
  type ProductInput,
  type ProductType,
} from '@/types/product';

const inputClass = 'field-input';
const labelClass = 'field-label';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className={labelClass}>{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((option) => (
        <option key={option} value={option} className="bg-slate-900">
          {option.replace(/-/g, ' ')}
        </option>
      ))}
    </select>
  );
}

const emptyCar: CarSpec = {
  make: '',
  model: '',
  year: new Date().getFullYear(),
  trim: '',
  condition: 'new',
  bodyStyle: 'sedan',
  fuelType: 'petrol',
  transmission: 'automatic',
  drivetrain: 'fwd',
  engine: '',
  horsepower: undefined,
  mileage: undefined,
  exteriorColor: '',
  interiorColor: '',
  seats: undefined,
  doors: undefined,
  vin: '',
  features: [],
};

const emptyPart: PartSpec = {
  partNumber: '',
  brand: '',
  category: 'engine',
  condition: 'new',
  oem: true,
  compatibleMakes: [],
  compatibleModels: [],
  yearFrom: undefined,
  yearTo: undefined,
  warrantyMonths: undefined,
  weightKg: undefined,
};

/** Comma-separated text ⇄ string[] so admins can type "Toyota, Honda" naturally. */
function toList(value: string) {
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

interface ProductFormProps {
  initialProduct?: Product | null;
  onSubmit: (input: ProductInput) => Promise<void>;
  onCancel: () => void;
}

export function ProductForm({ initialProduct, onSubmit, onCancel }: ProductFormProps) {
  const [type, setType] = useState<ProductType>(initialProduct?.type ?? 'car');
  const [name, setName] = useState(initialProduct?.name ?? '');
  const [description, setDescription] = useState(initialProduct?.description ?? '');
  const [price, setPrice] = useState(initialProduct ? String(initialProduct.price) : '');
  const [currency, setCurrency] = useState(initialProduct?.currency ?? 'USD');
  const [badge, setBadge] = useState(initialProduct?.badge ?? '');
  const [stock, setStock] = useState(initialProduct ? String(initialProduct.stock) : '1');
  const [published, setPublished] = useState(initialProduct?.published ?? true);
  const [featured, setFeatured] = useState(initialProduct?.featured ?? false);
  const [imageUrls, setImageUrls] = useState<string[]>(initialProduct?.imageUrls ?? []);

  const [car, setCar] = useState<CarSpec>(
    initialProduct?.type === 'car' ? { ...emptyCar, ...initialProduct.car } : emptyCar
  );
  const [part, setPart] = useState<PartSpec>(
    initialProduct?.type === 'part' ? { ...emptyPart, ...initialProduct.part } : emptyPart
  );

  const [featuresText, setFeaturesText] = useState(
    initialProduct?.type === 'car' ? initialProduct.car.features.join(', ') : ''
  );
  const [makesText, setMakesText] = useState(
    initialProduct?.type === 'part' ? initialProduct.part.compatibleMakes.join(', ') : ''
  );
  const [modelsText, setModelsText] = useState(
    initialProduct?.type === 'part' ? initialProduct.part.compatibleModels.join(', ') : ''
  );

  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cloudinaryReady = isCloudinaryConfigured();

  const isEditing = Boolean(initialProduct);
  const patchCar = (patch: Partial<CarSpec>) => setCar((prev) => ({ ...prev, ...patch }));
  const patchPart = (patch: Partial<PartSpec>) => setPart((prev) => ({ ...prev, ...patch }));

  function handleTypeChange(next: ProductType) {
    setType(next);
    // Both types sell by the unit — this only nudges a sensible default on a fresh form.
    if (!isEditing) setStock(next === 'car' ? '1' : '10');
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setUploading(`Uploading 0/${files.length}…`);

    try {
      const urls = await uploadManyToCloudinary(Array.from(files), (done, total) =>
        setUploading(`Uploading ${done}/${total}…`)
      );
      setImageUrls((prev) => [...prev, ...urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploading(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const priceValue = Number(price);
    if (!name.trim()) return setError('Product name is required.');
    if (!Number.isFinite(priceValue) || priceValue < 0) return setError('Enter a valid price.');
    if (type === 'car' && (!car.make.trim() || !car.model.trim())) return setError('Car make and model are required.');
    if (type === 'part' && !part.partNumber.trim()) return setError('Part number is required.');

    const base = {
      name: name.trim(),
      description: description.trim(),
      price: priceValue,
      currency: currency.trim() || 'USD',
      badge: badge.trim(),
      imageUrls,
      stock: Math.max(0, Math.trunc(Number(stock) || 0)),
      published,
      featured,
    };

    const input: ProductInput =
      type === 'car'
        ? { ...base, type: 'car', car: { ...car, features: toList(featuresText) } }
        : {
            ...base,
            type: 'part',
            part: { ...part, compatibleMakes: toList(makesText), compatibleModels: toList(modelsText) },
          };

    setSaving(true);
    try {
      await onSubmit(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this product.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl"
    >
      <div>
        <h2 className="text-2xl font-bold text-white">{isEditing ? 'Edit product' : 'Add product'}</h2>
        <p className="mt-1 text-sm text-slate-400">
          Choose what you are listing — the form swaps to the matching specification fields.
        </p>
      </div>

      {/* Type selector: drives every conditional block below. */}
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className={`${labelClass} mb-3`}>Listing type</legend>
        {([
          { value: 'car', title: 'Car', blurb: 'Full vehicle listing with specs, features and gallery.' },
          { value: 'part', title: 'Spare part', blurb: 'Component with fitment, brand and stock quantity.' },
        ] as const).map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${
              type === option.value
                ? 'border-red-500/60 bg-red-500/10'
                : 'border-white/10 bg-slate-950/60 hover:border-white/25'
            }`}
          >
            <input
              type="radio"
              name="productType"
              value={option.value}
              checked={type === option.value}
              onChange={() => handleTypeChange(option.value)}
              className="mt-1 h-4 w-4 accent-red-500"
            />
            <span>
              <span className="block text-sm font-semibold text-white">{option.title}</span>
              <span className="mt-1 block text-xs text-slate-400">{option.blurb}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {error && (
        <p className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p>
      )}

      {/* Shared commercial fields */}
      <section className="grid gap-5 md:grid-cols-2">
        <Field label={type === 'car' ? 'Listing title' : 'Part name'}>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === 'car' ? 'Falcon Evo X — Sport Trim' : 'Front Brake Pad Set'}
          />
        </Field>
        <Field label="Badge" hint="Short marketing tag shown on the card.">
          <input
            className={inputClass}
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            placeholder={type === 'car' ? 'New Arrival' : 'Best Seller'}
          />
        </Field>
        <Field label="Price">
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="42500"
          />
        </Field>
        <Field label="Currency">
          <input className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={3} />
        </Field>
        <Field label="Stock" hint="Units available to sell — this caps the quantity a buyer can cart.">
          <input
            className={inputClass}
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </Field>
        <div className="flex items-end gap-6 pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4 accent-red-500" />
            Published
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-4 w-4 accent-red-500" />
            Featured
          </label>
        </div>
        <div className="md:col-span-2">
          <Field label="Description">
            <textarea
              className={`${inputClass} min-h-28 resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'car' ? 'Condition, service history, standout equipment…' : 'What it fits, material, why it beats the OEM part…'}
            />
          </Field>
        </div>
      </section>

      {/* Car-only specification block */}
      {type === 'car' && (
        <section className="space-y-5 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Vehicle specification</h3>
          <div className="grid gap-5 md:grid-cols-3">
            <Field label="Make">
              <input className={inputClass} value={car.make} onChange={(e) => patchCar({ make: e.target.value })} placeholder="Toyota" />
            </Field>
            <Field label="Model">
              <input className={inputClass} value={car.model} onChange={(e) => patchCar({ model: e.target.value })} placeholder="Supra" />
            </Field>
            <Field label="Year">
              <input className={inputClass} type="number" min="1900" max="2100" value={car.year} onChange={(e) => patchCar({ year: Number(e.target.value) })} />
            </Field>
            <Field label="Trim">
              <input className={inputClass} value={car.trim ?? ''} onChange={(e) => patchCar({ trim: e.target.value })} placeholder="GR Premium" />
            </Field>
            <Field label="Condition">
              <Select value={car.condition} onChange={(v) => patchCar({ condition: v as CarSpec['condition'] })} options={CAR_CONDITIONS} />
            </Field>
            <Field label="Body style">
              <Select value={car.bodyStyle} onChange={(v) => patchCar({ bodyStyle: v as CarSpec['bodyStyle'] })} options={BODY_STYLES} />
            </Field>
            <Field label="Fuel type">
              <Select value={car.fuelType} onChange={(v) => patchCar({ fuelType: v as CarSpec['fuelType'] })} options={FUEL_TYPES} />
            </Field>
            <Field label="Transmission">
              <Select value={car.transmission} onChange={(v) => patchCar({ transmission: v as CarSpec['transmission'] })} options={TRANSMISSIONS} />
            </Field>
            <Field label="Drivetrain">
              <Select value={car.drivetrain} onChange={(v) => patchCar({ drivetrain: v as CarSpec['drivetrain'] })} options={DRIVETRAINS} />
            </Field>
            <Field label="Engine">
              <input className={inputClass} value={car.engine ?? ''} onChange={(e) => patchCar({ engine: e.target.value })} placeholder="3.0L Inline 6 Turbo" />
            </Field>
            <Field label="Horsepower">
              <input className={inputClass} type="number" min="0" value={car.horsepower ?? ''} onChange={(e) => patchCar({ horsepower: e.target.value === '' ? undefined : Number(e.target.value) })} />
            </Field>
            <Field label="Mileage (km)">
              <input className={inputClass} type="number" min="0" value={car.mileage ?? ''} onChange={(e) => patchCar({ mileage: e.target.value === '' ? undefined : Number(e.target.value) })} />
            </Field>
            <Field label="Exterior colour">
              <input className={inputClass} value={car.exteriorColor ?? ''} onChange={(e) => patchCar({ exteriorColor: e.target.value })} placeholder="Nitro Yellow" />
            </Field>
            <Field label="Interior colour">
              <input className={inputClass} value={car.interiorColor ?? ''} onChange={(e) => patchCar({ interiorColor: e.target.value })} placeholder="Black leather" />
            </Field>
            <Field label="VIN">
              <input className={inputClass} value={car.vin ?? ''} onChange={(e) => patchCar({ vin: e.target.value })} placeholder="JT2MA70J8..." />
            </Field>
            <Field label="Seats">
              <input className={inputClass} type="number" min="1" value={car.seats ?? ''} onChange={(e) => patchCar({ seats: e.target.value === '' ? undefined : Number(e.target.value) })} />
            </Field>
            <Field label="Doors">
              <input className={inputClass} type="number" min="1" value={car.doors ?? ''} onChange={(e) => patchCar({ doors: e.target.value === '' ? undefined : Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="Features" hint="Comma separated — each becomes a chip on the product card.">
            <input className={inputClass} value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} placeholder="Sunroof, 360 Camera, Adaptive Cruise, Heated Seats" />
          </Field>
        </section>
      )}

      {/* Part-only specification block */}
      {type === 'part' && (
        <section className="space-y-5 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Part details</h3>
          <div className="grid gap-5 md:grid-cols-3">
            <Field label="Part number" hint="Doubles as the SKU.">
              <input className={inputClass} value={part.partNumber} onChange={(e) => patchPart({ partNumber: e.target.value })} placeholder="04465-33471" />
            </Field>
            <Field label="Brand">
              <input className={inputClass} value={part.brand} onChange={(e) => patchPart({ brand: e.target.value })} placeholder="Brembo" />
            </Field>
            <Field label="Category">
              <Select value={part.category} onChange={(v) => patchPart({ category: v as PartSpec['category'] })} options={PART_CATEGORIES} />
            </Field>
            <Field label="Condition">
              <Select value={part.condition} onChange={(v) => patchPart({ condition: v as PartSpec['condition'] })} options={PART_CONDITIONS} />
            </Field>
            <Field label="Sourcing">
              <Select value={part.oem ? 'OEM' : 'Aftermarket'} onChange={(v) => patchPart({ oem: v === 'OEM' })} options={['OEM', 'Aftermarket']} />
            </Field>
            <Field label="Warranty (months)">
              <input className={inputClass} type="number" min="0" value={part.warrantyMonths ?? ''} onChange={(e) => patchPart({ warrantyMonths: e.target.value === '' ? undefined : Number(e.target.value) })} />
            </Field>
            <Field label="Fits year from">
              <input className={inputClass} type="number" min="1900" max="2100" value={part.yearFrom ?? ''} onChange={(e) => patchPart({ yearFrom: e.target.value === '' ? undefined : Number(e.target.value) })} />
            </Field>
            <Field label="Fits year to">
              <input className={inputClass} type="number" min="1900" max="2100" value={part.yearTo ?? ''} onChange={(e) => patchPart({ yearTo: e.target.value === '' ? undefined : Number(e.target.value) })} />
            </Field>
            <Field label="Weight (kg)">
              <input className={inputClass} type="number" min="0" step="0.01" value={part.weightKg ?? ''} onChange={(e) => patchPart({ weightKg: e.target.value === '' ? undefined : Number(e.target.value) })} />
            </Field>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Compatible makes" hint="Comma separated. Leave blank for universal fit.">
              <input className={inputClass} value={makesText} onChange={(e) => setMakesText(e.target.value)} placeholder="Toyota, Lexus" />
            </Field>
            <Field label="Compatible models" hint="Comma separated.">
              <input className={inputClass} value={modelsText} onChange={(e) => setModelsText(e.target.value)} placeholder="Supra, GR86, IS300" />
            </Field>
          </div>
        </section>
      )}

      {/* Cloudinary gallery */}
      <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Images</h3>
          {uploading && <span className="text-xs text-amber-300">{uploading}</span>}
        </div>

        {!cloudinaryReady && (
          <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
            Cloudinary is not configured. Set <code>NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</code> and{' '}
            <code>NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET</code>, then restart the dev server.
          </p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          disabled={!cloudinaryReady || Boolean(uploading)}
          onChange={(e) => handleFiles(e.target.files)}
          className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-red-600 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-red-500 disabled:opacity-50"
        />

        {imageUrls.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {imageUrls.map((url, index) => (
              <div key={url} className="group relative overflow-hidden rounded-xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cloudinaryThumb(url, 300)} alt={`Product image ${index + 1}`} className="h-28 w-full object-cover" />
                {index === 0 && (
                  <span className="absolute left-2 top-2 rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Cover</span>
                )}
                <button
                  type="button"
                  onClick={() => setImageUrls((prev) => prev.filter((entry) => entry !== url))}
                  className="absolute right-2 top-2 rounded bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold text-rose-200 opacity-0 transition group-hover:opacity-100"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving || Boolean(uploading)}
          className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create product'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-2xl border border-white/15 px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
