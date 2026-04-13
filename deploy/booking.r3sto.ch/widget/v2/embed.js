/**
 * R3STO Booking Widget — embed.js v2
 * Usage:
 *   <script src="https://booking.r3sto.ch/widget/v2/embed.js"></script>
 *   <div id="r3sto-widget"
 *        data-resto="monresto"
 *        data-color="#2d6cb8"
 *        data-theme="light"
 *        data-lang="fr">
 *   </div>
 */
(function() {
  'use strict';

  function init() {
    var container = document.getElementById('r3sto-widget');
    if (!container) return;

    var resto  = container.getAttribute('data-resto') || '';
    var color  = container.getAttribute('data-color') || '#2d6cb8';
    var theme  = container.getAttribute('data-theme') || 'light';
    var lang   = container.getAttribute('data-lang')  || 'fr';
    var height = container.getAttribute('data-height') || '680';

    // Build iframe URL
    var base = 'https://booking.r3sto.ch';
    var src  = base + '/' + encodeURIComponent(resto)
             + '?embed=1'
             + '&color=' + encodeURIComponent(color)
             + '&theme=' + encodeURIComponent(theme)
             + '&lang='  + encodeURIComponent(lang);

    // Create iframe
    var iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.style.cssText = 'width:100%;border:none;border-radius:16px;overflow:hidden;';
    iframe.style.height  = height + 'px';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('allow', 'payment');
    iframe.setAttribute('title', 'R3STO — Réservation en ligne');
    iframe.setAttribute('loading', 'lazy');

    // Auto-resize via postMessage
    window.addEventListener('message', function(e) {
      if (e.origin !== base) return;
      try {
        var data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data.type === 'r3sto-resize' && data.height) {
          iframe.style.height = data.height + 'px';
        }
      } catch(err) {}
    });

    // Clear container and inject
    container.innerHTML = '';
    container.appendChild(iframe);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
