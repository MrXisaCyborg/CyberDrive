const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const scoreEl = document.getElementById('score');
const startBtn = document.getElementById('startBtn');

let w = window.innerWidth;
let h = window.innerHeight;

function resizeCanvas() {
  w = window.innerWidth; h = window.innerHeight;
  canvas.width = w; canvas.height = h;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// --- Game state ---
let playing = false;
let player, road, obstacles, score, laneCount, neonLines, bgNeon;

function resetGame() {
  laneCount = 3 + Math.floor(Math.random() * 2); // 3 or 4 neon lanes
  let laneW = w / (laneCount + 1);
  player = {
    x: w / 2,
    y: h * 0.7,
    size: laneW * 0.60,
    speed: h/2.8,
    color: '#e900d2',
    lane: Math.floor(laneCount/2)
  };
  road = {
    lanes: laneCount,
    width: w,
    laneWidth: laneW,
    bgColor: '#0b1033'
  };
  obstacles = [];
  neonLines = Array.from({length: laneCount+1}, (_,i)=>({x: laneW*i, color: `hsl(${220+30*i},100%,60%)`}));
  bgNeon = Array.from({length: 10}, (_,i)=>((h/12)*i));
  score = 0;
  obsSpeed = player.speed*.70;
}

function drawRoad() {
  ctx.save();
  ctx.fillStyle = road.bgColor;
  ctx.fillRect(0, 0, w, h);

  // Neon BG scan lines
  bgNeon.forEach((y,i)=>{
    ctx.strokeStyle = `rgba(23,255,225,${0.06+(i%2?0.10:0.05)})`;
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(w, y);
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#17ffe1";
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.closePath();
  });

  // Neon Lanes
  neonLines.forEach(line=>{
    ctx.beginPath();
    ctx.moveTo(line.x, 0);
    ctx.lineTo(line.x, h);
    ctx.strokeStyle = line.color;
    ctx.lineWidth = 5;
    ctx.shadowColor = line.color;
    ctx.shadowBlur = 18;
    ctx.globalAlpha = 1;
    ctx.stroke();
    ctx.closePath();
  });

  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  // Car glow
  ctx.shadowColor = "#fa32ff";
  ctx.shadowBlur = 32;
  ctx.strokeStyle = '#17ffe1';
  ctx.lineWidth = 6;

  // Car body (retro hover neon shape)
  let x = player.x, y = player.y, sz = player.size;
  ctx.beginPath();
  ctx.moveTo(x-sz*0.36,y+sz*0.3);
  ctx.lineTo(x-sz*0.42,y-sz*0.36);
  ctx.lineTo(x+sz*0.42,y-sz*0.36);
  ctx.lineTo(x+sz*0.36,y+sz*0.3);
  ctx.closePath();
  ctx.fillStyle = player.color;
  ctx.globalAlpha = 0.92;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Neon windshield
  ctx.beginPath();
  ctx.moveTo(x-sz*0.23,y-sz*0.19);
  ctx.lineTo(x,y-sz*0.32);
  ctx.lineTo(x+sz*0.23,y-sz*0.19);
  ctx.closePath();
  ctx.fillStyle = "#02fefe";
  ctx.globalAlpha = 0.8;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawObstacles() {
  for (const obs of obstacles) {
    ctx.save();
    ctx.shadowColor = obs.color;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(obs.x, obs.y, obs.size, 0, 2*Math.PI);
    ctx.fillStyle = obs.color;
    ctx.globalAlpha = 0.91;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    // Outline
    ctx.save();
    ctx.strokeStyle = "#00ffe9";
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(obs.x, obs.y, obs.size*1.10, 0, 2*Math.PI);
    ctx.stroke();
    ctx.restore();
  }
}

function spawnObstacle() {
  let lane = Math.floor(Math.random()*road.lanes);
  let obsX = road.laneWidth/2 + lane*road.laneWidth;
  let color = `hsl(${180+Math.random()*100},100%,60%)`;
  let size = player.size*0.7 + Math.random()*player.size*0.2;
  obstacles.push({x: obsX, y: -size, size, color, lane});
}

function moveObstacles(dt) {
  for (const obs of obstacles) {
    obs.y += (obsSpeed+score/45) * dt;
  }
  // Remove off-screen
  while (obstacles.length && obstacles[0].y > h + 60) obstacles.shift();
  // Maybe add new
  if (Math.random() < (0.008 + 0.011*laneCount)) spawnObstacle();
}

function checkCollisions() {
  for (const obs of obstacles) {
    if (Math.abs(obs.y-player.y) < obs.size+player.size*0.33 && Math.abs(obs.x-player.x) < obs.size+player.size*0.45) {
      gameOver();
      break;
    }
  }
}

function updateScore(dt) {
  score += dt * 35 * (1+laneCount*0.1);
  scoreEl.innerText = "Score: " + Math.floor(score);
}

function gameOver(){
  playing = false;
  overlay.style.display = "";
  startBtn.innerText = "Restart";
  scoreEl.innerText = `Score: ${Math.floor(score)}`;
}

function gameLoopFrame(ts) {
  if (!playing) return;
  let now = ts/1000, dt = now-lastTime;
  if (dt>0.045) dt=0.045;
  drawRoad();
  drawPlayer();
  drawObstacles();
  moveObstacles(dt);
  checkCollisions();
  updateScore(dt);

  lastTime = now;
  requestAnimationFrame(gameLoopFrame);
}
let lastTime=0;

function startGame() {
  resetGame();
  overlay.style.display = "none";
  playing = true; lastTime = performance.now()/1000;
  scoreEl.innerText = "Score: 0";
  requestAnimationFrame(gameLoopFrame);
}

// --- Controls ---

let dragging = false, dragStartX = 0, dragPlayerX = 0;

function onPointerDown(evt) {
  dragging = true;
  const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
  dragStartX = clientX;
  dragPlayerX = player.x;
}
function onPointerMove(evt) {
  if (!dragging) return;
  const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
  let dx = clientX-dragStartX;
  let px = dragPlayerX+dx;
  player.x = Math.max(player.size*0.45,Math.min(w-player.size*0.45, px));
  player.lane = Math.round((player.x-road.laneWidth/2)/road.laneWidth);
}
function onPointerUp(evt) {
  dragging = false;
}
canvas.addEventListener('touchstart',onPointerDown);
canvas.addEventListener('touchmove',onPointerMove);
canvas.addEventListener('touchend',onPointerUp);
canvas.addEventListener('mousedown',onPointerDown);
canvas.addEventListener('mousemove',onPointerMove);
canvas.addEventListener('mouseup',onPointerUp);

startBtn.addEventListener('click',startGame);

// --- Launch setup ---
resizeCanvas();
resetGame();
drawRoad();
drawPlayer();
drawObstacles();
scoreEl.innerText = "Score: 0";
overlay.style.display = "";

