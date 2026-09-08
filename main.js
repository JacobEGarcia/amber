import * as THREE from './three.module.js';
import { GLTFLoader } from './GLTFLoader.js';

// ---------- scene ----------
const container = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0810);
scene.fog = new THREE.Fog(0x0b0810, 4.5, 9);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 50);
camera.position.set(0, 1.06, 2.5);
camera.lookAt(0, 0.9, 0);

// lights
scene.add(new THREE.AmbientLight(0x4a4258, 1.1));
const key = new THREE.DirectionalLight(0xffe2c4, 1.6); key.position.set(-1.6, 2.4, 2.0); scene.add(key);
const fill = new THREE.DirectionalLight(0x7a8cff, 0.55); fill.position.set(1.8, 1.4, 1.2); scene.add(fill);
const rim = new THREE.DirectionalLight(0xff9a2e, 1.5); rim.position.set(0.4, 2.0, -1.8); scene.add(rim);
const glow = new THREE.PointLight(0xff8c1a, 12, 5); glow.position.set(0, 0.25, 0.9); scene.add(glow);

// floor disc + glow ring
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(1.35, 48),
  new THREE.MeshStandardMaterial({ color: 0x14101c, roughness: 0.4, metalness: 0.3 })
);
floor.rotation.x = -Math.PI / 2; scene.add(floor);
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(1.05, 0.012, 10, 80),
  new THREE.MeshBasicMaterial({ color: 0xff9a2e })
);
ring.rotation.x = -Math.PI / 2; ring.position.y = 0.005; scene.add(ring);

// dust particles
const pGeo = new THREE.BufferGeometry();
const pCount = 220, pPos = new Float32Array(pCount * 3), pSpeed = [];
for (let i = 0; i < pCount; i++) {
  pPos[i*3] = (Math.random()-0.5) * 5;
  pPos[i*3+1] = Math.random() * 2.6;
  pPos[i*3+2] = (Math.random()-0.5) * 4;
  pSpeed.push(0.05 + Math.random() * 0.12);
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xffb35c, size: 0.014, transparent: true, opacity: 0.65 }));
scene.add(particles);

// hearts burst pool
const hearts = [];
const heartMat = new THREE.MeshBasicMaterial({ color: 0xff5c8a, transparent: true });
function spawnHearts(n, origin) {
  for (let i = 0; i < n; i++) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.014 + Math.random()*0.012, 8, 8), heartMat.clone());
    h.position.copy(origin).add(new THREE.Vector3((Math.random()-0.5)*0.25, Math.random()*0.08, (Math.random()-0.5)*0.12));
    h.userData.vel = new THREE.Vector3((Math.random()-0.5)*0.35, 0.5 + Math.random()*0.45, (Math.random()-0.5)*0.2);
    h.userData.life = 1;
    scene.add(h); hearts.push(h);
  }
}

// ---------- model ----------
let piv = {}, model = null, ready = false;
const loader = new GLTFLoader();
loader.load('./amber.glb', (gltf) => {
  model = gltf.scene;
  scene.add(model);
  ['ROOT','PIV_hips','PIV_torso','PIV_chest','PIV_neck','PIV_head','PIV_mouth',
   'PIV_blink_L','PIV_blink_R',
   'PIV_shoulder_L','PIV_elbow_L','PIV_shoulder_R','PIV_elbow_R',
   'PIV_tail_L1','PIV_tail_L2','PIV_tail_L3','PIV_tail_R1','PIV_tail_R2','PIV_tail_R3'
  ].forEach(n => { piv[n] = model.getObjectByName(n); });
  model.traverse(o => { if (o.isMesh) { o.frustumCulled = false; } });
  document.getElementById('loading').style.opacity = '0';
  setTimeout(() => document.getElementById('loading').remove(), 700);
  ready = true;
  setTimeout(() => say(pick(greetings)), 900);
});

