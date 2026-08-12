import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

// --- AUDIO ENGINE (Procedural Web Audio API) ---
let audioCtx = null;
let ambientOsc1 = null;
let ambientOsc2 = null;
let ambientFilter = null;
let ambientGain = null;
let noiseSource = null;
let noiseFilter = null;
let noiseGain = null;

let isSoundEnabled = false;

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

  // 1. Ambient Space Drone (Breathing spaceship engine hum)
  ambientFilter = audioCtx.createBiquadFilter();
  ambientFilter.type = 'lowpass';
  ambientFilter.frequency.setValueAtTime(200, audioCtx.currentTime);
  ambientFilter.Q.setValueAtTime(1.0, audioCtx.currentTime);

  ambientGain = audioCtx.createGain();
  ambientGain.gain.setValueAtTime(0.06, audioCtx.currentTime);

  // Low frequency oscillator 1 (C2 - 65.4 Hz)
  ambientOsc1 = audioCtx.createOscillator();
  ambientOsc1.type = 'sawtooth';
  ambientOsc1.frequency.setValueAtTime(65.4, audioCtx.currentTime);

  // Low frequency oscillator 2 detuned (G2 - 98.0 Hz, mapped lower to 97.5Hz)
  ambientOsc2 = audioCtx.createOscillator();
  ambientOsc2.type = 'triangle';
  ambientOsc2.frequency.setValueAtTime(97.5, audioCtx.currentTime);

  // Slow LFO to modulate filter cutoff frequency (creates dynamic depth changes)
  const lfo = audioCtx.createOscillator();
  lfo.frequency.setValueAtTime(0.12, audioCtx.currentTime); // 0.12Hz cycle
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.setValueAtTime(80, audioCtx.currentTime);

  lfo.connect(lfoGain);
  lfoGain.connect(ambientFilter.frequency);

  ambientOsc1.connect(ambientFilter);
  ambientOsc2.connect(ambientFilter);
  ambientFilter.connect(ambientGain);
  ambientGain.connect(audioCtx.destination);

  // Start hum nodes
  ambientOsc1.start();
  ambientOsc2.start();
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
  noiseGain.connect(audioCtx.destination);
  
  noiseSource.start();
};

const playHoverSound = () => {
  try {
    if (!isSoundEnabled || !audioCtx) return;
    
    // Sine chime click
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(350, audioCtx.currentTime + 0.08);
    
    gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
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
        audioCtx.suspend();
        isSoundEnabled = false;
        soundToggleBtn.classList.remove('active');
        soundToggleBtn.querySelector('.sound-icon').textContent = '🔈';
        soundToggleBtn.querySelector('.sound-text').textContent = 'SES: KAPALI';
      } else {
        audioCtx.resume();
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
  antialias: true,
  alpha: false // solid background for better fog blending
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(scene.fog.color); // match background color to fog
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// Resize Handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  updateCameraFOV();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  
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
const constellationNodeCount = 120;
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
  const colMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.8, roughness: 0.2 });
  
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
const swirlGeo = new THREE.TorusKnotGeometry(4.8, 0.2, 180, 24, 3, 4);
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
  { color: 0xec4899, title: "Aether Spaces", x: -8.5, y: 1.2, z: 2 }    // Pink/Accent
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
    color: i % 2 === 0 ? 0xf13024 : 0xec4899, // Red and Pink
    emissive: i % 2 === 0 ? 0x3d0407 : 0x3d0520,
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
    gainNode.connect(audioCtx.destination);
    
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

    // Scramble effect & sound on link text
    const linkTextEl = item.querySelector('.link-text');
    if (linkTextEl) {
      scrambleText(linkTextEl, "İNCELE");
    }
    playRevealSound();
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
      gainNode.connect(audioCtx.destination);
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
    gainNode.connect(audioCtx.destination);
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
      frame.border.material.color.setHex(item.type === 'video' ? 0x00f0ff : 0xf13024);
      frame.border.material.emissive.setHex(item.type === 'video' ? 0x00f0ff : 0xf13024);
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

let selectedFileBase64 = null;
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

