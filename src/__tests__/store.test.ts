import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore, isDoubleBooked, isValidTransition } from '../store/useAppStore'
import type { Resa, Client, Table, Service, Salle } from '../types'

describe('Store — Reservations', () => {
  beforeEach(() => {
    useAppStore.setState({
      resas: [],
      clients: [],
      tables: [],
      combos: [],
      services: [
        {
          id: 'sv1', name: 'midi', icon: '☀️',
          open: '12:00', close: '14:30', lastOrder: '13:45',
          buffer: 15, bookingCutoffMins: 0, active: true,
          color: '#4480d8', jours: [1,2,3,4,5,6,0],
          maxCouverts: 80, maxParService: 0
        },
        {
          id: 'sv2', name: 'soir', icon: '🌙',
          open: '19:00', close: '22:30', lastOrder: '21:30',
          buffer: 15, bookingCutoffMins: 0, active: true,
          color: '#7c3aed', jours: [1,2,3,4,5,6,0],
          maxCouverts: 80, maxParService: 0
        }
      ],
      salles: []
    })
  })

  it('addResa: creates a reservation and adds to array', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    useAppStore.getState().addResa(resa)
    const state = useAppStore.getState()
    expect(state.resas).toHaveLength(1)
    expect(state.resas[0].id).toBe('r1')
    expect(state.resas[0].n).toBe('Dupont')
  })

  it('addResa: blocks double-booking on same table/date/service', () => {
    const resa1: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    const resa2: Resa = {
      id: 'r2', n: 'Martin', nom: 'Martin', prenom: 'Pierre', c: 4,
      tbl: 'T1', t: '19h45', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41797654321', email: 'pierre@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    useAppStore.getState().addResa(resa1)
    useAppStore.getState().addResa(resa2)
    const state = useAppStore.getState()
    expect(state.resas).toHaveLength(1)
  })

  it('addResa: allows booking when table is free (different service)', () => {
    const resa1: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1', t: '12h30', svc: 'midi', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    const resa2: Resa = {
      id: 'r2', n: 'Martin', nom: 'Martin', prenom: 'Pierre', c: 4,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41797654321', email: 'pierre@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    useAppStore.getState().addResa(resa1)
    useAppStore.getState().addResa(resa2)
    expect(useAppStore.getState().resas).toHaveLength(2)
  })

  it('addResa: allows booking when reservation is not active (noshow/done)', () => {
    const resa1: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'done', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    const resa2: Resa = {
      id: 'r2', n: 'Martin', nom: 'Martin', prenom: 'Pierre', c: 4,
      tbl: 'T1', t: '19h45', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41797654321', email: 'pierre@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    useAppStore.getState().addResa(resa1)
    useAppStore.getState().addResa(resa2)
    expect(useAppStore.getState().resas).toHaveLength(2)
  })

  it('updateResa: partial update works', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'reserved', note: 'VIP',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    useAppStore.getState().addResa(resa)
    useAppStore.getState().updateResa('r1', { c: 4, note: 'VIP + allergie' })
    const updated = useAppStore.getState().resas[0]
    expect(updated.c).toBe(4)
    expect(updated.note).toBe('VIP + allergie')
    expect(updated.t).toBe('19h30')
  })

  it('deleteResa: removes from array', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    useAppStore.getState().addResa(resa)
    expect(useAppStore.getState().resas).toHaveLength(1)
    useAppStore.getState().deleteResa('r1')
    expect(useAppStore.getState().resas).toHaveLength(0)
  })

  it('setResaStatus: valid transition reserved→arrived', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    useAppStore.getState().addResa(resa)
    useAppStore.getState().setResaStatus('r1', 'arrived')
    expect(useAppStore.getState().resas[0].s).toBe('arrived')
  })

  it('setResaStatus: valid transition arrived→done', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'arrived', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    useAppStore.getState().addResa(resa)
    useAppStore.getState().setResaStatus('r1', 'done')
    expect(useAppStore.getState().resas[0].s).toBe('done')
  })

  it('setResaStatus: blocks invalid transition done→arrived', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'done', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    useAppStore.getState().addResa(resa)
    useAppStore.getState().setResaStatus('r1', 'arrived')
    expect(useAppStore.getState().resas[0].s).toBe('done')
  })

  it('setResaStatus: invalid transition waitlist→done blocked', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: '', t: '19h30', svc: 'soir', s: 'waitlist', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    useAppStore.getState().addResa(resa)
    useAppStore.getState().setResaStatus('r1', 'done')
    expect(useAppStore.getState().resas[0].s).toBe('waitlist')
  })

  it('swapTables: two resas swap tables', () => {
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
    useAppStore.getState().addResa(resa1)
    useAppStore.getState().addResa(resa2)
    useAppStore.getState().swapTables('r1', 'r2')
    const state = useAppStore.getState().resas
    expect(state.find(r => r.id === 'r1')?.tbl).toBe('T2')
    expect(state.find(r => r.id === 'r2')?.tbl).toBe('T1')
  })
})

