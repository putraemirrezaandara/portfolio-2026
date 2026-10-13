// Scroll reveal — works on any page with .reveal elements
const reveals = document.querySelectorAll('.reveal');
if (reveals.length) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        e.target.style.transitionDelay = (i * 0.05) + 's';
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  reveals.forEach(el => observer.observe(el));
}

// Skill bars — only on index
const fills = document.querySelectorAll('.skill-fill');
if (fills.length) {
  const barObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.width = e.target.dataset.width;
        barObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  fills.forEach(f => { f.style.width = '0'; barObserver.observe(f); });
}

// Media modal (video + Sketchfab) — only on pages with a #mediaModal element.
// Clicks are delegated so cards added later (the Sketchfab library) work too.
const modal = document.getElementById('mediaModal');
if (modal) {
  const modalContent = modal.querySelector('.media-modal-content');
  const modalClose = modal.querySelector('.media-modal-close');
  const mediaCardSelector = '.project-card[data-video], .project-card[data-sketchfab], [data-image]';

  const showModal = (el, isImage = false) => {
    modalContent.replaceChildren(el);
    modal.classList.toggle('media-modal--image', isImage);
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  };

  // Full-size artwork lightbox (graphic design showcase)
  const openImageModal = (src, alt) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt || '';
    showModal(img, true);
  };

  const openVideoModal = (src) => {
    const video = document.createElement('video');
    video.controls = true;
    video.playsInline = true;
    video.autoplay = true;
    video.src = src;
    showModal(video);
  };

  const openSketchfabModal = (modelId) => {
    if (!/^[0-9a-f]{32}$/i.test(modelId)) return;
    const iframe = document.createElement('iframe');
    iframe.src = `https://sketchfab.com/models/${modelId}/embed?autostart=1&ui_theme=dark&ui_infos=0&ui_inspector=0&ui_stop=0`;
    iframe.allow = 'autoplay; fullscreen; xr-spatial-tracking';
    iframe.allowFullscreen = true;
    showModal(iframe);
  };

  const closeModal = () => {
    modalContent.replaceChildren();
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  };

  const openCard = (card) => {
    if (card.dataset.video) openVideoModal(card.dataset.video);
    else if (card.dataset.sketchfab) openSketchfabModal(card.dataset.sketchfab);
    else if (card.dataset.image) openImageModal(card.dataset.image, card.dataset.title);
  };

  document.addEventListener('click', (e) => {
    const card = e.target.closest(mediaCardSelector);
    if (!card) return;
    e.preventDefault(); // image items are links to the full file when JS is off
    openCard(card);
  });

  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
    if (e.key === 'Enter' && e.target.matches && e.target.matches(mediaCardSelector)) openCard(e.target);
  });
}

