const DIFFICULTY_PRESETS = {
  easy:  { spawnMin: 700, spawnMax: 1100, baseSpeed: 110 },
  hard:  { spawnMin: 350, spawnMax: 700,  baseSpeed: 180 },
  insane:{ spawnMin: 150, spawnMax: 400,  baseSpeed: 260 }
};

let difficulty = 'hard';
let SPAWN_MIN = DIFFICULTY_PRESETS[difficulty].spawnMin;
let SPAWN_MAX = DIFFICULTY_PRESETS[difficulty].spawnMax;
let FALL_SPEED_PX_PER_SEC = DIFFICULTY_PRESETS[difficulty].baseSpeed;
const POOP_SIZE = 56;
const MAX_ACTIVE = 120;

const fartAudio = new Audio('top-10-fart-meme-sound-effects-tim-brawlstars_WgnxDYKs.mp3');
const flushAudio = new Audio('Toilet Flush Sound Effect - High Quality Flushing - Sound Effect Doggo.mp3');

fartAudio.preload = 'auto';
flushAudio.preload = 'auto';

const startBtn = document.getElementById('startBtn');
const playArea = document.getElementById('playArea');
const myScoreEl = document.getElementById('myScore');
const topScoreEl = document.getElementById('topScore');
const bucketBtn = document.getElementById('bucketBtn');
const exitBtn = document.getElementById('exitBtn');
const pauseBtn = document.getElementById('pauseBtn');
const soundBtn = document.getElementById('soundBtn');
const diffSelect = document.getElementById('diffSelect');
const pauseOverlay = document.getElementById('pauseOverlay');
const comboDisplay = document.getElementById('comboDisplay');
const comboMulEl = document.getElementById('comboMul');

let activePoops = [];
let stuckPoops = [];
let running = false;
let myScore = 0;
let topScore = Number(localStorage.getItem('poop_top') || 0);
topScoreEl.textContent = topScore;

let soundOn = true;
soundBtn.addEventListener('click', () => {
  soundOn = !soundOn;
  soundBtn.textContent = soundOn ? '🔊' : '🔇';
  soundBtn.classList.toggle('silent', !soundOn);
});

let paused = false;
function setPaused(val){
  paused = Boolean(val);
  pauseBtn.textContent = paused ? '▶' : '⏸';
  pauseBtn.classList.toggle('paused', paused);
  pauseOverlay.classList.toggle('hidden', !paused);
  if(paused){
    running = false;
    clearTimeout(spawnTimer);
  } else {
    running = true;
    lastTime = null;
    requestAnimationFrame(animate);
    scheduleSpawn();
  }
}
pauseBtn.addEventListener('click', ()=> setPaused(!paused));

diffSelect.value = difficulty;
diffSelect.addEventListener('change', (e) => {
  difficulty = e.target.value;
  const p = DIFFICULTY_PRESETS[difficulty];
  SPAWN_MIN = p.spawnMin;
  SPAWN_MAX = p.spawnMax;
  FALL_SPEED_PX_PER_SEC = p.baseSpeed;
});

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playFartSound() {
  if (!soundOn) return;
  fartAudio.currentTime = 0;
  fartAudio.play().catch(()=>{});
}

function playFlushSound() {
  if (!soundOn) return;
  flushAudio.currentTime = 0;
  flushAudio.play().catch(()=>{});
}

function rand(min,max){ return Math.random()*(max-min)+min }

let comboCount = 0;
let comboTimer = null;
const COMBO_RESET_MS = 1400;
const MAX_MULT = 3.0;

function addCombo(){
  comboCount++;
  clearTimeout(comboTimer);
  comboTimer = setTimeout(()=> {
    comboCount = 0;
    updateComboDisplay();
  }, COMBO_RESET_MS);
  updateComboDisplay();
}

function getMultiplier(){
  const steps = Math.floor(comboCount / 3);
  return Math.min(1 + steps * 0.5, MAX_MULT);
}

function updateComboDisplay(){
  const mul = getMultiplier();
  comboMulEl.textContent = mul.toFixed(1);
  comboDisplay.style.opacity = comboCount > 0 ? 1 : 0.5;
}

