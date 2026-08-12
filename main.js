import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// The browser restores the previous scroll position by default, so reopening the
// page dropped the visitor wherever they left off, usually the contact section at
// the very bottom. This is a scroll-driven intro, so it must always start at the
// top. An explicit #hash is still honoured.
//
// This runs before registerPlugin on purpose: ScrollTrigger caches the current
// scrollRestoration value when it initialises and writes it back after a refresh,
// so setting it afterwards gets silently reverted to 'auto'.
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

if (!window.location.hash) {
  window.scrollTo(0, 0);
  window.addEventListener('load', () => window.scrollTo(0, 0), { once: true });
}

// Register GSAP ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

// --- TOAST NOTIFICATION UTILITY ---
const showToast = (message, type = 'info', duration = 4000) => {
  // Remove existing toasts
  document.querySelectorAll('.aw-toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = 'aw-toast';
  // Success and error keep a green/red distinction on purpose: those two carry
  // meaning and would become indistinguishable if folded into the palette.
  // Info moves onto the brand gold.
  const colors = {
    success: 'linear-gradient(135deg,rgba(72,199,142,0.18),rgba(10,2,20,0.97))',
    error:   'linear-gradient(135deg,rgba(241,48,36,0.18),rgba(10,2,20,0.97))',
    info:    'linear-gradient(135deg,rgba(251,191,90,0.15),rgba(10,2,20,0.97))',
  };
  const borders = { success: '#48c78e', error: '#f13024', info: '#fbbf5a' };
  toast.style.cssText = `
    position:fixed; bottom:90px; left:50%; transform:translateX(-50%) translateY(30px);
    background:${colors[type]||colors.info};
    border:1px solid ${borders[type]||borders.info};
    border-radius:16px; padding:1rem 1.6rem; z-index:99998;
    font-family:'Space Grotesk',sans-serif; font-size:0.9rem; color:#fff;
    box-shadow:0 8px 40px rgba(0,0,0,0.6); min-width:260px; text-align:center;
    backdrop-filter:blur(20px);
    transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1);
    opacity:0; pointer-events:none;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  // Auto-dismiss
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(30px)';
    setTimeout(() => toast.remove(), 500);
  }, duration);
};

// --- AUDIO ENGINE (Procedural Web Audio API) ---

let audioCtx = null;
let masterGain = null;
let ambientOsc1 = null;
let ambientOsc2 = null;
let ambientFilter = null;
let ambientGain = null;
let noiseSource = null;
let noiseFilter = null;
let noiseGain = null;

let isSoundEnabled = false;

// Single source of truth for the phone tier: it lowers renderer cost, thins the
// constellation, and lifts the drone an octave since phone speakers cannot
// reproduce 65Hz. Read once at load; a resize past the breakpoint is not worth
// rebuilding the whole scene for.
const isMobileDevice = window.innerWidth < 768;

// Scroll velocity tracking variables
let lastScrollY = window.scrollY;
let scrollVelocity = 0;
let smoothVelocity = 0;

window.addEventListener('scroll', () => {
  const currentY = window.scrollY;
  scrollVelocity = Math.abs(currentY - lastScrollY);
  lastScrollY = currentY;
});

const initAudio = () => {
  if (audioCtx) return;

  // Create audio context
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // Master bus: every voice routes through here so level, fades and ducking
  // are controlled from a single node instead of hitting the destination raw.
  masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
  masterGain.connect(audioCtx.destination);

  // 1. Ambient Space Drone.
  // The previous version read as an alarm rather than atmosphere, for three
  // reasons: a sawtooth carries every harmonic and buzzes, a resonant filter
  // sweeping 120-280Hz every eight seconds is the shape of a siren, and an exact
  // perfect fifth held dead still sounds like a horn. This version drops the
  // sawtooth, flattens the sweep, and gets its movement from two voices detuned
  // by a fraction of a hertz so they drift in and out of phase instead.
  ambientFilter = audioCtx.createBiquadFilter();
  ambientFilter.type = 'lowpass';
  ambientFilter.frequency.setValueAtTime(320, audioCtx.currentTime);
  ambientFilter.Q.setValueAtTime(0.6, audioCtx.currentTime);

  ambientGain = audioCtx.createGain();
  ambientGain.gain.setValueAtTime(0.045, audioCtx.currentTime);

  // Phone speakers cannot move enough air for A1, so the pad sits an octave up
  const root = isMobileDevice ? 110 : 55;      // A1 / A2
  const fifth = isMobileDevice ? 164.8 : 82.4; // E2 / E3

  ambientOsc1 = audioCtx.createOscillator();
  ambientOsc1.type = 'triangle';
  ambientOsc1.frequency.setValueAtTime(root, audioCtx.currentTime);

  ambientOsc2 = audioCtx.createOscillator();
  ambientOsc2.type = 'sine';
  ambientOsc2.frequency.setValueAtTime(fifth, audioCtx.currentTime);

  // Third voice an octave above the root, detuned by 0.3Hz. That offset produces
  // a beat every few seconds, which is what makes the pad feel alive without a
  // periodic filter sweep doing it.
  const ambientOsc3 = audioCtx.createOscillator();
  ambientOsc3.type = 'sine';
  ambientOsc3.frequency.setValueAtTime(root * 2 + 0.3, audioCtx.currentTime);

  const osc3Gain = audioCtx.createGain();
  osc3Gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  ambientOsc3.connect(osc3Gain);
  osc3Gain.connect(ambientFilter);

  // Very slow, shallow cutoff drift. Half the depth and less than half the rate
  // of the original, so it reads as breathing rather than sweeping.
  const lfo = audioCtx.createOscillator();
  lfo.frequency.setValueAtTime(0.05, audioCtx.currentTime); // one cycle per 20s
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.setValueAtTime(35, audioCtx.currentTime);

  lfo.connect(lfoGain);
  lfoGain.connect(ambientFilter.frequency);

  ambientOsc1.connect(ambientFilter);
  ambientOsc2.connect(ambientFilter);
  ambientFilter.connect(ambientGain);
  ambientGain.connect(masterGain);

  // Start hum nodes
  ambientOsc1.start();
  ambientOsc2.start();
  ambientOsc3.start();
  lfo.start();

  // 2. Dynamic Scroll Whoosh (White Noise)
  const bufferSize = 2 * audioCtx.sampleRate;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(120, audioCtx.currentTime);
  noiseFilter.Q.setValueAtTime(1.2, audioCtx.currentTime);

  noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.0, audioCtx.currentTime); // start silent

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);

  noiseSource.start();
};

// Fade the master bus instead of hard suspending the context, so toggling
// sound on and off does not produce a click.
const setMasterLevel = (value, seconds = 0.35) => {
  if (!audioCtx || !masterGain) return;
  masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
  masterGain.gain.setValueAtTime(masterGain.gain.value, audioCtx.currentTime);
  masterGain.gain.linearRampToValueAtTime(value, audioCtx.currentTime + seconds);
};

// Sweeping the cursor across a list fires mouseenter far faster than the 80ms
// chime decays, and the overlapping copies sum into a harsh buzz. Rate limit it.
let lastHoverSoundAt = 0;
const HOVER_SOUND_MIN_GAP = 120;

const playHoverSound = () => {
  try {
    if (!isSoundEnabled || !audioCtx) return;

    const now = performance.now();
    if (now - lastHoverSoundAt < HOVER_SOUND_MIN_GAP) return;
    lastHoverSoundAt = now;

    // Sine chime click
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(350, audioCtx.currentTime + 0.08);

    gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);

    osc.connect(gainNode);
    gainNode.connect(masterGain);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
  } catch (e) {
    console.warn("playHoverSound failed:", e);
  }
};

// Toggle button logic
window.addEventListener('DOMContentLoaded', () => {
  const soundToggleBtn = document.getElementById('sound-toggle');
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      if (!audioCtx) {
        initAudio();
      }

      if (isSoundEnabled) {
        isSoundEnabled = false;
        setMasterLevel(0);
        // Suspend only once the fade has finished, otherwise it clicks
        setTimeout(() => { if (!isSoundEnabled) audioCtx.suspend(); }, 400);
        soundToggleBtn.classList.remove('active');
        soundToggleBtn.querySelector('.sound-icon').textContent = '🔈';
        soundToggleBtn.querySelector('.sound-text').textContent = 'SES: KAPALI';
      } else {
        audioCtx.resume();
        setMasterLevel(1);
        isSoundEnabled = true;
        soundToggleBtn.classList.add('active');
        soundToggleBtn.querySelector('.sound-icon').textContent = '🔊';
        soundToggleBtn.querySelector('.sound-text').textContent = 'SES: AÇIK';
        playHoverSound();
      }
    });
  }
});


// --- 1. SETUP THREE.JS SCENE, CAMERA, & RENDERER ---
const canvas = document.getElementById('webgl-canvas');
const scene = new THREE.Scene();

// Cache variables for skills panel restoration in mobile accordion layout
let originalSkillsPanelParent = null;
let originalSkillsPanelNextSibling = null;

// Initialize caches as soon as script runs (since DOM is already parsed in module script)
const initialSkillsPanel = document.getElementById('skills-detail-panel');
if (initialSkillsPanel) {
  originalSkillsPanelParent = initialSkillsPanel.parentNode;
  originalSkillsPanelNextSibling = initialSkillsPanel.nextSibling;
}

// Cache variables for projects panel restoration in mobile accordion layout
let originalProjectsPanelParent = null;
let originalProjectsPanelNextSibling = null;

const initialProjectsPanel = document.getElementById('projects-detail-panel');
if (initialProjectsPanel) {
  originalProjectsPanelParent = initialProjectsPanel.parentNode;
  originalProjectsPanelNextSibling = initialProjectsPanel.nextSibling;
}


// Add deep space fog to give a strong sense of distance and depth
scene.fog = new THREE.FogExp2(0x030008, 0.018);

// Camera Group to enable dual-layered motion (scroll flight + mouse sway)
const cameraGroup = new THREE.Group();
cameraGroup.position.set(0, 0, 35);
scene.add(cameraGroup);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 0); // Local center relative to group
cameraGroup.add(camera);

// Dynamic Camera FOV Adjustment for mobile screens to avoid tunnel cramp
const updateCameraFOV = () => {
  if (window.innerWidth < 768) {
    camera.fov = 92; // Wider field of view on mobile devices to show more walls
  } else {
    camera.fov = 75; // Default desktop field of view
  }
  camera.updateProjectionMatrix();
};
updateCameraFOV(); // Run once initially

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  // MSAA and a 2x buffer are the two most expensive knobs on a phone GPU, and the
  // scene is dark and fog-heavy enough that neither is visible there.
  antialias: !isMobileDevice,
  alpha: false, // solid background for better fog blending
  powerPreference: 'high-performance'
});
const maxPixelRatio = isMobileDevice ? 1.5 : 2;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
renderer.setClearColor(scene.fog.color); // match background color to fog
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// Resize Handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  updateCameraFOV();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));

  // Restore/adjust skills details panel placement on desktop/mobile layout transition
  const activeCard = document.querySelector('.skill-card.active');
  const skillsPanel = document.getElementById('skills-detail-panel');
  if (window.innerWidth >= 768) {
    if (skillsPanel && originalSkillsPanelParent && skillsPanel.parentNode !== originalSkillsPanelParent) {
      originalSkillsPanelParent.insertBefore(skillsPanel, originalSkillsPanelNextSibling);
      skillsPanel.style.display = 'block';
    }
  } else {
    if (activeCard && skillsPanel && skillsPanel.parentNode !== activeCard) {
      skillsPanel.style.display = 'block';
      activeCard.appendChild(skillsPanel);
    } else if (!activeCard && skillsPanel) {
      skillsPanel.style.display = 'none';
    }
  }

  // Restore/adjust projects details panel placement on desktop/mobile transition
  const projectsPanel = document.getElementById('projects-detail-panel');
  if (projectsPanel) {
    if (originalProjectsPanelParent && projectsPanel.parentNode !== originalProjectsPanelParent) {
      originalProjectsPanelParent.insertBefore(projectsPanel, originalProjectsPanelNextSibling);
    }
    projectsPanel.style.display = 'flex';
  }
});

// --- 2. LIGHTS (Brighter and more dynamic to highlight 3D volume) ---
const ambientLight = new THREE.AmbientLight(0x180508, 1.2);
scene.add(ambientLight);

// Red neon point light
const purpleLight = new THREE.PointLight(0xf13024, 20, 60);
purpleLight.position.set(-10, 5, 15);
scene.add(purpleLight);

// Orange neon point light
const cyanLight = new THREE.PointLight(0xf97316, 20, 60);
cyanLight.position.set(10, -5, 15);
scene.add(cyanLight);

// Spotlight focused on the portal entrance (Crimson Red)
const portalSpot = new THREE.SpotLight(0xf13024, 30, 45, Math.PI / 4, 0.5, 1);
portalSpot.position.set(0, 10, 20);
scene.add(portalSpot);

// Moving light attached to camera (highlights geometry as camera moves past)
const cameraLight = new THREE.PointLight(0xffffff, 8, 35);
scene.add(cameraLight);

// --- 3. CREATING THE 3D SCENE OBJECTS ---

// A. 3D Constellation Network (Replaces starfield with interactive grid)
// The link pass is O(n^2) per frame, so halving the count on phones cuts it by four.
const constellationNodeCount = isMobileDevice ? 60 : 120;
const constellationNodes = [];
const constellationGeometry = new THREE.BufferGeometry();
const constellationPositions = new Float32Array(constellationNodeCount * 3);
const constellationColors = new Float32Array(constellationNodeCount * 3);

// Helper to create star texture for points
const createStarTexture = () => {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.3, 'rgba(241, 48, 36, 0.85)'); // Red glow
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 16, 16);
  return new THREE.CanvasTexture(c);
};
const starTexture = createStarTexture();

for (let i = 0; i < constellationNodeCount; i++) {
  const x = (Math.random() - 0.5) * 60;
  const y = (Math.random() - 0.5) * 45;
  const z = (Math.random() - 0.5) * 160 - 30; // spread along Z axis
  
  constellationPositions[i * 3] = x;
  constellationPositions[i * 3 + 1] = y;
  constellationPositions[i * 3 + 2] = z;
  
  // Set node colors (red, orange, white/pink)
  const rand = Math.random();
  if (rand < 0.45) {
    constellationColors[i * 3] = 0.95;
    constellationColors[i * 3 + 1] = 0.19;
    constellationColors[i * 3 + 2] = 0.14;
  } else if (rand < 0.8) {
    constellationColors[i * 3] = 0.98;
    constellationColors[i * 3 + 1] = 0.45;
    constellationColors[i * 3 + 2] = 0.09;
  } else {
    constellationColors[i * 3] = 1.0;
    constellationColors[i * 3 + 1] = 0.8;
    constellationColors[i * 3 + 2] = 0.85;
  }

  constellationNodes.push({
    x, y, z,
    vx: (Math.random() - 0.5) * 0.04,
    vy: (Math.random() - 0.5) * 0.04,
    vz: (Math.random() - 0.5) * 0.05
  });
}

constellationGeometry.setAttribute('position', new THREE.BufferAttribute(constellationPositions, 3));
constellationGeometry.setAttribute('color', new THREE.BufferAttribute(constellationColors, 3));

const constellationMat = new THREE.PointsMaterial({
  size: 0.38,
  vertexColors: true,
  transparent: true,
  opacity: 0.9,
  map: starTexture,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});

const constellationPoints = new THREE.Points(constellationGeometry, constellationMat);
scene.add(constellationPoints);

// B. Constellation Lines
const maxLines = 750;
const constellationLinesGeo = new THREE.BufferGeometry();
const constellationLinesPos = new Float32Array(maxLines * 2 * 3); // 2 points per line, 3 coords per point
const constellationLinesColor = new Float32Array(maxLines * 2 * 3);
constellationLinesGeo.setAttribute('position', new THREE.BufferAttribute(constellationLinesPos, 3));
constellationLinesGeo.setAttribute('color', new THREE.BufferAttribute(constellationLinesColor, 3));

const constellationLinesMat = new THREE.LineBasicMaterial({
  vertexColors: true,
  transparent: true,
  opacity: 0.22,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const constellationLines = new THREE.LineSegments(constellationLinesGeo, constellationLinesMat);
scene.add(constellationLines);


// B. Infinite 3D Sci-Fi Tunnel (Diamond Arches)
// Having structural shapes pass closely by the camera creates an immediate 3D depth/parallax effect
const tunnelGroup = new THREE.Group();
scene.add(tunnelGroup);

const tunnelSegmentCount = 12;
const tunnelSegments = [];
for (let i = 0; i < tunnelSegmentCount; i++) {
  const zPos = 30 - i * 15; // Spaced every 15 units along Z axis
  
  // Outer Diamond Arch
  const archGeo = new THREE.TorusGeometry(12, 0.12, 8, 4); // 4 segments makes it a diamond frame
  const archMat = new THREE.MeshStandardMaterial({
    color: i % 2 === 0 ? 0xf13024 : 0xf97316, // Crimson and Orange
    emissive: i % 2 === 0 ? 0x4a0408 : 0x4c1d05, // deep glowing hues
    emissiveIntensity: 2.0,
    roughness: 0.1,
    metalness: 0.9
  });
  const arch = new THREE.Mesh(archGeo, archMat);
  arch.position.set(0, 0, zPos);
  arch.rotation.z = Math.PI / 4; // Rotate to diamond orientation
  tunnelGroup.add(arch);
  tunnelSegments.push(arch);

  // Floating side columns to anchor the floor
  const colGeo = new THREE.CylinderGeometry(0.15, 0.15, 20, 8);
  const colMat = new THREE.MeshStandardMaterial({ color: 0x2a1210, metalness: 0.8, roughness: 0.2 });
  
  const leftCol = new THREE.Mesh(colGeo, colMat);
  leftCol.position.set(-8.5, 0, zPos);
  tunnelGroup.add(leftCol);

  const rightCol = new THREE.Mesh(colGeo, colMat);
  rightCol.position.set(8.5, 0, zPos);
  tunnelGroup.add(rightCol);
}


// C. The Entrance Portal Frame & Doors
const portalGroup = new THREE.Group();
portalGroup.position.set(0, 0, 8); // Placed at z = 8
scene.add(portalGroup);

// Circular portal frame
const ringGeo = new THREE.TorusGeometry(6.2, 0.25, 16, 100);
const ringMat = new THREE.MeshStandardMaterial({
  color: 0xf97316, // Orange Portal Ring
  emissive: 0xf97316,
  emissiveIntensity: 2.5,
  roughness: 0.1,
  metalness: 0.9
});
const portalRing = new THREE.Mesh(ringGeo, ringMat);
portalGroup.add(portalRing);

// Portal Swirl Wormhole (Rotating geometric wireframe mesh)
// 180x24 segments was ~8.6k triangles for a single thin knot; 120x16 is
// indistinguishable at this scale and costs a third of that.
const swirlGeo = new THREE.TorusKnotGeometry(4.8, 0.2, isMobileDevice ? 80 : 120, isMobileDevice ? 12 : 16, 3, 4);
const swirlMat = new THREE.MeshPhysicalMaterial({
  color: 0xf13024, // Crimson Swirl
  emissive: 0x3d0407,
  wireframe: true,
  transparent: true,
  opacity: 0.65,
  blending: THREE.AdditiveBlending
});
const portalSwirl = new THREE.Mesh(swirlGeo, swirlMat);
portalGroup.add(portalSwirl);

// Hinge Setup for swing doors
const doorWidth = 6.0;
const doorHeight = 11.5;
const doorDepth = 0.2;

const leftHinge = new THREE.Group();
leftHinge.position.set(-doorWidth, 0, 0.1);
portalGroup.add(leftHinge);

const rightHinge = new THREE.Group();
rightHinge.position.set(doorWidth, 0, 0.1);
portalGroup.add(rightHinge);

// Highly reflective thick glass doors
const doorMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x090518,
  roughness: 0.05,
  metalness: 0.1,
  transmission: 0.7, // glass transparency
  thickness: 2.0,
  ior: 1.5,
  transparent: true,
  opacity: 0.85,
  side: THREE.DoubleSide
});

const leftDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth), doorMaterial);
leftDoorMesh.position.x = doorWidth / 2;
leftHinge.add(leftDoorMesh);

const rightDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth), doorMaterial);
rightDoorMesh.position.x = -doorWidth / 2;
rightHinge.add(rightDoorMesh);

// Glowing vertical energy bars on doors
const stripeGeo = new THREE.BoxGeometry(0.12, doorHeight - 0.5, 0.08);
const stripeLeft = new THREE.Mesh(stripeGeo, new THREE.MeshBasicMaterial({ color: 0xf97316 })); // Orange
stripeLeft.position.set(doorWidth - 0.1, 0, doorDepth / 2 + 0.02);
leftDoorMesh.add(stripeLeft);

const stripeRight = new THREE.Mesh(stripeGeo, new THREE.MeshBasicMaterial({ color: 0xf13024 })); // Red
stripeRight.position.set(-doorWidth + 0.1, 0, doorDepth / 2 + 0.02);
rightDoorMesh.add(stripeRight);


// D. Interactive Portfolio Monoliths
const roomGroup = new THREE.Group();
roomGroup.position.set(0, 0, -45); // Centered at z = -45
scene.add(roomGroup);

// Solid Sci-fi Floor grid covering the corridor range
const floorGrid1 = new THREE.GridHelper(60, 40, 0xf13024, 0x27070a); // Red Grid 1
floorGrid1.position.y = -8;
floorGrid1.position.z = -10;
floorGrid1.material.opacity = 0.35;
floorGrid1.material.transparent = true;
roomGroup.add(floorGrid1);

const floorGrid2 = new THREE.GridHelper(60, 40, 0xf13024, 0x27070a); // Red Grid 2
floorGrid2.position.y = -8;
floorGrid2.position.z = -70; // covers z = -40 to -100
floorGrid2.material.opacity = 0.35;
floorGrid2.material.transparent = true;
roomGroup.add(floorGrid2);

const floorGrid3 = new THREE.GridHelper(60, 40, 0xf13024, 0x27070a); // Red Grid 3
floorGrid3.position.y = -8;
floorGrid3.position.z = -130; // covers z = -100 to -160
floorGrid3.material.opacity = 0.35;
floorGrid3.material.transparent = true;
roomGroup.add(floorGrid3);

const projectsData = [
  { color: 0xf13024, title: "Hyperion Engine", x: -5.5, y: 0.8, z: 22 }, // Red
  { color: 0xf97316, title: "Neon Nexus", x: -7.0, y: -0.8, z: 12 },   // Orange
  { color: 0xf97316, title: "Aether Spaces", x: -8.5, y: 1.2, z: 2 }    // Pink/Accent
];

const monoliths = [];
projectsData.forEach((proj, idx) => {
  const monoGeo = new THREE.BoxGeometry(4.0, 5.8, 0.4);
  const monoMat = new THREE.MeshPhysicalMaterial({
    color: 0x050212,
    roughness: 0.1,
    metalness: 0.9,
    clearcoat: 1.0,
    transmission: 0.4,
    thickness: 1.0,
    transparent: true,
    opacity: 0.92
  });
  const mesh = new THREE.Mesh(monoGeo, monoMat);
  mesh.position.set(proj.x, proj.y, proj.z);
  mesh.rotation.y = Math.PI / 5; // Rotated towards the camera's path
  
  // Neon frame
  const edges = new THREE.EdgesGeometry(monoGeo);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: proj.color, linewidth: 2 }));
  mesh.add(line);

  // Glowing center plate
  const coreGeo = new THREE.PlaneGeometry(3.6, 5.4);
  const coreMat = new THREE.MeshBasicMaterial({
    color: proj.color,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.z = 0.21;
  mesh.add(core);

  mesh.userData = { id: idx, title: proj.title, color: proj.color, initialY: proj.y };
  roomGroup.add(mesh);
  monoliths.push(mesh);
});


// E. Skills Node Network (Glowing Constellation)
const skillCenter = new THREE.Vector3(7.5, 0.5, -6);
const skillsGroup = new THREE.Group();
skillsGroup.position.copy(skillCenter);
roomGroup.add(skillsGroup);

// Big glowing skill core
const coreSphereGeo = new THREE.SphereGeometry(1.6, 32, 32);
const coreSphereMat = new THREE.MeshPhysicalMaterial({
  color: 0xf97316, // Orange core
  emissive: 0x3d1405,
  roughness: 0.05,
  metalness: 0.9,
  clearcoat: 1.0
});
const skillCoreMesh = new THREE.Mesh(coreSphereGeo, coreSphereMat);
skillsGroup.add(skillCoreMesh);

// Outer skill nodes
const nodeCount = 5;
const nodes = [];
const nodeGeom = new THREE.SphereGeometry(0.45, 16, 16);

for (let i = 0; i < nodeCount; i++) {
  const angle = (i / nodeCount) * Math.PI * 2;
  const radius = 4.2;
  const nodeMat = new THREE.MeshStandardMaterial({
    color: i % 2 === 0 ? 0xf13024 : 0xf97316, // Red and Pink
    emissive: i % 2 === 0 ? 0x3d0407 : 0x3d1405,
    emissiveIntensity: 1.8,
    roughness: 0.2
  });
  const node = new THREE.Mesh(nodeGeom, nodeMat);
  
  const x = Math.cos(angle) * radius;
  const y = (Math.random() - 0.5) * 2.5;
  const z = Math.sin(angle) * radius;
  node.position.set(x, y, z);
  skillsGroup.add(node);
  nodes.push(node);

  // Connecting node lines
  const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(x, y, z)];
  const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
  const lineMat = new THREE.LineBasicMaterial({
    color: i % 2 === 0 ? 0xf13024 : 0xf97316, // Red / Orange
    transparent: true,
    opacity: 0.35
  });
  const line = new THREE.Line(lineGeo, lineMat);
  skillsGroup.add(line);
}


// F. Final Contact Artifact (Torus Knot + Floating Rings)
const contactGroup = new THREE.Group();
contactGroup.position.set(0, 0, -115); // Shifted deeper for gallery section insertion
roomGroup.add(contactGroup);

const knotGeo = new THREE.TorusKnotGeometry(2.4, 0.7, 180, 16, 2, 5);
const knotMat = new THREE.MeshStandardMaterial({
  color: 0xf13024, // Crimson Red Knot
  emissive: 0x4a0408,
  roughness: 0.1,
  metalness: 0.95
});
const contactKnot = new THREE.Mesh(knotGeo, knotMat);
contactGroup.add(contactKnot);

// Dynamic floating cage ring
const outerRingGeo = new THREE.TorusGeometry(4.5, 0.08, 16, 100);
const outerRingMat = new THREE.MeshBasicMaterial({
  color: 0xf97316, // Orange outer rings
  transparent: true,
  opacity: 0.6
});
const outerRing1 = new THREE.Mesh(outerRingGeo, outerRingMat);
outerRing1.rotation.x = Math.PI / 2;
contactGroup.add(outerRing1);

const outerRing2 = new THREE.Mesh(outerRingGeo, outerRingMat);
outerRing2.rotation.y = Math.PI / 2;
contactGroup.add(outerRing2);

// G. Mouse constellation line parameters (handled dynamically in animation loop)


// --- 4. ANIMATION & SCROLLTRIGGER SETUP (Cinematic Scroll Flight) ---

// Timeline mapped to scroll container height
const mainTimeline = gsap.timeline({
  scrollTrigger: {
    trigger: '.scroll-container',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.8, // Restore smooth glide lag
  }
});

// Expose to window for debugging
window.mainTimeline = mainTimeline;
window.ScrollTrigger = ScrollTrigger;
window.cameraGroup = cameraGroup;

// Animate doors, portal grid scale, and camera fly-through with banking rotations (Z roll)
// Banking (camera.rotation.z) simulates aircraft-like flight turning and makes 3D depth extremely obvious!
mainTimeline
  // SECTION 1 (Entrance Hero) -> SECTION 2 (Projects Gallery)
  // Swing doors open
  .to(leftHinge.rotation, { y: -Math.PI / 1.4, ease: 'power2.inOut' }, 0)
  .to(rightHinge.rotation, { y: Math.PI / 1.4, ease: 'power2.inOut' }, 0)
  .to(portalSwirl.rotation, { z: Math.PI * 5, ease: 'none' }, 0)
  .to(portalSwirl.scale, { x: 2.2, y: 2.2, z: 2.2, ease: 'power1.in' }, 0.1)
  .to(portalSwirl.material, { opacity: 0, ease: 'power1.in' }, 0.3)
  
  // Camera flies forward, past the portal and bends left towards the monoliths
  .to(cameraGroup.position, {
    z: -18,
    y: 0.2,
    x: -3.5, // Slide left to frame the monoliths
    ease: 'power1.inOut'
  }, 0)
  // Bank/roll camera to the left as we curve left
  .to(cameraGroup.rotation, {
    y: -Math.PI / 6, // Pan left
    z: -Math.PI / 16, // Bank left (adds huge 3D flying feel!)
    ease: 'power1.inOut'
  }, 0.1)

  // SECTION 2 (Projects Gallery) -> SECTION 3 (Skills Network)
  // Camera flies deeper and swings right towards the skills group
  .to(cameraGroup.position, {
    z: -48,
    y: 0.8,
    x: 3.5, // Slide right to frame skills
    ease: 'power1.inOut'
  }, 1)
  // Bank camera to the right as we turn right
  .to(cameraGroup.rotation, {
    y: Math.PI / 5, // Pan right
    z: Math.PI / 14, // Bank right
    ease: 'power1.inOut'
  }, 1)

  // SECTION 3 (Skills Network) -> SECTION 4 (Adnan Walk Gallery)
  // Camera flies deeper, centers, and frames the floating gallery screens on the walls
  .to(cameraGroup.position, {
    z: -72,
    y: 0.3,
    x: -2.0,
    ease: 'power2.inOut'
  }, 2)
  .to(cameraGroup.rotation, {
    y: -Math.PI / 12, // Slight tilt to face the gallery wall
    z: 0,
    x: 0,
    ease: 'power2.inOut'
  }, 2)

  // SECTION 4 (Adnan Walk Gallery) -> SECTION 5 (Contact Outro)
  // Camera flies to the very end of the corridor, aligning face-to-face with the contact card
  .to(cameraGroup.position, {
    z: -105,
    y: 0,
    x: 0,
    ease: 'power2.inOut'
  }, 3)
  .to(cameraGroup.rotation, {
    y: 0,
    z: 0,
    x: 0,
    ease: 'power2.inOut'
  }, 3);


// --- 5. INTERACTIVE HOVER DETECTION & RAYCASTING ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredMonolith = null;

// Listen to mouse movement
window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

// Listen to touch events on mobile devices to update coordinates for 3D interactions
const handleTouch = (e) => {
  if (e.touches && e.touches.length > 0) {
    const touch = e.touches[0];
    mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
  }
};
window.addEventListener('touchstart', handleTouch, { passive: true });
window.addEventListener('touchmove', handleTouch, { passive: true });

// Scramble Text effect for cyberpunk matrix decryption look
const scrambleText = (el, text) => {
  const chars = 'XYZ$%#@!&*+=?[]{}';
  let iteration = 0;
  const interval = setInterval(() => {
    el.innerText = text
      .split("")
      .map((letter, index) => {
        if (index < iteration) {
          return text[index];
        }
        return chars[Math.floor(Math.random() * chars.length)];
      })
      .join("");
    
    if (iteration >= text.length) {
      clearInterval(interval);
    }
    iteration += 1 / 3.5;
  }, 30);
};

// Hologram / Link reveal sweeping sound effect
const playRevealSound = () => {
  try {
    if (!isSoundEnabled || !audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(740, audioCtx.currentTime + 0.35);
    
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(350, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1500, audioCtx.currentTime + 0.35);
    filter.Q.setValueAtTime(3.0, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.045, audioCtx.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
    
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(masterGain);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  } catch (e) {
    console.warn("playRevealSound failed:", e);
  }
};

// HTML side project sync
const htmlProjItems = document.querySelectorAll('.project-item');

htmlProjItems.forEach(item => {
  item.addEventListener('mouseenter', () => {
    const idx = parseInt(item.getAttribute('data-index'));
    
    if (!item.classList.contains('active')) {
      htmlProjItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      const targetMono = monoliths.find(m => m.userData.id === idx);
      if (targetMono) {
        gsap.to(targetMono.scale, { x: 1.15, y: 1.15, z: 1.15, duration: 0.4 });
        gsap.to(targetMono.rotation, { y: Math.PI / 3, z: 0.1, duration: 0.4 });
        targetMono.children[1].material.opacity = 0.45; // glowing core gets brighter
        playHoverSound();
      }
    }

    // Scramble effect on link text. The reveal swoosh is deliberately not played
    // here: playHoverSound above already fires, and stacking both muddies the cue.
    const linkTextEl = item.querySelector('.link-text');
    if (linkTextEl) {
      scrambleText(linkTextEl, "İNCELE");
    }
  });

  item.addEventListener('mouseleave', () => {
    const idx = parseInt(item.getAttribute('data-index'));
    const targetMono = monoliths.find(m => m.userData.id === idx);
    if (targetMono) {
      gsap.to(targetMono.scale, { x: 1, y: 1, z: 1, duration: 0.4 });
      gsap.to(targetMono.rotation, { y: Math.PI / 5, z: 0, duration: 0.4 });
      targetMono.children[1].material.opacity = 0.12;
    }
  });
});

// --- 5B. IN-PAGE PROJECT DETAIL PANEL & 3D CAMERA ZOOM ---
const projectData = [
  {
    title: "Hyperion Motoru",
    desc: "Ham WebGL gölgelendiricileri ile güçlendirilen, yıldız ışığı kırılımlarını ve gravitasyonel merceklenmeleri simüle eden gerçek zamanlı parçacık motoru. Uzay-zaman bükülmelerini 60 FPS hızında tarayıcıya yansıtır.",
    tags: ["WebGL", "Three.js", "Shaders", "GPU Math"],
    stats: { fps: "60 FPS", load: "< 15ms", shader: "Custom GLSL" },
    filename: "hyperion_field.glsl",
    code: `void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  float d = length(uv - 0.5) * gravitationalPull;
  vec3 col = starColor * (0.01 / d);
  gl_FragColor = vec4(col, 1.0);
}`
  },
  {
    title: "Neon Nexus",
    desc: "Yeni nesil e-ticaret siteleri için geliştirilen, procedural 3D ürün konfigüratörü. Dinamik gölgelendirme, gerçek zamanlı materyal kaplama ve 3D model optimizasyonu sağlar.",
    tags: ["Procedural 3D", "PBR Materials", "Vite", "Commerce"],
    stats: { fps: "60 FPS", load: "< 35ms", shader: "MeshStandard" },
    filename: "neon_nexus.js",
    code: `const material = new THREE.MeshStandardMaterial({
  color: params.neonColor,
  roughness: 0.1,
  metalness: 0.95,
  emissive: params.neonColor
});`
  },
  {
    title: "Eter Alanları",
    desc: "Devasa çok oyunculu ortamlar için optimize edilmiş, hafif voksel mimari alanlar. Üç boyutlu hacimsel veriler ve dinamik aydınlatma ağları kullanılarak oluşturulmuştur.",
    tags: ["Voxels", "Multiplayer", "BufferGeometry", "LOD"],
    stats: { fps: "60 FPS", load: "< 40ms", shader: "Dynamic Light" },
    filename: "voxel_corridor.js",
    code: `// Generate voxel grid mesh
const indices = [];
const vertices = [];
buildFace(0, 1, 0, vertices, indices);
geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));`
  }
];

const modal = document.getElementById('project-modal');
const modalOverlay = document.getElementById('modal-overlay');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const modalTags = document.getElementById('modal-tags');
const statFps = document.getElementById('stat-fps');
const statLoad = document.getElementById('stat-load');
const statShader = document.getElementById('stat-shader');
const modalFilename = document.getElementById('modal-filename');
const modalCode = document.getElementById('modal-code');

const savedCamPos = new THREE.Vector3();
const savedCamRot = new THREE.Euler();
let isModalOpen = false;
let isTransitioning = false; // Guard flag to prevent transition overlapping issues

const playModalOpenSound = () => {
  try {
    if (!isSoundEnabled || !audioCtx) return;
    const now = audioCtx.currentTime;
    const playBlip = (freq, time, dur) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      gainNode.gain.setValueAtTime(0.015, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + dur);
      osc.connect(gainNode);
      gainNode.connect(masterGain);
      osc.start(time);
      osc.stop(time + dur);
    };
    playBlip(600, now, 0.08);
    playBlip(800, now + 0.08, 0.08);
    playBlip(1200, now + 0.16, 0.15);
  } catch (e) {
    console.warn("playModalOpenSound failed:", e);
  }
};

const playModalCloseSound = () => {
  try {
    if (!isSoundEnabled || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0.03, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    osc.connect(gainNode);
    gainNode.connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) {
    console.warn("playModalCloseSound failed:", e);
  }
};

const openProjectDetails = (idx) => {
  console.log("Opening project details. Modal:", isModalOpen, "Transitioning:", isTransitioning);
  if (isModalOpen || isTransitioning) return;
  isTransitioning = true;
  isModalOpen = true;
  
  const data = projectData[idx];
  if (!data) {
    isTransitioning = false;
    return;
  }

  // Populate data
  modalTitle.textContent = data.title;
  modalDesc.textContent = data.desc;
  statFps.textContent = data.stats.fps;
  statLoad.textContent = data.stats.load;
  statShader.textContent = data.stats.shader;
  modalFilename.textContent = data.filename;
  modalCode.textContent = data.code;

  // Populate tags
  modalTags.innerHTML = '';
  data.tags.forEach(t => {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = t;
    modalTags.appendChild(span);
  });

  // Open overlay classes
  modal.style.display = 'flex';
  modal.offsetHeight; // Force reflow
  modal.classList.add('active');
  playModalOpenSound();

  // 1. Disable page scroll immediately (stops ScrollTrigger from firing)
  document.body.style.overflow = 'hidden';

  // 2. Disable all ScrollTrigger instances but ALLOW their animation to continue playing (prevents timeline pause state freeze)
  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.getAll().forEach(st => st.disable(false, true));
  }

  // Save current camera transform before zooming
  savedCamPos.copy(cameraGroup.position);
  savedCamRot.copy(cameraGroup.rotation);

  // Zoom camera directly in front of the selected monolith
  let targetX = -4.5;
  let targetY = 0.5;
  let targetZ = -9;
  
  if (idx === 0) {
    targetX = -4.5;
    targetY = 0.5;
    targetZ = -10.5;
  } else if (idx === 1) {
    targetX = -1.5;
    targetY = 0.5;
    targetZ = -14.5;
  } else if (idx === 2) {
    targetX = -6.5;
    targetY = 0.5;
    targetZ = -18.5;
  }

  gsap.to(cameraGroup.position, {
    x: targetX,
    y: targetY,
    z: targetZ,
    duration: 1.4,
    ease: 'power3.inOut',
    overwrite: 'none'
  });

  gsap.to(cameraGroup.rotation, {
    x: 0,
    y: 0,
    z: 0,
    duration: 1.4,
    ease: 'power3.inOut',
    overwrite: 'none',
    onComplete: () => {
      isTransitioning = false; // Zoom complete, release guard
    }
  });
};

const closeProjectDetails = () => {
  console.log("Closing project details. Modal:", isModalOpen, "Transitioning:", isTransitioning);
  if (!isModalOpen || isTransitioning) return;
  isTransitioning = true;
  isModalOpen = false;

  modal.classList.remove('active');
  playModalCloseSound();

  // Hide display completely after transition completes
  setTimeout(() => {
    if (!isModalOpen) {
      modal.style.display = 'none';
    }
  }, 500);

  // Animate camera back to saved transform
  gsap.to(cameraGroup.position, {
    x: savedCamPos.x,
    y: savedCamPos.y,
    z: savedCamPos.z,
    duration: 1.4,
    ease: 'power3.inOut',
    overwrite: 'none'
  });

  gsap.to(cameraGroup.rotation, {
    x: savedCamRot.x,
    y: savedCamRot.y,
    z: savedCamRot.z,
    duration: 1.4,
    ease: 'power3.inOut',
    overwrite: 'none',
    onComplete: () => {
      // 1. Re-enable all ScrollTriggers and reset their animation play state
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.getAll().forEach(st => st.enable(true, true));
        ScrollTrigger.refresh();
      }
      
      // 2. Restore page scroll
      document.body.style.overflow = '';
      
      isTransitioning = false; // Transition fully complete, release guard
    }
  });
};

// --- 5D. 3D MEDYA GALERİSİ SALONU (ADNAN WALK) ---
// We create 3 interactive floating digital screens in the new gallery segment
const galleryGroup = new THREE.Group();
galleryGroup.position.set(0, 0, -68); // Centered relative inside roomGroup (absolute Z = -113)
roomGroup.add(galleryGroup);

const galleryFrames = [];
const frameWidth = 4.8;
const frameHeight = 3.0;

const frameGeo = new THREE.BoxGeometry(frameWidth, frameHeight, 0.15);
const frameBorderGeo = new THREE.BoxGeometry(frameWidth + 0.3, frameHeight + 0.3, 0.1);

// Position coordinates relative to galleryGroup
const framePositions = [
  { x: -4.8, y: 0.5, z: -8, rotY: Math.PI / 2.2, side: 'left' },   // Frame 1: Left wall
  { x: 4.8, y: 0.5, z: 0, rotY: -Math.PI / 2.2, side: 'right' },  // Frame 2: Right wall
  { x: -4.8, y: 0.5, z: 8, rotY: Math.PI / 2.2, side: 'left' }    // Frame 3: Left wall
];

framePositions.forEach((pos, idx) => {
  const fGroup = new THREE.Group();
  fGroup.position.set(pos.x, pos.y, pos.z);
  fGroup.rotation.y = pos.rotY;
  
  // Neon border
  const borderMat = new THREE.MeshStandardMaterial({
    color: 0xf13024,
    emissive: 0xf13024,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.8
  });
  const border = new THREE.Mesh(frameBorderGeo, borderMat);
  fGroup.add(border);
  
  // Screen/picture mesh (Placeholder grid)
  const defaultCanvas = document.createElement('canvas');
  defaultCanvas.width = 512;
  defaultCanvas.height = 320;
  const ctx = defaultCanvas.getContext('2d');
  ctx.fillStyle = '#06020d';
  ctx.fillRect(0, 0, 512, 320);
  ctx.strokeStyle = 'rgba(241, 48, 36, 0.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 320);
    ctx.stroke();
  }
  for (let j = 0; j < 320; j += 32) {
    ctx.beginPath();
    ctx.moveTo(0, j);
    ctx.lineTo(512, j);
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ADNAN WALK', 256, 140);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '16px sans-serif';
  ctx.fillText('Medya Bekleniyor...', 256, 175);

  const texture = new THREE.CanvasTexture(defaultCanvas);
  const screenMat = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide
  });
  const screen = new THREE.Mesh(frameGeo, screenMat);
  screen.position.z = 0.05;
  
  // Raycast references
  screen.userData = { isGalleryFrame: true, index: idx, mediaData: null };
  fGroup.add(screen);
  
  galleryGroup.add(fGroup);
  galleryFrames.push({ group: fGroup, screen: screen, texture: texture, defaultCanvas: defaultCanvas, border: border });
});

// Cache for loaded media
let currentMediaList = [];
let activeCategory = 'image';

// Update WebGL gallery textures
const update3DGalleryTextures = (mediaList) => {
  galleryFrames.forEach((frame, idx) => {
    // Filter list for matching item
    const item = mediaList[idx];
    
    // Stop any existing playing videos on this frame
    if (frame.screen.userData.videoEl) {
      try {
        frame.screen.userData.videoEl.pause();
        frame.screen.userData.videoEl.src = '';
        frame.screen.userData.videoEl.load();
      } catch(e){}
      frame.screen.userData.videoEl = null;
    }

    if (item) {
      frame.screen.userData.mediaData = item;
      
      if (item.type === 'image') {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = item.url;
        img.onload = () => {
          const tex = new THREE.Texture(img);
          tex.needsUpdate = true;
          frame.screen.material.map = tex;
          frame.screen.material.needsUpdate = true;
        };
      } else if (item.type === 'video') {
        const video = document.createElement('video');
        video.crossOrigin = "anonymous";
        video.src = item.url;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.setAttribute('webkit-playsinline', 'true');
        
        video.addEventListener('canplaythrough', () => {
          video.play().catch(e => console.log("Video autoplay blocked:", e));
          const tex = new THREE.VideoTexture(video);
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.format = THREE.RGBAFormat;
          frame.screen.material.map = tex;
          frame.screen.material.needsUpdate = true;
        });
        
        frame.screen.userData.videoEl = video;
      }
      
      // Turn border blue for videos, red for images
      frame.border.material.color.setHex(item.type === 'video' ? 0xfbbf5a : 0xf13024);
      frame.border.material.emissive.setHex(item.type === 'video' ? 0xfbbf5a : 0xf13024);
    } else {
      // Revert to placeholder canvas
      frame.screen.userData.mediaData = null;
      frame.screen.material.map = frame.texture;
      frame.screen.material.needsUpdate = true;
      frame.border.material.color.setHex(0xf13024);
      frame.border.material.emissive.setHex(0xf13024);
    }
  });
};

// Admin state variables
window.adnanIsAdmin = false;
window.adminPassword = '';

// Check if admin password is saved in sessionStorage
const cachedPass = sessionStorage.getItem('adnan_walk_pass');
if (cachedPass) {
  window.adnanIsAdmin = true;
  window.adminPassword = cachedPass;
}

// Frontend 2D HTML Gallery logic
const galleryGrid = document.getElementById('gallery-grid');
const tabButtons = document.querySelectorAll('.gallery-tabs .tab-btn');
const uploadImgBtn = document.getElementById('upload-img-btn');
const uploadVidBtn = document.getElementById('upload-vid-btn');
const adminLoginBtn = document.getElementById('admin-login-btn');

// Lightbox components
const lightboxModal = document.getElementById('lightbox-modal');
const lightboxOverlay = document.getElementById('lightbox-overlay');
const lightboxCloseBtn = document.getElementById('lightbox-close-btn');
const lightboxMediaContainer = document.getElementById('lightbox-media-container');
const lightboxTitle = document.getElementById('lightbox-title');
const lightboxDeleteBtn = document.getElementById('lightbox-delete-btn');

// Upload Modal components
const uploadModal = document.getElementById('upload-modal');
const uploadModalOverlay = document.getElementById('upload-modal-overlay');
const uploadModalCloseBtn = document.getElementById('upload-modal-close-btn');
const uploadModalTitle = document.getElementById('upload-modal-title');
const uploadForm = document.getElementById('upload-form');
const uploadFileInput = document.getElementById('upload-file-input');
const selectedFileName = document.getElementById('selected-file-name');
const uploadMediaTitle = document.getElementById('upload-media-title');
const uploadPasswordInput = document.getElementById('upload-password-input');
const uploadProgressWrapper = document.getElementById('upload-progress-wrapper');
const uploadProgressFill = document.getElementById('upload-progress-fill');
const uploadStatusText = document.getElementById('upload-status-text');
const uploadSubmitBtn = document.getElementById('upload-submit-btn');
const fileSelectText = document.getElementById('file-select-text');

let selectedFile = null;
let selectedFileNameRaw = '';
let selectedFileTypeRaw = '';

// Load data from server API
const fetchMedia = async () => {
  try {
    const res = await fetch('/api/media');
    if (!res.ok) throw new Error("Failed to load");
    currentMediaList = await res.json();
    
    // Update WebGL textures with the first 3 items of the overall media list
    update3DGalleryTextures(currentMediaList);
    
    // Render the 2D grid items
    render2DGallery();
  } catch (err) {
    console.error("fetchMedia failed:", err);
  }
};

// ============================================================
// 3D HOVER GALLERY RENDERER (Lightswind ThreeDHoverGallery-style)
// Props: itemWidth, itemHeight, gap, perspective, hoverScale,
//        transitionDuration, backgroundColor, grayscaleStrength,
//        brightnessLevel, activeWidth, rotationAngle, zDepth,
//        enableKeyboardNavigation, autoPlay, autoPlayDelay
// ============================================================
let hg3dActiveIndex = null;
let hg3dAutoPlayTimer = null;
const HG3D_CONFIG = {
  activeWidth: 35,           // vw of active strip
  passiveWidth: 3,           // vw of inactive strip
  rotationAngle: 35,         // degrees for neighbor perspective
  zDepth: 85,                // px depth offset for neighbors
  grayscaleStrength: 1,
  brightnessLevel: 0.5,
  transitionDuration: 1.2,   // seconds
  autoPlay: true,
  autoPlayDelay: 4000,
  enableKeyboardNavigation: true,
};

const render2DGallery = () => {
  // Also keeps gallery-grid in sync (hidden) for deletion logic
  if (galleryGrid) galleryGrid.innerHTML = '';
  
  const container = document.getElementById('hover-gallery-3d');
  const emptyState = document.getElementById('gallery-empty-state');
  if (!container) return;

  // Clear existing strips and controls
  container.querySelectorAll('.hg3d-strip, .hg3d-nav, .hg3d-dots').forEach(el => el.remove());
  
  // Filter current category
  const filtered = currentMediaList.filter(item => item.type === activeCategory);

  if (filtered.length === 0) {
    if (emptyState) emptyState.classList.remove('is-hidden');
    container.classList.remove('has-active');
    // Stop autoplay
    if (hg3dAutoPlayTimer) { clearInterval(hg3dAutoPlayTimer); hg3dAutoPlayTimer = null; }
    return;
  }

  if (emptyState) emptyState.classList.add('is-hidden');
  hg3dActiveIndex = 0;

  // ---- Build strips ----
  const strips = filtered.map((item, idx) => {
    const strip = document.createElement('div');
    strip.className = 'hg3d-strip';
    strip.setAttribute('data-idx', idx);

    // Media element
    if (item.type === 'video') {
      const vid = document.createElement('video');
      vid.src = item.url + '#t=0.5';
      vid.muted = true; vid.loop = true; vid.playsInline = true;
      vid.preload = 'metadata';
      strip.appendChild(vid);
      // Video badge
      const badge = document.createElement('div');
      badge.className = 'hg3d-video-badge';
      badge.textContent = '▶';
      strip.appendChild(badge);
    } else {
      const img = document.createElement('img');
      img.src = item.url;
      img.alt = item.title;
      img.loading = 'lazy';
      strip.appendChild(img);
    }

    // Info overlay
    const info = document.createElement('div');
    info.className = 'hg3d-strip-info';
    info.innerHTML = `
      <h4>${item.title}</h4>
      ${item.location ? `<p>📍 ${item.location}</p>` : ''}
    `;
    strip.appendChild(info);

    // Delete button (admin only)
    const delBtn = document.createElement('button');
    delBtn.className = 'hg3d-delete-btn' + (window.adnanIsAdmin ? ' visible' : '');
    delBtn.title = 'Bu Medyayı Sil';
    delBtn.innerHTML = '🗑️';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteMediaItem(item.id);
    });
    strip.appendChild(delBtn);

    // Click → open lightbox or activate strip
    strip.addEventListener('click', () => {
      if (hg3dActiveIndex === idx) {
        // Already active → open lightbox
        openLightbox(item);
        playRevealSound();
      } else {
        setHG3DActive(idx, strips, container, dots);
        playHoverSound();
      }
    });

    // Hover → play sound hint
    strip.addEventListener('mouseenter', () => {
      if (hg3dActiveIndex !== idx) playHoverSound();
    });

    container.appendChild(strip);
    return strip;
  });

  // ---- Prev/Next navigation arrows ----
  const prevBtn = document.createElement('button');
  prevBtn.className = 'hg3d-nav hg3d-nav-prev';
  prevBtn.innerHTML = '&#8249;';
  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const next = (hg3dActiveIndex - 1 + filtered.length) % filtered.length;
    setHG3DActive(next, strips, container, dots);
    playRevealSound();
  });
  container.appendChild(prevBtn);

  const nextBtn = document.createElement('button');
  nextBtn.className = 'hg3d-nav hg3d-nav-next';
  nextBtn.innerHTML = '&#8250;';
  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const next = (hg3dActiveIndex + 1) % filtered.length;
    setHG3DActive(next, strips, container, dots);
    playRevealSound();
  });
  container.appendChild(nextBtn);

  // ---- Dot indicators ----
  const dotsContainer = document.createElement('div');
  dotsContainer.className = 'hg3d-dots';
  const dots = filtered.map((_, idx) => {
    const dot = document.createElement('div');
    dot.className = 'hg3d-dot';
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      setHG3DActive(idx, strips, container, dots);
      playRevealSound();
    });
    dotsContainer.appendChild(dot);
    return dot;
  });
  container.appendChild(dotsContainer);

  // ---- Keyboard navigation ----
  if (HG3D_CONFIG.enableKeyboardNavigation) {
    // Remove old listener if any, then add new
    container._keyHandler && document.removeEventListener('keydown', container._keyHandler);
    container._keyHandler = (e) => {
      if (e.key === 'ArrowLeft') {
        const next = (hg3dActiveIndex - 1 + filtered.length) % filtered.length;
        setHG3DActive(next, strips, container, dots);
        playRevealSound();
      } else if (e.key === 'ArrowRight') {
        const next = (hg3dActiveIndex + 1) % filtered.length;
        setHG3DActive(next, strips, container, dots);
        playRevealSound();
      }
    };
    document.addEventListener('keydown', container._keyHandler);
  }

  // ---- Touch swipe support ----
  let touchStartX = 0;
  container.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  container.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) {
      const next = dx < 0
        ? (hg3dActiveIndex + 1) % filtered.length
        : (hg3dActiveIndex - 1 + filtered.length) % filtered.length;
      setHG3DActive(next, strips, container, dots);
      playRevealSound();
    }
  }, { passive: true });

  // ---- AutoPlay ----
  if (hg3dAutoPlayTimer) clearInterval(hg3dAutoPlayTimer);
  if (HG3D_CONFIG.autoPlay && filtered.length > 1) {
    hg3dAutoPlayTimer = setInterval(() => {
      const next = (hg3dActiveIndex + 1) % filtered.length;
      setHG3DActive(next, strips, container, dots);
    }, HG3D_CONFIG.autoPlayDelay);

    // Pause on user interaction
    container.addEventListener('mouseenter', () => clearInterval(hg3dAutoPlayTimer), { once: false });
    container.addEventListener('mouseleave', () => {
      hg3dAutoPlayTimer = setInterval(() => {
        const next = (hg3dActiveIndex + 1) % filtered.length;
        setHG3DActive(next, strips, container, dots);
      }, HG3D_CONFIG.autoPlayDelay);
    });
  }

  // Activate first strip immediately
  setHG3DActive(0, strips, container, dots);
};

// Apply active/neighbor/passive transforms to all strips
const setHG3DActive = (idx, strips, container, dots) => {
  hg3dActiveIndex = idx;
  container.classList.add('has-active');

  strips.forEach((strip, i) => {
    strip.classList.remove('active', 'neighbor-l', 'neighbor-r');
    strip.style.flex = `${HG3D_CONFIG.passiveWidth}vw`;

    if (i === idx) {
      strip.classList.add('active');
      strip.style.flex = `${HG3D_CONFIG.activeWidth}vw`;
      strip.style.transform = `perspective(3500px) rotateY(0deg) translateZ(0px)`;
      strip.style.filter = 'grayscale(0) brightness(1)';
      strip.style.zIndex = '2';
      // Play video if applicable
      const vid = strip.querySelector('video');
      if (vid) { vid.currentTime = 0; vid.play().catch(() => {}); }
    } else if (i === idx - 1) {
      strip.classList.add('neighbor-l');
      strip.style.transform = `perspective(3500px) rotateY(${HG3D_CONFIG.rotationAngle}deg) translateZ(-${HG3D_CONFIG.zDepth}px)`;
      strip.style.filter = `grayscale(0.8) brightness(0.6)`;
      strip.style.flex = `${HG3D_CONFIG.passiveWidth + 2}vw`;
      strip.style.zIndex = '1';
      const vid = strip.querySelector('video'); if (vid) vid.pause();
    } else if (i === idx + 1) {
      strip.classList.add('neighbor-r');
      strip.style.transform = `perspective(3500px) rotateY(-${HG3D_CONFIG.rotationAngle}deg) translateZ(-${HG3D_CONFIG.zDepth}px)`;
      strip.style.filter = `grayscale(0.8) brightness(0.6)`;
      strip.style.flex = `${HG3D_CONFIG.passiveWidth + 2}vw`;
      strip.style.zIndex = '1';
      const vid = strip.querySelector('video'); if (vid) vid.pause();
    } else {
      strip.style.transform = 'none';
      strip.style.filter = `grayscale(${HG3D_CONFIG.grayscaleStrength}) brightness(${HG3D_CONFIG.brightnessLevel})`;
      strip.style.zIndex = '0';
      const vid = strip.querySelector('video'); if (vid) vid.pause();
    }
  });

  // Update dot indicators
  if (dots) {
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === idx);
    });
  }
};


// Lightbox modal actions
const openLightbox = (item) => {
  if (!lightboxModal) return;
  lightboxMediaContainer.innerHTML = '';
  lightboxTitle.textContent = item.title;
  
  const lightboxLocation = document.getElementById('lightbox-location');
  const lightboxDesc = document.getElementById('lightbox-desc');
  
  if (lightboxLocation) {
    if (item.location) {
      lightboxLocation.textContent = `📍 ${item.location}`;
      lightboxLocation.style.display = 'block';
    } else {
      lightboxLocation.style.display = 'none';
    }
  }
  
  if (lightboxDesc) {
    if (item.description) {
      lightboxDesc.textContent = item.description;
      lightboxDesc.style.display = 'block';
    } else {
      lightboxDesc.style.display = 'none';
    }
  }
  
  // Show lightbox delete button only if adminIsAdmin is true
  if (lightboxDeleteBtn) {
    if (window.adnanIsAdmin) {
      lightboxDeleteBtn.style.display = 'block';
      
      // Clone to remove previous click listeners cleanly
      const newDeleteBtn = lightboxDeleteBtn.cloneNode(true);
      lightboxDeleteBtn.parentNode.replaceChild(newDeleteBtn, lightboxDeleteBtn);
      
      // Select the new node for closure
      newDeleteBtn.addEventListener('click', () => {
        closeLightbox();
        deleteMediaItem(item.id);
      });
    } else {
      lightboxDeleteBtn.style.display = 'none';
    }
  }
  
  if (item.type === 'video') {
    const video = document.createElement('video');
    video.src = item.url;
    video.controls = true;
    video.autoplay = true;
    video.style.maxWidth = '100%';
    video.style.maxHeight = '70vh';
    lightboxMediaContainer.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src = item.url;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '70vh';
    lightboxMediaContainer.appendChild(img);
  }
  
  lightboxModal.style.display = 'flex';
  lightboxModal.offsetHeight;
  lightboxModal.classList.add('active');
  document.body.style.overflow = 'hidden';
};

const closeLightbox = () => {
  if (!lightboxModal) return;
  lightboxModal.classList.remove('active');
  setTimeout(() => {
    lightboxModal.style.display = 'none';
    lightboxMediaContainer.innerHTML = '';
    document.body.style.overflow = '';
  }, 500);
};

// Handle upload trigger modal opening
const openUploadModal = (type) => {
  if (!uploadModal) return;
  
  const uploadMediaLocation = document.getElementById('upload-media-location');
  
  // Configure input file type
  uploadFileInput.setAttribute('accept', type === 'video' ? 'video/*' : 'image/*');
  uploadModalTitle.textContent = type === 'video' ? 'Video Gönder' : 'Fotoğraf Gönder';
  fileSelectText.textContent = type === 'video' ? '📁 Video Dosyası Seç' : '📁 Fotoğraf Dosyası Seç';
  
  // Clear previous state
  uploadForm.reset();
  selectedFileName.textContent = 'Dosya seçilmedi';
  selectedFile = null;
  uploadProgressWrapper.style.display = 'none';
  uploadSubmitBtn.disabled = false;
  
  if (uploadMediaLocation) {
    uploadMediaLocation.value = '';
    uploadMediaLocation.placeholder = '📍 Konum alınıyor...';
    
    // Try Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        try {
          // Query Nominatim reverse geocoding API (using free osm Nominatim service)
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
          if (response.ok) {
            const geoData = await response.json();
            const addr = geoData.address;
            const townOrCity = addr.city || addr.town || addr.village || addr.suburb || '';
            const neighborhood = addr.suburb || addr.neighbourhood || '';
            
            let finalLoc = '';
            if (neighborhood && townOrCity) {
              finalLoc = `${neighborhood}, ${townOrCity}`;
            } else {
              finalLoc = townOrCity || geoData.display_name.split(',')[0] || '';
            }
            
            if (finalLoc) {
              uploadMediaLocation.value = finalLoc;
            } else {
              uploadMediaLocation.value = `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`;
            }
          } else {
            uploadMediaLocation.value = `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`;
          }
        } catch(err) {
          uploadMediaLocation.value = `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`;
        }
      }, (error) => {
        console.log("Geolocation error:", error);
        uploadMediaLocation.placeholder = '📍 Konum giriniz (İsteğe bağlı)';
      }, { timeout: 8000 });
    } else {
      uploadMediaLocation.placeholder = '📍 Konum giriniz (İsteğe bağlı)';
    }
  }
  
  uploadModal.style.display = 'flex';
  uploadModal.offsetHeight;
  uploadModal.classList.add('active');
  document.body.style.overflow = 'hidden';
};

const closeUploadModal = () => {
  if (!uploadModal) return;
  uploadModal.classList.remove('active');
  // Reset image preview label
  const labelEl = document.getElementById('file-label-text');
  if (labelEl) {
    labelEl.style.backgroundImage = 'none';
    labelEl.style.minHeight = '';
    const textSpan = labelEl.querySelector('#file-select-text');
    if (textSpan) {
      textSpan.style.background = '';
      textSpan.style.padding = '';
      textSpan.style.borderRadius = '';
      textSpan.textContent = '📁 Medya Dosyası Seç';
    }
  }
  setTimeout(() => {
    uploadModal.style.display = 'none';
    document.body.style.overflow = '';
  }, 500);
};

// Wire up navbar clicks to trigger tab switches automatically when navigating to #adnan-walk
window.addEventListener('hashchange', () => {
  if (window.location.hash === '#adnan-walk') {
    fetchMedia();
  }
});

// Wire up events for Gallery Tabs
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    activeCategory = btn.getAttribute('data-tab');
    
    // Switch action buttons
    if (activeCategory === 'video') {
      uploadImgBtn.style.display = 'none';
      uploadVidBtn.style.display = 'block';
    } else {
      uploadImgBtn.style.display = 'block';
      uploadVidBtn.style.display = 'none';
    }
    
    render2DGallery();
  });
});

// Open modals trigger buttons
if (uploadImgBtn) uploadImgBtn.addEventListener('click', () => openUploadModal('image'));
if (uploadVidBtn) uploadVidBtn.addEventListener('click', () => openUploadModal('video'));

// Close modal click handlers
if (uploadModalCloseBtn) uploadModalCloseBtn.addEventListener('click', closeUploadModal);
if (uploadModalOverlay) uploadModalOverlay.addEventListener('click', closeUploadModal);

if (lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeLightbox);
if (lightboxOverlay) lightboxOverlay.addEventListener('click', closeLightbox);

// Handle file loading inside modal
if (uploadFileInput) {
  uploadFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      // Files now go straight to Cloudinary, so the old 3.2MB ceiling (which
      // existed only because the payload had to fit inside a serverless request)
      // is gone. This limit is Cloudinary's own free tier video ceiling.
      const maxSizeBytes = 100 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        showToast(`📛 Dosya çok büyük! (${(file.size / (1024 * 1024)).toFixed(1)} MB) — Max 100MB olmalıdır.`, 'error', 5000);
        uploadFileInput.value = '';
        selectedFileName.textContent = 'Dosya seçilmedi';
        selectedFile = null;
        return;
      }

      selectedFile = file;
      selectedFileNameRaw = file.name;
      selectedFileTypeRaw = file.type;
      selectedFileName.textContent = file.name;

      // Show image thumbnail preview inside the label
      if (file.type.startsWith('image/')) {
        const previewUrl = URL.createObjectURL(file);
        const labelEl = document.getElementById('file-label-text');
        if (labelEl) {
          labelEl.style.backgroundImage = `url(${previewUrl})`;
          labelEl.style.backgroundSize = 'cover';
          labelEl.style.backgroundPosition = 'center';
          labelEl.style.minHeight = '110px';
          const textSpan = labelEl.querySelector('#file-select-text');
          if (textSpan) {
            textSpan.style.background = 'rgba(0,0,0,0.65)';
            textSpan.style.borderRadius = '8px';
            textSpan.style.padding = '4px 12px';
            textSpan.textContent = '✅ ' + file.name;
          }
        }
      } else {
        const textSpan = document.getElementById('file-select-text');
        if (textSpan) textSpan.textContent = '🎬 ' + file.name;
      }

      // Play a subtle sparkle reveal sound
      playRevealSound();
    }
  });
}

// Shrink oversized photos in the browser before they leave the device. A modern
// phone photo is 12MP and several megabytes; nothing in this gallery is shown
// larger than about 1300px, so the extra pixels cost upload time and nothing else.
// Videos are passed through untouched: re-encoding them here is not feasible.
const MAX_IMAGE_EDGE = 2560;
const IMAGE_COMPRESS_THRESHOLD = 1.5 * 1024 * 1024;

// Some Android file pickers hand over a File with an empty `type`, and iOS
// reports .mov as video/quicktime. Falling back to the extension keeps a video
// from being sent to Cloudinary's image endpoint, which would reject it.
const VIDEO_EXTENSIONS = /\.(mp4|mov|m4v|webm|avi|mkv|3gp|hevc|qt)$/i;

const isVideoFile = (file) => {
  if (file.type) return file.type.startsWith('video/');
  return VIDEO_EXTENSIONS.test(file.name || '');
};

const compressImage = (file) => new Promise((resolve) => {
  if (!file.type.startsWith('image/') || file.size <= IMAGE_COMPRESS_THRESHOLD) {
    resolve(file);
    return;
  }

  // GIFs lose their animation when redrawn onto a canvas
  if (file.type === 'image/gif') {
    resolve(file);
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  const img = new Image();

  img.onload = () => {
    URL.revokeObjectURL(objectUrl);

    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      // Keep the original if the round trip did not actually help
      if (!blob || blob.size >= file.size) {
        resolve(file);
        return;
      }
      resolve(new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now()
      }));
    }, 'image/jpeg', 0.85);
  };

  img.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    resolve(file);
  };

  img.src = objectUrl;
});

// Send the file straight to Cloudinary using a signature minted by /api/sign.
// Uses XHR rather than fetch because only XHR reports upload progress.
const uploadToCloudinary = (file, signature, onProgress) => new Promise((resolve, reject) => {
  const resourceType = isVideoFile(file) ? 'video' : 'image';
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', signature.apiKey);
  form.append('timestamp', signature.timestamp);
  form.append('signature', signature.signature);
  form.append('folder', signature.folder);

  const xhr = new XMLHttpRequest();
  xhr.open('POST', `https://api.cloudinary.com/v1_1/${signature.cloudName}/${resourceType}/upload`);

  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) onProgress(e.loaded / e.total);
  });

  xhr.onload = () => {
    let data = {};
    try {
      data = JSON.parse(xhr.responseText);
    } catch (err) {
      reject(new Error('Medya sunucusundan beklenmeyen yanıt geldi.'));
      return;
    }
    if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
      resolve(data);
    } else {
      reject(new Error((data.error && data.error.message) || 'Dosya medya sunucusuna yüklenemedi.'));
    }
  };

  xhr.onerror = () => reject(new Error('Medya sunucusuna bağlanılamadı. İnternet bağlantını kontrol et.'));
  xhr.ontimeout = () => reject(new Error('Yükleme zaman aşımına uğradı.'));

  xhr.send(form);
});

