// ---- Wordbase loading (TSV format) ----

// ---- State ----
const LS_KEY = 'impostor_app_v1';
/** @type {string[]} */
let genres = [];
let GENRE_COUNT = 0; // computed from loaded genres, max 60
let ALL_GENRES_MASK = 0n; // computed after loading genres

const PALETTE = [
  '#4C7DFF','#35C759','#FF3B30','#FF9500','#AF52DE','#FF2D55',
  '#34C7BE','#FFD60A','#5E5CE6','#64D2FF','#30D158','#FF6B6B',
  '#FF9F0A','#7D7AFF','#BF5AF2','#FF375F','#66D4CF','#A1FF0A',
  '#3A86FF','#06D6A0','#EF476F','#F72585','#B5179E','#4D908E'
];

const DEFAULTS = {
  genresMask: 0n, // 0 => treat as all
  useHints: true,
  sameHintForAllImpostors: true,
  thinkEnabled: false,
  thinkSeconds: 45,
  impostorCountWeights: null, // computed based on n
  posMode: 'constant', // 'constant' | 'binomial'
  posP: 0.50,
  allowTypeBHints: true,
  allowedHintStrengths: [true, true, true, true, true] // indexed 1-5, index 0 unused
};

/** @type {{id:string,name:string,color:string}[]} */
let players = [];
/** @type {typeof DEFAULTS} */
let cfg = structuredClone(DEFAULTS);

let wordbase = {
  loaded: false,
  rows: /** @type {any[]} */ ([]),
  count: 0
};

let game = null; // active game object
let revealIndex = 0;
let revealed = false;

// Timer
let timerInterval = null;
let timerRemaining = 0;

// Pinch insert detection
let pinch = { active:false, p1:null, p2:null, startDist:0, fired:false, baseA:null, baseB:null, startYDiff:0 };

// Vote
let voteSelectedId = null;

// ---- DOM ----
const $ = (sel) => document.querySelector(sel);

const screenSetup = $('#screenSetup');
const screenReveal = $('#screenReveal');
const screenPrestart = $('#screenPrestart');
const screenPlay = $('#screenPlay');

const toast = $('#toast');
const toastMsg = $('#toastMsg');

const loopWrap = $('#loopWrap');
const loopInner = $('#loopInner');
const playerCountPill = $('#playerCountPill');

const genreSummary = $('#genreSummary');
const wordbaseStatus = $('#wordbaseStatus');

const toggleHints = $('#toggleHints');
const toggleHintSame = $('#toggleHintSame');
const hintSameRow = $('#hintSameRow');
const toggleThink = $('#toggleThink');
const thinkRow = $('#thinkRow');
const thinkMinutes = $('#thinkMinutes');
const thinkSeconds = $('#thinkSeconds');

// Reveal
const revealProgress = $('#revealProgress');
const revealCounter = $('#revealCounter');
const revealCard = $('#revealCard');
const revealBackground = $('#revealBackground');
const revealCircle = $('#revealCircle');
const revealName = $('#revealName');
const revealPullHint = $('#revealPullHint');
const revealSecret = $('#revealSecret');
const revealRole = $('#revealRole');
const revealWord = $('#revealWord');
const revealHint = $('#revealHint');
const btnRevealNext = $('#btnRevealNext');

// Prestart
const startCircle = $('#startCircle');
const startName = $('#startName');
const startName2 = $('#startName2');

// Play
const playInfo = $('#playInfo');
const timerPanel = $('#timerPanel');
const timerValue = $('#timerValue');

// Modals
const modalGenres = $('#modalGenres');
const genreList = $('#genreList');

const modalPlayer = $('#modalPlayer');
const playerModalTitle = $('#playerModalTitle');
const playerNameInput = $('#playerNameInput');
const palette = $('#palette');
const playerPreviewChip = $('#playerPreviewChip');
const playerPreviewName = $('#playerPreviewName');
const btnPlayerSave = $('#btnPlayerSave');
const btnPlayerDelete = $('#btnPlayerDelete');

const modalAdvanced = $('#modalAdvanced');
const impMaxInfo = $('#impMaxInfo');
const impCountRows = $('#impCountRows');
const btnPosConstant = $('#btnPosConstant');
const btnPosBinomial = $('#btnPosBinomial');
const posModePill = $('#posModePill');
const posBinomialControls = $('#posBinomialControls');
const posPSlider = $('#posPSlider');
const posPLabel = $('#posPLabel');

const toggleTypeBHints = $('#toggleTypeBHints');
const hintStrengthToggles = $('#hintStrengthToggles');

const modalOrder = $('#modalOrder');
const orderBody = $('#orderBody');

const modalVote = $('#modalVote');
const voteList = $('#voteList');
const voteTitle = $('#voteTitle');
const btnKick = $('#btnKick');

const modalEnd = $('#modalEnd');
const btnGameOver = $('#btnGameOver');
const modalRevealEnd = $('#modalRevealEnd');
const endTitle = $('#endTitle');
const endBody = $('#endBody');
const btnContinue = $('#btnContinue');

// ---- Utilities ----
const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function hexToRgb(hex){
  const h = hex.replace('#','').trim();
  const v = parseInt(h, 16);
  return { r:(v>>16)&255, g:(v>>8)&255, b:v&255 };
}
function mix(hexA, hexB, t){
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  const r = Math.round(a.r*(1-t)+b.r*t);
  const g = Math.round(a.g*(1-t)+b.g*t);
  const b2 = Math.round(a.b*(1-t)+b.b*t);
  return `rgb(${r} ${g} ${b2})`;
}
function playerStyles(color){
  // Low-reflection fill, strong border
  const border = color;
  const fill = mix(color, '#0b0d12', 0.72);
  return { border, fill };
}
function formatTime(secs){
  const s = Math.max(0, Math.floor(secs));
  const mm = String(Math.floor(s/60)).padStart(2,'0');
  const ss = String(s%60).padStart(2,'0');
  return `${mm}:${ss}`;
}
function showToast(message, kind=''){
  toast.className = 'toast ' + (kind || '');
  toastMsg.innerHTML = message;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2400);
}

