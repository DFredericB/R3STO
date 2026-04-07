# R3STO Voice Widget - Quick Start

## Files Overview

```
voice-widget/
├── index.html              (1,068 lines) - Standalone demo + full implementation
├── embed.js               (180+ lines)  - One-line embed script
├── README.md              (380+ lines)  - Comprehensive documentation
├── TESTING_GUIDE.md       (500+ lines)  - Complete QA checklist
└── QUICK_START.md         (this file)
```

## 3-Second Integration

Add one line to your restaurant's booking page:

```html
<script src="https://widget.r3sto.com/voice/embed.js" data-resto="restaurant-id"></script>
```

Done! A blue microphone button appears in the bottom-right corner.

## Test Locally

1. Open `index.html` in Chrome, Firefox, Safari, or Edge
2. Click the floating microphone button
3. Allow microphone access when prompted
4. Speak: "Demain à 19h pour 4 personnes au nom de Dupont"
5. Widget confirms your reservation

## Conversation Flow (Automatic)

```
Bot: "Bonjour! Pour quelle date?" 
You: "Demain"
Bot: "Parfait! Combien de personnes?"
You: "4 personnes"
Bot: "À quelle heure?"
You: "19h"
Bot: "À quel nom?"
You: "Dupont"
Bot: "Je confirme? [Résumé]"
You: "Oui"
Bot: "Confirmé! À demain!"
```

## Handle Reservation on Your Backend

```html
<script src="https://widget.r3sto.com/voice/embed.js" data-resto="legourmet"></script>
<script>
  document.addEventListener('r3sto-reservation-confirmed', (event) => {
    const { date, time, guests, name } = event.detail.reservation;
    
    // Send to your API
    fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,      // "2026-03-31"
        time,      // "20h00"
        guests,    // 4
        name       // "Dupont"
      })
    });
  });
</script>
```

## Browser Support

✓ Chrome 25+  
✓ Firefox 25+  
✓ Safari 14.1+  
✓ Edge 79+  
✓ Mobile browsers (Android Chrome, iOS Safari, etc.)  

**Requires:** HTTPS (or localhost for testing) + Microphone access

## Customization

### Change Button Position
```html
<script src="..." data-resto="legourmet" data-position="bottom-left"></script>
```

Options: `bottom-right`, `bottom-left`, `top-right`, `top-left`

### Change Colors

Edit `index.html` CSS:
```css
/* Change from blue to another color */
background: linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%);
```

### Add Your Logo

Modify the SVG microphone icon in `index.html` or add a custom icon.

## Deployment Checklist

- [ ] Files uploaded to CDN (e.g., widget.r3sto.com/voice/)
- [ ] HTTPS enabled
- [ ] CORS headers configured
- [ ] Web Speech API origins whitelisted
- [ ] Backend API endpoint ready to receive reservations
- [ ] Error logging/monitoring set up
- [ ] Test on 3+ browsers
- [ ] Test on mobile (iOS + Android)
- [ ] Announce to restaurants

## Key Features

✓ **Voice Input** — Natural French speech recognition  
✓ **Smart Parsing** — Dates: "demain", "samedi" | Times: "19h", "7 du soir" | Counts: "4 personnes"  
✓ **Conversation** — Guided multi-turn dialogue  
✓ **Voice Response** — Text-to-speech confirmations  
✓ **Beautiful UI** — Glassmorphism, animations, mobile-optimized  
✓ **Easy Embedding** — One script tag  
✓ **No Dependencies** — Pure vanilla JS  
✓ **Accessible** — Works on all modern browsers  

## Troubleshooting

### Widget doesn't appear
- Check script src URL is correct
- Check browser console for errors
- Verify HTTPS (Web Speech API requires secure context)

### Microphone not working
- Grant microphone permission
- Check microphone settings in browser
- Try a different browser (Chrome recommended)
- Restart browser

### Voice not recognized
- Speak clearly and pause between words
- Reduce background noise
- Try different French accent/dialect (system dependent)

## Support

For issues or custom integrations:
- Email: support@r3sto.com
- Docs: See README.md for full documentation
- Tests: See TESTING_GUIDE.md for QA checklist

## What's Next?

1. **Deploy to CDN** — Upload files to production
2. **Integrate Backend** — Handle reservations from custom event
3. **Brand Customization** — Adjust colors/style per restaurant
4. **Analytics** — Track usage and user satisfaction
5. **ML Improvements** — Use user feedback to improve NLP

---

**Version**: 1.0.0  
**Last Updated**: March 30, 2026  
**Status**: Production Ready
