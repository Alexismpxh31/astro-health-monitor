import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import './AstronautModel3D.css';

// Zones of the suit model -> body systems of the catalog (src/data/seed/catalogs.json).
// The status and the reading shown in the HUD come from the parent (`zoneStatus`, `zoneDetail`).
const ZONE_SYSTEM_MAP = {
  neuro: {
    systemId: 'behavioral',
    zoneCode: 'neuro',
    name: 'Casco y sistema neuro-vestibular',
    nameEn: 'Helmet & neuro-vestibular system',
  },
  cardio: {
    systemId: 'cardiovascular',
    zoneCode: 'cardio',
    name: 'Coraza pectoral (HUT) y mochila PLSS',
    nameEn: 'Torso (HUT) & PLSS life support',
  },
  metabolic: {
    systemId: 'immune',
    zoneCode: 'metabolic',
    name: 'Corsé abdominal y regulación pélvica',
    nameEn: 'Abdominal yoke & metabolic harness',
  },
  musculo: {
    systemId: 'musculoskeletal',
    zoneCode: 'musculo',
    name: 'Extremidades, guantes y botas EVA',
    nameEn: 'EVA limbs, gloves & boots',
  },
  radiation: {
    systemId: 'radiation',
    zoneCode: 'radiation',
    name: 'Blindaje multicapa (TMG) y dosimetría',
    nameEn: 'Multilayer insulation & dosimetry',
  },
};

/**
 * Construye un astronauta procedural PBR de alta fidelidad si el archivo .glb
 * no estuviera disponible en el entorno del cliente.
 */
