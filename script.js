// ---- DOM ----
const book = document.getElementById('book');
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');

let w = 0, h = 0, dpr = Math.max(1, window.devicePixelRatio || 1);
function resize(){
  // mesurer en CSS pixels
  const cssW = canvas.clientWidth || canvas.offsetWidth || window.innerWidth;
  const cssH = canvas.clientHeight || canvas.offsetHeight || window.innerHeight;
  dpr = Math.max(1, window.devicePixelRatio || 1);
  w = Math.floor(cssW * dpr);
  h = Math.floor(cssH * dpr);
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // travailler en CSS pixels
}
window.addEventListener('resize', debounce(resize, 120));
resize();

// debounce util
function debounce(fn, wait){
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(()=> fn(...args), wait); };
}

// ---- ouverture auto sur load (court délai) ----
window.addEventListener('load', () => {
  // si prefers-reduced-motion: on ne lance pas l'anim auto
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  setTimeout(()=> {
    book.classList.add('open');
    book.setAttribute('aria-pressed','true');
    spawnBurst(22);
  }, 400);
});

// Toggle au clic / clavier
book.addEventListener('click', toggleBook);
book.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter' || e.key === ' '){
    e.preventDefault();
    toggleBook();
  }
});

function toggleBook(){
  const isOpen = book.classList.toggle('open');
  book.setAttribute('aria-pressed', String(isOpen));
  if(isOpen) spawnBurst(20);
  else spawnBurst(6); // petit nuage au refermé
}

// ---- Particules (optimisées) ----
class Particle {
  constructor(x,y, vx, vy, life, size, hue){
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life;
    this.size = size; this.hue = hue;
    this.rotation = Math.random()*Math.PI*2;
    this.spin = (Math.random()-0.5)*0.06;
  }
  update(dt){
    // dt en ms (approx)
    const s = dt / 16.67;
    this.x += this.vx * s;
    this.y += this.vy * s;
    this.vy -= 0.0015 * dt; // ascendante
    this.vx *= 0.998;
    this.vy *= 0.998;
    this.life -= dt;
    this.rotation += this.spin * s;
  }
  draw(ctx){
    const t = 1 - Math.max(0, this.life) / this.maxLife;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    const alpha = Math.max(0, 1 - t);
    const size = this.size * (1 + 0.22*Math.sin(t*Math.PI));
    const g = ctx.createRadialGradient(0,0,0, 0,0, size*3);
    const color = ⁠ hsl(${this.hue}, 92%, ${50 + 18*(1-t)}%) ⁠;
    g.addColorStop(0, ⁠ rgba(255,255,255,${alpha}) ⁠);
    g.addColorStop(0.12, color.replace('%)', '%,0.95)'));
    g.addColorStop(1, ⁠ rgba(0,0,0,0) ⁠);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0,0, size, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}

const particles = [];
let lastTime = performance.now();
let emissionAccumulator = 0;

// source d'émission relative au livre
function emissionPoint(){
  const rect = book.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const x = rect.left + rect.width/2 - canvasRect.left;
  const y = rect.top + rect.height*0.45 - canvasRect.top;
  return {x, y};
}

function spawnParticle(x,y, speedRange = [0.4, 2.2]){
  const angle = -Math.PI/2 + (Math.random()-0.5)*1.2; // direction vers le haut, avec spread
  const speed = speedRange[0] + Math.random()*(speedRange[1]-speedRange[0]);
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  const life = 700 + Math.random()*1200;
  const size = 1.8 + Math.random()*6;
  const hues = [42, 215, 275];
  const hue = hues[Math.floor(Math.random()*hues.length)] + (Math.random()*24-12);
  particles.push(new Particle(x,y,vx,vy,life,size,hue));
}

function spawnBurst(count = 12){
  const p = emissionPoint();
  for(let i=0;i<count;i++){
    spawnParticle(p.x + (Math.random()-0.5)*60, p.y + (Math.random()-0.5)*28, [0.8,4]);
  }
}

// boucle d'animation (arrête si la page n'est pas visible)
function animate(time){
  const dt = Math.min(40, time - lastTime);
  lastTime = time;

  // vider
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // émettre si ouvert
  if(book.classList.contains('open')){
    emissionAccumulator += dt;
    const rateMs = 45;
    while(emissionAccumulator > rateMs){
      emissionAccumulator -= rateMs;
      const p = emissionPoint();
      spawnParticle(p.x + (Math.random()-0.5)*70, p.y + (Math.random()-0.5)*30, [0.6,2.6]);
    }
  }

  // update & draw (en boucle inversée pour splice safe)
  for(let i = particles.length - 1; i >= 0; i--){
    const p = particles[i];
    p.update(dt);
    if(p.life > 0) p.draw(ctx);
    else particles.splice(i,1);
  }

  // lueur douce autour du livre
  if(book.classList.contains('open')){
    ctx.save();
    const rect = book.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width/2 - canvasRect.left;
    const cy = rect.top + rect.height*0.45 - canvasRect.top;
    const radius = Math.min(canvasRect.width, canvasRect.height) * 0.5;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    g.addColorStop(0, 'rgba(255,210,120,0.055)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,canvas.width/dpr, canvas.height/dpr);
    ctx.restore();
  }

  if(!document.hidden) requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// optimisation : pause quand onglet caché
document.addEventListener('visibilitychange', () => {
  lastTime = performance.now();
  if(!document.hidden) requestAnimationFrame(animate);
});

// petite interaction : double-clic => grand burst
document.addEventListener('dblclick', (e) => {
  // si l'utilisateur veut réduire le bruit, on se contente d'un petit burst
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  spawnBurst(30);
});
