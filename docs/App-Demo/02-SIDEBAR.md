# Sidebar (Menu lateral) - app.r3sto.ch / demo.r3sto.ch

Fichier : src/components/layout/Sidebar.tsx

## Structure du menu (7 groupes)

### 1. RESERVATIONS
| Route | Vue | Icone | Badge |
|-------|-----|-------|-------|
| /dashboard | Dashboard | tableau de bord | - |
| /agenda | Agenda (timeline) | calendrier | - |
| /reservations | Journal des resas | liste | compteur resas du jour |
| /grille | Grille (par table) | grille | - |
| /plan | Plan de salle | plan | - |
| /nouvelle-resa | Nouvelle resa | + | - |
| /waitlist | Liste d'attente | horloge | compteur waitlist |
| /groupes | Demandes groupes | personnes | compteur pending |

### 2. CLIENTS
| Route | Vue | Badge |
|-------|-----|-------|
| /clients | CRM Clients | - |
| /marketing | Marketing & Campagnes | - |
| /blacklist | Clients bloques | - |
| /avis | Avis & Reviews | - |
| /fidelite | Programme fidelite | - |

### 3. CANAUX & REVENUS
| Route | Vue |
|-------|-----|
| /widget | Widget reservation |
| /qrcode | QR Codes |
| /menu | Menu digital |
| /commandes | Commandes |
| /prepaiement | Prepaiement |
| /cadeaux | Bons cadeaux |
| /site-vitrine | Site vitrine |
| /marketplace | Marketplace |
| /modules | Modules |

### 4. R3STO ORDER (beta)
| Route | Vue |
|-------|-----|
| /kds-cuisine | KDS Cuisine |
| /kds-bar | KDS Bar |
| /service | Service (serveur) |
| /caisse | Caisse |

### 5. R3STO DELIVERY
| Route | Vue |
|-------|-----|
| /delivery | Dashboard livraison |
| /delivery-orders | Commandes livraison |
| /delivery-tracking | Suivi en direct |
| /delivery-zones | Zones de livraison |

### 6. R3STO CRM (visible admin uniquement)
| Route | Vue |
|-------|-----|
| /crm | Prospects / Contacts |
| /newsletter | Newsletter |

### 7. ADMIN ERP (visible admin uniquement)
| Route | Vue |
|-------|-----|
| /admin-dashboard | Dashboard admin |
| /equipes | Gestion equipes |
| /finance | Finance & Compta |
| /plateforme | Monitoring plateforme |

### 8. CONFIGURATION
| Route | Vue |
|-------|-----|
| /profil | Mon restaurant |
| /salles | Salles & Services |
| /tables | Editeur de tables |
| /options | Parametres |
| /multisite | Multi-site |
| /acces-roles | Acces & Roles |
| /fermetures | Fermetures |

### 9. ADMINISTRATION
| Route | Vue |
|-------|-----|
| /historique | Historique |
| /support | Support |
| /admin-tickets | Tickets (admin) |
| /audit | Audit |
| /alertes | Alertes |

## Comportement
- Mode collapse : 56px largeur, icones seules
- Badges temps reel depuis le store (resas, waitlist, groupes pending)
- Card plan en bas (Bistro/Resto/Gastro)
- Detection auto demo/admin via hostname