function save(){
  const data = {
    players,
    cfg: {
      ...cfg,
      genresMask: cfg.genresMask.toString()
    }
  };
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

function load(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return;
    const parsed = JSON.parse(raw);
    if(parsed.players && Array.isArray(parsed.players)) players = parsed.players;
    if(parsed.cfg){
      cfg = { ...structuredClone(DEFAULTS), ...parsed.cfg };
      cfg.genresMask = BigInt(parsed.cfg.genresMask ?? '0');
      // Ensure hint filtering settings exist with defaults
      if(typeof cfg.allowTypeBHints !== 'boolean') cfg.allowTypeBHints = DEFAULTS.allowTypeBHints;
      if(!Array.isArray(cfg.allowedHintStrengths) || cfg.allowedHintStrengths.length !== 5){
        cfg.allowedHintStrengths = [...DEFAULTS.allowedHintStrengths];
      }
    }
  }catch(e){
    // ignore
  }
}

function setActiveScreen(id){
  for (const el of [screenSetup, screenReveal, screenPrestart, screenPlay]) el.classList.remove('active');
  $(id).classList.add('active');
}

function openModal(el){
  el.classList.remove('hidden');
  el.setAttribute('aria-hidden','false');
}
function closeModal(el){
  el.classList.add('hidden');
  el.setAttribute('aria-hidden','true');
}

function updateGenreSummary(){
  const m = cfg.genresMask;
  if(m === 0n) { genreSummary.textContent = 'All'; return; }
  let count = 0;
  for(let i=0;i<GENRE_COUNT;i++){
    if(m & (1n<<BigInt(i))) count++;
  }
  if(count === GENRE_COUNT) genreSummary.textContent = 'All';
  else genreSummary.textContent = `${count} selected`;
}

function ensureImpWeights(){
  const n = players.length;
  const maxK = Math.ceil(n/2);
  if(!cfg.impostorCountWeights || !Array.isArray(cfg.impostorCountWeights)){
    cfg.impostorCountWeights = new Array(maxK+1).fill(0);
    if(maxK >= 1) cfg.impostorCountWeights[1] = 90;
    if(maxK >= 2) cfg.impostorCountWeights[2] = 10;
    return;
  }
  // resize while preserving
  const cur = cfg.impostorCountWeights.slice();
  const next = new Array(maxK+1).fill(0);
  for(let k=0;k<next.length;k++){
    if(k < cur.length) next[k] = cur[k];
  }
  cfg.impostorCountWeights = next;
  // if all zero, keep (will auto-default on exit per requirement)
}

function normalizeImpWeights(){
  ensureImpWeights();
  const w = cfg.impostorCountWeights;
  const sum = w.reduce((a,b)=>a+b,0);
  if(sum === 0){
    const n = players.length;
    const maxK = Math.ceil(n/2);
    cfg.impostorCountWeights = new Array(maxK+1).fill(0);
    if(maxK >= 1) cfg.impostorCountWeights[1] = 90;
    if(maxK >= 2) cfg.impostorCountWeights[2] = 10;
  }
}

function sampleImpostorCount(){
  normalizeImpWeights();
  const w = cfg.impostorCountWeights;
  const sum = w.reduce((a,b)=>a+b,0);
  let r = Math.random() * sum;
  for(let k=0;k<w.length;k++){
    r -= w[k];
    if(r <= 0) return k;
  }
  return w.length-1;
}

function sampleOffset(n){
  if(cfg.posMode === 'constant') return Math.floor(Math.random() * n);
  // binomial as specified: sum of n random numbers rounded to 1 if > p else 0
  const p = clamp(cfg.posP, 0.01, 0.99);
  let s = 0;
  for(let i=0;i<n;i++){
    const u = Math.random();
    s += (u > p) ? 1 : 0;
  }
  return s % n;
}

function pickRandom(arr){
  return arr[Math.floor(Math.random() * arr.length)];
}

function computeHint(row){
  if(!cfg.useHints) return '';
  
  // Parse hints from comma-separated string
  const hintsStr = row.hints || '';
  if(!hintsStr.trim()) return '';
  
  const hintStrings = hintsStr.split(',').map(h => h.trim()).filter(h => h.length > 0);
  if(!hintStrings.length) return '';
  
  // Filter hints based on settings
  const filteredHints = [];
  for(const hintStr of hintStrings){
    // Parse format: "word~vibe~difficulty"
    const parts = hintStr.split('~');
    if(parts.length < 3) continue;
    
    const vibe = parts[1];
    const difficulty = Number(parts[2]);
    
    // Filter by type B toggle
    if(vibe === 'B' && !cfg.allowTypeBHints) continue;
    
    // Filter by strength toggles (difficulty 1-5, indexed 1-5 in array)
    if(difficulty >= 1 && difficulty <= 5){
      if(!cfg.allowedHintStrengths[difficulty - 1]) continue;
    }
    
    filteredHints.push(hintStr);
  }
  
  if(!filteredHints.length) return '';
  return pickRandom(filteredHints);
}

function filterRowsByGenres(rows){
  const m = cfg.genresMask;
  if(m === 0n) return rows;
  // treat full mask as all too
  if(ALL_GENRES_MASK > 0n && m === ALL_GENRES_MASK) return rows;
  const out = [];
  for(const r of rows){
    // Parse genre_ids from pipe-separated string (e.g., "1|2|3")
    const genreIdsStr = r.genre_ids || '';
    if(!genreIdsStr) continue;
    const genreIds = genreIdsStr.split('|').map(id => Number(id.trim())).filter(id => !isNaN(id));
    
    // Check if any genre_id matches selected genres in mask
    let matches = false;
    for(const genreId of genreIds){
      if(genreId >= 0 && genreId < GENRE_COUNT){
        const bit = 1n << BigInt(genreId);
        if((m & bit) !== 0n){
          matches = true;
          break;
        }
      }
    }
    if(matches) out.push(r);
  }
  return out;
}

// ---- Genres loading ----
async function loadGenres(){
  try{
    const res = await fetch('./genres.json', { cache: 'no-store' });
    if(!res.ok) throw new Error('Could not fetch genres.json');
    const data = await res.json();
    if(!Array.isArray(data)) throw new Error('genres.json must be an array of strings');
    
    // Limit to 60 genres (64-bit bitmap constraint)
    genres = data.slice(0, 60).filter(g => typeof g === 'string' && g.trim().length > 0);
    GENRE_COUNT = genres.length;
    ALL_GENRES_MASK = GENRE_COUNT > 0 ? (1n << BigInt(GENRE_COUNT)) - 1n : 0n;
    
    // Clear any bits in genresMask beyond the loaded genre count
    if(GENRE_COUNT > 0 && cfg.genresMask > 0n){
      cfg.genresMask = cfg.genresMask & ALL_GENRES_MASK;
    } else if(GENRE_COUNT === 0){
      cfg.genresMask = 0n;
    }
    
    // Update genre summary if already rendered
    if(genreSummary) updateGenreSummary();
  }catch(e){
    console.error('Failed to load genres.json:', e);
    // Fallback to empty genres
    genres = [];
    GENRE_COUNT = 0;
    ALL_GENRES_MASK = 0n;
  }
}