// Render the 2D grid media list
const render2DGallery = () => {
  if (!galleryGrid) return;
  galleryGrid.innerHTML = '';
  
  // Filter current category
  const filtered = currentMediaList.filter(item => item.type === activeCategory);
  
  if (filtered.length === 0) {
    galleryGrid.innerHTML = `
      <div class="gallery-empty-state">
        <p>Bu kategoride henüz hiç medya yüklenmemiş. Şifrenizi girerek ilk medyayı yükleyebilirsiniz!</p>
      </div>
    `;
    return;
  }
  
  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'media-card';
    
    let thumbHTML = '';
    if (item.type === 'video') {
      thumbHTML = `
        <video class="media-thumbnail" muted loop playsinline src="${item.url}#t=0.5"></video>
        <div class="media-video-overlay"></div>
      `;
    } else {
      thumbHTML = `<img class="media-thumbnail" src="${item.url}" alt="${item.title}" loading="lazy">`;
    }
    
    // Trash can delete button html (shown only if adminIsAdmin is true)
    const deleteButtonHTML = window.adnanIsAdmin ? `
      <div class="media-delete-btn" style="display: flex;" title="Bu Medyayı Sil">
        <svg viewBox="0 0 24 24">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      </div>
    ` : '';
    
    card.innerHTML = `
      ${thumbHTML}
      ${deleteButtonHTML}
      <div class="media-info-bar">
        <span class="media-card-title">${item.title}</span>
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 0.2rem;">
          <span class="media-card-date" style="font-size: 0.65rem;">${new Date(item.timestamp).toLocaleDateString('tr-TR')}</span>
          ${item.location ? `<span class="media-card-location" style="font-size: 0.65rem; color: var(--primary-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60%;">📍 ${item.location}</span>` : ''}
        </div>
      </div>
    `;
    
    // Listen to Card Clicks (Open Lightbox)
    card.addEventListener('click', () => {
      openLightbox(item);
    });
    
    // Listen to Trash Can clicks
    const deleteBtn = card.querySelector('.media-delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent opening lightbox
        deleteMediaItem(item.id);
      });
    }
    
    galleryGrid.appendChild(card);
  });
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
  selectedFileBase64 = null;
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
      selectedFileNameRaw = file.name;
      selectedFileTypeRaw = file.type;
      selectedFileName.textContent = file.name;
      
      // Read file to Base64
      const reader = new FileReader();
      reader.onload = () => {
        selectedFileBase64 = reader.result;
      };
      reader.onerror = () => {
        alert("Dosya okunamadı!");
      };
      reader.readAsDataURL(file);
    }
  });
}

// Handle upload submit action
if (uploadForm) {
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!selectedFileBase64) {
      alert("Lütfen yüklenecek bir dosya seçin.");
      return;
    }
    
    uploadSubmitBtn.disabled = true;
    uploadProgressWrapper.style.display = 'block';
    uploadProgressFill.style.width = '20%';
    uploadStatusText.textContent = 'Şifre kontrol ediliyor ve dosya yükleniyor...';
    
    const uploadMediaLocation = document.getElementById('upload-media-location');
    const uploadMediaDescription = document.getElementById('upload-media-description');
    
    const payload = {
      password: uploadPasswordInput.value,
      fileData: selectedFileBase64,
      fileName: selectedFileNameRaw,
      fileType: selectedFileTypeRaw,
      title: uploadMediaTitle.value || selectedFileNameRaw,
      location: uploadMediaLocation ? uploadMediaLocation.value : '',
      description: uploadMediaDescription ? uploadMediaDescription.value : ''
    };
    
    try {
      uploadProgressFill.style.width = '50%';
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const resData = await response.json();
      
      if (!response.ok) {
        throw new Error(resData.error || "Upload failed");
      }
      
      uploadProgressFill.style.width = '100%';
      uploadStatusText.textContent = 'Yükleme başarılı!';
      
      setTimeout(() => {
        // Automatically authenticate user as admin upon successful upload
        window.adnanIsAdmin = true;
        window.adminPassword = uploadPasswordInput.value;
        sessionStorage.setItem('adnan_walk_pass', uploadPasswordInput.value);
        
        closeUploadModal();
        alert("Medya başarıyla yüklendi!");
        fetchMedia(); // Refresh list
      }, 500);
      
    } catch (err) {
      console.error(err);
      uploadProgressFill.style.width = '0%';
      uploadProgressWrapper.style.display = 'none';
      uploadSubmitBtn.disabled = false;
      alert("Hata: " + err.message);
    }
  });
}

