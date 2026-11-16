(() => {
  'use strict';

  // This is a browser display preference, not account authentication or data access control.
  const key = 'pmj.log.owner-view';
  const root = document.documentElement;
  let enabled = false;
  try { enabled = localStorage.getItem(key) === '1'; } catch (err) {}

  function consumePreference() {
    const params = new URLSearchParams(location.hash.slice(1));
    const mode = params.get('owner');
    if (mode !== 'on' && mode !== 'off') return false;
    enabled = mode === 'on';
    try {
      if (enabled) localStorage.setItem(key, '1');
      else localStorage.removeItem(key);
    } catch (err) {}
    params.delete('owner');
    const rest = params.toString();
    history.replaceState(null, '', location.pathname + location.search + (rest ? '#' + rest : ''));
    return true;
  }

  consumePreference();
  root.dataset.owner = enabled ? 'true' : 'false';
  window.addEventListener('hashchange', () => {
    if (consumePreference()) location.reload();
  });
  window.addEventListener('storage', (event) => {
    if (event.key === key || event.key === null) location.reload();
  });
})();