// ---- Wordbase loading ----
async function loadWordbase(){
  try{
    const res = await fetch('./wordbase.tsv', { cache: 'no-store' });
    if(!res.ok) throw new Error('Could not fetch wordbase.tsv');
    const text = await res.text();
    const lines = text.trim().split('\n');
    if(lines.length < 2) throw new Error('TSV file must have at least a header and one data row');
    
    // Parse header (first line)
    const headers = lines[0].split('\t');
    
    // Parse data rows
    const rows = [];
    for(let i = 1; i < lines.length; i++){
      const values = lines[i].split('\t');
      const row = {};
      headers.forEach((h, idx) => {
        const val = (values[idx] || '').trim();
        if(h === 'difficulty'){
          row[h] = Number(val) || 0;
        } else {
          // Store as strings: word, genre_ids (pipe-separated), hints (comma-separated)
          row[h] = val;
        }
      });
      rows.push(row);
    }
    
    wordbase.rows = rows;
    wordbase.count = rows.length;
    wordbase.loaded = true;
    if(wordbaseStatus) wordbaseStatus.innerHTML = `Wordbase loaded: <strong>${wordbase.count.toLocaleString()}</strong> words.`;
    showToast('Wordbase loaded.', 'ok');
  }catch(e){
    wordbase.loaded = false;
    if(wordbaseStatus) wordbaseStatus.innerHTML = `Wordbase load failed. Place <strong>wordbase.tsv</strong> next to this page.`;
    showToast('Wordbase load failed. See status message.', 'danger');
  }
}

// ---- Rendering: players loop ----
const ROW_HEIGHT = 86;

function renderPlayerLoop(){
  playerCountPill.textContent = String(players.length);
  loopInner.innerHTML = '';

  if(players.length === 0){
    const wrap = document.createElement('div');
    wrap.className = 'add-inline';
    wrap.innerHTML = `<button class="add-circle" id="btnAddInline" aria-label="Add player">+</button>`;
    loopInner.appendChild(wrap);
    requestAnimationFrame(() => {
      const b = $('#btnAddInline');
      if(b) b.addEventListener('click', () => openPlayerModal(null));
    });
    return;
  }

  // Ensure enough items to fill viewport: repeat base list
  const viewportH = loopWrap.clientHeight || Math.max(240, Math.floor(window.innerHeight * 0.40));
  const minRows = Math.ceil(viewportH / ROW_HEIGHT) + 8;
  const m = players.length;
  const repeats = Math.max(3, Math.ceil(minRows / m));
  const total = repeats * m;

  for(let idx=0; idx<total; idx++){
    const baseIndex = idx % m;
    const p = players[baseIndex];
    const row = document.createElement('div');
    row.className = 'player-row';
    row.dataset.baseIndex = String(baseIndex);
    row.dataset.playerId = p.id;

    const st = playerStyles(p.color);
    row.innerHTML = `
      <div class="swipe-bg">
        <div class="left">Remove</div>
        <div class="right">Edit</div>
      </div>
      <div class="player-chip" style="border-color:${st.border}; background:${st.fill}">
        <div class="name">${escapeHtml(p.name)}</div>
      </div>
    `;
    loopInner.appendChild(row);
    attachSwipeHandlers(row);
  }

  // Center scroll
  requestAnimationFrame(() => {
    const block = m * ROW_HEIGHT;
    const target = block * Math.floor(repeats/2);
    loopWrap.scrollTop = target;
  });
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function keepLoopCentered(){
  if(players.length === 0) return;
  const m = players.length;
  const block = m * ROW_HEIGHT;
  const scrollTop = loopWrap.scrollTop;
  const maxScroll = loopInner.scrollHeight - loopWrap.clientHeight;
  // if near top or bottom, jump by one block
  if(scrollTop < block * 0.5){
    loopWrap.scrollTop = scrollTop + block;
  } else if(scrollTop > maxScroll - block * 0.5){
    loopWrap.scrollTop = scrollTop - block;
  }
}

// ---- Swipe handlers (remove/edit) ----
function attachSwipeHandlers(row){
  let startX=0, startY=0, dx=0, swiping=false;
  let pointerId = null;
  const chip = row.querySelector('.player-chip');

  row.addEventListener('pointerdown', (ev) => {
    if(ev.pointerType === 'mouse' && ev.button !== 0) return;
    pointerId = ev.pointerId;
    row.setPointerCapture(pointerId);
    startX = ev.clientX;
    startY = ev.clientY;
    dx = 0;
    swiping = false;
  }, { passive:true });

  row.addEventListener('pointermove', (ev) => {
    if(pointerId !== ev.pointerId) return;
    const ddx = ev.clientX - startX;
    const ddy = ev.clientY - startY;

    // determine intent
    if(!swiping){
      if(Math.abs(ddx) > 10 && Math.abs(ddx) > Math.abs(ddy) * 1.2){
        swiping = true;
        row.classList.add('swiping');
      } else {
        return;
      }
    }

    ev.preventDefault();
    dx = clamp(ddx, -220, 220);
    chip.style.setProperty('--dx', dx + 'px');

    // stronger visual for far swipe
    const alpha = clamp(Math.abs(dx)/170, 0, 1);
    row.querySelector('.swipe-bg').style.opacity = String(alpha);
  }, { passive:false });

  row.addEventListener('pointerup', (ev) => {
    if(pointerId !== ev.pointerId) return;
    pointerId = null;
    row.classList.remove('swiping');
    row.querySelector('.swipe-bg').style.opacity = '';
    const w = row.getBoundingClientRect().width;

    const removeThresh = -Math.min(260, w * 0.45);
    const editThresh = Math.min(260, w * 0.40);

    if(dx <= removeThresh){
      // remove
      const id = row.dataset.playerId;
      removePlayer(id);
      chip.style.setProperty('--dx','0px');
      return;
    }
    if(dx >= editThresh){
      const id = row.dataset.playerId;
      openPlayerModal(id);
      chip.style.setProperty('--dx','0px');
      return;
    }
    chip.style.setProperty('--dx','0px');
  }, { passive:true });

  row.addEventListener('pointercancel', () => {
    pointerId = null;
    row.classList.remove('swiping');
    row.querySelector('.swipe-bg').style.opacity = '';
    chip.style.setProperty('--dx','0px');
  }, { passive:true });
}

// ---- Pinch insert between consecutive players ----
loopWrap.addEventListener('pointerdown', (ev) => {
  if(ev.pointerType === 'mouse') return;
  if(!pinch.p1){
    pinch.p1 = { id: ev.pointerId, x: ev.clientX, y: ev.clientY };
  } else if(!pinch.p2 && ev.pointerId !== pinch.p1.id){
    pinch.p2 = { id: ev.pointerId, x: ev.clientX, y: ev.clientY };
    pinch.active = true;
    pinch.fired = false;

    const d = dist(pinch.p1, pinch.p2);
    pinch.startDist = d;

    const a = baseIndexFromPoint(pinch.p1.x, pinch.p1.y);
    const b = baseIndexFromPoint(pinch.p2.x, pinch.p2.y);
    pinch.baseA = a;
    pinch.baseB = b;
    pinch.startYDiff = Math.abs(pinch.p1.y - pinch.p2.y);
  }
}, { passive:true });

loopWrap.addEventListener('pointermove', (ev) => {
  if(!pinch.active) return;
  if(ev.pointerId === pinch.p1?.id){ pinch.p1.x = ev.clientX; pinch.p1.y = ev.clientY; }
  if(ev.pointerId === pinch.p2?.id){ pinch.p2.x = ev.clientX; pinch.p2.y = ev.clientY; }

  if(pinch.fired) return;

  const d = dist(pinch.p1, pinch.p2);
  const ydiff = Math.abs(pinch.p1.y - pinch.p2.y);
  if(players.length < 2) return;

  // must be between two circles close to each other vertically
  if(pinch.baseA == null || pinch.baseB == null) return;
  if(pinch.startYDiff > ROW_HEIGHT * 1.3) return;

  // must be consecutive base indices (circular)
  const m = players.length;
  const a = pinch.baseA, b = pinch.baseB;
  const consec = ((a + 1) % m === b) || ((b + 1) % m === a);
  if(!consec) return;

  // pull apart threshold
  if((d - pinch.startDist) > 90 && (ydiff - pinch.startYDiff) > 40){
    pinch.fired = true;
    const insertAfter = ((a + 1) % m === b) ? a : b;
    insertPlayerAfter(insertAfter);
  }
}, { passive:true });

function resetPinch(){
  pinch.active=false; pinch.p1=null; pinch.p2=null; pinch.fired=false; pinch.baseA=null; pinch.baseB=null;
}
loopWrap.addEventListener('pointerup', resetPinch, { passive:true });
loopWrap.addEventListener('pointercancel', resetPinch, { passive:true });

function dist(p1, p2){
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx*dx + dy*dy);
}

