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
  dest: 'cuisine' | 'bar' | 'both';
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
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

interface Table {
  id: string;
  n: string;
  x: number;
  y: number;
  w: number;
  h: number;
  shape: 'round' | 'round_sm' | 'round_lg' | 'oval' | 'rect';
  salle: string;
}

interface Room {
  id: string;
  name: string;
  active: boolean;
}

export function ServiceView() {
  const [orders, setOrders] = useState<Order[]>([
    {
      id: 'kd1',
      table: 'T3',
      dest: 'cuisine',
      status: 'ready',
      items: [
        { id: 'm3', name: 'Filet de perche', qty: 1, price: 38 },
        { id: 'm5', name: 'Risotto champignons', qty: 2, price: 32 },
      ],
      total: 102,
      note: 'Risotto sans parmesan',
      createdAt: Date.now() - 18 * 60000,
    },
    {
      id: 'kd2',
      table: 'T7',
      dest: 'cuisine',
      status: 'preparing',
      items: [{ id: 'm4', name: 'Entrecôte 250g', qty: 2, price: 46 }],
      total: 92,
      note: '',
      createdAt: Date.now() - 8 * 60000,
    },
  ]);

  const [bellAlerts, setBellAlerts] = useState<BellAlert[]>([
    { id: '1', table: 'T2', msg: 'Appel serveur', ts: '14:25' },
    { id: '2', table: 'T5', msg: 'L\'addition SVP', ts: '14:22' },
  ]);

  const [tables] = useState<Table[]>([
    { id: 't1', n: 'T1', x: 10, y: 10, w: 20, h: 20, shape: 'round', salle: 'Salle principale' },
    { id: 't2', n: 'T2', x: 40, y: 10, w: 20, h: 20, shape: 'round', salle: 'Salle principale' },
    { id: 't3', n: 'T3', x: 70, y: 10, w: 20, h: 20, shape: 'round', salle: 'Salle principale' },
    { id: 't4', n: 'T4', x: 10, y: 50, w: 20, h: 20, shape: 'round', salle: 'Salle principale' },
    { id: 't5', n: 'T5', x: 40, y: 50, w: 20, h: 20, shape: 'round', salle: 'Salle principale' },
    { id: 't6', n: 'T6', x: 70, y: 50, w: 20, h: 20, shape: 'round', salle: 'Salle principale' },
    { id: 't7', n: 'T7', x: 10, y: 90, w: 20, h: 20, shape: 'round', salle: 'Salle principale' },
  ]);

  const [rooms] = useState<Room[]>([
    { id: 'r1', name: 'Salle principale', active: true },
    { id: 'r2', name: 'Terrasse', active: true },
  ]);

  const getTableStatus = (tableNm: string): 'ready' | 'preparing' | 'pending' | null => {
    const cmds = orders.filter(c =>
      c.table === tableNm && c.status !== 'served' && c.status !== 'cancelled'
    );
    if (!cmds.length) return null;
    if (cmds.some(c => c.status === 'ready')) return 'ready';
    if (cmds.some(c => c.status === 'preparing')) return 'preparing';
    return 'pending';
  };

  const cmdSetStatus = (id: string, status: Order['status']) => {
    setOrders(orders.map(cmd =>
      cmd.id === id ? { ...cmd, status } : cmd
    ));
  };

  const readyCmds = orders.filter(c => c.status === 'ready');

  const alertsHtml = bellAlerts.length > 0 && (
    <div style={{
      padding: '10px 18px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      flexShrink: 0,
      background: 'rgba(240, 160, 32, 0.04)',
    }}>
      <div style={{
        fontSize: '11px',
        fontWeight: 700,
        color: 'var(--am)',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
      }}>
        🔔 Alertes actives
      </div>
      {bellAlerts.map(a => (
        <div key={a.id} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
        }}>
          <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--t3)' }}>
            {a.ts}
          </span>
          <span style={{ fontWeight: 700, color: 'var(--am)' }}>
            {a.table}
          </span>
          <span style={{ color: 'var(--t2)' }}>
            {a.msg}
          </span>
          <button
            onClick={() => setBellAlerts(bellAlerts.filter(x => x.id !== a.id))}
            style={{
              marginLeft: 'auto',
              border: 'none',
              background: 'none',
              color: 'var(--t4)',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );

  const readyHtml = readyCmds.length > 0 && (
    <div style={{
      padding: '10px 18px',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      <div style={{
        fontSize: '11px',
        fontWeight: 700,
        color: 'var(--gn)',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        marginBottom: '8px',
      }}>
        ✅ Prêt à servir
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {readyCmds.map(cmd => (
          <div key={cmd.id} style={{
            padding: '8px 14px',
            background: 'rgba(60, 200, 112, 0.1)',
            border: '1.5px solid var(--gn)',
            borderRadius: '9px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{
              fontSize: '14px',
              fontWeight: 900,
              fontFamily: 'DM Mono, monospace',
              color: 'var(--gn)',
            }}>
              {cmd.table}
            </span>
            <span style={{
              fontSize: '11px',
              color: 'var(--t2)',
            }}>
              {cmd.dest === 'bar' ? '🍸 Bar' : '🍳 Cuisine'}
            </span>
            <button
              onClick={() => cmdSetStatus(cmd.id, 'served')}
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                border: 'none',
                borderRadius: '6px',
                background: 'var(--gn)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Servi ✓
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const planSalles = rooms.filter(s => s.active);

  const renderFloorPlan = () => {
    const items: React.ReactNode[] = [];
    planSalles.forEach((salle: any) => {
      const salleTableList = tables.filter(t => t.salle === salle.name);
      if (salleTableList.length === 0) return;

      const VW = 200;
      const VH = 120;
      let svgContent = '';

      // Grid
      for (let gx = 0; gx <= VW; gx += 10) {
        svgContent += `<line x1="${gx}" y1="0" x2="${gx}" y2="${VH}" stroke="rgba(68,128,216,.04)" stroke-width="0.3"/>`;
      }
      for (let gy = 0; gy <= VH; gy += 10) {
        svgContent += `<line x1="0" y1="${gy}" x2="${VW}" y2="${gy}" stroke="rgba(68,128,216,.04)" stroke-width="0.3"/>`;
      }

      // Tables
      salleTableList.forEach(t => {
        const orderStatus = getTableStatus(t.n);
        let fill = 'rgba(68,128,216,.07)';
        let stroke = 'rgba(68,128,216,.25)';
        let sw = '0.5';

        if (orderStatus === 'ready') {
          fill = 'rgba(60,200,112,.22)';
          stroke = 'rgba(60,200,112,.95)';
          sw = '0.8';
        } else if (orderStatus === 'preparing') {
          fill = 'rgba(68,128,216,.2)';
          stroke = 'rgba(68,128,216,.9)';
          sw = '0.8';
        } else if (orderStatus === 'pending') {
          fill = 'rgba(240,160,32,.18)';
          stroke = 'rgba(240,160,32,.9)';
          sw = '0.8';
        }

        const cx = t.x + t.w / 2;
        const cy = t.y + t.h / 2;
        let shape = '';

        if (['round', 'round_sm', 'round_lg'].includes(t.shape)) {
          shape = `<circle cx="${cx}" cy="${cy}" r="${t.h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
        } else if (t.shape === 'oval') {
          shape = `<ellipse cx="${cx}" cy="${cy}" rx="${t.w / 2}" ry="${t.h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
        } else {
          shape = `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
        }

        const badge = orderStatus === 'ready' ? '✅' : orderStatus === 'preparing' ? '🍳' : orderStatus === 'pending' ? '⏳' : '';

        svgContent += `<g style="cursor:pointer">
          ${shape}
          <text x="${cx}" y="${cy - 1.2}" text-anchor="middle" dominant-baseline="central" font-size="1.55" font-family="DM Mono,monospace" font-weight="900" fill="var(--t2)" style="pointer-events:none">${t.n}</text>
          ${badge ? `<text x="${cx}" y="${cy + 2.2}" text-anchor="middle" font-size="2" style="pointer-events:none">${badge}</text>` : ''}
        </g>`;
      });

      items.push(
        <div key={salle.id} style={{ marginBottom: '14px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--t3)',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            marginBottom: '6px',
          }}>
            {salle.name}
          </div>
          <svg
            viewBox={`0 0 ${VW} ${VH}`}
            preserveAspectRatio="xMidYMid meet"
            style={{
              width: '100%',
              display: 'block',
              background: 'var(--surf2)',
              borderRadius: '10px',
              border: '1px solid var(--border)',
            }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        </div>
      );
    });

    return items;
  };

  const legendItems = [
    ['✅', 'Prêt à servir'],
    ['🍳', 'En préparation'],
    ['⏳', 'Commande reçue'],
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - var(--hh))',
      background: 'var(--bg)',
    }}>
      <div style={{
        padding: '10px 18px',
        background: 'var(--surf)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: '16px', fontWeight: 900 }}>🧑‍💼 Vue Service</div>
        <div style={{ flex: 1 }} />
        <button style={{
          fontSize: '11px',
          padding: '3px 10px',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          background: 'transparent',
          color: 'var(--t3)',
          cursor: 'pointer',
        }}>
          📋 Réservations
        </button>
        <button style={{
          fontSize: '11px',
          padding: '3px 10px',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          background: 'transparent',
          color: 'var(--t3)',
          cursor: 'pointer',
        }}>
          🏠 Plan détaillé
        </button>
      </div>

      <div style={{
        padding: '8px 18px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        flexShrink: 0,
        background: 'var(--surf)',
      }}>
        {legendItems.map(l => (
          <span key={l[0]} style={{
            fontSize: '11px',
            color: 'var(--t3)',
          }}>
            {l[0]} {l[1]}
          </span>
        ))}
      </div>

      {alertsHtml}
      {readyHtml}

      <div style={{ flex: 1, overflow: 'auto', minHeight: 0, padding: '10px 14px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {renderFloorPlan()}
        </div>
      </div>
    </div>
  );
}
