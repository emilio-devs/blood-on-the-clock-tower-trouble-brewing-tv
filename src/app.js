(() => {
  'use strict';

  const bundles = JSON.parse(document.getElementById('i18n-data').textContent);
  const localeIds = Object.keys(bundles);
  const defaultLocale = 'es';
  const defaultEdition = 'trouble-brewing';
  const storageKeys = {locale: 'botc-tv.locale', edition: 'botc-tv.edition'};

  const readPreference = key => {
    try { return localStorage.getItem(key); } catch { return null; }
  };
  const savePreference = (key, value) => {
    try { localStorage.setItem(key, value); } catch { /* file:// may deny storage */ }
  };
  const browserLanguage = navigator.languages?.[0] || navigator.language || '';
  const storedLocale = readPreference(storageKeys.locale);
  let currentLocale = resolveLocale({storedLocale, browserLanguage, supportedLocales: localeIds, defaultLocale});

  const bundle = () => bundles[currentLocale];
  const editionById = (locale, id) => bundles[locale].editions.find(edition => edition.id === id);
  const storedEdition = readPreference(storageKeys.edition);
  let currentEdition = resolveEdition({storedEdition, editions: bundles[currentLocale].editions, defaultEdition});

  const elements = {
    app: document.getElementById('app'),
    brand: document.getElementById('brand-name'),
    heading: document.getElementById('page-heading'),
    editionTrigger: document.getElementById('edition-trigger'),
    editionName: document.getElementById('edition-name'),
    editionMenu: document.getElementById('edition-menu'),
    languageTrigger: document.getElementById('language-trigger'),
    languageCode: document.getElementById('language-code'),
    languageMenu: document.getElementById('language-menu'),
    ambienceLabel: document.getElementById('ambience-label'),
    controls: document.querySelector('.controls'),
    play: document.getElementById('play'),
    next: document.getElementById('next'),
    volume: document.getElementById('volume'),
    volumeValue: document.getElementById('volume-value'),
    volumeBox: document.querySelector('.volume'),
    fullscreen: document.getElementById('fullscreen'),
    trackName: document.getElementById('track-name'),
    toast: document.getElementById('track-toast'),
    footer: document.getElementById('footer-copy'),
    footerEdition: document.getElementById('footer-edition'),
    metaDescription: document.getElementById('meta-description'),
    ogTitle: document.getElementById('og-title'),
    ogDescription: document.getElementById('og-description')
  };

  const tracks = [
    {title: 'Never Go Full Bard', mood: 'tavernFolk', artist: 'HitCtrl', license: 'CC BY 3.0', url: 'https://opengameart.org/sites/default/files/RPG%20Never%20Go%20Full%20Bard.mp3'},
    {title: 'Minstrel Dance', mood: 'medievalDance', artist: 'RandomMind', license: 'CC0', url: 'https://opengameart.org/sites/default/files/Minstrel_Dance_0.mp3'},
    {title: 'The Enchanted Forest of Min', mood: 'darkFolk', artist: 'HitCtrl', license: 'CC BY 3.0', url: 'https://opengameart.org/sites/default/files/RPG%20-%20The%20Enchanted%20Forest%20of%20Min.mp3'},
    {title: 'Woodland Fantasy', mood: 'violinLute', artist: 'Matthew Pablo', license: 'CC BY 3.0', url: 'https://lpc.opengameart.org/sites/default/files/Woodland%20Fantasy_0.mp3'},
    {title: 'Dragon Tail Tavern', mood: 'livelyTavern', artist: 'Jan125', license: 'CC BY 4.0', url: 'https://opengameart.org/sites/default/files/dragontailtavern.ogg'}
  ];

  const audio = new Audio();
  audio.id = 'ambient-audio';
  audio.className = 'player';
  document.body.append(audio);
  let trackIndex = Math.floor(Math.random() * tracks.length);
  let playing = false;
  let toastTimer = null;
  let failed = 0;
  let userPaused = false;
  let awaitingGesture = false;
  let idleTimer = null;

  audio.preload = 'auto';
  audio.volume = .18;
  audio.autoplay = true;

  const escapeHtml = value => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
  const format = (template, values) => Object.entries(values)
    .reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
  const refreshIcons = () => {
    if (window.lucide) window.lucide.createIcons({attrs: {'stroke-width': 2}});
  };
  const selectedEdition = () => editionById(currentLocale, currentEdition) || editionById(currentLocale, defaultEdition);
  const trackLabel = track => `${track.title} · ${bundle().trackMoods[track.mood]}`;

  function cardMarkup(role, featured = false) {
    const headingId = `role-${role.id}`;
    const lines = role.ability.map(line => `<span class="ability-line">${line}</span>`).join('');
    return `<article class="card${featured ? ' featured' : ''}" aria-labelledby="${headingId}"><div class="heading"><span class="icon" aria-hidden="true"><i data-lucide="${escapeHtml(role.icon)}"></i></span><h3 id="${headingId}">${escapeHtml(role.name)}</h3></div><p>${lines}</p></article>`;
  }

  function menuItem({label, selected, disabled = false, badge = ''}) {
    return `<button type="button" role="menuitemradio" aria-checked="${selected}"${disabled ? ' aria-disabled="true" disabled' : ''}><span class="menu-check" aria-hidden="true">${selected ? '✓' : ''}</span><span class="menu-label">${escapeHtml(label)}</span>${badge ? `<span class="coming-soon">${escapeHtml(badge)}</span>` : ''}</button>`;
  }

  function renderMenus() {
    const data = bundle();
    elements.editionMenu.innerHTML = data.editions.map(edition => menuItem({
      label: edition.name,
      selected: edition.id === currentEdition,
      disabled: edition.status !== 'available',
      badge: edition.status === 'coming-soon' ? data.ui.comingSoon : ''
    })).join('');
    [...elements.editionMenu.querySelectorAll('button')].forEach((button, index) => {
      const edition = data.editions[index];
      if (edition.status === 'available') button.addEventListener('click', () => selectEdition(edition.id));
    });

    elements.languageMenu.innerHTML = localeIds.map(locale => menuItem({
      label: bundles[locale].label,
      selected: locale === currentLocale
    })).join('');
    [...elements.languageMenu.querySelectorAll('button')].forEach((button, index) => {
      button.dataset.locale = localeIds[index];
      button.addEventListener('click', event => selectLocale(event.currentTarget.dataset.locale));
    });
  }

  function renderGroups(edition) {
    ['townsfolk', 'outsiders', 'minions', 'demon'].forEach(groupId => {
      const group = edition.groups.find(candidate => candidate.id === groupId);
      const title = document.getElementById(`${groupId}-title`);
      const note = document.getElementById(`${groupId}-note`);
      const grid = document.getElementById(groupId);
      title.textContent = group.label;
      note.innerHTML = group.note;
      note.hidden = !group.note;
      grid.innerHTML = group.roles.map(role => cardMarkup(role, groupId === 'demon')).join('');
    });
  }

  function setPlayState(active) {
    playing = active;
    const ui = bundle().ui;
    elements.play.innerHTML = `<i data-lucide="${active ? 'pause' : 'play'}"></i><span>${active ? ui.pause : ui.play}</span>`;
    const label = active ? ui.pauseMusic : ui.playMusic;
    elements.play.setAttribute('aria-label', label);
    elements.play.title = label;
    refreshIcons();
  }

  function updateFullscreenLabel() {
    const active = Boolean(document.fullscreenElement);
    const ui = bundle().ui;
    const label = active ? ui.exitFullscreen : ui.fullscreen;
    elements.fullscreen.innerHTML = `<i data-lucide="${active ? 'minimize' : 'maximize'}"></i><span>${label}</span>`;
    elements.fullscreen.setAttribute('aria-label', label);
    elements.fullscreen.title = label;
    refreshIcons();
  }

  function showTrack(showToast = false) {
    const label = trackLabel(tracks[trackIndex]);
    elements.trackName.textContent = label;
    if (showToast) {
      elements.toast.textContent = format(bundle().ui.nowPlaying, {track: label});
      elements.toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => elements.toast.classList.remove('show'), 2400);
    }
  }

  function renderApp() {
    closeMenus();
    const data = bundle();
    const edition = selectedEdition();
    const ui = data.ui;
    const title = format(ui.documentTitle, {edition: edition.name});

    document.documentElement.lang = currentLocale;
    document.documentElement.dataset.locale = currentLocale;
    document.title = title;
    elements.metaDescription.content = format(ui.metaDescription, {edition: edition.name});
    elements.ogTitle.content = format(ui.ogTitle, {edition: edition.name});
    elements.ogDescription.content = format(ui.ogDescription, {edition: edition.name});
    elements.brand.textContent = ui.brand;
    elements.heading.textContent = `${ui.brand} · ${edition.name}`;
    elements.editionName.textContent = edition.name;
    elements.editionTrigger.setAttribute('aria-label', `${ui.editionSelector}: ${edition.name}`);
    elements.languageCode.textContent = currentLocale.toUpperCase();
    elements.languageTrigger.setAttribute('aria-label', `${ui.languageSelector}: ${data.label}`);
    elements.ambienceLabel.textContent = ui.ambienceSelected;
    elements.controls.setAttribute('aria-label', ui.controls);
    elements.next.setAttribute('aria-label', ui.nextTrack);
    elements.next.title = ui.nextTrack;
    elements.volumeBox.title = ui.volume;
    elements.volume.setAttribute('aria-label', ui.volume);
    elements.footer.textContent = ui.footer;
    elements.footerEdition.textContent = edition.name;
    renderMenus();
    renderGroups(edition);
    setPlayState(playing);
    updateFullscreenLabel();
    if (audio.src) showTrack(false); else elements.trackName.textContent = ui.preparingAmbience;
    refreshIcons();
  }

  function closeMenu(trigger, menu, restoreFocus = false) {
    const wasOpen = menu.classList.contains('open');
    menu.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
    if (wasOpen && restoreFocus) trigger.focus();
  }

  function closeMenus(restoreFocus = false) {
    closeMenu(elements.editionTrigger, elements.editionMenu, restoreFocus);
    closeMenu(elements.languageTrigger, elements.languageMenu, restoreFocus);
  }

  function openMenu(trigger, menu) {
    closeMenus();
    menu.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
  }

  function toggleMenu(trigger, menu) {
    if (menu.classList.contains('open')) closeMenu(trigger, menu);
    else openMenu(trigger, menu);
  }

  function focusMenuItem(menu, position = 'first') {
    const items = [...menu.querySelectorAll('button:not(:disabled)')];
    if (!items.length) return;
    (position === 'last' ? items.at(-1) : items[0]).focus();
  }

  function handleMenuKeyboard(event, trigger, menu) {
    const items = [...menu.querySelectorAll('button:not(:disabled)')];
    const currentIndex = items.indexOf(document.activeElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu(trigger, menu, true);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      items[(currentIndex + 1 + items.length) % items.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      items[(currentIndex - 1 + items.length) % items.length]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      items.at(-1)?.focus();
    }
  }

  function wireDropdown(trigger, menu) {
    trigger.addEventListener('click', () => toggleMenu(trigger, menu));
    trigger.addEventListener('keydown', event => {
      if (['ArrowDown', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        openMenu(trigger, menu);
        focusMenuItem(menu);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        openMenu(trigger, menu);
        focusMenuItem(menu, 'last');
      }
    });
    menu.addEventListener('keydown', event => handleMenuKeyboard(event, trigger, menu));
  }

  function selectLocale(locale) {
    if (!localeIds.includes(locale) || locale === currentLocale) {
      closeMenus(true);
      return;
    }
    currentLocale = locale;
    currentEdition = resolveEdition({storedEdition: currentEdition, editions: bundles[currentLocale].editions, defaultEdition});
    savePreference(storageKeys.locale, currentLocale);
    savePreference(storageKeys.edition, currentEdition);
    renderApp();
    elements.languageTrigger.focus();
  }

  function selectEdition(editionId) {
    if (editionById(currentLocale, editionId)?.status !== 'available') return;
    currentEdition = editionId;
    savePreference(storageKeys.edition, currentEdition);
    renderApp();
    elements.editionTrigger.focus();
  }

  function loadTrack(showToast = true) {
    audio.src = tracks[trackIndex].url;
    audio.load();
    showTrack(showToast);
  }

  async function playCurrent() {
    if (userPaused) return;
    try {
      await audio.play();
      awaitingGesture = false;
    } catch {
      awaitingGesture = true;
    }
  }

  async function toggleMusic() {
    if (playing) {
      userPaused = true;
      audio.pause();
    } else {
      userPaused = false;
      if (!audio.src) loadTrack(false);
      await playCurrent();
    }
  }

  async function nextTrack(automatic = false) {
    const shouldPlay = automatic || playing || !userPaused;
    trackIndex = (trackIndex + 1) % tracks.length;
    loadTrack();
    if (shouldPlay) await playCurrent();
  }

  wireDropdown(elements.editionTrigger, elements.editionMenu);
  wireDropdown(elements.languageTrigger, elements.languageMenu);
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('.dropdown')) closeMenus();
    if (!event.target.closest('#play') && awaitingGesture && !userPaused) playCurrent();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenus(true);
    if (awaitingGesture && !userPaused) playCurrent();
  });

  audio.addEventListener('play', () => { failed = 0; setPlayState(true); });
  audio.addEventListener('pause', () => { if (!audio.ended || userPaused) setPlayState(false); });
  audio.addEventListener('ended', () => nextTrack(true));
  audio.addEventListener('error', () => { if (failed++ < tracks.length) nextTrack(true); else setPlayState(false); });
  elements.play.addEventListener('click', toggleMusic);
  elements.next.addEventListener('click', () => nextTrack(false));
  elements.volume.addEventListener('input', event => {
    elements.volumeValue.textContent = `${event.target.value}%`;
    audio.volume = Number(event.target.value) / 100;
  });
  elements.fullscreen.addEventListener('click', async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  });
  document.addEventListener('fullscreenchange', updateFullscreenLabel);

  const wake = () => {
    elements.app.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => elements.app.classList.add('idle'), 4000);
  };
  addEventListener('mousemove', wake);
  addEventListener('touchstart', wake);

  renderApp();
  document.documentElement.dataset.ready = 'true';
  loadTrack(false);
  playCurrent();
  wake();
})();
