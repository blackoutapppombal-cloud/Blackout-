(() => {
  const root = document.documentElement;
  const nativeCapacitor = Boolean(
    window.Capacitor &&
    (typeof window.Capacitor.isNativePlatform !== 'function' || window.Capacitor.isNativePlatform())
  );
  const touchLike = nativeCapacitor || navigator.maxTouchPoints > 0 ||
    window.matchMedia('(hover: none), (pointer: coarse)').matches || /Android/i.test(navigator.userAgent);

  if (!touchLike) return;
  root.classList.add('touch-ui');

  const style = document.createElement('style');
  style.dataset.touchFeedback = 'blackout';
  style.textContent = `
    html.touch-ui{-webkit-tap-highlight-color:transparent}
    html.touch-ui :where(button,a[href],[role="button"],[data-route],[data-category],[data-filter],[data-action],[data-product],[data-add],[data-buy-now],[data-favorite],[data-cart-qty],[data-remove],[data-checkout],[data-checkout-choice],[data-quick-filter],[data-catalog-view],[data-admin-view],[data-period],[data-chart-mode],[data-quick-view],[data-alert-type],[data-order-id],.product-card,.category-card,.service-card,.cart-item,.offer-card,.banner-card,.service-admin-card,.panel-hotspot,.hero-hotspot,.location-map,.location-whatsapp,.search-hit){
      -webkit-tap-highlight-color:transparent;touch-action:manipulation;
      transition:transform 150ms cubic-bezier(.2,.8,.2,1),filter 150ms ease,opacity 150ms ease,box-shadow 180ms ease,border-color 180ms ease,background-color 180ms ease
    }
    html.touch-ui :where(button,a[href],[role="button"],[data-route],[data-category],[data-filter],[data-action],[data-product],[data-add],[data-buy-now],[data-favorite],[data-cart-qty],[data-remove],[data-checkout],[data-checkout-choice],[data-quick-filter],[data-catalog-view],[data-admin-view],[data-period],[data-chart-mode],[data-quick-view],[data-alert-type],[data-order-id],.product-card,.category-card,.service-card,.cart-item,.offer-card,.banner-card,.service-admin-card,.panel-hotspot,.hero-hotspot,.location-map,.location-whatsapp,.search-hit).is-pressed{
      transform:scale(var(--touch-press-scale,.975))!important;filter:brightness(1.14);opacity:.92;will-change:transform,filter,opacity
    }
    html.touch-ui :where(.product-card,.category-card,.service-card,.cart-item,.offer-card,.banner-card,.service-admin-card,.panel-hotspot,.hero-hotspot,.location-map,.location-whatsapp).is-pressed{
      --touch-press-scale:.985;border-color:rgba(255,112,36,.9)!important;box-shadow:0 0 0 1px rgba(255,105,30,.45),0 0 24px rgba(255,85,20,.32),inset 0 0 18px rgba(255,125,45,.08)!important
    }
    html.touch-ui :where(.primary,.buy,.admin-primary,.service-request).is-pressed{
      box-shadow:0 0 26px rgba(255,85,24,.58)!important
    }
    html.touch-ui :where(.catalog-chip,.chip,.bottom-nav button,.admin-nav button,.period-filter button,.catalog-advanced button).is-pressed{
      border-color:#ff7024!important;color:#fff;box-shadow:0 0 18px rgba(255,91,24,.4)!important
    }
    html.touch-ui :where(button,a[href],[role="button"],[data-route],[data-category],[data-filter],[data-action],[data-product]).was-pressed{
      transition-duration:190ms
    }
    html.touch-ui :where(button:disabled,[aria-disabled="true"]){transform:none!important;filter:none!important;box-shadow:none!important}
    html.touch-ui .touch-page-enter{animation:touchPageIn 210ms cubic-bezier(.2,.8,.2,1) both}
    html.touch-ui .touch-cart-bump{animation:touchCartBump 240ms cubic-bezier(.2,.9,.25,1.35)}
    @keyframes touchPageIn{from{opacity:.72;transform:translateY(6px)}to{opacity:1;transform:none}}
    @keyframes touchCartBump{0%,100%{transform:scale(1)}45%{transform:scale(1.3);box-shadow:0 0 16px rgba(255,72,30,.78)}}
    @media(prefers-reduced-motion:reduce){html.touch-ui .touch-page-enter,html.touch-ui .touch-cart-bump{animation:none!important}html.touch-ui .is-pressed{transition:none!important}}
  `;
  document.head.appendChild(style);

  const directSelector = [
    'button', 'a[href]', '[role="button"]', '[data-route]', '[data-category]', '[data-filter]',
    '[data-action]', '[data-product]', '[data-add]', '[data-buy-now]', '[data-favorite]',
    '[data-cart-qty]', '[data-remove]', '[data-checkout]', '[data-checkout-choice]',
    '[data-quick-filter]', '[data-catalog-view]', '[data-admin-view]', '[data-period]',
    '[data-chart-mode]', '[data-quick-view]', '[data-alert-type]', '[data-order-id]',
    '.panel-hotspot', '.hero-hotspot', '.location-map', '.location-whatsapp', '.search-hit'
  ].join(',');
  const cardSelector = '.product-card,.category-card,.service-card,.cart-item,.offer-card,.banner-card,.service-admin-card';
  const pressed = new Map();
  const releaseTimers = new WeakMap();

  function interactiveTarget(node) {
    if (!(node instanceof Element)) return null;
    const direct = node.closest(directSelector);
    if (direct) {
      if (direct.matches(':disabled,[aria-disabled="true"],[data-touch-feedback="none"]')) return null;
      if (direct.matches('[data-product]')) return direct.closest('.product-card') || direct;
      return direct;
    }
    const card = node.closest(cardSelector);
    return card?.matches('[data-touch-feedback="none"]') ? null : card;
  }

  function clearPointer(pointerId, released = false) {
    const record = pressed.get(pointerId);
    if (!record) return;
    pressed.delete(pointerId);
    const target = record.target;
    if (!target?.isConnected) return;
    target.classList.remove('is-pressed');
    if (!released) return;
    const previousTimer = releaseTimers.get(target);
    if (previousTimer) clearTimeout(previousTimer);
    target.classList.add('was-pressed');
    const timer = setTimeout(() => {
      target.classList.remove('was-pressed');
      releaseTimers.delete(target);
    }, 180);
    releaseTimers.set(target, timer);
  }

  function clearAll() {
    [...pressed.keys()].forEach(pointerId => clearPointer(pointerId));
  }

  if (window.PointerEvent) {
    document.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' || event.isPrimary === false) return;
      const target = interactiveTarget(event.target);
      if (!target) return;
      clearPointer(event.pointerId);
      pressed.set(event.pointerId, { target, x: event.clientX, y: event.clientY });
      target.classList.remove('was-pressed');
      target.classList.add('is-pressed');
    }, { passive: true });
    document.addEventListener('pointermove', event => {
      const record = pressed.get(event.pointerId);
      if (record && Math.hypot(event.clientX - record.x, event.clientY - record.y) > 12) clearPointer(event.pointerId);
    }, { passive: true });
    document.addEventListener('pointerup', event => clearPointer(event.pointerId, true), { passive: true });
    document.addEventListener('pointercancel', event => clearPointer(event.pointerId), { passive: true });
  }

  let fallbackTarget = null;
  document.addEventListener('touchstart', event => {
    fallbackTarget = interactiveTarget(event.target);
    fallbackTarget?.classList.add('is-pressed');
  }, { passive: true });
  const clearFallback = () => {
    fallbackTarget?.classList.remove('is-pressed');
    fallbackTarget = null;
  };
  document.addEventListener('touchmove', clearFallback, { passive: true });
  document.addEventListener('touchend', clearFallback, { passive: true });
  document.addEventListener('touchcancel', clearFallback, { passive: true });

  document.addEventListener('scroll', event => {
    if (event.target === document || event.target === document.scrollingElement) clearAll();
  }, { passive: true, capture: true });
  window.addEventListener('blur', clearAll, { passive: true });
  window.addEventListener('pagehide', clearAll, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') clearAll();
  });

  const app = document.querySelector('#app');
  if (app) {
    let pageTimer;
    new MutationObserver(records => {
      if (!records.some(record => record.type === 'childList' && record.addedNodes.length)) return;
      clearTimeout(pageTimer);
      app.classList.remove('touch-page-enter');
      requestAnimationFrame(() => app.classList.add('touch-page-enter'));
      pageTimer = setTimeout(() => app.classList.remove('touch-page-enter'), 240);
    }).observe(app, { childList: true });
  }

  const cart = document.querySelector('.cart-count');
  if (cart) {
    new MutationObserver(() => {
      cart.classList.remove('touch-cart-bump');
      requestAnimationFrame(() => cart.classList.add('touch-cart-bump'));
      setTimeout(() => cart.classList.remove('touch-cart-bump'), 270);
    }).observe(cart, { childList: true, characterData: true, subtree: true });
  }
})();
