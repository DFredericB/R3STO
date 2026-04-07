# R3STO Voice Widget

A futuristic, AI-powered voice reservation assistant for mobile users. Customers can tap a microphone button and speak their reservation request in natural language, and the widget guides them through the entire booking process using voice input and synthesis.

## Features

- **Natural Language Processing** — Understands French dates ("demain", "samedi"), times ("19h", "sept heures"), guest counts ("4 personnes", "pour six")
- **Web Speech API** — Real-time voice input with automatic silence detection
- **Voice Synthesis** — Conversational responses from the assistant
- **Beautiful UI** — Glassmorphism design with wave animations
- **Mobile-First** — Responsive bottom-sheet interface
- **Framework-Free** — Pure HTML/CSS/JavaScript, no dependencies
- **Easy Integration** — One-line embed code or standalone demo
- **Accessibility** — Fallback for unsupported browsers, clear error messages

## Quick Start

### Option 1: Standalone Demo Page

Open `index.html` in your browser to see the voice widget in action.

```bash
open index.html
# or in your browser:
# file:///path/to/voice-widget/index.html
```

### Option 2: Embed on Your Website

Add this single line to your restaurant's booking page:

```html
<script src="https://widget.r3sto.com/voice/embed.js" data-resto="restaurant-id"></script>
```

Replace `restaurant-id` with your actual restaurant ID from R3STO.

The script will:
1. Inject a floating microphone button (bottom-right, fixed position)
2. Load the voice interface in an iframe when tapped
3. Dispatch a custom event with reservation data when confirmed

### Option 3: Programmatic Control

```html
<script src="https://widget.r3sto.com/voice/embed.js" data-resto="legourmet"></script>

<script>
    // Open the widget programmatically
    window.R3STO_VOICE.open();

    // Close the widget
    window.R3STO_VOICE.close();

    // Set a callback for confirmed reservations
    window.R3STO_VOICE.setCallback((reservation) => {
        console.log('Reservation confirmed:', reservation);
        // Send to your backend API
        fetch('/api/reservations', {
            method: 'POST',
            body: JSON.stringify(reservation)
        });
    });

    // Listen for custom event
    document.addEventListener('r3sto-reservation-confirmed', (event) => {
        console.log('Reservation:', event.detail.reservation);
    });
</script>
```

## Embed Script Configuration

The `embed.js` script accepts the following data attributes:

```html
<script
    src="https://widget.r3sto.com/voice/embed.js"
    data-resto="restaurant-id"           <!-- Required: Restaurant ID from R3STO -->
    data-url="https://..."               <!-- Optional: Custom widget URL -->
    data-language="fr"                   <!-- Optional: Language (fr, en) -->
    data-position="bottom-right"         <!-- Optional: Button position (bottom-right, bottom-left, top-right, top-left) -->
></script>
```

## Conversation Flow

The assistant guides users through 5 steps:

### 1. Greeting & Date Selection
```
Assistant: "Bonjour ! Je suis l'assistant R3STO. Pour quelle date souhaitez-vous réserver ?"
User: "Demain soir"
Assistant: "Parfait, pour demain soir. Combien de personnes ?"
```

Supported date inputs:
- "aujourd'hui" → today
- "demain" → tomorrow
- Day names: "lundi", "mardi", "mercredi", etc.
- Explicit dates: "15/03", "15-03-2026"

### 2. Guest Count
```
User: "4 personnes"
Assistant: "4 personnes, noté. À quelle heure ?"
```

Supported formats:
- "2 personnes", "pour 4", "cinq", "six personnes"
- Supports 1-20 guests

### 3. Time Selection
```
User: "20 heures"
Assistant: "20h00, c'est noté. À quel nom ?"
```

Supported time formats:
- "19h", "19h30", "19:30"
- "sept heures du soir", "une heure de l'après-midi"
- Also accepts: "midi", "ce soir", "matin"

### 4. Name Collection
```
User: "Dupont"
Assistant: "Réservation pour 4 personnes, demain à 20h00 au nom de Dupont. Je confirme ?"
```

The last word spoken is used as the reservation name.

### 5. Confirmation
```
User: "Oui"
Assistant: "Votre réservation est confirmée ! À demain !"
```

If user doesn't confirm, the assistant resets to step 1.

## Reservation Data Structure

When a reservation is confirmed, the following data is returned:

```javascript
{
    date: "2026-03-31",           // ISO 8601 format
    time: "20h00",                // HH:00 format
    guests: 4,                    // Integer: 1-20
    name: "Dupont",               // String
    restaurantId: "restaurant-id" // From data-resto
}
```

