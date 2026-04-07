# R3STO Website Generator - Usage Examples

Quick reference for generating restaurant websites.

## Generate a Demo Website

```bash
cd /sessions/busy-gifted-ride/mnt/Desktop--R3STO/site-vitrine

# Generate Le Gourmet (French)
node generator.js demo-configs/legourmet.json legourmet.html

# Generate L'Alpage (Swiss)
node generator.js demo-configs/lalpage.json lalpage.html

# Generate Sakura Zen (Japanese)
node generator.js demo-configs/sakura-zen.json sakura-zen.html
```

## Create a New Restaurant Website

### Step 1: Prepare Your Data

Gather the following information about the restaurant:

- Restaurant name
- Cuisine type
- Tagline/slogan
- Full description (2-3 sentences)
- Primary color (hex, e.g., #FF6B6B)
- Phone number
- Email address
- Street address and city
- Website URL (if exists)
- Opening hours (lunch/dinner times or closed)
- Menu items (name, price in CHF, description)
- Customer reviews (name, rating 1-5, text, date)
- Social media links (Instagram, Facebook)
- R3STO booking URL

### Step 2: Create Configuration File

Create a file `my-restaurant.json`:

```json
{
  "name": "Chez Marcel",
  "slug": "chez-marcel",
  "tagline": "Cuisine italiana authentique depuis 1995",
  "cuisine": "Italienne",
  "description": "Chez Marcel, c'est la tradition italienne à chaque assiette. Nos pâtes sont faites maison quotidiennement. Venez savourer l'Italie dans une ambiance conviviale et chaleureuse.",
  "primaryColor": "#DC143C",
  "theme": "light",
  "phone": "+41 44 123 45 67",
  "email": "info@chezmarcel.ch",
  "address": "Via Roma 15, 8000 Zurich",
  "website": "https://chezmarcel.ch",
  "hours": [
    { "day": "Lundi", "status": "Fermé" },
    { "day": "Mardi – Jeudi", "lunch": "12:00 – 14:00", "dinner": "18:00 – 22:00" },
    { "day": "Vendredi – Samedi", "lunch": "12:00 – 14:00", "dinner": "18:00 – 23:00" },
    { "day": "Dimanche", "lunch": "12:00 – 14:00", "dinner": "18:00 – 22:00" }
  ],
  "menu": [
    {
      "category": "Pâtes",
      "items": [
        {
          "name": "Spaghetti Carbonara",
          "price": 22,
          "desc": "Lard, œuf, Pecorino et poivre noir"
        },
        {
          "name": "Risotto ai Funghi",
          "price": 24,
          "desc": "Riz arborio, cèpes frais, parmesan"
        },
        {
          "name": "Tagliatelle à la Bolognaise",
          "price": 23,
          "desc": "Sauce riche et slow-cooked, parmesan râpé"
        }
      ]
    },
    {
      "category": "Pizza",
      "items": [
        {
          "name": "Margherita",
          "price": 18,
          "desc": "Tomate, mozzarella di bufala, basilic frais"
        },
        {
          "name": "Pizza al Funghi",
          "price": 20,
          "desc": "Champignons grillés, mozzarella, ail"
        }
      ]
    },
    {
      "category": "Desserts",
      "items": [
        {
          "name": "Tiramisu Traditionnel",
          "price": 12,
          "desc": "Mascarpone, café, cacao - recette nonna"
        },
        {
          "name": "Panna Cotta",
          "price": 10,
          "desc": "Vanille de Tahiti, coulis de fraise"
        }
      ]
    }
  ],
  "reviews": [
    {
      "name": "Roberto M.",
      "rating": 5,
      "text": "Authentique! C'est comme manger à Naples. Le chef est vrai italien!",
      "date": "2026-03-20"
    },
    {
      "name": "Lisa S.",
      "rating": 5,
      "text": "Meilleures pâtes fraîches en ville. Service attentionné et ambiance sympa.",
      "date": "2026-03-15"
    },
    {
      "name": "Jean L.",
      "rating": 4,
      "text": "Très bon restaurant. Pizza excellente, juste un peu long d'attente le samedi.",
      "date": "2026-03-10"
    }
  ],
  "bookingUrl": "https://booking.r3sto.ch/chez-marcel",
  "socialMedia": {
    "instagram": "https://instagram.com/chezmarcel.zurich",
    "facebook": "https://facebook.com/chezmarcel"
  }
}
```

### Step 3: Generate the Website

```bash
node generator.js my-restaurant.json chez-marcel.html
```

Output:
```
📖 Reading config: my-restaurant.json
🎨 Reading template: template.html
✍️  Writing output: chez-marcel.html

✅ Website generated successfully!
   Restaurant: Chez Marcel
   Slug: chez-marcel
   Output: chez-marcel.html
   File size: 44.12 KB
```

### Step 4: View and Deploy

Open `chez-marcel.html` in a browser to preview. Then upload to:

- Your web hosting provider
- AWS S3
- Netlify
- Vercel
- GitHub Pages
- FTP server

Point the restaurant's domain to the file and you're done!

## Batch Generation

Generate multiple websites at once:

```bash
#!/bin/bash

for config in demo-configs/*.json; do
  restaurant=$(basename $config .json)
  node generator.js $config "output/${restaurant}.html"
  echo "✓ Generated ${restaurant}"
done
```

Save as `generate-all.sh`, then:

```bash
chmod +x generate-all.sh
./generate-all.sh
```

## Customization Examples

### Change Primary Color

In your JSON config, change `primaryColor`:

```json
{
  "primaryColor": "#FF6B6B"  // Red
}
```

Other color examples:
- Gold: `#D4A574`
- Green: `#6B8E23`
- Blue: `#1E90FF`
- Purple: `#9370DB`
- Orange: `#FF8C00`

### Dark Mode by Default

Set theme to dark:

```json
{
  "theme": "dark"
}
```

Users can still toggle light/dark with the moon button.

### Add More Menu Categories

Add more items to the menu array:

```json
{
  "menu": [
    {
      "category": "Appetizers",
      "items": [...]
    },
    {
      "category": "Main Courses",
      "items": [...]
    },
    {
      "category": "Sides",
      "items": [...]
    },
    {
      "category": "Beverages",
      "items": [...]
    }
  ]
}
```

### Extended Hours

For restaurants open different hours each day:

```json
{
  "hours": [
    { "day": "Monday", "status": "Closed" },
    { "day": "Tuesday", "lunch": "11:30 – 14:00", "dinner": "17:00 – 22:00" },
    { "day": "Wednesday", "lunch": "11:30 – 14:00", "dinner": "17:00 – 22:00" },
    { "day": "Thursday", "lunch": "11:30 – 14:00", "dinner": "17:00 – 23:00" },
    { "day": "Friday", "lunch": "11:30 – 14:00", "dinner": "17:00 – 23:00" },
    { "day": "Saturday", "lunch": "12:00 – 15:00", "dinner": "17:00 – 23:00" },
    { "day": "Sunday", "lunch": "12:00 – 15:00", "dinner": "17:00 – 21:00" }
  ]
}
```

### Multiple Social Media Links

```json
{
  "socialMedia": {
    "instagram": "https://instagram.com/restaurant",
    "facebook": "https://facebook.com/restaurant"
  }
}
```

## Tips & Best Practices

### Writing Good Descriptions

Keep descriptions concise and appealing:

**Good:**
"Authentic Italian cuisine prepared by Chef Marco, trained in Rome. Fresh ingredients daily."

**Too long:**
"Our restaurant specializes in traditional Italian cuisine that has been passed down through generations in our family. We use only the freshest ingredients sourced from local suppliers whenever possible..."

### Pricing

Always use CHF (Swiss Francs). Format:
```json
{ "price": 24 }  // Displays as "CHF 24"
```

### Menu Item Descriptions

Keep descriptions short (one line max):
```json
{
  "name": "Carpaccio of Beef",
  "price": 22,
  "desc": "Capers, onion, Worcestershire sauce and aged parmesan"
}
```

### Review Dates

Use ISO format YYYY-MM-DD:
```json
{
  "date": "2026-03-20"  // March 20, 2026
}
```

Displays as: "20 mars 2026" (French locale)

### Images

Currently using emoji/gradient placeholders. To add real images:

1. In the generated HTML, find `.gallery-item` divs
2. Replace emoji content with `<img>` tags
3. Update `.about-image` and gallery sections
4. Host images on same server or CDN

### Analytics

Add Google Analytics tracking:

Find the closing `</head>` tag in generated HTML, add:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### SEO Optimization

The generator automatically:
- ✓ Sets page title to "[Restaurant Name] - Restaurant"
- ✓ Sets meta description from restaurant description
- ✓ Uses semantic HTML structure
- ✓ Includes mobile viewport tag

For additional SEO, add Open Graph tags in generated HTML:

```html
<meta property="og:title" content="Restaurant Name">
<meta property="og:description" content="...">
<meta property="og:image" content="https://...">
<meta property="og:url" content="https://restaurant.com">
```

## Troubleshooting

### JSON Validation Error

Use an online JSON validator or validate locally:

```bash
node -e "const fs = require('fs'); JSON.parse(fs.readFileSync('my-restaurant.json', 'utf-8')); console.log('Valid')"
```

### Colors Not Appearing

Ensure hex color format is correct:
- ✓ `#FF6B6B` (valid)
- ✗ `FF6B6B` (missing #)
- ✗ `#FF6B` (too short)
- ✗ `red` (wrong format)

### Website Not Responsive

Generated HTML is fully responsive. If mobile view is broken:
1. Check viewport meta tag is in `<head>` (should be automatic)
2. Ensure browser zoom is at 100%
3. Check browser dev tools mobile toggle

### Booking Widget Not Showing

Verify `bookingUrl` format:
```json
{
  "bookingUrl": "https://booking.r3sto.ch/your-slug"
}
```

Should match your restaurant slug.

## Performance

Generated websites are optimized:

- Single HTML file (~44 KB)
- Minimal CSS (~30 KB)
- Minimal JavaScript (~5 KB)
- Google Fonts lazy-loaded
- No external framework dependencies
- Fast initial load time
- Excellent Lighthouse scores

## Mobile Preview

Test on mobile by:
1. Opening HTML file in browser
2. Using browser developer tools (F12)
3. Toggle device toolbar (mobile icon)
4. Test at various screen sizes

## Support

For issues:
1. Check README.md troubleshooting section
2. Validate JSON config
3. Review error messages from generator
4. Check browser console for JavaScript errors

---

**Generated for R3STO — Empowering Restaurants** 🍽️
