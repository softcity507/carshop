export const APP_NAME = "CarShop";
export const API_BASE_URL = "/api";

/**
 * Where CarShop ships. Shared by the checkout form's country picker and the route handler that
 * validates it, so the two can never drift apart. Codes are ISO 3166-1 alpha-2.
 */
export const SHIPPING_COUNTRIES = [
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'DK', name: 'Denmark' },
  { code: 'ES', name: 'Spain' },
  { code: 'FR', name: 'France' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IN', name: 'India' },
  { code: 'IT', name: 'Italy' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NO', name: 'Norway' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SE', name: 'Sweden' },
  { code: 'SG', name: 'Singapore' },
  { code: 'US', name: 'United States' },
] as const;

export const SHIPPING_COUNTRY_CODES = SHIPPING_COUNTRIES.map((country) => country.code);
