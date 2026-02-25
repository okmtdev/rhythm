// ============================================
// りずむ de あそぼう! - Kids Rhythm Game
// ============================================
import './style.css';

// ---- Constants ----
const BASE_W = 800;
const BASE_H = 450;
const GROUND_Y = 370;
const CHAR_X = 160;
const CHAR_RUN_Y = 325;
const ANIM_DURATION = 0.5;

const STAGES = {
  easy: {
    name: 'かんたん',
    speed: 200,
    time: 30,
    spawnInterval: 2.4,
    spawnVariance: 0.5,
    timingZone: 65,
    color: '#4CAF50',
  },
  normal: {
    name: 'ふつう',
    speed: 340,
    time: 60,
    spawnInterval: 1.7,
    spawnVariance: 0.3,
    timingZone: 55,
    color: '#FF9800',
  },
  hard: {
    name: 'むずかしい',
    speed: 480,
    time: 60,
    spawnInterval: 1.15,
    spawnVariance: 0.2,
    timingZone: 42,
    color: '#F44336',
  },
};

const STORAGE_KEY = 'rhythm_game_results';

// ---- DOM refs ----
const $ = (id) => document.getElementById(id);

// ---- Game state ----
let state = resetState();

function resetState() {
  return {
    screen: 'select',
    difficulty: null,
    score: 0,
    timeLeft: 0,
    obstacles: [],
    effects: [],
    character: {
      y: CHAR_RUN_Y,
      action: 'run',
      animTimer: 0,
      expression: 'normal',
      exprTimer: 0,
      bobPhase: 0,
    },
    spawnTimer: 1.5,
    actionCooldown: 0,
    clouds: initClouds(),
    groundOffset: 0,
    gamePhase: 'idle', // idle | countdown | playing | ended
    countdown: 3,
    resultTimer: 0,
    canReturn: false,
  };
}

function initClouds() {
  const clouds = [];
  for (let i = 0; i < 6; i++) {
    clouds.push({
      x: Math.random() * BASE_W,
      y: 25 + Math.random() * 80,
      w: 50 + Math.random() * 80,
      speed: 8 + Math.random() * 18,
    });
  }
  return clouds;
}

// ---- Canvas setup ----
let canvas, ctx;

function setupCanvas() {
  canvas = $('game-canvas');
  ctx = canvas.getContext('2d');
  canvas.width = BASE_W;
  canvas.height = BASE_H;
}

