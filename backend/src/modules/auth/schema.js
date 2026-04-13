// ═══════════════════════════════════════════════════════════════
//  Auth — schémas de validation Zod
// ═══════════════════════════════════════════════════════════════

const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Mot de passe trop court (8 caractères minimum)'),
  name: z.string().optional().nullable(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  restaurantName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  plan: z.enum(['free', 'bistro', 'resto', 'gastro']).optional().nullable(),
  placeId: z.string().optional().nullable(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Mot de passe requis'),
});

const sendOtpSchema = z.object({
  email: z.string().email(),
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, 'Code à 6 chiffres'),
});

module.exports = { registerSchema, loginSchema, sendOtpSchema, verifyOtpSchema };
