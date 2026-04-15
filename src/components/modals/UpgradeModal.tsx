// ══════════════════════════════════════════════════
//  R3STO — UpgradeModal
//  Popup affichée quand l'utilisateur clique sur un item
//  verrouillé par son plan. Propose l'upgrade vers le plan
//  minimum requis. Zéro hardcoding : PLAN_META + i18n.
// ══════════════════════════════════════════════════

import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useTranslation'
import { PLAN_META, type Plan } from '../../utils/plans'
import { useToast } from '../ui/Toast'
import { redirectToCheckout } from '../../utils/stripe'
import { useState } from 'react'

export function UpgradeModal() {
  const upgradePrompt = useAppStore(s => s.upgradePrompt)
  const closeUpgrade = useAppStore(s => s.closeUpgradePrompt)
  const resto = useAppStore(s => s.resto)
  const { t } = useT()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)

  if (!upgradePrompt) return null

  const { minPlan, featureLabelKey, icon } = upgradePrompt
  const currentPlan = (resto?.plan as Plan) || 'bistro'
  const targetMeta = PLAN_META[minPlan]
  const currentMeta = PLAN_META[currentPlan]

  async function onUpgrade() {
    setBusy(true)
    try {
      await redirectToCheckout(minPlan, (resto as any)?.id)
    } catch (e) {
      toast((e as Error).message, 'error')
      setBusy(false)
    }
  }

  return (
    <div
      data-upgrade-modal
      onClick={closeUpgrade}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surf)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '24px',
          maxWidth: 440, width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,.4)',
          color: 'var(--text)',
          fontFamily: 'var(--ff)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            fontSize: 28,
            width: 48, height: 48,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg2)',
            borderRadius: 10,
          }}>{icon || '🔒'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--t4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>
              {t('upgrade.required')}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
              {t(featureLabelKey)}
            </div>
          </div>
        </div>

        <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.5, marginBottom: 20 }}>
          {t('upgrade.bodyPrefix')}{' '}
          <strong style={{ color: targetMeta.color }}>{t(targetMeta.labelKey)}</strong>{' '}
          {t('upgrade.bodySuffix')}
        </p>

        {/* Comparatif plans */}
        <div style={{
          display: 'flex', gap: 8,
          padding: 12,
          background: 'var(--bg2)',
          borderRadius: 8,
          marginBottom: 20,
        }}>
          <div style={{ flex: 1, textAlign: 'center', opacity: 0.5 }}>
            <div style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 600, textTransform: 'uppercase' }}>
              {t('upgrade.current')}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: currentMeta.color }}>
              {t(currentMeta.labelKey)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--t4)' }}>
              {currentMeta.priceChf} CHF
            </div>
          </div>
          <div style={{ fontSize: 20, color: 'var(--t3)', alignSelf: 'center' }}>→</div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 600, textTransform: 'uppercase' }}>
              {t('upgrade.upgrade')}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: targetMeta.color }}>
              {t(targetMeta.labelKey)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--t2)', fontWeight: 600 }}>
              {targetMeta.priceChf} CHF
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={closeUpgrade}
            style={{
              flex: 1, padding: '10px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--t2)',
              cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--ff)',
            }}
          >{t('upgrade.later')}</button>
          <button
            onClick={onUpgrade}
            disabled={busy}
            style={{
              flex: 2, padding: '10px',
              background: targetMeta.color,
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              cursor: busy ? 'wait' : 'pointer',
              fontSize: 13, fontWeight: 700,
              fontFamily: 'var(--ff)',
              opacity: busy ? 0.6 : 1,
            }}
          >{busy ? t('upgrade.redirecting') : t('upgrade.cta')}</button>
        </div>
      </div>
    </div>
  )
}
