/**
 * R3STO — Transactional Email System
 *
 * Définition de tous les emails transactionnels envoyés par la plateforme.
 * Chaque template est associé à un déclencheur, un canal, et un expéditeur.
 *
 * ADRESSES EMAIL :
 *   noreply@r3sto.ch  → Transactionnel (confirmations, rappels, notifications)
 *   contact@r3sto.ch  → Support / réponses humaines
 *   info@r3sto.ch     → Communications générales / marketing
 *
 * INTÉGRATION :
 *   Les templates HTML seront hébergés côté API (api.r3sto.com).
 *   L'envoi passe par le service SMTP d'Infomaniak ou un provider dédié (Resend, Postmark).
 *   Les SMS passent par un provider séparé (ex: Twilio, MessageBird).
 */

// ── Types ──────────────────────────────────────────

export type EmailChannel = 'email' | 'sms' | 'both'
export type EmailCategory = 'booking' | 'reminder' | 'lifecycle' | 'marketing' | 'admin'

export interface EmailTemplate {
  id: string
  nameKey: string             // clé i18n pour le nom du template
  descKey: string             // clé i18n pour la description
  category: EmailCategory
  channel: EmailChannel
  from: string                // adresse expéditeur
  replyTo?: string            // adresse de réponse
  trigger: string             // événement déclencheur (code)
  triggerDescKey: string      // clé i18n pour description du trigger
  delayMins?: number          // délai après le trigger (0 = immédiat)
  requiredPlan: 'bistro' | 'resto' | 'gastro'  // plan minimum requis
  variables: string[]         // variables disponibles dans le template
  active: boolean             // activé par défaut
}

// ── Adresses email ──────────────────────────────────

export const EMAIL_FROM = {
  noreply: 'R3STO <noreply@r3sto.ch>',
  contact: 'R3STO Support <contact@r3sto.ch>',
  info:    'R3STO <info@r3sto.ch>',
} as const