function baseIndexFromPoint(x,y){
  const el = document.elementFromPoint(x,y);
  const row = el?.closest?.('.player-row');
  if(!row) return null;
  return Number(row.dataset.baseIndex);
}

// ---- Player ops ----
function randomColor(){
  // prefer unused for variety
  const used = new Set(players.map(p=>p.color));
  const choices = PALETTE.filter(c=>!used.has(c));
  return (choices.length ? pickRandom(choices) : pickRandom(PALETTE));
}

function nextDefaultName(){
  const base = 'Player';
  let i = players.length + 1;
  const names = new Set(players.map(p=>p.name.trim().toLowerCase()));
  while(names.has((base+' '+i).toLowerCase())) i++;
  return base+' '+i;
}

function addPlayerAt(index){
  const p = { id: uid(), name: nextDefaultName(), color: randomColor() };
  players.splice(index, 0, p);
  ensureImpWeights();
  save();
  renderAll();
  showToast('Player added.', 'ok');
}

function insertPlayerAfter(baseIndex){
  const idx = clamp(baseIndex + 1, 0, players.length);
  addPlayerAt(idx);
  // open edit immediately for convenience
  openPlayerModal(players[idx]?.id);
  showToast('Inserted a player.', 'ok');
}

function removePlayer(id){
  if(players.length === 0) return;
  const idx = players.findIndex(p=>p.id===id);
  if(idx<0) return;
  players.splice(idx,1);
  ensureImpWeights();
  save();
  renderAll();
  showToast('Player removed.', 'warn');
}

// ---- Player modal ----
let editingPlayerId = null;
let editingColor = null;

function renderPalette(){
  palette.innerHTML = '';
  for(const c of PALETTE){
    const b = document.createElement('button');
    b.className = 'swatch' + (editingColor===c ? ' sel':'' );
    b.style.background = c;
    b.addEventListener('click', () => {
      editingColor = c;
      renderPalette();
      updatePlayerPreview();
    });
    palette.appendChild(b);
  }
}

function updatePlayerPreview(){
  const name = playerNameInput.value.trim() || 'Name';
  playerPreviewName.textContent = name;
  const st = playerStyles(editingColor || '#4C7DFF');
  playerPreviewChip.style.borderColor = st.border;
  playerPreviewChip.style.background = st.fill;
}

function openPlayerModal(id){
  editingPlayerId = id;
  const isNew = (id == null);

  if(isNew){
    playerModalTitle.textContent = 'Add player';
    playerNameInput.value = '';
    editingColor = randomColor();
    btnPlayerDelete.style.display = 'none';
  } else {
    const p = players.find(x=>x.id===id);
    if(!p) return;
    playerModalTitle.textContent = 'Edit player';
    playerNameInput.value = p.name;
    editingColor = p.color;
    btnPlayerDelete.style.display = 'inline-block';
  }

  renderPalette();
  updatePlayerPreview();
  openModal(modalPlayer);
  setTimeout(() => playerNameInput.focus(), 40);
}

btnPlayerDelete.addEventListener('click', () => {
  if(editingPlayerId) removePlayer(editingPlayerId);
  closeModal(modalPlayer);
});

playerNameInput.addEventListener('input', updatePlayerPreview);

btnPlayerSave.addEventListener('click', () => {
  const name = playerNameInput.value.trim();
  if(!name){
    showToast('Name must be non‑empty.', 'danger');
    playerNameInput.focus();
    return;
  }
  if(!editingColor) editingColor = randomColor();

  if(editingPlayerId == null){
    // add at end
    players.push({ id: uid(), name, color: editingColor });
  } else {
    const p = players.find(x=>x.id===editingPlayerId);
    if(p){
      p.name = name;
      p.color = editingColor;
    }
  }
  ensureImpWeights();
  save();
  renderAll();
  closeModal(modalPlayer);
  showToast('Saved.', 'ok');
});

