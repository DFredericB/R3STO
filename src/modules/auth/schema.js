// ═══════════════════════════════════════════════════════════════
//  Auth — schémas de validation Zod
// ═══════════════════════════════════════════════════════════════

const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Mot de passe trop court (8 caractères minimum)'),
  name: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  restaurantName: z.string().optional(),
  address: z.string().optional(),
  plan: z.enum(['free', 'bistro', 'resto', 'gastro']).optional(),
  placeId: z.string().optional(),
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
