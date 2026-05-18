#!/usr/bin/env python3
"""Update auth/app/admin/demo SPA loaders with brand-aligned meta tags."""
import os, re

WORK = '/Users/DBo_3/Dev/R3STO/_session-fetch-2026-05-17'

LOADERS = {
    'auth': {
        'title': 'R3STO Auth — Connexion / Création de compte',
        'desc': 'Connexion sécurisée à votre espace R3STO. Plateforme suisse de gestion restaurant.',
    },
    'app': {
        'title': 'R3STO App — Tableau de bord restaurant',
        'desc': 'L\'application R3STO : réservations, plan de salle, CRM, paiements. Hébergée en Suisse.',
    },
    'admin': {
        'title': 'R3STO Admin — Back-office',
        'desc': 'Back-office R3STO réservé aux équipes administratives.',
    },
    'demo': {
        'title': 'R3STO Demo — Tester la plateforme',
        'desc': 'Découvrez R3STO en mode démo avant inscription. Sans engagement.',
    },
}

for site, meta in LOADERS.items():
    path = f'{WORK}/{site}.r3sto.ch/index.html'
    if not os.path.exists(path):
        print(f'❌ Missing: {path}')
        continue

    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()

    # 1) Update theme-color : navy R3STO #1c2e58
    html = re.sub(
        r'<meta\s+name="theme-color"\s+content="[^"]*"\s*/?>',
        '<meta name="theme-color" content="#1c2e58" />',
        html,
    )

    # 2) Update title
    html = re.sub(
        r'<title>[^<]*</title>',
        f'<title>{meta["title"]}</title>',
        html,
    )

    # 3) Update description
    html = re.sub(
        r'<meta\s+name="description"\s+content="[^"]*"\s*/?>',
        f'<meta name="description" content="{meta["desc"]}" />',
        html,
    )

    # 4) Add OG tags if missing
    if 'property="og:title"' not in html:
        og_block = (
            f'<meta property="og:title" content="{meta["title"]}" />\n'
            f'    <meta property="og:description" content="{meta["desc"]}" />\n'
            f'    <meta property="og:type" content="website" />\n'
            f'    <meta property="og:url" content="https://{site}.r3sto.ch" />\n'
            f'    <meta property="og:locale" content="fr_CH" />'
        )
        html = re.sub(
            r'(<title>[^<]*</title>)',
            r'\1\n    ' + og_block,
            html,
        )

    out = f'{WORK}/{site}.r3sto.ch/index-brand.html'
    with open(out, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'✓ {site}: title="{meta["title"]}", theme=#1c2e58, OG ajoutés')

print('\nDone.')
