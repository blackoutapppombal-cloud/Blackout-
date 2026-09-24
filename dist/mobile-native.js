(() => {
  if (!window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;
  const viewport = window.visualViewport;
  let fullHeight = Math.max(window.innerHeight, viewport?.height || 0);
  let timer;
  const editable = node => node?.matches?.('input, textarea, select, [contenteditable="true"]');
  function updateKeyboard() {
    const active = document.activeElement;
    const visibleHeight = viewport?.height || window.innerHeight;
    if (!editable(active) && !document.documentElement.classList.contains('keyboard-open')) fullHeight = visibleHeight;
    const open = editable(active) && fullHeight - visibleHeight > 120;
    document.documentElement.classList.toggle('keyboard-open', open);
    if (open && active.getBoundingClientRect().bottom > visibleHeight - 16) {
      active.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(updateKeyboard, 80);
  };
  viewport?.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  document.addEventListener('focusin', schedule);
  document.addEventListener('focusout', schedule);
})();

