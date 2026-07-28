This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Payments (Stripe)

Checkout is a two-step flow. `/checkout` collects and **saves** the delivery details as a pending
order first; only then does the buyer choose to pay with Stripe or request a callback. Admins
manage the resulting orders under `/orders` in the dashboard.

Add these to `.env.local` (and to the Vercel project's environment variables), then restart:

| Variable | Required | What it does |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | for card payments | Server-side Stripe key (`sk_test_…` / `sk_live_…`). Without it the pay button returns a 503 and only callback requests work. |
| `STRIPE_WEBHOOK_SECRET` | for fulfilment | Signing secret for `/api/stripe/webhook`. Without it orders are never marked paid and stock is never drawn down. |
| `NEXT_PUBLIC_APP_URL` | optional | Absolute base for Stripe's return URLs. Falls back to `VERCEL_URL`, then the request origin. |

Point a Stripe webhook endpoint at `https://<your-domain>/api/stripe/webhook` subscribed to
`checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`, `checkout.session.expired` and `charge.refunded`.

Locally, forward events instead:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Card wallets (Apple Pay, Google Pay, Link) are enabled from the Stripe Dashboard's payment-method
settings — no code change needed. The countries CarShop ships to live in `SHIPPING_COUNTRIES`
in [`lib/constants.ts`](lib/constants.ts), shared by the checkout form and its server-side validation.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