// ---- Genres modal ----
function renderGenres(){
  genreList.innerHTML = '';
  for(let i=0;i<GENRE_COUNT;i++){
    const bit = 1n << BigInt(i);
    const checked = (cfg.genresMask & bit) !== 0n;
    const genreName = genres[i] || `Genre ${i+1}`;
    const row = document.createElement('div');
    row.className = 'genre-item';
    row.innerHTML = `
      <div class="g">${escapeHtml(genreName)}</div>
      <label class="inline">
        <input type="checkbox" class="hidden" ${checked ? 'checked':''} data-genre="${i}">
        <span class="switch" aria-hidden="true"></span>
      </label>
    `;
    const cb = row.querySelector('input[type="checkbox"]');
    cb.addEventListener('change', () => {
      const idx = Number(cb.dataset.genre);
      const b = 1n << BigInt(idx);
      if(cb.checked) cfg.genresMask |= b;
      else cfg.genresMask &= ~b;
      updateGenreSummary();
      save();
    });
    genreList.appendChild(row);
  }
}

$('#btnSelectAllGenres').addEventListener('click', () => {
  cfg.genresMask = ALL_GENRES_MASK;
  renderGenres(); updateGenreSummary(); save();
});
$('#btnDeselectAllGenres').addEventListener('click', () => {
  cfg.genresMask = 0n;
  renderGenres(); updateGenreSummary(); save();
});

// ---- Order modal (simple up/down) ----
function renderOrder(){
  orderBody.innerHTML = '';
  if(players.length === 0){
    orderBody.innerHTML = `<div class="small">No players yet.</div>`;
    return;
  }
  for(let i=0;i<players.length;i++){
    const p = players[i];
    const st = playerStyles(p.color);
    const row = document.createElement('div');
    row.className = 'order-item';
    row.draggable = true;
    row.dataset.playerId = p.id;
    row.dataset.index = String(i);
    row.innerHTML = `
      <div class="inline" style="gap:12px">
        <div class="player-chip" style="width:52px;height:52px;border-width:3px;border-color:${st.border};background:${st.fill}">
          <div class="name" style="font-size:10px;-webkit-line-clamp:2">${escapeHtml(p.name)}</div>
        </div>
        <div>
          <div style="font-weight:700">${escapeHtml(p.name)}</div>
          <div class="small">Position ${i+1}</div>
        </div>
      </div>
      <div class="inline">
        <button class="btn ghost" ${i===0?'disabled':''} data-up="${p.id}">Up</button>
        <button class="btn ghost" ${i===players.length-1?'disabled':''} data-down="${p.id}">Down</button>
      </div>
    `;
    orderBody.appendChild(row);
  }
  
  // Attach drag and drop handlers
  attachDragHandlers();
  
  // Keep Up/Down buttons as fallback
  orderBody.querySelectorAll('button[data-up]').forEach(b => {
    b.addEventListener('click', () => movePlayer(b.dataset.up, -1));
  });
  orderBody.querySelectorAll('button[data-down]').forEach(b => {
    b.addEventListener('click', () => movePlayer(b.dataset.down, +1));
  });
}

function attachDragHandlers(){
  const items = orderBody.querySelectorAll('.order-item');
  let draggedElement = null;
  let draggedIndex = null;
  
  items.forEach((item, index) => {
    item.addEventListener('dragstart', (e) => {
      draggedElement = item;
      draggedIndex = parseInt(item.dataset.index);
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', item.innerHTML);
      // Set a custom drag image for better visual feedback
      e.dataTransfer.setDragImage(item, 0, 0);
    });
    
    item.addEventListener('dragend', (e) => {
      item.classList.remove('dragging');
      items.forEach(i => i.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom'));
      draggedElement = null;
      draggedIndex = null;
    });
    
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      if(draggedElement === item) return;
      
      const rect = item.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const mouseY = e.clientY;
      
      items.forEach(i => {
        i.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
      });
      
      if(mouseY < midY){
        item.classList.add('drag-over-top');
      } else {
        item.classList.add('drag-over-bottom');
      }
    });
    
    item.addEventListener('dragleave', (e) => {
      item.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
    });
    
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if(!draggedElement || draggedElement === item) return;
      
      const dropIndex = parseInt(item.dataset.index);
      const rect = item.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const mouseY = e.clientY;
      
      let targetIndex = dropIndex;
      if(mouseY > midY){
        targetIndex = dropIndex + 1;
      }
      
      // Adjust target index if dragging from above
      if(draggedIndex < targetIndex){
        targetIndex--;
      }
      
      // Move the player
      if(draggedIndex !== targetIndex && targetIndex >= 0 && targetIndex < players.length){
        const [movedPlayer] = players.splice(draggedIndex, 1);
        players.splice(targetIndex, 0, movedPlayer);
        save();
        renderAll();
        renderOrder();
      }
    });
  });
}

function movePlayer(id, dir){
  const idx = players.findIndex(p=>p.id===id);
  if(idx<0) return;
  const j = idx + dir;
  if(j<0 || j>=players.length) return;
  const tmp = players[idx];
  players[idx] = players[j];
  players[j] = tmp;
  save();
  renderAll();
  renderOrder();
}