describe('Store — Clients', () => {
  beforeEach(() => {
    useAppStore.setState({ clients: [] })
  })

  it('addClient: adds to clients array', () => {
    const client: Client = {
      id: 'c1', nom: 'Dupont', prenom: 'Jean', tel: '+41791234567',
      email: 'jean@example.com', statut: 0, allergies: '', notes: '',
      langue: 'fr', entreprise: '', tags: [], tablePref: '',
      createdAt: Date.now(), lastVisit: '2026-03-30', totalVisits: 1,
      totalCouverts: 2, totalNoshows: 0, blacklisted: false, blacklistReason: ''
    }
    useAppStore.getState().addClient(client)
    expect(useAppStore.getState().clients).toHaveLength(1)
    expect(useAppStore.getState().clients[0].id).toBe('c1')
  })

  it('updateClient: partial update', () => {
    const client: Client = {
      id: 'c1', nom: 'Dupont', prenom: 'Jean', tel: '+41791234567',
      email: 'jean@example.com', statut: 0, allergies: '', notes: '',
      langue: 'fr', entreprise: '', tags: [], tablePref: '',
      createdAt: Date.now(), lastVisit: '2026-03-30', totalVisits: 1,
      totalCouverts: 2, totalNoshows: 0, blacklisted: false, blacklistReason: ''
    }
    useAppStore.getState().addClient(client)
    useAppStore.getState().updateClient('c1', { statut: 2, notes: 'VIP client' })
    const updated = useAppStore.getState().clients[0]
    expect(updated.statut).toBe(2)
    expect(updated.notes).toBe('VIP client')
    expect(updated.nom).toBe('Dupont')
  })

  it('deleteClient: removes from array', () => {
    const client: Client = {
      id: 'c1', nom: 'Dupont', prenom: 'Jean', tel: '+41791234567',
      email: 'jean@example.com', statut: 0, allergies: '', notes: '',
      langue: 'fr', entreprise: '', tags: [], tablePref: '',
      createdAt: Date.now(), lastVisit: '2026-03-30', totalVisits: 1,
      totalCouverts: 2, totalNoshows: 0, blacklisted: false, blacklistReason: ''
    }
    useAppStore.getState().addClient(client)
    useAppStore.getState().deleteClient('c1')
    expect(useAppStore.getState().clients).toHaveLength(0)
  })
})