// Handle upload submit action — called by the secret password overlay
// This is exposed on window so the inline script in index.html can call it
window._doActualUpload = async (pass) => {
  if (!selectedFile) {
    throw new Error('Lütfen yüklenecek bir dosya seçin.');
  }

  const uploadMediaLocation = document.getElementById('upload-media-location');
  const uploadMediaDescription = document.getElementById('upload-media-description');

  // Show progress in the background upload modal
  uploadProgressWrapper.style.display = 'block';
  uploadProgressFill.style.width = '5%';
  uploadStatusText.textContent = 'Doğrulanıyor...';

  try {
    // 1. Ask the server for a signature. This also verifies the password before
    //    a single byte of the file is sent anywhere.
    const signResponse = await fetch('/api/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass })
    });

    const signData = await signResponse.json().catch(() => ({}));

    if (signResponse.status === 401) {
      uploadProgressWrapper.style.display = 'none';
      throw new Error('Yanlış şifre!');
    }
    if (!signResponse.ok) {
      uploadProgressWrapper.style.display = 'none';
      throw new Error(signData.error || 'Yükleme hazırlanamadı.');
    }

    // 2. Shrink the photo, then send it straight to Cloudinary
    uploadStatusText.textContent = 'Dosya hazırlanıyor...';
    const fileToUpload = await compressImage(selectedFile);

    uploadStatusText.textContent = 'Yükleniyor...';
    const cloudinaryResult = await uploadToCloudinary(fileToUpload, signData, (ratio) => {
      // Reserve the last 10% for writing the database row
      uploadProgressFill.style.width = `${Math.round(10 + ratio * 80)}%`;
      uploadStatusText.textContent = `Yükleniyor... %${Math.round(ratio * 100)}`;
    });

    // 3. Record only the resulting URL on the server
    uploadProgressFill.style.width = '92%';
    uploadStatusText.textContent = 'Galeriye kaydediliyor...';

    const payload = {
      password: pass,
      secureUrl: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      fileName: selectedFileNameRaw,
      // Normalised so the server files it under the right tab even when the
      // picker gave us no MIME type at all
      fileType: isVideoFile(selectedFile) ? (selectedFileTypeRaw || 'video/mp4') : (selectedFileTypeRaw || 'image/jpeg'),
      title: uploadMediaTitle.value || selectedFileNameRaw,
      location: uploadMediaLocation ? uploadMediaLocation.value : '',
      description: uploadMediaDescription ? uploadMediaDescription.value : ''
    };

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // Safe parsing to prevent WebKit crash on 413 HTML pages
    let resData = {};
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.indexOf('application/json') !== -1) {
      resData = await response.json();
    } else {
      const text = await response.text();
      resData = { error: text || `HTTP ${response.status} Hatası` };
    }

    if (response.status === 413) {
      uploadProgressWrapper.style.display = 'none';
      throw new Error('Dosya boyutu sunucu limitini aştı (Maksimum 4.5MB). Lütfen resmi sıkıştırıp tekrar deneyin.');
    }

    if (response.status === 401) {
      uploadProgressWrapper.style.display = 'none';
      throw new Error('Yanlış şifre!');
    }

    if (!response.ok) {
      uploadProgressWrapper.style.display = 'none';
      throw new Error(resData.error || 'Yükleme başarısız oldu.');
    }

    uploadProgressFill.style.width = '100%';
    uploadStatusText.textContent = '✅ Yükleme başarılı!';

    // Auth user as admin on successful upload
    window.adnanIsAdmin = true;
    window.adminPassword = pass;
    sessionStorage.setItem('adnan_walk_pass', pass);

    setTimeout(() => {
      // Close both overlays
      closeUploadModal();
      if (window.closeSecretPasswordOverlay) window.closeSecretPasswordOverlay();

      // 🎊 Konfeti patla!
      if (window.launchConfetti) window.launchConfetti();

      // Güzel bildirim (alert yerine)
      showToast('🎉 Harika! Medyan başarıyla yüklendi!', 'success');

      fetchMedia(); // Refresh gallery
    }, 500);

  } catch(err) {
    uploadProgressWrapper.style.display = 'none';
    uploadProgressFill.style.width = '0%';
    throw err; // Re-throw to secret overlay error handler
  }
};

