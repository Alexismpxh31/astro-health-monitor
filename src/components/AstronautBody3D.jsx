import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const DEFAULT_TELEMETRY = {
  neuro: {
    id: 'neuro',
    name: 'Casco y Sistema Neuro-Vestibular',
    region: 'Visor Presurizado / Cráneo',
    metric: 'Presión de Casco · O₂',
    value: '4.3 psi · 99.4 %',
    status: 'optimal',
    detail: 'Sellado hermético nominal; telemetría óptica y vestibular estable.'
  },
  cardio: {
    id: 'cardio',
    name: 'Tórax y Soporte Vital (PLSS)',
    region: 'Pechera HUT / Mochila Dorsal',
    metric: 'Ritmo Cardíaco · Regulación Térmica',
    value: '72 BPM · 21.4 °C',
    status: 'optimal',
    detail: 'Flujo de refrigeración líquida y frecuencia cardíaca dentro de rango.'
  },
  metabolic: {
    id: 'metabolic',
    name: 'Abdomen y Cintura Articulada',
    region: 'Corsé Abdominal / Arnés Pélvico',
    metric: 'Hidratación · Presión Traje',
    value: '96.8 % · Nominal',
    status: 'warning',
    detail: 'Ligero descenso hídrico; recomendada ingesta de 300 ml por válvula.'
  },
  musculo: {
    id: 'musculo',
    name: 'Extremidades, Guantes y Botas EVA',
    region: 'Articulaciones de Codo, Rodilla y Calzado',
    metric: 'Carga Mecánica · Tracción',
    value: '91 % · Estable',
    status: 'optimal',
    detail: 'Movilidad en articulaciones azul marino y anclaje de botas sin fatiga.'
  },
  radiation: {
    id: 'radiation',
    name: 'Blindaje Integral y Dosimetría',
    region: 'Cobertura Completa del Traje',
    metric: 'Dosis Acumulada EVA',
    value: '18.4 mSv',
    status: 'optimal',
    detail: 'Atenuación térmica y contra radiación solar operando correctamente.'
  }
};

const STATUS_BADGE = {
  optimal: { color: '#0284c7', bg: 'rgba(2, 132, 199, 0.12)', label: 'Óptimo' },
  warning: { color: '#d97706', bg: 'rgba(217, 119, 6, 0.12)', label: 'Atención' },
  critical: { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.12)', label: 'Alerta' }
};

/**
 * Genera texturas procedurales de alta nitidez (Logo NASA, Bandera EE.UU., insignias y micro-tejido)
 */
