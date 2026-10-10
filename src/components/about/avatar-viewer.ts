import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

type Labels = {
  loading: string;
  unavailable: string;
  loadError: string;
  pause: string;
  play: string;
  reduced: string;
};

type Lighting = 'daylight' | 'peach' | 'night';

const initialCamera = new THREE.Vector3(0.2, 0.89, 3.15);
const initialTarget = new THREE.Vector3(0, 0.69, 0);
const lightingPresets = {
  daylight: { key: '#fff2df', fill: '#b9e8ff', hemi: '#d5efff', strength: 3 },
  peach: { key: '#ffc196', fill: '#ffe3c8', hemi: '#ffe1c3', strength: 3.15 },
  night: { key: '#b6b9ff', fill: '#96a9fa', hemi: '#a6b2fa', strength: 2.35 },
} satisfies Record<Lighting, { key: string; fill: string; hemi: string; strength: number }>;

function makeBooks(scene: THREE.Scene) {
  const books = new THREE.Group();
  for (const { color, position, size, angle } of [
    {
      color: '#e79d77',
      position: [-0.035, -0.258, 0.035],
      size: [1.41, 0.095, 0.79],
      angle: -0.06,
    },
    { color: '#83c4bf', position: [0.055, -0.165, -0.022], size: [1.47, 0.085, 0.81], angle: 0.07 },
    { color: '#edca7e', position: [-0.02, -0.071, 0.012], size: [1.36, 0.09, 0.76], angle: -0.035 },
  ]) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...(size as [number, number, number])),
      new THREE.MeshStandardMaterial({ color, roughness: 0.83 }),
    );
    mesh.position.set(...(position as [number, number, number]));
    mesh.rotation.y = angle;
    books.add(mesh);
  }
  scene.add(books);
  return books;
}

function normalizeModel(model: THREE.Object3D) {
  model.updateMatrixWorld(true);
  model.traverse((child) => {
    if (child instanceof THREE.SkinnedMesh) child.computeBoundingBox();
  });
  const bounds = new THREE.Box3().setFromObject(model);
  if (bounds.isEmpty()) throw new Error('Sitting avatar has empty bounds');
  const height = bounds.getSize(new THREE.Vector3()).y;
  model.scale.multiplyScalar(1.62 / Math.max(height, 0.001));
  model.updateMatrixWorld(true);
  model.traverse((child) => {
    if (child instanceof THREE.SkinnedMesh) child.computeBoundingBox();
  });
  bounds.setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  model.position.set(
    model.position.x - center.x,
    model.position.y - bounds.min.y,
    model.position.z - center.z,
  );
  model.updateMatrixWorld(true);
}

function disposeScene(scene: THREE.Object3D) {
  const textures = new Set<THREE.Texture>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
      material.dispose();
    }
  });
  textures.forEach((texture) => texture.dispose());
}