// ---- Advanced modal ----
function renderAdvanced(){
  ensureImpWeights();
  const n = players.length;
  const maxK = Math.ceil(n/2);
  impMaxInfo.textContent = `max: ${maxK}`;
  impCountRows.innerHTML = '';
  for(let k=0;k<=maxK;k++){
    const w = cfg.impostorCountWeights[k] ?? 0;
    const wrap = document.createElement('div');
    wrap.className = 'imp-row';
    wrap.innerHTML = `
      <div class="kv">
        <div class="k">k = ${k}</div>
        <div class="v"><span data-w="${k}">${w}</span>%</div>
      </div>
      <input type="range" min="0" max="100" step="1" value="${w}" data-k="${k}">
    `;
    const r = wrap.querySelector('input[type="range"]');
    const label = wrap.querySelector('span[data-w]');
    r.addEventListener('input', () => {
      const kk = Number(r.dataset.k);
      const vv = Number(r.value);
      cfg.impostorCountWeights[kk] = vv;
      label.textContent = String(vv);
      save();
    });
    r.addEventListener('change', () => {
      // if sum is 0, revert to default after player exits (we implement immediately on close)
    });
    impCountRows.appendChild(wrap);
  }

  // Position mode controls
  posModePill.textContent = (cfg.posMode === 'binomial') ? 'Binomial' : 'Constant';
  if(cfg.posMode === 'binomial'){
    posBinomialControls.style.display = 'block';
    posPSlider.value = String(Math.round(cfg.posP*100));
    posPLabel.textContent = `${Math.round(cfg.posP*100)}%`;
  } else {
    posBinomialControls.style.display = 'none';
  }

  // Hint filtering controls
  toggleTypeBHints.checked = cfg.allowTypeBHints;
  
  // Render hint strength toggles (1-5)
  hintStrengthToggles.innerHTML = '';
  for(let i = 1; i <= 5; i++){
    const toggle = document.createElement('button');
    toggle.className = 'hint-strength-toggle' + (cfg.allowedHintStrengths[i - 1] ? ' active' : '');
    toggle.textContent = String(i);
    toggle.dataset.strength = String(i);
    toggle.addEventListener('click', () => {
      const strength = Number(toggle.dataset.strength);
      cfg.allowedHintStrengths[strength - 1] = !cfg.allowedHintStrengths[strength - 1];
      toggle.classList.toggle('active');
      save();
    });
    hintStrengthToggles.appendChild(toggle);
  }
}

function setPosMode(mode){
  cfg.posMode = mode;
  save();
  renderAdvanced();
}

btnPosConstant.addEventListener('click', () => setPosMode('constant'));
btnPosBinomial.addEventListener('click', () => setPosMode('binomial'));
posPSlider.addEventListener('input', () => {
  const v = Number(posPSlider.value);
  cfg.posP = v / 100;
  posPLabel.textContent = `${v}%`;
  save();
});

// On close advanced: if weights sum is 0, revert to default
function onCloseAdvanced(){
  normalizeImpWeights();
  save();
  renderAll();
}

// ---- Game flow ----
function startGame(){
  if(players.length < 2){
    showToast('Add at least 2 players.', 'danger');
    return;
  }
  if(!wordbase.loaded || !wordbase.count){
    showToast('Wordbase not loaded. Check wordbase.tsv.', 'danger');
    return;
  }

  // think time
  if(cfg.thinkEnabled){
    const mm = clamp(Number(thinkMinutes.value||0), 0, 999);
    const ss = clamp(Number(thinkSeconds.value||0), 0, 59);
    cfg.thinkSeconds = mm*60 + ss;
    if(cfg.thinkSeconds <= 0){
      cfg.thinkEnabled = false;
      toggleThink.checked = false;
      thinkRow.style.display = 'none';
    }
  }

  // choose word
  const eligible = filterRowsByGenres(wordbase.rows);
  if(!eligible.length){
    showToast('No words match the selected genres.', 'danger');
    return;
  }
  const row = pickRandom(eligible);
  const secretWord = String(row.word ?? '').trim();
  if(!secretWord){
    showToast('Selected word is empty. Check wordbase.', 'danger');
    return;
  }

  // decide start player
  const n = players.length;
  const start = Math.floor(Math.random() * n);

  // decide impostor count
  const k = clamp(sampleImpostorCount(), 0, Math.ceil(n/2));

  // decide impostor indices relative to start
  const impostors = new Set();
  const indices = [...Array(n).keys()];

  for(let ii=0; ii<k; ii++){
    let placed = false;
    for(let t=0;t<16;t++){
      const off = sampleOffset(n);
      const pos = (start + off) % n;
      if(!impostors.has(pos)){
        impostors.add(pos);
        placed = true;
        break;
      }
    }
    if(!placed){
      const available = indices.filter(x => !impostors.has(x));
      if(available.length){
        impostors.add(pickRandom(available));
      }
    }
  }

  // Compute hints based on setting
  let hint = null;
  const impostorHints = new Map(); // Map<playerIndex, hint>
  
  if(cfg.useHints){
    if(cfg.sameHintForAllImpostors){
      hint = computeHint(row);
      // All impostors get the same hint
      for(const impIdx of impostors){
        impostorHints.set(impIdx, hint);
      }
    } else {
      // Each impostor gets a random hint
      for(const impIdx of impostors){
        impostorHints.set(impIdx, computeHint(row));
      }
      // For backward compatibility, store first impostor's hint
      if(impostors.size > 0){
        const firstImp = [...impostors][0];
        hint = impostorHints.get(firstImp) || '';
      }
    }
  }

  game = {
    word: secretWord,
    hint, // kept for backward compatibility
    impostorHints, // Map<playerIndex, hint>
    startIndex: start,
    impostors, // Set<number>
    alive: new Array(n).fill(true),
    endedReason: null
  };

  revealIndex = 0;
  revealed = false;
  enterReveal();
}

function enterReveal(){
  setActiveScreen('#screenReveal');
  document.body.classList.remove('timeout');
  stopTimer();
  renderReveal();
}

function renderReveal(){
  const n = players.length;
  const p = players[revealIndex];
  revealCounter.textContent = `${revealIndex+1}/${n}`;
  revealName.textContent = p.name;

  // style circle - use player color like in player view
  const st = playerStyles(p.color);
  revealCircle.style.borderColor = st.border;
  revealCircle.style.background = st.fill;
  // Set background container color to match player color
  revealBackground.style.setProperty('--bg', st.fill);

  // progress dots
  revealProgress.innerHTML = '';
  for(let i=0;i<n;i++){
    const d = document.createElement('div');
    d.className = 'dot' + (i<=revealIndex ? ' on' : '');
    revealProgress.appendChild(d);
  }

  // secret panel - always visible behind circle
  btnRevealNext.style.display = 'none';
  revealed = false;
  revealPullHint.textContent = 'Swipe up to reveal';
  revealCard.style.setProperty('--revealY','0px');
  revealBackground.style.setProperty('--revealY','0px');

  // role/word/hint prepared (but hidden)
  const isImp = game.impostors.has(revealIndex);
  if(isImp){
    revealRole.textContent = 'Impostor';
    revealRole.style.color = 'rgba(255,59,48,.92)';
    revealWord.textContent = '';
    if(cfg.useHints){
      const impHint = game.impostorHints?.get(revealIndex) || game.hint || '';
      revealHint.textContent = impHint ? ('Hint: ' + impHint) : 'Hint: (none)';
    } else {
      revealHint.textContent = 'Hints are disabled.';
    }
  } else {
    revealRole.textContent = 'Secret word';
    revealRole.style.color = 'rgba(243,245,255,.92)';
    revealWord.textContent = game.word;
    revealHint.textContent = 'Say an association without revealing the word to impostors.';
  }
}

