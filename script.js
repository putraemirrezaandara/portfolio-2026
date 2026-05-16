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

// Video modal — only on pages with a #videoModal element
const modal = document.getElementById('videoModal');
if (modal) {
  const modalVideo = document.getElementById('modalVideo');
  const modalClose = modal.querySelector('.video-modal-close');
  const videoCards = document.querySelectorAll('.project-card[data-video]');

  const openModal = (src) => {
    modalVideo.src = src;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modalVideo.play().catch(() => {});
  };

  const closeModal = () => {
    modalVideo.pause();
    modalVideo.removeAttribute('src');
    modalVideo.load();
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  };

  videoCards.forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.video));
  });

  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });
}