// ---- Screen management ----
function showScreen(name) {
  state.screen = name;
  const screens = ['select-screen', 'game-screen', 'result-screen'];
  screens.forEach((id) => {
    const el = $(id);
    if (id === name + '-screen') {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });
}

// ---- Best scores ----
function getResults() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveResult(difficulty, score) {
  const results = getResults();
  results.push({
    stage: difficulty,
    stageName: STAGES[difficulty].name,
    score,
    date: new Date().toISOString(),
  });
  // Keep last 100 results
  while (results.length > 100) results.shift();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
}

function getBestScore(difficulty) {
  const results = getResults().filter((r) => r.stage === difficulty);
  if (results.length === 0) return null;
  return Math.max(...results.map((r) => r.score));
}

function updateBestScores() {
  ['easy', 'normal', 'hard'].forEach((diff) => {
    const best = getBestScore(diff);
    const el = $('best-' + diff);
    if (el) {
      el.textContent = best !== null ? `べすと: ${best}` : 'べすと: --';
    }
  });
}

// ---- History ----
function showHistory() {
  const results = getResults().slice().reverse().slice(0, 20);
  const listEl = $('history-list');

  if (results.length === 0) {
    listEl.innerHTML = '<div class="history-empty">まだ きろく が ないよ</div>';
  } else {
    listEl.innerHTML = results
      .map((r) => {
        const d = new Date(r.date);
        const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
        return `<div class="history-item">
          <span class="hi-stage">${r.stageName || r.stage}</span>
          <span class="hi-score">${r.score} pt</span>
          <span class="hi-date">${dateStr}</span>
        </div>`;
      })
      .join('');
  }
  $('history-modal').classList.remove('hidden');
}

// ---- LINE share ----
function shareOnLINE(stageName, score) {
  const text = `りずむ de あそぼう! で「${stageName}」を あそんだよ!\nぽいんと: ${score}`;
  const url = 'https://line.me/R/share?text=' + encodeURIComponent(text);
  window.open(url, '_blank');
}

// ---- Start game ----
function startGame(difficulty) {
  state = resetState();
  state.difficulty = difficulty;
  state.timeLeft = STAGES[difficulty].time;
  state.gamePhase = 'countdown';
  state.countdown = 3;
  state.screen = 'game';

  showScreen('game');
  updateHUD();
}

// ---- End game ----
function endGame() {
  state.gamePhase = 'ended';
  const config = STAGES[state.difficulty];
  saveResult(state.difficulty, state.score);

  // Prepare result screen
  const best = getBestScore(state.difficulty);
  const score = state.score;

  let message;
  if (score >= 20) message = 'すごい!';
  else if (score >= 10) message = 'いいね!';
  else if (score >= 0) message = 'がんばったね!';
  else message = 'つぎは がんばろう!';

  $('result-message').textContent = message;
  $('result-stage-name').textContent = config.name;
  $('result-score').textContent = score;
  $('result-best').textContent = `べすと: ${best}`;

  state.canReturn = false;
  $('return-hint').classList.add('hidden');
  state.resultTimer = 0;

  setTimeout(() => {
    showScreen('result');
    // Enable return after 3 seconds
    setTimeout(() => {
      state.canReturn = true;
      $('return-hint').classList.remove('hidden');
    }, 3000);
  }, 800);
}

// ---- Go back to select ----
function goToSelect() {
  updateBestScores();
  showScreen('select');
  state.screen = 'select';
  state.gamePhase = 'idle';
}

// ---- Spawn obstacle ----
function spawnObstacle() {
  const type = Math.random() < 0.5 ? 'jump' : 'slide';
  state.obstacles.push({
    x: BASE_W + 60,
    type,
    resolved: false,
  });
}

// ---- Handle player action ----
function handleAction(action) {
  if (state.screen !== 'game' || state.gamePhase !== 'playing') return;
  if (state.actionCooldown > 0) return;

  state.actionCooldown = 0.3;

  // Character animation
  state.character.action = action;
  state.character.animTimer = ANIM_DURATION;

  // Find nearest unresolved obstacle in timing zone
  const config = STAGES[state.difficulty];
  const zone = config.timingZone;
  let nearest = null;
  let nearestDist = Infinity;

  for (const obs of state.obstacles) {
    if (obs.resolved) continue;
    const dist = Math.abs(obs.x - CHAR_X);
    if (dist <= zone && dist < nearestDist) {
      nearest = obs;
      nearestDist = dist;
    }
  }

  if (nearest) {
    if (
      (action === 'jump' && nearest.type === 'jump') ||
      (action === 'slide' && nearest.type === 'slide')
    ) {
      // Correct!
      state.score += 2;
      nearest.resolved = true;
      addEffect('+2', CHAR_X + 40, 260, '#4CAF50');
      setExpression('happy');
    } else {
      // Wrong action
      state.score -= 1;
      nearest.resolved = true;
      addEffect('-1', CHAR_X + 40, 260, '#F44336');
      setExpression('sad');
    }
  } else {
    // No obstacle in zone
    state.score -= 1;
    addEffect('-1', CHAR_X + 40, 260, '#F44336');
    setExpression('sad');
  }

  updateHUD();
}

// ---- Effects ----
function addEffect(text, x, y, color) {
  state.effects.push({ text, x, y, color, alpha: 1, vy: -70 });
}

function setExpression(expr) {
  state.character.expression = expr;
  state.character.exprTimer = 0.5;
}

// ---- HUD update ----
function updateHUD() {
  $('timer-value').textContent = Math.ceil(state.timeLeft);
  $('score-value').textContent = state.score;
}

function flashHUD(elementId, className) {
  const el = $(elementId);
  el.classList.remove('flash-green', 'flash-red');
  void el.offsetWidth; // force reflow
  el.classList.add(className);
  setTimeout(() => el.classList.remove(className), 300);
}

// ---- Game update ----
function updateGame(dt) {
  // Countdown phase
  if (state.gamePhase === 'countdown') {
    state.countdown -= dt;
    if (state.countdown <= 0) {
      state.gamePhase = 'playing';
    }
    // Still update clouds during countdown
    updateClouds(dt, 30);
    return;
  }

  if (state.gamePhase !== 'playing') return;

  const config = STAGES[state.difficulty];

  // Timer
  state.timeLeft -= dt;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    updateHUD();
    endGame();
    return;
  }

  // Ground scroll
  state.groundOffset += config.speed * dt;

  // Clouds
  updateClouds(dt, config.speed * 0.05);

  // Character bob
  state.character.bobPhase += dt * 8;

  // Character animation timer
  if (state.character.animTimer > 0) {
    state.character.animTimer -= dt;
    if (state.character.animTimer <= 0) {
      state.character.animTimer = 0;
      state.character.action = 'run';
    }
  }

  // Expression timer
  if (state.character.exprTimer > 0) {
    state.character.exprTimer -= dt;
    if (state.character.exprTimer <= 0) {
      state.character.expression = 'normal';
    }
  }

  // Cooldown
  if (state.actionCooldown > 0) {
    state.actionCooldown -= dt;
  }

  // Spawn obstacles
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnObstacle();
    state.spawnTimer =
      config.spawnInterval + (Math.random() - 0.5) * 2 * config.spawnVariance;
  }

  // Move obstacles
  for (const obs of state.obstacles) {
    obs.x -= config.speed * dt;
  }

  // Check missed obstacles
  const zone = config.timingZone;
  for (const obs of state.obstacles) {
    if (!obs.resolved && obs.x < CHAR_X - zone - 10) {
      obs.resolved = true;
      state.score -= 1;
      addEffect('-1', CHAR_X, 280, '#F44336');
      setExpression('sad');
      updateHUD();
    }
  }

  // Remove off-screen obstacles
  state.obstacles = state.obstacles.filter((obs) => obs.x > -100);

  // Update effects
  for (const eff of state.effects) {
    eff.y += eff.vy * dt;
    eff.alpha -= dt * 2;
  }
  state.effects = state.effects.filter((e) => e.alpha > 0);

  // Update HUD
  updateHUD();
}

