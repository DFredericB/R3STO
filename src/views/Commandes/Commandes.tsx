import { useState } from 'react';

interface OrderItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

interface Order {
  id: string;
  table: string;
  status: 'pending' | 'preparing' | 'ready' | 'done';
  items: OrderItem[];
  total: number;
  note?: string;
  createdAt: number;
}

interface BellAlert {
  id: string;
  table: string;
  msg: string;
  ts: string;
}

export function Commandes() {
  const [filter, setFilter] = useState<'actives' | 'alertes' | 'terminees'>('actives');
  const [orders, setOrders] = useState<Order[]>([
    {
      id: 'cmd1',
      table: 'T3',
      status: 'pending',
      items: [
        { id: 'm1', name: 'Salade César', qty: 2, price: 16 },
        { id: 'm2', name: 'Carpaccio bœuf', qty: 1, price: 22 },
      ],
      total: 54,
      note: '',
      createdAt: Date.now() - 5 * 60000,
    },
    {
      id: 'cmd2',
      table: 'T7',
      status: 'preparing',
      items: [{ id: 'm4', name: 'Entrecôte 250g', qty: 2, price: 46 }],
      total: 92,
      note: 'Bien cuit',
      createdAt: Date.now() - 12 * 60000,
    },
    {
      id: 'cmd3',
      table: 'T5',
      status: 'ready',
      items: [
        { id: 'm3', name: 'Filet de perche', qty: 1, price: 38 },
      ],
      total: 38,
      note: '',
      createdAt: Date.now() - 18 * 60000,
    },
    {
      id: 'cmd4',
      table: 'T1',
      status: 'done',
      items: [
        { id: 'm5', name: 'Risotto', qty: 1, price: 32 },
      ],
      total: 32,
      note: '',
      createdAt: Date.now() - 45 * 60000,
    },
  ]);

  const [bellAlerts, setBellAlerts] = useState<BellAlert[]>([
    {
      id: '1',
      table: 'T2',
      msg: 'Appel serveur',
      ts: '14:25',
    },
  ]);

  const actives = orders.filter(c => c.status !== 'done');
  const terminees = orders.filter(c => c.status === 'done');

  const statusLabel: Record<string, string> = {
    pending: 'En attente',
    preparing: 'En préparation',
    ready: 'Prêt à servir',
    done: 'Terminé',
  };

  const statusCol: Record<string, string> = {
    pending: 'var(--am)',
    preparing: 'var(--bl)',
    ready: 'var(--gn)',
    done: 'var(--t3)',
  };

  const cmdAdvance = (id: string) => {
    setOrders(orders.map(cmd => {
      if (cmd.id !== id) return cmd;
      const nextStatus = {
        pending: 'preparing' as const,
        preparing: 'ready' as const,
        ready: 'done' as const,
        done: 'done' as const,
      };
      return { ...cmd, status: nextStatus[cmd.status] };
    }));
  };

  const cmdDelete = (id: string) => {
    setOrders(orders.filter(c => c.id !== id));
  };

  const renderOrderCard = (cmd: Order) => {
    const age = Math.round((Date.now() - cmd.createdAt) / 60000);
    const urgent = cmd.status === 'pending' && age >= 5;

    return (
      <div key={cmd.id} style={{
        background: 'var(--surf)',
        border: `1.5px solid ${urgent ? 'var(--rd)' : 'var(--border)'}`,
        borderRadius: '12px',
        padding: '14px 16px',
        marginBottom: '10px',
        animation: urgent ? 'pulse 2s infinite' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 900,
            fontFamily: 'DM Mono, monospace',
            color: 'var(--text)',
          }}>
            Table {cmd.table}
          </div>
          <span style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '5px',
            background: 'rgba(68, 128, 216, 0.12)',
            color: statusCol[cmd.status] || 'var(--t3)',
            fontWeight: 700,
          }}>
            {statusLabel[cmd.status] || cmd.status}
          </span>
          {urgent && (
            <span style={{
              fontSize: '11px',
              background: 'rgba(220, 80, 80, 0.15)',
              color: 'var(--rd)',
              borderRadius: '4px',
              padding: '1px 7px',
              fontWeight: 800,
              animation: 'blink 1s infinite',
            }}>
              {age}min — URGENT
            </span>
          )}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: '11px', color: 'var(--t3)' }}>
            {new Date(cmd.createdAt).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
          {cmd.items.map((it, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
              <span style={{
                fontWeight: 700,
                fontFamily: 'DM Mono, monospace',
                color: 'var(--t2)',
                width: '20px',
                textAlign: 'right',
              }}>
                ×{it.qty}
              </span>
              <span style={{ flex: 1, color: 'var(--text)' }}>{it.name}</span>
              <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--t3)' }}>
                CHF {(it.price * it.qty).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {cmd.note && (
          <div style={{
            fontSize: '11px',
            color: 'var(--am)',
            marginTop: '4px',
            padding: '5px 8px',
            background: 'rgba(240, 160, 32, 0.06)',
            borderRadius: '5px',
          }}>
            💬 {cmd.note}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
          <span style={{
            fontSize: '13px',
            fontWeight: 800,
            fontFamily: 'DM Mono, monospace',
            color: 'var(--bl)',
          }}>
            CHF {cmd.total}
          </span>
          <div style={{ display: 'flex', gap: '5px' }}>
            {cmd.status === 'pending' && (
              <button
                onClick={() => cmdAdvance(cmd.id)}
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  background: 'var(--am)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                🍳 En prép.
              </button>
            )}
            {cmd.status === 'preparing' && (
              <button
                onClick={() => cmdAdvance(cmd.id)}
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  background: 'var(--gn)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                ✓ Prêt
              </button>
            )}
            {cmd.status === 'ready' && (
              <button
                onClick={() => cmdAdvance(cmd.id)}
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  background: 'var(--gn)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                ✅ Servi
              </button>
            )}
            <button
              onClick={() => cmdDelete(cmd.id)}
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: 'var(--rd)',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              🗑
            </button>
          </div>
        </div>
      </div>
    );
  };

  let content: React.ReactNode;

  if (filter === 'alertes') {
    content = (
      <div style={{ padding: '14px 18px 24px' }}>
        {bellAlerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--t3)', fontSize: '12px' }}>
            ✅ Aucune alerte active
          </div>
        ) : (
          <>
            {bellAlerts.map(a => (
              <div key={a.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                background: 'var(--surf)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                marginBottom: '8px',
              }}>
                <span style={{ fontSize: '20px' }}>🔔</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
                    Table {a.table}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--t3)' }}>{a.msg}</div>
                </div>
                <span style={{
                  fontSize: '11px',
                  fontFamily: 'DM Mono, monospace',
                  color: 'var(--t4)',
                }}>
                  {a.ts}
                </span>
              </div>
            ))}
            <button
              onClick={() => setBellAlerts([])}
              style={{
                width: '100%',
                fontSize: '11px',
                marginTop: '4px',
                padding: '10px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: 'var(--rd)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              🗑 Effacer toutes les alertes
            </button>
          </>
        )}
      </div>
    );
  } else if (filter === 'actives') {
    content = (
      <div style={{ padding: '14px 18px 24px' }}>
        {actives.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--t3)', fontSize: '12px' }}>
            Aucune commande en cours
          </div>
        ) : (
          actives.map(renderOrderCard)
        )}
      </div>
    );
  } else {
    content = (
      <div style={{ padding: '14px 18px 24px' }}>
        {terminees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--t3)', fontSize: '12px' }}>
            Aucune commande terminée
          </div>
        ) : (
          terminees.map(renderOrderCard)
        )}
      </div>
    );
  }

  const bellBadge = bellAlerts.length > 0 ? (
    <span style={{
      fontSize: '11px',
      background: 'var(--rd)',
      color: '#fff',
      borderRadius: '10px',
      padding: '1px 6px',
      marginLeft: '4px',
      fontWeight: 800,
    }}>
      {bellAlerts.length}
    </span>
  ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--hh))', overflow: 'hidden' }}>
      <div style={{ paddingBottom: '6px', flexShrink: 0, borderBottom: '1px solid var(--border)', padding: '10px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '16px', fontWeight: 900 }}>📋 Commandes</div>
          <div style={{ fontSize: '12px', color: 'var(--t3)' }}>
            {actives.length} active{actives.length !== 1 ? 's' : ''} · {bellAlerts.length} alerte{bellAlerts.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div style={{ padding: '5px 18px', display: 'flex', gap: '4px', alignItems: 'center', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <button
          onClick={() => setFilter('actives')}
          style={{
            fontSize: '11px',
            padding: '3px 10px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            background: filter === 'actives' ? 'var(--bl2)' : 'transparent',
            color: filter === 'actives' ? '#fff' : 'var(--t3)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          En cours ({actives.length})
        </button>
        <button
          onClick={() => setFilter('alertes')}
          style={{
            fontSize: '11px',
            padding: '3px 10px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            background: filter === 'alertes' ? 'var(--bl2)' : 'transparent',
            color: filter === 'alertes' ? '#fff' : 'var(--t3)',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          🔔 Alertes
          {bellBadge}
        </button>
        <button
          onClick={() => setFilter('terminees')}
          style={{
            fontSize: '11px',
            padding: '3px 10px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            background: filter === 'terminees' ? 'var(--bl2)' : 'transparent',
            color: filter === 'terminees' ? '#fff' : 'var(--t3)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Terminées ({terminees.length})
        </button>
        <div style={{ flex: 1 }} />
        <button
          style={{
            fontSize: '11px',
            padding: '3px 10px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            background: 'transparent',
            color: 'var(--t3)',
            cursor: 'pointer',
          }}
        >
          🔔 Test sonnette
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>{content}</div>
    </div>
  );
}
