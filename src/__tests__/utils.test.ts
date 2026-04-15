import { describe, it, expect, beforeEach } from 'vitest'
import {
  isOccupying,
  getOccupiedTableIds,
  getFreeTables,
  getFreeCombos,
  getMaxCapacity,
  getEffectiveMaxCovers,
  canMoveResa,
  canSwapResas,
  canUncombine,
  getCombosForTable,
  detectTablePref,
  tblMatchesTable,
  iaPlacement,
  smartPlacement
} from '../utils/placementRules'
import { computeAlerts } from '../utils/alerts'
import type { Resa, Table, Combo, Service } from '../types'

describe('Placement Rules — Basic', () => {
  it('isOccupying: reserved status occupies table', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    expect(isOccupying(resa)).toBe(true)
  })

  it('isOccupying: arrived status occupies table', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'arrived', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    expect(isOccupying(resa)).toBe(true)
  })

  it('isOccupying: done status does not occupy', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'done', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    expect(isOccupying(resa)).toBe(false)
  })

  it('isOccupying: noshow does not occupy', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'noshow', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    expect(isOccupying(resa)).toBe(false)
  })

  it('tblMatchesTable: exact match', () => {
    expect(tblMatchesTable('T1', 'T1')).toBe(true)
  })

  it('tblMatchesTable: no substring match', () => {
    expect(tblMatchesTable('T1', 'T10')).toBe(false)
  })

  it('tblMatchesTable: combo contains table', () => {
    expect(tblMatchesTable('T1+T2', 'T1')).toBe(true)
  })

  it('tblMatchesTable: combo contains table (T2)', () => {
    expect(tblMatchesTable('T1+T2', 'T2')).toBe(true)
  })

  it('tblMatchesTable: combo does not match unrelated table', () => {
    expect(tblMatchesTable('T1+T2', 'T3')).toBe(false)
  })
})

describe('Placement Rules — Occupied Tables', () => {
  const tables: Table[] = [
    {
      id: 't1', n: 'T1', salle: 'main', shape: 'round',
      capMin: 2, capMax: 4, x: 10, y: 20, w: 5, h: 5,
      active: true, priority: 1, blocked: false, held: false
    },
    {
      id: 't2', n: 'T2', salle: 'main', shape: 'round',
      capMin: 2, capMax: 4, x: 30, y: 20, w: 5, h: 5,
      active: true, priority: 2, blocked: false, held: false
    }
  ]

  it('getOccupiedTableIds: returns occupied table IDs', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    const ids = getOccupiedTableIds([resa], '2026-03-30', 'soir')
    expect(ids.has('T1')).toBe(true)
  })

  it('getOccupiedTableIds: does not include done reservations', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'done', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    const ids = getOccupiedTableIds([resa], '2026-03-30', 'soir')
    expect(ids.has('T1')).toBe(false)
  })

  it('getFreeTables: returns free tables only', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    const free = getFreeTables(tables, [resa], '2026-03-30', 'soir')
    expect(free).toHaveLength(1)
    expect(free[0].n).toBe('T2')
  })

  it('getFreeTables: excludes blocked tables', () => {
    const blockedTables = [
      ...tables,
      {
        id: 't3', n: 'T3', salle: 'main', shape: 'round',
        capMin: 2, capMax: 4, x: 50, y: 20, w: 5, h: 5,
        active: true, priority: 3, blocked: true, held: false
      }
    ]
    const free = getFreeTables(blockedTables, [], '2026-03-30', 'soir')
    expect(free.map(t => t.n)).not.toContain('T3')
  })
})

describe('Placement Rules — Combos', () => {
  const tables: Table[] = [
    {
      id: 't1', n: 'T1', salle: 'main', shape: 'round',
      capMin: 2, capMax: 4, x: 10, y: 20, w: 5, h: 5,
      active: true, priority: 1, blocked: false, held: false
    },
    {
      id: 't2', n: 'T2', salle: 'main', shape: 'round',
      capMin: 2, capMax: 4, x: 30, y: 20, w: 5, h: 5,
      active: true, priority: 2, blocked: false, held: false
    }
  ]
  const combos: Combo[] = [
    {
      id: 'c1', label: 'T1+T2', tables: ['t1', 't2'],
      cap: 8, salle: 'main'
    }
  ]

  it('getFreeCombos: returns combos with all free tables', () => {
    const free = getFreeCombos(combos, tables, [], '2026-03-30', 'soir')
    expect(free).toHaveLength(1)
  })

  it('getFreeCombos: excludes combos with occupied table', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    const free = getFreeCombos(combos, tables, [resa], '2026-03-30', 'soir')
    expect(free).toHaveLength(0)
  })

  it('getMaxCapacity: returns max of free tables and combos', () => {
    const max = getMaxCapacity(tables, combos, [], '2026-03-30', 'soir')
    expect(max).toBe(8)
  })
})

