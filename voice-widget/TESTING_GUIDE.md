# R3STO Voice Widget - Testing Guide

## Pre-Launch Testing Checklist

### 1. Environment Setup

- [ ] Browser: Chrome/Chromium 25+ or Edge
- [ ] HTTPS enabled (Web Speech API requires secure context)
- [ ] Microphone connected and tested
- [ ] Microphone permissions granted in browser
- [ ] Network connection stable
- [ ] JavaScript enabled

### 2. UI/UX Testing

#### Button Display
- [ ] Floating button appears in bottom-right corner
- [ ] Button is 56px circle with blue gradient
- [ ] Button has smooth shadow
- [ ] Button hover effect works (scale + shadow increase)
- [ ] Button click effect works (scale down)
- [ ] Button responds to click

#### Overlay Display
- [ ] Overlay appears full-screen when button clicked
- [ ] Dark glassmorphism background shows
- [ ] Panel slides up from bottom with animation
- [ ] Close button (X) visible in header
- [ ] Conversation transcript area visible
- [ ] Wave animation visible when listening
- [ ] Cancel and Confirm buttons present

#### Animations
- [ ] Button pulse animation during listening
- [ ] Wave bars animate in sync while microphone active
- [ ] Messages slide in smoothly
- [ ] Panel slides up smoothly on open
- [ ] All transitions are 60fps (smooth)

#### Responsive Design
- [ ] Test on desktop (1920x1080)
- [ ] Test on tablet (768x1024)
- [ ] Test on mobile (375x667)
- [ ] Button position correct on all screen sizes
- [ ] Panel layout correct on small screens
- [ ] Text sizes readable on mobile
- [ ] Buttons tappable (min 44x44px on mobile)

### 3. Voice Recognition Testing

#### Microphone Permission
- [ ] First load prompts for microphone access
- [ ] Permission grant works
- [ ] Permission denied shows error message
- [ ] Can retry after permission denied

#### Speech Input
- [ ] Microphone icon shows when listening
- [ ] Wave bars animate during speech
- [ ] Microphone stops after 2-3 seconds of silence
- [ ] Interim results show as user speaks
- [ ] Final transcript appears in bubble

#### Speech Recognition Accuracy
- [ ] Clear speech recognized correctly
- [ ] Mumbled speech shows partial results
- [ ] Background noise handled reasonably
- [ ] Multiple accents tested (Parisian, Québécois, Belgian)

### 4. Conversation Flow Testing

#### Test Case 1: Basic Reservation
```
User: "Demain"
Expected: ✓ Date confirmed, asks for guest count
User: "4 personnes"
Expected: ✓ Count confirmed, asks for time
User: "20h"
Expected: ✓ Time confirmed, asks for name
User: "Dupont"
Expected: ✓ Summary card appears, asks to confirm
User: "Oui"
Expected: ✓ Confirmation message, reservation finalized
```
- [ ] Pass

#### Test Case 2: Date Variations
- [ ] "aujourd'hui" → Correctly identified as today
- [ ] "demain" → Correctly identified as tomorrow
- [ ] "lundi" → Correctly identified as next Monday
- [ ] "15/03" → Correctly parsed as March 15
- [ ] "15-03-2026" → Correctly parsed with year

#### Test Case 3: Time Variations
- [ ] "19h" → Parsed as 19h00
- [ ] "19h30" → Parsed as 19h30
- [ ] "19:30" → Parsed as 19h30
- [ ] "sept heures du soir" → Parsed as 19h00
- [ ] "une heure" → Parsed as 13h00 (default afternoon)
- [ ] "midi" → Recognized as midday reference

#### Test Case 4: Guest Count Variations
- [ ] "1" → Single guest accepted
- [ ] "2 personnes" → Parsed correctly
- [ ] "pour quatre" → Parsed as 4
- [ ] "cinq" → Word form recognized
- [ ] "six personnes" → Full phrase works
- [ ] "20" → Maximum guests accepted
- [ ] "21" → Rejected (out of range)

#### Test Case 5: Name Variations
- [ ] Single word: "Dupont" → Used directly
- [ ] First + last: "Jean Dupont" → Uses "Dupont"
- [ ] Special characters: "O'Brien" → Handled correctly
- [ ] Numbers in name: "Martin123" → Handled gracefully

#### Test Case 6: Confirmation Variations
- [ ] "Oui" → Confirms reservation
- [ ] "Oui, c'est bon" → Confirms reservation
- [ ] "Confirme" → Confirms reservation
- [ ] "D'accord" → Confirms reservation
- [ ] "Non" → Restarts conversation

### 5. Natural Language Processing

