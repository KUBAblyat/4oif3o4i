/* ═══════════════════════════════════════════════════════
   EPSTEIN ISLAND — script.js
   - fullscreen on click
   - TTS loop (Ukrainian voice)
   - Camera access → selfie photo
   - IP + browser/OS detection
   - Leaflet map with geo IP
═══════════════════════════════════════════════════════ */

/* ── GLOBALS ── */
const TTS_TEXT = 'Привіт! Я запрошую тебе на свій острів. Тут дуже весело! Приходь — не пожалкуєш. В нас є сонце, море і хороша компанія!';
let ttsRunning  = false;
let cameraStream = null;

/* ═══════════════════════════════════════
   BROWSER / OS DETECTION
═══════════════════════════════════════ */
function getBrowser() {
  const ua = navigator.userAgent;
  const checks = [
    [/YaBrowser\/([\d.]+)/,       'Яндекс Браузер'],
    [/Edg\/([\d.]+)/,             'Microsoft Edge'],
    [/OPR\/([\d.]+)/,             'Opera'],
    [/Firefox\/([\d.]+)/,         'Firefox'],
    [/Chrome\/([\d.]+)/,          'Chrome'],
    [/Version\/([\d.]+).*Safari/, 'Safari'],
    [/MSIE ([\d.]+)/,             'Internet Explorer'],
  ];
  for (const [rx, name] of checks) {
    const m = ua.match(rx);
    if (m) return `${name} ${m[1]}`;
  }
  return 'Невідомий браузер';
}

function getOS() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua))            return 'iPhone iOS';
  if (/iPad/.test(ua))              return 'iPad iOS';
  const and = ua.match(/Android ([\d.]+)/);
  if (and)                          return 'Android ' + and[1];
  if (/Windows NT 10\.0/.test(ua))  return 'Windows 10 / 11';
  if (/Windows NT 6\.3/.test(ua))   return 'Windows 8.1';
  if (/Windows NT 6\.1/.test(ua))   return 'Windows 7';
  if (/Windows/.test(ua))           return 'Windows';
  const mac = ua.match(/Mac OS X ([\d_]+)/);
  if (mac)                          return 'macOS ' + mac[1].replace(/_/g, '.');
  if (/Linux/.test(ua))             return 'Linux';
  return 'Невідома ОС';
}

function fillLocalInfo() {
  document.getElementById('browser').textContent = getBrowser();
  document.getElementById('os').textContent      = getOS();
  document.getElementById('scr').textContent     = `${screen.width}×${screen.height} (DPR: ${window.devicePixelRatio})`;
  document.getElementById('timeEl').textContent  = new Date().toLocaleString('uk-UA');
}

/* ═══════════════════════════════════════
   GEO / IP LOOKUP
═══════════════════════════════════════ */
async function fetchGeo() {
  try {
    const res  = await fetch('https://ipapi.co/json/');
    const data = await res.json();

    document.getElementById('ip').textContent = data.ip || '—';

    const city    = data.city || '';
    const region  = data.region || '';
    const country = data.country_name || '';
    const org     = data.org || '';
    const loc     = [city, region, country].filter(Boolean).join(', ');

    document.getElementById('isp').textContent = [org, loc].filter(Boolean).join(' / ') || '—';

    if (loc) {
      document.getElementById('locationLabel').textContent = '📍 Твоє місце: ' + loc;
    }

    const lat = parseFloat(data.latitude);
    const lng = parseFloat(data.longitude);
    if (!isNaN(lat) && !isNaN(lng)) buildMap(lat, lng, loc);

  } catch {
    // fallback
    try {
      const res  = await fetch('https://ip-api.com/json/?fields=61439');
      const data = await res.json();

      document.getElementById('ip').textContent = data.query || '—';

      const loc = [data.city, data.regionName, data.country].filter(Boolean).join(', ');
      document.getElementById('isp').textContent = [data.isp, loc].filter(Boolean).join(' / ') || '—';
      document.getElementById('locationLabel').textContent = '📍 ' + (loc || 'Невідомо');

      if (data.lat && data.lon) buildMap(data.lat, data.lon, loc);

    } catch {
      document.getElementById('ip').textContent          = 'Не вдалось визначити';
      document.getElementById('locationLabel').textContent = '📍 Геолокація недоступна';
    }
  }
}

