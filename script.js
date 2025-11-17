// script.js

// ---- Setup DOM ----
const book = document.getElementById('book');
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');

let w = 0, h = 0;
function resize(){
  w = canvas.width = canvas.clientWidth = canvas.offsetWidth;
  h = canvas.height = canvas.clientHeight = canvas.offsetHeight;
}
window.addEventListener('resize', resize);
resize();

// ---- Open automatically on load ----
window.addEventListener('load', () => {
  // ouvrir après une courte pause pour l'effet
  setTimeout(()=> book.classList.add('open'), 400);
  book.setAttribute('aria-pressed','true');
});

// Toggle au clic
book.addEventListener('click', toggleBook);
book.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggleBook(); }
});

function toggleBook(){
  const isOpen = book.classList.toggle('open');
  book.setAttribute('aria-pressed', String(isOpen));
  // si on ouvre, on peut déclencher un petit burst initial
  if(isOpen) spawnBurst(20);
}

// ---- Particules ----
class Particle {
  constructor(x,y, vx, vy, life, size, hue){
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.life = life; // durée restante (ms)
    this.maxLife = life;
    this.size = size;
    this.hue = hue;
    this.rotation = Math.random()*Math.PI*2;
    this.spin = (Math.random()-0.5)*0.06;
  }
  update(dt){
    // dt en ms
    this.x += this.vx * dt/16.67; // normaliser par frame (≈16.67ms)
    this.y += this.vy * dt/16.67;
    // légère gravité ascendante (pour effet magique, on inverse la gravité)
    this.vy -= 0.002 * dt;
    // friction
    this.vx *= 0.998;
    this.vy *= 0.998;
    this.life -= dt;
    this.rotation += this.spin * dt/16.67;
  }
  draw(ctx){
    const t = Math.max(0, Math.min(1, 1 - this.life/this.maxLife));
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    // alpha décroissant
    const alpha = (1 - t) * 1.0;
    // taille varie légèrement
    const size = this.size * (1 + 0.2*Math.sin(t*Math.PI));
    // style : lueur
    const g = ctx.createRadialGradient(0,0,0, 0,0, size*3);
    const color = ⁠ hsl(${this.hue}, 90%, ${50 + 20*(1-t)}%) ⁠;
    g.addColorStop(0, ⁠ rgba(255,255,255,${alpha}) ⁠);
    g.addColorStop(0.15, color.replace('%)', '%,0.95)'));
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

// Source d'émission : position relative au livre
function emissionPoint(){
  // calcule la position centrale du livre dans le canvas
  const rect = book.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  // point sur la tranche centrale, légèrement vers le haut
  const x = rect.left + rect.width/2 - canvasRect.left;
  const y = rect.top + rect.height*0.45 - canvasRect.top;
  return {x, y};
}

// spawn une particule
function spawnParticle(x,y, speedRange = [0.4, 2.4]){
  const angle = (Math.random()*Math.PI) - Math.PI/2 + (Math.random()-0.5)*0.8; // vers le haut
  const speed = speedRange[0] + Math.random()*(speedRange[1]-speedRange[0]);
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  const life = 800 + Math.random()*1200; // ms
  const size = 2 + Math.random()*6;
  // hue aléatoire doré/bleu/violet pour effet magique
  const hues = [45, 220, 270]; // or, bleu, violet
  const hue = hues[Math.floor(Math.random()*hues.length)] + (Math.random()*20-10);
  particles.push(new Particle(x,y,vx,vy,life,size,hue));
}

// burst initial
function spawnBurst(count=12){
  const p = emissionPoint();
  for(let i=0;i<count;i++){
    spawnParticle(p.x + (Math.random()-0.5)*40, p.y + (Math.random()-0.5)*20, [1,4]);
  }
}

// continuous gentle emission (comme des étincelles)
let emissionAccumulator = 0;
function animate(time){
  const dt = Math.min(40, time - lastTime); // limite dt
  lastTime = time;

  // nettoyage
  ctx.clearRect(0,0,w,h);

  // si le livre est ouvert, émettre continuellement
  if(book.classList.contains('open')){
    emissionAccumulator += dt;
    const rateMs = 50; // une particule toutes les 50ms en moyenne
    while(emissionAccumulator > rateMs){
      emissionAccumulator -= rateMs;
      const p = emissionPoint();
      spawnParticle(p.x + (Math.random()-0.5)*60, p.y + (Math.random()-0.5)*30, [0.6,2.6]);
    }
  }

  // mise à jour et dessin
  for(let i = particles.length - 1; i >= 0; i--){
    const p = particles[i];
    p.update(dt);
    // dessiner si encore vivant
    if(p.life > 0){
      p.draw(ctx);
    } else {
      particles.splice(i,1);
    }
  }

  // optionally, draw soft glow on the book when open
  if(book.classList.contains('open')){
    ctx.save();
    const rect = book.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width/2 - canvasRect.left;
    const cy = rect.top + rect.height*0.45 - canvasRect.top;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w,h)/2);
    g.addColorStop(0, 'rgba(255,210,120,0.06)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);
    ctx.restore();
  }

  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// ---- Optionnel : click anywhere pour burst même si fermé ----
document.addEventListener('dblclick', () => spawnBurst(30));