function createSuitTextures() {
  // 1. Logo circular NASA ("Meatball")
  const nasaCanvas = document.createElement('canvas');
  nasaCanvas.width = 512;
  nasaCanvas.height = 512;
  const nCtx = nasaCanvas.getContext('2d');

  nCtx.clearRect(0, 0, 512, 512);
  // Círculo azul NASA
  nCtx.beginPath();
  nCtx.arc(256, 256, 215, 0, Math.PI * 2);
  nCtx.fillStyle = '#105bd8';
  nCtx.fill();

  // Estrellas blancas de fondo
  nCtx.fillStyle = '#ffffff';
  const stars = [
    [150, 145, 3.5], [195, 115, 2.5], [310, 125, 3.2], [355, 165, 2.5],
    [130, 305, 2.8], [185, 360, 3.5], [320, 355, 3.0], [375, 295, 2.5],
    [255, 100, 2.2], [240, 395, 2.8], [165, 200, 2.0], [345, 215, 2.2]
  ];
  stars.forEach(([x, y, r]) => {
    nCtx.beginPath();
    nCtx.arc(x, y, r, 0, Math.PI * 2);
    nCtx.fill();
  });

  // Vector rojo en V (Chevron)
  nCtx.save();
  nCtx.beginPath();
  nCtx.moveTo(65, 295);
  nCtx.lineTo(252, 130);
  nCtx.lineTo(312, 232);
  nCtx.lineTo(445, 125);
  nCtx.lineTo(298, 272);
  nCtx.lineTo(244, 182);
  nCtx.closePath();
  nCtx.fillStyle = '#e03c31';
  nCtx.fill();
  nCtx.restore();

  // Órbita blanca elíptica
  nCtx.save();
  nCtx.translate(256, 262);
  nCtx.rotate(-0.34);
  nCtx.beginPath();
  nCtx.ellipse(0, 0, 218, 66, 0, 0, Math.PI * 2);
  nCtx.lineWidth = 10;
  nCtx.strokeStyle = '#ffffff';
  nCtx.stroke();
  nCtx.restore();

  // Texto NASA
  nCtx.fillStyle = '#ffffff';
  nCtx.font = '900 94px Georgia, "Times New Roman", serif';
  nCtx.textAlign = 'center';
  nCtx.textBaseline = 'middle';
  nCtx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  nCtx.shadowBlur = 8;
  nCtx.fillText('NASA', 256, 266);

  const nasaTexture = new THREE.CanvasTexture(nasaCanvas);
  nasaTexture.colorSpace = THREE.SRGBColorSpace;
  nasaTexture.anisotropy = 8;

  // 2. Bandera de Estados Unidos (brazo izquierdo)
  const flagCanvas = document.createElement('canvas');
  flagCanvas.width = 512;
  flagCanvas.height = 320;
  const fCtx = flagCanvas.getContext('2d');

  // Fondo blanco y 13 franjas
  fCtx.fillStyle = '#ffffff';
  fCtx.fillRect(0, 0, 512, 320);
  const stripeH = 320 / 13;
  fCtx.fillStyle = '#b91c1c';
  for (let i = 0; i < 13; i += 2) {
    fCtx.fillRect(0, i * stripeH, 512, stripeH);
  }
  // Cantón azul
  fCtx.fillStyle = '#1e3a8a';
  fCtx.fillRect(0, 0, 215, stripeH * 7);
  // Estrellas blancas
  fCtx.fillStyle = '#ffffff';
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 6; col++) {
      fCtx.beginPath();
      fCtx.arc(20 + col * 34, 18 + row * 33, 4.2, 0, Math.PI * 2);
      fCtx.fill();
    }
  }
  // Borde fino bordado
  fCtx.strokeStyle = '#cbd5e1';
  fCtx.lineWidth = 10;
  fCtx.strokeRect(5, 5, 502, 310);

  const flagTexture = new THREE.CanvasTexture(flagCanvas);
  flagTexture.colorSpace = THREE.SRGBColorSpace;
  flagTexture.anisotropy = 8;

  // 3. Insignias superiores de pecho (azul izquierda, verde/teal derecha)
  const createMiniBadge = (bgHex, accentHex) => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 80;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bgHex;
    ctx.beginPath();
    ctx.roundRect(4, 4, 120, 72, 14);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.fillStyle = accentHex;
    ctx.beginPath();
    ctx.arc(64, 40, 18, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  const leftChestBadgeTex = createMiniBadge('#0284c7', '#f8fafc');
  const rightChestBadgeTex = createMiniBadge('#0f766e', '#fde047');

  // 4. Textura sutil de tejido técnico (Ortho-fabric) para el traje blanco
  const fabricCanvas = document.createElement('canvas');
  fabricCanvas.width = 128;
  fabricCanvas.height = 128;
  const wCtx = fabricCanvas.getContext('2d');
  wCtx.fillStyle = '#808080';
  wCtx.fillRect(0, 0, 128, 128);
  wCtx.fillStyle = '#8d8d8d';
  for (let y = 0; y < 128; y += 4) {
    for (let x = 0; x < 128; x += 4) {
      if ((x + y) % 8 === 0) {
        wCtx.fillRect(x, y, 2, 2);
      }
    }
  }
  const bumpTexture = new THREE.CanvasTexture(fabricCanvas);
  bumpTexture.wrapS = THREE.RepeatWrapping;
  bumpTexture.wrapT = THREE.RepeatWrapping;
  bumpTexture.repeat.set(18, 18);

  return {
    nasaTexture,
    flagTexture,
    leftChestBadgeTex,
    rightChestBadgeTex,
    bumpTexture
  };
}

