/**
 * Hero signature "portfolio orbit" as a real three.js scene (demo-design.md 11-5).
 * Pure module (no React): it receives the vendored THREE_LITE namespace (public/vendor/three-lite-*.min.js,
 * loaded on idle by components/PortfolioOrbit.tsx), so three.js never enters the first-screen bundle.
 *
 * Scene: a lit core sphere with an inverted-hull outline, three tilted orbital rings (torus), the 80
 * fictional companies as one InstancedMesh coloured by sector, a pulsing halo sprite on each exit, and
 * link lines from the core to the companies the directory filter currently selects.
 * Interaction (desktop/tablet): Raycaster hover -> dot swells + tooltip, click -> detail page,
 * OrbitControls with damping and angle/zoom limits; the wheel zooms only with Ctrl/Cmd (or a trackpad
 * pinch) so normal scrolling passes through to the page; a "reset view" eases the camera home.
 * Floors: when `still()` (reduced motion or capture-mode) there is no rAF loop at all — the final state
 * (every dot on its ring, fixed phase) is drawn once and re-drawn only on user input or a filter change.
 * The loop also stops off-screen and in hidden tabs. dispose() frees every GPU resource.
 */
import type * as THREE_NS from "three";
import type { OrbitControls as OrbitControlsT } from "three/examples/jsm/controls/OrbitControls.js";
import type { Palette } from "@/lib/palette";

export type ThreeLite = typeof THREE_NS & { OrbitControls: typeof OrbitControlsT };

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

export function createOrbitScene(THREE: ThreeLite, o: OrbitSceneOptions): OrbitScene {
  const { host, canvas, dots, sectorIds } = o;
  let pal = o.palette;
  const n = dots.length;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
  const system = new THREE.Group();
  scene.add(system);

  // lights: soft ambient + one key light from the upper left (matches the CSS gradient's highlight)
  const ambient = new THREE.AmbientLight(0xffffff, 0.95);
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(-3, 4, 5);
  scene.add(ambient, key);

  // core sphere + inverted-hull outline
  const coreGeo = new THREE.SphereGeometry(CORE_R, 64, 48);
  const coreMat = new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0.04 });
  const core = new THREE.Mesh(coreGeo, coreMat);
  const hullMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, transparent: true, opacity: 0.55 });
  const hull = new THREE.Mesh(coreGeo, hullMat);
  hull.scale.setScalar(1.022);
  system.add(core, hull);

  // rings
  const ringMats: THREE_NS.MeshStandardMaterial[] = [];
  const ringGeo = new THREE.TorusGeometry(R, 0.0055, 8, 220);
  const ringMatrix: THREE_NS.Matrix4[] = RING_ANGLES.map((a) => {
    const m = new THREE.Matrix4().makeRotationZ(-a);
    return m.multiply(new THREE.Matrix4().makeRotationY(-RING_TILT));
  });
  ringMatrix.forEach((m) => {
    const mat = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.75, roughness: 0.5 });
    ringMats.push(mat);
    const ring = new THREE.Mesh(ringGeo, mat);
    ring.matrixAutoUpdate = false;
    ring.matrix.copy(m);
    system.add(ring);
  });

  // dots (InstancedMesh) + an invisible, larger pick proxy so small dots are easy to hover
  const dotGeo = new THREE.SphereGeometry(DOT_R, 16, 12);
  const dotMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.08 });
  const dotMesh = new THREE.InstancedMesh(dotGeo, dotMat, n);
  dotMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const pickGeo = new THREE.SphereGeometry(DOT_R * 2.6, 8, 6);
  const pickMat = new THREE.MeshBasicMaterial({ visible: false });
  const pick = new THREE.InstancedMesh(pickGeo, pickMat, n);
  pick.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  system.add(dotMesh, pick);

  // exit halos (sprites with a ring texture)
  const haloTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    if (g) {
      g.strokeStyle = "#fff";
      g.lineWidth = 7;
      g.beginPath();
      g.arc(64, 64, 52, 0, Math.PI * 2);
      g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();

  // link lines core -> selected companies
  const linkPos = new Float32Array(n * 6);
  const linkCol = new Float32Array(n * 6);
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute("position", new THREE.BufferAttribute(linkPos, 3).setUsage(THREE.DynamicDrawUsage));
  linkGeo.setAttribute("color", new THREE.BufferAttribute(linkCol, 3));
  const linkMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5 });
  const links = new THREE.LineSegments(linkGeo, linkMat);
  system.add(links);

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
      halo: null as THREE_NS.Sprite | null,
    };
  });
  const halos: THREE_NS.Sprite[] = [];
  for (const s of st) {
    if (!s.exit) continue;
    const m = new THREE.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false, opacity: 0.6 });
    const sp = new THREE.Sprite(m);
    sp.scale.setScalar(0.12);
    s.halo = sp;
    halos.push(sp);
    system.add(sp);
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
    coreMat.color.set(pal.orbitCore);
    coreMat.emissive.set(pal.orbitGlow);
    coreMat.emissiveIntensity = pal.dark ? 0.35 : 0.08;
    hullMat.color.set(pal.orbitHull);
    ringMats.forEach((m) => m.color.set(pal.orbitRing));
    dimCol.set(pal.orbitDim);
    halos.forEach((h) => {
      const s = st.find((x) => x.halo === h);
      if (s) (h.material as THREE_NS.SpriteMaterial).color.copy(sectorCols[s.sectorIdx % sectorCols.length]);
    });
    st.forEach((s, i) => {
      const c = sectorCols[s.sectorIdx % sectorCols.length];
      linkCol.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
    });
    linkGeo.attributes.color.needsUpdate = true;
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
  const sc = new THREE.Vector3();
  const v = new THREE.Vector3();
  let t = 0;

  function place(time: number, settle: boolean) {
    const still = o.still();
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
      // link segment: core -> dot, length scaled by link level
      linkPos.set([0, 0, 0, v.x * s.link, v.y * s.link, v.z * s.link], i * 6);
      if (s.halo) {
        s.halo.position.copy(v);
        const pulse = still ? 0.45 : ((time / 1600 + s.phase) % 1 + 1) % 1;
        s.halo.scale.setScalar((0.1 + pulse * 0.16) * Math.max(0.6, s.hl) * launch);
        (s.halo.material as THREE_NS.SpriteMaterial).opacity = (still ? 0.55 : (1 - pulse) * 0.75) * (1 - s.dim * 0.85) * launch;
      }
    }
    dotMesh.instanceMatrix.needsUpdate = true;
    pick.instanceMatrix.needsUpdate = true;
    if (dotMesh.instanceColor) dotMesh.instanceColor.needsUpdate = true;
    linkGeo.attributes.position.needsUpdate = true;
    linkMat.opacity = filterOn ? 0.5 : 0.0;
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
      [coreGeo, ringGeo, dotGeo, pickGeo, linkGeo].forEach((g) => g.dispose());
      [coreMat, hullMat, dotMat, pickMat, linkMat, ...ringMats].forEach((m) => m.dispose());
      halos.forEach((h) => (h.material as THREE_NS.SpriteMaterial).dispose());
      haloTex.dispose();
      dotMesh.dispose();
      pick.dispose();
      renderer.dispose();
    },
  };
}
