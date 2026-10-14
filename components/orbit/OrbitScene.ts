/**
 * Hero signature "portfolio orbit" as a real three.js scene (demo-design.md 11-5).
 * Pure module (no React): it receives the vendored THREE_LITE namespace (public/vendor/three-lite-*.min.js,
 * loaded on idle by components/PortfolioOrbit.tsx), so three.js never enters the first-screen bundle.
 *
 * Scene (procedural models, no downloaded assets): a ceramic core (MeshPhysicalMaterial: clearcoat, sheen,
 * a seeded micro-grain normal map, a fresnel rim) with an inverted-hull outline and the firm's "V." mark as
 * a bevelled 3D emblem set into its face; three tilted metal orbit bands with instrument ticks; the 80
 * fictional companies as glossy instanced beads coloured by sector, each with a short motion trail; a 3D
 * pulsing ring around each exit; curved, tapered link tubes from the core to the companies the directory
 * filter selects; a soft drop shadow behind the core.
 * Lighting: image-based light from three's procedural RoomEnvironment (PMREM, baked once), a key and a rim
 * light, ACES filmic tone mapping, sRGB output.
 * Interaction (desktop/tablet): Raycaster hover -> dot swells + tooltip, click -> detail page,
 * OrbitControls with damping and angle/zoom limits; the wheel zooms only with Ctrl/Cmd (or a trackpad
 * pinch) so normal scrolling passes through to the page; a "reset view" eases the camera home.
 * Floors: when `still()` (reduced motion or capture-mode) there is no rAF loop at all — the final state
 * (every dot on its ring, fixed phase, no trails) is drawn once and re-drawn only on user input or a filter
 * change. The loop also stops off-screen and in hidden tabs. dispose() frees every GPU resource.
 */
import type * as THREE_NS from "three";
import type { OrbitControls as OrbitControlsT } from "three/examples/jsm/controls/OrbitControls.js";
import type { RoomEnvironment as RoomEnvironmentT } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { RoundedBoxGeometry as RoundedBoxGeometryT } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Palette } from "@/lib/palette";

export type ThreeLite = typeof THREE_NS & {
  OrbitControls: typeof OrbitControlsT;
  RoomEnvironment: typeof RoomEnvironmentT;
  RoundedBoxGeometry: typeof RoundedBoxGeometryT;
};

export interface OrbitDot {
  slug: string;
  sector: string;
  status: string;
  label: string;
}

export interface OrbitSceneOptions {
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  dots: OrbitDot[];
  sectorIds: string[];
  palette: Palette;
  interactive: boolean;
  still: () => boolean;
  onHover: (dot: OrbitDot | null, x: number, y: number) => void;
  onPick: (dot: OrbitDot) => void;
  onViewChanged: (changed: boolean) => void;
  onContextLost: () => void;
}

export interface OrbitScene {
  setFilter(slugs: string[] | null): void;
  setFocus(slug: string | null): void;
  setSectorFocus(sector: string | null): void;
  setPalette(p: Palette): void;
  resetView(): void;
  dispose(): void;
}

// same geometry as the CSS hero mark it replaces: rings rotated -28 / 32 / 90 deg, flattened to 0.56
const RING_ANGLES = [-28, 32, 90].map((d) => (d * Math.PI) / 180);
const RING_TILT = Math.acos(0.56);
const RING_SPEED = [0.00016, -0.00012, 0.0002]; // rad per ms (unchanged from the 2D version)
const R = 1;
const CORE_R = 0.66;
const DOT_R = 0.034;
const FOV = 30;
const LAUNCH_MS = 1100;
// tube meshes (link curves, dot trails): segments along the curve x sides around it
const SEG = 16;
const SIDES = 6;
const TAIL_SEG = 8;
const TAIL_SIDES = 5;
const TAIL_LEN = 0.17;

/** Index buffer for `count` tubes of (seg + 1) rings x sides vertices each. */
function tubeIndex(count: number, seg: number, sides: number): number[] {
  const idx: number[] = [];
  for (let t = 0; t < count; t++) {
    const base = t * (seg + 1) * sides;
    for (let j = 0; j < seg; j++)
      for (let k = 0; k < sides; k++) {
        const a = base + j * sides + k;
        const b = base + j * sides + ((k + 1) % sides);
        idx.push(a, a + sides, b, b, a + sides, b + sides);
      }
  }
  return idx;
}

