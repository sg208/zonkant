// Inline head script for Dutch routes, shipped as a string so the bytes tested
// in tests/unit/langRedirect.spec.ts are the bytes sent to the browser.
// WHY a script and not the module's redirect: it runs before first paint (no
// Dutch flash) and needs no cookie, so it must only act on a fresh document
// load: no same-origin referrer and `history.state === null`. A reload after
// in-app navigation keeps `history.state`, so a chosen language survives it.
export const langRedirectScript = `(function () {
  try {
    var path = location.pathname;
    if (path === '/en' || path.indexOf('/en/') === 0) return;
    if (history.state !== null) return;
    if (document.referrer) {
      try {
        if (new URL(document.referrer).origin === location.origin) return;
      } catch (error) { /* unparseable referrer counts as external */ }
    }
    var languages = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language];
    for (var i = 0; i < languages.length; i++) {
      if (/^nl(-|$)/i.test(languages[i] || '')) return;
    }
    location.replace('/en' + path + location.search + location.hash);
  } catch (error) { /* never block the page */ }
})();`;