// Legacy form submit support (in case form fires naturally)
if (uploadForm) {
  uploadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (window.openSecretPasswordOverlay) window.openSecretPasswordOverlay();
  });
}


// Handle Admin Login button click (hidden button, triggered by easter egg)
if (adminLoginBtn) {
  adminLoginBtn.addEventListener('click', async () => {
    const pass = prompt('🔐 Yönetici şifresini girin:');
    if (!pass) return;
    
    try {
      const response = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass, id: 'auth_check' })
      });
      
      if (response.status === 401) {
        showToast('❌ Yanlış yönetici şifresi!', 'error');
        return;
      }
      
      // Credentials correct!
      window.adnanIsAdmin = true;
      window.adminPassword = pass;
      sessionStorage.setItem('adnan_walk_pass', pass);
      showToast('🔓 Yönetici girişi başarılı! Silme özellikleri aktif.', 'success');
      render2DGallery();
    } catch (err) {
      console.error(err);
      showToast('❌ Sunucuya bağlanılamadı!', 'error');
    }
  });
}

// Delete Media Item securely
const deleteMediaItem = async (id) => {
  if (!confirm("Bu medyayı galeriden kalıcı olarak silmek istediğinize emin misiniz?")) return;
  
  try {
    const response = await fetch('/api/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        password: window.adminPassword,
        id: id
      })
    });
    
    const resData = await response.json();
    if (!response.ok) {
      throw new Error(resData.error || 'Deletion failed');
    }
    
    showToast('🗑️ Medya başarıyla silindi!', 'success');
    fetchMedia(); // Reload gallery
  } catch (err) {
    console.error(err);
    showToast('❌ Hata: ' + err.message, 'error');
  }
};