/* ═══════════════════════════════════════
   LEAFLET MAP
═══════════════════════════════════════ */
function buildMap(lat, lng, label) {
  const wrap = document.getElementById('mapWrap');
  wrap.classList.add('visible');

  const map = L.map('map', { zoomControl: false, attributionControl: false });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
  }).addTo(map);

  map.setView([lat, lng], 11);

  // pulsing orange dot marker
  const icon = L.divIcon({
    className: '',
    html: `
      <style>
        @keyframes rpl {
          0%   { box-shadow: 0 0 0 0 rgba(255,68,0,0.7); }
          70%  { box-shadow: 0 0 0 18px rgba(255,68,0,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,68,0,0); }
        }
        .pulsedot {
          width:16px; height:16px; border-radius:50%;
          background:rgba(255,68,0,0.95);
          animation: rpl 1.6s infinite;
        }
      </style>
      <div class="pulsedot"></div>`,
    iconSize:   [16, 16],
    iconAnchor: [8, 8],
  });

  L.marker([lat, lng], { icon })
    .addTo(map)
    .bindPopup(`<b>📍 Ти тут</b>${label ? '<br>' + label : ''}`, { closeButton: false })
    .openPopup();
}

/* ═══════════════════════════════════════
   TTS — infinite loop
═══════════════════════════════════════ */
function speakOnce() {
  if (!ttsRunning) return;
  const synth = window.speechSynthesis;
  synth.cancel();

  const u    = new SpeechSynthesisUtterance(TTS_TEXT);
  u.lang     = 'uk-UA';
  u.rate     = 0.88;
  u.pitch    = 0.8;
  u.volume   = 1;

  const voices = synth.getVoices();
  const voice  = voices.find(v => v.lang.startsWith('uk'))
              || voices.find(v => v.lang.startsWith('ru'))
              || voices.find(v => v.lang.startsWith('pl'))
              || voices[0];
  if (voice) u.voice = voice;

  u.onend   = () => { if (ttsRunning) setTimeout(speakOnce, 1500); };
  u.onerror = () => { if (ttsRunning) setTimeout(speakOnce, 2000); };

  synth.speak(u);
  document.getElementById('soundDot').classList.add('active');
}

function startTTS() {
  ttsRunning = true;
  const synth = window.speechSynthesis;
  if (synth.getVoices().length > 0) {
    speakOnce();
  } else {
    synth.addEventListener('voiceschanged', speakOnce, { once: true });
  }
}

/* ═══════════════════════════════════════
   CAMERA → SELFIE
═══════════════════════════════════════ */
async function startCamera() {
  const statusEl = document.getElementById('selfieStatus');
  const imgEl    = document.getElementById('selfieImg');
  const canvas   = document.getElementById('selfieCanvas');
  const video    = document.getElementById('camVideo');

  statusEl.textContent = '📷 Запитуємо доступ до камери...';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });

    cameraStream = stream;
    video.srcObject = stream;

    // wait for video to be ready
    await new Promise(resolve => {
      video.onloadedmetadata = () => { video.play(); resolve(); };
    });

    statusEl.textContent = '⏳ Знімаємо...';

    // short delay so camera adjusts exposure
    await new Promise(resolve => setTimeout(resolve, 1800));

    // capture frame
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataURL = canvas.toDataURL('image/jpeg', 0.92);
    imgEl.src = dataURL;
    imgEl.classList.add('show');

    statusEl.textContent = '✅ Ось ти! 😱';

    // stop camera stream
    stream.getTracks().forEach(t => t.stop());

  } catch (err) {
    console.warn('Camera error:', err);
    if (err.name === 'NotAllowedError') {
      statusEl.textContent = '🚫 Доступ до камери відхилено';
    } else if (err.name === 'NotFoundError') {
      statusEl.textContent = '❌ Камера не знайдена';
    } else {
      statusEl.textContent = '⚠️ Камера недоступна';
    }
  }
}

/* ═══════════════════════════════════════
   FULLSCREEN
═══════════════════════════════════════ */
function tryFullscreen() {
  const el = document.documentElement;
  if (el.requestFullscreen)            el.requestFullscreen().catch(() => {});
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  else if (el.mozRequestFullScreen)    el.mozRequestFullScreen();
}

/* ═══════════════════════════════════════
   INIT — wait for first click/tap
═══════════════════════════════════════ */
function boot() {
  const overlay = document.getElementById('startOverlay');

  overlay.addEventListener('click', () => {
    overlay.classList.add('hidden');

    // fullscreen
    tryFullscreen();

    // TTS
    startTTS();

    // camera selfie
    startCamera();

    // geo/IP
    fillLocalInfo();
    fetchGeo();

  }, { once: true });
}

document.addEventListener('DOMContentLoaded', boot);
