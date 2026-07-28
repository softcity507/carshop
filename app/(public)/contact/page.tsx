import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { ContactForm } from '@/features/contact/ContactForm';

export const metadata: Metadata = {
  title: 'Contact CarHub',
  description: 'Talk to the CarHub sales, service and spare parts teams.',
};

const CHANNELS = [
  {
    icon: MapPin,
    label: 'Showroom',
    lines: ['1200 Motorway Drive', 'Austin, TX 78701'],
  },
  {
    icon: Phone,
    label: 'Phone',
    lines: ['+1 (555) 013-4200'],
    href: 'tel:+15550134200',
  },
  {
    icon: Mail,
    label: 'Email',
    lines: ['hello@carhub.com'],
    href: 'mailto:hello@carhub.com',
  },
  {
    icon: Clock,
    label: 'Opening hours',
    lines: ['Mon – Fri · 9:00 – 19:00', 'Saturday · 10:00 – 16:00'],
  },
];

const DEPARTMENTS = [
  { title: 'Sales', blurb: 'Pricing, availability and test drives for any vehicle in the catalog.' },
  { title: 'Spare parts', blurb: 'Fitment checks, OEM sourcing and bulk orders for workshops.' },
  { title: 'After-sales', blurb: 'Warranty claims, servicing schedules and delivery tracking.' },
];

export default function ContactPage() {
  return (
    <div className="flex flex-1 flex-col bg-canvas">
      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-8 sm:px-8 lg:px-16 lg:pb-20">
        {/* Hero */}
        <section className="overflow-hidden rounded-xl bg-navy px-6 py-14 shadow-lg sm:px-12 lg:py-20">
          <div className="max-w-2xl">
            <span className="inline-block rounded bg-brand px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-white">
              Get in touch
            </span>
            <h1 className="mt-6 text-4xl font-extrabold uppercase tracking-tight text-white sm:text-5xl">
              Contact Us
            </h1>
            <p className="mt-4 text-base leading-7 text-navy-soft">
              Questions about a vehicle, a spare part or an order already on its way? Send us a message and a
              specialist will reply to your email within one business day.
            </p>
          </div>
        </section>

        {/* Channels + form */}
        <section className="mt-10 grid gap-8 lg:grid-cols-[22rem_1fr] lg:items-start">
          <div className="space-y-4">
            {CHANNELS.map(({ icon: Icon, label, lines, href }) => (
              <div key={label} className="card flex gap-4 p-5 transition hover:shadow-lg">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <Icon size={20} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
                  {lines.map((line) => (
                    <p key={line} className="mt-1 text-sm font-semibold text-heading">
                      {href ? (
                        <a href={href} className="transition hover:text-brand">
                          {line}
                        </a>
                      ) : (
                        line
                      )}
                    </p>
                  ))}
                </div>
              </div>
            ))}

            <div className="rounded-xl bg-navy-panel p-6">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-navy-soft">Browsing instead?</p>
              <p className="mt-2 text-sm leading-6 text-white">
                Every vehicle and spare part we stock is listed with live availability.
              </p>
              <Link
                href="/products"
                className="mt-5 inline-flex items-center justify-center rounded-lg bg-brand px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-white transition hover:bg-brand-hover"
              >
                View catalog
              </Link>
            </div>
          </div>

          <ContactForm />
        </section>

        {/* Departments */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold uppercase tracking-tight text-heading">Who you&apos;ll be talking to</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {DEPARTMENTS.map((department) => (
              <article key={department.title} className="card p-6 transition hover:-translate-y-1 hover:shadow-xl">
                <h3 className="text-lg font-bold uppercase tracking-tight text-heading">{department.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{department.blurb}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
