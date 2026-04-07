import { describe, it, expect } from 'vitest'
import type {
  Resa, Service, Salle, OptionsData, Table, Client, GiftCard,
  Review, LoyaltyCard, LoyaltyConfig, Site
} from '../types'

describe('Types — Service Interface', () => {
  it('Service type has all required fields', () => {
    const service: Service = {
      id: 'sv1',
      name: 'midi',
      icon: '☀️',
      open: '12:00',
      close: '14:30',
      lastOrder: '13:45',
      buffer: 15,
      bookingCutoffMins: 0,
      active: true,
      color: '#4480d8',
      jours: [1, 2, 3, 4, 5, 6, 0],
      maxCouverts: 80,
      maxParService: 0
    }

    expect(service.id).toBe('sv1')
    expect(service.name).toBe('midi')
    expect(service.open).toBe('12:00')
    expect(service.active).toBe(true)
    expect(service.maxCouverts).toBe(80)
  })

  it('Service jours array contains valid day numbers', () => {
    const service: Service = {
      id: 'sv1',
      name: 'midi',
      icon: '☀️',
      open: '12:00',
      close: '14:30',
      lastOrder: '13:45',
      buffer: 15,
      bookingCutoffMins: 0,
      active: true,
      color: '#4480d8',
      jours: [0, 1, 2, 3, 4, 5, 6],
      maxCouverts: 80,
      maxParService: 0
    }

    expect(service.jours).toHaveLength(7)
    expect(service.jours[0]).toBe(0)
    expect(service.jours[6]).toBe(6)
  })

  it('Service times are valid format (HH:MM)', () => {
    const service: Service = {
      id: 'sv1',
      name: 'soir',
      icon: '🌙',
      open: '19:00',
      close: '22:30',
      lastOrder: '21:30',
      buffer: 15,
      bookingCutoffMins: 0,
      active: true,
      color: '#7c3aed',
      jours: [1, 2, 3, 4, 5, 6, 0],
      maxCouverts: 80,
      maxParService: 0
    }

    const timeRegex = /^\d{2}:\d{2}$/
    expect(timeRegex.test(service.open)).toBe(true)
    expect(timeRegex.test(service.close)).toBe(true)
    expect(timeRegex.test(service.lastOrder)).toBe(true)
  })
})

describe('Types — Salle Interface', () => {
  it('Salle type has all required fields', () => {
    const salle: Salle = {
      id: 'sa1',
      name: 'Salle principale',
      type: 'intérieure',
      exterior: false,
      active: true,
      openByDefault: true,
      color: '#4480d8',
      priority: 1
    }

    expect(salle.id).toBe('sa1')
    expect(salle.name).toBe('Salle principale')
    expect(salle.type).toBe('intérieure')
    expect(salle.active).toBe(true)
  })

  it('Salle types are valid', () => {
    const validTypes = ['intérieure', 'extérieure', 'privée', 'bar']

    for (const type of validTypes) {
      const salle: Salle = {
        id: 's1',
        name: 'Test',
        type: type as 'intérieure' | 'extérieure' | 'privée' | 'bar',
        exterior: type === 'extérieure',
        active: true,
        openByDefault: true,
        color: '#000000',
        priority: 1
      }
      expect(['intérieure', 'extérieure', 'privée', 'bar']).toContain(salle.type)
    }
  })

  it('Salle exterior flag matches type', () => {
    const exterieureSalle: Salle = {
      id: 'sa2',
      name: 'Terrasse',
      type: 'extérieure',
      exterior: true,
      active: true,
      openByDefault: true,
      color: '#38b090',
      priority: 2
    }

    expect(exterieureSalle.exterior).toBe(true)
  })
})

