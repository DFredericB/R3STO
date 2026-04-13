# i18n Usage Guide - booking.r3sto.ch

## Quick Start

### For End Users
1. Look for the language switcher in the top-right corner (FR | DE | IT | EN)
2. Click any button to switch language instantly
3. Your choice is saved automatically
4. Return later and the page will remember your language preference

### For Developers

#### Adding New Translations

1. **Add the key to BOOK_I18N object** in the `<script>` section:
```javascript
var BOOK_I18N = {
  'fr': {
    'your_new_key': 'French text here',
    // ...
  },
  'de': {
    'your_new_key': 'German text here',
    // ...
  },
  'it': {
    'your_new_key': 'Italian text here',
    // ...
  },
  'en': {
    'your_new_key': 'English text here',
    // ...
  }
};
```

2. **Use in HTML with data-i18n attribute**:
```html
<label><span data-i18n="your_new_key">French text here</span></label>
```

3. **Use in placeholders with data-i18n-attr**:
```html
<input type="text" placeholder="French text" data-i18n-attr="placeholder:your_placeholder_key">
```

4. **Use in JavaScript code**:
```javascript
alert(t('your_new_key'));
document.getElementById('element').textContent = t('your_new_key');
```

#### Core Functions

##### `t(key)` - Get Translation
```javascript
var text = t('step_label_1');  // Returns translated text based on currentLang
```

##### `switchLang(lang)` - Change Language
```javascript
switchLang('de');  // Switches to German
// Automatically:
// - Updates all UI text
// - Updates localStorage
// - Updates active button
```

##### `applyTranslations()` - Update All Text
```javascript
applyTranslations();  // Re-applies all translations from BOOK_I18N
```

## Key Concepts

### Translation Keys
Translation keys use snake_case and are descriptive:
- `step_label_1` - Label for first step
- `first_name_placeholder` - Placeholder for first name input
- `error_email` - Error message for email validation

### Language Codes
- `fr` - French (default)
- `de` - German (Swiss German where applicable)
- `it` - Italian (Swiss Italian)
- `en` - English (International)

### Storage
Language preference is stored in browser localStorage with key `r3sto_lang`. This persists across browser sessions.

## Implementation Details

### HTML Attributes

#### data-i18n
Applied to text content elements. Text inside the element with this attribute gets translated on load and on language switch.

```html
<span data-i18n="translation_key">Fallback text in French</span>
```

#### data-i18n-attr
Applied to input fields for translating attributes like placeholders and titles. Format: `attribute:key`

```html
<input type="text" data-i18n-attr="placeholder:placeholder_key">
```

Multiple attributes can be translated:
```html
<input type="text" data-i18n-attr="placeholder:key1,title:key2">
```

### CSS Classes

#### .lang-switcher
Container for the language buttons
- Fixed position: top-right
- Semi-transparent white background
- Rounded corners, subtle shadow

#### .lang-btn
Individual language button
- 32x32px square with rounded corners
- Changes on hover and active states
- Active state: dark background, white text

## Localization Notes

### Swiss Languages

#### German (de)
- Uses Schweizerdeutsch (Swiss German) when appropriate
- Professional standard German for formal terms
- Uses "Sie" form for formal address
- Examples:
  - "Telefon" (not "Telefonnummer")
  - "Zeitfenster" (for time slot)
  - "Tisch reservieren" (book a table)

#### Italian (it)
- Uses standard Italian for Switzerland (Ticinese)
- Professional restaurant industry terminology
- Formal and polite tone
- Examples:
  - "Tavolo" (table)
  - "Fascia oraria" (time slot)
  - "Prenotazione" (booking)

### Date Formatting

Dates are automatically formatted according to the selected language:
- French (fr-CH): "lundi 5 avril 2026"
- German (de-CH): "Montag, 5. April 2026"
- Italian (it-CH): "lunedì 5 aprile 2026"
- English (en-CH): "Monday, April 5, 2026"

This is handled by the browser's Intl API using `toLocaleDateString()` with the appropriate locale code.

### Singular/Plural Forms

Guest count displays use proper singular/plural forms:

```javascript
// Example: selectedGuests = 1
'1 ' + t('guest_person')  // "1 personne" (FR)

// Example: selectedGuests = 3
'3 ' + t('guest_persons')  // "3 personnes" (FR)
```

Each language has its own singular/plural keys:
- French: `guest_person` / `guest_persons`
- German: `guest_person` (Person) / `guest_persons` (Personen)
- Italian: `guest_person` (persona) / `guest_persons` (persone)
- English: `guest_person` (guest) / `guest_persons` (guests)

## Testing Checklist

- [ ] Language switcher displays in top-right corner
- [ ] Clicking FR changes page to French
- [ ] Clicking DE changes page to German
- [ ] Clicking IT changes page to Italian
- [ ] Clicking EN changes page to English
- [ ] Active button highlights correctly
- [ ] All form labels translate
- [ ] All button text translates
- [ ] Placeholders translate
- [ ] Error alerts show in selected language
- [ ] Dates format correctly per language
- [ ] Singular/plural forms work (1 guest vs 2 guests)
- [ ] Language preference persists on page reload
- [ ] localStorage has `r3sto_lang` key set

## Troubleshooting

### Translations not appearing
1. Check that `data-i18n` attribute is set on the element
2. Verify the key exists in BOOK_I18N object for all languages
3. Check browser console for JavaScript errors
4. Clear localStorage and reload

### Language not persisting
1. Check that localStorage is enabled in browser
2. Check browser console for any localStorage errors
3. Verify `switchLang()` is being called when buttons clicked

### Date formatting wrong
1. Verify `currentDateLocale` is being set in `updateDateLocale()`
2. Check that locale codes are correct (fr-CH, de-CH, it-CH, en-CH)
3. Verify `window.currentDateLocale` is being used in date formatting

## Performance Notes

- Translation object is embedded in HTML (no additional HTTP request)
- Translations applied on page load and on language switch
- Uses efficient DOM selection with `querySelectorAll()`
- localStorage is synchronous (small overhead, acceptable for this use case)
- No external dependencies required

## Browser Support

- Chrome/Edge 55+
- Firefox 51+
- Safari 11+
- Opera 42+
- IE: Not supported (no ES6 support)

Requires:
- ES6 JavaScript support
- localStorage API
- Intl API (for date formatting)

All modern browsers include these features.
