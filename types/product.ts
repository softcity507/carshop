export type ProductType = 'car' | 'part';

export const PRODUCT_TYPES: ProductType[] = ['car', 'part'];

/** Fields every sellable item shares — these are what the cart and order line items read. */
export interface BaseProduct {
  id: string;
  type: ProductType;
  name: string;
  description: string;
  /** Major currency units (e.g. 42500 = $42,500.00). */
  price: number;
  currency: string;
  badge?: string;
  imageUrls: string[];
  /** Units available. Cars are normally 1; parts can be many. */
  stock: number;
  published: boolean;
  featured: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export const CAR_CONDITIONS = ['new', 'used', 'certified'] as const;
export const BODY_STYLES = ['sedan', 'suv', 'coupe', 'hatchback', 'truck', 'van', 'convertible', 'wagon'] as const;
export const FUEL_TYPES = ['petrol', 'diesel', 'electric', 'hybrid', 'plug-in-hybrid'] as const;
export const TRANSMISSIONS = ['automatic', 'manual', 'cvt', 'dct'] as const;
export const DRIVETRAINS = ['fwd', 'rwd', 'awd', '4wd'] as const;

export interface CarSpec {
  make: string;
  model: string;
  year: number;
  trim?: string;
  condition: (typeof CAR_CONDITIONS)[number];
  bodyStyle: (typeof BODY_STYLES)[number];
  fuelType: (typeof FUEL_TYPES)[number];
  transmission: (typeof TRANSMISSIONS)[number];
  drivetrain: (typeof DRIVETRAINS)[number];
  engine?: string;
  horsepower?: number;
  /** Odometer reading in km. */
  mileage?: number;
  exteriorColor?: string;
  interiorColor?: string;
  seats?: number;
  doors?: number;
  vin?: string;
  /** Free-form selling points: "Sunroof", "360 Camera", "Adaptive Cruise". */
  features: string[];
}

export const PART_CONDITIONS = ['new', 'used', 'refurbished'] as const;
export const PART_CATEGORIES = [
  'engine',
  'brakes',
  'suspension',
  'transmission',
  'electrical',
  'exhaust',
  'cooling',
  'filters',
  'body',
  'interior',
  'lighting',
  'tyres',
  'accessories',
] as const;

export interface PartSpec {
  /** Manufacturer part number — doubles as the SKU. */
  partNumber: string;
  brand: string;
  category: (typeof PART_CATEGORIES)[number];
  condition: (typeof PART_CONDITIONS)[number];
  /** true = genuine OEM, false = aftermarket. */
  oem: boolean;
  /** Fitment. Empty arrays mean "universal". */
  compatibleMakes: string[];
  compatibleModels: string[];
  yearFrom?: number;
  yearTo?: number;
  warrantyMonths?: number;
  weightKg?: number;
}

export interface CarProduct extends BaseProduct {
  type: 'car';
  car: CarSpec;
}

export interface PartProduct extends BaseProduct {
  type: 'part';
  part: PartSpec;
}

export type Product = CarProduct | PartProduct;

/** Omit must distribute over the union, otherwise it collapses to the shared keys and drops `car`/`part`. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type ProductInput = DistributiveOmit<Product, 'id' | 'createdAt' | 'updatedAt'>;

export function isCar(product: Product): product is CarProduct {
  return product.type === 'car';
}

export function isPart(product: Product): product is PartProduct {
  return product.type === 'part';
}

/** Short, human-readable spec chips used on cards in both the admin grid and the public catalog. */
export function productSpecChips(product: Product): string[] {
  if (isCar(product)) {
    const { car } = product;
    return [
      car.bodyStyle,
      car.engine || car.fuelType,
      car.transmission,
      car.mileage != null ? `${car.mileage.toLocaleString()} km` : null,
    ].filter((chip): chip is string => Boolean(chip));
  }

  const { part } = product;
  return [
    part.category,
    part.brand,
    part.oem ? 'OEM' : 'Aftermarket',
    part.compatibleMakes.length ? part.compatibleMakes.join(', ') : 'Universal fit',
  ].filter((chip): chip is string => Boolean(chip));
}
