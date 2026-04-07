/**
 * R3STO Voice Widget Embed Script
 *
 * Usage:
 * <script src="https://widget.r3sto.com/voice/embed.js" data-resto="restaurant-id"></script>
 *
 * The script injects a floating microphone button into the page and loads the voice
 * interface in an iframe. It communicates with the iframe using postMessage API.
 */

(function() {
    'use strict';

    // Configuration
    const WIDGET_CDN = 'https://widget.r3sto.com/voice';
    const EMBED_VERSION = '1.0.0';

    // Get script configuration from data attributes
    const scriptTag = document.currentScript || document.scripts[document.scripts.length - 1];
    const restaurantId = scriptTag.getAttribute('data-resto') || 'default';
    const widgetUrl = scriptTag.getAttribute('data-url') || WIDGET_CDN + '/index.html';
    const language = scriptTag.getAttribute('data-language') || 'fr';
    const position = scriptTag.getAttribute('data-position') || 'bottom-right';

    // Prevent multiple injections
    if (window.R3STO_VOICE_INJECTED) {
        return;
    }
    window.R3STO_VOICE_INJECTED = true;

    // Create and inject styles
    const styles = document.createElement('style');
    styles.textContent = `
        .r3sto-voice-button {
            position: fixed;
            ${position.includes('bottom') ? 'bottom' : 'top'}: 24px;
            ${position.includes('right') ? 'right' : 'left'}: 24px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, #4480d8 0%, #6ba3ff 100%);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 8px 32px rgba(68, 128, 216, 0.4);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            z-index: 9999;
            font-size: 28px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .r3sto-voice-button:hover {
            transform: scale(1.1);
            box-shadow: 0 12px 48px rgba(68, 128, 216, 0.5);
        }

        .r3sto-voice-button:active {
            transform: scale(0.95);
        }

        .r3sto-voice-button svg {
            width: 28px;
            height: 28px;
        }

        .r3sto-voice-button.listening {
            animation: r3sto-pulse 1s infinite;
        }

        @keyframes r3sto-pulse {
            0%, 100% {
                box-shadow: 0 8px 32px rgba(68, 128, 216, 0.4);
            }
            50% {
                box-shadow: 0 8px 40px rgba(68, 128, 216, 0.7);
            }
        }

        .r3sto-voice-iframe {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            border: none;
            z-index: 10000;
            display: none;
        }

        .r3sto-voice-iframe.active {
            display: block;
        }

        @media (max-width: 768px) {
            .r3sto-voice-button {
                bottom: 20px;
                right: 20px;
                width: 52px;
                height: 52px;
            }

            .r3sto-voice-button svg {
                width: 24px;
                height: 24px;
            }
        }
    `;
    document.head.appendChild(styles);

    // Create microphone button
    const button = document.createElement('button');
    button.className = 'r3sto-voice-button';
    button.setAttribute('title', language === 'fr' ? 'Appuyez pour parler' : 'Tap to speak');
    button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 16.91c-1.48 1.46-3.51 2.36-5.77 2.36-2.26 0-4.29-.9-5.77-2.36l-1.1 1.1c1.86 1.86 4.41 2.86 6.87 2.86s5.01-1 6.87-2.86l-1.1-1.1zM20 9h-1.7c0 .58-.1 1.14-.27 1.69l1.27 1.27c.44-1.52.7-3.13.7-4.96z"/>
        </svg>
    `;

    // Create iframe container
    const iframe = document.createElement('iframe');
    iframe.className = 'r3sto-voice-iframe';
    iframe.src = widgetUrl + '?resto=' + encodeURIComponent(restaurantId) + '&embedded=true';
    iframe.allow = 'microphone; speaker; autoplay';

    // State management
    let isOpen = false;
    let pendingMessage = null;

    // Button click handler
    button.addEventListener('click', () => {
        if (!isOpen) {
            iframe.classList.add('active');
            isOpen = true;
            // Send message to iframe to start assistant
            sendMessageToIframe({ type: 'START_ASSISTANT', restaurantId });
        }
    });

    // Handle messages from iframe
    window.addEventListener('message', (event) => {
        // Verify origin for security (in production, validate against your domain)
        if (event.origin !== new URL(widgetUrl).origin && event.origin !== window.location.origin) {
            return;
        }

        const { type, data } = event.data;

        switch (type) {
            case 'CLOSE_WIDGET':
                closeWidget();
                break;
            case 'RESERVATION_CONFIRMED':
                handleReservationConfirmed(data);
                break;
            case 'LISTENING_STATE':
                if (data.isListening) {
                    button.classList.add('listening');
                } else {
                    button.classList.remove('listening');
                }
                break;
        }
    });

    function sendMessageToIframe(message) {
        if (iframe.contentWindow) {
            iframe.contentWindow.postMessage(message, '*');
        }
    }

    function closeWidget() {
        iframe.classList.remove('active');
        isOpen = false;
        button.classList.remove('listening');
    }

    function handleReservationConfirmed(data) {
        // Dispatch custom event that the host page can listen to
        const event = new CustomEvent('r3sto-reservation-confirmed', {
            detail: {
                restaurantId,
                reservation: data,
                timestamp: new Date().toISOString()
            }
        });
        document.dispatchEvent(event);

        // Optionally send to server
        if (window.R3STO_VOICE_CALLBACK) {
            window.R3STO_VOICE_CALLBACK(data);
        }
    }

    // Inject button and iframe into page
    document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(button);
        document.body.appendChild(iframe);
    });

    // Fallback if DOM is already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!document.body.contains(button)) {
                document.body.appendChild(button);
                document.body.appendChild(iframe);
            }
        });
    } else {
        if (document.body) {
            document.body.appendChild(button);
            document.body.appendChild(iframe);
        }
    }

    // Expose public API
    window.R3STO_VOICE = {
        open: () => {
            button.click();
        },
        close: closeWidget,
        getState: () => ({ isOpen, restaurantId }),
        setCallback: (callback) => {
            window.R3STO_VOICE_CALLBACK = callback;
        }
    };

    // Log successful injection
    if (window.console && window.console.log) {
        console.log('[R3STO Voice] Widget injected for restaurant:', restaurantId);
    }
})();
