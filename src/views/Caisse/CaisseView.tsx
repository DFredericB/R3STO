import { useState } from 'react';
import { useT } from '../../i18n/useTranslation';

interface ServedOrder {
  id: string;
  table: string;
  total: number;
  items: Array<{ name: string; qty: number; price: number }>;
  createdAt: number;
}

export function CaisseView() {
  const { t } = useT();
  const [servedOrders] = useState<ServedOrder[]>([
    {
      id: 'cmd1',
      table: 'T1',
      total: 54,
      items: [
        { name: 'Salade César', qty: 2, price: 16 },
        { name: 'Carpaccio', qty: 1, price: 22 },
      ],
      createdAt: Date.now() - 45 * 60000,
    },
    {
      id: 'cmd2',
      table: 'T2',
      total: 92,
      items: [{ name: 'Entrecôte 250g', qty: 2, price: 46 }],
      createdAt: Date.now() - 40 * 60000,
    },
    {
      id: 'cmd3',
      table: 'T3',
      total: 70,
      items: [{ name: 'Filet de perche', qty: 1, price: 38 }, { name: 'Dessert', qty: 1, price: 12 }],
      createdAt: Date.now() - 35 * 60000,
    },
    {
      id: 'cmd4',
      table: 'T4',
      total: 36,
      items: [{ name: 'Risotto', qty: 1, price: 32 }],
      createdAt: Date.now() - 30 * 60000,
    },
    {
      id: 'cmd5',
      table: 'T5',
      total: 48,
      items: [{ name: 'Café', qty: 3, price: 4 }, { name: 'Pastry', qty: 2, price: 6 }],
      createdAt: Date.now() - 25 * 60000,
    },
    {
      id: 'cmd6',
      table: 'T6',
      total: 65,
      items: [{ name: 'Pinot Noir', qty: 1, price: 52 }, { name: 'Eau', qty: 2, price: 5 }],
      createdAt: Date.now() - 20 * 60000,
    },
  ]);

  const totalCA = servedOrders.reduce((s, c) => s + c.total, 0);
  const totalCmd = servedOrders.length;
  const ticketMoyen = totalCmd ? totalCA / totalCmd : 0;

  const modules = [
    { icon: '💳', label: t('caisse.paiManuel') },
    { icon: '🖨', label: t('caisse.impRecu') },
    { icon: '📊', label: t('caisse.zCaisse') },
    { icon: '💰', label: t('caisse.gestEspeces') },
    { icon: '🔗', label: t('caisse.integStripe') },
    { icon: '📑', label: t('caisse.rapTva') },
    { icon: '📦', label: t('caisse.lienStock') },
    { icon: '👥', label: t('caisse.tipsEquipe') },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - var(--hh))',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 18px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surf)',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: '16px', fontWeight: 900, marginBottom: '4px', color: 'var(--text)' }}>
          💰 {t('caisse.title')}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--t3)' }}>
          {t('caisse.subtitle')}
        </div>
      </div>

      <div style={{
        flex: 1,
        overflow: 'auto',
        minHeight: 0,
      }}>
        <div style={{
          padding: '18px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '12px',
        }}>
          {/* KPI Cards */}
          <div style={{
            background: 'var(--surf2)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '16px',
          }}>
            <div style={{
              fontSize: '11px',
              color: 'var(--t3)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '6px',
            }}>
              {t('caisse.caService')}
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: 900,
              fontFamily: 'DM Mono, monospace',
              color: 'var(--text)',
            }}>
              CHF {totalCA.toFixed(2)}
            </div>
          </div>

          <div style={{
            background: 'var(--surf2)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '16px',
          }}>
            <div style={{
              fontSize: '11px',
              color: 'var(--t3)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '6px',
            }}>
              {t('caisse.cmdServies')}
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: 900,
              fontFamily: 'DM Mono, monospace',
              color: 'var(--text)',
            }}>
              {totalCmd}
            </div>
          </div>

          <div style={{
            background: 'var(--surf2)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '16px',
          }}>
            <div style={{
              fontSize: '11px',
              color: 'var(--t3)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '6px',
            }}>
              {t('caisse.ticketMoyen')}
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: 900,
              fontFamily: 'DM Mono, monospace',
              color: 'var(--text)',
            }}>
              CHF {ticketMoyen.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Future Modules */}
        <div style={{
          padding: '0 18px 18px 18px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
        }}>
          {modules.map((module, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--surf2)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '14px 16px',
                opacity: 0.6,
                cursor: 'default',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '18px' }}>{module.icon}</span>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
                  {module.label}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
                  {t('caisse.bientot')}
                </div>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: '14px' }}>🔒</span>
            </div>
          ))}
        </div>

        {/* Served Orders Detail - Optional Section */}
        <div style={{
          padding: '18px',
          borderTop: '1px solid var(--border)',
        }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 800,
            color: 'var(--text)',
            marginBottom: '12px',
          }}>
            📋 {t('caisse.detailCmd')}
          </div>
          <div style={{
            display: 'grid',
            gap: '8px',
          }}>
            {servedOrders.map(order => (
              <div
                key={order.id}
                style={{
                  background: 'var(--surf2)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text)',
                  }}>
                    Table {order.table}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: 'var(--t3)',
                    marginTop: '2px',
                  }}>
                    {order.items.map(i => i.name).join(', ')}
                  </div>
                </div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  fontFamily: 'DM Mono, monospace',
                  color: 'var(--gn)',
                  whiteSpace: 'nowrap',
                  marginLeft: '12px',
                }}>
                  CHF {order.total.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