// Sketchfab library — loads a user's public models live (most viewed first).
// The cards already in the HTML are a static fallback, replaced once the API answers.
const library = document.getElementById('sketchfabLibrary');
if (library && library.dataset.user) {
  const moreBtn = document.getElementById('libraryMore');
  const statusEl = document.getElementById('libraryStatus');
  const FIRST_BATCH = 13; // 1 featured + 4 rows of 3
  const NEXT_BATCH = 12;
  const seen = new Set();
  let queue = [];
  let shown = 0;
  let nextUrl = 'https://api.sketchfab.com/v3/models?count=24&sort_by=-viewCount&user=' +
    encodeURIComponent(library.dataset.user);

  // "TOGO SOFA GREEN VELVET" -> "Togo Sofa Green Velvet"; codes like LC2 stay as they are
  const tidyName = (name) => {
    if (name !== name.toUpperCase()) return name;
    return name.split(' ').map(w =>
      /\d/.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()
    ).join(' ');
  };

  const pickThumb = (model, minWidth) => {
    const images = ((model.thumbnails || {}).images || [])
      .filter(i => i.url && i.url.includes('/models/')) // skip Sketchfab's generic placeholder
      .sort((a, b) => a.width - b.width);
    if (!images.length) return null;
    return (images.find(i => i.width >= minWidth) || images[images.length - 1]).url;
  };

  const fetchPage = async () => {
    const res = await fetch(nextUrl);
    if (!res.ok) throw new Error('Sketchfab API ' + res.status);
    const data = await res.json();
    nextUrl = data.next || null;
    (data.results || []).forEach(m => {
      if (seen.has(m.uid) || !pickThumb(m, 720)) return;
      seen.add(m.uid);
      queue.push(m);
    });
  };

  const buildCard = (model, index) => {
    const featured = index === 0;
    const name = tidyName(model.name || 'Untitled');

    const card = document.createElement('div');
    card.className = 'project-card' + (featured ? ' project-card--featured' : '');
    card.dataset.category = '3d';
    card.dataset.sketchfab = model.uid;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'View ' + name + ' in 3D');

    const meta = document.createElement('span');
    meta.className = 'project-meta';
    meta.textContent = String(index + 1).padStart(2, '0') + (featured ? ' — Featured' : '');

    const img = document.createElement('img');
    img.className = 'project-media';
    img.loading = 'lazy';
    img.alt = name + ' — 3D model';
    img.addEventListener('error', () => { img.style.display = 'none'; });
    img.src = pickThumb(model, featured ? 1024 : 720);

    const view = document.createElement('div');
    view.className = 'project-view';
    view.setAttribute('aria-hidden', 'true');
    view.textContent = 'VIEW 3D';

    const inner = document.createElement('div');
    inner.className = 'project-inner';
    const title = document.createElement('h3');
    title.className = 'project-name';
    title.textContent = name;
    const tag = document.createElement('p');
    tag.className = 'project-tag';
    tag.textContent = (model.publishedAt || '').slice(0, 4) || '3D Model';
    inner.append(title, tag);

    card.append(meta, img, view, inner);
    return card;
  };

  const renderBatch = async (size) => {
    while (queue.length < size && nextUrl) await fetchPage();
    const batch = queue.splice(0, size);
    if (shown === 0 && batch.length) library.replaceChildren(); // drop the static fallback
    batch.forEach(m => library.appendChild(buildCard(m, shown++)));
    if (moreBtn) moreBtn.hidden = !(queue.length || nextUrl);
    if (statusEl) statusEl.textContent = shown ? `Showing ${shown} models` : '';
  };

  const loadMore = async (size) => {
    if (moreBtn) moreBtn.disabled = true;
    try {
      await renderBatch(size);
    } catch (err) {
      // Keep whatever is already on the page; point to the full profile instead
      if (moreBtn) moreBtn.hidden = true;
      if (statusEl) statusEl.textContent = 'Could not load more models right now — the full library is on Sketchfab.';
    } finally {
      if (moreBtn) moreBtn.disabled = false;
    }
  };

  if (moreBtn) moreBtn.addEventListener('click', () => loadMore(NEXT_BATCH));
  loadMore(FIRST_BATCH);
}

