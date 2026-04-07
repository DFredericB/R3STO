# R3STO Restaurant Website Generator

A complete system for generating beautiful, responsive restaurant websites for R3STO clients. Each restaurant gets their own auto-generated, production-ready website.

## Overview

The system consists of:

1. **template.html** — A premium, single-page restaurant website template with embedded CSS/JS
2. **generator.js** — Node.js script to generate static HTML from JSON configs
3. **demo-configs/** — Example restaurant configurations

## Features

### Template (template.html)

A beautiful, modern restaurant website with:

- **Responsive Design** — Mobile-first, works perfectly on all devices
- **Dark Mode Toggle** — Built-in theme switching with localStorage persistence
- **Dynamic Content** — Reads all data from a JavaScript config object
- **Smooth Animations** — Fade-in effects and smooth scrolling
- **Premium Typography** — Playfair Display (headings) + Inter (body text) from Google Fonts
- **No Dependencies** — Pure HTML/CSS/JavaScript, no frameworks
- **SEO Ready** — Proper meta tags, semantic HTML, JSON-LD ready

### Sections

1. **Navigation** — Sticky header with scrolling effect
2. **Hero** — Large banner with restaurant name, cuisine type, tagline, CTA
3. **About** — Description and welcome message
4. **Menu/Carte** — Categories with dishes, descriptions, and prices (CHF)
5. **Gallery** — Visual showcase of the restaurant
6. **Hours & Contact** — Opening hours, phone, email, address
7. **Map** — Location placeholder (ready for Google Maps embed)
8. **Reviews** — Customer testimonials with ratings
9. **Booking** — Reservation widget (iframe embed from booking.r3sto.ch)
10. **Footer** — Links and R3STO branding

## Quick Start

### Prerequisites

- Node.js (any recent version)
- A JSON config file with restaurant data

### Generate a Website

```bash
node generator.js <config.json> <output.html>
```

**Example:**

```bash
node generator.js demo-configs/legourmet.json legourmet.html
```

This creates a complete, standalone HTML file ready to deploy.

## Configuration Format

Create a JSON file with the following structure:

```json
{
  "name": "Restaurant Name",
  "slug": "restaurant-slug",
  "tagline": "Your restaurant's tagline",
  "cuisine": "Cuisine Type",
  "description": "Full description of your restaurant",
  "primaryColor": "#8B4513",
  "theme": "light",
  "phone": "+41 21 612 34 56",
  "email": "contact@restaurant.ch",
  "address": "Street Address, City",
  "website": "https://restaurant.ch",
  "hours": [
    { "day": "Monday", "status": "Closed" },
    { "day": "Tuesday – Friday", "lunch": "12:00 – 14:30", "dinner": "19:00 – 22:30" },
    { "day": "Saturday", "lunch": "", "dinner": "19:00 – 23:00" },
    { "day": "Sunday", "status": "Closed" }
  ],
  "menu": [
    {
      "category": "Starters",
      "items": [
        {
          "name": "Dish Name",
          "price": 24,
          "desc": "Description of the dish"
        }
      ]
    }
  ],
  "reviews": [
    {
      "name": "Customer Name",
      "rating": 5,
      "text": "Review text",
      "date": "2026-03-15"
    }
  ],
  "bookingUrl": "https://booking.r3sto.ch/restaurant-slug",
  "socialMedia": {
    "instagram": "https://instagram.com/restaurant",
    "facebook": "https://facebook.com/restaurant"
  }
}
```

### Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Restaurant name |
| slug | string | Yes | URL-friendly identifier (lowercase, hyphens) |
| tagline | string | No | Short marketing tagline |
| cuisine | string | No | Type of cuisine |
| description | string | Yes | Full restaurant description |
| primaryColor | string | No | Hex color for branding (#RRGGBB) |
| theme | string | No | "light" or "dark" |
| phone | string | No | Contact phone number |
| email | string | No | Contact email |
| address | string | No | Physical address |
| website | string | No | Restaurant's existing website |
| hours | array | No | Opening hours (see format below) |
| menu | array | No | Menu categories and items |
| reviews | array | No | Customer reviews |
| bookingUrl | string | No | R3STO booking widget URL |
| socialMedia | object | No | Social media links |

### Hours Format

Each hour entry can have:

```json
{
  "day": "Day(s) name",
  "status": "Closed"  // For closed days
}
```

Or:

```json
{
  "day": "Day(s) name",
  "lunch": "12:00 – 14:30",
  "dinner": "19:00 – 22:30"
}
```

### Menu Format

```json
{
  "category": "Appetizers",
  "items": [
    {
      "name": "Dish Name",
      "price": 24,
      "desc": "Description"
    }
  ]
}
```

### Reviews Format

```json
{
  "name": "Customer Name",
  "rating": 5,
  "text": "Review text",
  "date": "2026-03-15"
}
```

**Rating:** 1-5 stars (displayed as ★ characters)
**Date:** ISO format YYYY-MM-DD (displayed in French locale)

## Demo Configurations

Three complete example configs are included:

1. **legourmet.json** — French cuisine, Lausanne
2. **lalpage.json** — Swiss traditional, Sion
3. **sakura-zen.json** — Japanese, Zurich

Generate any of them:

```bash
node generator.js demo-configs/legourmet.json output/legourmet.html
node generator.js demo-configs/lalpage.json output/lalpage.html
node generator.js demo-configs/sakura-zen.json output/sakura-zen.html
```

## Customization

### Colors

Set `primaryColor` in your JSON config to any hex color. The template automatically derives darker/lighter shades for hover states and accents.

```json
{
  "primaryColor": "#D32F2F"
}
```

### Dark Mode

Enable dark mode by default:

```json
{
  "theme": "dark"
}
```

Users can always toggle between light/dark using the moon/sun button in the bottom-right.

### Social Media

Add social links (Instagram, Facebook):

```json
{
  "socialMedia": {
    "instagram": "https://instagram.com/restaurant",
    "facebook": "https://facebook.com/restaurant"
  }
}
```

### Booking Integration

Set your R3STO booking URL:

```json
{
  "bookingUrl": "https://booking.r3sto.ch/your-slug"
}
```

The booking widget appears in the "Réservez une Table" section and as a CTA button.

## Deployment

The generated HTML file is completely self-contained — no external dependencies except Google Fonts (which are referenced via CDN).

### To Deploy:

1. Generate the HTML file
2. Upload to your web server
3. Point your restaurant's domain to it (e.g., legourmet.r3sto.ch → output/legourmet.html)

### CDN/Static Hosting:

- Upload to AWS S3, Cloudflare Pages, Vercel, Netlify, etc.
- All CSS and JavaScript are embedded, so it's a single file deployment
- Google Fonts load from CDN automatically

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## File Structure

```
site-vitrine/
├── template.html              # Main website template
├── generator.js               # Node.js generation script
├── demo-configs/
│   ├── legourmet.json         # French restaurant example
│   ├── lalpage.json           # Swiss restaurant example
│   └── sakura-zen.json        # Japanese restaurant example
└── README.md                  # This file
```

## Generating Websites for New Restaurants

### Step 1: Create a Config

Create a new JSON file in `demo-configs/` or any directory:

```json
{
  "name": "Your Restaurant",
  "slug": "your-restaurant",
  "tagline": "Your tagline",
  "cuisine": "Your cuisine",
  "description": "Your description",
  "primaryColor": "#FF6B6B",
  "phone": "+41 21 123 45 67",
  "email": "info@restaurant.ch",
  "address": "123 Rue Main, 1000 City",
  "hours": [...],
  "menu": [...],
  "reviews": [...],
  "bookingUrl": "https://booking.r3sto.ch/your-restaurant",
  "socialMedia": {...}
}
```

### Step 2: Generate the HTML

```bash
node generator.js your-config.json output.html
```

### Step 3: Deploy

Upload `output.html` to your hosting and point the restaurant's domain to it.

## Features Explained

### Responsive Design

- **Desktop:** Full multi-column layouts
- **Tablet:** Optimized grid layouts
- **Mobile:** Single-column stacking

### Accessibility

- Semantic HTML structure
- Proper color contrast
- Touch-friendly buttons and spacing
- Screen reader compatible

### Performance

- No JavaScript frameworks (lightweight)
- Embedded CSS (no extra requests)
- Google Fonts lazy-loaded
- Optimized animations

### SEO

- Proper `<title>` and `<meta description>` tags
- Semantic HTML headings
- Mobile-responsive meta viewport
- Structured for rich snippets

## Troubleshooting

### "Template file not found"

Make sure you're running the generator from the correct directory, or provide the full path to template.html.

### Invalid JSON error

Validate your config JSON. Use a JSON validator like [jsonlint.com](https://jsonlint.com/)

Check for:
- Missing commas between properties
- Unclosed strings or brackets
- Special characters in strings (escape them with `\`)

### Colors not applying

Ensure your hex color is valid: `#RRGGBB` (e.g., `#FF0000`)

### Booking widget not showing

Verify the `bookingUrl` is correct and follows the format:
```
https://booking.r3sto.ch/your-slug
```

## Support

For issues or feature requests, contact the R3STO development team.

## License

All code is proprietary to R3STO. Restaurant data in configs is the responsibility of the restaurant operator.

---

**Generated for R3STO — Empowering Restaurants** 🍽️
