import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const DEFAULT_TELEMETRY = {
  neuro: {
    id: 'neuro',
    name: 'Casco y Sistema Neuro-Vestibular',
    region: 'Visor Presurizado / Unidad Cefálica',
    metric: 'Presión Casco · O₂',
    value: '4.30 psi · 99.6 %',
    status: 'optimal',
    detail: 'Sello cervical hermético nominal; parámetros ópticos y vestibulares estables.'
  },
  cardio: {
    id: 'cardio',
    name: 'Coraza Pectoral (HUT) y Mochila PLSS',
    region: 'Tórax y Soporte Vital Primario',
    metric: 'Ritmo Cardíaco · Refrigeración LCVG',
    value: '72 BPM · 21.2 °C',
    status: 'optimal',
    detail: 'Circulación térmica y frecuencia cardíaca dentro de parámetros nominales.'
  },
  metabolic: {
    id: 'metabolic',
    name: 'Corsé Abdominal y Arnés Pélvico',
    region: 'Cintura Articulada / Regulación',
    metric: 'Hidratación · Presión Diferencial',
    value: '96.5 % · Nominal',
    status: 'warning',
    detail: 'Leve descenso hídrico; sugerida ingesta de 250 ml mediante válvula interna.'
  },
  musculo: {
    id: 'musculo',
    name: 'Extremidades, Guantes y Botas EVA',
    region: 'Articulaciones de Fuelle y Tracción Lunar',
    metric: 'Carga Mecánica · Agarre',
    value: '93 % · Óptimo',
    status: 'optimal',
    detail: 'Fuelles de codo/rodilla y suelas de alta tracción operando sin resistencia.'
  },
  radiation: {
    id: 'radiation',
    name: 'Blindaje Multicapa (TMG) y Dosimetría',
    region: 'Cobertura Integral del Traje',
    metric: 'Dosis Acumulada Misión',
    value: '18.4 mSv',
    status: 'optimal',
    detail: 'Aislamiento térmico y atenuación contra radiación solar en rango seguro.'
  }
};

const STATUS_BADGE = {
  optimal: { color: '#0284c7', bg: 'rgba(2, 132, 199, 0.12)', label: 'Óptimo' },
  warning: { color: '#d97706', bg: 'rgba(217, 119, 6, 0.12)', label: 'Atención' },
  critical: { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.12)', label: 'Alerta' }
};

/**
 * Genera mapas PBR procedurales de alta resolución:
 * - Tejido técnico Ripstop (bumpMap + roughnessMap)
 * - Acanalado para articulaciones de fuelle
 * - Insignia NASA ("Meatball") 1024px, Bandera EE.UU. y parches de pecho
 * - Sombra de contacto suave bajo las botas
 */
