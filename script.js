/* ================================================================
   CINEMATIC SCROLLYTELLING — 3-phase scroll-linked animation
   Phase 1: Hero assembled
   Phase 2: Skills reveal
   Phase 3: About Me reveal
   240 frames × canvas  |  400 vh wrapper  |  GPU-accelerated
   ================================================================ */

(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────
  const TOTAL_FRAMES  = 240;
  const FRAME_DIR     = 'assets/frams/';
  const PRELOAD_AHEAD = 30;
  const PRELOAD_INIT  = 60;

  // ── DOM refs ────────────────────────────────────────────────────
  const canvas        = document.getElementById('heroCanvas');
  const ctx           = canvas ? canvas.getContext('2d') : null;
  const wrapper       = document.getElementById('scrollyWrapper');
  const heroOverlay   = document.getElementById('heroOverlay');
  const heroLeft      = document.getElementById('heroLeft');
  const heroRight     = document.getElementById('heroRight');
  const profileCard   = document.getElementById('profileCard');
  const heroPFill     = document.getElementById('heroPFill');
  const scrollDownEl  = document.getElementById('scrollDown');
  const blob1         = document.getElementById('blob1');
  const blob2         = document.getElementById('blob2');
  // Phase 2 — Skills
  const scrollySkills = document.getElementById('scrollySkills');
  const ssHeader      = document.getElementById('ssHeader');
  const ssCards       = [0,1,2,3,4].map(i => document.getElementById(`ssC${i}`));
  // Phase 3 — About
  const scrollyAbout  = document.getElementById('scrollyAbout');
  const saImage       = document.getElementById('saImage');
  const saText        = document.getElementById('saText');

  if (!canvas || !ctx || !wrapper) return;

  // ── Frame image pool ────────────────────────────────────────────
  const images = new Array(TOTAL_FRAMES).fill(null);
  let displayedFrame = -1;

  function frameSrc(i) {
    return `${FRAME_DIR}ezgif-frame-${String(i + 1).padStart(3, '0')}.jpg`;
  }

  function preloadRange(start, count) {
    const end = Math.min(start + count, TOTAL_FRAMES);
    for (let i = start; i < end; i++) {
      if (images[i]) continue;
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { if (i === 0 && displayedFrame < 0) renderFrame(0); };
      img.src = frameSrc(i);
      images[i] = img;
    }
  }

  // ── Canvas sizing ───────────────────────────────────────────────
  function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    if (displayedFrame >= 0) renderFrame(displayedFrame);
  }
  window.addEventListener('resize', resizeCanvas, { passive: true });
  resizeCanvas();

  // ── Frame renderer — cover-fill ──────────────────────────────────
  function renderFrame(idx) {
    const img = images[idx];
    if (!img || !img.complete || img.naturalWidth === 0) {
      ctx.fillStyle = '#080810';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const cW = canvas.width, cH = canvas.height;
    const cA = cW / cH, iA = img.naturalWidth / img.naturalHeight;
    let sx, sy, sw, sh;
    if (cA > iA) { sw = img.naturalWidth; sh = sw / cA; sx = 0; sy = (img.naturalHeight - sh) / 2; }
    else          { sh = img.naturalHeight; sw = sh * cA; sy = 0; sx = (img.naturalWidth - sw) / 2; }
    ctx.clearRect(0, 0, cW, cH);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cW, cH);
    displayedFrame = idx;
  }

  // ── Math helpers ────────────────────────────────────────────────
  const clamp   = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp    = (a, b, t)   => a + (b - a) * t;
  const mapR    = (v, i0, i1, o0, o1) => lerp(o0, o1, clamp((v - i0) / (i1 - i0), 0, 1));
  const easeIO  = t => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  // ── Scroll progress 0→1 ─────────────────────────────────────────
  function getHeroP() {
    const max = wrapper.offsetHeight - window.innerHeight;
    return max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
  }

  // ── Main tick ───────────────────────────────────────────────────
  function updateHero() {
    const p = getHeroP();

    /* ── Progress bar ── */
    if (heroPFill) heroPFill.style.width = `${(p * 100).toFixed(2)}%`;

    /* ── Frame ── */
    const fIdx = Math.round(p * (TOTAL_FRAMES - 1));
    renderFrame(fIdx);
    preloadRange(fIdx, PRELOAD_AHEAD);

    /* ══════════════════════════════════════════════════════════════
       OVERLAY CURVE — 3-phase schedule
       Phase 1  0.00–0.20   0.88         hero UI is the star
       Crossfade 0.20–0.30  0.88→0.50    brief cinematic frame reveal
       Recover  0.30–0.38   0.50→0.82    recover before skills appear
       Phase 2  0.38–0.65   0.82         Skills — legible glass overlay
       Phase 3  0.65–1.00   0.82→0.84    About — same clean depth
    ══════════════════════════════════════════════════════════════ */
    let ov;
    if      (p < 0.20) ov = 0.88;
    else if (p < 0.30) ov = mapR(p, 0.20, 0.30, 0.88, 0.50);
    else if (p < 0.38) ov = mapR(p, 0.30, 0.38, 0.50, 0.82);
    else               ov = lerp(0.82, 0.84, mapR(p, 0.38, 1.00, 0, 1));
    if (heroOverlay) heroOverlay.style.opacity = ov.toFixed(3);

    /* ══════════════════════════════════════════════════════════════
       PHASE 1 (0→0.20)   Hero assembled — clean fade-out on scroll
    ══════════════════════════════════════════════════════════════ */

    /* Hero left text: visible → slides left + fades 0.16–0.30 */
    const lT = mapR(p, 0.16, 0.30, 0, 1);
    if (heroLeft) {
      heroLeft.style.opacity   = (1 - easeIO(lT)).toFixed(3);
      heroLeft.style.transform = `translateX(${lerp(0, -50, easeIO(lT)).toFixed(1)}px)`;
    }

    /* Profile card: fades cleanly 0.18–0.32 */
    const cardAlpha = mapR(p, 0.18, 0.32, 1, 0);
    if (profileCard) profileCard.style.opacity = Math.max(0, cardAlpha).toFixed(3);
    if (heroRight)   heroRight.style.opacity   = Math.max(0, cardAlpha).toFixed(3);

    /* Blobs: normal in phase 1, dim during skills/about for clean text */
    const bI = p < 0.35 ? 1 : mapR(p, 0.35, 0.50, 1, 0.4);
    if (blob1) blob1.style.opacity = bI.toFixed(2);
    if (blob2) blob2.style.opacity = bI.toFixed(2);

    /* Scroll indicator fades after hero starts moving */
    if (scrollDownEl) scrollDownEl.style.opacity = mapR(p, 0.06, 0.18, 1, 0).toFixed(3);

    /* ══════════════════════════════════════════════════════════════
       PHASE 2 (0.35→0.65)   Skills cinematic reveal
       Cards stagger up with 35ms-equivalent scroll delay each
    ══════════════════════════════════════════════════════════════ */
    let skA;
    if      (p < 0.33) skA = 0;
    else if (p < 0.40) skA = mapR(p, 0.33, 0.40, 0, 1);
    else if (p < 0.60) skA = 1;
    else               skA = mapR(p, 0.60, 0.66, 1, 0);

    if (scrollySkills) {
      scrollySkills.style.opacity       = skA.toFixed(3);
      scrollySkills.style.pointerEvents = skA > 0.05 ? 'auto' : 'none';
    }

    /* Header slides down */
    if (ssHeader) {
      const hT = mapR(p, 0.34, 0.41, 0, 1);
      ssHeader.style.opacity   = (easeOut(hT) * skA).toFixed(3);
      ssHeader.style.transform = `translateY(${lerp(28, 0, easeOut(hT)).toFixed(1)}px)`;
    }

    /* Cards stagger-slide up (0.035 scroll-unit gap between each) */
    ssCards.forEach((card, i) => {
      if (!card) return;
      const d  = i * 0.035;
      const cT = clamp(mapR(p, 0.37 + d, 0.46 + d, 0, 1), 0, 1);
      card.style.opacity   = (easeOut(cT) * skA).toFixed(3);
      card.style.transform = `translateY(${lerp(50, 0, easeOut(cT)).toFixed(1)}px)`;
    });

    /* ══════════════════════════════════════════════════════════════
       PHASE 3 (0.65→1.00)   About Me cinematic reveal
       Image slides from left, text from right
    ══════════════════════════════════════════════════════════════ */
    let abA;
    if      (p < 0.63) abA = 0;
    else if (p < 0.70) abA = mapR(p, 0.63, 0.70, 0, 1);
    else if (p < 0.95) abA = 1;
    else               abA = mapR(p, 0.95, 1.00, 1, 0);

    if (scrollyAbout) {
      scrollyAbout.style.opacity       = abA.toFixed(3);
      scrollyAbout.style.pointerEvents = abA > 0.05 ? 'auto' : 'none';
    }

    /* Profile image — slides in from left */
    if (saImage) {
      const iT = clamp(mapR(p, 0.64, 0.72, 0, 1), 0, 1);
      saImage.style.opacity   = (easeOut(iT) * abA).toFixed(3);
      saImage.style.transform = `translateX(${lerp(-65, 0, easeIO(iT)).toFixed(1)}px)`;
    }

    /* Text block — slides in from right, slight delay */
    if (saText) {
      const tT = clamp(mapR(p, 0.67, 0.75, 0, 1), 0, 1);
      saText.style.opacity   = (easeOut(tT) * abA).toFixed(3);
      saText.style.transform = `translateX(${lerp(65, 0, easeIO(tT)).toFixed(1)}px)`;
    }
  }

  // ── Bootstrap ───────────────────────────────────────────────────
  preloadRange(0, PRELOAD_INIT);
  updateHero();

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => { updateHero(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });

})();

/* ================================================================
   END SCROLLYTELLING ENGINE
   ================================================================ */

// Hamburger menu toggle
const hamburger = document.getElementById('hamburger');
const navMenu   = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navMenu.classList.toggle('open');
});

// Close menu when a nav link is clicked
navMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navMenu.classList.remove('open');
  });
});

// Active nav link on scroll
const sections   = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-links a');

function updateActiveNav() {
  let current = '';
  sections.forEach(section => {
    if (window.scrollY >= section.offsetTop - 80) {
      current = section.getAttribute('id');
    }
  });

  navAnchors.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === '#' + current) {
      link.classList.add('active');
    }
  });
}

window.addEventListener('scroll', updateActiveNav);
updateActiveNav();

// Smooth scroll for all anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});
