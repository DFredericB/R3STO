// ══════════════════════════════════════════════════
//  R3STO — SMS Quota & Sending Logic (DISABLED)
//  Stub for future implementation
// ══════════════════════════════════════════════════

import type { Plan, Resto } from '../types'

export type SmsResult =
  | { sent: true; channel: 'sms' }
  | { sent: true; channel: 'email'; reason: 'no_quota' | 'quota_exceeded' | 'no_phone' }
  | { sent: false; error: string }

/**
 * Vérifie si le restaurant peut encore envoyer des SMS ce mois
 */
export function canSendSms(_resto: Resto): boolean {
  return false
}

/**
 * Retourne le nombre de SMS restants ce mois
 */
export function smsRemaining(_resto: Resto): number {
  return 0
}

/**
 * Retourne le quota SMS pour un plan donné
 */
export function getQuotaForPlan(_plan: Plan): number {
  return 0
}

/**
 * Vérifie si le reset mensuel est nécessaire et retourne les nouvelles valeurs
 */
export function checkMonthlyReset(_resto: Resto): null {
  return null
}

/**
 * Envoie un SMS (fallback email si quota dépassé)
 */
export async function sendSms(_phone: string, _message: string, _resto: Resto): Promise<SmsResult> {
  return { sent: false, error: 'SMS disabled' }
}

/**
 * Incrémente le compteur sms_used dans le store
 */
export function recordSmsSent(_phone: string): void {
  // No-op
}