describe('Types — OptionsData Interface', () => {
  it('OptionsData has all required configuration fields', () => {
    const options: OptionsData = {
      wifi: true,
      wifi_payant: false,
      parking: false,
      parking_valet: false,
      terrasse: true,
      accessible: true,
      animaux: false,
      animaux_terrasse_only: true,
      reservation_min: 1,
      reservation_max: 20,
      annulation_h: 24,
      allow_past_booking: false,
      booking_horizon_days: 90,
      slot_interval_mins: 15,
      default_duration_mins: 90,
      require_phone: false,
      allow_walkin: true,
      dispersion_mode: 'ia',
      dispersion_interval: 15,
      dispersion_max_per_slot: 3,
      groupe_seuil: 8,
      groupe_max_par_service: 2,
      notif_new_resa: true,
      notif_new_hours: 3,
      auto_confirm: false,
      auto_remind_24h: true,
      auto_noshow_flag: true,
      chaises_bebe: 4,
      places_pmr: 2
    }

    expect(options.wifi).toBe(true)
    expect(options.parking).toBe(false)
    expect(options.reservation_min).toBe(1)
    expect(options.reservation_max).toBe(20)
    expect(options.annulation_h).toBe(24)
  })

  it('OptionsData boolean fields are correctly typed', () => {
    const options: OptionsData = {
      wifi: true,
      wifi_payant: false,
      parking: false,
      parking_valet: false,
      terrasse: true,
      accessible: true,
      animaux: false,
      animaux_terrasse_only: true,
      reservation_min: 1,
      reservation_max: 20,
      annulation_h: 24,
      allow_past_booking: false,
      booking_horizon_days: 90,
      slot_interval_mins: 15,
      default_duration_mins: 90,
      require_phone: false,
      allow_walkin: true,
      dispersion_mode: 'manuel',
      dispersion_interval: 15,
      dispersion_max_per_slot: 3,
      groupe_seuil: 8,
      groupe_max_par_service: 2,
      notif_new_resa: true,
      notif_new_hours: 3,
      auto_confirm: false,
      auto_remind_24h: true,
      auto_noshow_flag: true,
      chaises_bebe: 4,
      places_pmr: 2
    }

    expect(typeof options.wifi).toBe('boolean')
    expect(typeof options.parking).toBe('boolean')
    expect(typeof options.reservation_min).toBe('number')
  })

  it('OptionsData dispersion_mode is valid', () => {
    const options1: OptionsData = {
      wifi: true,
      wifi_payant: false,
      parking: false,
      parking_valet: false,
      terrasse: true,
      accessible: true,
      animaux: false,
      animaux_terrasse_only: true,
      reservation_min: 1,
      reservation_max: 20,
      annulation_h: 24,
      allow_past_booking: false,
      booking_horizon_days: 90,
      slot_interval_mins: 15,
      default_duration_mins: 90,
      require_phone: false,
      allow_walkin: true,
      dispersion_mode: 'ia',
      dispersion_interval: 15,
      dispersion_max_per_slot: 3,
      groupe_seuil: 8,
      groupe_max_par_service: 2,
      notif_new_resa: true,
      notif_new_hours: 3,
      auto_confirm: false,
      auto_remind_24h: true,
      auto_noshow_flag: true,
      chaises_bebe: 4,
      places_pmr: 2
    }

    expect(['ia', 'manuel']).toContain(options1.dispersion_mode)
  })
})