function spawnPoop(){
  if (!running) return;
  if (activePoops.length + stuckPoops.length > MAX_ACTIVE) return;

  const poop = document.createElement('div');
  poop.className = 'poop falling';
  poop.innerText = '💩';

  const size = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--poop-size')) || POOP_SIZE;
  poop.style.width = `${size}px`;
  poop.style.height = `${size}px`;
  poop.style.fontSize = `${Math.max(size-8,36)}px`;

  const areaRect = playArea.getBoundingClientRect();
  const x = rand(8, Math.max(8, areaRect.width - size - 8));
  const y = -size - rand(6, 40);

  poop.dataset.x = x;
  poop.dataset.y = y;
  poop.dataset.speed = rand(FALL_SPEED_PX_PER_SEC * 0.75, FALL_SPEED_PX_PER_SEC * 1.25);

  poop.style.left = `${x}px`;
  poop.style.top = `${y}px`;
  poop.style.zIndex = 20;

  const handler = (ev) => {
    ev.preventDefault();
    if (!poop.classList.contains('stuck')) stickPoop(poop);
  };
  poop.addEventListener('click', handler);
  poop.addEventListener('touchstart', handler, {passive:false});

  playArea.appendChild(poop);
  activePoops.push(poop);
}

function createSplatter(x, y){
  const s = document.createElement('div');
  s.className = 'splatter';
  s.style.left = `${x - 32}px`;
  s.style.top = `${y - 32}px`;
  playArea.appendChild(s);
  setTimeout(()=> s.remove(), 800);
}

function stickPoop(poop){
  const idx = activePoops.indexOf(poop);
  if (idx !== -1) activePoops.splice(idx, 1);

  if (audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
  playFartSound();

  poop.classList.remove('falling');
  poop.classList.add('stuck');
  const top = parseFloat(poop.style.top || poop.dataset.y || 0);
  const left = parseFloat(poop.style.left || poop.dataset.x || 0);
  poop.style.top = `${top}px`;
  poop.style.left = `${left}px`;
  poop.style.position = 'absolute';
  poop.style.zIndex = 40;

  createSplatter(left + (poop.offsetWidth/2), top + (poop.offsetHeight/2));

  addCombo();
  const mul = getMultiplier();
  const gained = Math.round(1 * mul);
  myScore += gained;
  myScoreEl.textContent = myScore;

  poop.style.transform = 'scale(1.12) rotate(-6deg)';
  setTimeout(()=> poop.style.transform = '', 220);

  stuckPoops.push(poop);

  if (myScore > topScore){
    topScore = myScore;
    topScoreEl.textContent = topScore;
    localStorage.setItem('poop_top', String(topScore));
  }
}

function clearStuckPoops(){
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
  playFlushSound();
  stuckPoops.forEach(p => {
    p.style.transition = 'transform .45s ease, opacity .45s ease';
    p.style.transform = 'translateY(30px) scale(.8) rotate(20deg)';
    p.style.opacity = '0';
    setTimeout(()=> p.remove(), 420);
  });
  stuckPoops = [];
}

let lastTime = null;
function animate(ts){
  if (!running) return;
  if (!lastTime) lastTime = ts;
  const dt = (ts - lastTime) / 1000;
  lastTime = ts;

  const areaRect = playArea.getBoundingClientRect();
  for (let i = activePoops.length -1; i >=0; i--){
    const p = activePoops[i];
    const speed = parseFloat(p.dataset.speed) || FALL_SPEED_PX_PER_SEC;
    let y = parseFloat(p.dataset.y) || -50;
    y += speed * dt;
    p.dataset.y = y;
    p.style.top = `${y}px`;
    if (y > areaRect.height + 80){
      p.remove();
      activePoops.splice(i,1);
    }
  }

  if (running) requestAnimationFrame(animate);
}

let spawnTimer = null;
function scheduleSpawn(){
  const t = Math.floor(rand(SPAWN_MIN, SPAWN_MAX));
  spawnTimer = setTimeout(()=> {
    if (running) spawnPoop();
    if (running) scheduleSpawn();
  }, t);
}

function startGame(){
  if (running) return;
  running = true;
  paused = false;
  startBtn.style.display = 'none';
  pauseOverlay.classList.add('hidden');
  lastTime = null;
  requestAnimationFrame(animate);
  scheduleSpawn();
}

function stopGame(){
  running = false;
  clearTimeout(spawnTimer);
}

function exitGame(){
  running = false;
  clearTimeout(spawnTimer);
  activePoops.forEach(p=>p.remove());
  stuckPoops.forEach(p=>p.remove());
  activePoops = [];
  stuckPoops = [];
  myScore = 0;
  myScoreEl.textContent = 0;
  startBtn.style.display = 'block';
  comboCount = 0;
  updateComboDisplay();
}

startBtn.addEventListener('click', () => {
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
  startGame();
});

bucketBtn.addEventListener('click', ()=> clearStuckPoops());
exitBtn.addEventListener('click', ()=> exitGame());

document.addEventListener('visibilitychange', () => {
  if (document.hidden){
    if (running){ setPaused(true); }
  } else {
    if (!paused && startBtn.style.display === 'none'){
      setPaused(false);
    }
  }
});

playArea.addEventListener('click', ()=> {
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
});
playArea.addEventListener('touchstart', ()=> {
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
});

updateComboDisplay();
