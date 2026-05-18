#!/usr/bin/env python3
"""Inject Navy Bright palette override on b2c sites without breaking layout."""
import os
import re

WORK = '/Users/DBo_3/Dev/R3STO/_session-fetch-2026-05-17'
NAVY_BRIGHT_OVERLAY = '''
/* ── R3STO Navy Bright PALETTE OVERLAY (injected 2026-05-17) ── */
:root {
  --bg:#eef3fa; --bg-r:#eef3fa;
  --surf:#ffffff;
  --surf2:#e1e9f4; --surf-2:#e1e9f4;
  --text:#0f1a30;
  --t2:#475a78; --t-2:#475a78;
  --t3:#7a8aa3; --t-3:#7a8aa3;
  --brd:#dde4ee; --border:#dde4ee;
  --navy:#1c2e58; --navy-dark:#142447;
  --bl:#1c2e58;
  --gn:#0a9c6e;
  --rd:#dc2626;
  --am:#b08a18;
  --gold:#a07e2a; --gold-bright:#7d6220;
}
body { background: #eef3fa !important; color: #0f1a30 !important; font-family: 'DM Sans', -apple-system, system-ui, sans-serif !important; }
.btn-pay, .btn-primary, button[type="submit"], .cta { background: #1c2e58 !important; color: #fff !important; }
.btn-pay:hover, .btn-primary:hover, button[type="submit"]:hover { background: #142447 !important; }
a { color: #a07e2a; }
a:hover { color: #7d6220; }
'''

THEME_COLOR_TAG = '<meta name="theme-color" content="#1c2e58">'

SITES = ['bill', 'booking', 'menu', 'delivery']

for site in SITES:
    path = f'{WORK}/{site}.r3sto.ch/index.html'
    if not os.path.exists(path):
        print(f'❌ Missing: {path}')
        continue

    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()

    original_size = len(html)

    # 1) Inject palette overlay just before the LAST </style>
    last_style = html.rfind('</style>')
    if last_style > 0:
        html = html[:last_style] + NAVY_BRIGHT_OVERLAY + html[last_style:]
        print(f'✓ {site}: overlay injected at position {last_style}')
    else:
        print(f'⚠ {site}: no </style> found, skipping overlay')

    # 2) Update or add theme-color meta
    if 'name="theme-color"' in html:
        html = re.sub(
            r'<meta\s+name="theme-color"[^>]*>',
            THEME_COLOR_TAG,
            html,
        )
        print(f'✓ {site}: theme-color updated to #1c2e58')
    else:
        # Insert after charset
        html = re.sub(
            r'(<meta\s+charset[^>]*>)',
            r'\1\n' + THEME_COLOR_TAG,
            html,
            count=1,
        )
        print(f'✓ {site}: theme-color inserted')

    # 3) Add link to DM Sans / JetBrains Mono if not already
    if 'DM+Sans' not in html and 'DM Sans' not in html:
        font_link = '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">'
        html = re.sub(
            r'(<meta\s+charset[^>]*>)',
            r'\1\n' + font_link,
            html,
            count=1,
        )
        print(f'✓ {site}: DM Sans + JetBrains Mono ajoutées')

    new_size = len(html)
    print(f'  → {site}: {original_size} → {new_size} bytes (+{new_size - original_size})')

    # Save updated file
    out_path = f'{WORK}/{site}.r3sto.ch/index-navy-bright.html'
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'  Saved: {out_path}\n')

print('Done.')
