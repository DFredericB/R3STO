// ═══════════════════════════════════════════════════════════════
//  Restaurants — schémas Zod
// ═══════════════════════════════════════════════════════════════

const { z } = require('zod');

const baseFields = {
  name: z.string().min(1).max(255),
  type: z.enum(['restaurant', 'cafe', 'bar', 'brasserie', 'pizzeria', 'other']).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  canton: z.string().max(50).optional(),
  country: z.string().max(50).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().max(500).optional(),
  capacity: z.coerce.number().int().min(0).optional(),
  description: z.string().optional(),
};

const createSchema = z.object(baseFields);

const updateSchema = z.object({
  ...baseFields,
  name: baseFields.name.optional(),
  status: z.enum(['active', 'inactive', 'setup', 'suspended']).optional(),
  settings: z.any().optional(),
}).partial();

module.exports = { createSchema, updateSchema };