// Initial media list download
fetchMedia();

// 3D Raycasting interactive hover and clicks for Gallery Frames
window.addEventListener('click', () => {
  if (isModalOpen || isTransitioning) return;
  
  raycaster.setFromCamera(mouse, camera);
  const frameMeshes = galleryFrames.map(f => f.screen);
  const intersects = raycaster.intersectObjects(frameMeshes);
  
  if (intersects.length > 0) {
    const hitObj = intersects[0].object;
    if (hitObj.userData && hitObj.userData.isGalleryFrame && hitObj.userData.mediaData) {
      openLightbox(hitObj.userData.mediaData);
    }
  }
});

// Panel video layer — shown when Hyperion (idx 0) card is clicked
const panelVideoLayer = document.getElementById('panel-video-layer');
const panelVideoEl    = document.getElementById('panel-video-el');

const openPanelVideo = () => {
  if (!panelVideoLayer) return;
  panelVideoLayer.style.display = 'flex';
  if (panelVideoEl) {
    panelVideoEl.currentTime = 0;
    panelVideoEl.play().catch(() => {});
  }
};

window.closePanelVideo = () => {
  if (!panelVideoLayer) return;
  panelVideoLayer.style.display = 'none';
  if (panelVideoEl) panelVideoEl.pause();
};