function updateClouds(dt, speed) {
  for (const cloud of state.clouds) {
    cloud.x -= speed * dt;
    if (cloud.x + cloud.w < -20) {
      cloud.x = BASE_W + 20 + Math.random() * 60;
      cloud.y = 25 + Math.random() * 80;
      cloud.w = 50 + Math.random() * 80;
    }
  }
}

// ---- Rendering ----
function renderGame() {
  ctx.clearRect(0, 0, BASE_W, BASE_H);

  drawSky();
  drawClouds();
  drawGround();

  if (state.gamePhase === 'countdown') {
    drawCountdown();
    return;
  }

  if (state.gamePhase === 'playing' || state.gamePhase === 'ended') {
    drawTimingZone();
    drawObstacles();
    drawCharacter();
    drawEffects();
  }
}

function drawSky() {
  const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  grad.addColorStop(0, '#87CEEB');
  grad.addColorStop(1, '#B3E5FC');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, BASE_W, GROUND_Y);
}

function drawClouds() {
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (const c of state.clouds) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.w * 0.18, 0, Math.PI * 2);
    ctx.arc(c.x + c.w * 0.22, c.y - c.w * 0.08, c.w * 0.22, 0, Math.PI * 2);
    ctx.arc(c.x + c.w * 0.48, c.y - c.w * 0.03, c.w * 0.18, 0, Math.PI * 2);
    ctx.arc(c.x + c.w * 0.35, c.y + c.w * 0.06, c.w * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGround() {
  // Main ground
  ctx.fillStyle = '#8BC34A';
  ctx.fillRect(0, GROUND_Y, BASE_W, BASE_H - GROUND_Y);

  // Dirt layer
  ctx.fillStyle = '#795548';
  ctx.fillRect(0, GROUND_Y + 20, BASE_W, BASE_H - GROUND_Y - 20);

  // Ground line
  ctx.strokeStyle = '#689F38';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(BASE_W, GROUND_Y);
  ctx.stroke();

  // Scrolling ground dashes
  ctx.strokeStyle = '#7CB342';
  ctx.lineWidth = 2;
  const dashW = 25;
  const gap = 45;
  const total = dashW + gap;
  const startX = -(state.groundOffset % total);
  for (let x = startX; x < BASE_W + dashW; x += total) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y + 10);
    ctx.lineTo(x + dashW, GROUND_Y + 10);
    ctx.stroke();
  }
}