#### Date Parsing
- [ ] Recognizes French day names (lundi-dimanche)
- [ ] Handles relative dates (aujourd'hui, demain)
- [ ] Parses numeric dates (15/03, 15-03-2026)
- [ ] Handles spoken dates correctly
- [ ] Past dates are rejected
- [ ] Future dates up to 1 month accepted

#### Time Parsing
- [ ] Parses 24-hour format correctly
- [ ] Parses 12-hour spoken format
- [ ] Handles minutes (19h30)
- [ ] Handles keywords (midi, soir, matin)
- [ ] Invalid times (25h, 60min) rejected

#### Guest Count Parsing
- [ ] Recognizes French number words
- [ ] Handles singular/plural forms
- [ ] Accepts range 1-20
- [ ] Rejects 0 and 21+
- [ ] Handles spoken and numeric forms

### 6. Transcript Display

- [ ] Assistant messages appear in gray bubbles on left
- [ ] User messages appear in blue bubbles on right
- [ ] Messages are in correct order (chronological)
- [ ] Conversation scrolls as new messages appear
- [ ] Text wraps correctly for long messages
- [ ] Timestamps not required (conversation is implicit)

### 7. Reservation Summary

- [ ] Summary card appears after name input
- [ ] Card shows all 4 fields:
  - [ ] Date (in ISO format YYYY-MM-DD)
  - [ ] Time (in HH:00 format)
  - [ ] Guests (as integer)
  - [ ] Name (capitalized)
- [ ] Summary has blue border and subtle gradient background
- [ ] Summary card appears with smooth animation

### 8. Error Handling

#### Microphone Errors
- [ ] No microphone: Graceful error message
- [ ] Permission denied: Clear explanation + retry option
- [ ] No speech detected: Retry message, auto-retry in 2 seconds
- [ ] Network error: Informative message

#### Input Validation
- [ ] Unrecognized date: "I didn't understand. Try: demain, lundi, 15/03"
- [ ] Unrecognized count: "I didn't understand the number. Try: 2 personnes, four, six"
- [ ] Unrecognized time: "I didn't understand the time. Try: 19h, sept heures, 20h30"
- [ ] All error messages are helpful and non-technical

#### Edge Cases
- [ ] Very quiet speech: Error message + retry
- [ ] Very loud background noise: Handles reasonably
- [ ] User interrupts assistant: Works correctly on next input
- [ ] Browser crashes recovery: No data loss (new conversation)
- [ ] Network drops: Fails gracefully with error

### 9. Browser Compatibility

#### Chrome/Chromium
- [ ] Version 25+: Full support
- [ ] Mobile Chrome: Full support
- [ ] Dev Tools: No console errors

#### Edge
- [ ] Version 79+: Full support
- [ ] Works with Bing speech service

#### Firefox
- [ ] Version 25+: Full support
- [ ] Mobile Firefox: Full support

#### Safari
- [ ] Desktop Safari 14.1+: Full support
- [ ] iOS Safari 14.5+: Full support (may require HTTPS)
- [ ] Voice synthesis may sound different (Apple voice)

#### Mobile Browsers
- [ ] Chrome Android: Full support
- [ ] Safari iOS: Full support
- [ ] Samsung Internet: Full support
- [ ] Firefox Mobile: Full support

#### Unsupported Browsers
- [ ] Button appears with 50% opacity
- [ ] Hover shows "Non supporté sur ce navigateur"
- [ ] Click shows alert with browser recommendation
- [ ] No console errors from widget

### 10. Performance Testing

#### Load Time
- [ ] index.html loads in < 2 seconds
- [ ] embed.js loads in < 1 second
- [ ] No layout shift when widget appears
- [ ] Smooth animations even on low-end devices

#### Memory Usage
- [ ] Initial load: < 5MB
- [ ] During conversation: < 10MB
- [ ] No memory leaks after multiple conversations
- [ ] Closing widget frees memory

#### CPU Usage
- [ ] Wave animation: Smooth 60fps
- [ ] Message rendering: No lag
- [ ] Speech processing: No freezing
- [ ] Mobile device: Performant even on mid-range phones

### 11. Accessibility

#### Keyboard Navigation
- [ ] Escape key closes widget
- [ ] Tab navigation through buttons (if applicable)
- [ ] Focus indicators visible

#### Screen Readers
- [ ] Assistant messages announced
- [ ] Status updates announced
- [ ] Error messages announced
- [ ] Buttons labeled properly

#### Visual Contrast
- [ ] Text has sufficient contrast ratio (WCAG AA 4.5:1)
- [ ] Color not sole conveyor of information
- [ ] Status messages use icon + color + text

### 12. Integration Testing

#### Embed Script
- [ ] embed.js injects button correctly
- [ ] Button appears on page load
- [ ] iframe loads without errors
- [ ] postMessage communication works

#### Custom Events
- [ ] 'r3sto-reservation-confirmed' event fires
- [ ] Event contains correct reservation data
- [ ] Event can be listened to with addEventListener

#### Public API
- [ ] R3STO_VOICE.open() works
- [ ] R3STO_VOICE.close() works
- [ ] R3STO_VOICE.setCallback() works
- [ ] R3STO_VOICE.getState() returns correct data

### 13. Data Validation

#### Reservation Data Structure
```javascript
{
    date: "2026-03-31",     // ISO 8601 format
    time: "20h00",          // HH:00 format
    guests: 4,              // Integer 1-20
    name: "Dupont",         // Capitalized string
    restaurantId: "legourmet" // From data-resto
}
```
- [ ] All fields present
- [ ] Data types correct
- [ ] Values in expected ranges
- [ ] No sensitive data leaked

### 14. Localization (French)

- [ ] All UI text in French
- [ ] Speech recognition language set to fr-FR
- [ ] Date/time parsing handles French conventions
- [ ] Number parsing works for French formats
- [ ] Error messages helpful and in French

### 15. Security

#### Microphone Access
- [ ] HTTPS required (or localhost for testing)
- [ ] Microphone accessed only when recording
- [ ] Audio not stored or logged
- [ ] User can revoke permission

#### iframe Isolation
- [ ] Widget sandboxed in iframe
- [ ] Limited access to parent page
- [ ] postMessage validates origin

#### Data Handling
- [ ] No personal data stored locally
- [ ] Reservation data only in memory until confirmed
- [ ] No cookies or tracking
- [ ] No external requests except necessary APIs

### 16. Mobile-Specific Testing

#### Touch Interactions
- [ ] Button is tappable (min 44x44 on mobile)
- [ ] No double-tap zoom issues
- [ ] Touch feedback provided
- [ ] Swipe gestures not interfered with

#### Keyboard
- [ ] Doesn't trigger mobile keyboard
- [ ] Safe area respected (notch, bottom bar)
- [ ] Landscape orientation handled

#### Battery/Data
- [ ] Doesn't drain battery excessively
- [ ] Minimal data usage
- [ ] Graceful handling of poor connectivity

### 17. Demo Page Testing

#### Standalone Demo
- [ ] Demo page loads correctly
- [ ] Hero section displays well
- [ ] Info box helpful
- [ ] Voice button works in isolation
- [ ] Full conversation flow works
- [ ] Can complete multiple reservations
- [ ] Close and reopen works properly

### 18. Regression Testing

- [ ] After each change, full conversation flow still works
- [ ] All animation timings still smooth
- [ ] No new console errors
- [ ] Mobile layout not broken
- [ ] Voice recognition not degraded

### 19. Production Readiness

- [ ] All tests above pass
- [ ] No console warnings or errors
- [ ] Code minified (optional for production)
- [ ] Assets optimized
- [ ] Caching headers configured
- [ ] HTTPS enabled on deployment
- [ ] Domain added to Web Speech API allowed origins
- [ ] Monitoring/analytics in place
- [ ] Error reporting configured

### 20. User Acceptance Testing

#### Scenario 1: New User
- [ ] Can understand how to use widget
- [ ] Clear instructions provided
- [ ] Doesn't need help completing reservation
- [ ] Feels natural and conversational

#### Scenario 2: Repeat User
- [ ] Widget loads quickly second time
- [ ] Remembers nothing (privacy)
- [ ] Fresh start each time

#### Scenario 3: Various Accents
- [ ] Parisian French: Works well
- [ ] Quebec accent: Works reasonably
- [ ] Belgian/Swiss French: Works reasonably
- [ ] Foreign accents: Clear error, can retry

#### Scenario 4: Noisy Environment
- [ ] Restaurant noise: Some interference expected
- [ ] Quiet office: Works perfectly
- [ ] Car with background music: Handles well

## Test Result Documentation

### Template for Each Test Case

```
Test Case: [Name]
Date: [YYYY-MM-DD]
Browser: [Chrome/Firefox/Safari/etc v.X]
Device: [Desktop/Mobile/Tablet]
Result: PASS / FAIL
Notes: [Any observations]
```

## Known Limitations & Expected Behavior

1. **Voice Recognition Quality**
   - Depends on microphone quality and background noise
   - French accent variations may affect accuracy
   - Can be improved with user feedback training

2. **Web Speech API Limitations**
   - No control over underlying voice engine
   - Different voices on different browsers
   - May not work on poor connections

3. **Natural Language Parsing**
   - Designed for clear, natural French
   - May not handle very complex sentences
   - Simple regex-based (not ML-based)

4. **Browser Support**
   - Web Speech API not available in all browsers
   - Safari speech synthesis uses different voice
   - Some older browsers not supported

## Continuous Testing

After launch, perform:
- **Weekly**: Sample user conversations, check error logs
- **Monthly**: Full regression test suite
- **Quarterly**: User feedback analysis, update NLP patterns
- **Annually**: Major browser compatibility re-test

---

**Widget Version**: 1.0.0
**Last Updated**: March 30, 2026
**Status**: Ready for QA Testing