/** Seeded micro-grain normal map (fine ceramic / brushed texture), generated on a canvas: no asset file. */
function grainNormalMap(THREE: ThreeLite): THREE_NS.CanvasTexture {
  const S = 128;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c);
  if (!g) return tex;
  let seed = 305700;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // two octaves of tileable value noise (a fine, even ceramic grain)
  const grid = (n: number) => Array.from({ length: n * n }, rnd);
  const g1 = grid(32);
  const g2 = grid(96);
  const val = (grd: number[], n: number, x: number, y: number) => {
    const fx = (x / S) * n;
    const fy = (y / S) * n;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const at = (i: number, j: number) => grd[(((j % n) + n) % n) * n + (((i % n) + n) % n)];
    const sx = (fx - x0) * (fx - x0) * (3 - 2 * (fx - x0));
    const sy = (fy - y0) * (fy - y0) * (3 - 2 * (fy - y0));
    return (at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx) * (1 - sy) + (at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx) * sy;
  };
  const h = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) h[y * S + x] = val(g1, 32, x, y) * 0.55 + val(g2, 96, x, y) * 0.45;
  const H = (i: number, j: number) => h[((j + S) % S) * S + ((i + S) % S)];
  const img = g.createImageData(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * 2.2;
      const dy = (H(x, y + 1) - H(x, y - 1)) * 2.2;
      const l = Math.hypot(dx, dy, 1);
      const o = (y * S + x) * 4;
      img.data[o] = ((-dx / l) * 0.5 + 0.5) * 255;
      img.data[o + 1] = ((-dy / l) * 0.5 + 0.5) * 255;
      img.data[o + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      img.data[o + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 3);
  tex.needsUpdate = true;
  return tex;
}

/** Soft radial falloff (white, alpha 1 -> 0) for the drop shadow behind the core. */
function softShadow(THREE: ThreeLite): THREE_NS.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  if (g) {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.45, "rgba(255,255,255,0.55)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

export function createOrbitScene(THREE: ThreeLite, o: OrbitSceneOptions): OrbitScene {
  const { host, canvas, dots, sectorIds } = o;
  let pal = o.palette;
  const n = dots.length;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
  const system = new THREE.Group();
  scene.add(system);

  // image-based light: three's procedural studio room, prefiltered once (no HDR file to download)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new THREE.RoomEnvironment();
  const envRT = pmrem.fromScene(room, 0.04);
  room.dispose();
  pmrem.dispose();
  scene.environment = envRT.texture;

  // key light from the upper left (matches the CSS gradient's highlight) + a rim light from behind-right
  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(-3, 4, 5);
  const rim = new THREE.DirectionalLight(0xffffff, 1.4);
  rim.position.set(3.5, 1.5, -4);
  scene.add(ambient, key, rim);

  // soft drop shadow behind the core (the CSS mark's box-shadow, as depth): fixed in the scene, not the system
  const shadowTex = softShadow(THREE);
  const shadowGeo = new THREE.PlaneGeometry(2.3, 2.3);
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.position.set(0.2, -0.24, -1.25);
  scene.add(shadow);

  // core: glazed ceramic sphere + micro-grain normal map + fresnel rim, with the inverted-hull outline
  const grain = grainNormalMap(THREE);
  const coreGeo = new THREE.SphereGeometry(CORE_R, 56, 40);
  const coreMat = new THREE.MeshPhysicalMaterial({
    roughness: 0.5,
    metalness: 0,
    clearcoat: 0.4,
    clearcoatRoughness: 0.3,
    sheenRoughness: 0.6,
    envMapIntensity: 0.6,
    normalMap: grain,
    normalScale: new THREE.Vector2(0.05, 0.05),
  });
  const rimCol = { value: new THREE.Color() };
  const rimAmt = { value: 0.5 };
  coreMat.onBeforeCompile = (sh) => {
    sh.uniforms.rimCol = rimCol;
    sh.uniforms.rimAmt = rimAmt;
    sh.fragmentShader =
      "uniform vec3 rimCol;\nuniform float rimAmt;\n" +
      sh.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance += rimCol * rimAmt * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.6);",
      );
  };
  coreMat.customProgramCacheKey = () => "vpd-core-rim";
  const core = new THREE.Mesh(coreGeo, coreMat);
  const hullMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, transparent: true, opacity: 0.55, toneMapped: false });
  const hull = new THREE.Mesh(coreGeo, hullMat);
  hull.scale.setScalar(1.022);
  system.add(core, hull);

  // "V." emblem: the header mark (lib/firm-mark.mjs, 48-unit grid) as two bevelled strokes + a sphere,
  // set into the core's face so it tilts with the scene (the HTML "V." is hidden in 3D mode, app/uplift.css)
  const MK = 0.02; // mark units -> scene units
  const strokeLen = Math.hypot(9.5, 21) * MK;
  const strokeGeo = new THREE.RoundedBoxGeometry(5.6 * MK, strokeLen + 5.6 * MK, 0.1, 3, 0.04);
  const markDotGeo = new THREE.SphereGeometry(3.9 * MK, 24, 16);
  const emblemMat = new THREE.MeshPhysicalMaterial({ roughness: 0.42, metalness: 0.1, clearcoat: 0.7, clearcoatRoughness: 0.15, envMapIntensity: 0.6 });
  const emblem = new THREE.Group();
  const lean = Math.atan2(9.5, 21);
  [
    [(17.25 - 25) * MK, lean],
    [(26.75 - 25) * MK, -lean],
  ].forEach(([x, rz]) => {
    const s = new THREE.Mesh(strokeGeo, emblemMat);
    s.position.set(x, 0, 0);
    s.rotation.z = rz;
    emblem.add(s);
  });
  const markDot = new THREE.Mesh(markDotGeo, emblemMat);
  markDot.position.set((36.2 - 25) * MK, -(32.4 - 24) * MK, 0.005);
  emblem.add(markDot);
  emblem.position.z = CORE_R * 0.93;
  system.add(emblem);

  // rings: flat metal bands (torus squashed across the ring plane) + 12 instrument ticks each
  const ringMat = new THREE.MeshStandardMaterial({ metalness: 0.65, roughness: 0.32, transparent: true, opacity: 0.92 });
  const ringGeo = new THREE.TorusGeometry(R, 0.011, 6, 200);
  ringGeo.scale(1, 1, 0.38);
  const ringMatrix: THREE_NS.Matrix4[] = RING_ANGLES.map((a) => {
    const m = new THREE.Matrix4().makeRotationZ(-a);
    return m.multiply(new THREE.Matrix4().makeRotationY(-RING_TILT));
  });
  const ringQuat = ringMatrix.map((m) => new THREE.Quaternion().setFromRotationMatrix(m));
  const ringNormal = ringMatrix.map((m) => new THREE.Vector3(0, 0, 1).transformDirection(m));
  ringMatrix.forEach((m) => {
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.matrixAutoUpdate = false;
    ring.matrix.copy(m);
    system.add(ring);
  });
  const tickGeo = new THREE.BoxGeometry(0.05, 0.006, 0.014);
  const ticks = new THREE.InstancedMesh(tickGeo, ringMat, 36);
  {
    const tm = new THREE.Matrix4();
    const rot = new THREE.Matrix4();
    const out = new THREE.Matrix4().makeTranslation(R + 0.012, 0, 0);
    for (let r = 0; r < 3; r++)
      for (let k = 0; k < 12; k++) {
        rot.makeRotationZ((k * Math.PI) / 6 + r * 0.26);
        tm.copy(ringMatrix[r]).multiply(rot).multiply(out);
        ticks.setMatrixAt(r * 12 + k, tm);
      }
  }
  system.add(ticks);

  // dots: glossy beads (InstancedMesh) + an invisible, larger pick proxy so small dots are easy to hover
  const dotGeo = new THREE.SphereGeometry(DOT_R, 14, 10);
  const dotMat = new THREE.MeshPhysicalMaterial({ roughness: 0.36, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.1, envMapIntensity: 0.55 });
  const dotMesh = new THREE.InstancedMesh(dotGeo, dotMat, n);
  dotMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  dotMesh.frustumCulled = false;
  const pickGeo = new THREE.SphereGeometry(DOT_R * 2.6, 8, 6);
  const pickMat = new THREE.MeshBasicMaterial({ visible: false });
  const pick = new THREE.InstancedMesh(pickGeo, pickMat, n);
  pick.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  system.add(dotMesh, pick);

  // motion trails (motion on only): a tapered tube behind each bead along its ring, alpha fading out
  const tailGeo = new THREE.BufferGeometry();
  {
    const verts = (TAIL_SEG + 1) * TAIL_SIDES;
    const p = new Float32Array(verts * 3);
    const c = new Float32Array(verts * 4);
    for (let j = 0; j <= TAIL_SEG; j++) {
      const u = j / TAIL_SEG;
      const rad = DOT_R * 0.7 * (1 - u * 0.8);
      for (let k = 0; k < TAIL_SIDES; k++) {
        const a = (k / TAIL_SIDES) * Math.PI * 2;
        const vi = j * TAIL_SIDES + k;
        p.set([-u * TAIL_LEN, Math.cos(a) * rad, Math.sin(a) * rad], vi * 3);
        c.set([1, 1, 1, 0.75 * Math.pow(1 - u, 1.3)], vi * 4);
      }
    }
    tailGeo.setAttribute("position", new THREE.BufferAttribute(p, 3));
    tailGeo.setAttribute("color", new THREE.BufferAttribute(c, 4));
    tailGeo.setIndex(tubeIndex(1, TAIL_SEG, TAIL_SIDES));
  }
  const tailMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false });
  const tails = new THREE.InstancedMesh(tailGeo, tailMat, n);
  tails.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  tails.frustumCulled = false;
  system.add(tails);

  // exit rings: a small 3D torus around each exit, lying in its ring's plane, pulsing
  const haloGeo = new THREE.TorusGeometry(1, 0.09, 5, 24);

  // link tubes core -> selected companies: curved (quadratic Bezier swept back along the ring), tapered
  const linkCap = n * (SEG + 1) * SIDES;
  const linkPos = new Float32Array(linkCap * 3);
  const linkCol = new Float32Array(linkCap * 4);
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute("position", new THREE.BufferAttribute(linkPos, 3).setUsage(THREE.DynamicDrawUsage));
  linkGeo.setAttribute("color", new THREE.BufferAttribute(linkCol, 4).setUsage(THREE.DynamicDrawUsage));
  linkGeo.setIndex(tubeIndex(n, SEG, SIDES));
  linkGeo.setDrawRange(0, 0);
  const linkMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false });
  const links = new THREE.Mesh(linkGeo, linkMat);
  links.frustumCulled = false;
  system.add(links);

  type HaloMesh = THREE_NS.Mesh<THREE_NS.TorusGeometry, THREE_NS.MeshStandardMaterial>;
  // per-dot state
  const perRing = [0, 0, 0];
  const ringOf = dots.map((d) => Math.max(0, sectorIds.indexOf(d.sector)) % 3);
  ringOf.forEach((r) => perRing[r]++);
  const seen = [0, 0, 0];
  const st = dots.map((d, i) => {
    const ring = ringOf[i];
    const k = seen[ring]++;
    return {
      d,
      ring,
      sectorIdx: Math.max(0, sectorIds.indexOf(d.sector)),
      phase: (k / Math.max(1, perRing[ring])) * Math.PI * 2 + ring * 0.7,
      exit: d.status !== "active",
      born: 300 + i * 16,
      hl: 1,
      target: 1,
      dim: 0,
      dimTarget: 0,
      link: 0,
      linkTarget: 0,
      pos: new THREE.Vector3(),
      halo: null as HaloMesh | null,
    };
  });
  type DotState = (typeof st)[number];
  const halos: HaloMesh[] = [];
  for (const s of st) {
    if (!s.exit) continue;
    const m = new THREE.MeshStandardMaterial({ metalness: 0.5, roughness: 0.3, transparent: true, depthWrite: false, opacity: 0.6 });
    const h: HaloMesh = new THREE.Mesh(haloGeo, m);
    h.quaternion.copy(ringQuat[s.ring]);
    s.halo = h;
    halos.push(h);
    system.add(h);
  }

  let filterOn = false;
  let focusSlug: string | null = null;
  let focusSector: string | null = null;
  let hoverIdx = -1;

  /* ── colours from the design tokens */
  const tmpCol = new THREE.Color();
  const dimCol = new THREE.Color();
  const sectorCols: THREE_NS.Color[] = [];
  function applyPalette() {
    sectorCols.length = 0;
    pal.sectors.forEach((c) => sectorCols.push(new THREE.Color(c)));
    // (three's ACES curve scales by exposure / 0.6, so ~0.7 keeps the token colours at their CSS value)
    renderer.toneMappingExposure = pal.dark ? 0.78 : 0.72;
    scene.environmentIntensity = pal.dark ? 0.55 : 0.6;
    coreMat.color.set(pal.orbitCore);
    coreMat.emissive.set(pal.orbitGlow);
    coreMat.emissiveIntensity = pal.dark ? 0.25 : 0.05;
    coreMat.sheenColor.set(pal.orbitRim);
    coreMat.sheen = pal.dark ? 0.25 : 0;
    rimCol.value.set(pal.orbitRim);
    rimAmt.value = pal.dark ? 0.35 : 0.16;
    rim.color.set(pal.orbitRim);
    emblemMat.color.set(pal.orbitEmblem);
    hullMat.color.set(pal.orbitHull);
    ringMat.color.set(pal.orbitRing);
    shadowMat.color.set(pal.dark ? "#000000" : pal.orbitGlow);
    shadowMat.opacity = pal.dark ? 0.45 : 0.16;
    dimCol.set(pal.orbitDim);
    for (const s of st) if (s.halo) s.halo.material.color.copy(sectorCols[s.sectorIdx % sectorCols.length]);
  }
  applyPalette();

  /* ── camera framing */
  let homeDist = 4.3;
  function frame() {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const half = Math.tan(((FOV / 2) * Math.PI) / 180);
    homeDist = (R * 1.16) / (half * Math.min(1, camera.aspect));
    camera.updateProjectionMatrix();
  }
  frame();
  camera.position.set(0, 0, homeDist);
  camera.lookAt(0, 0, 0);

  /* ── controls (interactive mode only) */
  let controls: OrbitControlsT | null = null;
  const onWheelGate = (e: WheelEvent) => {
    // plain wheel = page scroll (do not let OrbitControls see it); Ctrl/Cmd wheel or pinch = zoom
    if (!(e.ctrlKey || e.metaKey)) e.stopImmediatePropagation();
  };
  if (o.interactive) {
    canvas.addEventListener("wheel", onWheelGate, { passive: true });
    controls = new THREE.OrbitControls(camera, canvas);
    controls.enablePan = false;
    // OrbitControls sets touch-action:none; on touch screens keep vertical swipes as page scroll so a swipe
    // that starts on the hero does not trap the page (horizontal drag still rotates, pinch still zooms)
    if (window.matchMedia("(pointer: coarse)").matches) canvas.style.touchAction = "pan-y";
    controls.enableDamping = !o.still();
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.65;
    controls.zoomSpeed = 0.6;
    controls.minDistance = homeDist / 1.25;
    controls.maxDistance = homeDist / 0.85;
    controls.minPolarAngle = Math.PI / 2 - (35 * Math.PI) / 180;
    controls.maxPolarAngle = Math.PI / 2 + (35 * Math.PI) / 180;
    controls.minAzimuthAngle = (-70 * Math.PI) / 180;
    controls.maxAzimuthAngle = (70 * Math.PI) / 180;
    controls.addEventListener("start", () => {
      userActive = true;
      wake();
    });
    controls.addEventListener("end", () => {
      userActive = false;
    });
    controls.addEventListener("change", () => {
      // the reset tween moves the camera itself; do not let its in-between frames re-show the reset button
      if (camTween) return;
      const moved = camera.position.distanceTo(new THREE.Vector3(0, 0, homeDist)) > 0.04;
      if (moved !== viewChanged) {
        viewChanged = moved;
        o.onViewChanged(moved);
      }
      if (o.still()) render();
    });
  }
  let userActive = false;
  let viewChanged = false;

  /* ── per-frame update */
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const qt = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const v = new THREE.Vector3();
  const X = new THREE.Vector3(1, 0, 0);
  const tan = new THREE.Vector3();
  const p0 = new THREE.Vector3();
  const pc = new THREE.Vector3();
  const pt = new THREE.Vector3();
  const tg = new THREE.Vector3();
  const nb = new THREE.Vector3();
  const d1 = new THREE.Vector3();
  const d2 = new THREE.Vector3();
  let t = 0;

  /** Write tube `slot` of the link geometry: the Bezier p0 -> pc -> v, drawn from 0 to `len` (0..1). */
  function writeLink(slot: number, s: DotState, len: number) {
    const c = sectorCols[s.sectorIdx % sectorCols.length];
    const nr = ringNormal[s.ring];
    d1.copy(pc).sub(p0);
    d2.copy(v).sub(pc);
    for (let j = 0; j <= SEG; j++) {
      const u = (j / SEG) * len;
      const a = 1 - u;
      pt.set(0, 0, 0).addScaledVector(p0, a * a).addScaledVector(pc, 2 * a * u).addScaledVector(v, u * u);
      tg.copy(d1).multiplyScalar(a).addScaledVector(d2, u).normalize();
      nb.crossVectors(tg, nr).normalize();
      const rad = 0.0075 * (1 - 0.45 * (j / SEG));
      const alpha = (0.35 + 0.6 * (j / SEG)) * Math.min(1, s.link * 1.5);
      for (let k = 0; k < SIDES; k++) {
        const ang = (k / SIDES) * Math.PI * 2;
        const ca = Math.cos(ang) * rad;
        const sa = Math.sin(ang) * rad;
        const vi = (slot * (SEG + 1) + j) * SIDES + k;
        linkPos[vi * 3] = pt.x + nr.x * ca + nb.x * sa;
        linkPos[vi * 3 + 1] = pt.y + nr.y * ca + nb.y * sa;
        linkPos[vi * 3 + 2] = pt.z + nr.z * ca + nb.z * sa;
        linkCol[vi * 4] = c.r;
        linkCol[vi * 4 + 1] = c.g;
        linkCol[vi * 4 + 2] = c.b;
        linkCol[vi * 4 + 3] = alpha;
      }
    }
  }

  function place(time: number, settle: boolean) {
    const still = o.still();
    let slot = 0;
    for (let i = 0; i < n; i++) {
      const s = st[i];
      if (settle) {
        s.hl = s.target;
        s.dim = s.dimTarget;
        s.link = s.linkTarget;
      } else {
        s.hl += (s.target - s.hl) * 0.12;
        s.dim += (s.dimTarget - s.dim) * 0.12;
        s.link += (s.linkTarget - s.link) * 0.09;
      }
      const launchRaw = still ? 1 : Math.min(1, Math.max(0, (time - s.born) / LAUNCH_MS));
      const launch = 1 - Math.pow(1 - launchRaw, 4);
      const ang = s.phase + (still ? 0 : RING_SPEED[s.ring] * time);
      v.set(R * Math.cos(ang), R * Math.sin(ang), 0).applyMatrix4(ringMatrix[s.ring]).multiplyScalar(launch);
      s.pos.copy(v);
      const size = Math.max(0.0001, launch) * (i === hoverIdx ? 2.5 : s.hl);
      sc.setScalar(size);
      m4.compose(v, q, sc);
      dotMesh.setMatrixAt(i, m4);
      sc.setScalar(Math.max(0.0001, launch));
      m4.compose(v, q, sc);
      pick.setMatrixAt(i, m4);
      tmpCol.copy(sectorCols[s.sectorIdx % sectorCols.length]).lerp(dimCol, s.dim);
      dotMesh.setColorAt(i, tmpCol);
      // direction of travel along the ring (world space): trails point back from it, link curves sweep back along it
      tan.set(-Math.sin(ang), Math.cos(ang), 0).transformDirection(ringMatrix[s.ring]).multiplyScalar(Math.sign(RING_SPEED[s.ring]));
      if (!still) {
        tails.setColorAt(i, tmpCol);
        sc.setScalar(Math.max(0.0001, launch * Math.max(0.6, Math.min(1.6, s.hl)) * (1 - s.dim * 0.7)));
        m4.compose(v, qt.setFromUnitVectors(X, tan), sc);
        tails.setMatrixAt(i, m4);
      }
      // link tube: core surface -> dot, grown by link level
      if (s.link > 0.002 && launch > 0.01) {
        p0.copy(v).normalize().multiplyScalar(CORE_R * 0.98);
        pc.copy(p0).lerp(v, 0.5).addScaledVector(tan, -0.28 * v.distanceTo(p0));
        writeLink(slot++, s, Math.min(1, s.link));
      }
      if (s.halo) {
        s.halo.position.copy(v);
        const pulse = still ? 0.45 : ((time / 1600 + s.phase) % 1 + 1) % 1;
        s.halo.scale.setScalar(0.41 * (0.1 + pulse * 0.16) * Math.max(0.6, s.hl) * launch + 0.0001);
        s.halo.material.opacity = (still ? 0.55 : (1 - pulse) * 0.75) * (1 - s.dim * 0.85) * launch;
      }
    }
    dotMesh.instanceMatrix.needsUpdate = true;
    pick.instanceMatrix.needsUpdate = true;
    if (dotMesh.instanceColor) dotMesh.instanceColor.needsUpdate = true;
    tails.visible = !still;
    if (!still) {
      tails.instanceMatrix.needsUpdate = true;
      if (tails.instanceColor) tails.instanceColor.needsUpdate = true;
    }
    links.visible = filterOn && slot > 0;
    linkGeo.setDrawRange(0, slot * SEG * SIDES * 6);
    if (slot) {
      linkGeo.attributes.position.needsUpdate = true;
      linkGeo.attributes.color.needsUpdate = true;
    }
    // idle sway: a slow drift of the whole system so the depth reads even without input
    if (!still && !userActive) {
      system.rotation.y = Math.sin(time / 5200) * 0.16;
      system.rotation.x = Math.sin(time / 7300) * 0.06;
    }
  }

  function render() {
    if (o.still()) place(0, true);
    renderer.render(scene, camera);
  }

  /* ── loop (motion on only): runs while visible; pauses off-screen / hidden tab */
  let raf = 0;
  let visible = true;
  let start = performance.now();
  let camTween: { from: THREE_NS.Vector3; t0: number } | null = null;
  function tick(now: number) {
    raf = 0;
    if (o.still()) {
      render();
      return;
    }
    t = now - start;
    if (camTween) {
      const k = Math.min(1, (now - camTween.t0) / 700);
      const e = 1 - Math.pow(1 - k, 4);
      camera.position.copy(camTween.from).lerp(new THREE.Vector3(0, 0, homeDist), e);
      camera.lookAt(0, 0, 0);
      if (k >= 1) {
        camTween = null;
        controls?.target.set(0, 0, 0);
        controls?.update();
        viewChanged = false;
        o.onViewChanged(false);
      }
    }
    controls?.update();
    place(t, false);
    renderer.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(tick);
  }
  function wake() {
    if (o.still()) {
      render();
      return;
    }
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(tick);
  }
  const io = new IntersectionObserver((e) => {
    visible = e[0]?.isIntersecting ?? true;
    if (visible) wake();
    else if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  });
  io.observe(host);
  const onVis = () => {
    if (document.hidden && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else wake();
  };
  document.addEventListener("visibilitychange", onVis);
  const ro = new ResizeObserver(() => {
    frame();
    if (controls) {
      controls.minDistance = homeDist / 1.25;
      controls.maxDistance = homeDist / 0.85;
    }
    if (!viewChanged) camera.position.set(0, 0, homeDist);
    wake();
    if (o.still()) render();
  });
  ro.observe(host);

  /* ── hover / pick (Raycaster against the core and the pick proxy) */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let downAt: { x: number; y: number } | null = null;
  let movePending: PointerEvent | null = null;
  function hitTest(e: PointerEvent): number {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    pick.computeBoundingSphere(); // dots move every frame; refresh the proxy bounds before testing
    const hits = ray.intersectObjects([core, pick], false);
    const h = hits[0];
    return h && h.object === pick && typeof h.instanceId === "number" ? h.instanceId : -1;
  }
  function setHover(i: number, e: PointerEvent | null) {
    if (i === hoverIdx) {
      if (i >= 0 && e) {
        const r = host.getBoundingClientRect();
        o.onHover(dots[i], e.clientX - r.left, e.clientY - r.top);
      }
      return;
    }
    hoverIdx = i;
    canvas.style.cursor = i >= 0 ? "pointer" : "grab";
    const r = host.getBoundingClientRect();
    o.onHover(i >= 0 ? dots[i] : null, e ? e.clientX - r.left : 0, e ? e.clientY - r.top : 0);
    wake();
    if (o.still()) render();
  }
  const onMove = (e: PointerEvent) => {
    if (!movePending) {
      requestAnimationFrame(() => {
        const ev = movePending;
        movePending = null;
        if (ev && !userActive) setHover(hitTest(ev), ev);
      });
    }
    movePending = e;
  };
  const onLeave = () => setHover(-1, null);
  const onDown = (e: PointerEvent) => {
    downAt = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    if (moved > 5) return;
    const i = hitTest(e);
    if (i >= 0) o.onPick(dots[i]);
  };
  if (o.interactive) {
    canvas.style.cursor = "grab";
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
  }

  const onLost = (e: Event) => {
    e.preventDefault();
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    o.onContextLost();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  // first frame: final state when still, launch animation otherwise
  start = performance.now();
  place(0, o.still());
  renderer.render(scene, camera);
  wake();

  const indexOf = new Map(dots.map((d, i) => [d.slug, i]));
  function retarget() {
    for (let i = 0; i < n; i++) {
      const s = st[i];
      const inFilter = s.linkTarget > 0;
      let target = filterOn ? (inFilter ? 1.9 : 0.6) : 1;
      let dim = filterOn && !inFilter ? 0.75 : 0;
      if (focusSector) {
        const mine = s.d.sector === focusSector;
        target = mine ? Math.max(target, 1.7) : Math.min(target, 0.8);
        dim = mine ? 0 : Math.max(dim, 0.55);
      }
      if (focusSlug === s.d.slug) {
        target = 2.6;
        dim = 0;
      }
      s.target = target;
      s.dimTarget = dim;
    }
    wake();
    if (o.still()) render();
  }

  return {
    setFilter(slugs) {
      filterOn = !!slugs;
      const set = new Set(slugs ?? []);
      for (const s of st) s.linkTarget = slugs && set.has(s.d.slug) ? 1 : 0;
      retarget();
    },
    setFocus(slug) {
      focusSlug = slug && indexOf.has(slug) ? slug : null;
      retarget();
    },
    setSectorFocus(sector) {
      focusSector = sector;
      retarget();
    },
    setPalette(p) {
      pal = p;
      applyPalette();
      render();
    },
    resetView() {
      if (!controls) return;
      if (o.still()) {
        camera.position.set(0, 0, homeDist);
        controls.target.set(0, 0, 0);
        camera.lookAt(0, 0, 0);
        controls.update();
        render();
      } else {
        camTween = { from: camera.position.clone(), t0: performance.now() };
        wake();
      }
      viewChanged = false;
      o.onViewChanged(false);
    },
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("wheel", onWheelGate);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("webglcontextlost", onLost);
      controls?.dispose();
      [coreGeo, strokeGeo, markDotGeo, ringGeo, tickGeo, dotGeo, pickGeo, tailGeo, haloGeo, linkGeo, shadowGeo].forEach((g) => g.dispose());
      [coreMat, hullMat, emblemMat, ringMat, dotMat, pickMat, tailMat, linkMat, shadowMat].forEach((m) => m.dispose());
      halos.forEach((h) => h.material.dispose());
      [grain, shadowTex].forEach((tx) => tx.dispose());
      [ticks, dotMesh, pick, tails].forEach((im) => im.dispose());
      scene.environment = null;
      envRT.dispose();
      renderer.dispose();
    },
  };
}
