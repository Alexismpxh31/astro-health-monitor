import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const ZONE_SYSTEM_MAP = {
  neuro: {
    systemId: 'behavioral',
    zoneCode: 'neuro',
    name: 'Casco y Sistema Neuro-Vestibular',
    nameEn: 'Helmet & Neuro-Vestibular System',
    region: 'Visor Presurizado / Unidad Cefálica',
    metric: 'Presión Casco · O₂',
    value: '4.30 psi · 99.6 %',
    status: 'optimal',
    detail: 'Sello cervical hermético nominal; parámetros ópticos y vestibulares estables.',
  },
  cardio: {
    systemId: 'cardiovascular',
    zoneCode: 'cardio',
    name: 'Coraza Pectoral (HUT) y Mochila PLSS',
    nameEn: 'Torso (HUT) & PLSS Life Support',
    region: 'Tórax y Soporte Vital Primario',
    metric: 'Ritmo Cardíaco · Refrigeración LCVG',
    value: '74 BPM · 21.2 °C',
    status: 'optimal',
    detail: 'Circulación térmica y gasto cardíaco en rangos nominales de misión.',
  },
  metabolic: {
    systemId: 'immune',
    zoneCode: 'metabolic',
    name: 'Corsé Abdominal y Regulación Pélvica',
    nameEn: 'Abdominal Yoke & Metabolic Harness',
    region: 'Cintura Articulada / Inmune & SANS',
    metric: 'Hidratación · Termorregulación',
    value: '96.5 % · Nominal',
    status: 'optimal',
    detail: 'Presión compartimental estable; balance electrolítico controlado.',
  },
  musculo: {
    systemId: 'musculoskeletal',
    zoneCode: 'musculo',
    name: 'Extremidades, Guantes y Botas EVA',
    nameEn: 'EVA Limbs, Gloves & Lunar Boots',
    region: 'Articulaciones de Fuelle y Tracción Lunar',
    metric: 'Carga Mecánica · Articular',
    value: '94 % · Nominal',
    status: 'optimal',
    detail: 'Fuelles de codo/rodilla y suelas de alta tracción operando con fluidez.',
  },
  radiation: {
    systemId: 'radiation',
    zoneCode: 'radiation',
    name: 'Blindaje Multicapa (TMG) y Dosimetría',
    nameEn: 'Multilayer Insulation & Dosimetry',
    region: 'Mochila PLSS y Blindaje Integral',
    metric: 'Tasa Dosis Diaria Absorbida',
    value: '0.35 mSv/d',
    status: 'optimal',
    detail: 'Atenuación biológica contra radiación cósmica galáctica en rango seguro.',
  },
};

const STATUS_BADGE = {
  optimal: { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.14)', label: 'Nominal' },
  warning: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.14)', label: 'Precaución' },
  critical: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.14)', label: 'Alerta' },
};

/**
 * AstronautModel3D
 * Carga el modelo PBR de producción glTF (/models/astronauta.glb)
 * optimizado con RoomEnvironment, iluminación de estudio suave,
 * descarte de luces de Blender, plataforma integrada e interactividad total.
 */
