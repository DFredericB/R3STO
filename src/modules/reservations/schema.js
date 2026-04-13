// ═══════════════════════════════════════════════════════════════
//  Reservations — schémas Zod
// ═══════════════════════════════════════════════════════════════

const { z } = require('zod');

const STATUSES = ['reserved', 'confirmed', 'arrived', 'seated', 'done', 'noshow', 'cancelled'];
const SOURCES = ['app', 'widget', 'phone', 'walkin', 'admin'];

const createSchema = z.object({
  restaurant_id: z.coerce.number().int().positive(),
  guest_name: z.string().min(1).max(255),
  guest_email: z.string().email().optional().or(z.literal('')),
  guest_phone: z.string().max(50).optional(),
  party_size: z.coerce.number().int().min(1).max(50).default(2),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Format HH:MM'),
  notes: z.string().max(2000).optional(),
  source: z.enum(SOURCES).optional(),
  table_id: z.coerce.number().int().positive().nullable().optional(),
  status: z.enum(STATUSES).optional(),
});

const updateSchema = createSchema.partial();

const statusSchema = z.object({
  status: z.enum(STATUSES),
});

const listQuerySchema = z.object({
  restaurant_id: z.coerce.number().int().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(STATUSES).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

module.exports = { createSchema, updateSchema, statusSchema, listQuerySchema, STATUSES };
