/**
 * IMMORTAL MASTERPIECE: INTERACTIVE SENSORY ENGINE
 * Built for Vansh & Prashasti
 */

(() => {
  'use strict';

  /* --- DOM References --- */
  const entranceVeil = document.getElementById('entranceVeil');
  const enterBtn = document.getElementById('enterSanctuaryBtn');
  const header = document.getElementById('siteNavHeader');
  const progressBar = document.getElementById('scrollProgressBar');
  const indexDrawer = document.getElementById('chapterIndexDrawer');
  const indexTrigger = document.getElementById('indexTriggerBtn');
  const drawerClose = document.getElementById('drawerCloseBtn');
  const themeToggle = document.getElementById('themeToggleBtn');
  const soundPill = document.getElementById('soundHeaderPill');
  const turntableDock = document.getElementById('analogTurntableDock');
  const turntableBtn = document.getElementById('turntableRecordTarget');
  const dockCurrentTime = document.getElementById('dockCurrentTime');
  const dockDuration = document.getElementById('dockDuration');
  const dockMuteBtn = document.getElementById('dockMuteBtn');
  const dockAmbientBtn = document.getElementById('dockAmbientBtn');
  const toast = document.getElementById('immortalToast');

  /* --- State Variables --- */
  let isAudioStarted = localStorage.getItem('vp_audio_active') === '1';
  let isPlaying = false;
  let isMuted = false;
  let audioMode = 'youtube'; // 'youtube' or 'ambient'
  let ytPlayer = null;
  let ytPlayerReady = false;
  let timeTicker = null;
  let webAudioCtx = null;
  let ambientOscs = [];
  let ambientGain = null;

  /* --- Toast Notifications --- */
  let toastTimer = null;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3000);
  }

  /* --- Theme Engine --- */
  let currentTheme = localStorage.getItem('vp_theme') || 'velvet';
  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vp_theme', theme);
    if (themeToggle) {
      const isCandle = theme === 'candlelight';
      themeToggle.querySelector('.theme-label').textContent = isCandle ? 'Velvet' : 'Candlelight';
    }
  }
  applyTheme(currentTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      applyTheme(currentTheme === 'velvet' ? 'candlelight' : 'velvet');
      showToast(currentTheme === 'candlelight' ? 'Candlelight atmosphere lit ✦' : 'Velvet midnight atmosphere ✦');
    });
  }

  /* --- Time Formatting --- */
  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  /* --- Audio State Sync --- */
  function updateAudioPlaybackState(playing) {
    isPlaying = playing;
    if (soundPill) soundPill.classList.toggle('playing', playing);
    if (turntableDock) turntableDock.classList.toggle('is-playing', playing);
  }

  /* --- Web Audio Chime & Ambient Synthesizer --- */
  function playSilverPayalChimes() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!webAudioCtx) webAudioCtx = new AudioContext();
      if (webAudioCtx.state === 'suspended') webAudioCtx.resume();

      const freqs = [1760, 2093, 2637, 3135, 3520, 3951];
      const now = webAudioCtx.currentTime;

      freqs.forEach((freq, idx) => {
        const osc = webAudioCtx.createOscillator();
        const gain = webAudioCtx.createGain();
        const filter = webAudioCtx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 15, now + idx * 0.035);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq, now);
        filter.Q.setValueAtTime(9, now);

        gain.gain.setValueAtTime(0.07, now + idx * 0.035);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.035 + 1.4);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(webAudioCtx.destination);

        osc.start(now + idx * 0.035);
        osc.stop(now + idx * 0.035 + 1.5);
      });
    } catch (_) {}
  }

  function startAmbientSynthesizer() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!webAudioCtx) webAudioCtx = new AudioContext();
      if (webAudioCtx.state === 'suspended') webAudioCtx.resume();

      stopAmbientSynthesizer();

      ambientGain = webAudioCtx.createGain();
      ambientGain.gain.setValueAtTime(isMuted ? 0 : 0.045, webAudioCtx.currentTime);
      ambientGain.connect(webAudioCtx.destination);

      // Warm F-maj9 ethereal chord (F3, A3, C4, E4, G4)
      const chord = [174.61, 220.00, 261.63, 329.63, 392.00];
      chord.forEach(f => {
        const osc = webAudioCtx.createOscillator();
        const g = webAudioCtx.createGain();
        const filter = webAudioCtx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, webAudioCtx.currentTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(420, webAudioCtx.currentTime);

        g.gain.setValueAtTime(0.2, webAudioCtx.currentTime);

        osc.connect(filter);
        filter.connect(g);
        g.connect(ambientGain);
        osc.start();
        ambientOscs.push(osc);
      });

      audioMode = 'ambient';
      updateAudioPlaybackState(true);
      const trackTitle = document.querySelector('.dock-track-title span:first-child');
      if (trackTitle) trackTitle.textContent = 'Ambient Resonances';
    } catch (_) {}
  }

  function stopAmbientSynthesizer() {
    ambientOscs.forEach(o => { try { o.stop(); o.disconnect(); } catch (_) {} });
    ambientOscs = [];
  }

  /* --- Playback Actions --- */
  function startPlayback() {
    isAudioStarted = true;
    localStorage.setItem('vp_audio_active', '1');

    if (audioMode === 'ambient') {
      startAmbientSynthesizer();
      return;
    }

    if (ytPlayer && ytPlayerReady) {
      try {
        if (isMuted) ytPlayer.mute(); else { ytPlayer.unMute(); ytPlayer.setVolume(35); }
        ytPlayer.playVideo();
        updateAudioPlaybackState(true);
        startTrackTimer();
      } catch (_) {
        startAmbientSynthesizer();
      }
    } else {
      initYouTubeEngine();
    }
  }

  function pausePlayback() {
    if (audioMode === 'ambient') {
      stopAmbientSynthesizer();
      updateAudioPlaybackState(false);
      return;
    }

    if (ytPlayer && ytPlayerReady) {
      try {
        ytPlayer.pauseVideo();
        updateAudioPlaybackState(false);
      } catch (_) {}
    }
    clearInterval(timeTicker);
  }

  function toggleAudioPlayback() {
    if (isPlaying) pausePlayback(); else startPlayback();
  }

  function startTrackTimer() {
    clearInterval(timeTicker);
    timeTicker = setInterval(() => {
      if (ytPlayer && ytPlayerReady && typeof ytPlayer.getCurrentTime === 'function') {
        try {
          const cur = ytPlayer.getCurrentTime();
          const dur = ytPlayer.getDuration();
          if (dockCurrentTime && cur !== undefined) dockCurrentTime.textContent = formatTime(cur);
          if (dockDuration && dur) dockDuration.textContent = formatTime(dur);
          if (cur > 0) localStorage.setItem('vp_last_time', String(cur));
        } catch (_) {}
      }
    }, 500);
  }

  function toggleMute() {
    isMuted = !isMuted;
    if (ytPlayer && ytPlayerReady) {
      try {
        if (isMuted) ytPlayer.mute(); else { ytPlayer.unMute(); ytPlayer.setVolume(35); }
      } catch (_) {}
    }
    if (ambientGain) {
      ambientGain.gain.setValueAtTime(isMuted ? 0 : 0.045, webAudioCtx.currentTime);
    }
    showToast(isMuted ? 'Sound muted' : 'Sound restored');
  }

  /* --- YouTube Engine --- */
  function initYouTubeEngine() {
    if (window.YT?.Player) return createYouTubePlayer();
    const existing = document.getElementById('ytScript');
    if (!existing) {
      const s = document.createElement('script');
      s.id = 'ytScript';
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      window.onYouTubeIframeAPIReady = createYouTubePlayer;
      document.head.appendChild(s);
    }
  }

  function createYouTubePlayer() {
    if (ytPlayer) return;
    try {
      const savedTime = Number(localStorage.getItem('vp_last_time') || 0) || 0;
      ytPlayer = new YT.Player('yt-player', {
        videoId: 'LUgpPmj6nR8', // Khat by Navjot Ahuja
        playerVars: {
          autoplay: 0,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          iv_load_policy: 3,
          fs: 0,
          disablekb: 1
        },
        events: {
          onReady: () => {
            ytPlayerReady = true;
            ytPlayer.setVolume(35);
            if (savedTime > 4) {
              try { ytPlayer.seekTo(savedTime, true); } catch (_) {}
            }
            if (isAudioStarted) startPlayback();
          },
          onStateChange: e => {
            if (e.data === YT.PlayerState.PLAYING) {
              updateAudioPlaybackState(true);
            } else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.CUED) {
              updateAudioPlaybackState(false);
            } else if (e.data === YT.PlayerState.ENDED) {
              ytPlayer.loadVideoById({ videoId: 'LUgpPmj6nR8', startSeconds: 0 });
              startPlayback();
            }
          }
        }
      });
    } catch (_) {
      startAmbientSynthesizer();
    }
  }

  /* --- Event Listeners for Audio --- */
  if (turntableBtn) turntableBtn.addEventListener('click', toggleAudioPlayback);
  if (soundPill) soundPill.addEventListener('click', toggleAudioPlayback);
  if (dockMuteBtn) dockMuteBtn.addEventListener('click', toggleMute);

  if (dockAmbientBtn) {
    dockAmbientBtn.addEventListener('click', () => {
      if (audioMode === 'youtube') {
        if (ytPlayer && ytPlayerReady) { try { ytPlayer.pauseVideo(); } catch (_) {} }
        startAmbientSynthesizer();
        showToast('Switched to gentle rain chords');
      } else {
        stopAmbientSynthesizer();
        audioMode = 'youtube';
        const trackTitle = document.querySelector('.dock-track-title span:first-child');
        if (trackTitle) trackTitle.textContent = 'Khat';
        startPlayback();
        showToast('Returned to Khat · Navjot Ahuja');
      }
    });
  }

  /* --- Chapter Index Drawer Navigation --- */
  function openIndexDrawer() {
    indexDrawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeIndexDrawer() {
    indexDrawer.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (indexTrigger) indexTrigger.addEventListener('click', openIndexDrawer);
  if (drawerClose) drawerClose.addEventListener('click', closeIndexDrawer);
  if (indexDrawer) {
    indexDrawer.addEventListener('click', e => {
      if (e.target === indexDrawer) closeIndexDrawer();
    });
  }
  document.querySelectorAll('.drawer-nav-link').forEach(link => {
    link.addEventListener('click', () => closeIndexDrawer());
  });

  /* --- Entrance Sanctuary Veil Entry --- */
  if (enterBtn) {
    enterBtn.addEventListener('click', () => {
      isAudioStarted = true;
      localStorage.setItem('vp_audio_active', '1');
      startPlayback();
      entranceVeil.classList.add('dismissed');
      showToast('Welcome to our sanctuary ✦');
    });
  }

  /* --- Interactive Canvas Simulation (Petals & Glowing Stardust) --- */
  const canvas = document.getElementById('particleCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }, { passive: true });

    const petals = [];
    const count = matchMedia('(max-width: 640px)').matches ? 16 : 30;

    for (let i = 0; i < count; i++) {
      petals.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 3 + Math.random() * 5.5,
        speedY: 0.45 + Math.random() * 0.95,
        speedX: -0.3 + Math.random() * 0.6,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: 0.008 + Math.random() * 0.018,
        color: Math.random() > 0.45 ? 'rgba(214, 148, 165, 0.42)' : 'rgba(223, 176, 114, 0.32)'
      });
    }

    const stardust = [];
    function addStardust(x, y) {
      if (stardust.length > 45) return;
      stardust.push({
        x: x + (Math.random() - 0.5) * 18,
        y: y + (Math.random() - 0.5) * 18,
        r: 1 + Math.random() * 2.2,
        alpha: 0.9,
        decay: 0.015 + Math.random() * 0.02
      });
    }

    window.addEventListener('mousemove', e => addStardust(e.clientX, e.clientY), { passive: true });
    window.addEventListener('touchmove', e => {
      if (e.touches[0]) addStardust(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    function renderScene() {
      ctx.clearRect(0, 0, width, height);

      // Render Petals
      petals.forEach(p => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rot += p.rotSpeed;
        if (p.y > height + 25) { p.y = -25; p.x = Math.random() * width; }
        if (p.x > width + 25) p.x = -25;
        if (p.x < -25) p.x = width + 25;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r * 1.6, p.r * 0.95, 0, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();
      });

      // Render Stardust
      for (let i = stardust.length - 1; i >= 0; i--) {
        const s = stardust[i];
        s.alpha -= s.decay;
        s.y -= 0.25;
        if (s.alpha <= 0) {
          stardust.splice(i, 1);
        } else {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(242, 218, 180, ${s.alpha})`;
          ctx.shadowBlur = 8;
          ctx.shadowColor = 'rgba(242, 218, 180, 0.9)';
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      requestAnimationFrame(renderScene);
    }
    requestAnimationFrame(renderScene);
  }

  /* --- Scroll Progress & Header Style --- */
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 30);
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    const pct = Math.min(100, (window.scrollY / max) * 100);
    if (progressBar) progressBar.style.width = `${pct}%`;
  }, { passive: true });

  /* --- Interactive Artifact Modules --- */
  function initializeArtifactInteractions() {

    // Memory Lens Focus Slider Interaction
    const lensSlider = document.getElementById('lensFocusSlider');
    const lensPill = document.getElementById('lensStatusPill');
    const blurLines = document.querySelectorAll('.blur-line');

    if (lensSlider) {
      lensSlider.addEventListener('input', e => {
        const val = Number(e.target.value);
        // val from 0 to 100
        const blurAmount = ((100 - val) / 100) * 4; // 0 to 4px
        const opacityAmount = 0.4 + (val / 100) * 0.6; // 0.4 to 1.0

        blurLines.forEach(line => {
          line.style.filter = `blur(${blurAmount}px)`;
          line.style.opacity = opacityAmount;
        });

        if (lensPill) {
          if (val > 80) lensPill.textContent = 'burned forever in heart ✦';
          else if (val > 40) lensPill.textContent = 'held in sharp memory';
          else lensPill.textContent = 'diffused in time';
        }
      });
    }

    // 1. Payal Chime
    const payal = document.getElementById('payalChimeTarget');
    if (payal) {
      payal.addEventListener('click', () => {
        playSilverPayalChimes();
        payal.classList.add('ringing');
        setTimeout(() => payal.classList.remove('ringing'), 1000);
        showToast('The silver bells of your payal chime softly ✦');
      });
    }

    // 2. Diya / Flame
    const diya = document.getElementById('diyaAltarTarget');
    if (diya) {
      let isFlameLit = true;
      diya.addEventListener('click', () => {
        isFlameLit = !isFlameLit;
        diya.classList.toggle('dimmed', !isFlameLit);
        const scriptPromise = document.querySelector('.script-promise');
        const mainPromise = document.querySelector('.main-promise');
        if (scriptPromise && mainPromise) {
          if (isFlameLit) {
            scriptPromise.textContent = '“I won’t confess that I waited…”';
            mainPromise.textContent = '“…but I let the lamp burn a little longer.”';
            showToast('The golden flame is bright and warm for you ✦');
          } else {
            scriptPromise.textContent = '“In the quiet shadows…”';
            mainPromise.textContent = '“…waiting to burn again the moment you come home.”';
            showToast('The flame rests in gentle embers');
          }
        }
      });
    }

    // 3. Erasure & Blackout Poetry Slabs
    document.querySelectorAll('.erasure-slab').forEach(slab => {
      const toggle = slab.querySelector('.strip-btn');
      function doStrip() {
        const isStripped = slab.getAttribute('data-stripped') === 'true';
        slab.setAttribute('data-stripped', String(!isStripped));
        if (toggle) toggle.textContent = !isStripped ? 'restore whole verse ↺' : 'strip to the bone ✦';
      }
      if (toggle) toggle.addEventListener('click', e => { e.stopPropagation(); doStrip(); });
      slab.addEventListener('click', doStrip);
    });

    // 4. 3D Wax-Sealed Parchment Letter
    const waxBtn = document.getElementById('waxSealButton');
    const envelope = document.getElementById('vintageEnvelopeMock');
    const foldBack = document.getElementById('foldBackAction');
    if (waxBtn && envelope) {
      waxBtn.addEventListener('click', () => {
        envelope.classList.add('unfolded');
        showToast('The letter is open for you');
      });
    }
    if (foldBack && envelope) {
      foldBack.addEventListener('click', () => {
        envelope.classList.remove('unfolded');
      });
    }

    // 5. 03:14 AM Call Terminal
    const callBox = document.getElementById('terminalCallBox');
    if (callBox) {
      callBox.addEventListener('click', () => {
        showToast('03:14 AM · You were sleeping softly. I guarded the quiet.');
      });
    }

    // 6. Final RSVP Copy Note Action
    const copyBtn = document.getElementById('copyGentleNoteBtn');
    const copyText = document.getElementById('copyBtnText');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const note = "Hey Vansh, I read it. Let's talk soon.";
        try {
          await navigator.clipboard.writeText(note);
          if (copyText) copyText.textContent = "Saved to clipboard ✓";
          showToast("Copied note: 'Hey Vansh, I read it. Let's talk soon.'");
          setTimeout(() => { if (copyText) copyText.textContent = "Keep a note in your pocket"; }, 3000);
        } catch (_) {
          showToast("Note: 'Hey Vansh, I read it. Let's talk soon.'");
        }
      });
    }
  }

  /* --- Keyboard Shortcuts --- */
  window.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea')) return;
    if (e.code === 'Space') {
      e.preventDefault();
      toggleAudioPlayback();
    } else if (e.key === 'Escape') {
      closeIndexDrawer();
    }
  });

  /* --- Boot Initialization --- */
  if (isAudioStarted) {
    if (entranceVeil) entranceVeil.classList.add('dismissed');
  }
  initYouTubeEngine();
  initializeArtifactInteractions();
})();