function revealNow(){
  if(revealed) return;
  revealed = true;
  btnRevealNext.style.display = 'block';
  revealPullHint.textContent = 'Pass the device after tapping Next';
}

function nextReveal(){
  const n = players.length;
  if(revealIndex < n-1){
    revealIndex++;
    renderReveal();
  } else {
    enterPrestart();
  }
}

function enterPrestart(){
  setActiveScreen('#screenPrestart');
  const p = players[game.startIndex];
  const st = playerStyles(p.color);
  startCircle.style.borderColor = st.border;
  startCircle.style.background = st.fill;
  startName.textContent = p.name;
  startName2.textContent = p.name;
}

function enterPlay(){
  setActiveScreen('#screenPlay');
  const p = players[game.startIndex];
  playInfo.textContent = `Starting player: ${p.name}`;
  if(cfg.thinkEnabled && cfg.thinkSeconds > 0){
    timerPanel.classList.remove('hidden');
    timerRemaining = cfg.thinkSeconds;
    timerValue.textContent = formatTime(timerRemaining);
    timerPanel.classList.remove('timeout');
    startTimer();
  } else {
    timerPanel.classList.add('hidden');
    stopTimer();
  }
}

function startTimer(){
  stopTimer();
  timerInterval = setInterval(() => {
    if(timerRemaining <= 0){
      stopTimer();
      timerRemaining = 0;
      timerValue.textContent = formatTime(0);
      timerPanel.classList.add('timeout');
      document.body.classList.add('timeout');
      return;
    }
    timerRemaining--;
    timerValue.textContent = formatTime(timerRemaining);
  }, 1000);
}

function stopTimer(){
  if(timerInterval){
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function restartTimer(){
  if(!cfg.thinkEnabled || cfg.thinkSeconds <= 0) return;
  timerRemaining = cfg.thinkSeconds;
  timerValue.textContent = formatTime(timerRemaining);
  timerPanel.classList.remove('timeout');
  document.body.classList.remove('timeout');
  startTimer();
}

function openVote(){
  voteSelectedId = null;
  btnKick.disabled = true;
  voteTitle.textContent = 'Vote';
  voteList.innerHTML = '';

  for(const p of players){
    const idx = players.findIndex(x=>x.id===p.id);
    const alive = game.alive[idx];
    const st = playerStyles(p.color);

    const row = document.createElement('div');
    row.className = 'genre-item';
    row.style.opacity = alive ? '1' : '.45';
    row.innerHTML = `
      <div class="inline" style="gap:12px">
        <div class="player-chip" style="width:52px;height:52px;border-width:3px;border-color:${st.border};background:${st.fill}">
          <div class="name" style="font-size:10px;-webkit-line-clamp:2">${escapeHtml(p.name)}</div>
        </div>
        <div>
          <div style="font-weight:750">${escapeHtml(p.name)}</div>
          <div class="small">${alive ? 'in game' : 'kicked out'}</div>
        </div>
      </div>
      <button class="btn ghost" ${alive ? '' : 'disabled'} data-pick="${p.id}">Select</button>
    `;
    voteList.appendChild(row);
  }

  voteList.querySelectorAll('button[data-pick]').forEach(b => {
    b.addEventListener('click', () => {
      voteSelectedId = b.dataset.pick;
      btnKick.disabled = false;
      voteTitle.textContent = 'Kick';
      // visual selection
      voteList.querySelectorAll('button[data-pick]').forEach(x => x.textContent = (x.dataset.pick===voteSelectedId) ? 'Selected' : 'Select');
    });
  });

  openModal(modalVote);
}

function kickSelected(){
  if(!voteSelectedId) return;
  const idx = players.findIndex(p=>p.id===voteSelectedId);
  if(idx<0) return;
  if(!game.alive[idx]) return;
  game.alive[idx] = false;
  closeModal(modalVote);
  showToast(`${players[idx].name} was kicked.`, 'warn');
  checkAutoEnd();
}

function checkAutoEnd(){
  const aliveIdx = game.alive.map((a,i)=>a?i:-1).filter(i=>i>=0);
  const aliveImp = aliveIdx.filter(i => game.impostors.has(i)).length;
  const aliveCrew = aliveIdx.length - aliveImp;

  if(aliveImp === 0){
    endGame('All impostors were kicked.');
    return;
  }
  if(aliveCrew === aliveImp){
    endGame('Impostors reached parity.');
    return;
  }
}

function endGame(reason){
  game.endedReason = reason || null;
  revealEndOverlay();
}

function revealEndOverlay(){
  closeModal(modalEnd);
  endTitle.textContent = 'Game over';
  const impNames = [...game.impostors].map(i => players[i]?.name ?? '(unknown)');
  const impList = impNames.length ? impNames.join(', ') : '(none)';
  // Show hint info in end screen
  let hintLine = '';
  if(cfg.useHints){
    if(cfg.sameHintForAllImpostors && game.hint){
      hintLine = `<div class="small" style="margin-top:6px">Hint shown to impostors: <span class="muted">${escapeHtml(game.hint)}</span></div>`;
    } else if(!cfg.sameHintForAllImpostors && game.impostorHints && game.impostorHints.size > 0){
      const hints = [...game.impostorHints.values()].filter(h => h).map(h => escapeHtml(h));
      if(hints.length > 0){
        const uniqueHints = [...new Set(hints)];
        hintLine = `<div class="small" style="margin-top:6px">Hints shown to impostors: <span class="muted">${uniqueHints.join(', ')}</span></div>`;
      }
    }
  }
  const reasonLine = game.endedReason ? `<div class="small" style="margin-top:6px">End condition: <span class="muted">${escapeHtml(game.endedReason)}</span></div>` : '';

  endBody.innerHTML = `
    <div class="imp-row" style="padding:14px 14px">
      <div class="small">Secret word</div>
      <div style="font-weight:860; font-size:28px; margin-top:4px">${escapeHtml(game.word)}</div>
      ${hintLine}
      ${reasonLine}
    </div>
    <div style="height:10px"></div>
    <div class="imp-row" style="padding:14px 14px">
      <div class="small">Impostors</div>
      <div style="font-weight:760; font-size:16px; margin-top:6px">${escapeHtml(impList)}</div>
    </div>
  `;
  openModal(modalRevealEnd);
}

function resetToSetup(){
  // keep players and settings, reset per-game state
  game = null;
  revealIndex = 0;
  revealed = false;
  stopTimer();
  document.body.classList.remove('timeout');
  setActiveScreen('#screenSetup');
  showToast('Ready for the next round.', 'ok');
}

// ---- Event wiring ----
// modal close buttons
document.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-close]');
  if(!btn) return;
  const id = btn.getAttribute('data-close');
  const el = document.getElementById(id);
  if(!el) return;
  closeModal(el);
  if(el === modalAdvanced) onCloseAdvanced();
});