// Play/pause on click (no fullscreen)
if (panelVideoEl) {
  panelVideoEl.addEventListener('click', () => {
    if (panelVideoEl.paused) panelVideoEl.play().catch(() => {});
    else panelVideoEl.pause();
  });
}

// ===== CHAOS PANEL ENGINE =====
const panelChaosLayer = document.getElementById('panel-chaos-layer');
const chaosContainer  = document.getElementById('chaos-container');
let chaosTimerId      = null;

const CHAOS_ICONS = [
  '👾', '🤖', '⚡', '🌀', '🌌', '🧬', '📡', '🖥️', '⚙️', '🧪', '☣️', '🔌', '💥', '🛸', '🚀',
  '[]', '{}', '&&', '||', '!=', '=>', 'NaN', 'ERR', '0101', 'GLSL', 'GPU', 'NEXUS'
];
const CHAOS_ANIM_CLASSES = ['chaos-flash-el', 'chaos-bounce-el', 'chaos-glitch-el', 'chaos-rotate-el'];

const openPanelChaos = () => {
  if (!panelChaosLayer || !chaosContainer) return;
  panelChaosLayer.style.display = 'flex';
  chaosContainer.innerHTML = '';
  playRevealSound();

  // Create 18 chaotic elements
  const elements = [];
  for (let i = 0; i < 18; i++) {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.left = `${Math.random() * 80}%`;
    el.style.top = `${Math.random() * 80}%`;
    el.style.fontSize = `${Math.random() * 20 + 20}px`;
    el.style.color = Math.random() > 0.5 ? '#f13024' : '#fbbf5a';
    el.style.textShadow = `0 0 10px ${Math.random() > 0.5 ? '#f13024' : '#fbbf5a'}`;
    el.style.transition = 'left 0.4s cubic-bezier(0.25, 1, 0.5, 1), top 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
    el.textContent = CHAOS_ICONS[Math.floor(Math.random() * CHAOS_ICONS.length)];
    
    // Add random animations
    const classesToAdd = [CHAOS_ANIM_CLASSES[Math.floor(Math.random() * CHAOS_ANIM_CLASSES.length)]];
    if (Math.random() > 0.6) classesToAdd.push(CHAOS_ANIM_CLASSES[Math.floor(Math.random() * CHAOS_ANIM_CLASSES.length)]);
    el.className = classesToAdd.join(' ');

    chaosContainer.appendChild(el);
    elements.push(el);
  }

  // Chaos ticks
  if (chaosTimerId) clearInterval(chaosTimerId);
  chaosTimerId = setInterval(() => {
    // 1. Teleport/jump 2 random elements to new places
    for (let j = 0; j < 2; j++) {
      const idx = Math.floor(Math.random() * elements.length);
      const el = elements[idx];
      if (el) {
        el.style.left = `${Math.random() * 85}%`;
        el.style.top = `${Math.random() * 85}%`;
        if (Math.random() > 0.7) {
          el.style.color = Math.random() > 0.5 ? '#fbbf5a' : '#48c78e';
          el.style.fontSize = `${Math.random() * 20 + 20}px`;
        }
      }
    }

    // 2. Change content of 1 random element
    const changeIdx = Math.floor(Math.random() * elements.length);
    if (elements[changeIdx]) {
      elements[changeIdx].textContent = CHAOS_ICONS[Math.floor(Math.random() * CHAOS_ICONS.length)];
    }

    // 3. Occasional audio glitch click
    if (Math.random() > 0.85) playHoverSound();
  }, 350);
};