// Vertical split showcase — scroll-driven animation (graphic design page).
// 1) each piece flips up from a tilted, half-size state as it scrolls into view
// 2) the pinned heading grows, tints, then settles back while the work passes over it
// Both ease toward the scroll position instead of snapping to it.
const splitStream = document.querySelector('.split-stream');
if (splitStream && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const heading = splitStream.querySelector('.split-heading');
  const cols = splitStream.querySelector('.split-cols');
  const wide = window.matchMedia('(min-width: 901px)'); // heading is only pinned on desktop
  const items = Array.from(splitStream.querySelectorAll('.split-item'))
    .map(el => ({ el, cur: 1, target: 1, start: 0, end: 1, active: false }));
  const head = { cur: 0, target: 0, start: 0, end: 1, active: false };
  const INK = [51, 51, 51];      // heading colour at rest (#333)
  const ACCENT = [52, 120, 246]; // brand blue
  let primed = false;
  let ticking = false;

  const clamp01 = (n) => Math.min(1, Math.max(0, n));
  const mix = (a, b, t) => a + (b - a) * t;

  // Position in the document, ignoring any transform we have applied
  const docTop = (el) => {
    let y = 0;
    for (let node = el; node; node = node.offsetParent) y += node.offsetTop;
    return y;
  };

  const measure = () => {
    const vh = window.innerHeight;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);

    items.forEach(item => {
      const top = docTop(item.el);
      const height = item.el.offsetHeight;
      item.start = top - vh - 100;                              // just below the viewport
      item.end = Math.min(top + height - vh / 2, maxScroll);    // bottom edge at mid-screen
      // Pieces already on screen when the page opens stay flat
      item.active = top > vh * 0.9 && item.end - item.start > 80;
    });

    const colsTop = docTop(cols);
    head.start = colsTop - (vh / 2 - 200);
    head.end = Math.min(colsTop + cols.offsetHeight - vh, maxScroll);
    head.active = wide.matches && head.end - head.start > 200;
  };

  const setTargets = () => {
    const y = window.scrollY;
    items.forEach(item => {
      item.target = item.active ? clamp01((y - item.start) / (item.end - item.start)) : 1;
    });
    head.target = head.active ? clamp01((y - head.start) / (head.end - head.start)) : 0;
  };

  const paintItem = (item) => {
    if (item.cur >= 0.999) {
      item.el.style.transform = '';
      item.el.style.opacity = '';
      return;
    }
    const tilt = 90 * (1 - item.cur);
    const scale = 0.5 + 0.5 * item.cur;
    item.el.style.transform = `perspective(4000px) rotateX(${tilt.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
    item.el.style.opacity = (0.7 + 0.3 * item.cur).toFixed(3);
  };

  // Heading timeline: grow + fade + lean → grow more + turn accent → hold → settle back
  const paintHeading = () => {
    const q = head.cur;
    if (!head.active || q <= 0.001) {
      heading.style.transform = '';
      heading.style.opacity = '';
      heading.style.color = '';
      return;
    }
    let scale, opacity, skew, tint;
    if (q < 0.2) {
      const t = q / 0.2;
      scale = mix(1, 1.5, t); opacity = mix(1, 0.5, t); skew = mix(0, 5, t); tint = 0;
    } else if (q < 0.4) {
      const t = (q - 0.2) / 0.2;
      scale = mix(1.5, 2.5, t); opacity = 0.5; skew = mix(5, 0, t); tint = t;
    } else if (q < 0.8) {
      scale = 2.5; opacity = 0.5; skew = 0; tint = 1;
    } else {
      const t = (q - 0.8) / 0.2;
      scale = mix(2.5, 1, t); opacity = mix(0.5, 1, t); skew = 0; tint = 1 - t;
    }
    const rgb = INK.map((c, i) => Math.round(mix(c, ACCENT[i], tint)));
    heading.style.transform = `scale(${scale.toFixed(4)}) skewX(${skew.toFixed(2)}deg)`;
    heading.style.opacity = opacity.toFixed(3);
    heading.style.color = `rgb(${rgb.join(',')})`;
  };

  const ease = (state, rate) => {
    const gap = state.target - state.cur;
    if (Math.abs(gap) < 0.0008) { state.cur = state.target; return false; }
    state.cur += gap * rate;
    return true;
  };

  const frame = () => {
    ticking = false;
    setTargets();
    let moving = false;
    items.forEach(item => { if (ease(item, 0.09)) moving = true; paintItem(item); });
    if (ease(head, 0.12)) moving = true;
    paintHeading();
    if (moving) requestFrame();
  };

  const requestFrame = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  };

  const refresh = () => {
    measure();
    if (!primed) {
      // First layout: start exactly at the scroll position, no catch-up animation
      setTargets();
      items.forEach(item => { item.cur = item.target; });
      head.cur = head.target;
      primed = true;
    }
    requestFrame();
  };

  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', refresh);
  window.addEventListener('load', refresh);
  wide.addEventListener('change', refresh);
  // Images arriving change the column heights, so re-measure as they load
  splitStream.querySelectorAll('img').forEach(img => {
    if (!img.complete) img.addEventListener('load', refresh, { once: true });
  });
  refresh();
}
