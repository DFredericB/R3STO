// ══════════════════════════════════════════════════
//  R3STO — App.tsx
//  Point d'entrée React — routing et layout global
// ══════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store/useAppStore'
import { Header } from './components/layout/Header'
import { Sidebar } from './components/layout/Sidebar'
import { BottomNav } from './components/layout/BottomNav'
import { ToastProvider } from './components/ui/Toast'
import { DemoShowcaseBar } from './components/ui/DemoShowcaseBar'
import { Dashboard } from './views/Dashboard/Dashboard'
import { Grille } from './views/Grille/Grille'
import { Resas } from './views/Resas/Resas'
import { Waitlist } from './views/Waitlist/Waitlist'
import { Groupes } from './views/Groupes/Groupes'
import { Marketing } from './views/Marketing/Marketing'
import { Blacklist } from './views/Blacklist/Blacklist'
import { Clients } from './views/Clients/Clients'
import { Widget } from './views/Widget/Widget'
import { QRCode } from './views/QRCode/QRCode'
import { Prepaiement } from './views/Prepaiement/Prepaiement'
import { Profil } from './views/Profil/Profil'
import { Salles } from './views/Salles/Salles'
import { Fermetures } from './views/Fermetures/Fermetures'
import { TablesSetup } from './views/SetupPlan/TablesSetup'
import { Options } from './views/Options/Options'
import { AccesRoles } from './views/AccesRoles/AccesRoles'
import { Historique } from './views/Historique/Historique'
import { Support } from './views/Support/Support'
import { AdminTickets } from './views/Support/AdminTickets'
import { Menu } from './views/Menu/Menu'
import { Commandes } from './views/Commandes/Commandes'
import { KDSCuisine } from './views/KDS/KDSCuisine'
import { KDSBar } from './views/KDS/KDSBar'
import { ServiceView } from './views/Service/ServiceView'
import { CaisseView } from './views/Caisse/CaisseView'
// SetupPlan is now embedded inside TablesSetup
import { Plan } from './views/Plan/Plan'
import { Cadeaux } from './views/Cadeaux/Cadeaux'
import { Avis } from './views/Avis/Avis'
import { Fidelite } from './views/Fidelite/Fidelite'
import { MultiSite } from './views/MultiSite/MultiSite'
import { NouvelleResa } from './views/NouvelleResa/NouvelleResa'
import { Agenda } from './views/Agenda/Agenda'
import { Onboarding } from './views/Onboarding/Onboarding'
import { SiteVitrine } from './views/SiteVitrine/SiteVitrine'
import { Modules } from './views/Modules/Modules'
import { Marketplace } from './views/Marketplace/Marketplace'
import { AdminMarketplace } from './views/Marketplace/AdminMarketplace'
import { DeliveryDashboard } from './views/Delivery/DeliveryDashboard'
import { DeliveryOrders } from './views/Delivery/DeliveryOrders'
import { DeliveryTracking } from './views/Delivery/DeliveryTracking'
import { DeliveryZones } from './views/Delivery/DeliveryZones'
import { CRM } from './views/CRM/CRM'
import { Newsletter } from './views/Newsletter/Newsletter'
import { Audit } from './views/Audit/Audit'
import { Alertes } from './views/Alertes/Alertes'
import { AdminDashboard } from './views/Admin/AdminDashboard'
import { Equipes } from './views/Admin/Equipes'
import { Finance } from './views/Admin/Finance'
import { Plateforme } from './views/Admin/Plateforme'
import { DataIntelligence } from './views/Admin/DataIntelligence'
import { PricingStrategy } from './views/Admin/PricingStrategy'
import { loadDemoFallback } from './utils/demoData'
import { useAuth } from './auth/useAuth'
import { useApiSync } from './hooks/useApiSync'
import { Login } from './views/Auth/Login'
import './styles/global.css'

