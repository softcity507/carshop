import axios from 'axios';
import { auth } from '@/firebase/firebase';
import type { CartItem } from '@/types/cart';
import type { CheckoutCustomer, CheckoutIntent, OrderItem, PaymentStatus } from '@/types/order';

async function getAuthToken() {
  if (typeof window === 'undefined') return null;

  // Always prefer a live token — a cached one may be past its 1 hour expiry.
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    window.sessionStorage.setItem('carhub_token', token);
    window.localStorage.setItem('carhub_token', token);
    return token;
  }

  return window.sessionStorage.getItem('carhub_token') || window.localStorage.getItem('carhub_token');
}

/** Carries the HTTP status through, so callers can tell "signed out" apart from "sold out". */
export class CheckoutError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'CheckoutError';
  }

  /** The session was missing, expired or rejected — the shopper has to log in again. */
  get isAuthProblem() {
    return this.status === 401;
  }
}

async function apiRequest<T>(url: string, method: string, body?: unknown): Promise<T> {
  const token = await getAuthToken();
  if (!token) {
    // Never let an anonymous request reach the server — the checkout is login-only.
    throw new CheckoutError('Please login to continue with your order.', 401);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  try {
    const response = await axios.request<T>({ url, method, data: body, headers });
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const payload = err.response?.data as { error?: string } | undefined;
      throw new CheckoutError(payload?.error ?? err.message, err.response?.status);
    }
    throw err;
  }
}

export interface CheckoutResult {
  intent: CheckoutIntent;
  orderId: string;
  /** Present only for `intent: 'payment'` — the hosted Stripe page to send the browser to. */
  url?: string;
}

export interface OrderConfirmation {
  orderId: string;
  paid: boolean;
  paymentStatus: PaymentStatus;
  status: string;
  totalAmount: number;
  currency: string;
  email: string | null;
  items: OrderItem[];
}

export const CheckoutService = {
  /**
   * Saves the order — delivery details and all — then either returns a Stripe Checkout URL or,
   * for `intent: 'enquiry'`, files a callback request with sales. Only product ids and quantities
   * travel: the server re-prices the cart against Firestore, so a tampered localStorage cart
   * can't change what gets charged.
   */
  async placeOrder(items: CartItem[], customer: CheckoutCustomer, intent: CheckoutIntent) {
    return apiRequest<CheckoutResult>('/api/checkout', 'POST', {
      intent,
      customer,
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    });
  },

  /** Reads back the outcome after Stripe redirects to the success page. */
  async getConfirmation(sessionId: string) {
    return apiRequest<OrderConfirmation>(
      `/api/checkout?session_id=${encodeURIComponent(sessionId)}`,
      'GET'
    );
  },
};