window.closePanelChaos = () => {
  if (chaosTimerId) { clearInterval(chaosTimerId); chaosTimerId = null; }
  if (panelChaosLayer) panelChaosLayer.style.display = 'none';
};

// ===== AI PANEL ENGINE =====
const panelAILayer = document.getElementById('panel-ai-layer');
const aiContainer  = document.getElementById('ai-container');
let aiTimerId      = null;

// Cycled through the three brand colours rather than each service's own brand,
// so the rain stays inside the site's palette
const AI_LIST = [
  { name: 'CLAUDE.AI', url: 'claude.ai', color: '#fbbf5a' },
  { name: 'CHATGPT.COM', url: 'chatgpt.com', color: '#f97316' },
  { name: 'GEMINI.GOOGLE.COM', url: 'gemini.google', color: '#f13024' },
  { name: 'DEEPSEEK.COM', url: 'deepseek.com', color: '#fbbf5a' },
  { name: 'LLAMA.META.COM', url: 'llama.meta', color: '#f97316' },
  { name: 'MIDJOURNEY.COM', url: 'midjourney.com', color: '#f13024' },
  { name: 'V0.DEV', url: 'v0.dev', color: '#fbbf5a' },
  { name: 'BOLT.NEW', url: 'bolt.new', color: '#f97316' }
];

