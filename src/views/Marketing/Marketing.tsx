import { useState } from 'react'
import { useT } from '../../i18n/useTranslation'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ui/Toast'
import { RADIUS, GAP, sectionTitle } from '../../utils/design'

// ══════════════════════════════════════════════════
//  R3STO — Marketing & Campagnes
//  Automations email/SMS · Templates · Stats
// ══════════════════════════════════════════════════

interface Automation {
  id: string
  nameKey: string
  triggerKey: string
  canal: 'email' | 'sms' | 'both'
  active: boolean
  sent: number
  openRate: number
}

interface Template {
  id: string
  nameKey: string
  descKey: string
  icon: string
  canal: 'email' | 'sms' | 'both'
  category: 'lifecycle' | 'promo' | 'loyalty'
}

const AUTOMATIONS: Automation[] = [
  { id: '1', nameKey: 'mkt.auto.welcome',     triggerKey: 'mkt.trigger.firstResa',    canal: 'both',  active: true,  sent: 247,  openRate: 78 },
  { id: '2', nameKey: 'mkt.auto.remind24',     triggerKey: 'mkt.trigger.24hBefore',    canal: 'sms',   active: true,  sent: 1523, openRate: 92 },
  { id: '3', nameKey: 'mkt.auto.thanks',       triggerKey: 'mkt.trigger.afterVisit',   canal: 'email', active: true,  sent: 890,  openRate: 65 },
  { id: '4', nameKey: 'mkt.auto.winback',      triggerKey: 'mkt.trigger.30dInactive',  canal: 'email', active: false, sent: 312,  openRate: 42 },
  { id: '5', nameKey: 'mkt.auto.birthday',     triggerKey: 'mkt.trigger.birthday',     canal: 'both',  active: true,  sent: 45,   openRate: 85 },
  { id: '6', nameKey: 'mkt.auto.reviewAsk',    triggerKey: 'mkt.trigger.48hAfter',     canal: 'email', active: false, sent: 0,    openRate: 0 },
]

const TEMPLATES: Template[] = [
  { id: 't1', nameKey: 'mkt.tpl.welcome',       descKey: 'mkt.tpl.welcome.desc',       icon: '👋', canal: 'email', category: 'lifecycle' },
  { id: 't2', nameKey: 'mkt.tpl.confirm',       descKey: 'mkt.tpl.confirm.desc',       icon: '✅', canal: 'both',  category: 'lifecycle' },
  { id: 't3', nameKey: 'mkt.tpl.remind',        descKey: 'mkt.tpl.remind.desc',        icon: '⏰', canal: 'sms',   category: 'lifecycle' },
  { id: 't4', nameKey: 'mkt.tpl.thanks',        descKey: 'mkt.tpl.thanks.desc',        icon: '🙏', canal: 'email', category: 'lifecycle' },
  { id: 't5', nameKey: 'mkt.tpl.promo',         descKey: 'mkt.tpl.promo.desc',         icon: '🎁', canal: 'email', category: 'promo' },
  { id: 't6', nameKey: 'mkt.tpl.seasonal',      descKey: 'mkt.tpl.seasonal.desc',      icon: '🍂', canal: 'email', category: 'promo' },
  { id: 't7', nameKey: 'mkt.tpl.birthday',      descKey: 'mkt.tpl.birthday.desc',      icon: '🎂', canal: 'both',  category: 'loyalty' },
  { id: 't8', nameKey: 'mkt.tpl.loyaltyReward', descKey: 'mkt.tpl.loyaltyReward.desc', icon: '⭐', canal: 'email', category: 'loyalty' },
]

type MktTab = 'automations' | 'templates' | 'stats'