export default function App() {
  const { tables, theme } = useAppStore()
  const { user } = useAuth()
  const { status: syncStatus } = useApiSync()

  // ── Chargement démo SYNCHRONE (avant le premier rendu visible) ──
  // Sur demo.r3sto.ch : charger les données démo immédiatement
  // Sur app.r3sto.ch : purger les données démo résiduelles
  useState(() => {
    const isDemoHost = window.location.hostname.startsWith('demo.')
    if (!isDemoHost) {
      // Purge résidus démo sur prod
      const store = useAppStore.getState() as any
      if ((store._demoVersion ?? 0) > 0 && store.resas?.length > 0) {
        try { localStorage.removeItem('r3sto-app-data') } catch (_) {}
        window.location.reload()
      }
      return true
    }
    // Demo : RESET COMPLET à chaque démarrage
    // Vider localStorage → charger données fraîches du Comptoir du Lac
    try { localStorage.removeItem('r3sto-app-data') } catch (_) {}
    const demoData = loadDemoFallback() as any
    useAppStore.getState().loadDemoData(demoData)
    return true
  })

  // Appliquer thème au montage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const isDemo = window.location.hostname.startsWith('demo.')
  const isAdmin = window.location.hostname.startsWith('admin.')

  // ── Auto-login via token URL (admin → demo) ─────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token && !user) {
      // Stocker le token et charger l'utilisateur
      const store = localStorage
      store.setItem('r3sto-token', token)
      // Valider le token côté API
      const api = (import.meta as any).env?.VITE_API_BASE || 'https://api.r3sto.ch/api'
      fetch(`${api}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (data.ok && data.user) {
            store.setItem('r3sto-user', JSON.stringify(data.user))
            // Nettoyer l'URL et recharger
            window.history.replaceState({}, '', window.location.pathname)
            window.location.reload()
          }
        })
        .catch(() => {})
    }
  }, [])

  // ── Gate d'authentification (inline) ─────────────────────────
  // Demo : bypass total — pas de login requis
  if (!user && isDemo) {
    const demoUser = { id: 0, email: 'demo@r3sto.ch', name: 'Demo R3STO', role: 'superadmin', plan: 'gastro' }
    localStorage.setItem('r3sto-user', JSON.stringify(demoUser))
    localStorage.setItem('r3sto-token', 'demo-token')
    window.location.reload()
    return null
  }
  if (!user && !isDemo) {
    return <Login />
  }

  // ── Gate de setup : onboarding tant que config min absente ──
  // Demo = pas d'onboarding, données chargées automatiquement
  // Admin = pas d'onboarding, accès direct au panel
  if (!isDemo && !isAdmin && tables.length === 0) {
    return <Onboarding />
  }

  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="app-layout">
          {isDemo && <DemoShowcaseBar />}
          <Header />
          <div className="app-body">
            <Sidebar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Navigate to={isAdmin ? '/admin-dashboard' : '/dashboard'} replace />} />
                {/* OPÉRATIONS */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/reservations" element={<Resas />} />
                <Route path="/grille" element={<Grille />} />
                <Route path="/plan" element={<Plan />} />
                <Route path="/nouvelle-resa" element={<NouvelleResa />} />
                <Route path="/waitlist" element={<Waitlist />} />
                <Route path="/groupes" element={<Groupes />} />
                {/* CLIENTS & MARKETING */}
                <Route path="/clients" element={<Clients />} />
                <Route path="/marketing" element={<Marketing />} />
                <Route path="/blacklist" element={<Blacklist />} />
                <Route path="/avis" element={<Avis />} />
                <Route path="/fidelite" element={<Fidelite />} />
                {/* CANAUX & REVENUS */}
                <Route path="/widget" element={<Widget />} />
                <Route path="/qrcode" element={<QRCode />} />
                <Route path="/menu" element={<Menu />} />
                <Route path="/commandes" element={<Commandes />} />
                <Route path="/prepaiement" element={<Prepaiement />} />
                <Route path="/cadeaux" element={<Cadeaux />} />
                <Route path="/site-vitrine" element={<SiteVitrine />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/modules" element={<Modules />} />
                {/* R3STO DELIVERY */}
                <Route path="/delivery" element={<DeliveryDashboard />} />
                <Route path="/delivery-orders" element={<DeliveryOrders />} />
                <Route path="/delivery-tracking" element={<DeliveryTracking />} />
                <Route path="/delivery-zones" element={<DeliveryZones />} />
                {/* R3STO ORDER (BÊTA) */}
                <Route path="/kds-cuisine" element={<KDSCuisine />} />
                <Route path="/kds-bar" element={<KDSBar />} />
                <Route path="/service" element={<ServiceView />} />
                <Route path="/caisse" element={<CaisseView />} />
                {/* CONFIGURATION */}
                <Route path="/profil" element={<Profil />} />
                <Route path="/salles" element={<Salles />} />
                <Route path="/fermetures" element={<Fermetures />} />
                <Route path="/setup-plan" element={<TablesSetup />} />
                <Route path="/tables" element={<TablesSetup />} />
                <Route path="/options" element={<Options />} />
                <Route path="/multisite" element={<MultiSite />} />
                {/* CRM & NEWSLETTER R3STO */}
                <Route path="/crm" element={<CRM />} />
                <Route path="/newsletter" element={<Newsletter />} />
                {/* ADMIN MARKETPLACE */}
                <Route path="/admin-marketplace" element={<AdminMarketplace />} />
                {/* ADMIN ERP */}
                <Route path="/admin-dashboard" element={<AdminDashboard />} />
                <Route path="/equipes" element={<Equipes />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/plateforme" element={<Plateforme />} />
                <Route path="/data-intelligence" element={<DataIntelligence />} />
                <Route path="/pricing-strategy" element={<PricingStrategy />} />
                {/* ADMINISTRATION */}
                <Route path="/acces-roles" element={<AccesRoles />} />
                <Route path="/historique" element={<Historique />} />
                <Route path="/support" element={<Support />} />
                <Route path="/admin-tickets" element={<AdminTickets />} />
                <Route path="/audit" element={<Audit />} />
                <Route path="/alertes" element={<Alertes />} />
                {/* Fallback */}
                <Route path="*" element={
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)' }}>
                    Page introuvable — 404
                  </div>
                } />
              </Routes>
            </main>
          </div>
          <BottomNav />
        </div>
      </ToastProvider>
    </BrowserRouter>
  )
}
