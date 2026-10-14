// three.js 0.186.1 (MIT) — only the classes the hero orbit scene uses (components/orbit/OrbitScene.ts).
// Bundled by scripts/build-assets.mjs into public/vendor/three-lite-0.186.1.min.js (IIFE, global THREE_LITE).
// RoomEnvironment (procedural studio light for PMREM image-based lighting) and RoundedBoxGeometry (the "V."
// emblem strokes) are three.js examples/jsm add-ons, same MIT licence; no model, texture or HDR file ships.
export {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Color, Vector2, Vector3, Matrix4, Quaternion,
  SphereGeometry, TorusGeometry, BoxGeometry, PlaneGeometry, BufferGeometry, BufferAttribute, InstancedMesh, Mesh,
  MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, AmbientLight, DirectionalLight, Raycaster,
  CanvasTexture, PMREMGenerator, SRGBColorSpace, ACESFilmicToneMapping, RepeatWrapping, BackSide, DynamicDrawUsage,
} from "three";
export { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
export { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
export { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
