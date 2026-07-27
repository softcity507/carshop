"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FiArrowLeft, FiMinus, FiPlus } from 'react-icons/fi';
import { AddToCartButton } from '@/features/cart/AddToCartButton';
import { cloudinaryThumb } from '@/lib/cloudinary';
import { ProductService } from '@/services/product.service';
import { maxQuantityFor } from '@/types/cart';
import { isCar, type Product } from '@/types/product';
import { formatPrice } from './ProductGrid';

/** Turns the type-specific spec block into labelled rows for the detail table. */
function specRows(product: Product): Array<[string, string]> {
  const rows: Array<[string, string | number | undefined]> = [];

  if (isCar(product)) {
    const { car } = product;
    rows.push(
      ['Make', car.make],
      ['Model', car.model],
      ['Year', car.year],
      ['Trim', car.trim],
      ['Condition', car.condition],
      ['Body style', car.bodyStyle],
      ['Fuel type', car.fuelType?.replace(/-/g, ' ')],
      ['Transmission', car.transmission],
      ['Drivetrain', car.drivetrain?.toUpperCase()],
      ['Engine', car.engine],
      ['Horsepower', car.horsepower ? `${car.horsepower} hp` : undefined],
      ['Mileage', car.mileage != null ? `${car.mileage.toLocaleString()} km` : undefined],
      ['Exterior colour', car.exteriorColor],
      ['Interior colour', car.interiorColor],
      ['Seats', car.seats],
      ['Doors', car.doors],
      ['VIN', car.vin]
    );
  } else {
    const { part } = product;
    rows.push(
      ['Part number', part.partNumber],
      ['Brand', part.brand],
      ['Category', part.category],
      ['Condition', part.condition],
      ['Sourcing', part.oem ? 'Genuine OEM' : 'Aftermarket'],
      ['Fits makes', part.compatibleMakes?.length ? part.compatibleMakes.join(', ') : 'Universal'],
      ['Fits models', part.compatibleModels?.length ? part.compatibleModels.join(', ') : undefined],
      [
        'Year range',
        part.yearFrom || part.yearTo ? `${part.yearFrom ?? '—'} – ${part.yearTo ?? '—'}` : undefined,
      ],
      ['Warranty', part.warrantyMonths ? `${part.warrantyMonths} months` : undefined],
      ['Weight', part.weightKg ? `${part.weightKg} kg` : undefined]
    );
  }

  return rows
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([label, value]) => [label, String(value)]);
}