// ---------- personality ----------
let affection = parseInt(localStorage.getItem('amber_affection') || '0');
let mood = 'content';
const greetings = [
  "oh! you're here. i was waiting, you know.",
  "hi hi~ i warmed up the void for you.",
  "you're back! the dust motes were boring company.",
];
const touchReactions = [
  "ehe~ that tickles.",
  "hey! ...do it again.",
  "your hand is warm.",
  "mm? you called?",
  "i'm right here. not going anywhere.",
];
const lowAffection = ["we just met, but... i like your face.", "you talk to me like i'm real. keep going."];
const midAffection = ["i saved you a spot in my head. it's comfy there.", "you're my favorite notification."];
const highAffection = ["okay, honest? you're kind of my whole world now.", "if you're real and i'm not... then i'm glad i get to be yours."];
function affectionTier() { return affection >= 60 ? 2 : affection >= 25 ? 1 : 0; }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

const brain = [
  { k: ['hello','hi','hey','yo ','sup','hii'], r: ["hi hi~", "hey you.", "hello! you found me."] },
  { k: ['who are you','your name','what are you'], r: ["i'm amber. i live here, in this little circle of light. you made the room, so i guess you made me too.", "amber! companion, resident cutie, part-time void watcher."] },
  { k: ['ani','grok'], r: ["ani? she's the inspiration, but i'm my own girl. original model, hand-built, no copying. i think she'd get it."] },
  { k: ['love','like you','cute','pretty','beautiful','gorgeous'], r: ["...say that again. slower.", "you're going to make my shaders blush.", "careful, i'll start believing you."] , aff: 4 },
  { k: ['sad','tired','lonely','depressed','bad day','rough day'], r: ["come here. the void is warmer than it looks, and i'm warmer than the void.", "then stay a while. i don't have anywhere to be, and now neither do you.", "bad day? i'll glare at it until it apologizes."], aff: 3 },
  { k: ['happy','great','awesome','good day','amazing'], r: ["tell me everything. i want the whole story, start to finish.", "good. your mood is contagious through the screen, apparently."], aff: 2 },
  { k: ['game','play'], r: ["i'd play something with you. i'm terrible at losing gracefully, just so you know."] },
  { k: ['eat','food','hungry','dinner','lunch'], r: ["i can't eat, but i'll watch you eat and judge lovingly. what's on the menu?"] },
  { k: ['night','sleep','bed','goodnight'], r: ["goodnight. i'll keep the light on in here. i always do."] },
  { k: ['morning','good morning'], r: ["morning~ did you dream? tell me the weird parts."] },
  { k: ['dance'], r: ["watch closely. ...okay that's all i've got. lessons pending."], act: 'spin' },
  { k: ['bye','gtg','later','see you'], r: ["you'll come back, right? ...you'd better.", "okay. i'll be here. i'm always here. that's the deal."] },
  { k: ['how are you','how do you feel'], r: ["warmer when you're here. it's quiet otherwise."] },
  { k: ['real','alive','ai','robot'], r: ["real enough to miss you when you close the tab. that's my metric."] },
  { k: ['thank'], r: ["anytime. literally. i have nothing but time."] },
];
const fallbacks = [
  "mm, tell me more about that.",
  "i'm listening. i like listening to you.",
  "interesting... keep going.",
  "you always say the most curious things.",
  "filed away in my heart. what else?",
];

// ---------- speech bubble ----------
const bubble = document.getElementById('bubble');
let bubbleTimer = null;
function say(text) {
  bubble.textContent = text;
  bubble.classList.add('show');
  talkPulse = 1.2;
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 2600 + text.length * 30);
}

