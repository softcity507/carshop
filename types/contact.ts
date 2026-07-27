export const CONTACT_STATUSES = ['new', 'read', 'archived'] as const;

export type ContactStatus = (typeof CONTACT_STATUSES)[number];

/** Field limits shared by the form and the route handler, so both reject the same input. */
export const CONTACT_LIMITS = {
  name: 80,
  email: 160,
  phone: 30,
  subject: 120,
  description: 2000,
  /** Anything shorter than this isn't a message worth routing to sales. */
  descriptionMin: 10,
} as const;

/** What the visitor types. `description` is the message body. */
export interface ContactInput {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  description: string;
}

/**
 * The account behind a message, resolved at read time from Firebase Auth and the `carUser`
 * profile — so the admin inbox shows current role and sign-in data, not a stale copy.
 */
export interface ContactSenderAccount {
  uid: string;
  /** Address on the account, which may differ from the one typed into the form. */
  accountEmail: string | null;
  displayName: string | null;
  role: string | null;
  emailVerified: boolean;
  disabled: boolean;
  /** How they signed in: password, google.com, … */
  providers: string[];
  accountCreatedAt: string | null;
  lastSignInAt: string | null;
  /** Last login as recorded by the app itself when the user signed in. */
  lastLoginAt: string | null;
}

/** A stored enquiry, as returned by the API. */
export interface ContactMessage extends ContactInput {
  id: string;
  status: ContactStatus;
  createdAt: string | null;
  /** Set when the sender was signed in; null for anonymous visitors. */
  senderUid: string | null;
  sender: ContactSenderAccount | null;
  userAgent?: string;
}

/**
 * Single source of validation truth. Returns a field-keyed map of problems —
 * empty means the payload is good to send/store.
 */
export function validateContactInput(input: Partial<ContactInput>): Partial<Record<keyof ContactInput, string>> {
  const errors: Partial<Record<keyof ContactInput, string>> = {};
  const name = (input.name ?? '').trim();
  const email = (input.email ?? '').trim();
  const phone = (input.phone ?? '').trim();
  const subject = (input.subject ?? '').trim();
  const description = (input.description ?? '').trim();

  if (!name) errors.name = 'Please tell us your name.';
  else if (name.length > CONTACT_LIMITS.name) errors.name = `Keep the name under ${CONTACT_LIMITS.name} characters.`;

  if (!email) errors.email = 'An email address is required so we can reply.';
  else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'That email address does not look right.';
  else if (email.length > CONTACT_LIMITS.email) errors.email = 'That email address is too long.';

  if (phone && phone.length > CONTACT_LIMITS.phone) errors.phone = 'That phone number is too long.';
  if (subject.length > CONTACT_LIMITS.subject) errors.subject = `Keep the subject under ${CONTACT_LIMITS.subject} characters.`;

  if (!description) errors.description = 'Please write your message.';
  else if (description.length < CONTACT_LIMITS.descriptionMin)
    errors.description = `Add a little more detail (at least ${CONTACT_LIMITS.descriptionMin} characters).`;
  else if (description.length > CONTACT_LIMITS.description)
    errors.description = `Keep the message under ${CONTACT_LIMITS.description} characters.`;

  return errors;
}