$('#btnGenres').addEventListener('click', () => { renderGenres(); openModal(modalGenres); });
$('#btnAddPlayer').addEventListener('click', () => openPlayerModal(null));
$('#btnOrder').addEventListener('click', () => { renderOrder(); openModal(modalOrder); });

$('#btnAdvanced').addEventListener('click', () => { renderAdvanced(); openModal(modalAdvanced); });

if(toggleTypeBHints){
  toggleTypeBHints.addEventListener('change', () => {
    cfg.allowTypeBHints = toggleTypeBHints.checked;
    save();
  });
}

toggleHints.addEventListener('change', () => {
  cfg.useHints = toggleHints.checked;
  hintSameRow.style.display = cfg.useHints ? 'block' : 'none';
  save();
});

toggleHintSame.addEventListener('change', () => {
  cfg.sameHintForAllImpostors = toggleHintSame.checked;
  save();
});

toggleThink.addEventListener('change', () => {
  cfg.thinkEnabled = toggleThink.checked;
  thinkRow.style.display = cfg.thinkEnabled ? 'block' : 'none';
  save();
});

thinkMinutes.addEventListener('change', () => {
  // Normalize when minutes change too, in case seconds is out of range
  const minutes = Number(thinkMinutes.value || 0);
  const seconds = Number(thinkSeconds.value || 0);
  const totalSeconds = Math.floor(minutes) * 60 + Math.floor(seconds);
  
  if(totalSeconds < 0){
    thinkMinutes.value = '0';
    thinkSeconds.value = '0';
  } else {
    const newSeconds = totalSeconds % 60;
    const newMinutes = Math.min(99, Math.floor(totalSeconds / 60));
    thinkSeconds.value = String(newSeconds);
    thinkMinutes.value = String(newMinutes);
  }
  save();
});

thinkSeconds.addEventListener('change', () => {
  const minutes = Number(thinkMinutes.value || 0);
  const seconds = Number(thinkSeconds.value || 0);
  const totalSeconds = Math.floor(minutes) * 60 + Math.floor(seconds);
  
  if(totalSeconds < 0){
    thinkMinutes.value = '0';
    thinkSeconds.value = '0';
  } else {
    const newSeconds = totalSeconds % 60;
    const newMinutes = Math.min(99, Math.floor(totalSeconds / 60));
    thinkSeconds.value = String(newSeconds);
    thinkMinutes.value = String(newMinutes);
  }
  save();
});

$('#btnStart').addEventListener('click', startGame);

// Reveal gestures
(function(){
  let startY = 0;
  let dragging = false;
  let pid = null;
  let currentY = 0;

  revealCard.addEventListener('pointerdown', (ev) => {
    if(ev.pointerType === 'mouse' && ev.button !== 0) return;
    pid = ev.pointerId;
    revealCard.setPointerCapture(pid);
    startY = ev.clientY;
    dragging = true;
    currentY = 0;
    revealCard.classList.add('dragging');
    revealBackground.classList.add('dragging');
  }, { passive:true });

  revealCard.addEventListener('pointermove', (ev) => {
    if(!dragging || ev.pointerId !== pid) return;
    const dy = ev.clientY - startY;
    if(dy > 0) return; // only up
    ev.preventDefault();
    currentY = clamp(dy, -280, 0);
    const yValue = currentY + 'px';
    revealCard.style.setProperty('--revealY', yValue);
    revealBackground.style.setProperty('--revealY', yValue);
    if(currentY < -120 && !revealed) revealNow();
  }, { passive:false });

  function endDrag(){
    if(!dragging) return;
    dragging = false;
    pid = null;
    revealCard.classList.remove('dragging');
    revealBackground.classList.remove('dragging');
    // Always snap back to original position
    revealCard.style.setProperty('--revealY', '0px');
    revealBackground.style.setProperty('--revealY', '0px');
  }
  revealCard.addEventListener('pointerup', endDrag, { passive:true });
  revealCard.addEventListener('pointercancel', endDrag, { passive:true });
})();

btnRevealNext.addEventListener('click', nextReveal);

$('#btnBegin').addEventListener('click', enterPlay);

timerPanel.addEventListener('click', restartTimer);
timerPanel.addEventListener('keydown', (ev) => { if(ev.key === 'Enter' || ev.key === ' ') restartTimer(); });

$('#btnVote').addEventListener('click', () => {
  if(!game) return;
  openVote();
});
btnKick.addEventListener('click', kickSelected);

$('#btnEndGame').addEventListener('click', () => openModal(modalEnd));
btnGameOver.addEventListener('click', () => endGame('Ended manually.'));

btnContinue.addEventListener('click', () => { closeModal(modalRevealEnd); resetToSetup(); });

loopWrap.addEventListener('scroll', () => {
  keepLoopCentered();
}, { passive:true });

// ---- Bootstrap ----
function renderAll(){
  updateGenreSummary();
  toggleHints.checked = cfg.useHints;
  toggleHintSame.checked = cfg.sameHintForAllImpostors;
  hintSameRow.style.display = cfg.useHints ? 'block' : 'none';
  toggleThink.checked = cfg.thinkEnabled;
  thinkRow.style.display = cfg.thinkEnabled ? 'block' : 'none';

  // restore think time inputs
  const t = clamp(Number(cfg.thinkSeconds || 0), 0, 3600*10);
  thinkMinutes.value = String(Math.floor(t/60));
  thinkSeconds.value = String(t%60);

  // restore hint filtering settings
  if(toggleTypeBHints) toggleTypeBHints.checked = cfg.allowTypeBHints;

  ensureImpWeights();
  renderPlayerLoop();
  renderPalette();
}

load();
loadGenres().then(() => {
  renderAll();
});
loadWordbase();