## Browser Support

- **Chrome/Edge 25+** — Full support
- **Firefox 25+** — Full support
- **Safari 14.1+** — Full support
- **Mobile browsers** — Chrome Android, Safari iOS, Samsung Internet

**Fallback**: On unsupported browsers, the button displays with 50% opacity and shows "Non supporté" on hover.

## Customization

### Styling

All styles are encapsulated in the HTML file. To customize:

1. Edit the `<style>` section in `index.html`
2. Key CSS variables you can modify:
   - **Button gradient**: `#4480d8`, `#6ba3ff` (blue tones)
   - **Background**: Linear gradient in `body`
   - **Border radius**: `16px` (primary), `8px` (secondary), `50%` (button)
   - **Animations**: Keyframes for pulse, wave, slide effects

### Colors

```css
/* Primary button color */
background: linear-gradient(135deg, #4480d8 0%, #6ba3ff 100%);

/* Assistant message bubbles */
background: #f0f0f0;

/* User message bubbles */
background: linear-gradient(135deg, #4480d8 0%, #6ba3ff 100%);
```

### Language

To add another language, modify the speech recognition setup and response strings:

```javascript
// Change language (currently French: fr-FR)
recognition.lang = 'en-US'; // For English

// Update response messages
const messages = {
    greeting: "Hello! I'm the R3STO assistant...",
    askDate: "What date would you like to book?",
    // ... etc
};
```

## Integration with R3STO Backend

When a user confirms a reservation, the embed script dispatches a custom event:

```javascript
document.addEventListener('r3sto-reservation-confirmed', (event) => {
    const { restaurantId, reservation, timestamp } = event.detail;

    // Send to your backend
    fetch(`https://api.r3sto.com/restaurants/${restaurantId}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reservation)
    })
    .then(res => res.json())
    .then(data => {
        console.log('Reservation saved:', data);
    });
});
```

## Testing

### Test Cases

1. **Basic Reservation**
   - Date: "Demain"
   - Guests: "4 personnes"
   - Time: "19h"
   - Name: "Dupont"
   - Confirm: "Oui"

2. **Date Variations**
   - "Samedi prochain"
   - "15/03"
   - "25 mars"

3. **Complex Names**
   - Single word: "Dupont"
   - Multiple words: "Jean Dupont" (uses last word)

4. **Edge Cases**
   - No speech detected
   - Network disconnection
   - Browser without Web Speech API support
   - Saying "Non" to confirmation (should restart)

### Debug Mode

Add `?debug=true` to the iframe URL to see console logs:

```html
<script src="https://widget.r3sto.com/voice/embed.js"
        data-resto="legourmet"
        data-url="https://widget.r3sto.com/voice/index.html?debug=true"></script>
```

## Performance

- **Load Time**: ~50KB (HTML + CSS + JS combined, uncompressed)
- **Runtime Memory**: ~2-5MB during active conversation
- **Network**: Minimal usage except for Web Speech API (handled by browser)

## Accessibility

- Keyboard navigation support (Escape to close)
- Clear error messages for microphone issues
- Visual feedback for all interactions
- Screen reader compatible transcripts (in progress)

## Security

- **Microphone Permissions**: Browser handles permission requests
- **iframe Isolation**: Widget runs in isolated iframe context
- **Message Validation**: All postMessage communications validated by origin
- **No Data Storage**: Reservation data only in memory until confirmed

## Troubleshooting

### Microphone not working
- Check browser microphone permissions
- Verify HTTPS connection (Web Speech API requires secure context)
- Try a different browser (Chrome/Edge recommended)

### Widget not appearing
- Check console for errors
- Verify `data-resto` attribute is set
- Ensure `embed.js` loads successfully

### Voice recognition not working
- Check browser language setting
- Speak clearly in French
- Ensure microphone is not muted
- Try closing and reopening widget

### Reservation not confirmed
- Check if all fields were filled (date, time, guests, name)
- Verify connection to R3STO API
- Check browser console for errors

## Files

- **index.html** — Standalone demo with full voice widget implementation
- **embed.js** — Lightweight embed script for injection into other pages
- **README.md** — This documentation

## License

R3STO Voice Widget - Proprietary

## Support

For issues, feature requests, or customization needs:
- Email: support@r3sto.com
- Issues: https://github.com/r3sto/voice-widget/issues

---

**Built with ❤️ for R3STO**

Making restaurant reservations as natural as conversation.
