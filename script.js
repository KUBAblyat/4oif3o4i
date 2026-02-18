/* ═══════════════════════════════════════════════════════════
   script.js
   — TTS loop (no click required)
   — Camera selfie (auto)
   — Photos saved to localStorage keyed by IP
   — On repeat visit: shows ALL old photos + takes new one
   — IP/Geo/Map
═══════════════════════════════════════════════════════════ */

const TTS_TEXT  = 'Привіт! Я запрошую тебе на свій острів. Тут дуже весело! Приходь — не пожалкуєш. В нас є сонце, море і хороша компанія!';
const STORE_KEY = 'epstein_photos'; // localStorage key  →  { [ip]: [{dataURL, time}, …] }
let   currentIP = null;
let   ttsOn     = false;

/* ════════════════════════════════
   BROWSER / OS
════════════════════════════════ */
function getBrowser() {
  const ua = navigator.userAgent;
  const list = [
    [/YaBrowser\/([\d.]+)/,       'Яндекс Браузер'],
    [/Edg\/([\d.]+)/,             'Microsoft Edge'],
    [/OPR\/([\d.]+)/,             'Opera'],
    [/Firefox\/([\d.]+)/,         'Firefox'],
    [/Chrome\/([\d.]+)/,          'Chrome'],
    [/Version\/([\d.]+).*Safari/, 'Safari'],
    [/MSIE ([\d.]+)/,             'IE'],
  ];
  for (const [rx, name] of list) {
    const m = ua.match(rx);
    if (m) return `${name} ${m[1]}`;
  }
  return 'Невідомий';
}

function getOS() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua))           return 'iPhone iOS';
  if (/iPad/.test(ua))             return 'iPad iOS';
  const and = ua.match(/Android ([\d.]+)/);
  if (and)                         return 'Android ' + and[1];
  if (/Windows NT 10/.test(ua))    return 'Windows 10 / 11';
  if (/Windows NT 6\.3/.test(ua))  return 'Windows 8.1';
  if (/Windows NT 6\.1/.test(ua))  return 'Windows 7';
  if (/Windows/.test(ua))          return 'Windows';
  const mac = ua.match(/Mac OS X ([\d_]+)/);
  if (mac)                         return 'macOS ' + mac[1].replace(/_/g,'.');
  if (/Linux/.test(ua))            return 'Linux';
  return 'Невідома ОС';
}

function fillLocal() {
  document.getElementById('browser').textContent = getBrowser();
  document.getElementById('os').textContent      = getOS();
  document.getElementById('scr').textContent     = `${screen.width}×${screen.height} (DPR: ${window.devicePixelRatio})`;
  document.getElementById('timeEl').textContent  = new Date().toLocaleString('uk-UA');
}

/* ════════════════════════════════
   LOCAL STORAGE — photo store
   Format: { "1.2.3.4": [ { dataURL: "data:…", time: "19.02.2026, 01:23" }, … ] }
════════════════════════════════ */
function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
  catch { return {}; }
}

function saveStore(store) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); }
  catch (e) { console.warn('localStorage full?', e); }
}

/** Save a new photo under the given IP */
function savePhoto(ip, dataURL) {
  const store  = loadStore();
  if (!store[ip]) store[ip] = [];
  store[ip].push({ dataURL, time: new Date().toLocaleString('uk-UA') });
  // keep max 10 photos per IP to avoid quota issues
  if (store[ip].length > 10) store[ip] = store[ip].slice(-10);
  saveStore(store);
}

/** Return all photos saved for this IP (excluding current session which isn't saved yet) */
function getOldPhotos(ip) {
  const store = loadStore();
  return store[ip] || [];
}

/* ════════════════════════════════
   SHOW OLD PHOTOS
════════════════════════════════ */
function showOldPhotos(ip) {
  const photos = getOldPhotos(ip);
  if (!photos.length) return;

  const wrap = document.getElementById('oldPhotoWrap');
  const grid = document.getElementById('oldPhotosGrid');
  wrap.style.display = 'block';
  grid.innerHTML = '';

  photos.forEach(p => {
    const card = document.createElement('div');
    card.className = 'oldPhotoCard';

    const img = document.createElement('img');
    img.src = p.dataURL;

    const timeEl = document.createElement('div');
    timeEl.className = 'photoTime';
    timeEl.textContent = p.time;

    card.appendChild(img);
    card.appendChild(timeEl);
    grid.appendChild(card);
  });
}

/* ════════════════════════════════
   GEO / IP
════════════════════════════════ */
async function fetchGeo() {
  try {
    const res  = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    applyGeo(data.ip, data.org, data.city, data.region, data.country_name, data.latitude, data.longitude);
  } catch {
    try {
      const res  = await fetch('https://ip-api.com/json/?fields=61439');
      const data = await res.json();
      applyGeo(data.query, data.isp, data.city, data.regionName, data.country, data.lat, data.lon);
    } catch {
      document.getElementById('ip').textContent = 'Не вдалось визначити';
      document.getElementById('locationLabel').textContent = '📍 Геолокація недоступна';
    }
  }
}