export default function AstronautModel3D({
  theme = 'dark',
  embedded = true,
  selectedZone = 'cardio',
  onSelectZone,
  height = '530px',
  showHud = true,
}) {
  const mountRef = useRef(null);
  const controlsRef = useRef(null);
  const resetCameraRef = useRef(null);
  const updateHighlightsRef = useRef(null);

  const [activeZone, setActiveZone] = useState(selectedZone || 'cardio');
  const [hoveredZone, setHoveredZone] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadError, setLoadError] = useState(null);

  const isDark = theme === 'dark' || embedded;

  // Sincronizar activeZone con prop externa
  useEffect(() => {
    if (selectedZone && selectedZone !== activeZone) {
      setActiveZone(selectedZone);
    }
  }, [selectedZone]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animationFrameId;
    let isDisposed = false;

    // 1. Escena y Cámara
    const scene = new THREE.Scene();
    scene.background = null; // Canvas transparente para integrarse con el fondo cósmico

    const width = container.clientWidth || 480;
    const heightPx = container.clientHeight || 530;

    const camera = new THREE.PerspectiveCamera(40, width / heightPx, 0.1, 50);
    // Posición ergonómica centrada en el torso del astronauta
    const initialCamPos = new THREE.Vector3(0, 1.25, 2.85);
    const cameraTarget = new THREE.Vector3(0, 1.04, 0);
    camera.position.copy(initialCamPos);

    // 2. Renderer con PBR, ToneMapping y Antialiasing
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
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 3. RoomEnvironment con PMREMGenerator (reflejos hiper-realistas en visor y metal)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    const envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    scene.environment = envTexture;

    // 4. Iluminación de estudio propia equilibrada (suave, sin quemar blancos)
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
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // No atravesar la base
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.3;
    controlsRef.current = controls;

    resetCameraRef.current = () => {
      camera.position.copy(initialCamPos);
      controls.target.copy(cameraTarget);
      controls.update();
    };

    // Colecciones para interacción
    const interactiveMeshes = [];
    const meshesByZone = {
      neuro: [],
      cardio: [],
      metabolic: [],
      musculo: [],
      radiation: [],
    };
    let platformRings = [];

    // 6. Carga de GLTFLoader
    const loader = new GLTFLoader();
    loader.load(
      '/models/astronauta.glb',
      (gltf) => {
        if (isDisposed) return;

        const root = gltf.scene;

        // A. DESACTIVAR Y ELIMINAR LUCES Y CÁMARAS EXPORTADAS DE BLENDER
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

        // B. ESCALADO Y CENTRADO AUTOMÁTICO (~2.08 unidades de alto, base en Y = 0)
        const initialBox = new THREE.Box3().setFromObject(root);
        const initialSize = new THREE.Vector3();
        initialBox.getSize(initialSize);

        const TARGET_HEIGHT = 2.08;
        const scaleFactor = TARGET_HEIGHT / (initialSize.y || 1);
        root.scale.setScalar(scaleFactor);

        // Recomputar bounding box tras escalar
        const scaledBox = new THREE.Box3().setFromObject(root);
        const scaledCenter = new THREE.Vector3();
        scaledBox.getCenter(scaledCenter);

        // Centrar en X y Z, y posar base de plataforma exactamente en Y = 0
        root.position.x = -scaledCenter.x;
        root.position.z = -scaledCenter.z;
        root.position.y = -scaledBox.min.y;

        // C. MAPEO DE MALLAS INTERACTIVAS Y CLONACIÓN DE MATERIALES
        root.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            // Nodos de plataforma: excluir de Raycaster
            if (child.name.startsWith('platform_')) {
              child.raycast = () => {}; // Desactiva intersección
              if (child.name.startsWith('platform_ring_')) {
                platformRings.push(child);
                if (child.material && child.material.emissive) {
                  child.material.emissiveIntensity = 2.2;
                }
              }
              return;
            }

            // Clonar material individual para resaltar por pieza sin alterar otras
            if (child.material) {
              child.material = child.material.clone();
              child.userData.originalEmissive = child.material.emissive
                ? child.material.emissive.clone()
                : new THREE.Color(0x000000);
              child.userData.originalEmissiveIntensity = child.material.emissiveIntensity ?? 1.0;
            }

            // Determinar zona interactiva según prefijo
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

              // Si es componente PLSS, vincular también a radiación (soporte vital & blindaje)
              if (child.name.includes('plss')) {
                meshesByZone.radiation.push(child);
              }
            }
          }
        });

        scene.add(root);
        setLoading(false);
        // Resaltar la zona activa inicial una vez cargado el modelo
        applyZoneHighlights(activeZoneRef.current, null);
      },
      (xhr) => {
        if (xhr.total > 0) {
          const pct = Math.round((xhr.loaded / xhr.total) * 100);
          setLoadProgress(pct);
        }
      },
      (err) => {
        console.error('[AstronautModel3D] Error cargando astronauta.glb:', err);
        setLoadError('Error al cargar astronauta.glb');
        setLoading(false);
      }
    );

    // 7. Raycaster para detección de Hover y Clic
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);
    let currentHoveredMesh = null;

    function applyZoneHighlights(zoneToHighlight, hoveredMesh) {
      interactiveMeshes.forEach((mesh) => {
        const mat = mesh.material;
        if (!mat || !mat.emissive) return;

        const isHovered = mesh === hoveredMesh;
        const isInActiveZone =
          zoneToHighlight === 'radiation'
            ? mesh.name.includes('plss')
            : mesh.userData.zone === zoneToHighlight;

        if (isHovered) {
          // Hover individual: cian brillante focalizado
          mat.emissive.set(0x38bdf8);
          mat.emissiveIntensity = 0.65;
        } else if (isInActiveZone) {
          // Zona seleccionada: fulgor cian elegante y sutil
          mat.emissive.set(0x06b6d4);
          mat.emissiveIntensity = 0.32;
        } else {
          // Estado normal
          mat.emissive.copy(mesh.userData.originalEmissive || new THREE.Color(0x000000));
          mat.emissiveIntensity = mesh.userData.originalEmissiveIntensity ?? 1.0;
        }
      });
    }

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
          setActiveZone(zone);
          const meta = ZONE_SYSTEM_MAP[zone];
          if (onSelectZone && meta) {
            onSelectZone({
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

    // Ref para el render loop y llamadas externas
    const activeZoneRef = { current: activeZone };
    updateHighlightsRef.current = (zone, hovered) => {
      activeZoneRef.current = zone;
      applyZoneHighlights(zone, hovered);
    };

    // 8. Render loop
    const clock = new THREE.Clock();
    const animate = () => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();

      // Pulsación sutil en anillos de luz de la plataforma
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

    // 9. Resize observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 480;
      const h = container.clientHeight || 530;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
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
  }, []);

  // Actualizar auto-rotate en el control
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Actualizar resaltado en el modelo 3D al cambiar activeZone
  useEffect(() => {
    if (updateHighlightsRef.current) {
      updateHighlightsRef.current(activeZone, null);
    }
  }, [activeZone]);

  const currentZoneData = ZONE_SYSTEM_MAP[activeZone] || ZONE_SYSTEM_MAP.cardio;
  const currentBadge = STATUS_BADGE[currentZoneData.status] || STATUS_BADGE.optimal;

  return (
    <div
      className={`astronaut-3d-wrapper ${isDark ? 'is-dark' : 'is-light'}`}
      style={{
        position: 'relative',
        width: '100%',
        height,
        minHeight: '440px',
        overflow: 'hidden',
        borderRadius: '16px',
        userSelect: 'none',
      }}
    >
      {/* Canvas container */}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Loading overlay */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(11, 18, 32, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 10,
            color: '#38bdf8',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              border: '3px solid rgba(56, 189, 248, 0.2)',
              borderTopColor: '#38bdf8',
              borderRadius: '50%',
              animation: 'spin 0.9s linear infinite',
              marginBottom: '14px',
            }}
          />
          <span style={{ fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.04em' }}>
            Cargando Modelo EVA 3D... {loadProgress > 0 ? `${loadProgress}%` : ''}
          </span>
          <span style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '4px' }}>
            Texturas PBR & Mallas Anatómicas
          </span>
        </div>
      )}

      {/* Error state */}
      {loadError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(11, 18, 32, 0.85)',
            color: '#ef4444',
            fontSize: '0.9rem',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          {loadError}
        </div>
      )}

      {/* Control Buttons Floating Pill */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px',
          background: isDark ? 'rgba(17, 26, 46, 0.88)' : 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(12px)',
          border: isDark ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid rgba(14, 165, 233, 0.25)',
          borderRadius: '9999px',
          padding: '4px 10px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
          zIndex: 5,
        }}
      >
        <button
          type="button"
          onClick={() => setAutoRotate((prev) => !prev)}
          style={{
            background: autoRotate
              ? 'rgba(6, 182, 212, 0.18)'
              : 'transparent',
            color: autoRotate ? '#38bdf8' : (isDark ? '#94a3b8' : '#475569'),
            border: 'none',
            borderRadius: '9999px',
            padding: '6px 12px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <span>{autoRotate ? '⏸ Detener Giro' : '🔄 Auto-Giro 360°'}</span>
        </button>

        <button
          type="button"
          onClick={() => resetCameraRef.current?.()}
          style={{
            background: 'transparent',
            color: isDark ? '#94a3b8' : '#475569',
            border: 'none',
            borderRadius: '9999px',
            padding: '6px 12px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          ⌖ Recentrar
        </button>
      </div>

      {/* Floating HUD Telemetry Card */}
      {showHud && (
        <div
          style={{
            position: 'absolute',
            top: '14px',
            left: '14px',
            right: '14px',
            pointerEvents: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            zIndex: 4,
          }}
        >
          <div
            style={{
              pointerEvents: 'auto',
              background: isDark ? 'rgba(17, 26, 46, 0.85)' : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(12px)',
              border: isDark ? '1px solid rgba(56, 189, 248, 0.22)' : '1px solid rgba(14, 165, 233, 0.25)',
              borderRadius: '12px',
              padding: '10px 14px',
              maxWidth: '310px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#38bdf8', fontWeight: 700 }}>
                {hoveredZone ? `Inspeccionando: ${hoveredZone.toUpperCase()}` : 'Zona Activa'}
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: currentBadge.color,
                  background: currentBadge.bg,
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  border: `1px solid ${currentBadge.color}33`,
                }}
              >
                ● {currentBadge.label}
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isDark ? '#f1f5f9' : '#0f172a', lineHeight: 1.25 }}>
              {currentZoneData.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: '2px' }}>
              {currentZoneData.metric}: <strong style={{ color: '#38bdf8' }}>{currentZoneData.value}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Keyframe animation for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
