/* ---------------------------------------------------------------------------
   p5.waves snippets — i18n (NL/EN)
   ---------------------------------------------------------------------------
   Zelfde taal-laag-engine als p5.waves extended, maar zelfstandig (deze bib
   staat los). Elk vertaalbaar chrome-element draagt `data-i18n="sleutel"`;
   attributen (placeholder) via `data-i18n-attr="placeholder:sleutel"`.

   - Default = Nederlands; keuze onthouden in localStorage ('pws-lang').
   - Toggle-knop met id/class "lang-toggle" wisselt; het label toont de TAAL
     waar je naartoe schakelt (NL → toont "EN").
   - Bereik = chrome only (nav, hero, control-labels, footer). De specimens
     zelf (namen, rollen, notes, snippets) blijven Engels = de referentie-inhoud.
   - Dynamische readouts (visibleCount, activePrimitive, focusLabel, speed,
     motion-toggle) worden door script.js beheerd en hier bewust NIET getagd.
--------------------------------------------------------------------------- */
(function () {
  'use strict';

  var DICT = {
    nl: {
      'doc.title': 'p5.waves snippets — visueel vocabulaire',
      'lang.toggle': 'EN',
      'nav.specimens': 'Specimens',

      'hero.badge': 'P5.WAVES SPECIMEN-BIBLIOTHEEK',
      'hero.title': 'Eén wave-call.<br>Veel grafische taken.',
      'hero.lead': 'Een catalogus van kleine, herbruikbare beslissingen. Dezelfde <code>Waves.wave()</code> beweegt tekst, poort woorden, activeert grids, verschuift kleur en geeft interface-toestanden een zichtbaar ritme.',
      'hero.cta': 'BEKIJK SPECIMENS <span aria-hidden="true">↓</span>',

      'ctrl.search': 'ZOEKEN',
      'search.ph': 'grid, type, status, textuur…',
      'ctrl.category': 'CATEGORIE',
      'ctrl.primitive': 'PRIMITIEF',
      'ctrl.speed': 'SNELHEID',

      'sum.primitives': 'PRIMITIEVEN',
      'sum.visible': 'ZICHTBARE SPECIMENS',
      'sum.focus': 'FOCUS',

      'foot.note': 'Elk specimen is een klein, herbruikbaar codefragment — kopieer een kaart in <a href="https://editor.p5js.org/" target="_blank" rel="noopener">editor.p5js.org</a> en het draait.'
    },

    en: {
      'doc.title': 'p5.waves snippets — visual vocabulary',
      'lang.toggle': 'NL',
      'nav.specimens': 'Specimens',

      'hero.badge': 'P5.WAVES SPECIMEN LIBRARY',
      'hero.title': 'One wave call.<br>Many graphic jobs.',
      'hero.lead': 'A catalogue of small reusable decisions. The same <code>Waves.wave()</code> moves type, gates words, activates grids, shifts color, and gives interface states a visible rhythm.',
      'hero.cta': 'BROWSE SPECIMENS <span aria-hidden="true">↓</span>',

      'ctrl.search': 'SEARCH',
      'search.ph': 'grid, type, status, texture…',
      'ctrl.category': 'CATEGORY',
      'ctrl.primitive': 'PRIMITIVE',
      'ctrl.speed': 'SPEED',

      'sum.primitives': 'PRIMITIVES',
      'sum.visible': 'VISIBLE SPECIMENS',
      'sum.focus': 'FOCUS',

      'foot.note': 'Each specimen is a small, reusable code snippet — copy any card into <a href="https://editor.p5js.org/" target="_blank" rel="noopener">editor.p5js.org</a> and it runs.'
    }
  };

  var STORE = 'pws-lang';
  var lang = (function () {
    try { return localStorage.getItem(STORE) || 'nl'; } catch (e) { return 'nl'; }
  })();
  if (lang !== 'nl' && lang !== 'en') lang = 'nl';

  function t(key, l) {
    var d = DICT[l] || DICT.nl;
    return Object.prototype.hasOwnProperty.call(d, key) ? d[key] : null;
  }

  function apply(l) {
    if (l !== 'nl' && l !== 'en') l = 'nl';
    lang = l;
    document.documentElement.lang = l;

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var val = t(el.getAttribute('data-i18n'), l);
      if (val != null) el.innerHTML = val;
    });

    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var bits = pair.split(':');
        if (bits.length !== 2) return;
        var attr = bits[0].trim(), val = t(bits[1].trim(), l);
        if (val != null) el.setAttribute(attr, val);
      });
    });

    try { localStorage.setItem(STORE, l); } catch (e) {}
    document.dispatchEvent(new CustomEvent('pws:lang', { detail: { lang: l } }));
  }

  function toggle() { apply(lang === 'nl' ? 'en' : 'nl'); }

  function wire() {
    var btns = document.querySelectorAll('#lang-toggle, .lang-toggle');
    btns.forEach(function (b) { b.addEventListener('click', toggle); });
    apply(lang);
  }

  window.PWS_I18N = {
    apply: apply,
    toggle: toggle,
    t: function (key) { return t(key, lang); },
    get lang() { return lang; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