describe('Placement Rules — Moves', () => {
  const tables: Table[] = [
    {
      id: 't1', n: 'T1', salle: 'main', shape: 'round',
      capMin: 2, capMax: 4, x: 10, y: 20, w: 5, h: 5,
      active: true, priority: 1, blocked: false, held: false
    },
    {
      id: 't2', n: 'T2', salle: 'main', shape: 'round',
      capMin: 2, capMax: 4, x: 30, y: 20, w: 5, h: 5,
      active: true, priority: 2, blocked: false, held: false
    },
    {
      id: 't3', n: 'T3', salle: 'main', shape: 'round',
      capMin: 2, capMax: 2, x: 50, y: 20, w: 5, h: 5,
      active: true, priority: 3, blocked: false, held: false
    }
  ]

  it('canMoveResa: allows move to free table with capacity', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    const result = canMoveResa(resa, { type: 'table', table: tables[1] }, tables, [], [])
    expect(result.valid).toBe(true)
    expect(result.newTbl).toBe('T2')
  })

  it('canMoveResa: blocks move to occupied table', () => {
    const resa1: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    const resa2: Resa = {
      id: 'r2', n: 'Martin', nom: 'Martin', prenom: 'Pierre', c: 4,
      tbl: 'T2', t: '19h45', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41797654321', email: 'pierre@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    const result = canMoveResa(resa1, { type: 'table', table: tables[1] }, tables, [], [resa2])
    expect(result.valid).toBe(false)
  })

  it('canMoveResa: blocks move to table with insufficient capacity', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 4,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    const result = canMoveResa(resa, { type: 'table', table: tables[2] }, tables, [], [])
    expect(result.valid).toBe(false)
  })

  it('canSwapResas: allows swap when capacity works', () => {
    const resa1: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    const resa2: Resa = {
      id: 'r2', n: 'Martin', nom: 'Martin', prenom: 'Pierre', c: 2,
      tbl: 'T2', t: '19h45', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41797654321', email: 'pierre@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    const result = canSwapResas(resa1, resa2, tables, [])
    expect(result.valid).toBe(true)
  })

  it('canSwapResas: blocks swap when capacity does not work', () => {
    const resa1: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 4,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    const resa2: Resa = {
      id: 'r2', n: 'Martin', nom: 'Martin', prenom: 'Pierre', c: 2,
      tbl: 'T3', t: '19h45', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41797654321', email: 'pierre@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    const result = canSwapResas(resa1, resa2, tables, [])
    expect(result.valid).toBe(false)
  })

  it('canUncombine: allows uncombine to single table', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1+T2', t: '19h30', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    const result = canUncombine(resa, tables[0])
    expect(result.valid).toBe(true)
    expect(result.newTbl).toBe('T1')
  })

  it('canUncombine: blocks uncombine with insufficient capacity', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 4,
      tbl: 'T1+T2', t: '19h30', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    const result = canUncombine(resa, tables[2])
    expect(result.valid).toBe(false)
  })
})

describe('Placement Rules — Table Preference', () => {
  it('detectTablePref: finds preferred table from history', () => {
    const resas: Resa[] = [
      {
        id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
        tbl: 'T1', t: '19h30', svc: 'soir', s: 'done', note: '',
        date: '2026-03-28', createdAt: Date.now(), statut: 0, mode: 'manuel',
        tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
        prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
      },
      {
        id: 'r2', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
        tbl: 'T1', t: '20h00', svc: 'soir', s: 'done', note: '',
        date: '2026-03-29', createdAt: Date.now(), statut: 0, mode: 'manuel',
        tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
        prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
      }
    ]
    const pref = detectTablePref('+41791234567', 'Dupont', 'Jean', resas)
    expect(pref).toBe('T1')
  })

  it('detectTablePref: requires minimum 2 visits', () => {
    const resas: Resa[] = [
      {
        id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
        tbl: 'T1', t: '19h30', svc: 'soir', s: 'done', note: '',
        date: '2026-03-28', createdAt: Date.now(), statut: 0, mode: 'manuel',
        tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
        prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
      }
    ]
    const pref = detectTablePref('+41791234567', 'Dupont', 'Jean', resas)
    expect(pref).toBeNull()
  })
})

