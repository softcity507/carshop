"use client";

import { useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiSend } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { ContactService } from '@/services/contact.service';
import { CONTACT_LIMITS, validateContactInput, type ContactInput } from '@/types/contact';

const EMPTY: ContactInput = { name: '', email: '', phone: '', subject: '', description: '' };

type FieldErrors = Partial<Record<keyof ContactInput, string>>;

export function ContactForm() {
  const [values, setValues] = useState<ContactInput>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function setField(field: keyof ContactInput, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    // Clear the message under a field as soon as the visitor starts fixing it.
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const found = validateContactInput(values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setSending(true);
    try {
      await ContactService.sendMessage(values);
      setValues(EMPTY);
      setErrors({});
      setSent(true);
      toast.success('Message sent — our team will be in touch.');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="card p-8 text-center sm:p-12">
        <FiCheckCircle size={48} className="mx-auto text-success" />
        <h2 className="mt-6 text-2xl font-bold uppercase tracking-tight text-heading">Message received</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Thanks for reaching out. A member of the CarHub team will reply to your email within one business day.
        </p>
        <button type="button" onClick={() => setSent(false)} className="btn-outline mt-8">
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="card p-6 sm:p-8">
      <h2 className="text-2xl font-bold uppercase tracking-tight text-heading">Send us a message</h2>
      <p className="page-subtitle">Fill in the form and we&apos;ll get back to you by email.</p>

      {formError && (
        <p className="mt-6 flex items-start gap-2 rounded-lg border border-brand/30 bg-brand/5 px-4 py-3 text-sm text-brand">
          <FiAlertCircle size={16} className="mt-0.5 shrink-0" />
          {formError}
        </p>
      )}

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="Name" htmlFor="contact-name" error={errors.name} required>
          <input
            id="contact-name"
            className="field-input"
            value={values.name}
            onChange={(e) => setField('name', e.target.value)}
            maxLength={CONTACT_LIMITS.name}
            placeholder="Jane Cooper"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
          />
        </Field>

        <Field label="Email" htmlFor="contact-email" error={errors.email} required>
          <input
            id="contact-email"
            type="email"
            className="field-input"
            value={values.email}
            onChange={(e) => setField('email', e.target.value)}
            maxLength={CONTACT_LIMITS.email}
            placeholder="jane@example.com"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
          />
        </Field>

        <Field label="Phone" htmlFor="contact-phone" error={errors.phone} hint="Optional">
          <input
            id="contact-phone"
            type="tel"
            className="field-input"
            value={values.phone}
            onChange={(e) => setField('phone', e.target.value)}
            maxLength={CONTACT_LIMITS.phone}
            placeholder="+1 555 0134"
            autoComplete="tel"
          />
        </Field>

        <Field label="Subject" htmlFor="contact-subject" error={errors.subject} hint="Optional">
          <input
            id="contact-subject"
            className="field-input"
            value={values.subject}
            onChange={(e) => setField('subject', e.target.value)}
            maxLength={CONTACT_LIMITS.subject}
            placeholder="Test drive booking"
          />
        </Field>

        <div className="sm:col-span-2">
          <Field
            label="Message"
            htmlFor="contact-description"
            error={errors.description}
            required
            hint={`${values.description.length}/${CONTACT_LIMITS.description}`}
          >
            <textarea
              id="contact-description"
              rows={6}
              className="field-input resize-y"
              value={values.description}
              onChange={(e) => setField('description', e.target.value)}
              maxLength={CONTACT_LIMITS.description}
              placeholder="Tell us which vehicle or part you're interested in…"
              aria-invalid={Boolean(errors.description)}
            />
          </Field>
        </div>
      </div>

      <button type="submit" disabled={sending} className="btn-primary mt-8 w-full sm:w-auto">
        <FiSend size={16} />
        {sending ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="field-label">
          {label}
          {required && <span className="text-brand"> *</span>}
        </label>
        {hint && <span className="text-[11px] font-semibold text-faint">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1.5 text-xs font-semibold text-brand">{error}</p>}
    </div>
  );
}