function createSuitPBRTextures() {
  // 1. Tejido técnico Ripstop + micro-trama (Bump & Roughness)
  const weaveCanvas = document.createElement('canvas');
  weaveCanvas.width = 512;
  weaveCanvas.height = 512;
  const wCtx = weaveCanvas.getContext('2d');

  wCtx.fillStyle = '#7c7c7c';
  wCtx.fillRect(0, 0, 512, 512);

  // Micro-trama cruzada
  for (let y = 0; y < 512; y += 2) {
    for (let x = 0; x < 512; x += 2) {
      const val = ((x >> 1) + (y >> 1)) % 2 === 0 ? 136 : 114;
      wCtx.fillStyle = `rgb(${val},${val},${val})`;
      wCtx.fillRect(x, y, 2, 2);
    }
  }

  // Cuadrícula de refuerzo Ripstop cada 16px
  wCtx.strokeStyle = 'rgba(215, 215, 215, 0.45)';
  wCtx.lineWidth = 1.2;
  for (let i = 0; i < 512; i += 16) {
    wCtx.beginPath();
    wCtx.moveTo(i, 0);
    wCtx.lineTo(512, i);
    wCtx.stroke();

    wCtx.beginPath();
    wCtx.moveTo(0, i);
    wCtx.lineTo(512, i);
    wCtx.stroke();
  }

  const fabricBump = new THREE.CanvasTexture(weaveCanvas);
  fabricBump.wrapS = THREE.RepeatWrapping;
  fabricBump.wrapT = THREE.RepeatWrapping;
  fabricBump.repeat.set(14, 14);

  const fabricRoughness = new THREE.CanvasTexture(weaveCanvas);
  fabricRoughness.wrapS = THREE.RepeatWrapping;
  fabricRoughness.wrapT = THREE.RepeatWrapping;
  fabricRoughness.repeat.set(14, 14);

  // 2. Textura acanalada para fuelles de codos, rodillas y cintura
  const ribCanvas = document.createElement('canvas');
  ribCanvas.width = 256;
  ribCanvas.height = 256;
  const rCtx = ribCanvas.getContext('2d');
  for (let y = 0; y < 256; y++) {
    const wave = Math.sin((y / 256) * Math.PI * 24) * 0.5 + 0.5;
    const v = Math.round(70 + wave * 155);
    rCtx.fillStyle = `rgb(${v},${v},${v})`;
    rCtx.fillRect(0, y, 256, 1);
  }
  const ribBump = new THREE.CanvasTexture(ribCanvas);
  ribBump.wrapS = THREE.RepeatWrapping;
  ribBump.wrapT = THREE.RepeatWrapping;

  // 3. Logo circular NASA ("Meatball") en 1024x1024
  const nasaCanvas = document.createElement('canvas');
  nasaCanvas.width = 1024;
  nasaCanvas.height = 1024;
  const nCtx = nasaCanvas.getContext('2d');

  nCtx.clearRect(0, 0, 1024, 1024);

  // Esfera azul con sutil degradado de bordado
  const blueGrad = nCtx.createRadialGradient(460, 440, 60, 512, 512, 430);
  blueGrad.addColorStop(0, '#1868e6');
  blueGrad.addColorStop(1, '#0b44a8');
  nCtx.beginPath();
  nCtx.arc(512, 512, 425, 0, Math.PI * 2);
  nCtx.fillStyle = blueGrad;
  nCtx.fill();

  // Borde bordado exterior sutil
  nCtx.lineWidth = 10;
  nCtx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  nCtx.stroke();

  // Estrellas blancas
  nCtx.fillStyle = '#ffffff';
  const stars = [
    [290, 290, 6], [390, 225, 4.5], [625, 245, 5.5], [715, 325, 4.5],
    [255, 610, 5], [375, 725, 6.5], [645, 710, 5.5], [750, 595, 4.5],
    [510, 195, 4], [480, 790, 5], [330, 395, 3.8], [690, 430, 4.2]
  ];
  stars.forEach(([x, y, r]) => {
    nCtx.beginPath();
    nCtx.arc(x, y, r, 0, Math.PI * 2);
    nCtx.fill();
  });

  // Vector rojo en V (Chevron)
  nCtx.beginPath();
  nCtx.moveTo(135, 585);
  nCtx.lineTo(502, 260);
  nCtx.lineTo(622, 462);
  nCtx.lineTo(885, 248);
  nCtx.lineTo(596, 540);
  nCtx.lineTo(486, 362);
  nCtx.closePath();
  nCtx.fillStyle = '#e03c31';
  nCtx.fill();

  // Órbita blanca elíptica
  nCtx.save();
  nCtx.translate(512, 524);
  nCtx.rotate(-0.34);
  nCtx.beginPath();
  nCtx.ellipse(0, 0, 432, 130, 0, 0, Math.PI * 2);
  nCtx.lineWidth = 18;
  nCtx.strokeStyle = '#ffffff';
  nCtx.stroke();
  nCtx.restore();

  // Tipografía NASA
  nCtx.fillStyle = '#ffffff';
  nCtx.font = '900 186px Georgia, "Times New Roman", serif';
  nCtx.textAlign = 'center';
  nCtx.textBaseline = 'middle';
  nCtx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  nCtx.shadowBlur = 14;
  nCtx.fillText('NASA', 512, 532);

  const nasaTexture = new THREE.CanvasTexture(nasaCanvas);
  nasaTexture.colorSpace = THREE.SRGBColorSpace;
  nasaTexture.anisotropy = 8;

  // 4. Bandera de Estados Unidos (brazo izquierdo)
  const flagCanvas = document.createElement('canvas');
  flagCanvas.width = 640;
  flagCanvas.height = 400;
  const fCtx = flagCanvas.getContext('2d');

  fCtx.fillStyle = '#ffffff';
  fCtx.fillRect(0, 0, 640, 400);
  const stripeH = 400 / 13;
  fCtx.fillStyle = '#b91c1c';
  for (let i = 0; i < 13; i += 2) {
    fCtx.fillRect(0, i * stripeH, 640, stripeH);
  }
  fCtx.fillStyle = '#1e3a8a';
  fCtx.fillRect(0, 0, 270, stripeH * 7);

  fCtx.fillStyle = '#ffffff';
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 6; col++) {
      fCtx.beginPath();
      fCtx.arc(24 + col * 43, 22 + row * 41, 5.2, 0, Math.PI * 2);
      fCtx.fill();
    }
  }
  fCtx.strokeStyle = '#e2e8f0';
  fCtx.lineWidth = 12;
  fCtx.strokeRect(6, 6, 628, 388);

  const flagTexture = new THREE.CanvasTexture(flagCanvas);
  flagTexture.colorSpace = THREE.SRGBColorSpace;
  flagTexture.anisotropy = 8;

  // 5. Micro-parches superiores de pecho (azul izquierda, verde/teal derecha)
  const createPatch = (bgHex, ringHex, coreHex) => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 160;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bgHex;
    ctx.beginPath();
    ctx.roundRect(8, 8, 240, 144, 24);
    ctx.fill();

    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.strokeStyle = ringHex;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(128, 80, 42, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = coreHex;
    ctx.beginPath();
    ctx.arc(128, 80, 22, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  const leftChestBadgeTex = createPatch('#0284c7', '#bae6fd', '#ffffff');
  const rightChestBadgeTex = createPatch('#0f766e', '#99f6e4', '#fde047');

  // 6. Sombra de contacto realista bajo las botas
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 512;
  shadowCanvas.height = 512;
  const sCtx = shadowCanvas.getContext('2d');
  const radGrad = sCtx.createRadialGradient(256, 256, 20, 256, 256, 240);
  radGrad.addColorStop(0, 'rgba(15, 23, 42, 0.42)');
  radGrad.addColorStop(0.55, 'rgba(15, 23, 42, 0.16)');
  radGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  sCtx.fillStyle = radGrad;
  sCtx.fillRect(0, 0, 512, 512);
  const contactShadowTex = new THREE.CanvasTexture(shadowCanvas);

  return {
    fabricBump,
    fabricRoughness,
    ribBump,
    nasaTexture,
    flagTexture,
    leftChestBadgeTex,
    rightChestBadgeTex,
    contactShadowTex
  };
}

/**
 * Crea una geometría orgánica torneada a partir de puntos [radio, alturaY] ordenados de abajo hacia arriba
 */
function createSculptedLathe(profilePairs, radialSegments = 36, curveDivisions = 28) {
  const vecs = profilePairs.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y));
  const curve = new THREE.SplineCurve(vecs);
  const sampled = curve.getPoints(curveDivisions);
  const geo = new THREE.LatheGeometry(sampled, radialSegments);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Crea una costura en relieve (piping) siguiendo una curva 3D
 */
