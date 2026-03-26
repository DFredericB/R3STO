// ══════════════════════════════════════════════════
//  R3STO — Hook useTranslation
//  Usage: const { t, lang, days, months, fmtDate } = useT()
// ══════════════════════════════════════════════════

import { useAppStore } from '../store/useAppStore'
import { t as translate, getDays, getMonths, type Lang } from './translations'

export function useT() {
  const storeLang = useAppStore(s => s.lang)

  // Convertir store ('fr') → traductions ('FR')
  const lang: Lang = storeLang.toUpperCase() as Lang

  // Fonction de traduction
  const t = (key: string) => translate(key, lang)

  // Jours et mois localisés
  const days = getDays(lang)
  const months = getMonths(lang)

  // Formater une date ISO en texte localisé
  function fmtDate(iso: string): string {
    const d = new Date(iso + 'T12:00:00')
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`
  }

  return { t, lang, days, months, fmtDate }
}