describe('Placement Rules — IA Placement', () => {
  const tables: Table[] = [
    {
      id: 't1', n: 'T1', salle: 'main', shape: 'round',
      capMin: 2, capMax: 2, x: 10, y: 20, w: 5, h: 5,
      active: true, priority: 1, blocked: false, held: false
    },
    {
      id: 't2', n: 'T2', salle: 'main', shape: 'round',
      capMin: 2, capMax: 4, x: 30, y: 20, w: 5, h: 5,
      active: true, priority: 2, blocked: false, held: false
    },
    {
      id: 't3', n: 'T3', salle: 'main', shape: 'round',
      capMin: 4, capMax: 8, x: 50, y: 20, w: 5, h: 5,
      active: true, priority: 3, blocked: false, held: false
    }
  ]
  const combos: Combo[] = []

  it('iaPlacement: chooses smallest table that fits', () => {
    const placement = iaPlacement(2, '2026-03-30', 'soir', tables, combos, [], undefined, undefined)
    expect(placement).toBe('T1')
  })

  it('iaPlacement: chooses larger table when small is occupied', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    const placement = iaPlacement(2, '2026-03-30', 'soir', tables, combos, [resa], undefined, undefined)
    expect(placement).toBe('T2')
  })

  it('iaPlacement: returns null when no table fits', () => {
    const placement = iaPlacement(10, '2026-03-30', 'soir', tables, combos, [], undefined, undefined)
    expect(placement).toBeNull()
  })
})

describe('Alerts', () => {
  it('computeAlerts: counts waitlist', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: '', t: '19h30', svc: 'soir', s: 'waitlist', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    const alerts = computeAlerts([resa], '2026-03-30')
    expect(alerts.waitlist).toBe(1)
  })

  it('computeAlerts: counts groups (>=6 covers)', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 8,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    const alerts = computeAlerts([resa], '2026-03-30')
    expect(alerts.groups).toBe(1)
  })

  // R3STO concept : auto-assign systématique → pas de champ "unassigned" dans
  // computeAlerts. Ce test a été retiré le 15 avril 2026.
  // Voir feedback_no_unassigned_resa.md.

  it('computeAlerts: counts noshow', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'noshow', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    const alerts = computeAlerts([resa], '2026-03-30')
    expect(alerts.noshow).toBe(1)
  })

  it('computeAlerts: filters by date', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: '', t: '19h30', svc: 'soir', s: 'waitlist', note: '',
      date: '2026-03-29', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    const alerts = computeAlerts([resa], '2026-03-30')
    expect(alerts.waitlist).toBe(0)
  })
})

describe('Placement Rules — getCombosForTable', () => {
  const combos: Combo[] = [
    {
      id: 'c1', label: 'T1+T2', tables: ['t1', 't2'],
      cap: 8, salle: 'main'
    },
    {
      id: 'c2', label: 'T1+T3', tables: ['t1', 't3'],
      cap: 10, salle: 'main'
    }
  ]

  it('getCombosForTable: returns combos containing table', () => {
    const result = getCombosForTable('t1', combos)
    expect(result).toHaveLength(2)
  })

  it('getCombosForTable: returns empty for table not in combos', () => {
    const result = getCombosForTable('t4', combos)
    expect(result).toHaveLength(0)
  })
})

describe('Placement Rules — EffectiveMaxCovers', () => {
  const tables: Table[] = [
    {
      id: 't1', n: 'T1', salle: 'main', shape: 'round',
      capMin: 2, capMax: 4, x: 10, y: 20, w: 5, h: 5,
      active: true, priority: 1, blocked: false, held: false
    },
    {
      id: 't2', n: 'T2', salle: 'main', shape: 'round',
      capMin: 2, capMax: 4, x: 30, y: 20, w: 5, h: 5,
      active: true, priority: 2, blocked: false, held: false
    }
  ]

  it('getEffectiveMaxCovers: limits by service max', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 6,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    const max = getEffectiveMaxCovers(tables, [], [resa], '2026-03-30', 'soir', 10)
    expect(max).toBe(4)
  })

  it('getEffectiveMaxCovers: returns min of free capacity and remaining', () => {
    const max = getEffectiveMaxCovers(tables, [], [], '2026-03-30', 'soir', 8)
    expect(max).toBeLessThanOrEqual(8)
  })
})