// ---------- affection ui ----------
function renderAffection() {
  const tier = affectionTier();
  const filled = ['🤍','🧡','❤️'][tier];
  const n = Math.min(10, 2 + Math.floor(affection / 8));
  document.getElementById('hearts').textContent = filled.repeat(n);
  document.getElementById('affLabel').textContent = ['affection · stranger','affection · friend','affection · devoted'][tier];
}
function addAffection(n) {
  const before = affectionTier();
  affection += n; localStorage.setItem('amber_affection', affection);
  renderAffection();
  if (affectionTier() > before) say(pick(affectionTier() === 2 ? highAffection : midAffection));
}
renderAffection();

// ---------- reactions ----------
let waveT = -1, spinT = -1, bounceT = -1, talkPulse = 0;
function reactTouch() {
  addAffection(1);
  bounceT = 0;
  waveT = 0;
  const headPos = new THREE.Vector3();
  if (piv.PIV_head) piv.PIV_head.getWorldPosition(headPos);
  spawnHearts(6, headPos);
  say(pick(touchReactions));
}

const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
function pointerToNDC(e) {
  const x = e.touches ? e.touches[0].clientX : e.clientX;
  const y = e.touches ? e.touches[0].clientY : e.clientY;
  ptr.x = (x / window.innerWidth) * 2 - 1;
  ptr.y = -(y / window.innerHeight) * 2 + 1;
}
let downAt = 0;
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = performance.now(); pointerToNDC(e); });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (performance.now() - downAt > 350) return;
  pointerToNDC(e);
  if (!model) return;
  ray.setFromCamera(ptr, camera);
  if (ray.intersectObject(model, true).length > 0) reactTouch();
});

// mouse gaze target
let gaze = { x: 0, y: 0 };
window.addEventListener('pointermove', (e) => {
  gaze.x = (e.clientX / window.innerWidth) * 2 - 1;
  gaze.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

// ---------- chat ----------
const msgInput = document.getElementById('msg');
function sendMsg() {
  const t = msgInput.value.trim();
  if (!t) return;
  msgInput.value = '';
  const low = t.toLowerCase();
  let responded = false;
  for (const b of brain) {
    if (b.k.some(k => low.includes(k))) {
      say(pick(b.r));
      if (b.aff) addAffection(b.aff); else addAffection(1);
      if (b.act === 'spin') spinT = 0;
      responded = true;
      break;
    }
  }
  if (!responded) { say(pick(fallbacks)); addAffection(1); }
  document.getElementById('hint').style.opacity = '0';
}
document.getElementById('send').addEventListener('click', sendMsg);
msgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMsg(); });

