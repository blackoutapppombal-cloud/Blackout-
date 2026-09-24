(() => {
  if (window.BLACKOUT_APP_MODE_RESPONSIVE) return;
  const root = document.documentElement;
  const body = document.body;
  const app = document.querySelector('#app');
  let resizeFrame = 0;

  function syncRoute() {
    if (typeof state !== 'object' || !state) return;
    body.dataset.appRoute = state.route || location.hash.slice(1) || 'home';
  }

  function syncViewport() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      const viewport = window.visualViewport;
      const height = Math.max(1, Math.round(viewport?.height || window.innerHeight));
      root.style.setProperty('--app-viewport-height', height + 'px');
      root.dataset.orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      syncRoute();
    });
  }

  if (app) {
    new MutationObserver(syncRoute).observe(app, {childList:true});
  }
  window.addEventListener('hashchange', syncRoute, {passive:true});
  window.addEventListener('popstate', () => queueMicrotask(syncRoute));
  window.addEventListener('resize', syncViewport, {passive:true});
  window.addEventListener('orientationchange', syncViewport, {passive:true});
  window.visualViewport?.addEventListener('resize', syncViewport, {passive:true});
  window.visualViewport?.addEventListener('scroll', syncViewport, {passive:true});

  syncRoute();
  syncViewport();
  window.BLACKOUT_APP_MODE_RESPONSIVE = {syncRoute, syncViewport};
})();