function createProceduralFallback(scene, interactiveMeshes, meshesByZone, platformRings) {
  const group = new THREE.Group();

  // Materiales PBR
  const suitFabric = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    roughness: 0.6,
    metalness: 0.05,
  });
  const navyJoints = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.5,
    metalness: 0.2,
  });
  const brushedMetal = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.2,
    metalness: 0.9,
  });
  const visorGlass = new THREE.MeshStandardMaterial({
    color: 0x0a101f,
    roughness: 0.05,
    metalness: 0.95,
  });
  const ringGlow = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: new THREE.Color(0x06b6d4),
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });

  // Plataforma
  const platBase = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.08, 48), suitFabric);
  platBase.position.y = 0.04;
  platBase.raycast = () => {};
  group.add(platBase);

  [0.85, 0.68, 0.5].forEach((radius) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.015, 16, 48), ringGlow.clone());
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.082;
    ring.raycast = () => {};
    platformRings.push(ring);
    group.add(ring);
  });

  // Función auxiliar para registrar mallas interactivas
  function addPart(geom, mat, zone, name, pos, rot) {
    const clonedMat = mat.clone();
    const mesh = new THREE.Mesh(geom, clonedMat);
    if (pos) mesh.position.set(...pos);
    if (rot) mesh.rotation.set(...rot);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
      zone,
      meshName: name,
      originalEmissive: clonedMat.emissive ? clonedMat.emissive.clone() : new THREE.Color(0x000000),
      originalEmissiveIntensity: clonedMat.emissiveIntensity ?? 1.0,
    };
    interactiveMeshes.push(mesh);
    if (meshesByZone[zone]) meshesByZone[zone].push(mesh);
    group.add(mesh);
    return mesh;
  }

  // 1. NEURO: Casco y Visor
  addPart(new THREE.SphereGeometry(0.24, 32, 24), suitFabric, 'neuro', 'neuro_helmet', [0, 1.82, 0]);
  addPart(new THREE.SphereGeometry(0.19, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2), visorGlass, 'neuro', 'neuro_visor', [0, 1.83, 0.08], [Math.PI / 2, 0, 0]);
  addPart(new THREE.TorusGeometry(0.19, 0.02, 16, 32), brushedMetal, 'neuro', 'neuro_collar', [0, 1.62, 0], [Math.PI / 2, 0, 0]);

  // 2. CARDIO: Torso HUT & Mochila PLSS
  addPart(new THREE.CylinderGeometry(0.26, 0.23, 0.44, 24), suitFabric, 'cardio', 'cardio_torso', [0, 1.4, 0]);
  const plss = addPart(new THREE.BoxGeometry(0.38, 0.46, 0.2), suitFabric, 'cardio', 'cardio_plss', [0, 1.42, -0.22]);
  meshesByZone.radiation.push(plss);
  addPart(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 16), brushedMetal, 'cardio', 'cardio_valve_1', [-0.1, 1.68, -0.22]);
  addPart(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 16), brushedMetal, 'cardio', 'cardio_valve_2', [0.1, 1.68, -0.22]);

  // 3. METABOLIC: Abdomen y Pelvis
  addPart(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 24), suitFabric, 'metabolic', 'metabolic_abdomen', [0, 1.14, 0]);
  addPart(new THREE.CylinderGeometry(0.23, 0.2, 0.14, 24), navyJoints, 'metabolic', 'metabolic_pelvis', [0, 1.0, 0]);
  addPart(new THREE.BoxGeometry(0.1, 0.06, 0.04), brushedMetal, 'metabolic', 'metabolic_buckle', [0, 1.08, 0.22]);

  // 4. MUSCULO: Brazos, Piernas y Botas
  [-1, 1].forEach((side) => {
    // Brazos
    addPart(new THREE.SphereGeometry(0.1, 16, 16), suitFabric, 'musculo', `musculo_shoulder_${side}`, [side * 0.32, 1.5, 0]);
    addPart(new THREE.CylinderGeometry(0.08, 0.07, 0.26, 16), suitFabric, 'musculo', `musculo_arm_${side}`, [side * 0.34, 1.32, 0]);
    addPart(new THREE.SphereGeometry(0.07, 16, 16), navyJoints, 'musculo', `musculo_elbow_${side}`, [side * 0.35, 1.16, 0]);
    addPart(new THREE.CylinderGeometry(0.07, 0.06, 0.22, 16), suitFabric, 'musculo', `musculo_forearm_${side}`, [side * 0.35, 1.02, 0]);
    addPart(new THREE.SphereGeometry(0.06, 16, 16), navyJoints, 'musculo', `musculo_glove_${side}`, [side * 0.35, 0.88, 0]);

    // Piernas
    addPart(new THREE.CylinderGeometry(0.1, 0.09, 0.36, 16), suitFabric, 'musculo', `musculo_thigh_${side}`, [side * 0.14, 0.76, 0]);
    addPart(new THREE.SphereGeometry(0.09, 16, 16), navyJoints, 'musculo', `musculo_knee_${side}`, [side * 0.14, 0.54, 0]);
    addPart(new THREE.CylinderGeometry(0.09, 0.08, 0.34, 16), suitFabric, 'musculo', `musculo_shin_${side}`, [side * 0.14, 0.34, 0]);
    addPart(new THREE.BoxGeometry(0.14, 0.12, 0.26), navyJoints, 'musculo', `musculo_boot_${side}`, [side * 0.14, 0.14, 0.04]);
  });

  scene.add(group);
  return group;
}

/**
 * AstronautModel3D
 * Loads the production glTF model (/models/astronauta.glb) with an automatic
 * procedural PBR fallback, so the stage always renders.
 *
 * @param {Object} props
 * @param {'light'|'dark'} [props.theme] - Follows the app theme (see src/theme/theme.js).
 * @param {string|null} [props.selectedZone] - Highlighted zone: 'neuro' | 'cardio' | 'metabolic' | 'musculo' | 'radiation'.
 * @param {Record<string, 'optimal'|'warning'|'critical'>} [props.zoneStatus] - Status badge per zone.
 * @param {Record<string, string>} [props.zoneDetail] - One line per zone for the HUD (e.g. the reading behind its status).
 * @param {(zone: { id: string, zoneCode: string, name: string }) => void} [props.onSelectZone] - Click on a zone; `id` is the body system code.
 * @param {string} [props.height]
 * @param {boolean} [props.showHud]
 */