const openPanelAI = () => {
  if (!panelAILayer || !aiContainer) return;
  panelAILayer.style.display = 'flex';
  aiContainer.innerHTML = '';
  playRevealSound();

  // 1. Add horizontal scrolling neon marquees (marquees scroll across the panel)
  const rows = [15, 38, 62, 80];
  rows.forEach((topPercent, index) => {
    const marquee = document.createElement('div');
    marquee.className = 'ai-marquee-el';
    marquee.style.top = `${topPercent}%`;
    
    // Alt-direction scrolling for a more chaotic matrix look
    const goLeft = index % 2 === 0;
    marquee.style.animation = `${goLeft ? 'aiMarqueeLeft' : 'aiMarqueeRight'} ${index * 3 + 8}s infinite linear`;
    
    const aiItem = AI_LIST[index % AI_LIST.length];
    marquee.style.color = aiItem.color;
    // Repeat content to make marquee loop seamlessly
    marquee.textContent = ` <<  ${aiItem.name} [${aiItem.url}]  >> `.repeat(4);
    aiContainer.appendChild(marquee);
  });

  // 2. Add vertical Matrix rain drops of AI URLs
  const columnsCount = 12;
  const spawnedColumns = [];
  for (let c = 0; c < columnsCount; c++) {
    const drop = document.createElement('div');
    drop.className = 'ai-rain-el';
    drop.style.left = `${(c / columnsCount) * 85 + 5}%`;
    drop.style.animationDelay = `${Math.random() * 4}s`;
    drop.style.animationDuration = `${Math.random() * 3 + 3.5}s`;
    
    const aiItem = AI_LIST[Math.floor(Math.random() * AI_LIST.length)];
    drop.style.color = '#f97316'; // Matrix Green
    drop.style.textShadow = '0 0 8px #f97316';
    drop.style.fontSize = `${Math.random() * 0.25 + 0.65}rem`;
    
    // Construct vertical word column
    drop.textContent = aiItem.url.toUpperCase().split('').join('\n');
    aiContainer.appendChild(drop);
    spawnedColumns.push({ drop, item: aiItem });
  }

  // 3. AI digital noise interval
  if (aiTimerId) clearInterval(aiTimerId);
  aiTimerId = setInterval(() => {
    // Randomly flash color / text in rain drops to look like decoding
    if (Math.random() > 0.5) {
      const idx = Math.floor(Math.random() * spawnedColumns.length);
      const col = spawnedColumns[idx];
      if (col && col.drop) {
        col.drop.style.color = Math.random() > 0.7 ? '#ffffff' : '#f97316';
        if (Math.random() > 0.8) {
          const nextItem = AI_LIST[Math.floor(Math.random() * AI_LIST.length)];
          col.drop.textContent = nextItem.url.toUpperCase().split('').join('\n');
        }
      }
    }
    if (Math.random() > 0.9) playHoverSound();
  }, 250);
};

window.closePanelAI = () => {
  if (aiTimerId) { clearInterval(aiTimerId); aiTimerId = null; }
  if (panelAILayer) panelAILayer.style.display = 'none';
};

// Toggle projects panel layers (video, chaos or AI) based on card clicks
const handleProjectsPanelShift = (item, idx) => {
  const projectsPanel = document.getElementById('projects-detail-panel');
  if (!projectsPanel) return;

  // Keep panel in its desktop position, CSS handles the overlay placement behind cards on mobile
  if (projectsPanel.parentNode !== originalProjectsPanelParent) {
    if (originalProjectsPanelParent) {
      originalProjectsPanelParent.insertBefore(projectsPanel, originalProjectsPanelNextSibling);
    }
  }
  projectsPanel.style.display = 'flex';

  htmlProjItems.forEach(c => c.classList.remove('active'));
  item.classList.add('active');

  // On desktop, smoothly slide the panel vertically to match the active card.
  // The panel is position:relative there and also carries a CSS 3D transform, so `top`
  // is not an absolute coordinate: measure the rendered offset and move by the delta.
  const parentEl = originalProjectsPanelParent || projectsPanel.parentNode;
  if (window.innerWidth < 768) {
    // Mobile uses a horizontal swipe deck with the panel as a normal in-flow media
    // stage below it, so no vertical repositioning is needed. Clear any desktop offset.
    gsap.killTweensOf(projectsPanel);
    projectsPanel.style.top = '';
  } else if (parentEl) {
    const parentRect = parentEl.getBoundingClientRect();
    const panelRect = projectsPanel.getBoundingClientRect();
    const cardRect = item.getBoundingClientRect();
    const currentTop = parseFloat(gsap.getProperty(projectsPanel, 'top')) || 0;

    // Line up the centers so the tall panel brackets the card.
    const delta = (cardRect.top + cardRect.height / 2) - (panelRect.top + panelRect.height / 2);

    // Keep the panel inside the section column so it never drops below the content.
    const minTop = currentTop + (parentRect.top - panelRect.top);
    const maxTop = currentTop + (parentRect.bottom - panelRect.bottom);
    let targetTop = currentTop + delta;
    targetTop = maxTop < minTop ? minTop : Math.min(Math.max(targetTop, minTop), maxTop);

    gsap.to(projectsPanel, {
      top: `${targetTop}px`,
      duration: 0.75,
      ease: 'power2.out',
      overwrite: 'auto'
    });
  }

  // Trigger glitch flash animation
  projectsPanel.classList.remove('update-glitch');
  projectsPanel.offsetHeight; // reflow
  projectsPanel.classList.add('update-glitch');

  // Trigger contents based on card clicked
  if (idx === 0) {
    window.closePanelChaos();
    window.closePanelAI();
    openPanelVideo();
  } else if (idx === 1) {
    window.closePanelVideo();
    window.closePanelAI();
    openPanelChaos();
  } else if (idx === 2) {
    window.closePanelVideo();
    window.closePanelChaos();
    openPanelAI();
  } else {
    window.closePanelVideo();
    window.closePanelChaos();
    window.closePanelAI();
  }
};

// Wire up events
htmlProjItems.forEach(item => {
  const link = item.querySelector('.project-link');
  const idx = parseInt(item.getAttribute('data-index'));

  if (link) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Link (İNCELE button) always opens full-detail sliding sidebar modal
      openProjectDetails(idx);
    });
  }

  // Clicking the card body behaves as toggle/accordion/inline-details
  item.addEventListener('click', () => {
    handleProjectsPanelShift(item, idx);
  });
});

// --- Mobile horizontal swipe deck ---
// Below 768px the project list becomes a scroll-snap carousel and the detail panel
// sits underneath it as a media stage. Swiping to a card activates its media.
const projectDeck = document.querySelector('.project-list');

const activateCardNearestDeckCenter = () => {
  if (!projectDeck || window.innerWidth >= 768) return;

  const deckRect = projectDeck.getBoundingClientRect();
  const deckCenter = deckRect.left + deckRect.width / 2;

  let closest = null;
  let closestDistance = Infinity;
  htmlProjItems.forEach(card => {
    const rect = card.getBoundingClientRect();
    const distance = Math.abs(rect.left + rect.width / 2 - deckCenter);
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = card;
    }
  });

  if (closest && !closest.classList.contains('active')) {
    handleProjectsPanelShift(closest, parseInt(closest.getAttribute('data-index')));
  }
};

if (projectDeck) {
  let deckSettleTimer = null;
  projectDeck.addEventListener('scroll', () => {
    clearTimeout(deckSettleTimer);
    deckSettleTimer = setTimeout(activateCardNearestDeckCenter, 110);
  }, { passive: true });

  // Prime the media stage with the first card so it is never blank on mobile
  if (window.innerWidth < 768 && htmlProjItems.length) {
    handleProjectsPanelShift(htmlProjItems[0], 0);
  }
}


modalOverlay.addEventListener('click', closeProjectDetails);
modalCloseBtn.addEventListener('click', closeProjectDetails);


// --- 5C. 3D SKILLS DISPLAY MONOLITH (REPLACED WITH STABLE HTML PERSPECTIVE HUD) ---
// We use a beautiful CSS 3D transformed glass panel on the left of the section,
// which is 100% stable, sharp, and bulletproof across all browsers.

// Connect click listener for the 4 skills cards
const skillCards = document.querySelectorAll('.skill-card');
const skillDataList = [
  {
    title: "Three.js / WebGL",
    desc: "Özel vertex/fragment shader gölgelendiricileri yazma, GPU tabanlı parçacık sistemleri oluşturma, 3D koordinat projeksiyonları ve vektör-matris dönüşümleri ile tarayıcı sınırlarını zorlayan gerçek zamanlı sahneler tasarlama."
  },
  {
    title: "GSAP Animasyon",
    desc: "Karmaşık zaman tüneli (timeline) senkronizasyonları, pürüzsüz kaydırma interpolasyonları ve performansı optimize edilmiş duyarlı scroll tetikleyicilerle akıcı web animasyonları oluşturma."
  },
  {
    title: "Full-Stack Geliştirme",
    desc: "Node.js, Express ve Next.js tabanlı yüksek hızlı API servisleri oluşturma. Gerçek zamanlı WebSocket veri akışları ve ilişkisel/ilişkisel olmayan veritabanı senkronizasyonları ile kararlı altyapılar kurma."
  },
  {
    title: "Performans Ayarları",
    desc: "Gölgelendirici (shader) kodlarını sadeleştirme, GPU çizim çağrılarını (draw calls) azaltma, varlık sıkıştırma ve optimizasyon algoritmaları ile her cihazda sabit 60 FPS akıcılık sağlama."
  }
];

const skillsPanel = document.getElementById('skills-detail-panel');
const skillsPanelTitle = document.getElementById('skills-panel-title');
const skillsPanelDesc = document.getElementById('skills-panel-desc');

skillCards.forEach((card, idx) => {
  card.style.cursor = 'pointer';
  card.addEventListener('click', () => {
    console.log("Skill card clicked:", idx);
    
    const isMobile = window.innerWidth < 768;
    const isAlreadyActive = card.classList.contains('active');
    
    // Play the swoosh reveal sound (triggers on every click)
    playRevealSound();
    
    if (isMobile) {
      if (isAlreadyActive) {
        // Toggle close accordion
        card.classList.remove('active');
        if (skillsPanel) {
          skillsPanel.style.display = 'none';
          // Move back to original parent to keep DOM structure clean
          if (originalSkillsPanelParent) {
            originalSkillsPanelParent.insertBefore(skillsPanel, originalSkillsPanelNextSibling);
          }
        }
      } else {
        // Open accordion
        skillCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        
        // Update content
        const data = skillDataList[idx];
        if (data && skillsPanelTitle && skillsPanelDesc) {
          skillsPanelTitle.textContent = data.title;
          skillsPanelDesc.textContent = data.desc;
        }
        
        // Move the panel inside the clicked card in the DOM
        if (skillsPanel) {
          skillsPanel.style.display = 'block';
          card.appendChild(skillsPanel); // Append under card text
          
          // Trigger neon glitch flash effect
          skillsPanel.classList.remove('update-glitch');
          skillsPanel.offsetHeight; // Force reflow
          skillsPanel.classList.add('update-glitch');
        }
      }
    } else {
      // Desktop Layout: Ensure panel is in its original place
      if (skillsPanel && skillsPanel.parentNode !== originalSkillsPanelParent) {
        if (originalSkillsPanelParent) {
          originalSkillsPanelParent.insertBefore(skillsPanel, originalSkillsPanelNextSibling);
        }
      }
      if (skillsPanel) {
        skillsPanel.style.display = 'block';
      }
      
      skillCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      
      const data = skillDataList[idx];
      if (data && skillsPanelTitle && skillsPanelDesc) {
        skillsPanelTitle.textContent = data.title;
        skillsPanelDesc.textContent = data.desc;
        
        // Trigger neon glitch flash effect
        if (skillsPanel) {
          skillsPanel.classList.remove('update-glitch');
          skillsPanel.offsetHeight; // Force reflow
          skillsPanel.classList.add('update-glitch');
        }
      }
    }
  });
});


// --- 6. SECTIONS ENTRY TRIGGERS ---
const sections = document.querySelectorAll('.scroll-section');
const navLinks = document.querySelectorAll('.floating-nav-item');

sections.forEach((sec, idx) => {
  // Content reveal. Sections taller than the viewport (the gallery on mobile) used to
  // fade out at 'bottom center', while half of the section was still on screen.
  // Hold the reveal until the section has almost completely scrolled past.
  ScrollTrigger.create({
    trigger: sec,
    start: 'top 70%',
    end: 'bottom 10%',
    onToggle: (self) => {
      if (self.isActive) {
        sec.classList.add('visible');
      } else {
        sec.classList.remove('visible');
      }
    }
  });

  // Navigation highlight stays on the centre-crossing section so only one dock item
  // is ever active, even when two reveal ranges overlap.
  ScrollTrigger.create({
    trigger: sec,
    start: 'top center',
    end: 'bottom center',
    onToggle: (self) => {
      if (self.isActive) {
        navLinks.forEach(link => link.classList.remove('active'));
        if (navLinks[idx]) navLinks[idx].classList.add('active');
      }
    }
  });
});


// --- 7. ANIMATION RENDER LOOP ---
const clock = new THREE.Clock();

// Helper to project mouse normalized device coordinates to 3D world space
const getMouse3D = (depth = 11) => {
  const vec = new THREE.Vector3(mouse.x, mouse.y, 0.5);
  vec.unproject(camera);
  const camPos = new THREE.Vector3();
  camera.getWorldPosition(camPos);
  const dir = vec.sub(camPos).normalize();
  return new THREE.Vector3().copy(camPos).add(dir.multiplyScalar(depth));
};

