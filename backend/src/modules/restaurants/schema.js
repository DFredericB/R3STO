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

const marketplaceFields = {
  cuisine_tag: z.string().max(60).optional(),
  photo: z.string().max(500).optional(),
  avg_price: z.coerce.number().int().min(0).optional(),
  price_range: z.string().max(5).optional(),
  features: z.any().optional(),
  promos: z.any().optional(),
  boost_score: z.coerce.number().int().min(0).max(100).optional(),
  client_score: z.coerce.number().int().min(0).max(100).optional(),
  marketplace: z.coerce.number().int().min(0).max(1).optional(),
  booking_url: z.string().max(500).optional(),
  vitrine_url: z.string().max(500).optional(),
};

const updateSchema = z.object({
  ...baseFields,
  ...marketplaceFields,
  name: baseFields.name.optional(),
  status: z.enum(['active', 'inactive', 'setup', 'suspended']).optional(),
  settings: z.any().optional(),
}).partial();

module.exports = { createSchema, updateSchema };