function drawTimingZone() {
  if (!state.difficulty) return;
  const zone = STAGES[state.difficulty].timingZone;
  const grad = ctx.createLinearGradient(
    CHAR_X - zone,
    0,
    CHAR_X + zone,
    0,
  );
  grad.addColorStop(0, 'rgba(255,235,59,0)');
  grad.addColorStop(0.3, 'rgba(255,235,59,0.06)');
  grad.addColorStop(0.5, 'rgba(255,235,59,0.12)');
  grad.addColorStop(0.7, 'rgba(255,235,59,0.06)');
  grad.addColorStop(1, 'rgba(255,235,59,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(CHAR_X - zone, 0, zone * 2, GROUND_Y);
}

function drawObstacles() {
  for (const obs of state.obstacles) {
    if (obs.resolved) {
      // Fade out resolved obstacles
      ctx.globalAlpha = 0.25;
    }

    if (obs.type === 'jump') {
      // Ground block
      const w = 45;
      const h = 65;
      const top = GROUND_Y - h;
      const left = obs.x - w / 2;

      ctx.fillStyle = '#FF9800';
      roundRect(ctx, left, top, w, h, 8);
      ctx.fill();
      ctx.strokeStyle = '#E65100';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Arrow up
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('↑', obs.x, top + h / 2);
    } else {
      // Overhead block
      const w = 50;
      const bottom = GROUND_Y - 42;
      const top = 100;
      const left = obs.x - w / 2;

      ctx.fillStyle = '#42A5F5';
      roundRect(ctx, left, top, w, bottom - top, 8);
      ctx.fill();
      ctx.strokeStyle = '#1565C0';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Arrow down
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('↓', obs.x, bottom - 30);

      // Small gap indicator lines
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(left, bottom);
      ctx.lineTo(left + w, bottom);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.globalAlpha = 1;
  }
}

function drawCharacter() {
  const ch = state.character;
  let charY = CHAR_RUN_Y;
  let scaleY = 1;
  let scaleX = 1;

  if (ch.action === 'jump' && ch.animTimer > 0) {
    const progress = 1 - ch.animTimer / ANIM_DURATION;
    const jumpHeight = Math.sin(progress * Math.PI) * 110;
    charY = CHAR_RUN_Y - jumpHeight;
  } else if (ch.action === 'slide' && ch.animTimer > 0) {
    const progress = 1 - ch.animTimer / ANIM_DURATION;
    const slideAmount = Math.sin(progress * Math.PI);
    charY = CHAR_RUN_Y + slideAmount * 28;
    scaleY = 1 - slideAmount * 0.55;
    scaleX = 1 + slideAmount * 0.25;
  }

  // Running bob
  if (ch.action === 'run') {
    charY += Math.sin(ch.bobPhase) * 3;
  }

  ctx.save();
  ctx.translate(CHAR_X, charY);
  ctx.scale(scaleX, scaleY);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  const shadowY = (GROUND_Y - charY) / scaleY - 5;
  ctx.ellipse(0, shadowY, 22 * scaleX, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = '#FF7043';
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#E64A19';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Eyes (white)
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(-8, -7, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(8, -7, 7.5, 0, Math.PI * 2);
  ctx.fill();

  // Pupils
  const expr = ch.expression;
  ctx.fillStyle = '#333';
  if (expr === 'sad') {
    // X eyes
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#333';
    [-8, 8].forEach((ex) => {
      ctx.beginPath();
      ctx.moveTo(ex - 3, -10);
      ctx.lineTo(ex + 3, -4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ex + 3, -10);
      ctx.lineTo(ex - 3, -4);
      ctx.stroke();
    });
  } else {
    ctx.beginPath();
    ctx.arc(-6, -7, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(10, -7, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(-5, -9, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(11, -9, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cheeks
  ctx.fillStyle = 'rgba(255,100,100,0.35)';
  ctx.beginPath();
  ctx.arc(-16, 3, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(16, 3, 5, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (expr === 'happy') {
    ctx.arc(0, 3, 8, 0.1 * Math.PI, 0.9 * Math.PI);
  } else if (expr === 'sad') {
    ctx.arc(0, 14, 7, 1.2 * Math.PI, 1.8 * Math.PI);
  } else {
    ctx.arc(0, 4, 6, 0.15 * Math.PI, 0.85 * Math.PI);
  }
  ctx.stroke();

  ctx.restore();
}

function drawEffects() {
  for (const eff of state.effects) {
    ctx.save();
    ctx.globalAlpha = eff.alpha;
    ctx.fillStyle = eff.color;
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Outline for readability
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 4;
    ctx.strokeText(eff.text, eff.x, eff.y);
    ctx.fillText(eff.text, eff.x, eff.y);

    ctx.restore();
  }
}

function drawCountdown() {
  const num = Math.ceil(state.countdown);
  const text = num > 0 ? String(num) : 'すたーと!';
  const frac = state.countdown - Math.floor(state.countdown);
  const scale = 1 + frac * 0.3;

  // Draw character standing still
  ctx.save();
  ctx.translate(CHAR_X, CHAR_RUN_Y);

  // Body
  ctx.fillStyle = '#FF7043';
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#E64A19';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Eyes
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(-8, -7, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(8, -7, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(-6, -7, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(10, -7, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Cheeks
  ctx.fillStyle = 'rgba(255,100,100,0.35)';
  ctx.beginPath();
  ctx.arc(-16, 3, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(16, 3, 5, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 4, 6, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.restore();

  // Countdown number
  ctx.save();
  ctx.translate(BASE_W / 2, BASE_H / 2 - 30);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#FFF';
  ctx.strokeStyle = '#FF7043';
  ctx.lineWidth = 6;
  ctx.font = 'bold 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText(text, 0, 0);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// ---- Helper: rounded rect ----
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ---- Game loop ----
let lastTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  if (state.screen === 'game') {
    updateGame(dt);
    renderGame();
  }

  requestAnimationFrame(gameLoop);
}

// ---- Input setup ----
function setupInput() {
  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.key === 'z' || e.key === 'Z') {
      e.preventDefault();
      handleAction('jump');
    }
    if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      handleAction('slide');
    }
  });

  // Mouse on game screen
  const gameScreen = $('game-screen');
  gameScreen.addEventListener('mousedown', (e) => {
    if (state.screen !== 'game' || state.gamePhase !== 'playing') return;
    if (e.button === 0) {
      e.preventDefault();
      handleAction('jump');
    }
    if (e.button === 2) {
      e.preventDefault();
      handleAction('slide');
    }
  });
  gameScreen.addEventListener('contextmenu', (e) => e.preventDefault());

  // Touch on game screen (left half = jump, right half = slide)
  gameScreen.addEventListener(
    'touchstart',
    (e) => {
      if (state.screen !== 'game' || state.gamePhase !== 'playing') return;
      e.preventDefault();
      const touch = e.touches[0];
      const rect = gameScreen.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      if (x < rect.width / 2) {
        handleAction('jump');
      } else {
        handleAction('slide');
      }
    },
    { passive: false },
  );

  // Stage buttons
  document.querySelectorAll('.stage-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const stage = btn.dataset.stage;
      if (STAGES[stage]) {
        startGame(stage);
      }
    });
  });

  // Result screen click to return
  $('result-screen').addEventListener('click', (e) => {
    // Don't return if clicking the share button
    if (e.target.id === 'share-btn' || e.target.closest('#share-btn')) return;
    if (state.canReturn) {
      goToSelect();
    }
  });

  // Share button
  $('share-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const config = STAGES[state.difficulty];
    shareOnLINE(config.name, state.score);
  });

  // History
  $('history-btn').addEventListener('click', () => showHistory());
  $('history-close').addEventListener('click', () => {
    $('history-modal').classList.add('hidden');
  });
  $('history-modal').addEventListener('click', (e) => {
    if (e.target === $('history-modal')) {
      $('history-modal').classList.add('hidden');
    }
  });
}

// ---- Init ----
function init() {
  setupCanvas();
  setupInput();
  updateBestScores();
  showScreen('select');
  requestAnimationFrame(gameLoop);
}

init();
