/* UniVERSE PWA + Guided Onboarding
 * Self-contained enhancement layer for the static MVP.
 * No framework dependency required.
 */
(() => {
  'use strict';

  const STORAGE = {
    tourSeen: 'universe:onboarding:v1:seen',
    installDismissed: 'universe:pwa:install:dismissed'
  };

  const isStandalone = () =>
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  /* ---------- PWA ---------- */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .then(reg => console.info('[UniVERSE] service worker ready', reg.scope))
        .catch(err => console.warn('[UniVERSE] service worker registration failed', err));
    });
  }

  let deferredInstallPrompt = null;

  function createInstallUI() {
    if (document.getElementById('uvInstallPrompt') || isStandalone()) return;

    const style = document.createElement('style');
    style.textContent = `
      #uvInstallPrompt{position:fixed;left:16px;right:16px;bottom:88px;z-index:9998;display:none}
      #uvInstallPrompt .uv-install-card{max-width:520px;margin:0 auto;padding:14px 16px;border:1px solid rgba(52,224,138,.22);border-radius:20px;background:rgba(8,12,20,.94);backdrop-filter:blur(20px);box-shadow:0 18px 60px rgba(0,0,0,.35),0 0 40px rgba(52,224,138,.08);color:#e8ecf3}
      #uvInstallPrompt .uv-install-row{display:flex;align-items:center;gap:12px}
      #uvInstallPrompt .uv-install-icon{width:42px;height:42px;flex:0 0 42px;border-radius:13px;background:#22c55e;color:#04150b;display:grid;place-items:center;font-weight:900}
      #uvInstallPrompt .uv-install-copy{min-width:0;flex:1}
      #uvInstallPrompt .uv-install-title{font:700 13px/1.2 'Space Grotesk',sans-serif}
      #uvInstallPrompt .uv-install-text{margin-top:4px;color:#94a3b8;font:500 11px/1.4 Inter,sans-serif}
      #uvInstallPrompt .uv-install-actions{display:flex;gap:7px;margin-top:10px}
      #uvInstallPrompt button{border:0;border-radius:11px;padding:9px 12px;font:700 11px Inter,sans-serif;cursor:pointer}
      #uvInstallPrompt .uv-install-now{background:#22c55e;color:#04150b}
      #uvInstallPrompt .uv-install-later{background:rgba(255,255,255,.06);color:#cbd5e1}
      @media(max-width:520px){#uvInstallPrompt{bottom:82px}.uv-install-card{padding:13px!important}}
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'uvInstallPrompt';
    wrapper.innerHTML = `
      <div class="uv-install-card" role="dialog" aria-label="Install UniVERSE">
        <div class="uv-install-row">
          <div class="uv-install-icon">U</div>
          <div class="uv-install-copy">
            <div class="uv-install-title">Take UniVERSE with you</div>
            <div class="uv-install-text">Install UniVERSE on your phone for a faster, app-like campus experience.</div>
          </div>
        </div>
        <div class="uv-install-actions">
          <button class="uv-install-now" type="button">Install app</button>
          <button class="uv-install-later" type="button">Not now</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper);

    wrapper.querySelector('.uv-install-now').addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      const result = await deferredInstallPrompt.userChoice;
      if (result?.outcome === 'accepted') wrapper.style.display = 'none';
      deferredInstallPrompt = null;
    });

    wrapper.querySelector('.uv-install-later').addEventListener('click', () => {
      wrapper.style.display = 'none';
      localStorage.setItem(STORAGE.installDismissed, String(Date.now()));
    });
  }

  function showInstallPrompt() {
    if (isStandalone() || localStorage.getItem(STORAGE.installDismissed)) return;
    const el = document.getElementById('uvInstallPrompt');
    if (el && deferredInstallPrompt) el.style.display = 'block';
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    createInstallUI();
    showInstallPrompt();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    document.getElementById('uvInstallPrompt')?.remove();
    localStorage.removeItem(STORAGE.installDismissed);
  });

  /* ---------- Guided tour ---------- */
  const steps = [
    {
      selector: '#orbitIcon',
      title: 'Your campus Orbit',
      text: 'This is your campus social space. Follow conversations, share updates and stay connected with people around you.'
    },
    {
      selector: '#chatIcon',
      title: 'Campus Chat',
      text: 'Message people you connect with, manage requests and keep conversations inside UniVERSE.'
    },
    {
      selector: '#studyIcon',
      title: 'Study Hub',
      text: 'Courses, resources, progress and bookmarks live here. Your academic side gets its own orbit.'
    },
    {
      selector: '#whisperIcon',
      title: 'Whisper',
      text: 'A campus space for anonymous posts. Identity protection is enforced separately from what the campus sees.'
    },
    {
      selector: '#profileNavIcon',
      title: 'Your profile',
      text: 'Manage your identity, campus details and account settings from your profile.'
    }
  ];

  let currentStep = 0;
  let overlay = null;
  let card = null;
  let activeTarget = null;

  function ensureTourStyles() {
    if (document.getElementById('uvTourStyles')) return;
    const style = document.createElement('style');
    style.id = 'uvTourStyles';
    style.textContent = `
      #uvTourOverlay{position:fixed;inset:0;z-index:10000;pointer-events:auto;background:rgba(2,5,10,.72);transition:opacity .18s ease}
      #uvTourSpotlight{position:fixed;z-index:10001;border-radius:14px;box-shadow:0 0 0 9999px rgba(2,5,10,.72),0 0 0 2px rgba(52,224,138,.92),0 0 34px rgba(52,224,138,.26);pointer-events:none;transition:top .22s ease,left .22s ease,width .22s ease,height .22s ease}
      #uvTourCard{position:fixed;z-index:10002;width:min(360px,calc(100vw - 28px));padding:18px;border:1px solid rgba(52,224,138,.22);border-radius:22px;background:rgba(10,14,24,.97);color:#e8ecf3;box-shadow:0 24px 80px rgba(0,0,0,.48);font-family:Inter,sans-serif}
      #uvTourCard .uv-tour-kicker{font:700 9px/1 Space Grotesk,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#34e08a}
      #uvTourCard h3{margin:8px 0 6px;font:700 18px/1.2 Space Grotesk,sans-serif}
      #uvTourCard p{margin:0;color:#94a3b8;font-size:12px;line-height:1.6}
      #uvTourCard .uv-tour-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:16px}
      #uvTourCard .uv-tour-progress{color:#64748b;font-size:10px;font-weight:700}
      #uvTourCard .uv-tour-actions{display:flex;gap:7px}
      #uvTourCard button{border:0;border-radius:11px;padding:9px 12px;font:700 10px Inter,sans-serif;cursor:pointer}
      #uvTourCard .uv-tour-skip{background:transparent;color:#64748b}
      #uvTourCard .uv-tour-prev{background:rgba(255,255,255,.06);color:#cbd5e1}
      #uvTourCard .uv-tour-next{background:#22c55e;color:#04150b}
      #uvTourLauncher{position:fixed;right:18px;bottom:92px;z-index:9000;border:1px solid rgba(52,224,138,.18);background:rgba(10,14,24,.9);color:#34e08a;border-radius:999px;padding:8px 12px;font:700 10px Inter,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25);cursor:pointer}
      @media(max-width:640px){#uvTourCard{padding:16px;border-radius:19px}#uvTourCard h3{font-size:16px}}
    `;
    document.head.appendChild(style);
  }

  function removeTour() {
    overlay?.remove();
    document.getElementById('uvTourSpotlight')?.remove();
    card?.remove();
    overlay = null;
    card = null;
    activeTarget?.removeAttribute('data-uv-tour-active');
    activeTarget = null;
    document.body.style.overflow = '';
  }

  function createTourElements() {
    ensureTourStyles();
    overlay = document.createElement('div');
    overlay.id = 'uvTourOverlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.addEventListener('click', e => e.stopPropagation());

    const spotlight = document.createElement('div');
    spotlight.id = 'uvTourSpotlight';

    card = document.createElement('section');
    card.id = 'uvTourCard';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.innerHTML = `
      <div class="uv-tour-kicker">UniVERSE guided tour</div>
      <h3 id="uvTourTitle"></h3>
      <p id="uvTourText"></p>
      <div class="uv-tour-footer">
        <span class="uv-tour-progress" id="uvTourProgress"></span>
        <div class="uv-tour-actions">
          <button type="button" class="uv-tour-skip" id="uvTourSkip">Skip</button>
          <button type="button" class="uv-tour-prev" id="uvTourPrev">Previous</button>
          <button type="button" class="uv-tour-next" id="uvTourNext">Next</button>
        </div>
      </div>
    `;

    document.body.append(overlay, spotlight, card);
    document.getElementById('uvTourSkip').onclick = finishTour;
    document.getElementById('uvTourPrev').onclick = () => moveTour(-1);
    document.getElementById('uvTourNext').onclick = () => moveTour(1);
  }

  function getAvailableSteps() {
    return steps.filter(step => document.querySelector(step.selector));
  }

  function positionCard(target) {
    const spotlight = document.getElementById('uvTourSpotlight');
    if (!spotlight || !card) return;
    const rect = target.getBoundingClientRect();
    const pad = 7;
    spotlight.style.top = `${Math.max(6, rect.top - pad)}px`;
    spotlight.style.left = `${Math.max(6, rect.left - pad)}px`;
    spotlight.style.width = `${Math.min(window.innerWidth - 12, rect.width + pad * 2)}px`;
    spotlight.style.height = `${Math.min(window.innerHeight - 12, rect.height + pad * 2)}px`;

    const cardWidth = Math.min(360, window.innerWidth - 28);
    const cardHeight = card.offsetHeight || 190;
    let top = rect.bottom + 16;
    if (top + cardHeight > window.innerHeight - 12) top = rect.top - cardHeight - 16;
    if (top < 12) top = Math.min(window.innerHeight - cardHeight - 12, Math.max(12, rect.top));
    let left = rect.left + rect.width / 2 - cardWidth / 2;
    left = Math.max(14, Math.min(window.innerWidth - cardWidth - 14, left));
    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
  }

  function renderStep() {
    const available = getAvailableSteps();
    if (!available.length) return finishTour(false);
    if (currentStep >= available.length) return finishTour();
    const step = available[currentStep];
    const target = document.querySelector(step.selector);
    if (!target) return finishTour(false);
    activeTarget?.removeAttribute('data-uv-tour-active');
    activeTarget = target;
    target.setAttribute('data-uv-tour-active', 'true');
    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    window.setTimeout(() => {
      const fresh = document.querySelector(step.selector);
      if (!fresh || !card) return;
      document.getElementById('uvTourTitle').textContent = step.title;
      document.getElementById('uvTourText').textContent = step.text;
      document.getElementById('uvTourProgress').textContent = `${currentStep + 1} / ${available.length}`;
      document.getElementById('uvTourPrev').style.display = currentStep === 0 ? 'none' : 'inline-block';
      document.getElementById('uvTourNext').textContent = currentStep === available.length - 1 ? 'Finish' : 'Next';
      positionCard(fresh);
    }, 180);
  }

  function moveTour(delta) {
    const available = getAvailableSteps();
    currentStep += delta;
    if (currentStep < 0) currentStep = 0;
    if (currentStep >= available.length) return finishTour();
    renderStep();
  }

  function finishTour(markSeen = true) {
    if (markSeen) localStorage.setItem(STORAGE.tourSeen, '1');
    removeTour();
  }

  function startTour(force = false) {
    if (!force && localStorage.getItem(STORAGE.tourSeen)) return;
    const available = getAvailableSteps();
    if (!available.length) return;
    currentStep = 0;
    createTourElements();
    renderStep();
  }

  function addTourLauncher() {
    if (document.getElementById('uvTourLauncher') || !document.querySelector('#profileNavIcon')) return;
    const button = document.createElement('button');
    button.id = 'uvTourLauncher';
    button.type = 'button';
    button.textContent = 'Tour';
    button.title = 'Replay the UniVERSE guided tour';
    button.addEventListener('click', () => startTour(true));
    document.body.appendChild(button);
  }

  function initTour() {
    if (!document.querySelector('#profileNavIcon')) return;
    ensureTourStyles();
    addTourLauncher();
    window.addEventListener('resize', () => {
      if (activeTarget && card) positionCard(activeTarget);
    });
    window.addEventListener('scroll', () => {
      if (activeTarget && card) positionCard(activeTarget);
    }, { passive: true });

    // Give the dashboard time to finish its initial auth/data rendering.
    window.setTimeout(() => startTour(false), 1200);
  }

  function init() {
    registerServiceWorker();
    createInstallUI();
    initTour();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