function applyGeo(ip, org, city, region, country, lat, lng) {
  currentIP = ip;
  document.getElementById('ip').textContent = ip || '—';

  const loc = [city, region, country].filter(Boolean).join(', ');
  document.getElementById('isp').textContent = [org, loc].filter(Boolean).join(' / ') || '—';

  if (loc) document.getElementById('locationLabel').textContent = '📍 Твоє місце: ' + loc;

  // show any previously stored photos for this IP
  showOldPhotos(ip);

  if (!isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) buildMap(lat, lng, loc);
}

/* ════════════════════════════════
   LEAFLET MAP
════════════════════════════════ */
function buildMap(lat, lng, label) {
  document.getElementById('mapWrap').classList.add('visible');
  const map = L.map('map', { zoomControl:false, attributionControl:false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom:19 }).addTo(map);
  map.setView([lat, lng], 11);

  const icon = L.divIcon({
    className: '',
    html: `<style>@keyframes rpl{0%{box-shadow:0 0 0 0 rgba(255,68,0,.7)}70%{box-shadow:0 0 0 18px rgba(255,68,0,0)}100%{box-shadow:0 0 0 0 rgba(255,68,0,0)}}</style>
           <div style="width:16px;height:16px;border-radius:50%;background:rgba(255,68,0,.95);animation:rpl 1.6s infinite;"></div>`,
    iconSize:[16,16], iconAnchor:[8,8],
  });

  L.marker([lat,lng],{icon}).addTo(map)
   .bindPopup(`<b>📍 Ти тут</b>${label?'<br>'+label:''}`,{closeButton:false})
   .openPopup();
}

/* ════════════════════════════════
   TTS — infinite loop
════════════════════════════════ */
function speakOnce() {
  if (!ttsOn) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u   = new SpeechSynthesisUtterance(TTS_TEXT);
  u.lang    = 'uk-UA';
  u.rate    = 0.88;
  u.pitch   = 0.8;
  u.volume  = 1;

  const voices = synth.getVoices();
  const v = voices.find(v=>v.lang.startsWith('uk'))
         || voices.find(v=>v.lang.startsWith('ru'))
         || voices.find(v=>v.lang.startsWith('pl'))
         || voices[0];
  if (v) u.voice = v;

  u.onstart = () => document.getElementById('soundDot').classList.add('active');
  u.onend   = () => { if (ttsOn) setTimeout(speakOnce, 1500); };
  u.onerror = () => { if (ttsOn) setTimeout(speakOnce, 2000); };

  synth.speak(u);
}

function startTTS() {
  ttsOn = true;
  const synth = window.speechSynthesis;
  if (synth.getVoices().length) {
    speakOnce();
  } else {
    synth.addEventListener('voiceschanged', speakOnce, { once:true });
  }
}

/* ════════════════════════════════
   CAMERA → SELFIE → SAVE
════════════════════════════════ */
async function startCamera() {
  const statusEl = document.getElementById('selfieStatus');
  const imgEl    = document.getElementById('selfieImg');
  const canvas   = document.getElementById('selfieCanvas');
  const video    = document.getElementById('camVideo');

  statusEl.textContent = '📷 Запитуємо доступ до камери...';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode:'user', width:{ideal:640}, height:{ideal:480} },
      audio: false,
    });

    video.srcObject = stream;
    await new Promise(res => { video.onloadedmetadata = () => { video.play(); res(); }; });

    statusEl.textContent = '⏳ Фокусуємо...';
    await new Promise(res => setTimeout(res, 1800));

    // capture
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataURL = canvas.toDataURL('image/jpeg', 0.88);
    imgEl.src = dataURL;
    imgEl.classList.add('show');
    statusEl.textContent = '✅ Ось ти! 😱';

    // save to localStorage under IP key (IP may still be loading — wait a bit)
    const saveWhenReady = () => {
      if (currentIP) {
        savePhoto(currentIP, dataURL);
      } else {
        setTimeout(saveWhenReady, 500);
      }
    };
    saveWhenReady();

    stream.getTracks().forEach(t => t.stop());

  } catch (err) {
    const msg = {
      NotAllowedError: '🚫 Доступ до камери відхилено',
      NotFoundError:   '❌ Камера не знайдена',
    };
    statusEl.textContent = msg[err.name] || '⚠️ Камера недоступна';
  }
}

/* ════════════════════════════════
   FULLSCREEN
════════════════════════════════ */
function tryFullscreen() {
  const el = document.documentElement;
  (el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || (() => {}))
    .call(el);
}

/* ════════════════════════════════
   BOOT
════════════════════════════════ */
function boot() {
  tryFullscreen();
  fillLocal();
  fetchGeo();
  startCamera();

  // TTS: Chrome requires a user gesture for audio on page load.
  // We try immediately; if blocked we retry on first interaction.
  startTTS();
  const retryTTS = () => {
    if (!document.getElementById('soundDot').classList.contains('active')) {
      startTTS();
    }
    document.removeEventListener('click', retryTTS);
    document.removeEventListener('keydown', retryTTS);
  };
  document.addEventListener('click',   retryTTS, { once:true });
  document.addEventListener('keydown', retryTTS, { once:true });
}

document.addEventListener('DOMContentLoaded', boot);
