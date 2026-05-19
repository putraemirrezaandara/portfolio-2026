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

// Media modal (video + Sketchfab) — only on pages with a #mediaModal element
const modal = document.getElementById('mediaModal');
if (modal) {
  const modalContent = modal.querySelector('.media-modal-content');
  const modalClose = modal.querySelector('.media-modal-close');
  const mediaCards = document.querySelectorAll(
    '.project-card[data-video], .project-card[data-sketchfab]'
  );

  const openVideoModal = (src) => {
    modalContent.innerHTML =
      `<video controls playsinline autoplay src="${src}"></video>`;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  };

  const openSketchfabModal = (modelId) => {
    const src = `https://sketchfab.com/models/${modelId}/embed?autostart=1&ui_theme=dark&ui_infos=0&ui_inspector=0&ui_stop=0`;
    modalContent.innerHTML =
      `<iframe src="${src}" allow="autoplay; fullscreen; xr-spatial-tracking" allowfullscreen></iframe>`;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  };

  const closeModal = () => {
    modalContent.innerHTML = '';
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  };

  mediaCards.forEach(card => {
    card.addEventListener('click', () => {
      if (card.dataset.video) openVideoModal(card.dataset.video);
      else if (card.dataset.sketchfab) openSketchfabModal(card.dataset.sketchfab);
    });
  });

  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });
}