describe('Types — Resa Interface', () => {
  it('Resa type has all required fields', () => {
    const resa: Resa = {
      id: 'r1',
      n: 'Dupont Jean',
      nom: 'Dupont',
      prenom: 'Jean',
      c: 2,
      tbl: 'T1',
      t: '19h30',
      svc: 'soir',
      s: 'reserved',
      note: 'Anniversaire',
      date: '2026-03-30',
      createdAt: Date.now(),
      statut: 2,
      mode: 'manuel',
      tel: '+41791234567',
      email: 'jean@example.com',
      canal: 'telephone',
      prisPar: 'user1',
      bebe: 0,
      pmr: 0,
      allergie: false
    }

    expect(resa.id).toBe('r1')
    expect(resa.nom).toBe('Dupont')
    expect(resa.c).toBe(2)
    expect(resa.s).toBe('reserved')
    expect(resa.statut).toBe(2)
  })

  it('Resa status values are valid', () => {
    const statuses = ['reserved', 'arrived', 'done', 'noshow', 'cancelled', 'waitlist']

    for (const status of statuses) {
      const resa: Resa = {
        id: 'r1',
        n: 'Test',
        nom: 'Test',
        prenom: 'User',
        c: 2,
        tbl: 'T1',
        t: '19h30',
        svc: 'soir',
        s: status as 'reserved' | 'arrived' | 'done' | 'noshow' | 'cancelled' | 'waitlist',
        note: '',
        date: '2026-03-30',
        createdAt: Date.now(),
        statut: 0,
        mode: 'manuel',
        tel: '',
        email: '',
        canal: 'telephone',
        prisPar: '',
        bebe: 0,
        pmr: 0,
        allergie: false
      }
      expect(['reserved', 'arrived', 'done', 'noshow', 'cancelled', 'waitlist']).toContain(resa.s)
    }
  })

  it('Resa date is ISO format YYYY-MM-DD', () => {
    const resa: Resa = {
      id: 'r1',
      n: 'Dupont Jean',
      nom: 'Dupont',
      prenom: 'Jean',
      c: 2,
      tbl: 'T1',
      t: '19h30',
      svc: 'soir',
      s: 'reserved',
      note: '',
      date: '2026-03-30',
      createdAt: Date.now(),
      statut: 0,
      mode: 'manuel',
      tel: '',
      email: '',
      canal: 'telephone',
      prisPar: '',
      bebe: 0,
      pmr: 0,
      allergie: false
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    expect(dateRegex.test(resa.date)).toBe(true)
  })

  it('Resa client statut values are valid (0-3)', () => {
    const validStatuts = [0, 1, 2, 3]

    for (const statut of validStatuts) {
      const resa: Resa = {
        id: 'r1',
        n: 'Test',
        nom: 'Test',
        prenom: 'User',
        c: 2,
        tbl: 'T1',
        t: '19h30',
        svc: 'soir',
        s: 'reserved',
        note: '',
        date: '2026-03-30',
        createdAt: Date.now(),
        statut: statut as 0 | 1 | 2 | 3,
        mode: 'manuel',
        tel: '',
        email: '',
        canal: 'telephone',
        prisPar: '',
        bebe: 0,
        pmr: 0,
        allergie: false
      }
      expect([0, 1, 2, 3]).toContain(resa.statut)
    }
  })

  it('Resa mode values are valid', () => {
    const modes = ['ia', 'manuel', 'web']

    for (const mode of modes) {
      const resa: Resa = {
        id: 'r1',
        n: 'Test',
        nom: 'Test',
        prenom: 'User',
        c: 2,
        tbl: 'T1',
        t: '19h30',
        svc: 'soir',
        s: 'reserved',
        note: '',
        date: '2026-03-30',
        createdAt: Date.now(),
        statut: 0,
        mode: mode as 'ia' | 'manuel' | 'web',
        tel: '',
        email: '',
        canal: 'telephone',
        prisPar: '',
        bebe: 0,
        pmr: 0,
        allergie: false
      }
      expect(['ia', 'manuel', 'web']).toContain(resa.mode)
    }
  })

  it('Resa canal values are valid', () => {
    const canals = ['telephone', 'walkin', 'widget', 'google', 'email', 'whatsapp', 'sms']

    for (const canal of canals) {
      const resa: Resa = {
        id: 'r1',
        n: 'Test',
        nom: 'Test',
        prenom: 'User',
        c: 2,
        tbl: 'T1',
        t: '19h30',
        svc: 'soir',
        s: 'reserved',
        note: '',
        date: '2026-03-30',
        createdAt: Date.now(),
        statut: 0,
        mode: 'manuel',
        tel: '',
        email: '',
        canal: canal as 'telephone' | 'walkin' | 'widget' | 'google' | 'email' | 'whatsapp' | 'sms',
        prisPar: '',
        bebe: 0,
        pmr: 0,
        allergie: false
      }
      expect(['telephone', 'walkin', 'widget', 'google', 'email', 'whatsapp', 'sms']).toContain(resa.canal)
    }
  })
})

describe('Types — Table Interface', () => {
  it('Table type has all required fields', () => {
    const table: Table = {
      id: 't1',
      n: 'T1',
      salle: 'Salle principale',
      shape: 'round',
      capMin: 2,
      capMax: 4,
      x: 10,
      y: 20,
      w: 5,
      h: 5,
      active: true,
      priority: 1,
      blocked: false,
      held: false
    }

    expect(table.id).toBe('t1')
    expect(table.n).toBe('T1')
    expect(table.capMin).toBe(2)
    expect(table.capMax).toBe(4)
    expect(table.active).toBe(true)
  })

  it('Table shape values are valid', () => {
    const shapes = ['round', 'round_sm', 'round_lg', 'rect', 'rect_lg', 'square', 'square_sm', 'oval', 'banquette', 'bar']

    for (const shape of shapes) {
      const table: Table = {
        id: 't1',
        n: 'T1',
        salle: 'Main',
        shape: shape as 'round' | 'round_sm' | 'round_lg' | 'rect' | 'rect_lg' | 'square' | 'square_sm' | 'oval' | 'banquette' | 'bar',
        capMin: 2,
        capMax: 4,
        x: 10,
        y: 20,
        w: 5,
        h: 5,
        active: true,
        priority: 1,
        blocked: false,
        held: false
      }
      expect(shapes).toContain(table.shape)
    }
  })

  it('Table capacity min <= max', () => {
    const table: Table = {
      id: 't1',
      n: 'T1',
      salle: 'Main',
      shape: 'round',
      capMin: 2,
      capMax: 4,
      x: 10,
      y: 20,
      w: 5,
      h: 5,
      active: true,
      priority: 1,
      blocked: false,
      held: false
    }

    expect(table.capMin).toBeLessThanOrEqual(table.capMax)
  })
})

describe('Types — Client Interface', () => {
  it('Client type has all required fields', () => {
    const client: Client = {
      id: 'c1',
      nom: 'Dupont',
      prenom: 'Jean',
      tel: '+41791234567',
      email: 'jean@example.com',
      statut: 2,
      allergies: 'Arachides, Gluten',
      notes: 'Préfère la terrasse',
      langue: 'fr',
      entreprise: 'Acme Inc',
      tags: ['terrasse', 'vin-rouge'],
      tablePref: 'T5',
      createdAt: Date.now(),
      lastVisit: '2026-03-30',
      totalVisits: 5,
      totalCouverts: 12,
      totalNoshows: 0,
      blacklisted: false,
      blacklistReason: ''
    }

    expect(client.id).toBe('c1')
    expect(client.nom).toBe('Dupont')
    expect(client.statut).toBe(2)
    expect(client.totalVisits).toBe(5)
  })

  it('Client language values are valid', () => {
    const langs = ['fr', 'en', 'de', 'it']

    for (const lang of langs) {
      const client: Client = {
        id: 'c1',
        nom: 'Test',
        prenom: 'User',
        tel: '',
        email: '',
        statut: 0,
        allergies: '',
        notes: '',
        langue: lang,
        entreprise: '',
        tags: [],
        tablePref: '',
        createdAt: Date.now(),
        lastVisit: '2026-03-30',
        totalVisits: 0,
        totalCouverts: 0,
        totalNoshows: 0,
        blacklisted: false,
        blacklistReason: ''
      }
      expect(['fr', 'en', 'de', 'it']).toContain(client.langue)
    }
  })
})

describe('Types — GiftCard Interface', () => {
  it('GiftCard type has all required fields', () => {
    const gc: GiftCard = {
      id: 'gc1',
      code: 'GC-A7X2-K9M4',
      amount: 100,
      balance: 45.50,
      currency: 'CHF',
      status: 'partial',
      buyerName: 'Alice',
      buyerEmail: 'alice@example.com',
      buyerTel: '+41791111111',
      recipientName: 'Bob',
      recipientEmail: 'bob@example.com',
      message: 'Bon anniversaire!',
      createdAt: Date.now(),
      expiresAt: '2027-03-30',
      usedAt: '2026-03-28',
      usedResaId: 'r123',
      source: 'online'
    }

    expect(gc.id).toBe('gc1')
    expect(gc.code).toBe('GC-A7X2-K9M4')
    expect(gc.amount).toBe(100)
    expect(gc.status).toBe('partial')
  })

  it('GiftCard status values are valid', () => {
    const statuses = ['active', 'partial', 'used', 'expired', 'cancelled']

    for (const status of statuses) {
      const gc: GiftCard = {
        id: 'gc1',
        code: 'TEST-1234',
        amount: 100,
        balance: 50,
        currency: 'CHF',
        status: status as 'active' | 'partial' | 'used' | 'expired' | 'cancelled',
        buyerName: 'Test',
        buyerEmail: '',
        buyerTel: '',
        recipientName: 'User',
        recipientEmail: '',
        message: '',
        createdAt: Date.now(),
        expiresAt: '2027-03-30',
        source: 'admin'
      }
      expect(['active', 'partial', 'used', 'expired', 'cancelled']).toContain(gc.status)
    }
  })
})

describe('Types — Review Interface', () => {
  it('Review type has all required fields', () => {
    const review: Review = {
      id: 'rev1',
      resaId: 'r1',
      clientId: 'c1',
      clientName: 'Dupont',
      clientEmail: 'jean@example.com',
      date: '2026-03-30',
      createdAt: Date.now(),
      rating: 5,
      comment: 'Excellent service!',
      service: 'soir',
      source: 'google',
      reply: 'Merci beaucoup!',
      repliedAt: Date.now(),
      visible: true,
      flagged: false
    }

    expect(review.id).toBe('rev1')
    expect(review.rating).toBe(5)
    expect(review.source).toBe('google')
    expect(review.visible).toBe(true)
  })

  it('Review rating values are valid (1-5)', () => {
    const ratings = [1, 2, 3, 4, 5]

    for (const rating of ratings) {
      const review: Review = {
        id: 'rev1',
        clientName: 'Test',
        clientEmail: '',
        date: '2026-03-30',
        createdAt: Date.now(),
        rating: rating as 1 | 2 | 3 | 4 | 5,
        comment: '',
        service: '',
        source: 'internal',
        visible: true,
        flagged: false
      }
      expect([1, 2, 3, 4, 5]).toContain(review.rating)
    }
  })
})

describe('Types — LoyaltyCard Interface', () => {
  it('LoyaltyCard type has all required fields', () => {
    const card: LoyaltyCard = {
      id: 'lc1',
      clientId: 'c1',
      clientName: 'Dupont',
      clientEmail: 'jean@example.com',
      points: 150,
      stamps: 5,
      cashbackBalance: 25.50,
      totalEarned: 200,
      rewardsUsed: 2,
      joinedAt: Date.now(),
      lastActivity: '2026-03-30',
      history: []
    }

    expect(card.id).toBe('lc1')
    expect(card.clientId).toBe('c1')
    expect(card.points).toBe(150)
    expect(card.stamps).toBe(5)
  })
})

describe('Types — LoyaltyConfig Interface', () => {
  it('LoyaltyConfig type has all required fields', () => {
    const config: LoyaltyConfig = {
      active: true,
      mode: 'points',
      pointsPerChf: 1,
      stampsGoal: 10,
      cashbackPercent: 5,
      rewardName: 'Dessert offert',
      rewardValue: 15,
      rewardThreshold: 10,
      welcomeBonus: 1,
      birthdayBonus: 2,
      expirationMonths: 12,
      doublePointsDays: [0, 6]
    }

    expect(config.active).toBe(true)
    expect(config.mode).toBe('points')
    expect(config.pointsPerChf).toBe(1)
  })

  it('LoyaltyConfig mode values are valid', () => {
    const modes = ['points', 'stamps', 'cashback']

    for (const mode of modes) {
      const config: LoyaltyConfig = {
        active: true,
        mode: mode as 'points' | 'stamps' | 'cashback',
        pointsPerChf: 1,
        stampsGoal: 10,
        cashbackPercent: 5,
        rewardName: '',
        rewardValue: 0,
        rewardThreshold: 0,
        welcomeBonus: 0,
        birthdayBonus: 0,
        expirationMonths: 12,
        doublePointsDays: []
      }
      expect(['points', 'stamps', 'cashback']).toContain(config.mode)
    }
  })
})

describe('Types — Site Interface', () => {
  it('Site type has all required fields', () => {
    const site: Site = {
      id: 's1',
      name: 'Le Bistro de Sion',
      ville: 'Sion',
      adresse: 'Rue de la Paix 5',
      tel: '+41279861234',
      email: 'info@bistro-sion.ch',
      web: 'www.bistro-sion.ch',
      active: true,
      color: '#4480d8',
      plan: 'bistro',
      maxCvt: 50,
      createdAt: Date.now(),
      acceptRedirect: true,
      redirectPriority: 1,
      redirectMsg: 'Bienvenue'
    }

    expect(site.id).toBe('s1')
    expect(site.name).toBe('Le Bistro de Sion')
    expect(site.plan).toBe('bistro')
    expect(site.maxCvt).toBe(50)
  })

  it('Site plan values are valid', () => {
    const plans = ['bistro', 'resto', 'gastro']

    for (const plan of plans) {
      const site: Site = {
        id: 's1',
        name: 'Test',
        ville: '',
        adresse: '',
        tel: '',
        email: '',
        web: '',
        active: true,
        color: '#000000',
        plan: plan as 'bistro' | 'resto' | 'gastro',
        maxCvt: 30,
        createdAt: Date.now()
      }
      expect(['bistro', 'resto', 'gastro']).toContain(site.plan)
    }
  })
})