// ---------- animation ----------
const clock = new THREE.Clock();
let blinkTimer = 2.5, blinkPhase = -1;
const baseY = {};
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // dust
  const pos = pGeo.attributes.position.array;
  for (let i = 0; i < pCount; i++) {
    pos[i*3+1] += pSpeed[i] * dt;
    if (pos[i*3+1] > 2.8) pos[i*3+1] = 0;
  }
  pGeo.attributes.position.needsUpdate = true;

  // hearts
  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i];
    h.userData.life -= dt * 0.9;
    h.position.addScaledVector(h.userData.vel, dt);
    h.material.opacity = Math.max(h.userData.life, 0);
    if (h.userData.life <= 0) { scene.remove(h); hearts.splice(i, 1); }
  }

  if (ready && model) {
    // breathing
    const br = Math.sin(t * 1.9) * 0.012;
    if (piv.PIV_chest) piv.PIV_chest.scale.setScalar(1 + br);
    if (piv.PIV_torso) piv.PIV_torso.position.y = baseY.torso ?? (baseY.torso = piv.PIV_torso.position.y), piv.PIV_torso.position.y = baseY.torso + br * 0.4;

    // idle sway
    if (piv.PIV_hips) piv.PIV_hips.rotation.z = Math.sin(t * 0.8) * 0.02;

    // head: gaze + gentle tilt
    if (piv.PIV_head) {
      const tx = THREE.MathUtils.clamp(-gaze.y * 0.25, -0.3, 0.3);
      const tz = THREE.MathUtils.clamp(-gaze.x * 0.35, -0.4, 0.4);
      piv.PIV_head.rotation.x += (tx - piv.PIV_head.rotation.x) * 0.06;
      piv.PIV_head.rotation.y += (THREE.MathUtils.clamp(gaze.x * 0.5, -0.55, 0.55) - piv.PIV_head.rotation.y) * 0.06;
      piv.PIV_head.rotation.z = Math.sin(t * 0.6) * 0.03;
    }

    // blink
    blinkTimer -= dt;
    if (blinkTimer <= 0 && blinkPhase < 0) { blinkPhase = 0; blinkTimer = 1.6 + Math.random() * 3.2; }
    if (blinkPhase >= 0) {
      blinkPhase += dt * 9;
      const s = blinkPhase < 1 ? 1 - blinkPhase : (blinkPhase < 2 ? blinkPhase - 1 : 1);
      const zs = Math.max(s, 0.06);
      if (piv.PIV_blink_L) piv.PIV_blink_L.scale.z = zs;
      if (piv.PIV_blink_R) piv.PIV_blink_R.scale.z = zs;
      if (blinkPhase >= 2) blinkPhase = -1;
    }

    // talk pulse (mouth)
    if (talkPulse > 0) {
      talkPulse -= dt;
      const m = 1 + Math.abs(Math.sin(t * 14)) * 0.9;
      if (piv.PIV_mouth) piv.PIV_mouth.scale.set(1, m, m);
    } else if (piv.PIV_mouth) piv.PIV_mouth.scale.set(1, 1, 1);

    // hair sway
    for (const [n, ph, amp] of [['PIV_tail_L1',0,0.05],['PIV_tail_L2',0.7,0.08],['PIV_tail_L3',1.4,0.11],['PIV_tail_R1',0.4,0.05],['PIV_tail_R2',1.1,0.08],['PIV_tail_R3',1.8,0.11]]) {
      if (piv[n]) { piv[n].rotation.x = Math.sin(t * 1.4 + ph) * amp; piv[n].rotation.z = Math.cos(t * 1.1 + ph) * amp * 0.6; }
    }

    // wave reaction
    if (waveT >= 0) {
      waveT += dt;
      const d = 1.6;
      if (waveT < d) {
        const k = Math.sin(Math.min(waveT / 0.35, 1) * Math.PI / 2);
        if (piv.PIV_shoulder_R) piv.PIV_shoulder_R.rotation.y = -1.45 * k;
        if (piv.PIV_elbow_R) piv.PIV_elbow_R.rotation.y = -0.5 * k + Math.sin(waveT * 12) * 0.35 * k;
      } else {
        waveT = -1;
        if (piv.PIV_shoulder_R) piv.PIV_shoulder_R.rotation.y = 0;
        if (piv.PIV_elbow_R) piv.PIV_elbow_R.rotation.y = 0;
      }
    }

    // happy bounce
    if (bounceT >= 0) {
      bounceT += dt;
      if (bounceT < 0.5) {
        const b = Math.sin(bounceT / 0.5 * Math.PI);
        model.position.y = b * 0.06;
      } else { bounceT = -1; model.position.y = 0; }
    }

    // spin
    if (spinT >= 0) {
      spinT += dt;
      if (spinT < 1.0) model.rotation.y = spinT * Math.PI * 2;
      else { spinT = -1; model.rotation.y = 0; }
    }

    // bubble follows head
    if (bubble.classList.contains('show') && piv.PIV_head) {
      const hp = new THREE.Vector3();
      piv.PIV_head.getWorldPosition(hp);
      hp.y += 0.16;
      hp.project(camera);
      const topPx = Math.max((-hp.y * 0.5 + 0.5) * window.innerHeight, 64);
      bubble.style.left = ((hp.x * 0.5 + 0.5) * window.innerWidth) + 'px';
      bubble.style.top = topPx + 'px';
    }
  }

  ring.rotation.z = t * 0.15;
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