// The link rebuild below is the heaviest CPU work in the loop. Node velocities are
// small enough that recomputing it on every frame is invisible, so it runs on a
// slower cadence than the render itself.
let frameCounter = 0;
const linkRebuildInterval = isMobileDevice ? 3 : 2;

// Respect the OS "reduce motion" setting. The scene, lights and colours stay; what
// stops is the involuntary movement that causes trouble for vestibular disorders:
// the camera swaying under the cursor and the continuous idle rotations.
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let prefersReducedMotion = reducedMotionQuery.matches;
reducedMotionQuery.addEventListener('change', (e) => {
  prefersReducedMotion = e.matches;
  if (prefersReducedMotion) {
    // Settle the camera back to centre rather than freezing it mid-sway
    gsap.to(camera.position, { x: 0, y: 0, duration: 0.6, ease: 'power2.out' });
    gsap.to(camera.rotation, { x: 0, y: 0, duration: 0.6, ease: 'power2.out' });
  }
});

const animate = () => {
  requestAnimationFrame(animate);

  // A backgrounded tab still gets frames in some browsers, and this scene is not
  // cheap. Nothing here needs to advance while the page is not being looked at.
  if (document.hidden) return;

  frameCounter++;
  const elapsedTime = clock.getElapsedTime();

  // 1. Mouse Camera Sway (Organic 3D parallax drift)
  if (!prefersReducedMotion) {
    const targetCamX = mouse.x * 2.5;
    const targetCamY = mouse.y * 2.0;
    camera.position.x += (targetCamX - camera.position.x) * 0.07;
    camera.position.y += (targetCamY - camera.position.y) * 0.07;

    // Sway rotation slightly to look towards coordinates
    camera.rotation.y += (mouse.x * 0.08 - camera.rotation.y) * 0.07;
    camera.rotation.x += (-mouse.y * 0.08 - camera.rotation.x) * 0.07;
  }

  // 2. Update Constellation Nodes & Dynamic Mouse Links (Takımyıldız Efekti)
  const target3D = getMouse3D(12);
  const nodesPosArr = constellationPoints.geometry.attributes.position.array;
  const linePosArr = constellationLines.geometry.attributes.position.array;
  const lineColArr = constellationLines.geometry.attributes.color.array;

  let currentLineIdx = 0;
  const connectionThresholdSq = 6.0 * 6.0;
  const mouseConnectionThresholdSq = 10.0 * 10.0;

  // A. Drift nodes and update points positions
  for (let i = 0; i < constellationNodeCount; i++) {
    const node = constellationNodes[i];
    node.x += node.vx;
    node.y += node.vy;
    node.z += node.vz;

    // Bounds check and soft return (prevents particles from sticking on edges)
    if (node.x > 30 && node.vx > 0) node.vx *= -1;
    if (node.x < -30 && node.vx < 0) node.vx *= -1;
    if (node.y > 22 && node.vy > 0) node.vy *= -1;
    if (node.y < -22 && node.vy < 0) node.vy *= -1;
    if (node.z > 35 && node.vz > 0) node.vz *= -1;
    if (node.z < -100 && node.vz < 0) node.vz *= -1;

    nodesPosArr[i * 3] = node.x;
    nodesPosArr[i * 3 + 1] = node.y;
    nodesPosArr[i * 3 + 2] = node.z;
  }
  constellationPoints.geometry.attributes.position.needsUpdate = true;

  // B. Search and draw connecting lines between nodes and to the mouse cursor.
  // Rebuilt on a slower cadence than the render: the nodes drift by a fraction of a
  // unit per frame, so which pairs are within range barely changes frame to frame.
  if (frameCounter % linkRebuildInterval === 0) {
    for (let i = 0; i < constellationNodeCount; i++) {
      const nodeA = constellationNodes[i];

      // Connect node to mouse cursor if within threshold (Takımyıldız Fare Bağlantısı).
      // Compared squared to skip the square root; only the ordering matters here.
      const mdx = nodeA.x - target3D.x;
      const mdy = nodeA.y - target3D.y;
      const mdz = nodeA.z - target3D.z;
      const distToMouseSq = mdx * mdx + mdy * mdy + mdz * mdz;

      if (distToMouseSq < mouseConnectionThresholdSq && currentLineIdx < maxLines) {
        const idx = currentLineIdx * 6;
        linePosArr[idx] = nodeA.x;
        linePosArr[idx + 1] = nodeA.y;
        linePosArr[idx + 2] = nodeA.z;

        linePosArr[idx + 3] = target3D.x;
        linePosArr[idx + 4] = target3D.y;
        linePosArr[idx + 5] = target3D.z;

        // Color gradient (Red to Orange)
        lineColArr[idx] = 0.95;
        lineColArr[idx + 1] = 0.19;
        lineColArr[idx + 2] = 0.14;

        lineColArr[idx + 3] = 0.98;
        lineColArr[idx + 4] = 0.45;
        lineColArr[idx + 5] = 0.09;

        currentLineIdx++;
      }

      // Connect node to other nearby nodes. This inner loop runs
      // constellationNodeCount^2 / 2 times per frame, so it stays branch-cheap and
      // square-root free: comparing squared distances gives the same result.
      for (let j = i + 1; j < constellationNodeCount; j++) {
        const nodeB = constellationNodes[j];
        const dx = nodeA.x - nodeB.x;
        const dy = nodeA.y - nodeB.y;
        const dz = nodeA.z - nodeB.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < connectionThresholdSq && currentLineIdx < maxLines) {
          const idx = currentLineIdx * 6;
          linePosArr[idx] = nodeA.x;
          linePosArr[idx + 1] = nodeA.y;
          linePosArr[idx + 2] = nodeA.z;

          linePosArr[idx + 3] = nodeB.x;
          linePosArr[idx + 4] = nodeB.y;
          linePosArr[idx + 5] = nodeB.z;

          // Color (Orange-Pink mix)
          lineColArr[idx] = 0.98;
          lineColArr[idx + 1] = 0.45;
          lineColArr[idx + 2] = 0.09;

          lineColArr[idx + 3] = 0.95;
          lineColArr[idx + 4] = 0.19;
          lineColArr[idx + 5] = 0.8;

          currentLineIdx++;
        }
      }
    }

    // Clear leftover lines inside geometry buffers
    for (let i = currentLineIdx; i < maxLines; i++) {
      const idx = i * 6;
      linePosArr[idx] = 0;
      linePosArr[idx + 1] = 0;
      linePosArr[idx + 2] = -999;
      linePosArr[idx + 3] = 0;
      linePosArr[idx + 4] = 0;
      linePosArr[idx + 5] = -999;
    }

    constellationLines.geometry.attributes.position.needsUpdate = true;
    constellationLines.geometry.attributes.color.needsUpdate = true;
  }

  // Update scroll velocity dampening and play scroll sounds
  smoothVelocity += (scrollVelocity - smoothVelocity) * 0.15;
  scrollVelocity *= 0.85; // decay rapidly

  if (isSoundEnabled && audioCtx && noiseGain && noiseFilter) {
    const targetGain = Math.min(smoothVelocity * 0.0035, 0.12);
    const targetFreq = 120 + Math.min(smoothVelocity * 10, 800);
    noiseGain.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.08);
    noiseFilter.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.08);

    // Scrolling opens the drone's lowpass so the pad breathes with the page
    // instead of sitting at a fixed 200Hz cutoff (the LFO still rides on top).
    if (ambientFilter) {
      // Base matches the drone's resting cutoff, otherwise scrolling would drag
      // the pad down to the old 200Hz and then release it, which is audible.
      const targetCutoff = 320 + Math.min(smoothVelocity * 14, 900);
      ambientFilter.frequency.setTargetAtTime(targetCutoff, audioCtx.currentTime, 0.12);
    }
  }

  // Highlight objects camera passes by attaching point light position to camera world position
  camera.getWorldPosition(cameraLight.position);

  // A. Portal swirl & ring rotations
  if (!prefersReducedMotion) {
    portalSwirl.rotation.z += 0.003;
    portalSwirl.rotation.y = Math.sin(elapsedTime * 0.5) * 0.1;
    portalRing.rotation.y = Math.sin(elapsedTime * 0.2) * 0.05;

    // B. Constellation slow rotation
    constellationPoints.rotation.y = elapsedTime * 0.004;
    constellationPoints.rotation.x = Math.sin(elapsedTime * 0.02) * 0.02;
  }

  // C. Tunnel arches pulse glow. The emissive pulse is a brightness change rather
  // than movement, so it stays on under reduced motion; only the spin stops.
  tunnelSegments.forEach((segment, i) => {
    if (!prefersReducedMotion) {
      segment.rotation.z = Math.PI / 4 + elapsedTime * 0.02 * (i % 2 === 0 ? 1 : -1);
    }
    // Pulse emission intensity
    segment.material.emissiveIntensity = 1.0 + Math.sin(elapsedTime * 2 + i) * 0.4;
  });

  // D. Raycasting hover logic for project monoliths & gallery frames
  raycaster.setFromCamera(mouse, camera);
  const frameMeshes = typeof galleryFrames !== 'undefined' ? galleryFrames.map(f => f.screen) : [];
  const intersects = raycaster.intersectObjects([...monoliths, ...frameMeshes]);

  if (intersects.length > 0) {
    const hitObj = intersects[0].object;
    if (hoveredMonolith !== hitObj) {
      if (hoveredMonolith) {
        gsap.to(hoveredMonolith.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
        if (hoveredMonolith.userData && hoveredMonolith.userData.isGalleryFrame) {
          if (hoveredMonolith.parent && hoveredMonolith.parent.children[0] && hoveredMonolith.parent.children[0].material) {
            gsap.to(hoveredMonolith.parent.children[0].material, { emissiveIntensity: 0.8, duration: 0.3 });
          }
        } else {
          if (hoveredMonolith.children && hoveredMonolith.children[1] && hoveredMonolith.children[1].material) {
            hoveredMonolith.children[1].material.opacity = 0.12;
          }
        }
      }
      hoveredMonolith = hitObj;
      const hoverScale = (hoveredMonolith.userData && hoveredMonolith.userData.isGalleryFrame) ? 1.08 : 1.15;
      gsap.to(hoveredMonolith.scale, { x: hoverScale, y: hoverScale, z: hoverScale, duration: 0.3 });
      
      if (hoveredMonolith.userData && hoveredMonolith.userData.isGalleryFrame) {
        if (hoveredMonolith.parent && hoveredMonolith.parent.children[0] && hoveredMonolith.parent.children[0].material) {
          gsap.to(hoveredMonolith.parent.children[0].material, { emissiveIntensity: 2.2, duration: 0.3 });
        }
      } else {
        if (hoveredMonolith.children && hoveredMonolith.children[1] && hoveredMonolith.children[1].material) {
          hoveredMonolith.children[1].material.opacity = 0.45;
        }
        
        // HTML selection follow (monoliths only)
        htmlProjItems.forEach(item => {
          if (hoveredMonolith.userData && parseInt(item.getAttribute('data-index')) === hoveredMonolith.userData.id) {
            item.classList.add('active');
          } else {
            item.classList.remove('active');
          }
        });
      }
      playHoverSound();
    }
  } else {
    if (hoveredMonolith) {
      gsap.to(hoveredMonolith.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
      if (hoveredMonolith.userData && hoveredMonolith.userData.isGalleryFrame) {
        if (hoveredMonolith.parent && hoveredMonolith.parent.children[0] && hoveredMonolith.parent.children[0].material) {
          gsap.to(hoveredMonolith.parent.children[0].material, { emissiveIntensity: 0.8, duration: 0.3 });
        }
      } else {
        if (hoveredMonolith.children && hoveredMonolith.children[1] && hoveredMonolith.children[1].material) {
          hoveredMonolith.children[1].material.opacity = 0.12;
        }
      }
      hoveredMonolith = null;
    }
  }

  // Floating bounce effect for project panels
  monoliths.forEach((mono, i) => {
    mono.position.y = mono.userData.initialY + Math.sin(elapsedTime * 1.2 + i * 1.5) * 0.2;
    mono.rotation.y = Math.PI / 5 + Math.sin(elapsedTime * 0.4 + i) * 0.06;
  });

  // E. Skills Network constellation animation
  skillsGroup.rotation.y = elapsedTime * 0.12;
  skillsGroup.rotation.x = Math.sin(elapsedTime * 0.08) * 0.05;
  skillCoreMesh.material.emissiveIntensity = 0.8 + Math.sin(elapsedTime * 2.5) * 0.35;
  nodes.forEach((node, i) => {
    node.position.y += Math.sin(elapsedTime * 1.8 + i) * 0.008;
  });

  // F. Contact artifact knot spinning
  contactKnot.rotation.y = elapsedTime * 0.25;
  contactKnot.rotation.x = elapsedTime * 0.12;
  outerRing1.rotation.y = elapsedTime * 0.08;
  outerRing2.rotation.x = elapsedTime * 0.08;

  renderer.render(scene, camera);
};

// --- 8. PRELOADER DISMISS ---
window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  const fill = document.querySelector('.progress-fill');
  
  gsap.to(fill, {
    width: '100%',
    duration: 0.6,
    ease: 'power2.out',
    onComplete: () => {
      gsap.to(loader, {
        opacity: 0,
        duration: 0.5,
        onComplete: () => {
          loader.style.display = 'none';
          sections[0].classList.add('visible');
        }
      });
    }
  });
});

// Run loop
animate();