export function ProductDetail({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const loaded = await ProductService.getProduct(productId);
        if (active) setProduct(loaded);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load this product.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [productId]);

  if (loading) {
    return (
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="h-[28rem] animate-pulse rounded-xl bg-[#e1e3e4]" />
        <div className="space-y-4">
          <div className="h-10 w-2/3 animate-pulse rounded bg-[#e1e3e4]" />
          <div className="h-6 w-1/3 animate-pulse rounded bg-[#e1e3e4]" />
          <div className="h-40 animate-pulse rounded bg-[#e1e3e4]" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="rounded-xl border border-[#c5c6cf] bg-white px-6 py-20 text-center">
        <p className="text-lg font-semibold text-[#031636]">{error ?? 'Product not found.'}</p>
        <Link
          href="/products"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#bb0014] px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-white transition hover:bg-[#e51d24]"
        >
          <FiArrowLeft size={16} /> Back to catalog
        </Link>
      </div>
    );
  }

  const images = product.imageUrls?.length ? product.imageUrls : [];
  const ceiling = maxQuantityFor(product);
  const rows = specRows(product);

  return (
    <div className="space-y-12">
      <Link
        href="/products"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#44474e] transition hover:text-[#bb0014]"
      >
        <FiArrowLeft size={16} /> Back to catalog
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="relative h-[22rem] overflow-hidden rounded-xl border border-[#c5c6cf] bg-[#e1e3e4] sm:h-[28rem]">
            {images.length ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${cloudinaryThumb(images[activeImage], 1200)})` }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.2em] text-[#8b8e97]">
                No image
              </div>
            )}
            <span className="absolute left-4 top-4 rounded bg-[#bb0014] px-3 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-white shadow-lg">
              {product.badge || (product.type === 'car' ? 'Vehicle' : 'Spare Part')}
            </span>
          </div>

          {images.length > 1 && (
            <div className="flex flex-wrap gap-3">
              {images.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`View image ${index + 1}`}
                  className={`h-20 w-24 overflow-hidden rounded-lg border-2 bg-cover bg-center transition ${
                    index === activeImage ? 'border-[#bb0014]' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundImage: `url(${cloudinaryThumb(url, 200)})` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Buy box */}
        <div>
          <h1 className="text-3xl font-extrabold uppercase tracking-tight text-[#031636] sm:text-4xl">{product.name}</h1>

          <p className="mt-4 text-4xl font-bold tracking-tight text-[#bb0014]">{formatPrice(product)}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.06em] text-[#44474e]">
            {product.type === 'car' ? 'Starting MSRP' : 'Per unit'}
          </p>

          <p className={`mt-4 text-sm font-semibold ${product.stock > 0 ? 'text-emerald-700' : 'text-[#bb0014]'}`}>
            {product.stock > 0
              ? product.type === 'car'
                ? 'Available'
                : `${product.stock} in stock`
              : 'Out of stock'}
          </p>

          {product.description && (
            <p className="mt-6 whitespace-pre-line text-base leading-7 text-[#44474e]">{product.description}</p>
          )}

          {/* Quantity stepper — hidden for cars, which are single-unit by definition. */}
          {product.type === 'part' && ceiling > 1 && (
            <div className="mt-8 flex items-center gap-4">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#44474e]">Quantity</span>
              <div className="flex items-center rounded-lg border border-[#c5c6cf]">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="p-3 text-[#031636] transition hover:bg-[#edeeef] disabled:opacity-40"
                >
                  <FiMinus size={14} />
                </button>
                <span className="w-12 text-center text-sm font-bold text-[#031636]">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(ceiling, q + 1))}
                  disabled={quantity >= ceiling}
                  aria-label="Increase quantity"
                  className="p-3 text-[#031636] transition hover:bg-[#edeeef] disabled:opacity-40"
                >
                  <FiPlus size={14} />
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <AddToCartButton product={product} quantity={quantity} tone="light" fullWidth={false} className="flex-1" />
            <Link
              href="/cart"
              className="flex-1 rounded-lg border-2 border-[#031636] py-3 text-center text-xs font-bold uppercase tracking-[0.15em] text-[#031636] transition hover:bg-[#031636] hover:text-white"
            >
              Go to cart
            </Link>
          </div>

          {isCar(product) && product.car.features?.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-[#44474e]">Features</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.car.features.map((feature) => (
                  <span
                    key={feature}
                    className="rounded-full border border-[#c5c6cf] bg-[#edeeef] px-3 py-1.5 text-xs font-semibold text-[#031636]"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Specification table */}
      <section>
        <h2 className="mb-4 text-2xl font-bold uppercase tracking-tight text-[#031636]">
          {product.type === 'car' ? 'Vehicle Specification' : 'Part Details'}
        </h2>
        <div className="overflow-hidden rounded-xl border border-[#c5c6cf] bg-white">
          <dl className="grid grid-cols-1 sm:grid-cols-2">
            {rows.map(([label, value], index) => (
              <div
                key={label}
                className={`flex justify-between gap-4 px-6 py-4 ${index % 2 === 0 ? 'bg-white' : 'bg-[#f8f9fa]'}`}
              >
                <dt className="text-xs font-bold uppercase tracking-[0.06em] text-[#44474e]">{label}</dt>
                <dd className="text-right text-sm font-semibold capitalize text-[#031636]">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
