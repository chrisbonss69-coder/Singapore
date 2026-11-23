(async () => {
  'use strict';

  if (typeof connectOriginalVideos === 'function') await connectOriginalVideos();

  const cues = [
    { scene: 1, view: 'earth', title: 'AI and our future' },
    { scene: 2, view: 'exhibit' },
    { scene: 3, view: 'creator-intro', title: 'From building to explaining' },
    { scene: 4, view: 'project', title: 'My proposed experiment', detail: 'Optics · Interference' },
    { scene: 5, view: 'flight', title: 'Across the globe', detail: 'Toulouse → Singapore' },
    { scene: 6, view: 'video', media: 'nus', title: 'National University of Singapore', detail: 'Kent Ridge campus' },
    { scene: 6, view: 'wing', title: 'My research destination', detail: 'Scientific document processing' },
    { scene: 7, view: 'video', media: 'city', title: 'Chinatown', detail: 'Temples beside modern towers' },
    { scene: 8, view: 'video', media: 'garden', title: 'Garden Rhapsody', detail: 'Gardens by the Bay' },
  ];

  const exhibits = [
    { until: 5.4, mode: 'health', title: 'Healthcare', detail: 'Spot signs of disease' },
    { until: 12.4, mode: 'book', title: 'Education', detail: 'Help students practise' },
    { until: Infinity, mode: 'park', title: 'Environment', detail: 'Forecast wind power' },
  ];

  const cityPlaces = [
    { until: 4.875, title: 'Chinatown', detail: 'Temples beside modern towers' },
    { until: 8.925, title: 'Marina Bay', detail: 'The waterfront at night' },
    { until: 15.075, title: 'Spectra', detail: 'Light and water show' },
    { until: Infinity, title: 'Gardens by the Bay', detail: 'The illuminated Supertrees' },
  ];

  const byId = id => document.getElementById(id);
  const visual = byId('visual');
  const earth = byId('earth');
  const video = byId('video');
  const wash = byId('arrival-wash');
  const exhibit = byId('exhibit');
  const digitalCanvas = byId('digital');
  const bookCanvas = byId('book');
  const bookFallback = byId('book-fallback');
  const environmentCanvas = byId('environment');
  const robotCanvas = byId('wing-robot');
  const guide = byId('guide');
  const views = [...visual.querySelectorAll('.layer')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const localURLs = new Map();
  const errors = [];
  const routeSeconds = 4.15;
  const digital = createDigitalScene(digitalCanvas);
  let book;
  let environment;
  let wingRobot;
  let exhibitMode = '';
  let index = 0;
  let paused = false;
  let ready = false;
  let elapsed = 0;
  let lastFrame = performance.now();
  let currentMedia = '';
  let loadGeneration = 0;
  let flightTransition = null;
  let flightLanded = false;
  let creatorIndex = 0;
  let displayedTime = 0;
  let cityLabel = '';

  for (const img of visual.querySelectorAll('[data-art]')) img.src = ASSETS[img.dataset.art];

  const wingPhotographs = byId('wing-photos');
  const wingCredits = byId('wing-photo-credits');
  for (const photo of WING_PHOTOS) {
    const figure = document.createElement('figure');
    const img = document.createElement('img');
    const caption = document.createElement('figcaption');
    img.src = ASSETS[photo.key];
    img.alt = photo.description;
    caption.textContent = photo.caption;
    figure.append(img, caption);
    wingPhotographs.append(figure);

    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = photo.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = photo.description + ' · WING at NUS Computing';
    item.append(link);
    wingCredits.append(item);
  }
  wingCredits.hidden = !WING_PHOTOS.length;

  function drawHealthTrace() {
    const ctx = byId('ecg').getContext('2d');
    if (!ctx) return;
    const pulse = [
      [0, 0], [32, 0], [45, -11], [57, 0], [73, 0], [82, 14], [94, -78],
      [106, 47], [120, 0], [145, 0], [159, -17], [174, -22], [191, -6], [204, 0],
    ];
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#7dffcf';
    ctx.shadowBlur = 13;
    ctx.shadowColor = '#3ffab4';
    ctx.beginPath();
    ctx.moveTo(18, 130);
    for (const origin of [43, 300]) {
      for (const [x, y] of pulse) ctx.lineTo(origin + x, 130 + y);
    }
    ctx.lineTo(620, 130);
    ctx.stroke();
  }
  drawHealthTrace();

  if (CREATOR_CLIPS.length) {
    byId('creator-note').textContent = 'Short excerpts from X, embedded for offline playback.';
    const credits = byId('creator-credits');
    credits.hidden = false;
    for (const clip of CREATOR_CLIPS) {
      const entry = document.createElement('li');
      const link = document.createElement('a');
      link.textContent = clip.credit + ' · ' + clip.title;
      link.href = clip.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      entry.append(link);
      credits.append(entry);
    }
  }

  function localURL(key) {
    const asset = ASSETS[key];
    if (!asset.startsWith('data:')) return asset;
    if (!localURLs.has(key)) {
      const [header, data] = asset.split(',', 2);
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      localURLs.set(key, URL.createObjectURL(new Blob([bytes], { type: header.slice(5, header.indexOf(';')) })));
    }
    return localURLs.get(key);
  }

  function sendGlobe(type, data) {
    earth.contentWindow?.postMessage({ type, ...data }, '*');
  }

  function report(message) {
    errors.push(message);
    const notice = byId('notice');
    notice.textContent = message;
    notice.hidden = false;
    console.error(message);
  }

  function caption(title, detail = '') {
    byId('title').textContent = title;
    byId('detail').textContent = detail;
  }

  function createExhibitModel(create, canvas) {
    try {
      return create(canvas);
    } catch (error) {
      console.warn('A 3D exhibit could not be initialized.', error);
      return null;
    }
  }

  function updateExhibit() {
    const { mode, title, detail } = exhibits.find(entry => elapsed < entry.until);
    if (mode === exhibitMode) return;
    exhibitMode = mode;
    exhibit.dataset.mode = mode;
    byId('health-exhibit').hidden = mode !== 'health';
    if (mode === 'book' && book === undefined) {
      book = createExhibitModel(createMatrixBook, bookCanvas);
    }
    if (mode === 'park' && environment === undefined) {
      environment = createExhibitModel(createEnvironmentExhibit, environmentCanvas);
    }
    bookCanvas.hidden = mode !== 'book' || !book;
    bookFallback.hidden = mode !== 'book' || !!book;
    environmentCanvas.hidden = mode !== 'park' || !environment;
    book?.setActive(mode === 'book');
    book?.setPaused(paused);
    environment?.setActive(mode === 'park');
    environment?.setPaused(paused);
    caption(title, detail);
  }

  function playVideo() {
    if (paused || video.hidden || video.ended) return;
    const generation = loadGeneration;
    video.play().catch(error => {
      if (generation === loadGeneration && error.name !== 'AbortError' && !paused) {
        report('The local video could not start.');
      }
    });
  }

  function loadVideo(key, { loop = false, flight = false, creator = false } = {}) {
    const generation = ++loadGeneration;
    currentMedia = key;
    displayedTime = 0;
    video.pause();
    video.hidden = false;
    video.loop = loop;
    video.className = 'layer';
    video.classList.toggle('garden', key === 'garden');
    video.classList.toggle('creator', creator);
    video.style.opacity = flight ? '0' : '';
    const show = () => {
      if (generation !== loadGeneration) return;
      if (!flight) {
        video.classList.add('ready');
        playVideo();
      }
    };
    if (video.dataset.key === key && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      video.currentTime = 0;
      show();
    } else {
      video.dataset.key = key;
      video.addEventListener('loadeddata', show, { once: true });
      video.src = localURL(key);
      video.load();
    }
  }

  function showCreator() {
    const clip = CREATOR_CLIPS[creatorIndex];
    caption(clip.title, clip.credit);
    loadVideo(clip.key, { creator: true });
  }

  function go(position) {
    if (!Number.isInteger(position) || position < 0 || position >= cues.length) return;
    ++loadGeneration;
    index = position;
    elapsed = 0;
    lastFrame = performance.now();
    flightTransition = null;
    flightLanded = false;
    cityLabel = '';
    currentMedia = '';
    video.pause();
    video.className = 'layer';
    video.style.opacity = '';
    earth.style.opacity = '';
    wash.style.opacity = '0';
    byId('notice').hidden = true;

    const cue = cues[index];
    const flight = cue.view === 'flight';
    const globe = cue.view === 'earth' || flight;
    visual.toggleAttribute('data-flight', flight);
    let view = globe ? 'earth' : cue.view;
    if (view === 'creator-intro' && CREATOR_CLIPS.length) view = 'video';
    for (const layer of views) layer.hidden = layer.id !== view;
    const theme = { 'creator-intro': 'bridge', exhibit: 'exhibit', wing: 'wing' }[view];
    digitalCanvas.hidden = !theme;
    if (theme) digital.setTheme(theme);
    digital.setActive(Boolean(theme));
    book?.setActive(false);
    environment?.setActive(false);
    if (view === 'wing' && wingRobot === undefined) {
      wingRobot = createExhibitModel(createWingRobot, robotCanvas);
    }
    wingRobot?.setActive(view === 'wing');
    wingRobot?.setPaused(paused);
    exhibitMode = '';

    if (cue.view === 'exhibit') updateExhibit();
    else caption(cue.title, cue.detail);
    const total = cues.at(-1).scene;
    byId('count').textContent = cue.scene + ' / ' + total;
    byId('prev').disabled = index === 0;
    byId('next').disabled = index === cues.length - 1;
    byId('progress').style.width = cue.scene / total * 100 + '%';
    document.title = 'Singapore · ' + cue.scene + ' / ' + total;

    sendGlobe('journey', { progress: 0 });
    sendGlobe('satellite', { visible: cue.view === 'earth' });
    sendGlobe('pause', { paused: paused || reducedMotion });
    sendGlobe('globe-active', { active: globe });

    if (flight) {
      loadVideo('aerial', { flight: true });
    } else if (cue.media) {
      loadVideo(cue.media, { loop: cue.media !== 'city' });
    } else if (cue.view === 'creator-intro' && CREATOR_CLIPS.length) {
      creatorIndex = 0;
      showCreator();
    }
  }

  function pause(value = !paused) {
    paused = value;
    lastFrame = performance.now();
    document.body.classList.toggle('is-paused', paused);
    const button = byId('pause');
    button.setAttribute('aria-label', paused ? 'Resume' : 'Pause');
    button.title = paused ? 'Resume (Space)' : 'Pause (Space)';
    button.setAttribute('aria-pressed', String(paused));
    book?.setPaused(paused);
    environment?.setPaused(paused);
    wingRobot?.setPaused(paused);
    digital.setPaused(paused);
    sendGlobe('pause', { paused: paused || reducedMotion });
    if (paused) video.pause();
    else if (currentMedia && (cues[index].view !== 'flight' || flightLanded)) playVideo();
  }

  function updateFlight() {
    if (flightTransition === null) {
      const t = Math.min(1, elapsed / routeSeconds);
      sendGlobe('journey', { progress: t * t * (3 - 2 * t) });
      if (t === 1 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        flightTransition = elapsed;
      }
      return;
    }
    if (flightTransition === Infinity) return;

    const transitionTime = elapsed - flightTransition;
    if (transitionTime < .30) {
      wash.style.opacity = String(transitionTime / .30);
      return;
    }
    if (!flightLanded) {
      flightLanded = true;
      earth.style.opacity = '0';
      video.style.opacity = '1';
      caption('Singapore', 'Arrival over Gardens by the Bay');
      sendGlobe('globe-active', { active: false });
      playVideo();
    }
    wash.style.opacity = String(1 - Math.min(1, Math.max(0, transitionTime - .43) / .52));
    if (transitionTime >= .95) flightTransition = Infinity;
  }

  function frame(now) {
    if (!paused) elapsed += (now - lastFrame) / 1000;
    lastFrame = now;
    if (!paused) {
      if (cues[index].view === 'flight') updateFlight();
      if (cues[index].view === 'exhibit') updateExhibit();
    }
    requestAnimationFrame(frame);
  }

  function updateCity(time) {
    if (currentMedia !== 'city') return;
    const place = cityPlaces.find(entry => time < entry.until);
    if (place && place.title !== cityLabel) {
      cityLabel = place.title;
      caption(place.title, place.detail);
      video.classList.toggle('garden', place.title === 'Gardens by the Bay');
    }
  }

  if (video.requestVideoFrameCallback) {
    function onVideoFrame(_now, metadata) {
      displayedTime = metadata.mediaTime;
      updateCity(displayedTime);
      video.requestVideoFrameCallback(onVideoFrame);
    }
    video.requestVideoFrameCallback(onVideoFrame);
  } else {
    video.addEventListener('timeupdate', () => updateCity(displayedTime = video.currentTime));
  }

  video.addEventListener('ended', () => {
    if (cues[index].view === 'creator-intro' && creatorIndex + 1 < CREATOR_CLIPS.length) {
      creatorIndex += 1;
      showCreator();
    }
  });
  video.addEventListener('error', () => {
    if (currentMedia && video.error) report('A local video could not be decoded.');
  });

  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      report('Fullscreen is unavailable in this browser window.');
    }
  }

  byId('prev').onclick = () => go(index - 1);
  byId('next').onclick = () => go(index + 1);
  byId('pause').onclick = () => pause();
  byId('full').onclick = fullscreen;
  byId('info').onclick = () => guide.showModal();
  byId('close').onclick = () => guide.close();
  visual.onclick = () => go(index + 1);
  window.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if (guide.open) {
      if (key === 'h') guide.close();
      return;
    }
    if (['arrowright', 'pagedown'].includes(key) || (key === 'enter' && event.target.tagName !== 'BUTTON')) go(index + 1);
    else if (['arrowleft', 'pageup'].includes(key)) go(index - 1);
    else if (event.code === 'Space') pause();
    else if (key === 'f') fullscreen();
    else if (key === 'r') go(0);
    else if (key === 'h') guide.showModal();
    else return;
    event.preventDefault();
  });

  earth.addEventListener('load', () => {
    ready = true;
    byId('boot').hidden = true;
    const current = cues[index];
    sendGlobe('satellite', { visible: current.view === 'earth' });
    sendGlobe('pause', { paused: paused || reducedMotion });
    sendGlobe('globe-active', { active: current.view === 'earth' || current.view === 'flight' });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause(true);
  });
  window.addEventListener('error', event => report(event.message));
  window.addEventListener('unhandledrejection', event => report(String(event.reason)));

  window.presentation = {
    go,
    next: () => go(index + 1),
    previous: () => go(index - 1),
    pause,
    cues,
    seek(time) { video.currentTime = time; },
    get state() {
      const cue = cues[index];
      return {
        index, scene: cue.scene, paused, elapsed, ready, kind: cue.view, mode: exhibitMode,
        title: byId('title').textContent, video: currentMedia, time: video.currentTime, displayedTime,
        duration: video.duration, videoReady: video.readyState, loop: video.loop, flightLanded,
        matrixBook3D: !!book, environment3D: !!environment, wingRobot3D: !!wingRobot,
        creatorClips: CREATOR_CLIPS.length, errors: [...errors],
      };
    },
  };

  if (EARTH_DOCUMENT) earth.srcdoc = EARTH_DOCUMENT;
  else earth.src = 'src/earth.html';
  go(0);
  requestAnimationFrame(frame);
})().catch(error => {
  console.error(error);
  document.getElementById('boot-message').textContent =
    'Le diaporama ne démarre pas dans cet aperçu. Ouvre le lanceur Full HD dans Firefox ou Chrome.';
});