// ── Templates ──────────────────────────────────────

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  // ═══ BOOKING — Cycle de réservation ═══
  {
    id: 'booking-confirm',
    nameKey: 'email.booking.confirm',
    descKey: 'email.booking.confirm.desc',
    category: 'booking',
    channel: 'both',
    from: EMAIL_FROM.noreply,
    trigger: 'resa.created',
    triggerDescKey: 'email.trigger.resaCreated',
    delayMins: 0,
    requiredPlan: 'bistro',
    variables: ['clientName', 'date', 'time', 'covers', 'table', 'restoName', 'restoAddress', 'cancelLink', 'modifyLink'],
    active: true,
  },
  {
    id: 'booking-modified',
    nameKey: 'email.booking.modified',
    descKey: 'email.booking.modified.desc',
    category: 'booking',
    channel: 'email',
    from: EMAIL_FROM.noreply,
    trigger: 'resa.updated',
    triggerDescKey: 'email.trigger.resaUpdated',
    delayMins: 0,
    requiredPlan: 'bistro',
    variables: ['clientName', 'date', 'time', 'covers', 'changes', 'cancelLink'],
    active: true,
  },
  {
    id: 'booking-cancelled',
    nameKey: 'email.booking.cancelled',
    descKey: 'email.booking.cancelled.desc',
    category: 'booking',
    channel: 'email',
    from: EMAIL_FROM.noreply,
    trigger: 'resa.cancelled',
    triggerDescKey: 'email.trigger.resaCancelled',
    delayMins: 0,
    requiredPlan: 'bistro',
    variables: ['clientName', 'date', 'time', 'restoName', 'rebookLink'],
    active: true,
  },
  {
    id: 'booking-waitlist-placed',
    nameKey: 'email.booking.waitlisted',
    descKey: 'email.booking.waitlisted.desc',
    category: 'booking',
    channel: 'email',
    from: EMAIL_FROM.noreply,
    trigger: 'waitlist.added',
    triggerDescKey: 'email.trigger.waitlistAdded',
    delayMins: 0,
    requiredPlan: 'bistro',
    variables: ['clientName', 'date', 'service', 'covers', 'position'],
    active: true,
  },
  {
    id: 'booking-waitlist-available',
    nameKey: 'email.booking.waitlistAvailable',
    descKey: 'email.booking.waitlistAvailable.desc',
    category: 'booking',
    channel: 'both',
    from: EMAIL_FROM.noreply,
    trigger: 'waitlist.available',
    triggerDescKey: 'email.trigger.waitlistAvailable',
    delayMins: 0,
    requiredPlan: 'bistro',
    variables: ['clientName', 'date', 'time', 'covers', 'confirmLink', 'expiresIn'],
    active: true,
  },

  // ═══ REMINDERS — Rappels ═══
  {
    id: 'remind-24h',
    nameKey: 'email.remind.24h',
    descKey: 'email.remind.24h.desc',
    category: 'reminder',
    channel: 'sms',
    from: EMAIL_FROM.noreply,
    trigger: 'resa.24h_before',
    triggerDescKey: 'email.trigger.24hBefore',
    delayMins: 0,
    requiredPlan: 'resto',
    variables: ['clientName', 'date', 'time', 'restoName', 'confirmLink', 'cancelLink'],
    active: true,
  },
  {
    id: 'remind-2h',
    nameKey: 'email.remind.2h',
    descKey: 'email.remind.2h.desc',
    category: 'reminder',
    channel: 'sms',
    from: EMAIL_FROM.noreply,
    trigger: 'resa.2h_before',
    triggerDescKey: 'email.trigger.2hBefore',
    delayMins: 0,
    requiredPlan: 'gastro',
    variables: ['clientName', 'time', 'restoName'],
    active: false,
  },

  // ═══ LIFECYCLE — Cycle de vie client ═══
  {
    id: 'lifecycle-welcome',
    nameKey: 'email.lifecycle.welcome',
    descKey: 'email.lifecycle.welcome.desc',
    category: 'lifecycle',
    channel: 'email',
    from: EMAIL_FROM.noreply,
    replyTo: EMAIL_FROM.contact,
    trigger: 'client.firstVisit',
    triggerDescKey: 'email.trigger.firstVisit',
    delayMins: 60,
    requiredPlan: 'resto',
    variables: ['clientName', 'restoName', 'restoWeb', 'bookingLink'],
    active: true,
  },
  {
    id: 'lifecycle-thanks',
    nameKey: 'email.lifecycle.thanks',
    descKey: 'email.lifecycle.thanks.desc',
    category: 'lifecycle',
    channel: 'email',
    from: EMAIL_FROM.noreply,
    replyTo: EMAIL_FROM.contact,
    trigger: 'resa.completed',
    triggerDescKey: 'email.trigger.afterVisit',
    delayMins: 120,
    requiredPlan: 'resto',
    variables: ['clientName', 'date', 'restoName', 'reviewLink', 'googleReviewUrl', 'rebookLink'],
    active: true,
  },
  {
    id: 'lifecycle-review-ask',
    nameKey: 'email.lifecycle.reviewAsk',
    descKey: 'email.lifecycle.reviewAsk.desc',
    category: 'lifecycle',
    channel: 'email',
    from: EMAIL_FROM.noreply,
    replyTo: EMAIL_FROM.contact,
    trigger: 'resa.completed',
    triggerDescKey: 'email.trigger.48hAfter',
    delayMins: 2880,
    requiredPlan: 'resto',
    variables: ['clientName', 'restoName', 'reviewLink', 'googleReviewUrl'],
    active: true,
  },
  {
    id: 'lifecycle-review-sms',
    nameKey: 'email.lifecycle.reviewSms',
    descKey: 'email.lifecycle.reviewSms.desc',
    category: 'lifecycle',
    channel: 'sms',
    from: EMAIL_FROM.noreply,
    trigger: 'resa.completed',
    triggerDescKey: 'email.trigger.7dAfter',
    delayMins: 10080,
    requiredPlan: 'gastro',
    variables: ['clientName', 'restoName', 'reviewLink', 'googleReviewUrl'],
    active: false,
  },
  {
    id: 'lifecycle-winback',
    nameKey: 'email.lifecycle.winback',
    descKey: 'email.lifecycle.winback.desc',
    category: 'lifecycle',
    channel: 'email',
    from: EMAIL_FROM.info,
    replyTo: EMAIL_FROM.contact,
    trigger: 'client.inactive30d',
    triggerDescKey: 'email.trigger.inactive30d',
    delayMins: 0,
    requiredPlan: 'resto',
    variables: ['clientName', 'restoName', 'lastVisitDate', 'bookingLink', 'promoCode'],
    active: false,
  },
  {
    id: 'lifecycle-birthday',
    nameKey: 'email.lifecycle.birthday',
    descKey: 'email.lifecycle.birthday.desc',
    category: 'lifecycle',
    channel: 'both',
    from: EMAIL_FROM.info,
    trigger: 'client.birthday',
    triggerDescKey: 'email.trigger.birthday',
    delayMins: 0,
    requiredPlan: 'resto',
    variables: ['clientName', 'restoName', 'promoCode', 'bookingLink'],
    active: true,
  },

  // ═══ MARKETING — Newsletters & promos ═══
  {
    id: 'marketing-newsletter',
    nameKey: 'email.marketing.newsletter',
    descKey: 'email.marketing.newsletter.desc',
    category: 'marketing',
    channel: 'email',
    from: EMAIL_FROM.info,
    replyTo: EMAIL_FROM.contact,
    trigger: 'manual',
    triggerDescKey: 'email.trigger.manual',
    requiredPlan: 'resto',
    variables: ['clientName', 'restoName', 'content', 'unsubscribeLink'],
    active: false,
  },

  // ═══ ADMIN — Notifications internes ═══
  {
    id: 'admin-new-resa',
    nameKey: 'email.admin.newResa',
    descKey: 'email.admin.newResa.desc',
    category: 'admin',
    channel: 'email',
    from: EMAIL_FROM.noreply,
    trigger: 'resa.created',
    triggerDescKey: 'email.trigger.resaCreated',
    delayMins: 0,
    requiredPlan: 'bistro',
    variables: ['clientName', 'date', 'time', 'covers', 'canal', 'table'],
    active: true,
  },
  {
    id: 'admin-noshow-alert',
    nameKey: 'email.admin.noshow',
    descKey: 'email.admin.noshow.desc',
    category: 'admin',
    channel: 'email',
    from: EMAIL_FROM.noreply,
    trigger: 'resa.noshow',
    triggerDescKey: 'email.trigger.noshow',
    delayMins: 0,
    requiredPlan: 'bistro',
    variables: ['clientName', 'date', 'time', 'totalNoshows', 'clientLink'],
    active: true,
  },
  {
    id: 'admin-daily-summary',
    nameKey: 'email.admin.dailySummary',
    descKey: 'email.admin.dailySummary.desc',
    category: 'admin',
    channel: 'email',
    from: EMAIL_FROM.noreply,
    trigger: 'cron.daily_7am',
    triggerDescKey: 'email.trigger.daily7am',
    delayMins: 0,
    requiredPlan: 'bistro',
    variables: ['restoName', 'date', 'totalResas', 'totalCovers', 'serviceBreakdown', 'alerts'],
    active: true,
  },
]

// ── Helpers ──────────────────────────────────────

/** Retourne les templates filtrés par catégorie */
export function getTemplatesByCategory(cat: EmailCategory): EmailTemplate[] {
  return EMAIL_TEMPLATES.filter(t => t.category === cat)
}

/** Retourne les templates actifs pour un plan donné */
export function getActiveTemplates(plan: 'bistro' | 'resto' | 'gastro'): EmailTemplate[] {
  const planOrder = { bistro: 0, resto: 1, gastro: 2 }
  return EMAIL_TEMPLATES.filter(t => t.active && planOrder[t.requiredPlan] <= planOrder[plan])
}