function createSeamPiping(points3D, radius = 0.0038, tubularSegments = 28) {
  const curve = new THREE.CatmullRomCurve3(points3D.map((p) => new THREE.Vector3(...p)));
  return new THREE.TubeGeometry(curve, tubularSegments, radius, 8, false);
}

export default function AstronautModel3D({
  telemetry = DEFAULT_TELEMETRY,
  onSelectZone,
  selectedZone: propSelectedZone,
  embedded = false,
  height = '680px'
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

    const width = container.clientWidth || 720;
    const heightPx = container.clientHeight || 680;

    // 1. Escena, cámara y renderizador PBR con Tone Mapping cinematográfico
    const scene = new THREE.Scene();
    if (!embedded) {
      scene.background = new THREE.Color(0xeaf2fb);
      scene.fog = new THREE.Fog(0xeaf2fb, 7, 15);
    }

    const camera = new THREE.PerspectiveCamera(34, width / heightPx, 0.1, 50);
    camera.position.set(0, embedded ? 1.02 : 1.14, embedded ? 4.95 : 4.1);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (embedded) {
      renderer.setClearColor(0x000000, 0);
    }
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    // Entorno HDRI procedural para reflejos realistas en visor y hebillas metálicas
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.55;

    // 2. Controles orbitales
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, embedded ? 0.98 : 1.05, 0);
    controls.minDistance = 1.45;
    controls.maxDistance = 6.2;
    controls.maxPolarAngle = Math.PI * 0.51;

    // 3. Iluminación de estudio de 3 puntos
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 0.85);
    hemiLight.position.set(0, 5, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
    keyLight.position.set(2.6, 4.8, 3.8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 12;
    keyLight.shadow.camera.left = -1.6;
    keyLight.shadow.camera.right = 1.6;
    keyLight.shadow.camera.top = 2.6;
    keyLight.shadow.camera.bottom = -0.4;
    keyLight.shadow.bias = -0.0003;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.65);
    fillLight.position.set(-3.4, 2.2, 2.4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.75);
    rimLight.position.set(0, 3.2, -3.6);
    scene.add(rimLight);

    // 4. Materiales físicos realistas (PBR)
    const tex = createSuitPBRTextures();

    // Tela térmica blanca (Ortho-Fabric) con relieve ripstop
    const whiteSuitMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.62,
      roughnessMap: tex.fabricRoughness,
      metalness: 0.03,
      bumpMap: tex.fabricBump,
      bumpScale: 0.0035
    });

    // Placas rígidas blancas satinadas (casco, coraza HUT, espinilleras)
    const whiteShellMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.24,
      metalness: 0.05,
      clearcoat: 0.35,
      clearcoatRoughness: 0.25
    });

    // Costuras y ribetes blancos ligeramente sombreados para definición de paneles
    const seamPipingMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.5,
      metalness: 0.05
    });

    // Tejido azul marino profundo de articulaciones y arneses (#0b1d3a)
    const navyJointMat = new THREE.MeshStandardMaterial({
      color: 0x0b1d3a,
      roughness: 0.54,
      metalness: 0.1,
      bumpMap: tex.ribBump,
      bumpScale: 0.0045
    });

    // Arnés liso azul marino (cinturón, correas de hombro, marco de visor)
    const navyStrapMat = new THREE.MeshStandardMaterial({
      color: 0x0d2142,
      roughness: 0.38,
      metalness: 0.14
    });

    // Suela de caucho vulcanizado azul marino oscuro
    const navySoleMat = new THREE.MeshStandardMaterial({
      color: 0x071224,
      roughness: 0.78,
      metalness: 0.06
    });

    // Aluminio anodizado / acero pulido para hebillas y anillos de desconexión
    const brushedMetalMat = new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      roughness: 0.22,
      metalness: 0.92
    });

    // Cristal del visor oscuro con recubrimiento óptico y reflejo real
    const visorGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x020612,
      emissive: 0x04132e,
      emissiveIntensity: 0.25,
      roughness: 0.04,
      metalness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      reflectivity: 1.0
    });

    const interactiveMeshes = [];
    const astronaut = new THREE.Group();
    scene.add(astronaut);

    const addPart = (geometry, material, zoneId, pos, rot = [0, 0, 0], scale = [1, 1, 1], parent = astronaut) => {
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
    // A. CASCO PRESURIZADO Y VISOR ÓPTICO (Zona: neuro)
    // =========================================================
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.925, 0.01);
    astronaut.add(headGroup);

    // Anillo metálico de desconexión cervical + sello azul marino
    addPart(new THREE.CylinderGeometry(0.148, 0.168, 0.055, 40), navyStrapMat, 'neuro', [0, -0.162, 0], [0, 0, 0], [1.06, 1, 1.02], headGroup);
    addPart(new THREE.TorusGeometry(0.156, 0.013, 16, 44), brushedMetalMat, 'neuro', [0, -0.136, 0], [Math.PI / 2, 0, 0], [1.06, 1.02, 1], headGroup);
    addPart(new THREE.TorusGeometry(0.162, 0.014, 16, 44), whiteShellMat, 'neuro', [0, -0.122, 0], [Math.PI / 2, 0, 0], [1.06, 1.02, 1], headGroup);

    // Domo esculpido del casco con perfil anatómico
    const helmetGeo = createSculptedLathe([
      [0.145, -0.12],
      [0.188, -0.07],
      [0.206, 0.00],
      [0.202, 0.08],
      [0.175, 0.155],
      [0.115, 0.205],
      [0.001, 0.222]
    ], 44, 32);
    addPart(helmetGeo, whiteShellMat, 'neuro', [0, 0.0, -0.005], [0, 0, 0], [1.0, 1.0, 1.04], headGroup);

    // Junta perimetral azul marino del visor (esculpida)
    addPart(
      new THREE.TorusGeometry(0.146, 0.021, 20, 48),
      navyStrapMat,
      'neuro',
      [0, 0.012, 0.142],
      [-0.07, 0, 0],
      [1.06, 0.93, 0.85],
      headGroup
    );
    // Labio exterior blanco del marco del visor
    addPart(
      new THREE.TorusGeometry(0.162, 0.013, 16, 48),
      whiteShellMat,
      'neuro',
      [0, 0.012, 0.136],
      [-0.07, 0, 0],
      [1.06, 0.94, 0.85],
      headGroup
    );

    // Burbuja óptica oscura del visor
    addPart(
      new THREE.SphereGeometry(0.156, 36, 32, -Math.PI * 0.42, Math.PI * 0.84, 0.24, 1.15),
      visorGlassMat,
      'neuro',
      [0, 0.012, 0.068],
      [-0.07, Math.PI * 0.5, 0],
      [0.95, 0.91, 1.04],
      headGroup
    );

    // Cápsulas laterales de comunicaciones (auriculares del casco)
    [-1, 1].forEach((side) => {
      addPart(
        new THREE.CylinderGeometry(0.056, 0.064, 0.036, 28),
        whiteShellMat,
        'neuro',
        [side * 0.202, 0.008, -0.01],
        [0, 0, Math.PI / 2],
        [1, 1, 1],
        headGroup
      );
      addPart(
        new THREE.TorusGeometry(0.048, 0.008, 14, 28),
        navyStrapMat,
        'neuro',
        [side * 0.219, 0.008, -0.01],
        [0, Math.PI / 2, 0],
        [1, 1, 1],
        headGroup
      );
      // Micro-sensor metálico central
      addPart(
        new THREE.CylinderGeometry(0.016, 0.016, 0.012, 16),
        brushedMetalMat,
        'neuro',
        [side * 0.222, 0.008, -0.01],
        [0, 0, Math.PI / 2],
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

    // Carcasa principal biselada
    addPart(new THREE.BoxGeometry(0.37, 0.46, 0.15), whiteSuitMat, 'cardio', [0, 0, 0], [0, 0, 0], [1, 1, 1], backpackGroup);
    // Panel dorsal en relieve
    addPart(new THREE.BoxGeometry(0.28, 0.34, 0.025), whiteShellMat, 'cardio', [0, -0.01, -0.08], [0, 0, 0], [1, 1, 1], backpackGroup);
    // Cúpula superior de oxígeno
    addPart(new THREE.CapsuleGeometry(0.135, 0.16, 12, 24), whiteShellMat, 'cardio', [0, 0.225, 0.01], [0, 0, Math.PI / 2], [0.55, 1, 0.85], backpackGroup);
    // Esquinas superiores azul marino y válvulas metálicas
    [-1, 1].forEach((side) => {
      addPart(new THREE.BoxGeometry(0.068, 0.075, 0.162), navyStrapMat, 'cardio', [side * 0.155, 0.20, 0], [0, 0, 0], [1, 1, 1], backpackGroup);
      addPart(new THREE.CylinderGeometry(0.016, 0.016, 0.03, 16), brushedMetalMat, 'cardio', [side * 0.09, -0.24, -0.02], [0, 0, 0], [1, 1, 1], backpackGroup);
    });
    // Franja inferior azul marino
    addPart(new THREE.BoxGeometry(0.35, 0.042, 0.158), navyStrapMat, 'cardio', [0, -0.215, 0], [0, 0, 0], [1, 1, 1], backpackGroup);

    // =========================================================
    // C. CORAZA PECTORAL (HUT), ARNESES Y LOGO NASA (Zona: cardio)
    // =========================================================
    const torsoGeo = createSculptedLathe([
      [0.186, -0.17],
      [0.194, -0.09],
      [0.212, 0.00],
      [0.226, 0.09],
      [0.218, 0.15],
      [0.162, 0.185]
    ], 44, 30);
    addPart(torsoGeo, whiteSuitMat, 'cardio', [0, 1.56, 0.01], [0, 0, 0], [1.18, 1.0, 0.78]);

    // Costuras verticales frontales de la coraza (detalles fieles a la imagen)
    [-1, 1].forEach((side) => {
      const chestSeam = createSeamPiping([
        [side * 0.135, 1.71, 0.135],
        [side * 0.145, 1.61, 0.168],
        [side * 0.132, 1.49, 0.156],
        [side * 0.122, 1.39, 0.148]
      ], 0.0038, 24);
      addPart(chestSeam, seamPipingMat, null, [0, 0, 0]);
    });

    // Insignia circular NASA en el centro del pecho
    const nasaDecalMat = new THREE.MeshStandardMaterial({
      map: tex.nasaTexture,
      transparent: true,
      roughness: 0.42,
      metalness: 0.04,
      depthWrite: false
    });
    const chestLogo = new THREE.Mesh(new THREE.PlaneGeometry(0.168, 0.168), nasaDecalMat);
    chestLogo.position.set(0, 1.57, 0.186);
    chestLogo.rotation.x = -0.05;
    chestLogo.userData.zoneId = 'cardio';
    astronaut.add(chestLogo);

    // Correas pectorales azul marino con hebillas metálicas de precisión
    [-1, 1].forEach((side) => {
      addPart(
        new THREE.BoxGeometry(0.044, 0.215, 0.024),
        navyStrapMat,
        'cardio',
        [side * 0.172, 1.622, 0.148],
        [-0.14, side * 0.12, side * -0.05]
      );
      addPart(
        new THREE.TorusGeometry(0.128, 0.022, 14, 28, Math.PI * 0.85),
        navyStrapMat,
        'cardio',
        [side * 0.174, 1.695, -0.01],
        [0.08, Math.PI / 2, 0]
      );
      // Hebilla metálica doble con pasador central
      addPart(
        new THREE.BoxGeometry(0.054, 0.024, 0.032),
        brushedMetalMat,
        'cardio',
        [side * 0.172, 1.602, 0.156],
        [-0.14, side * 0.12, side * -0.05]
      );
      addPart(
        new THREE.BoxGeometry(0.056, 0.006, 0.035),
        navyStrapMat,
        'cardio',
        [side * 0.172, 1.602, 0.157],
        [-0.14, side * 0.12, side * -0.05]
      );
    });

    // Parches rectangulares claviculares (azul izquierda, verde/teal derecha)
    const leftBadge = new THREE.Mesh(
      new THREE.PlaneGeometry(0.05, 0.032),
      new THREE.MeshStandardMaterial({ map: tex.leftChestBadgeTex, transparent: true, roughness: 0.45 })
    );
    leftBadge.position.set(-0.116, 1.676, 0.158);
    leftBadge.rotation.set(-0.22, -0.18, 0);
    astronaut.add(leftBadge);

    const rightBadge = new THREE.Mesh(
      new THREE.PlaneGeometry(0.05, 0.032),
      new THREE.MeshStandardMaterial({ map: tex.rightChestBadgeTex, transparent: true, roughness: 0.45 })
    );
    rightBadge.position.set(0.116, 1.676, 0.158);
    rightBadge.rotation.set(-0.22, 0.18, 0);
    astronaut.add(rightBadge);

    // =========================================================
    // D. CORSÉ ABDOMINAL Y ARNÉS PÉLVICO EN "V" (Zona: metabolic)
    // =========================================================
    const abdomenGeo = createSculptedLathe([
      [0.184, -0.105],
      [0.192, -0.03],
      [0.188, 0.04],
      [0.194, 0.105]
    ], 40, 20);
    addPart(abdomenGeo, whiteSuitMat, 'metabolic', [0, 1.31, 0.005], [0, 0, 0], [1.14, 1.0, 0.76]);

    // Pliegues horizontales del corsé abdominal
    [1.365, 1.31, 1.255].forEach((yPos) => {
      addPart(new THREE.TorusGeometry(0.191, 0.007, 12, 36), seamPipingMat, 'metabolic', [0, yPos, 0.005], [Math.PI / 2, 0, 0], [1.14, 0.77, 1]);
    });

    // Cinturón azul marino articulado
    addPart(new THREE.CylinderGeometry(0.192, 0.196, 0.048, 36), navyStrapMat, 'metabolic', [0, 1.195, 0.005], [0, 0, 0], [1.15, 1, 0.78]);

    // Bloque pélvico blanco + arnés azul marino en "Y/V" alrededor de la ingle
    addPart(new THREE.SphereGeometry(0.184, 28, 24), whiteSuitMat, 'metabolic', [0, 1.09, 0.005], [0, 0, 0], [1.08, 0.86, 0.76]);
    [-1, 1].forEach((side) => {
      addPart(
        new THREE.TorusGeometry(0.136, 0.025, 16, 32, Math.PI * 0.96),
        navyStrapMat,
        'metabolic',
        [side * 0.115, 1.095, 0.016],
        [0.18, side * 0.65, side * -0.35],
        [1, 1.16, 0.86]
      );
    });

    // =========================================================
    // E. BRAZOS ESCULPIDOS, PARCHES, CODOS Y GUANTES (Zona: musculo)
    // =========================================================
    const upperArmGeo = createSculptedLathe([
      [0.064, -0.125],
      [0.072, -0.05],
      [0.080, 0.04],
      [0.084, 0.11]
    ], 32, 20);

    const forearmGeo = createSculptedLathe([
      [0.052, -0.11],
      [0.060, -0.03],
      [0.067, 0.05],
      [0.064, 0.105]
    ], 32, 20);

    [-1, 1].forEach((side) => {
      const armRoot = new THREE.Group();
      armRoot.position.set(side * 0.285, 1.63, 0);
      armRoot.rotation.set(0.04, 0, side * -0.17);
      astronaut.add(armRoot);

      // Rodamiento de hombro azul marino + hombrera anatómica blanca
      addPart(new THREE.SphereGeometry(0.088, 26, 26), navyJointMat, 'musculo', [0, 0, 0], [0, 0, 0], [1, 1, 1], armRoot);
      addPart(new THREE.SphereGeometry(0.095, 26, 20, 0, Math.PI * 2, 0, Math.PI * 0.58), whiteShellMat, 'musculo', [side * 0.012, 0.016, 0], [0, 0, side * -0.25], [1, 1.06, 1], armRoot);

      // Brazo superior esculpido
      addPart(upperArmGeo, whiteSuitMat, 'musculo', [side * 0.02, -0.145, 0], [0, 0, 0], [1, 1, 1], armRoot);

      // Parches laterales: NASA en brazo derecho (side = -1), Bandera EE.UU. en brazo izquierdo (side = +1)
      if (side === -1) {
        const armNasa = new THREE.Mesh(
          new THREE.PlaneGeometry(0.088, 0.088),
          new THREE.MeshStandardMaterial({ map: tex.nasaTexture, transparent: true, roughness: 0.45 })
        );
        armNasa.position.set(-0.098, -0.105, 0.01);
        armNasa.rotation.set(0, -Math.PI / 2, 0);
        armRoot.add(armNasa);
      } else {
        const armFlag = new THREE.Mesh(
          new THREE.PlaneGeometry(0.098, 0.064),
          new THREE.MeshStandardMaterial({ map: tex.flagTexture, transparent: true, roughness: 0.45 })
        );
        armFlag.position.set(0.098, -0.105, 0.01);
        armFlag.rotation.set(0, Math.PI / 2, 0);
        armRoot.add(armFlag);
      }

      // Codo articulado de fuelle azul marino (3 anillos)
      addPart(new THREE.SphereGeometry(0.067, 24, 24), navyJointMat, 'musculo', [side * 0.02, -0.275, 0.005], [0, 0, 0], [1, 1.06, 1], armRoot);
      [-0.255, -0.275, -0.295].forEach((ey) => {
        addPart(new THREE.TorusGeometry(0.065, 0.009, 12, 28), navyJointMat, 'musculo', [side * 0.02, ey, 0.005], [Math.PI / 2, 0, 0], [1, 1, 1], armRoot);
      });

      // Antebrazo blanco con detalles técnicos azul marino
      const forearmGroup = new THREE.Group();
      forearmGroup.position.set(side * 0.02, -0.28, 0.005);
      forearmGroup.rotation.set(-0.22, 0, side * 0.08);
      armRoot.add(forearmGroup);

      addPart(forearmGeo, whiteSuitMat, 'musculo', [0, -0.115, 0], [0, 0, 0], [1, 1, 1], forearmGroup);

      // Pequeñas placas azules de telemetría en la cara externa del antebrazo (fieles a la imagen)
      [-0.08, -0.13].forEach((fy) => {
        addPart(
          new THREE.BoxGeometry(0.012, 0.026, 0.022),
          navyStrapMat,
          'musculo',
          [side * 0.061, fy, 0.01],
          [0, 0, side * -0.06],
          [1, 1, 1],
          forearmGroup
        );
      });

      // Anillo metálico y sello azul marino de muñeca
      addPart(new THREE.CylinderGeometry(0.056, 0.056, 0.022, 26), navyStrapMat, 'musculo', [0, -0.23, 0], [0, 0, 0], [1, 1, 1], forearmGroup);
      addPart(new THREE.TorusGeometry(0.055, 0.005, 10, 28), brushedMetalMat, 'musculo', [0, -0.22, 0], [Math.PI / 2, 0, 0], [1, 1, 1], forearmGroup);

      // GUANTE EVA ARTICULADO (Dorso blanco + palma y 5 dedos azul marino)
      const handGroup = new THREE.Group();
      handGroup.position.set(0, -0.245, 0.005);
      forearmGroup.add(handGroup);

      // Dorso protector blanco y palma azul marino
      addPart(new THREE.BoxGeometry(0.036, 0.078, 0.068), whiteShellMat, 'musculo', [side * 0.014, -0.038, 0], [0, 0, 0], [1, 1, 1], handGroup);
      addPart(new THREE.BoxGeometry(0.034, 0.08, 0.066), navyJointMat, 'musculo', [side * -0.008, -0.04, 0.002], [0, 0, 0], [1, 1, 1], handGroup);

      // 4 dedos articulados con curvatura natural
      const fingerZ = [0.024, 0.008, -0.008, -0.024];
      const fingerLen = [0.042, 0.048, 0.045, 0.036];
      fingerZ.forEach((zOff, idx) => {
        const fGroup = new THREE.Group();
        fGroup.position.set(side * -0.004, -0.078, zOff);
        fGroup.rotation.set(0, 0, side * 0.24);
        handGroup.add(fGroup);

        addPart(new THREE.CapsuleGeometry(0.0075, fingerLen[idx] * 0.55, 6, 10), navyJointMat, 'musculo', [0, -fingerLen[idx] * 0.3, 0], [0, 0, 0], [1, 1, 1], fGroup);
        addPart(new THREE.CapsuleGeometry(0.0068, fingerLen[idx] * 0.45, 6, 10), navyJointMat, 'musculo', [side * -0.006, -fingerLen[idx] * 0.75, 0], [0, 0, side * 0.32], [1, 1, 1], fGroup);
      });

      // Pulgar oponible azul marino
      addPart(
        new THREE.CapsuleGeometry(0.009, 0.034, 6, 12),
        navyJointMat,
        'musculo',
        [side * -0.016, -0.048, 0.038],
        [0.45, 0, side * -0.28],
        [1, 1, 1],
        handGroup
      );
    });

    // =========================================================
    // F. PIERNAS ESCULPIDAS, RODILLERAS, BOLSILLO Y BOTAS (Zona: musculo)
    // =========================================================
    const thighGeo = createSculptedLathe([
      [0.090, -0.18],
      [0.096, -0.08],
      [0.104, 0.04],
      [0.108, 0.16]
    ], 36, 22);

    const shinGeo = createSculptedLathe([
      [0.080, -0.19],
      [0.085, -0.08],
      [0.093, 0.06],
      [0.091, 0.18]
    ], 36, 22);

    [-1, 1].forEach((side) => {
      const legRoot = new THREE.Group();
      legRoot.position.set(side * 0.132, 1.05, 0);
      legRoot.rotation.set(0, side * 0.08, side * -0.035);
      astronaut.add(legRoot);

      // Muslo esculpido + costura frontal
      addPart(thighGeo, whiteSuitMat, 'musculo', [0, -0.19, 0], [0, 0, 0], [1.02, 1, 1.05], legRoot);
      const thighSeam = createSeamPiping([
        [0, -0.04, 0.106],
        [0, -0.19, 0.104],
        [0, -0.34, 0.096]
      ], 0.0036, 18);
      addPart(thighSeam, seamPipingMat, null, [0, 0, 0], [0, 0, 0], [1, 1, 1], legRoot);

      // Bolsillo utilitario en el muslo izquierdo (side = +1) con solapa y costura
      if (side === 1) {
        addPart(new THREE.BoxGeometry(0.034, 0.135, 0.098), whiteSuitMat, 'musculo', [0.105, -0.195, 0.005], [0, 0, -0.04], [1, 1, 1], legRoot);
        addPart(new THREE.BoxGeometry(0.038, 0.034, 0.102), whiteShellMat, 'musculo', [0.108, -0.138, 0.005], [0, 0, -0.04], [1, 1, 1], legRoot);
      }

      // Rodillera articulada azul marino con 4 pliegues anatómicos
      addPart(new THREE.CylinderGeometry(0.094, 0.092, 0.128, 28), navyJointMat, 'musculo', [0, -0.41, 0.008], [0, 0, 0], [1.02, 1, 1.08], legRoot);
      [-0.365, -0.395, -0.425, -0.455].forEach((ky) => {
        addPart(new THREE.TorusGeometry(0.088, 0.010, 12, 28), navyJointMat, 'musculo', [0, ky, 0.018], [Math.PI / 2, 0, 0], [1.02, 1.06, 1], legRoot);
      });

      // Pantorrilla + espinillera rígida con costuras laterales
      addPart(shinGeo, whiteSuitMat, 'musculo', [0, -0.65, -0.004], [0, 0, 0], [1.02, 1, 1.06], legRoot);
      addPart(new THREE.BoxGeometry(0.086, 0.30, 0.034), whiteShellMat, 'musculo', [0, -0.64, 0.074], [0.03, 0, 0], [1, 1, 1], legRoot);

      // BOTA LUNAR / EVA DE ALTA TRACCIÓN (Base apoyada exactamente en y = 0)
      const bootGroup = new THREE.Group();
      bootGroup.position.set(0, -0.86, 0.025);
      bootGroup.rotation.set(0, 0, side * 0.035);
      legRoot.add(bootGroup);

      // Collarín acolchado del tobillo + caña blanca
      addPart(new THREE.TorusGeometry(0.084, 0.015, 12, 28), whiteShellMat, 'musculo', [0, -0.005, 0.005], [Math.PI / 2, 0, 0], [0.95, 1.15, 1], bootGroup);
      addPart(new THREE.BoxGeometry(0.146, 0.11, 0.21), whiteSuitMat, 'musculo', [0, -0.06, 0.02], [0, 0, 0], [1, 1, 1], bootGroup);

      // Empeine esculpido blanco + correa de ajuste sobre el empeine
      addPart(new THREE.SphereGeometry(0.079, 24, 18), whiteShellMat, 'musculo', [0, -0.09, 0.085], [0, 0, 0], [0.95, 0.65, 1.36], bootGroup);
      addPart(new THREE.BoxGeometry(0.152, 0.022, 0.045), whiteSuitMat, 'musculo', [0, -0.075, 0.072], [0.22, 0, 0], [1, 1, 1], bootGroup);

      // Puntera reforzada azul marino
      addPart(new THREE.SphereGeometry(0.077, 24, 18), navyStrapMat, 'musculo', [0, -0.105, 0.136], [0, 0, 0], [0.96, 0.58, 0.92], bootGroup);
      // Talonera rígida azul marino
      addPart(new THREE.BoxGeometry(0.148, 0.066, 0.076), navyStrapMat, 'musculo', [0, -0.105, -0.055], [0, 0, 0], [1, 1, 1], bootGroup);

      // Entresuela + suela gruesa dentada azul marino oscuro
      addPart(new THREE.BoxGeometry(0.158, 0.032, 0.295), navySoleMat, 'musculo', [0, -0.138, 0.045], [0, 0, 0], [1, 1, 1], bootGroup);
      for (let zLug = -0.08; zLug <= 0.17; zLug += 0.042) {
        addPart(new THREE.BoxGeometry(0.16, 0.014, 0.024), navySoleMat, 'musculo', [0, -0.158, zLug], [0, 0, 0], [1, 1, 1], bootGroup);
      }
    });

    // =========================================================
    // G. PLATAFORMA CIRCULAR, SOMBRA DE CONTACTO Y ANILLOS AZULES
    // =========================================================
    const platformGroup = new THREE.Group();
    platformGroup.position.set(0, 0.002, 0);
    scene.add(platformGroup);

    const discBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.16, 1.20, 0.024, 72),
      new THREE.MeshPhysicalMaterial({
        color: 0xf8fafc,
        roughness: 0.22,
        metalness: 0.08,
        clearcoat: 0.4
      })
    );
    discBase.receiveShadow = true;
    platformGroup.add(discBase);

    // Sombra de contacto realista debajo de ambas botas
    const contactShadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.95, 0.72),
      new THREE.MeshBasicMaterial({
        map: tex.contactShadowTex,
        transparent: true,
        depthWrite: false
      })
    );
    contactShadowPlane.rotation.x = -Math.PI / 2;
    contactShadowPlane.position.set(0, 0.013, 0.03);
    platformGroup.add(contactShadowPlane);

    const ringSpecs = [
      { inner: 0.68, outer: 0.72, color: 0x60a5fa, opacity: 0.85 },
      { inner: 0.84, outer: 0.90, color: 0x3b82f6, opacity: 0.75 },
      { inner: 1.02, outer: 1.06, color: 0x93c5fd, opacity: 0.92 }
    ];
    ringSpecs.forEach(({ inner, outer, color, opacity }) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(inner, outer, 72),
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

    // Arco luminoso posterior (identidad visual de la referencia)
    const backHalo = new THREE.Mesh(
      new THREE.RingGeometry(1.16, 1.21, 80, 1, -0.25, Math.PI + 0.5),
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
    // H. INTERACCIÓN (RAYCASTING), RESIZE Y BUCLE DE RENDER
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

      // Micro-respiración natural en casco y mochila
      headGroup.position.y = 1.925 + Math.sin(t * 2.0) * 0.0025;
      backpackGroup.position.y = 1.56 + Math.sin(t * 2.0) * 0.002;

      // Iluminación sutil al seleccionar o pasar el cursor por encima de una zona
      const activeHighlightZone = hovered || selectedZoneRef.current;
      interactiveMeshes.forEach((mesh) => {
        if (!mesh.material || !mesh.material.emissive) return;
        const isTarget = activeHighlightZone && mesh.userData.zoneId === activeHighlightZone;
        if (isTarget) {
          mesh.material.emissive.setHex(0x38bdf8);
          mesh.material.emissiveIntensity = hovered && mesh.userData.zoneId === hovered ? 0.35 : 0.22;
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
      envRT.dispose();
      pmremGenerator.dispose();
      Object.values(tex).forEach((texture) => texture.dispose());
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div style={{
      ...styles.wrapper,
      height: embedded ? (height || '480px') : '680px',
      backgroundColor: embedded ? 'transparent' : '#eaf2fb',
      border: embedded ? 'none' : '1px solid #cbd5e1',
      boxShadow: embedded ? 'none' : '0 14px 36px rgba(15, 23, 42, 0.08)',
      borderRadius: embedded ? '0' : '18px'
    }}>
      <div ref={mountRef} style={styles.canvas} />

      {/* Embedded 360 Auto-Rotate Pill */}
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
              backgroundColor: 'rgba(255, 255, 255, 0.94)',
              color: '#0E1B3E',
              border: '1px solid rgba(203, 213, 225, 0.9)',
              borderRadius: '9999px',
              padding: '6px 16px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(15, 23, 42, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
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
            <span style={styles.tag}>RENDER PBR ALTA DEFINICIÓN · EVA SUIT</span>
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
                    backgroundColor: active ? 'rgba(255, 255, 255, 0.96)' : 'rgba(255, 255, 255, 0.80)'
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
    height: '680px',
    borderRadius: '18px',
    overflow: 'hidden',
    backgroundColor: '#eaf2fb',
    border: '1px solid #cbd5e1',
    boxShadow: '0 14px 36px rgba(15, 23, 42, 0.08)',
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
    backgroundColor: 'rgba(224, 242, 254, 0.92)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
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
    width: '315px',
    maxWidth: 'calc(100% - 32px)',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
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
    backgroundColor: 'rgba(15, 23, 42, 0.90)',
    color: '#f8fafc',
    fontSize: '12px',
    padding: '6px 12px',
    borderRadius: '8px'
  }
};