export default function AstronautModel3D({
  telemetry = DEFAULT_TELEMETRY,
  onSelectZone,
  selectedZone: propSelectedZone,
  embedded = false,
  height = '100%'
}) {
  const mountRef = useRef(null);
  const autoRotateRef = useRef(false);
  const selectedZoneRef = useRef('cardio');

  const [selectedZone, setSelectedZone] = useState('cardio');
  const [hoveredZone, setHoveredZone] = useState(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showHud, setShowHud] = useState(true);

  useEffect(() => {
    if (propSelectedZone) {
      setSelectedZone(propSelectedZone);
      selectedZoneRef.current = propSelectedZone;
    }
  }, [propSelectedZone]);

  const activeData = telemetry[selectedZone] || DEFAULT_TELEMETRY[selectedZone];
  const badgeStyle = STATUS_BADGE[activeData?.status || 'optimal'];

  const handleSelectZone = (zoneId) => {
    setSelectedZone(zoneId);
    selectedZoneRef.current = zoneId;
    if (onSelectZone && telemetry[zoneId]) {
      onSelectZone(telemetry[zoneId]);
    }
  };

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 680;
    const height = container.clientHeight || 640;

    // 1. Escena limpia estilo estudio claro (como la referencia)
    const scene = new THREE.Scene();
    if (!embedded) {
      scene.background = new THREE.Color(0xeef4fc);
      scene.fog = new THREE.Fog(0xeef4fc, 6.5, 14);
    }

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
    camera.position.set(0, embedded ? 1.05 : 1.15, embedded ? 3.9 : 4.15);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (embedded) {
      renderer.setClearColor(0x000000, 0);
    }
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.appendChild(renderer.domElement);

    // 2. Controles orbitales centrados en el astronauta
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 1.06, 0);
    controls.minDistance = 1.6;
    controls.maxDistance = 6.5;
    controls.maxPolarAngle = Math.PI * 0.52;

    // 3. Iluminación de estudio de alta definición
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 1.15);
    hemiLight.position.set(0, 5, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.45);
    keyLight.position.set(2.8, 4.6, 3.6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 12;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.75);
    fillLight.position.set(-3.2, 2.2, 2.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.85);
    rimLight.position.set(0, 3.0, -3.5);
    scene.add(rimLight);

    // 4. Texturas y materiales exactos del traje
    const textures = createSuitTextures();

    const whiteSuitMat = new THREE.MeshStandardMaterial({
      color: 0xf7f9fc,
      roughness: 0.42,
      metalness: 0.04,
      bumpMap: textures.bumpTexture,
      bumpScale: 0.0025
    });

    const whiteArmorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.28,
      metalness: 0.08
    });

    const navyJointMat = new THREE.MeshStandardMaterial({
      color: 0x0b1d3a,
      roughness: 0.48,
      metalness: 0.14
    });

    const navySoleMat = new THREE.MeshStandardMaterial({
      color: 0x071326,
      roughness: 0.65,
      metalness: 0.1
    });

    const metalClipMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.22,
      metalness: 0.88
    });

    const visorGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x030814,
      emissive: 0x04122b,
      emissiveIntensity: 0.35,
      roughness: 0.06,
      metalness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 1.0
    });

    // Registro de piezas interactivas
    const interactiveMeshes = [];
    const astronaut = new THREE.Group();
    scene.add(astronaut);

    const addPart = (geometry, material, zoneId, pos, rot = [0, 0, 0], scale = [1, 1, 1], parent = astronaut) => {
      // Clonamos el material solo si es interactivo para poder iluminar por zona al hacer hover/selección
      const mat = zoneId ? material.clone() : material;
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.position.set(...pos);
      mesh.rotation.set(...rot);
      mesh.scale.set(...scale);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (zoneId) {
        mesh.userData.zoneId = zoneId;
        interactiveMeshes.push(mesh);
      }
      parent.add(mesh);
      return mesh;
    };

    // =========================================================
    // A. CASCO Y VISOR (Zona: neuro)
    // =========================================================
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.92, 0.01);
    astronaut.add(headGroup);

    // Anillo de cuello azul marino + sello blanco
    addPart(new THREE.CylinderGeometry(0.145, 0.165, 0.065, 32), navyJointMat, 'neuro', [0, -0.165, 0], [0, 0, 0], [1.05, 1, 1.02], headGroup);
    addPart(new THREE.TorusGeometry(0.152, 0.016, 14, 36), whiteArmorMat, 'neuro', [0, -0.135, 0], [Math.PI / 2, 0, 0], [1.05, 1.02, 1], headGroup);

    // Domo principal blanco del casco
    addPart(new THREE.SphereGeometry(0.205, 36, 36), whiteArmorMat, 'neuro', [0, 0.01, -0.005], [0, 0, 0], [1.0, 1.04, 1.05], headGroup);

    // Marco exterior azul marino del visor
    addPart(
      new THREE.TorusGeometry(0.148, 0.022, 18, 40),
      navyJointMat,
      'neuro',
      [0, 0.012, 0.142],
      [-0.08, 0, 0],
      [1.06, 0.94, 0.85],
      headGroup
    );

    // Cristal oscuro brillante del visor
    addPart(
      new THREE.SphereGeometry(0.155, 32, 28, -Math.PI * 0.42, Math.PI * 0.84, 0.25, 1.15),
      visorGlassMat,
      'neuro',
      [0, 0.012, 0.068],
      [-0.08, Math.PI * 0.5, 0],
      [0.95, 0.92, 1.04],
      headGroup
    );

    // Cápsulas laterales de comunicación (orejeras del casco)
    [-1, 1].forEach((side) => {
      addPart(
        new THREE.CylinderGeometry(0.056, 0.062, 0.036, 24),
        whiteArmorMat,
        'neuro',
        [side * 0.202, 0.008, -0.01],
        [0, 0, Math.PI / 2],
        [1, 1, 1],
        headGroup
      );
      addPart(
        new THREE.TorusGeometry(0.046, 0.009, 12, 24),
        navyJointMat,
        'neuro',
        [side * 0.218, 0.008, -0.01],
        [0, Math.PI / 2, 0],
        [1, 1, 1],
        headGroup
      );
    });

    // =========================================================
    // B. MOCHILA DE SOPORTE VITAL PLSS (Zona: cardio)
    // =========================================================
    const backpackGroup = new THREE.Group();
    backpackGroup.position.set(0, 1.56, -0.225);
    astronaut.add(backpackGroup);

    // Cuerpo principal de la mochila blanca
    addPart(new THREE.BoxGeometry(0.38, 0.48, 0.16), whiteSuitMat, 'cardio', [0, 0, 0], [0, 0, 0], [1, 1, 1], backpackGroup);
    // Módulo superior redondeado
    addPart(new THREE.CapsuleGeometry(0.14, 0.16, 10, 20), whiteArmorMat, 'cardio', [0, 0.23, 0.01], [0, 0, Math.PI / 2], [0.55, 1, 0.85], backpackGroup);
    // Detalles superiores azul marino en las esquinas de la mochila
    [-1, 1].forEach((side) => {
      addPart(new THREE.BoxGeometry(0.065, 0.075, 0.168), navyJointMat, 'cardio', [side * 0.155, 0.205, 0], [0, 0, 0], [1, 1, 1], backpackGroup);
    });
    // Franja inferior azul marino de la mochila
    addPart(new THREE.BoxGeometry(0.36, 0.045, 0.166), navyJointMat, 'cardio', [0, -0.22, 0], [0, 0, 0], [1, 1, 1], backpackGroup);

    // =========================================================
    // C. TORSO SUPERIOR, ARNESES Y LOGO NASA (Zona: cardio)
    // =========================================================
    // Coraza pectoral blanca (HUT)
    addPart(new THREE.CylinderGeometry(0.225, 0.195, 0.34, 32), whiteSuitMat, 'cardio', [0, 1.56, 0.01], [0, 0, 0], [1.18, 1, 0.78]);
    // Hombros superiores / trapecio
    addPart(new THREE.SphereGeometry(0.225, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.5), whiteArmorMat, 'cardio', [0, 1.69, 0.0], [0, 0, 0], [1.18, 0.45, 0.78]);

    // Placa pectoral frontal con el logo NASA exacto
    const nasaDecalMat = new THREE.MeshStandardMaterial({
      map: textures.nasaTexture,
      transparent: true,
      roughness: 0.35,
      metalness: 0.05,
      depthWrite: false
    });
    const chestLogo = new THREE.Mesh(new THREE.PlaneGeometry(0.155, 0.155), nasaDecalMat);
    chestLogo.position.set(0, 1.565, 0.178);
    chestLogo.rotation.x = -0.06;
    chestLogo.userData.zoneId = 'cardio';
    astronaut.add(chestLogo);

    // Correas verticales azul marino sobre los hombros + hebillas metálicas
    [-1, 1].forEach((side) => {
      // Tramo frontal del arnés
      addPart(
        new THREE.BoxGeometry(0.044, 0.21, 0.025),
        navyJointMat,
        'cardio',
        [side * 0.168, 1.625, 0.148],
        [-0.14, side * 0.12, side * -0.05]
      );
      // Arco sobre el hombro hacia la mochila
      addPart(
        new THREE.TorusGeometry(0.125, 0.022, 12, 24, Math.PI * 0.85),
        navyJointMat,
        'cardio',
        [side * 0.172, 1.695, -0.01],
        [0.08, Math.PI / 2, 0]
      );
      // Hebilla metálica plateada
      addPart(
        new THREE.BoxGeometry(0.052, 0.022, 0.032),
        metalClipMat,
        'cardio',
        [side * 0.168, 1.605, 0.155],
        [-0.14, side * 0.12, side * -0.05]
      );
    });

    // Dos micro-insignias superiores en la clavícula (azul izquierda, verde/teal derecha)
    const leftBadgeMat = new THREE.MeshStandardMaterial({ map: textures.leftChestBadgeTex, transparent: true, roughness: 0.4 });
    const leftBadge = new THREE.Mesh(new THREE.PlaneGeometry(0.048, 0.03), leftBadgeMat);
    leftBadge.position.set(-0.115, 1.675, 0.156);
    leftBadge.rotation.set(-0.22, -0.18, 0);
    astronaut.add(leftBadge);

    const rightBadgeMat = new THREE.MeshStandardMaterial({ map: textures.rightChestBadgeTex, transparent: true, roughness: 0.4 });
    const rightBadge = new THREE.Mesh(new THREE.PlaneGeometry(0.048, 0.03), rightBadgeMat);
    rightBadge.position.set(0.115, 1.675, 0.156);
    rightBadge.rotation.set(-0.22, 0.18, 0);
    astronaut.add(rightBadge);

    // =========================================================
    // D. ABDOMEN Y ARNÉS PÉLVICO EN "V" AZUL MARINO (Zona: metabolic)
    // =========================================================
    // Abdomen blanco segmentado
    addPart(new THREE.CylinderGeometry(0.195, 0.188, 0.21, 28), whiteSuitMat, 'metabolic', [0, 1.31, 0.005], [0, 0, 0], [1.14, 1, 0.76]);
    // Pliegues horizontales del corsé abdominal
    [1.36, 1.28].forEach((yPos) => {
      addPart(new THREE.TorusGeometry(0.192, 0.008, 10, 32), whiteArmorMat, 'metabolic', [0, yPos, 0.005], [Math.PI / 2, 0, 0], [1.14, 0.77, 1]);
    });

    // Cinturón superior azul marino
    addPart(new THREE.CylinderGeometry(0.192, 0.196, 0.048, 32), navyJointMat, 'metabolic', [0, 1.195, 0.005], [0, 0, 0], [1.15, 1, 0.78]);

    // Pieza pélvica blanca frontal + arnés azul marino en "Y / V" entre las piernas
    addPart(new THREE.SphereGeometry(0.185, 24, 20), whiteSuitMat, 'metabolic', [0, 1.09, 0.005], [0, 0, 0], [1.08, 0.85, 0.76]);
    // Franjas curvas azul marino alrededor de la ingle (izquierda y derecha)
    [-1, 1].forEach((side) => {
      addPart(
        new THREE.TorusGeometry(0.135, 0.024, 14, 28, Math.PI * 0.95),
        navyJointMat,
        'metabolic',
        [side * 0.115, 1.095, 0.015],
        [0.18, side * 0.65, side * -0.35],
        [1, 1.15, 0.85]
      );
    });

    // =========================================================
    // E. BRAZOS, PARCHES, CODOS Y GUANTES (Zona: musculo)
    // =========================================================
    [-1, 1].forEach((side) => {
      const armRoot = new THREE.Group();
      armRoot.position.set(side * 0.285, 1.63, 0);
      armRoot.rotation.set(0.04, 0, side * -0.17);
      astronaut.add(armRoot);

      // Anillo articulado de hombro azul marino + hombrera blanca
      addPart(new THREE.SphereGeometry(0.088, 22, 22), navyJointMat, 'musculo', [0, 0, 0], [0, 0, 0], [1, 1, 1], armRoot);
      addPart(new THREE.SphereGeometry(0.094, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.6), whiteArmorMat, 'musculo', [side * 0.012, 0.015, 0], [0, 0, side * -0.25], [1, 1.05, 1], armRoot);

      // Bíceps / brazo superior blanco
      addPart(new THREE.CylinderGeometry(0.078, 0.068, 0.24, 22), whiteSuitMat, 'musculo', [side * 0.02, -0.14, 0], [0, 0, 0], [1, 1, 1], armRoot);

      // Parche de brazo: NASA en brazo derecho (side = -1), Bandera EE.UU. en brazo izquierdo (side = +1)
      if (side === -1) {
        const armNasaMat = new THREE.MeshStandardMaterial({ map: textures.nasaTexture, transparent: true, roughness: 0.4 });
        const armNasa = new THREE.Mesh(new THREE.PlaneGeometry(0.085, 0.085), armNasaMat);
        armNasa.position.set(-0.096, -0.11, 0.01);
        armNasa.rotation.set(0, -Math.PI / 2, 0);
        armRoot.add(armNasa);
      } else {
        const armFlagMat = new THREE.MeshStandardMaterial({ map: textures.flagTexture, transparent: true, roughness: 0.4 });
        const armFlag = new THREE.Mesh(new THREE.PlaneGeometry(0.095, 0.062), armFlagMat);
        armFlag.position.set(0.096, -0.11, 0.01);
        armFlag.rotation.set(0, Math.PI / 2, 0);
        armRoot.add(armFlag);
      }

      // Codo articulado azul marino con pliegues
      addPart(new THREE.SphereGeometry(0.068, 20, 20), navyJointMat, 'musculo', [side * 0.02, -0.275, 0.005], [0, 0, 0], [1, 1.05, 1], armRoot);
      addPart(new THREE.TorusGeometry(0.066, 0.01, 10, 24), navyJointMat, 'musculo', [side * 0.02, -0.275, 0.005], [Math.PI / 2, 0, 0], [1, 1, 1], armRoot);

      // Antebrazo blanco ligeramente flexionado hacia adelante
      const forearmGroup = new THREE.Group();
      forearmGroup.position.set(side * 0.02, -0.28, 0.005);
      forearmGroup.rotation.set(-0.22, 0, side * 0.08);
      armRoot.add(forearmGroup);

      addPart(new THREE.CylinderGeometry(0.066, 0.054, 0.22, 22), whiteSuitMat, 'musculo', [0, -0.115, 0], [0, 0, 0], [1, 1, 1], forearmGroup);
      // Anillo azul marino de muñeca
      addPart(new THREE.CylinderGeometry(0.056, 0.056, 0.024, 22), navyJointMat, 'musculo', [0, -0.232, 0], [0, 0, 0], [1, 1, 1], forearmGroup);

      // Guante: dorso blanco y palma/dedos azul marino
      addPart(new THREE.BoxGeometry(0.048, 0.085, 0.072), whiteArmorMat, 'musculo', [side * 0.012, -0.285, 0.005], [0, 0, 0], [1, 1, 1], forearmGroup);
      addPart(new THREE.BoxGeometry(0.042, 0.095, 0.068), navyJointMat, 'musculo', [side * -0.008, -0.295, 0.008], [0, 0, side * 0.14], [1, 1, 1], forearmGroup);
      // Pulgar azul marino
      addPart(new THREE.CapsuleGeometry(0.012, 0.032, 6, 12), navyJointMat, 'musculo', [side * -0.015, -0.275, 0.045], [0.45, 0, side * -0.25], [1, 1, 1], forearmGroup);
    });

    // =========================================================
    // F. PIERNAS, RODILLERAS AZULES, BOLSILLO Y BOTAS (Zona: musculo)
    // =========================================================
    [-1, 1].forEach((side) => {
      const legRoot = new THREE.Group();
      legRoot.position.set(side * 0.132, 1.05, 0);
      legRoot.rotation.set(0, side * 0.08, side * -0.035);
      astronaut.add(legRoot);

      // Muslo blanco esculpido
      addPart(new THREE.CylinderGeometry(0.106, 0.092, 0.36, 24), whiteSuitMat, 'musculo', [0, -0.19, 0], [0, 0, 0], [1.02, 1, 1.05], legRoot);

      // Bolsillo utilitario en el muslo izquierdo (side = +1, derecha del espectador)
      if (side === 1) {
        addPart(new THREE.BoxGeometry(0.032, 0.13, 0.095), whiteArmorMat, 'musculo', [0.104, -0.19, 0.005], [0, 0, -0.04], [1, 1, 1], legRoot);
        addPart(new THREE.BoxGeometry(0.036, 0.032, 0.098), whiteSuitMat, 'musculo', [0.106, -0.135, 0.005], [0, 0, -0.04], [1, 1, 1], legRoot);
      }

      // Rodillera articulada azul marino con 3 bandas de flexión
      addPart(new THREE.CylinderGeometry(0.094, 0.092, 0.125, 24), navyJointMat, 'musculo', [0, -0.41, 0.008], [0, 0, 0], [1.02, 1, 1.08], legRoot);
      [-0.375, -0.41, -0.445].forEach((ky) => {
        addPart(new THREE.TorusGeometry(0.088, 0.011, 10, 24), navyJointMat, 'musculo', [0, ky, 0.018], [Math.PI / 2, 0, 0], [1.02, 1.06, 1], legRoot);
      });

      // Pantorrilla / espinillera blanca
      addPart(new THREE.CylinderGeometry(0.092, 0.082, 0.38, 24), whiteSuitMat, 'musculo', [0, -0.65, -0.004], [0, 0, 0], [1.02, 1, 1.06], legRoot);
      // Placa frontal de espinillera
      addPart(new THREE.BoxGeometry(0.085, 0.30, 0.035), whiteArmorMat, 'musculo', [0, -0.64, 0.072], [0.03, 0, 0], [1, 1, 1], legRoot);

      // BOTA LUNAR / EVA (Base en y = 0 global)
      const bootGroup = new THREE.Group();
      bootGroup.position.set(0, -0.86, 0.025);
      bootGroup.rotation.set(0, 0, side * 0.035);
      legRoot.add(bootGroup);

      // Caña blanca de la bota
      addPart(new THREE.BoxGeometry(0.145, 0.11, 0.21), whiteArmorMat, 'musculo', [0, -0.06, 0.02], [0, 0, 0], [1, 1, 1], bootGroup);
      // Empeine blanco redondeado
      addPart(new THREE.SphereGeometry(0.078, 20, 16), whiteArmorMat, 'musculo', [0, -0.09, 0.085], [0, 0, 0], [0.95, 0.65, 1.35], bootGroup);
      // Puntera reforzada azul marino
      addPart(new THREE.SphereGeometry(0.076, 20, 16), navyJointMat, 'musculo', [0, -0.105, 0.135], [0, 0, 0], [0.96, 0.58, 0.92], bootGroup);
      // Talonera azul marino
      addPart(new THREE.BoxGeometry(0.148, 0.065, 0.075), navyJointMat, 'musculo', [0, -0.105, -0.055], [0, 0, 0], [1, 1, 1], bootGroup);
      // Suela gruesa dentada azul marino oscuro
      addPart(new THREE.BoxGeometry(0.158, 0.042, 0.295), navySoleMat, 'musculo', [0, -0.142, 0.045], [0, 0, 0], [1, 1, 1], bootGroup);
    });

    // =========================================================
    // G. PLATAFORMA CIRCULAR CON ANILLOS AZULES LUMINOSOS
    // =========================================================
    const platformGroup = new THREE.Group();
    platformGroup.position.set(0, 0.002, 0);
    scene.add(platformGroup);

    const discBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.18, 0.024, 64),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.1 })
    );
    discBase.receiveShadow = true;
    platformGroup.add(discBase);

    const ringSpecs = [
      { inner: 0.68, outer: 0.72, color: 0x60a5fa, opacity: 0.85 },
      { inner: 0.84, outer: 0.90, color: 0x3b82f6, opacity: 0.75 },
      { inner: 1.02, outer: 1.06, color: 0x93c5fd, opacity: 0.9 }
    ];
    ringSpecs.forEach(({ inner, outer, color, opacity }) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(inner, outer, 64),
        new THREE.MeshBasicMaterial({
          color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.014;
      platformGroup.add(ring);
    });

    // Aro holográfico vertical de fondo (como el arco detrás del astronauta)
    const backHalo = new THREE.Mesh(
      new THREE.RingGeometry(1.16, 1.21, 72, 1, -0.25, Math.PI + 0.5),
      new THREE.MeshBasicMaterial({
        color: 0x93c5fd,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45
      })
    );
    backHalo.position.set(0, 1.08, -0.45);
    scene.add(backHalo);

    // =========================================================
    // H. INTERACCIÓN (RAYCASTING), RESIZE Y LOOP DE ANIMACIÓN
    // =========================================================
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovered = null;

    const detectZone = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(interactiveMeshes, false);
      return hits.length > 0 ? hits[0].object.userData.zoneId : null;
    };

    const onPointerMove = (e) => {
      const z = detectZone(e);
      if (z !== hovered) {
        hovered = z;
        setHoveredZone(z);
        renderer.domElement.style.cursor = z ? 'pointer' : 'grab';
      }
    };

    const onClick = (e) => {
      const z = detectZone(e);
      if (z) handleSelectZone(z);
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    let frameId;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (autoRotateRef.current) {
        astronaut.rotation.y += 0.005;
      }

      // Respiración sutil en el torso y cabeza sin mover las botas del suelo
      headGroup.position.y = 1.92 + Math.sin(t * 2.1) * 0.003;
      backpackGroup.position.y = 1.56 + Math.sin(t * 2.1) * 0.0025;

      // Resaltado sutil únicamente cuando el usuario pasa el cursor por una zona
      interactiveMeshes.forEach((mesh) => {
        if (!mesh.material || !mesh.material.emissive) return;
        const isHovered = hovered && mesh.userData.zoneId === hovered;
        if (isHovered) {
          mesh.material.emissive.setHex(0x38bdf8);
          mesh.material.emissiveIntensity = 0.22;
        } else if (mesh.userData.zoneId !== 'neuro') {
          mesh.material.emissive.setHex(0x000000);
          mesh.material.emissiveIntensity = 0;
        }
      });

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      controls.dispose();
      Object.values(textures).forEach((tex) => tex.dispose());
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div style={{
      ...styles.wrapper,
      height: embedded ? (height || '460px') : '660px',
      backgroundColor: embedded ? 'transparent' : '#eef4fc',
      border: embedded ? 'none' : '1px solid #cbd5e1',
      boxShadow: embedded ? 'none' : '0 12px 32px rgba(15, 23, 42, 0.08)',
      borderRadius: embedded ? '0' : '18px'
    }}>
      <div ref={mountRef} style={styles.canvas} />

      {/* Embedded 360 Hint and Auto-rotate button */}
      {embedded && (
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 10
        }}>
          <button
            type="button"
            onClick={() => setAutoRotate((v) => !v)}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.92)',
              color: '#0E1B3E',
              border: '1px solid rgba(203, 213, 225, 0.9)',
              borderRadius: '9999px',
              padding: '5px 14px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{autoRotate ? '⏸ Detener Giro 360°' : '🔄 Auto-Giro 360°'}</span>
          </button>
        </div>
      )}

      {/* Controles superiores (solo en modo standalone) */}
      {!embedded && (
        <div style={styles.topBar}>
          <div>
            <span style={styles.tag}>MODELO 3D INTERACTIVO · EVA SUIT</span>
            <h3 style={styles.title}>Gemelo Digital del Astronauta</h3>
          </div>
          <div style={styles.btnGroup}>
            <button
              type="button"
              onClick={() => setAutoRotate((v) => !v)}
              style={styles.btn}
            >
              {autoRotate ? 'Detener giro 360°' : 'Girar 360°'}
            </button>
            <button
              type="button"
              onClick={() => setShowHud((v) => !v)}
              style={styles.btn}
            >
              {showHud ? 'Ocultar HUD' : 'Mostrar HUD'}
            </button>
          </div>
        </div>
      )}

      {/* Panel de telemetría acoplado (solo en modo standalone) */}
      {!embedded && showHud && activeData && (
        <>
          <div style={styles.zoneList}>
            {Object.values(telemetry).map((item) => {
              const active = item.id === selectedZone;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectZone(item.id)}
                  style={{
                    ...styles.zoneBtn,
                    borderColor: active ? '#0284c7' : 'rgba(148, 163, 184, 0.35)',
                    backgroundColor: active ? 'rgba(255, 255, 255, 0.96)' : 'rgba(255, 255, 255, 0.78)'
                  }}
                >
                  <span
                    style={{
                      ...styles.dot,
                      backgroundColor: STATUS_BADGE[item.status || 'optimal'].color
                    }}
                  />
                  {item.name.split(' ')[0]}
                </button>
              );
            })}
          </div>

          <div style={styles.card}>
            <div style={styles.cardTop}>
              <div>
                <div style={styles.region}>{activeData.region}</div>
                <div style={styles.cardTitle}>{activeData.name}</div>
              </div>
              <span
                style={{
                  ...styles.statusPill,
                  color: badgeStyle.color,
                  backgroundColor: badgeStyle.bg
                }}
              >
                {badgeStyle.label}
              </span>
            </div>
            <div style={styles.metricLine}>
              <span>{activeData.metric}</span>
              <strong style={{ color: '#0f172a' }}>{activeData.value}</strong>
            </div>
            <p style={styles.detail}>{activeData.detail}</p>
          </div>
        </>
      )}

      {hoveredZone && (
        <div style={styles.tooltip}>
          Inspeccionar: {telemetry[hoveredZone]?.name}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    position: 'relative',
    width: '100%',
    height: '660px',
    borderRadius: '18px',
    overflow: 'hidden',
    backgroundColor: '#eef4fc',
    border: '1px solid #cbd5e1',
    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#0f172a'
  },
  canvas: {
    width: '100%',
    height: '100%'
  },
  topBar: {
    position: 'absolute',
    top: '16px',
    left: '16px',
    right: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    pointerEvents: 'none',
    gap: '12px',
    flexWrap: 'wrap'
  },
  tag: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.07em',
    color: '#0369a1',
    backgroundColor: 'rgba(224, 242, 254, 0.9)',
    padding: '4px 9px',
    borderRadius: '6px',
    border: '1px solid #bae6fd'
  },
  title: {
    margin: '6px 0 0 0',
    fontSize: '18px',
    fontWeight: 700,
    color: '#0f172a'
  },
  btnGroup: {
    display: 'flex',
    gap: '8px',
    pointerEvents: 'auto'
  },
  btn: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: '#1e293b',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '7px 12px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05)'
  },
  zoneList: {
    position: 'absolute',
    top: '86px',
    left: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '7px'
  },
  zoneBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '7px 12px',
    borderRadius: '10px',
    border: '1px solid',
    color: '#0f172a',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    backdropFilter: 'blur(8px)'
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  card: {
    position: 'absolute',
    bottom: '16px',
    right: '16px',
    width: '310px',
    maxWidth: 'calc(100% - 32px)',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    backdropFilter: 'blur(12px)',
    borderRadius: '14px',
    border: '1px solid #cbd5e1',
    padding: '14px 16px',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)'
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px'
  },
  region: {
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#64748b'
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#0f172a',
    marginTop: '2px'
  },
  statusPill: {
    fontSize: '11px',
    fontWeight: 700,
    padding: '3px 9px',
    borderRadius: '999px'
  },
  metricLine: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '10px',
    paddingTop: '8px',
    borderTop: '1px solid #e2e8f0',
    fontSize: '12px',
    color: '#475569'
  },
  detail: {
    margin: '8px 0 0 0',
    fontSize: '12px',
    lineHeight: 1.45,
    color: '#475569'
  },
  tooltip: {
    position: 'absolute',
    bottom: '16px',
    left: '16px',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    color: '#f8fafc',
    fontSize: '12px',
    padding: '6px 12px',
    borderRadius: '8px'
  }
};