export function mountAboutAvatar(root: HTMLElement): () => void {
  const stage = root.querySelector<HTMLElement>('[data-avatar-stage]')!;
  const mount = root.querySelector<HTMLElement>('[data-avatar-canvas]')!;
  const poster = root.querySelector<HTMLImageElement>('[data-avatar-poster]')!;
  const status = root.querySelector<HTMLElement>('[data-avatar-status]')!;
  const controls = root.querySelector<HTMLElement>('[data-avatar-controls]')!;
  const retry = root.querySelector<HTMLButtonElement>('[data-avatar-retry]')!;
  const pauseButton = root.querySelector<HTMLButtonElement>('[data-action="pause"]')!;
  const labels = JSON.parse(root.dataset.labels || '{}') as Labels;
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.01, 100);
  camera.position.copy(initialCamera);
  camera.lookAt(initialTarget);

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch (error) {
    console.error(error);
    status.textContent = labels.unavailable;
    return () => {};
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  mount.append(renderer.domElement);

  const hemi = new THREE.HemisphereLight('#f4f9ff', '#edd2bf', 2.3);
  const key = new THREE.DirectionalLight('#fff2df', 3);
  const fill = new THREE.DirectionalLight('#b9e8ff', 1.25);
  key.position.set(-3.2, 4.7, 4.3);
  fill.position.set(3, 2.1, -2.8);
  scene.add(hemi, key, fill);
  const books = makeBooks(scene);
  const character = new THREE.Group();
  scene.add(character);

  let dead = false;
  let loaded = false;
  let inViewport = false;
  let paused = motionPreference.matches;
  let lastReducedMotion = motionPreference.matches;
  let frame = 0;
  let angle = 0;
  let mood: Lighting = 'daylight';
  let head: THREE.Object3D | undefined;
  let chest: THREE.Object3D | undefined;
  let headRest: THREE.Quaternion | undefined;
  let chestRest: THREE.Quaternion | undefined;
  let pointer: { id: number; x: number; y: number; angle: number } | undefined;
  let progressBucket = -1;
  const clock = new THREE.Clock();
  const turn = new THREE.Euler();
  const turnQuaternion = new THREE.Quaternion();
  const loader = new GLTFLoader();

  function renderFrame(time = 0, animate = false) {
    if (dead || !loaded) return;
    if (head && headRest) {
      head.quaternion.copy(headRest);
      if (animate) {
        turn.set(
          Math.sin(time * 0.64) * 0.011,
          Math.sin(time * 0.37) * 0.025,
          Math.sin(time * 0.51) * 0.013,
        );
        head.quaternion.multiply(turnQuaternion.setFromEuler(turn));
      }
    }
    if (chest && chestRest) {
      chest.quaternion.copy(chestRest);
      if (animate) {
        turn.set(Math.sin(time * 1.35) * 0.006, 0, 0);
        chest.quaternion.multiply(turnQuaternion.setFromEuler(turn));
      }
    }
    renderer.render(scene, camera);
  }

  function animate() {
    frame = 0;
    if (motionPreference.matches !== lastReducedMotion) {
      onMotionChange();
      return;
    }
    renderFrame(clock.getElapsedTime(), true);
    if (shouldAnimate()) frame = requestAnimationFrame(animate);
  }

  function shouldAnimate() {
    return (
      loaded && !dead && inViewport && !document.hidden && !motionPreference.matches && !paused
    );
  }

  function syncMotion() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    pauseButton.disabled = motionPreference.matches;
    pauseButton.textContent = motionPreference.matches
      ? labels.reduced
      : paused
        ? labels.play
        : labels.pause;
    pauseButton.setAttribute('aria-pressed', String(paused));
    if (shouldAnimate()) frame = requestAnimationFrame(animate);
    else renderFrame();
  }

  function resize() {
    if (dead) return;
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, stage.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderFrame();
  }

  function setLighting(next: Lighting) {
    mood = next;
    const preset = lightingPresets[next];
    key.color.set(preset.key);
    fill.color.set(preset.fill);
    hemi.color.set(preset.hemi);
    key.intensity = preset.strength;
    root.querySelectorAll<HTMLButtonElement>('[data-lighting]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.lighting === next));
    });
    renderFrame();
  }

  function setAngle(next: number) {
    angle = THREE.MathUtils.clamp(next, -0.9, 0.9);
    character.rotation.y = angle;
    renderFrame();
  }

  function load() {
    status.textContent = labels.loading;
    retry.hidden = true;
    progressBucket = -1;
    loader.load(
      '/about-avatar/sitting-avatar.glb',
      (gltf) => {
        if (dead) {
          disposeScene(gltf.scene);
          return;
        }
        try {
          const clip =
            gltf.animations.find((item) => item.name === 'Female Sitting Pose') ||
            gltf.animations[0];
          if (!clip) throw new Error('Sitting pose clip missing');
          const mixer = new THREE.AnimationMixer(gltf.scene);
          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
          action.play();
          mixer.update(Math.max(clip.duration, 1 / 30));
          normalizeModel(gltf.scene);
          character.add(gltf.scene);
          head = gltf.scene.getObjectByName('headx');
          chest = gltf.scene.getObjectByName('spine_03x');
          headRest = head?.quaternion.clone();
          chestRest = chest?.quaternion.clone();
          const hips = gltf.scene.getObjectByName('rootx');
          if (hips) {
            const point = new THREE.Vector3();
            hips.getWorldPosition(point);
            books.position.y = THREE.MathUtils.clamp(point.y - 0.16, 0.1, 1.05);
          } else books.position.y = 0.4;
          books.position.z = -0.35;
          loaded = true;
          status.textContent = '';
          controls.hidden = false;
          poster.setAttribute('aria-hidden', 'true');
          root.dataset.ready = 'true';
          resize();
          syncMotion();
        } catch (error) {
          console.error(error);
          character.remove(gltf.scene);
          disposeScene(gltf.scene);
          status.textContent = labels.loadError;
          retry.hidden = false;
        }
      },
      (event) => {
        if (dead || !event.total) return;
        const bucket = Math.floor((event.loaded / event.total) * 10);
        if (bucket !== progressBucket) {
          progressBucket = bucket;
          status.textContent = `${labels.loading} ${Math.min(100, bucket * 10)}%`;
        }
      },
      (error) => {
        if (dead) return;
        console.error(error);
        status.textContent = labels.loadError;
        retry.hidden = false;
      },
    );
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  const viewportObserver = new IntersectionObserver(([entry]) => {
    inViewport = Boolean(entry?.isIntersecting);
    syncMotion();
  });
  viewportObserver.observe(root);
  const onVisibility = () => syncMotion();
  const onMotionChange = () => {
    lastReducedMotion = motionPreference.matches;
    if (motionPreference.matches) paused = true;
    syncMotion();
  };
  document.addEventListener('visibilitychange', onVisibility);
  motionPreference.addEventListener('change', onMotionChange);

  const onPointerDown = (event: PointerEvent) => {
    if (!loaded) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, angle };
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return;
    setAngle(pointer.angle - dx * 0.006);
  };
  const onPointerEnd = () => {
    pointer = undefined;
  };
  mount.addEventListener('pointerdown', onPointerDown);
  mount.addEventListener('pointermove', onPointerMove);
  mount.addEventListener('pointerup', onPointerEnd);
  mount.addEventListener('pointercancel', onPointerEnd);

  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.closest<HTMLButtonElement>('[data-action]')?.dataset.action;
    if (action === 'turn-left') setAngle(angle - 0.25);
    if (action === 'turn-right') setAngle(angle + 0.25);
    if (action === 'pause') {
      paused = !paused;
      syncMotion();
    }
    if (action === 'reset') {
      setAngle(0);
      camera.position.copy(initialCamera);
      camera.lookAt(initialTarget);
      setLighting('daylight');
      renderFrame();
    }
    const lighting = target.closest<HTMLButtonElement>('[data-lighting]')?.dataset.lighting;
    if (lighting === 'daylight' || lighting === 'peach' || lighting === 'night')
      setLighting(lighting);
  };
  root.addEventListener('click', onClick);
  retry.addEventListener('click', load);
  setLighting(mood);
  resize();
  load();

  return () => {
    if (dead) return;
    dead = true;
    if (frame) cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    viewportObserver.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    motionPreference.removeEventListener('change', onMotionChange);
    mount.removeEventListener('pointerdown', onPointerDown);
    mount.removeEventListener('pointermove', onPointerMove);
    mount.removeEventListener('pointerup', onPointerEnd);
    mount.removeEventListener('pointercancel', onPointerEnd);
    root.removeEventListener('click', onClick);
    retry.removeEventListener('click', load);
    disposeScene(scene);
    renderer.dispose();
    renderer.domElement.remove();
  };
}