// Handle Admin Login button click
if (adminLoginBtn) {
  adminLoginBtn.addEventListener('click', async () => {
    const pass = prompt("Lütfen Yönetici Şifresini Girin:");
    if (!pass) return;
    
    try {
      // Verify password securely on backend using a dummy auth_check request
      const response = await fetch('/api/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: pass, id: 'auth_check' })
      });
      
      if (response.status === 401) {
        alert("Hata: Yanlış yönetici şifresi!");
        return;
      }
      
      // Credentials are correct!
      window.adnanIsAdmin = true;
      window.adminPassword = pass;
      sessionStorage.setItem('adnan_walk_pass', pass);
      alert("Yönetici girişi başarılı! Silme özellikleri aktifleştirildi.");
      render2DGallery(); // Re-render to show trash cans
    } catch (err) {
      console.error(err);
      alert("Sunucuyla bağlantı kurulamadı!");
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
      throw new Error(resData.error || "Deletion failed");
    }
    
    alert("Medya başarıyla silindi!");
    fetchMedia(); // Reload gallery
  } catch (err) {
    console.error(err);
    alert("Hata: " + err.message);
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

// Wire up events
htmlProjItems.forEach(item => {
  const link = item.querySelector('.project-link');
  if (link) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const idx = parseInt(item.getAttribute('data-index'));
      openProjectDetails(idx);
    });
  }
  // Allow clicking anywhere on item to open too
  item.addEventListener('click', () => {
    const idx = parseInt(item.getAttribute('data-index'));
    openProjectDetails(idx);
  });
});

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
  ScrollTrigger.create({
    trigger: sec,
    start: 'top center',
    end: 'bottom center',
    onToggle: (self) => {
      if (self.isActive) {
        sec.classList.add('visible');
        navLinks.forEach(link => link.classList.remove('active'));
        if (navLinks[idx]) navLinks[idx].classList.add('active');
      } else {
        sec.classList.remove('visible');
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

const animate = () => {
  requestAnimationFrame(animate);

  const elapsedTime = clock.getElapsedTime();

  // 1. Mouse Camera Sway (Organic 3D parallax drift)
  const targetCamX = mouse.x * 2.5;
  const targetCamY = mouse.y * 2.0;
  camera.position.x += (targetCamX - camera.position.x) * 0.07;
  camera.position.y += (targetCamY - camera.position.y) * 0.07;

  // Sway rotation slightly to look towards coordinates
  camera.rotation.y += (mouse.x * 0.08 - camera.rotation.y) * 0.07;
  camera.rotation.x += (-mouse.y * 0.08 - camera.rotation.x) * 0.07;

  // 2. Update Constellation Nodes & Dynamic Mouse Links (Takımyıldız Efekti)
  const target3D = getMouse3D(12);
  const nodesPosArr = constellationPoints.geometry.attributes.position.array;
  const linePosArr = constellationLines.geometry.attributes.position.array;
  const lineColArr = constellationLines.geometry.attributes.color.array;

  let currentLineIdx = 0;
  const connectionThreshold = 6.0;
  const mouseConnectionThreshold = 10.0;

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

  // B. Search and draw connecting lines between nodes and to the mouse cursor
  for (let i = 0; i < constellationNodeCount; i++) {
    const nodeA = constellationNodes[i];

    // Connect node to mouse cursor if within threshold (Takımyıldız Fare Bağlantısı)
    const distToMouse = Math.sqrt(
      (nodeA.x - target3D.x) ** 2 +
      (nodeA.y - target3D.y) ** 2 +
      (nodeA.z - target3D.z) ** 2
    );

    if (distToMouse < mouseConnectionThreshold && currentLineIdx < maxLines) {
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

    // Connect node to other nearby nodes
    for (let j = i + 1; j < constellationNodeCount; j++) {
      const nodeB = constellationNodes[j];
      const dist = Math.sqrt(
        (nodeA.x - nodeB.x) ** 2 +
        (nodeA.y - nodeB.y) ** 2 +
        (nodeA.z - nodeB.z) ** 2
      );

      if (dist < connectionThreshold && currentLineIdx < maxLines) {
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

  // Update scroll velocity dampening and play scroll sounds
  smoothVelocity += (scrollVelocity - smoothVelocity) * 0.15;
  scrollVelocity *= 0.85; // decay rapidly

  if (isSoundEnabled && audioCtx && noiseGain && noiseFilter) {
    const targetGain = Math.min(smoothVelocity * 0.0035, 0.12);
    const targetFreq = 120 + Math.min(smoothVelocity * 10, 800);
    noiseGain.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.08);
    noiseFilter.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.08);
  }

  // Highlight objects camera passes by attaching point light position to camera world position
  camera.getWorldPosition(cameraLight.position);

  // A. Portal swirl & ring rotations
  portalSwirl.rotation.z += 0.003;
  portalSwirl.rotation.y = Math.sin(elapsedTime * 0.5) * 0.1;
  portalRing.rotation.y = Math.sin(elapsedTime * 0.2) * 0.05;

  // B. Constellation slow rotation
  constellationPoints.rotation.y = elapsedTime * 0.004;
  constellationPoints.rotation.x = Math.sin(elapsedTime * 0.02) * 0.02;

  // C. Tunnel arches pulse glow
  tunnelSegments.forEach((segment, i) => {
    segment.rotation.z = Math.PI / 4 + elapsedTime * 0.02 * (i % 2 === 0 ? 1 : -1);
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