describe('Store — Configuration', () => {
  beforeEach(() => {
    useAppStore.setState({
      tables: [],
      combos: [],
      services: [],
      salles: []
    })
  })

  it('setTables: replaces tables array', () => {
    const tables: Table[] = [
      {
        id: 't1', n: 'T1', salle: 'salle-principale', shape: 'round',
        capMin: 2, capMax: 4, x: 10, y: 20, w: 5, h: 5,
        active: true, priority: 1, blocked: false, held: false
      }
    ]
    useAppStore.getState().setTables(tables)
    expect(useAppStore.getState().tables).toHaveLength(1)
    expect(useAppStore.getState().tables[0].n).toBe('T1')
  })

  it('setServices: replaces services array', () => {
    const services: Service[] = [
      {
        id: 'sv1', name: 'midi', icon: '☀️',
        open: '12:00', close: '14:30', lastOrder: '13:45',
        buffer: 15, bookingCutoffMins: 0, active: true,
        color: '#4480d8', jours: [1,2,3,4,5,6,0],
        maxCouverts: 80, maxParService: 0
      }
    ]
    useAppStore.getState().setServices(services)
    expect(useAppStore.getState().services).toHaveLength(1)
  })

  it('setSalles: replaces salles array', () => {
    const salles: Salle[] = [
      { id: 'sa1', name: 'Salle principale', type: 'intérieure', exterior: false, active: true, openByDefault: true, color: '#4480d8', priority: 1 }
    ]
    useAppStore.getState().setSalles(salles)
    expect(useAppStore.getState().salles).toHaveLength(1)
  })

  it('updateOptions: partial update', () => {
    useAppStore.getState().updateOptions({ wifi: false, parking: true })
    const options = useAppStore.getState().options
    expect(options.wifi).toBe(false)
    expect(options.parking).toBe(true)
    expect(options.terrasse).toBe(true)
  })
})

describe('Store — UI State', () => {
  beforeEach(() => {
    useAppStore.setState({
      blinkResaIds: [],
      sidebarCollapsed: false,
      showQuickResa: true
    })
  })

  it('blinkResa: sets blinkResaIds', () => {
    useAppStore.getState().blinkResa('r1')
    expect(useAppStore.getState().blinkResaIds).toEqual(['r1'])
  })

  it('toggleSidebar: toggles collapsed state', () => {
    expect(useAppStore.getState().sidebarCollapsed).toBe(false)
    useAppStore.getState().toggleSidebar()
    expect(useAppStore.getState().sidebarCollapsed).toBe(true)
    useAppStore.getState().toggleSidebar()
    expect(useAppStore.getState().sidebarCollapsed).toBe(false)
  })

  it('toggleQuickResa: toggles quick resa visibility', () => {
    expect(useAppStore.getState().showQuickResa).toBe(true)
    useAppStore.getState().toggleQuickResa()
    expect(useAppStore.getState().showQuickResa).toBe(false)
  })
})

describe('Store — Helpers', () => {
  beforeEach(() => {
    useAppStore.setState({ resas: [] })
  })

  it('isDoubleBooked: detects occupied tables', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'reserved', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    useAppStore.getState().addResa(resa)
    expect(isDoubleBooked('T1', '2026-03-30', 'soir')).toBe(true)
  })

  it('isDoubleBooked: returns false for free tables', () => {
    expect(isDoubleBooked('T2', '2026-03-30', 'soir')).toBe(false)
  })

  it('isDoubleBooked: returns false for non-active reservations', () => {
    const resa: Resa = {
      id: 'r1', n: 'Dupont', nom: 'Dupont', prenom: 'Jean', c: 2,
      tbl: 'T1', t: '19h30', svc: 'soir', s: 'done', note: '',
      date: '2026-03-30', createdAt: Date.now(), statut: 0, mode: 'manuel',
      tel: '+41791234567', email: 'jean@example.com', canal: 'telephone',
      prisPar: 'user1', bebe: 0, pmr: 0, allergie: false
    }
    useAppStore.getState().addResa(resa)
    expect(isDoubleBooked('T1', '2026-03-30', 'soir')).toBe(false)
  })

  it('isValidTransition: reserved→arrived is valid', () => {
    expect(isValidTransition('reserved', 'arrived')).toBe(true)
  })

  it('isValidTransition: done→arrived is invalid', () => {
    expect(isValidTransition('done', 'arrived')).toBe(false)
  })

  it('isValidTransition: waitlist→reserved is valid', () => {
    expect(isValidTransition('waitlist', 'reserved')).toBe(true)
  })

  it('isValidTransition: arrived→noshow is valid', () => {
    expect(isValidTransition('arrived', 'noshow')).toBe(true)
  })

  it('isValidTransition: noshow→reserved is valid', () => {
    expect(isValidTransition('noshow', 'reserved')).toBe(true)
  })
})