export function Marketing() {
  const { t } = useT()
  const { toast } = useToast()
  const plan = useAppStore(s => s.resto.plan)
  const options = useAppStore(s => s.options)
  const updateOptions = useAppStore(s => s.updateOptions)
  const [tab, setTab] = useState<MktTab>('automations')

  // Read automations from store options if available, else use defaults
  const storedAutomations = (options as any).marketingAutomations as Automation[] | undefined
  const [automations, setAutomations] = useState<Automation[]>(storedAutomations || AUTOMATIONS)

  const toggle = (id: string) => {
    const updated = automations.map(m => m.id === id ? { ...m, active: !m.active } : m)
    setAutomations(updated)
    updateOptions({ marketingAutomations: updated } as any)
    toast(t('mkt.toggleSuccess'), 'success')
  }

  const totalSent = automations.reduce((s, m) => s + m.sent, 0)
  const activeCount = automations.filter(m => m.active).length
  const avgOpen = automations.filter(m => m.sent > 0).reduce((s, m) => s + m.openRate, 0) / Math.max(1, automations.filter(m => m.sent > 0).length)

  const canalLabel = (c: string) => c === 'both' ? 'Email + SMS' : c === 'sms' ? 'SMS' : 'Email'

  const tabs: { id: MktTab; icon: string; labelKey: string }[] = [
    { id: 'automations', icon: '⚡', labelKey: 'mkt.tab.automations' },
    { id: 'templates',   icon: '📄', labelKey: 'mkt.tab.templates' },
    { id: 'stats',       icon: '📊', labelKey: 'mkt.tab.stats' },
  ]

  // Gate plan Resto/Gastro
  const hasMarketing = plan === 'resto' || plan === 'gastro'

  if (!hasMarketing) {
    return (
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - var(--hh))', gap: GAP.lg, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>📢</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>{t('mkt.locked.title')}</div>
        <div style={{ fontSize: 13, color: 'var(--t3)', maxWidth: 400, lineHeight: 1.6 }}>{t('mkt.locked.desc')}</div>
        <div style={{ padding: '10px 20px', borderRadius: RADIUS.sm, background: 'var(--bl)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {t('mkt.locked.upgrade')}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 0, overflow: 'auto', height: 'calc(100vh - var(--hh))' }}>
      {/* Header */}
      <div style={{ paddingBottom: 14, marginBottom: 10 }}>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span>{t('mkt.title')}</span>
          <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--t2)' }}>{t('mkt.subtitle')}</span>
        </h2>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: GAP.lg, marginBottom: 14 }}>
        {[
          { label: t('mkt.kpi.active'),   value: String(activeCount), color: 'var(--gn)' },
          { label: t('mkt.kpi.sent'),      value: totalSent.toLocaleString(), color: 'var(--bl)', sub: t('mkt.kpi.sentSub') },
          { label: t('mkt.kpi.openRate'),  value: Math.round(avgOpen) + '%', color: 'var(--gn)', sub: t('mkt.kpi.openRateSub') },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: RADIUS.md, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: GAP.md }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: kpi.color, fontFamily: 'var(--fm)' }}>{kpi.value}</div>
            {kpi.sub && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>{kpi.sub}</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ padding: '5px 0', display: 'flex', gap: GAP.xs, borderBottom: '1px solid var(--border)', marginBottom: 14, flexWrap: 'wrap' }}>
        {tabs.map(tb => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            style={{
              fontSize: 11, padding: '6px 14px', minHeight: 44,
              borderRadius: RADIUS.sm, border: 'none',
              background: tab === tb.id ? 'var(--bl)' : 'var(--surf2)',
              color: tab === tb.id ? 'white' : 'var(--text)',
              cursor: 'pointer', fontWeight: 700, fontFamily: 'var(--ff)',
            }}
          >
            {tb.icon} {t(tb.labelKey)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>

        {/* ═══ AUTOMATIONS ═══ */}
        {tab === 'automations' && (
          <div>
            <div style={{ display: 'flex', gap: GAP.md, marginBottom: GAP.lg }}>
              <button
                onClick={() => toast(t('mkt.newAuto'), 'success')}
                style={{
                  padding: '8px 14px', minHeight: 44,
                  borderRadius: RADIUS.sm, border: 'none',
                  background: 'var(--bl)', color: 'white',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--ff)',
                }}
              >
                ➕ {t('mkt.newAuto')}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: GAP.lg }}>
              {automations.map(m => (
                <div key={m.id} style={{
                  background: 'var(--surf)', border: '1px solid var(--border)',
                  borderRadius: RADIUS.md, padding: 14,
                  opacity: m.active ? 1 : 0.6,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: GAP.lg }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{t(m.nameKey)}</div>
                      <div style={{ fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--t3)' }}>
                        🎯 {t(m.triggerKey)} · 📧 {canalLabel(m.canal)}
                      </div>
                      <div style={{ display: 'flex', gap: GAP.lg, marginTop: 6, fontSize: 11, color: 'var(--t3)' }}>
                        <span>{m.sent} {t('mkt.sends')}</span>
                        {m.openRate > 0 && <span>📬 {m.openRate}% {t('mkt.opened')}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: GAP.sm, flexShrink: 0 }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: RADIUS.xs,
                        background: m.active ? 'rgba(60,200,112,.12)' : 'rgba(100,116,139,.12)',
                        color: m.active ? 'var(--gn)' : 'var(--t3)',
                        fontSize: 11, fontWeight: 700,
                      }}>
                        {m.active ? t('mkt.active') : t('mkt.inactive')}
                      </span>
                      <button
                        onClick={() => toggle(m.id)}
                        style={{
                          fontSize: 11, padding: '6px 10px', minHeight: 36,
                          borderRadius: RADIUS.xs,
                          border: `1px solid ${m.active ? 'var(--rd)' : 'var(--gn)'}`,
                          background: m.active ? 'rgba(239,68,68,.08)' : 'rgba(60,200,112,.08)',
                          color: m.active ? 'var(--rd)' : 'var(--gn)',
                          cursor: 'pointer', fontWeight: 700, fontFamily: 'var(--ff)',
                        }}
                      >
                        {m.active ? t('mkt.deactivate') : t('mkt.activate')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ TEMPLATES ═══ */}
        {tab === 'templates' && (
          <div>
            {(['lifecycle', 'promo', 'loyalty'] as const).map(cat => {
              const items = TEMPLATES.filter(tp => tp.category === cat)
              if (!items.length) return null
              return (
                <div key={cat} style={{ marginBottom: GAP.xxl }}>
                  <div style={{ ...sectionTitle, marginBottom: GAP.md }}>
                    {t(`mkt.cat.${cat}`)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: GAP.lg }}>
                    {items.map(tp => (
                      <div
                        key={tp.id}
                        onClick={() => toast(t(tp.nameKey) + ' — ' + t('mkt.tpl.preview'), 'success')}
                        style={{
                          background: 'var(--surf2)', border: '1.5px solid var(--border)',
                          borderRadius: RADIUS.lg, padding: 14,
                          cursor: 'pointer', transition: '.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--bl)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: GAP.md, marginBottom: 6 }}>
                          <span style={{ fontSize: 20 }}>{tp.icon}</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{t(tp.nameKey)}</div>
                            <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--fm)' }}>{canalLabel(tp.canal)}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.45 }}>{t(tp.descKey)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ═══ STATS ═══ */}
        {tab === 'stats' && (
          <div>
            <div style={{ ...sectionTitle, marginBottom: GAP.lg }}>{t('mkt.stats.title')}</div>

            {/* Monthly breakdown */}
            <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: RADIUS.md, padding: 14, marginBottom: GAP.lg }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: GAP.lg }}>{t('mkt.stats.monthly')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: GAP.md, fontSize: 11 }}>
                <div style={{ fontWeight: 700, color: 'var(--t3)' }}>{t('mkt.stats.channel')}</div>
                <div style={{ fontWeight: 700, color: 'var(--t3)', textAlign: 'right' }}>{t('mkt.stats.sentCol')}</div>
                <div style={{ fontWeight: 700, color: 'var(--t3)', textAlign: 'right' }}>{t('mkt.stats.delivered')}</div>
                <div style={{ fontWeight: 700, color: 'var(--t3)', textAlign: 'right' }}>{t('mkt.stats.openCol')}</div>

                <div>Email</div>
                <div style={{ textAlign: 'right', fontFamily: 'var(--fm)' }}>1,494</div>
                <div style={{ textAlign: 'right', fontFamily: 'var(--fm)' }}>98.2%</div>
                <div style={{ textAlign: 'right', fontFamily: 'var(--fm)', color: 'var(--gn)' }}>65%</div>

                <div>SMS</div>
                <div style={{ textAlign: 'right', fontFamily: 'var(--fm)' }}>1,523</div>
                <div style={{ textAlign: 'right', fontFamily: 'var(--fm)' }}>99.1%</div>
                <div style={{ textAlign: 'right', fontFamily: 'var(--fm)', color: 'var(--gn)' }}>—</div>
              </div>
            </div>

            {/* Per automation stats */}
            <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: RADIUS.md, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: GAP.lg }}>{t('mkt.stats.perAuto')}</div>
              {automations.filter(m => m.sent > 0).map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: GAP.md, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{t(m.nameKey)}</div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--t3)', width: 60, textAlign: 'right' }}>{m.sent}</div>
                  <div style={{ width: 80 }}>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--surf2)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${m.openRate}%`, background: m.openRate >= 60 ? 'var(--gn)' : m.openRate >= 40 ? 'var(--am)' : 'var(--rd)', borderRadius: 3, transition: '.3s' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--fm)', fontWeight: 700, color: m.openRate >= 60 ? 'var(--gn)' : m.openRate >= 40 ? 'var(--am)' : 'var(--rd)', width: 40, textAlign: 'right' }}>
                    {m.openRate}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
