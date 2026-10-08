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
  const mediaCardSelector = '.project-card[data-video], .project-card[data-sketchfab]';

  const showModal = (el) => {
    modalContent.replaceChildren(el);
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
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
  };

  document.addEventListener('click', (e) => {
    const card = e.target.closest(mediaCardSelector);
    if (card) openCard(card);
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