export default function AstronautModel3D({
  theme = 'dark',
  selectedZone = 'cardio',
  zoneStatus = {},
  zoneDetail = {},
  onSelectZone,
  height = '530px',
  showHud = true,
}) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.resolvedLanguage === 'en';
  const mountRef = useRef(null);
  const controlsRef = useRef(null);
  const resetCameraRef = useRef(null);
  const updateHighlightsRef = useRef(null);
  const onSelectZoneRef = useRef(onSelectZone);
  useEffect(() => {
    onSelectZoneRef.current = onSelectZone;
  }, [onSelectZone]);

  const [hoveredZone, setHoveredZone] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);

  const activeZone = selectedZone || null;
  const isDark = theme === 'dark';

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animationFrameId;
    let isDisposed = false;

    // 1. Escena y Cámara
    const scene = new THREE.Scene();
    scene.background = null;

    const width = container.clientWidth || 480;
    const heightPx = container.clientHeight || 530;

    const camera = new THREE.PerspectiveCamera(40, width / heightPx, 0.1, 50);
    // Far enough to keep the helmet below the HUD and the boots above the controls.
    const initialCamPos = new THREE.Vector3(0, 1.5, 3.9);
    const cameraTarget = new THREE.Vector3(0, 1.1, 0);
    camera.position.copy(initialCamPos);

    // 2. Renderer PBR con ToneMapping
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

    // 3. RoomEnvironment con PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    const envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    scene.environment = envTexture;

    // 4. Iluminación de estudio
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x0f172a, 1.25);
    hemiLight.position.set(0, 8, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x7dd3fc, 0.9);
    fillLight.position.set(-3.5, 3, -1);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    rimLight.position.set(0, 4, -4);
    scene.add(rimLight);

    // 5. OrbitControls fluido
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.copy(cameraTarget);
    controls.minDistance = 1.3;
    controls.maxDistance = 5.5;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.3;
    controlsRef.current = controls;

    resetCameraRef.current = () => {
      camera.position.copy(initialCamPos);
      controls.target.copy(cameraTarget);
      controls.update();
    };

    // 6. Colecciones e interactividad
    const activeZoneRef = { current: activeZone };
    const interactiveMeshes = [];
    const meshesByZone = {
      neuro: [],
      cardio: [],
      metabolic: [],
      musculo: [],
      radiation: [],
    };
    const platformRings = [];

    function applyZoneHighlights(zoneToHighlight, hoveredMesh) {
      interactiveMeshes.forEach((mesh) => {
        const mat = mesh.material;
        if (!mat || !mat.emissive) return;

        const isHovered = mesh === hoveredMesh;
        const isInActiveZone =
          zoneToHighlight === 'radiation'
            ? mesh.name?.includes('plss')
            : mesh.userData.zone === zoneToHighlight;

        if (isHovered) {
          mat.emissive.set(0x38bdf8);
          mat.emissiveIntensity = 0.65;
        } else if (isInActiveZone) {
          mat.emissive.set(0x06b6d4);
          mat.emissiveIntensity = 0.32;
        } else {
          mat.emissive.copy(mesh.userData.originalEmissive || new THREE.Color(0x000000));
          mat.emissiveIntensity = mesh.userData.originalEmissiveIntensity ?? 1.0;
        }
      });
    }

    updateHighlightsRef.current = (zone, hovered) => {
      activeZoneRef.current = zone;
      applyZoneHighlights(zone, hovered);
    };

    // 7. Carga de GLTFLoader con tiempo de espera configurable de 60 segundos y fallback
    const baseUrl = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
    const modelUrl = `${baseUrl}/models/astronauta.glb`;

    let isGlbResolved = false;
    const GLB_TIMEOUT_MS = 60000; // 60 segundos de espera máxima

    const glbTimeoutId = setTimeout(() => {
      if (!isGlbResolved && !isDisposed) {
        console.warn(`[AstronautModel3D] Tiempo límite de ${GLB_TIMEOUT_MS / 1000}s alcanzado para astronauta.glb. Activando fallback procedural...`);
        isGlbResolved = true;
        createProceduralFallback(scene, interactiveMeshes, meshesByZone, platformRings);
        setLoading(false);
        applyZoneHighlights(activeZoneRef.current, null);
      }
    }, GLB_TIMEOUT_MS);

    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        if (isDisposed || isGlbResolved) return;
        isGlbResolved = true;
        clearTimeout(glbTimeoutId);

        try {
          const root = gltf.scene;

          // A. Filtrar luces y cámaras de Blender
          const toRemove = [];
          root.traverse((child) => {
            if (
              child.isLight ||
              child.isCamera ||
              (child.name && (child.name.startsWith('preview_') || child.name.toLowerCase().includes('light')))
            ) {
              toRemove.push(child);
            }
          });
          toRemove.forEach((node) => {
            if (node.parent) node.parent.remove(node);
            if (typeof node.dispose === 'function') node.dispose();
          });

          // B. Escalado y centrado
          const initialBox = new THREE.Box3().setFromObject(root);
          const initialSize = new THREE.Vector3();
          initialBox.getSize(initialSize);

          const TARGET_HEIGHT = 2.08;
          const scaleFactor = TARGET_HEIGHT / (initialSize.y || 1);
          root.scale.setScalar(scaleFactor);

          const scaledBox = new THREE.Box3().setFromObject(root);
          const scaledCenter = new THREE.Vector3();
          scaledBox.getCenter(scaledCenter);

          root.position.x = -scaledCenter.x;
          root.position.z = -scaledCenter.z;
          root.position.y = -scaledBox.min.y;

          // C. Mallas interactivas
          root.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;

              if (child.name.startsWith('platform_')) {
                child.raycast = () => {};
                if (child.name.startsWith('platform_ring_')) {
                  platformRings.push(child);
                  if (child.material && child.material.emissive) {
                    child.material.emissiveIntensity = 2.2;
                  }
                }
                return;
              }

              if (child.material) {
                child.material = child.material.clone();
                child.userData.originalEmissive = child.material.emissive
                  ? child.material.emissive.clone()
                  : new THREE.Color(0x000000);
                child.userData.originalEmissiveIntensity = child.material.emissiveIntensity ?? 1.0;
              }

              let zone = null;
              if (child.name.startsWith('neuro_')) zone = 'neuro';
              else if (child.name.startsWith('cardio_')) zone = 'cardio';
              else if (child.name.startsWith('metabolic_')) zone = 'metabolic';
              else if (child.name.startsWith('musculo_')) zone = 'musculo';

              if (zone) {
                child.userData.zone = zone;
                child.userData.meshName = child.name;
                interactiveMeshes.push(child);
                meshesByZone[zone].push(child);

                if (child.name.includes('plss')) {
                  meshesByZone.radiation.push(child);
                }
              }
            }
          });

          scene.add(root);
          setLoading(false);
          applyZoneHighlights(activeZoneRef.current, null);
        } catch (procErr) {
          console.warn('[AstronautModel3D] Fallback a modelo procedural por error en glTF:', procErr);
          createProceduralFallback(scene, interactiveMeshes, meshesByZone, platformRings);
          setLoading(false);
          applyZoneHighlights(activeZoneRef.current, null);
        }
      },
      (xhr) => {
        if (xhr.total > 0) {
          const pct = Math.round((xhr.loaded / xhr.total) * 100);
          setLoadProgress(pct);
        }
      },
      (loadErr) => {
        if (isDisposed || isGlbResolved) return;
        isGlbResolved = true;
        clearTimeout(glbTimeoutId);
        console.warn('[AstronautModel3D] Activando astronauta procedural PBR tras error de carga:', loadErr);
        createProceduralFallback(scene, interactiveMeshes, meshesByZone, platformRings);
        setLoading(false);
        applyZoneHighlights(activeZoneRef.current, null);
      }
    );

    // 8. Raycaster para interacción
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);
    let currentHoveredMesh = null;

    const onPointerMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveMeshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hit !== currentHoveredMesh) {
          currentHoveredMesh = hit;
          renderer.domElement.style.cursor = 'pointer';
          const zone = hit.userData.zone;
          setHoveredZone(zone);
          applyZoneHighlights(activeZoneRef.current, hit);
        }
      } else {
        if (currentHoveredMesh) {
          currentHoveredMesh = null;
          renderer.domElement.style.cursor = 'default';
          setHoveredZone(null);
          applyZoneHighlights(activeZoneRef.current, null);
        }
      }
    };

    const onClick = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveMeshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const zone = hit.userData.zone;
        if (zone) {
          const meta = ZONE_SYSTEM_MAP[zone];
          if (onSelectZoneRef.current && meta) {
            onSelectZoneRef.current({
              id: meta.systemId,
              zoneCode: meta.zoneCode,
              name: meta.name,
            });
          }
        }
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('click', onClick);

    // 9. Render loop usando performance.now()
    const startTime = performance.now();
    const animate = () => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(animate);

      const elapsed = (performance.now() - startTime) * 0.001;

      if (platformRings.length > 0) {
        const pulse = 1.8 + Math.sin(elapsed * 2.5) * 0.45;
        platformRings.forEach((ring) => {
          if (ring.material) ring.material.emissiveIntensity = pulse;
        });
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 10. Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 480;
      const h = container.clientHeight || 530;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    // The stage also changes size without a window resize (layout breakpoints, sidebar).
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(handleResize);
    resizeObserver?.observe(container);

    return () => {
      isDisposed = true;
      clearTimeout(glbTimeoutId);
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('click', onClick);

      interactiveMeshes.forEach((mesh) => {
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
          else mesh.material.dispose();
        }
      });

      pmremGenerator.dispose();
      roomEnv.dispose?.();
      if (envTexture) envTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  useEffect(() => {
    if (updateHighlightsRef.current) {
      updateHighlightsRef.current(activeZone, null);
    }
  }, [activeZone]);

  const currentZoneData = activeZone ? ZONE_SYSTEM_MAP[activeZone] : null;
  const status = (activeZone && zoneStatus[activeZone]) || 'optimal';
  const zoneName = (zone) => (zone ? (isEn ? ZONE_SYSTEM_MAP[zone].nameEn : ZONE_SYSTEM_MAP[zone].name) : '');

  return (
    <div className={`astronaut-3d ${isDark ? 'is-dark' : 'is-light'}`} style={{ height }}>
      <div ref={mountRef} className="astronaut-3d-canvas" />

      {loading && (
        <div className="astronaut-3d-loading" role="status">
          <div className="astronaut-3d-spinner" aria-hidden="true" />
          <span>
            {t('model3d.loading')} {loadProgress > 0 ? `${loadProgress}%` : ''}
          </span>
        </div>
      )}

      <div className="astronaut-3d-controls">
        <button
          type="button"
          className={autoRotate ? 'is-on' : ''}
          aria-pressed={autoRotate}
          onClick={() => setAutoRotate((prev) => !prev)}
        >
          {autoRotate ? t('model3d.stopRotation') : t('model3d.autoRotate')}
        </button>
        <button type="button" onClick={() => resetCameraRef.current?.()}>
          {t('model3d.recenter')}
        </button>
      </div>

      {showHud && currentZoneData && (
        <div className="astronaut-3d-hud">
          <div className="astronaut-3d-hud-top">
            <span className="astronaut-3d-hud-label">
              {hoveredZone ? t('model3d.inspecting', { zone: zoneName(hoveredZone) }) : t('model3d.activeZone')}
            </span>
            <span className={`astronaut-3d-badge is-${status}`}>{t(`model3d.status.${status}`)}</span>
          </div>
          <div className="astronaut-3d-hud-name">{zoneName(activeZone)}</div>
          {zoneDetail[activeZone] && <div className="astronaut-3d-hud-detail">{zoneDetail[activeZone]}</div>}
        </div>
      )}
    </div>
  );
}
