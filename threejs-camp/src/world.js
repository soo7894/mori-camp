import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const palette = {
  grass: 0x86bd58,
  grassLight: 0xa8d978,
  grassDark: 0x4f8b4d,
  soil: 0xd6aa63,
  sand: 0xf0d28b,
  path: 0xf5e4b6,
  water: 0x63bfd0,
  waterDark: 0x379aae,
  trunk: 0x9c6948,
  leaf: 0x397b54,
  leafLight: 0x67aa68,
  leafDark: 0x285f49,
  cream: 0xfff4cf,
  orange: 0xef7b49,
  coral: 0xe85c55,
  yellow: 0xf3c34f,
  mint: 0x57af82,
  blue: 0x4ca5b6,
  navy: 0x345d67,
  brown: 0x764b35,
  white: 0xfffbec,
};

const facilityInfo = {
  tent: { name: '숲 텐트', emoji: '⛺', income: 65, description: '솔향기 가까이에 놓인 포근한 4인용 텐트예요.' },
  glamping: { name: '글램핑 오두막', emoji: '🏕️', income: 145, description: '침대와 조명이 준비된 편안한 숲속 숙소예요.' },
  firepit: { name: '모닥불장', emoji: '🔥', income: 38, description: '캠퍼들이 둘러앉아 이야기하는 따뜻한 공간이에요.' },
  shop: { name: '캠핑 매점', emoji: '🏪', income: 90, description: '장작과 간식, 캠핑 도구를 판매하는 작은 매점이에요.' },
  caravan: { name: '민트 카라반', emoji: '🚐', income: 180, description: '어디서든 편안하게 머무를 수 있는 인기 카라반이에요.' },
};

function createMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.82,
    metalness: options.metalness ?? 0,
    flatShading: options.flatShading ?? true,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
  });
}

function roundedMesh(width, height, depth, color, radius = 0.14) {
  const safeRadius = Math.min(radius, width / 3, height / 3, depth / 3);
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(width, height, depth, 3, safeRadius),
    createMaterial(color),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(radiusTop, radiusBottom, height, color, segments = 8) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    createMaterial(color),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function seededRandom(seed = 123456) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function tentGeometry(width = 2.6, height = 2.15, depth = 2.7) {
  const w = width / 2;
  const d = depth / 2;
  const positions = new Float32Array([
    -w, 0, d,
    w, 0, d,
    0, height, d,
    -w, 0, -d,
    w, 0, -d,
    0, height, -d,
  ]);
  const indices = [
    0, 1, 2,
    3, 5, 4,
    0, 2, 5, 0, 5, 3,
    1, 4, 5, 1, 5, 2,
    0, 3, 4, 0, 4, 1,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function triangleGeometry(width, height) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([
      -width / 2, 0, 0,
      width / 2, 0, 0,
      0, height, 0,
    ], 3),
  );
  geometry.computeVertexNormals();
  return geometry;
}

function setShadow(group) {
  group.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return group;
}

export class CampWorld {
  constructor(canvas, { facilities, guests = 3, campSetup = {}, onSelect, onActivityComplete, onCampInteract }) {
    this.canvas = canvas;
    this.onSelect = onSelect;
    this.onActivityComplete = onActivityComplete;
    this.onCampInteract = onCampInteract;
    this.lastUpdateTime = performance.now();
    this.elapsed = 0;
    this.facilities = new Map();
    this.selectable = [];
    this.campInteractables = [];
    this.guests = [];
    this.fireEffects = [];
    this.smokePuffs = [];
    this.clouds = [];
    this.particles = [];
    this.random = seededRandom(77124);
    this.pointerDown = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.focusTarget = new THREE.Vector3(0, 0, 0);
    this.focusAmount = 0;
    this.activity = null;
    this.campTool = null;
    this.placement = null;
    this.isSeated = false;
    this.isNight = false;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xefcd67);
    this.scene.fog = new THREE.Fog(0xefcd67, 30, 58);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.frustum = 17;
    this.camera = new THREE.OrthographicCamera(-18, 18, 18, -18, 0.1, 120);
    this.camera.position.set(23, 20, 24);
    this.camera.zoom = 1.02;
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.enablePan = false;
    this.controls.minZoom = 0.75;
    this.controls.maxZoom = 1.6;
    this.controls.minPolarAngle = Math.PI * 0.23;
    this.controls.maxPolarAngle = Math.PI * 0.39;
    this.controls.minAzimuthAngle = -Math.PI * 0.83;
    this.controls.maxAzimuthAngle = Math.PI * 0.05;
    this.controls.target.set(0, 0.2, 0);

    this.hemiLight = new THREE.HemisphereLight(0xfff4d2, 0x426b5a, 1.65);
    this.scene.add(this.hemiLight);
    this.sunLight = new THREE.DirectionalLight(0xfff0c4, 3.1);
    this.sunLight.position.set(-12, 22, 15);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.left = -20;
    this.sunLight.shadow.camera.right = 20;
    this.sunLight.shadow.camera.top = 20;
    this.sunLight.shadow.camera.bottom = -20;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 60;
    this.sunLight.shadow.bias = -0.0003;
    this.scene.add(this.sunLight);

    this.world = new THREE.Group();
    this.scene.add(this.world);
    this._createDiorama();
    this._createLandscape();
    this._createStaticBuildings();
    this._createCampDetails();
    this._createSkyDetails();
    this._createHandsOnSite(campSetup);

    facilities.forEach((facility) => this.addFacility(facility, false));
    this._createPlayer();
    this.setGuestCount(guests);
    this.resize();

    this._onPointerDown = (event) => {
      this.pointerDown.set(event.clientX, event.clientY);
    };
    this._onPointerUp = (event) => this._handlePick(event);
    this._onPointerMove = (event) => this._updatePlacementPointer(event);
    canvas.addEventListener('pointerdown', this._onPointerDown);
    canvas.addEventListener('pointerup', this._onPointerUp);
    canvas.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('resize', () => this.resize());
  }

  _createDiorama() {
    const base = roundedMesh(25.5, 1.3, 19.5, palette.soil, 0.55);
    base.position.y = -0.92;
    base.receiveShadow = true;
    this.world.add(base);

    const grass = roundedMesh(24.5, 0.58, 18.5, palette.grass, 0.46);
    grass.position.y = -0.2;
    grass.receiveShadow = true;
    this.world.add(grass);

    const grassPatch = roundedMesh(9.5, 0.16, 5.6, palette.grassLight, 0.28);
    grassPatch.position.set(4.8, 0.13, -4.5);
    this.world.add(grassPatch);

    const lakeBed = new THREE.Mesh(
      new THREE.CircleGeometry(4.15, 48),
      createMaterial(palette.sand, { flatShading: false }),
    );
    lakeBed.rotation.x = -Math.PI / 2;
    lakeBed.scale.set(1.35, 0.82, 1);
    lakeBed.position.set(-6.4, 0.16, 4.2);
    lakeBed.receiveShadow = true;
    this.world.add(lakeBed);

    this.waterMaterial = new THREE.MeshPhysicalMaterial({
      color: palette.water,
      roughness: 0.28,
      metalness: 0,
      transparent: true,
      opacity: 0.9,
      clearcoat: 0.35,
      clearcoatRoughness: 0.2,
    });
    this.water = new THREE.Mesh(new THREE.CircleGeometry(3.7, 64), this.waterMaterial);
    this.water.rotation.x = -Math.PI / 2;
    this.water.scale.set(1.36, 0.8, 1);
    this.water.position.set(-6.4, 0.22, 4.2);
    this.water.receiveShadow = true;
    this.world.add(this.water);

    const dock = new THREE.Group();
    for (let index = 0; index < 5; index += 1) {
      const plank = roundedMesh(0.72, 0.14, 2.9, 0xc99656, 0.06);
      plank.position.set(index * 0.7, 0, 0);
      dock.add(plank);
    }
    dock.position.set(-4.9, 0.38, 2.7);
    dock.rotation.y = -0.18;
    this.world.add(dock);

    this._addPath(0.4, 0.18, 2.4, 15.5, 0, 0.2);
    this._addPath(0.4, 0.2, 12.7, 2.0, -4.1, 0.2);
    this._addPath(0.4, 0.2, 8.6, 1.55, 4.1, 0.2);
    this._addPath(-0.2, 0.18, 1.5, 9.4, 0.2, 0.2, Math.PI / 2);

    const entrance = roundedMesh(5.8, 0.35, 1.6, palette.sand, 0.25);
    entrance.position.set(5.8, 0.08, 7.8);
    entrance.rotation.y = -0.12;
    this.world.add(entrance);
  }

  _addPath(x, y, width, depth, z, height = 0.18, rotation = 0) {
    const path = roundedMesh(width, height, depth, palette.path, 0.12);
    path.position.set(x, y, z);
    path.rotation.y = rotation;
    path.receiveShadow = true;
    this.world.add(path);
  }

  _createLandscape() {
    const treePositions = [
      [-10.2, -7.0, 1.2], [-8.0, -7.7, 0.85], [-5.8, -7.9, 1.0],
      [-10.5, -3.7, 0.9], [-10.7, 0.0, 1.15], [-10.2, 7.0, 1.1],
      [-8.9, 7.6, 0.8], [-3.1, 8.0, 0.85], [0.2, 8.1, 1.05],
      [3.8, 8.1, 0.9], [8.5, 7.3, 1.2], [10.5, 5.5, 0.8],
      [10.8, 1.8, 1.0], [10.5, -2.0, 0.9], [10.0, -6.6, 1.15],
      [7.5, -7.9, 0.9], [4.5, -8.1, 0.75], [-8.6, 2.2, 0.62],
    ];
    treePositions.forEach(([x, z, scale], index) => {
      this.world.add(this._createTree(x, z, scale, index % 3));
    });

    for (let index = 0; index < 22; index += 1) {
      const angle = this.random() * Math.PI * 2;
      const radius = 7 + this.random() * 4.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius * 0.72;
      if (Math.abs(x) < 2 || z > 7 || z < -7.4) continue;
      const flower = this._createFlower(index % 4);
      flower.position.set(x, 0.2, z);
      this.world.add(flower);
    }

    const rockPositions = [[-8.6, 5.0], [-4.3, 6.7], [8.1, -5.7], [9.1, 3.4], [-8.9, -4.7]];
    rockPositions.forEach(([x, z], index) => {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.38 + (index % 2) * 0.14, 0),
        createMaterial(index % 2 ? 0xb7baa4 : 0xd6d1ad),
      );
      rock.scale.set(1.3, 0.7, 1);
      rock.position.set(x, 0.4, z);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.world.add(rock);
    });
  }

  _createTree(x, z, scale = 1, variant = 0) {
    const group = new THREE.Group();
    const trunk = cylinder(0.22, 0.32, 2.0, palette.trunk, 7);
    trunk.position.y = 1;
    group.add(trunk);

    if (variant === 0) {
      const lower = roundedMesh(1.65, 1.45, 1.65, palette.leafDark, 0.28);
      lower.position.y = 2.25;
      lower.rotation.y = 0.25;
      const upper = roundedMesh(1.35, 1.25, 1.35, palette.leaf, 0.25);
      upper.position.y = 3.25;
      upper.rotation.y = -0.18;
      group.add(lower, upper);
    } else {
      const lower = new THREE.Mesh(
        new THREE.ConeGeometry(1.35, 2.4, 7),
        createMaterial(variant === 1 ? palette.leaf : palette.leafDark),
      );
      lower.position.y = 2.45;
      const upper = new THREE.Mesh(
        new THREE.ConeGeometry(0.95, 1.9, 7),
        createMaterial(variant === 1 ? palette.leafLight : palette.leaf),
      );
      upper.position.y = 3.65;
      group.add(lower, upper);
    }
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);
    return setShadow(group);
  }

  _createFlower(variant) {
    const group = new THREE.Group();
    const stem = cylinder(0.025, 0.035, 0.32, palette.grassDark, 5);
    stem.position.y = 0.16;
    const colors = [palette.coral, palette.yellow, palette.white, palette.blue];
    const bloom = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.1, 0),
      createMaterial(colors[variant]),
    );
    bloom.position.y = 0.37;
    group.add(stem, bloom);
    group.scale.setScalar(0.8 + this.random() * 0.6);
    return group;
  }

  _createStaticBuildings() {
    const lodge = new THREE.Group();
    const platform = roundedMesh(5.0, 0.3, 4.2, 0xc69350, 0.2);
    platform.position.y = 0.15;
    const body = roundedMesh(4.3, 2.8, 3.4, palette.cream, 0.18);
    body.position.y = 1.65;
    const roof = roundedMesh(4.9, 0.5, 3.9, palette.coral, 0.16);
    roof.position.y = 3.22;
    roof.rotation.z = -0.03;
    lodge.add(platform, body, roof);

    const door = roundedMesh(0.9, 1.8, 0.12, palette.brown, 0.08);
    door.position.set(-1.05, 1.08, 1.75);
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x83c9d1,
      roughness: 0.2,
      emissive: 0x1e5260,
      emissiveIntensity: 0.18,
    });
    const windowA = new THREE.Mesh(new RoundedBoxGeometry(1.05, 0.95, 0.1, 3, 0.08), windowMaterial);
    windowA.position.set(0.65, 1.75, 1.76);
    const windowB = windowA.clone();
    windowB.position.x = 1.65;
    lodge.add(door, windowA, windowB);

    const awning = roundedMesh(2.55, 0.16, 0.9, palette.yellow, 0.08);
    awning.position.set(1.15, 2.38, 2.0);
    awning.rotation.x = -0.15;
    lodge.add(awning);

    const sign = this._createTextSign('MORI CAMP', '#fff5d4', '#2c6c4b', 3.0, 0.72);
    sign.position.set(0.1, 2.75, 1.96);
    lodge.add(sign);
    lodge.position.set(4.5, 0.2, -2.0);
    lodge.rotation.y = -0.08;
    this.world.add(setShadow(lodge));

    const entranceSign = new THREE.Group();
    const postA = roundedMesh(0.18, 2.1, 0.18, palette.brown, 0.06);
    postA.position.set(-1.15, 1.05, 0);
    const postB = postA.clone();
    postB.position.x = 1.15;
    const board = this._createTextSign('WELCOME!', '#f5c84e', '#4c7d51', 3.1, 0.9);
    board.position.y = 1.5;
    entranceSign.add(postA, postB, board);
    entranceSign.position.set(5.8, 0.2, 6.9);
    entranceSign.rotation.y = -0.1;
    this.world.add(setShadow(entranceSign));
  }

  _createTextSign(text, background, foreground, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 150;
    const context = canvas.getContext('2d');
    context.fillStyle = background;
    context.roundRect(5, 5, 502, 140, 28);
    context.fill();
    context.strokeStyle = foreground;
    context.lineWidth = 12;
    context.stroke();
    context.fillStyle = foreground;
    context.font = '900 64px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 256, 78);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  }

  _createCampDetails() {
    this._createPicnicArea();

    const lampPositions = [[-2.2, -0.4], [1.5, -0.5], [2.6, 3.8], [-4.1, 0.0], [5.3, 3.9]];
    lampPositions.forEach(([x, z]) => {
      const lamp = new THREE.Group();
      const post = roundedMesh(0.11, 1.35, 0.11, palette.brown, 0.04);
      post.position.y = 0.68;
      const lightBox = roundedMesh(0.34, 0.45, 0.34, palette.yellow, 0.06);
      lightBox.position.y = 1.35;
      lightBox.material.emissive = new THREE.Color(0xf2a93a);
      lightBox.material.emissiveIntensity = 0.25;
      lamp.add(post, lightBox);
      lamp.position.set(x, 0.2, z);
      lamp.userData.lightBox = lightBox;
      this.world.add(lamp);
    });

    const benchPositions = [[-3.6, 2.4, 0.1], [-6.0, 1.0, -0.2], [5.7, 1.6, Math.PI / 2]];
    benchPositions.forEach(([x, z, rotation]) => {
      const bench = new THREE.Group();
      const seat = roundedMesh(1.8, 0.18, 0.55, 0xb77747, 0.06);
      seat.position.y = 0.55;
      const back = roundedMesh(1.8, 0.72, 0.15, 0xc28650, 0.06);
      back.position.set(0, 0.92, -0.24);
      const legA = roundedMesh(0.14, 0.55, 0.14, palette.brown, 0.04);
      legA.position.set(-0.62, 0.28, 0);
      const legB = legA.clone();
      legB.position.x = 0.62;
      bench.add(seat, back, legA, legB);
      bench.position.set(x, 0.2, z);
      bench.rotation.y = rotation;
      this.world.add(bench);
    });
  }

  _createPicnicArea() {
    const group = new THREE.Group();
    const top = roundedMesh(1.75, 0.16, 1.1, 0xd49352, 0.08);
    top.position.y = 0.92;
    const support = roundedMesh(0.18, 0.9, 0.18, palette.brown, 0.04);
    support.position.y = 0.46;
    const benchA = roundedMesh(1.65, 0.14, 0.35, 0xbc7b49, 0.05);
    benchA.position.set(0, 0.55, 0.92);
    const benchB = benchA.clone();
    benchB.position.z = -0.92;
    group.add(top, support, benchA, benchB);
    group.position.set(3.7, 0.2, 3.7);
    group.rotation.y = 0.12;
    this.world.add(group);
  }

  _createSkyDetails() {
    this.cloudLayer = new THREE.Group();
    for (let index = 0; index < 4; index += 1) {
      const cloud = new THREE.Group();
      const cloudMaterial = createMaterial(0xfff4d6, { flatShading: false });
      const parts = [[0, 0, 0, 1], [1.0, 0.05, 0, 0.75], [-0.9, -0.05, 0, 0.65], [0.2, 0.35, 0, 0.72]];
      parts.forEach(([x, y, z, scale]) => {
        const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 1), cloudMaterial);
        puff.position.set(x, y, z);
        puff.scale.setScalar(scale);
        cloud.add(puff);
      });
      cloud.position.set(-18 + index * 10, 11 + (index % 2) * 2, -12 + index * 4);
      cloud.scale.setScalar(1.1 + index * 0.08);
      this.cloudLayer.add(cloud);
      this.clouds.push(cloud);
    }
    this.scene.add(this.cloudLayer);

    const starGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    for (let index = 0; index < 90; index += 1) {
      starPositions.push((this.random() - 0.5) * 50, 8 + this.random() * 22, (this.random() - 0.5) * 45);
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffefad, size: 0.16, transparent: true, opacity: 0 });
    this.stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.stars);

    const fireflyGeometry = new THREE.BufferGeometry();
    const fireflyPositions = [];
    for (let index = 0; index < 28; index += 1) {
      fireflyPositions.push((this.random() - 0.5) * 18, 0.5 + this.random() * 3.5, (this.random() - 0.5) * 13);
    }
    fireflyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(fireflyPositions, 3));
    this.fireflies = new THREE.Points(
      fireflyGeometry,
      new THREE.PointsMaterial({ color: 0xffe66d, size: 0.16, transparent: true, opacity: 0 }),
    );
    this.world.add(this.fireflies);
  }

  _createPlayer() {
    this.player = this._createCamper(0, true);
    this.player.position.set(1.9, 0.2, 2.1);
    this.world.add(this.player);
    this.playerTarget = this.player.position.clone();
    this.activityTargets = {
      wood: new THREE.Vector3(-8.0, 0.2, 0.4),
      fishing: new THREE.Vector3(-5.2, 0.35, 3.3),
      fire: new THREE.Vector3(-1.2, 0.2, 1.3),
      rest: new THREE.Vector3(-4.0, 0.2, -2.0),
    };
  }

  _tagCampObject(group, action, payload = {}) {
    group.traverse((object) => {
      if (!object.isMesh) return;
      object.userData.campAction = action;
      object.userData.campPayload = payload;
      this.campInteractables.push(object);
    });
    return group;
  }

  _createHandsOnSite(saved = {}) {
    this.handsOn = {
      origin: new THREE.Vector3(16.0, 0.12, 0.0),
      stakes: [],
      items: {},
      tent: null,
      mug: null,
      meal: null,
      dishBasin: null,
      dishBox: null,
    };

    const siteBase = roundedMesh(9.2, 1.15, 7.5, palette.soil, 0.45);
    siteBase.position.copy(this.handsOn.origin);
    siteBase.position.y = -0.72;
    const siteTop = roundedMesh(8.75, 0.34, 7.05, 0x79a967, 0.36);
    siteTop.position.copy(this.handsOn.origin);
    siteTop.position.y = -0.06;
    siteTop.receiveShadow = true;
    this.world.add(siteBase, siteTop);

    const pad = new THREE.Mesh(new THREE.CircleGeometry(3.45, 32), createMaterial(0x8fbd78));
    pad.rotation.x = -Math.PI / 2;
    pad.position.copy(this.handsOn.origin);
    pad.position.y = 0.035;
    pad.receiveShadow = true;
    this._tagCampObject(pad, 'site');
    this.world.add(pad);

    const border = new THREE.Mesh(
      new THREE.RingGeometry(3.25, 3.48, 32),
      new THREE.MeshBasicMaterial({ color: 0xf4d782, transparent: true, opacity: 0.9 }),
    );
    border.rotation.x = -Math.PI / 2;
    border.position.copy(this.handsOn.origin);
    border.position.y = 0.055;
    this.world.add(border);

    const tent = this._createTent();
    tent.position.copy(this.handsOn.origin).add(new THREE.Vector3(-0.55, 0.11, -0.05));
    tent.scale.set(0.78, saved.polesAssembled ? 0.58 + (saved.stakes ?? 0) * 0.105 : 0.08, 0.78);
    tent.visible = Boolean(saved.tentUnpacked);
    this.handsOn.tent = tent;
    this.world.add(tent);

    const stakeOffsets = [[-1.8, -1.35], [1.05, -1.35], [-1.8, 1.35], [1.05, 1.35]];
    stakeOffsets.forEach(([x, z], index) => {
      const stake = cylinder(0.11, 0.09, 0.9, palette.brown, 7);
      stake.position.copy(this.handsOn.origin).add(new THREE.Vector3(x, index < (saved.stakes ?? 0) ? 0.18 : 0.48, z));
      stake.rotation.z = index < (saved.stakes ?? 0) ? 0.04 : 0.24;
      stake.visible = Boolean(saved.polesAssembled);
      stake.userData.driven = index < (saved.stakes ?? 0);
      this._tagCampObject(stake, 'stake', { index });
      this.handsOn.stakes.push(stake);
      this.world.add(stake);
    });

    this.placementPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(7.2, 5.6),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    this.placementPlane.rotation.x = -Math.PI / 2;
    this.placementPlane.position.copy(this.handsOn.origin);
    this.placementPlane.position.y = 0.08;
    this.world.add(this.placementPlane);

    if (saved.tablePlaced) this._placeCampItem('table', saved.tablePosition ?? [17.2, 0.8], false);
    if (saved.chairPlaced) this._placeCampItem('chair', saved.chairPosition ?? [17.65, -1.25], false);
    if (saved.burnerPlaced) this._placeCampItem('burner', saved.burnerPosition ?? [16.8, 0.1], false, saved.burnerOn);
    if (saved.lanternPlaced) this._placeCampItem('lantern', saved.lanternPosition ?? [14.0, 1.8], false, saved.lanternOn);
    if (saved.campfirePlaced) this._placeCampItem('campfire', saved.campfirePosition ?? [18.2, 1.7], false, saved.fireOn);
    if (saved.mealPrepared && !saved.mealEaten) this.prepareMeal();
    if (saved.coffeeBrewed && !saved.coffeeDrunk) this.brewCoffee();
    if (saved.dishwashingStarted && !saved.dishesStored) this.startDishwashing(saved.dishesScrubbed ?? 0);
    if (saved.dishesStored) this.storeDishes();
  }

  _createCampTable() {
    const group = new THREE.Group();
    const top = roundedMesh(2.1, 0.16, 1.2, 0xb87945, 0.08);
    top.position.y = 1.12;
    group.add(top);
    for (const x of [-0.82, 0.82]) for (const z of [-0.38, 0.38]) {
      const leg = cylinder(0.07, 0.08, 1.05, 0x55645d, 6);
      leg.position.set(x, 0.54, z);
      group.add(leg);
    }
    return setShadow(group);
  }

  _createCampChair() {
    const group = new THREE.Group();
    const seat = roundedMesh(1.05, 0.14, 0.95, palette.coral, 0.09);
    seat.position.y = 0.72;
    const back = roundedMesh(1.05, 0.95, 0.14, palette.coral, 0.08);
    back.position.set(0, 1.2, -0.42);
    back.rotation.x = -0.18;
    group.add(seat, back);
    for (const x of [-0.4, 0.4]) for (const z of [-0.34, 0.34]) {
      const leg = cylinder(0.055, 0.065, 0.7, 0x4f625d, 6);
      leg.position.set(x, 0.35, z);
      group.add(leg);
    }
    return setShadow(group);
  }

  _createCampBurner(on = false) {
    const group = new THREE.Group();
    const body = roundedMesh(0.85, 0.27, 0.72, 0x596d65, 0.08);
    body.position.y = 0.18;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.045, 7, 14), createMaterial(0x303c3a));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.38;
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 8), createMaterial(0x69b8ff));
    flame.position.y = 0.58;
    flame.visible = on;
    const kettle = roundedMesh(0.52, 0.52, 0.52, 0xe9ded0, 0.18);
    kettle.position.y = 0.82;
    const light = new THREE.PointLight(0x6cbcff, on ? 1.8 : 0, 4, 2);
    light.position.y = 0.7;
    group.add(body, ring, flame, kettle, light);
    group.userData.burner = { flame, light, on };
    return setShadow(group);
  }

  _createCampLantern(on = false) {
    const group = new THREE.Group();
    const post = cylinder(0.075, 0.09, 1.8, 0x4f6158, 7);
    post.position.y = 0.9;
    const foot = roundedMesh(0.68, 0.12, 0.68, 0x4f6158, 0.08);
    foot.position.y = 0.06;
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.23, 0.55, 10), createMaterial(0xffd764));
    shade.position.y = 1.82;
    shade.material.emissive = new THREE.Color(0xf2a93b);
    shade.material.emissiveIntensity = on ? 1.4 : 0.08;
    const cap = cylinder(0.12, 0.3, 0.12, 0x405249, 8);
    cap.position.y = 2.15;
    const light = new THREE.PointLight(0xffc85c, on ? 3.2 : 0, 8, 2);
    light.position.y = 1.9;
    group.add(post, foot, shade, cap, light);
    group.userData.lantern = { shade, light, on };
    return setShadow(group);
  }

  _createHandsOnFirepit(on = false) {
    const group = new THREE.Group();
    const tray = cylinder(0.8, 0.65, 0.22, 0x3e4a45, 12);
    tray.position.y = 0.22;
    group.add(tray);
    for (let index = 0; index < 3; index += 1) {
      const log = cylinder(0.11, 0.13, 1.15, palette.brown, 7);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = index * Math.PI / 3;
      log.position.y = 0.48;
      group.add(log);
    }
    const flameOuter = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.05, 7), createMaterial(palette.orange));
    flameOuter.position.y = 1.02;
    flameOuter.visible = on;
    const flameInner = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.68, 7), createMaterial(palette.yellow));
    flameInner.position.y = 0.92;
    flameInner.visible = on;
    const light = new THREE.PointLight(0xff8c3d, on ? 3.5 : 0, 9, 2);
    light.position.y = 1.05;
    group.add(flameOuter, flameInner, light);
    group.userData.campfire = { flameOuter, flameInner, light, active: on };
    this.fireEffects.push(group.userData.campfire);
    return setShadow(group);
  }

  _createPlaceable(item, on = false) {
    if (item === 'table') return this._createCampTable();
    if (item === 'chair') return this._createCampChair();
    if (item === 'burner') return this._createCampBurner(on);
    if (item === 'lantern') return this._createCampLantern(on);
    if (item === 'campfire') return this._createHandsOnFirepit(on);
    return new THREE.Group();
  }

  _placeCampItem(item, position, animate = true, on = false) {
    const object = this._createPlaceable(item, on);
    object.position.set(position[0], 0.12, position[1]);
    if (item === 'chair') this._tagCampObject(object, 'chair');
    if (item === 'burner') this._tagCampObject(object, 'burner');
    if (item === 'lantern') this._tagCampObject(object, 'lantern');
    if (item === 'campfire') this._tagCampObject(object, 'campfire');
    if (animate) {
      this.spawnSparkles(object.position.clone().add(new THREE.Vector3(0, 0.8, 0)), palette.yellow, 16);
    }
    this.handsOn.items[item] = object;
    this.world.add(object);
    return object;
  }

  setCampTool(tool) {
    this.campTool = tool;
    this.cancelPlacement();
    this.focusOn(this.handsOn.origin, 0.58);
  }

  unpackHandsOnTent() {
    this.campTool = null;
    this.handsOn.tent.visible = true;
    this.handsOn.tent.scale.set(0.78, 0.08, 0.78);
    this.spawnSparkles(this.handsOn.origin.clone().add(new THREE.Vector3(0, 0.6, 0)), palette.orange, 18);
    this.focusOn(this.handsOn.origin, 0.58);
  }

  assembleTentPoles() {
    this.handsOn.tent.scale.set(0.78, 0.58, 0.78);
    this.handsOn.stakes.forEach((stake) => { stake.visible = true; });
    this.spawnSparkles(this.handsOn.origin.clone().add(new THREE.Vector3(0, 1.2, 0)), palette.blue, 20);
    this.focusOn(this.handsOn.origin, 0.58);
  }

  startPlacement(item) {
    this.cancelPlacement();
    const ghost = this._createPlaceable(item);
    ghost.position.copy(this.handsOn.origin).add(new THREE.Vector3(1.6, 0.12, 0.6));
    ghost.traverse((object) => {
      if (object.isMesh) {
        object.material = object.material.clone();
        object.material.transparent = true;
        object.material.opacity = 0.48;
        object.material.depthWrite = false;
      }
    });
    this.placement = { item, ghost };
    this.world.add(ghost);
    this.canvas.classList.add('placing');
    this.focusOn(this.handsOn.origin, 0.58);
  }

  cancelPlacement() {
    if (!this.placement) return;
    this.world.remove(this.placement.ghost);
    this.placement = null;
    this.canvas.classList.remove('placing');
  }

  _placementPoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.intersectObject(this.placementPlane, false)[0]?.point;
  }

  _updatePlacementPointer(event) {
    if (!this.placement) return;
    const point = this._placementPoint(event);
    if (!point) return;
    this.placement.ghost.position.set(point.x, 0.12, point.z);
  }

  toggleBurner() {
    const burner = this.handsOn.items.burner?.userData.burner;
    if (!burner) return false;
    burner.on = !burner.on;
    burner.flame.visible = burner.on;
    burner.light.intensity = burner.on ? 1.8 : 0;
    if (burner.on) this.spawnSparkles(this.handsOn.items.burner.position.clone().add(new THREE.Vector3(0, 0.7, 0)), 0x6cbcff, 10);
    return burner.on;
  }

  prepareMeal() {
    if (this.handsOn.meal) return;
    const anchor = this.handsOn.items.table?.position ?? this.handsOn.origin;
    const meal = new THREE.Group();
    const plate = cylinder(0.44, 0.5, 0.09, palette.cream, 18);
    plate.position.y = 0.05;
    const rice = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 8), createMaterial(0xf5ead5));
    rice.scale.y = 0.65;
    rice.position.set(-0.13, 0.18, 0);
    const stew = cylinder(0.22, 0.25, 0.15, palette.coral, 12);
    stew.position.set(0.2, 0.13, 0.06);
    const greens = roundedMesh(0.22, 0.08, 0.18, 0x63a764, 0.04);
    greens.position.set(0.05, 0.14, -0.22);
    const hitArea = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 8, 6),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    hitArea.position.y = 0.2;
    meal.add(plate, rice, stew, greens, hitArea);
    meal.position.set(anchor.x - 0.35, this.handsOn.items.table ? 1.32 : 0.18, anchor.z);
    this._tagCampObject(meal, 'meal');
    this.handsOn.meal = meal;
    this.world.add(meal);
    this._createSmoke(meal, new THREE.Vector3(0, 0.45, 0));
    this.spawnSparkles(meal.position.clone(), palette.yellow, 14);
  }

  eatMeal() {
    if (!this.handsOn.meal) return;
    this.handsOn.meal.visible = false;
    this.spawnSparkles(this.player.position.clone().add(new THREE.Vector3(0, 1.7, 0)), palette.coral, 18);
  }

  startDishwashing(scrubbed = 0) {
    if (this.handsOn.dishBasin) return;
    const anchor = this.handsOn.items.table?.position ?? this.handsOn.origin;
    const basin = new THREE.Group();
    const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.58, 0.35, 16, 1, true), createMaterial(0x65b9c8));
    tub.position.y = 0.2;
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.6, 18), createMaterial(0x9de2e7, { transparent: true, opacity: 0.8 }));
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.37;
    const plateA = cylinder(0.32, 0.35, 0.05, palette.cream, 14);
    plateA.rotation.z = 0.45;
    plateA.position.set(-0.18, 0.48, 0);
    const bubbles = [];
    for (let index = 0; index < 7; index += 1) {
      const bubble = new THREE.Mesh(
        new THREE.SphereGeometry(0.07 + (index % 3) * 0.025, 8, 6),
        createMaterial(0xffffff, { transparent: true, opacity: 0.72 }),
      );
      bubble.position.set((this.random() - 0.5) * 0.8, 0.42 + this.random() * 0.2, (this.random() - 0.5) * 0.55);
      bubbles.push(bubble);
    }
    const hitArea = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 8, 6),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    hitArea.position.y = 0.38;
    basin.add(tub, water, plateA, ...bubbles, hitArea);
    basin.position.set(anchor.x + 0.95, 0.13, anchor.z + 0.55);
    basin.userData.scrubbed = scrubbed;
    this._tagCampObject(basin, 'dishes');
    this.handsOn.dishBasin = basin;
    this.world.add(basin);
    this.spawnSparkles(basin.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 0x9de2e7, 12);
  }

  scrubDishes() {
    const basin = this.handsOn.dishBasin;
    if (!basin) return 0;
    basin.userData.scrubbed = Math.min(3, (basin.userData.scrubbed ?? 0) + 1);
    basin.rotation.y += 0.12;
    this.spawnSparkles(basin.position.clone().add(new THREE.Vector3(0, 0.55, 0)), 0xdffcff, 11);
    return basin.userData.scrubbed;
  }

  storeDishes() {
    if (this.handsOn.dishBasin) this.handsOn.dishBasin.visible = false;
    if (this.handsOn.dishBox) return;
    const anchor = this.handsOn.items.table?.position ?? this.handsOn.origin;
    const box = new THREE.Group();
    const body = roundedMesh(0.95, 0.62, 0.72, 0x6d947f, 0.12);
    body.position.y = 0.31;
    const lid = roundedMesh(1.02, 0.12, 0.78, palette.cream, 0.08);
    lid.position.y = 0.67;
    box.add(body, lid);
    box.position.set(anchor.x + 1.05, 0.12, anchor.z + 0.62);
    this.handsOn.dishBox = box;
    this.world.add(setShadow(box));
    this.spawnSparkles(box.position.clone().add(new THREE.Vector3(0, 0.6, 0)), palette.mint, 12);
  }

  toggleLantern() {
    const lantern = this.handsOn.items.lantern?.userData.lantern;
    if (!lantern) return false;
    lantern.on = !lantern.on;
    lantern.light.intensity = lantern.on ? 3.2 : 0;
    lantern.shade.material.emissiveIntensity = lantern.on ? 1.4 : 0.08;
    if (lantern.on) this.spawnSparkles(this.handsOn.items.lantern.position.clone().add(new THREE.Vector3(0, 1.9, 0)), palette.yellow, 16);
    return lantern.on;
  }

  lightCampfire() {
    const fire = this.handsOn.items.campfire?.userData.campfire;
    if (!fire || fire.active) return Boolean(fire?.active);
    fire.active = true;
    fire.flameOuter.visible = true;
    fire.flameInner.visible = true;
    fire.light.intensity = 3.5;
    this.spawnSparkles(this.handsOn.items.campfire.position.clone().add(new THREE.Vector3(0, 0.9, 0)), palette.orange, 22);
    return true;
  }

  enjoyCampfire() {
    const firepit = this.handsOn.items.campfire;
    if (!firepit) return;
    this.isSeated = true;
    this.player.visible = true;
    this.player.position.copy(firepit.position).add(new THREE.Vector3(0.15, 0.48, 1.7));
    this.playerTarget.copy(this.player.position);
    this.player.rotation.y = Math.PI;
    this.focusOn(firepit.position, 0.52);
  }

  sleepInTent() {
    this.isSeated = false;
    this.player.visible = false;
    this.focusOn(this.handsOn.tent.position, 0.62);
    this.spawnSparkles(this.handsOn.tent.position.clone().add(new THREE.Vector3(0, 2.1, 0)), 0xb8c8ff, 24);
  }

  sitAtChair() {
    const chair = this.handsOn.items.chair;
    if (!chair) return;
    this.isSeated = true;
    this.activity = null;
    this.player.position.copy(chair.position).add(new THREE.Vector3(0, 0.48, 0.12));
    this.playerTarget.copy(this.player.position);
    this.player.rotation.y = chair.rotation.y + Math.PI;
    this.focusOn(chair.position, 0.48);
  }

  brewCoffee() {
    if (this.handsOn.mug) return;
    const anchor = this.handsOn.items.table?.position ?? this.handsOn.origin;
    const mug = new THREE.Group();
    const cup = cylinder(0.18, 0.15, 0.34, palette.cream, 12);
    cup.position.y = 0.17;
    const coffee = cylinder(0.145, 0.145, 0.025, 0x5a3524, 12);
    coffee.position.y = 0.35;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 6, 12, Math.PI * 1.6), createMaterial(palette.cream));
    handle.position.set(0.18, 0.2, 0);
    handle.rotation.y = Math.PI / 2;
    const hitArea = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 8, 6),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    hitArea.position.y = 0.24;
    mug.add(cup, coffee, handle, hitArea);
    mug.position.set(anchor.x + 0.45, this.handsOn.items.table ? 1.32 : 0.18, anchor.z);
    this._tagCampObject(mug, 'mug');
    this.handsOn.mug = mug;
    this.world.add(mug);
    this._createSmoke(mug, new THREE.Vector3(0, 0.48, 0));
    this.spawnSparkles(mug.position.clone(), palette.white, 12);
  }

  drinkCoffee() {
    if (!this.handsOn.mug) return;
    this.handsOn.mug.visible = false;
    this.spawnSparkles(this.player.position.clone().add(new THREE.Vector3(0, 1.8, 0)), palette.yellow, 24);
  }

  _createCamper(index, isPlayer = false) {
    const colors = [palette.coral, palette.blue, palette.yellow, 0x936ab3, palette.mint];
    const group = new THREE.Group();
    const body = roundedMesh(0.48, 0.78, 0.34, colors[index % colors.length], 0.1);
    body.position.y = 0.93;
    const head = roundedMesh(0.47, 0.48, 0.45, 0xf0c5a0, 0.16);
    head.position.y = 1.57;
    const hair = roundedMesh(0.49, 0.19, 0.47, index % 2 ? 0x5d4638 : 0x39433e, 0.1);
    hair.position.y = 1.82;
    const hat = roundedMesh(0.64, 0.12, 0.58, isPlayer ? palette.yellow : palette.cream, 0.08);
    hat.position.y = 1.92;
    const hatTop = roundedMesh(0.45, 0.2, 0.42, isPlayer ? palette.orange : palette.cream, 0.09);
    hatTop.position.y = 2.03;
    const legA = roundedMesh(0.16, 0.52, 0.17, 0x466267, 0.05);
    legA.position.set(-0.13, 0.38, 0);
    const legB = legA.clone();
    legB.position.x = 0.13;
    const armA = roundedMesh(0.13, 0.58, 0.15, 0xf0c5a0, 0.05);
    armA.position.set(-0.34, 1.0, 0);
    armA.rotation.z = -0.1;
    const armB = armA.clone();
    armB.position.x = 0.34;
    armB.rotation.z = 0.1;
    group.add(body, head, hair, hat, hatTop, legA, legB, armA, armB);
    group.userData.parts = { body, head, legA, legB, armA, armB };
    group.userData.phase = index * 1.7;
    group.userData.baseY = 0.2;
    return group;
  }

  setGuestCount(count) {
    while (this.guests.length < count) {
      const index = this.guests.length + 1;
      const camper = this._createCamper(index);
      camper.position.set(-1 + this.random() * 6, 0.2, -1 + this.random() * 4);
      camper.userData.target = new THREE.Vector3(
        -4 + this.random() * 9,
        0.2,
        -3 + this.random() * 7,
      );
      camper.userData.wait = this.random() * 2;
      this.guests.push(camper);
      this.world.add(camper);
    }
    this.guests.forEach((guest, index) => {
      guest.visible = index < count;
    });
  }

  addFacility(facility, animate = true) {
    const group = this._createFacilityObject(facility.type);
    group.position.set(facility.position[0], 0.2, facility.position[1]);
    group.rotation.y = facility.rotation ?? 0;
    group.userData.facilityId = facility.id;
    group.userData.facilityType = facility.type;
    group.userData.level = facility.level ?? 1;
    group.traverse((object) => {
      if (object.isMesh) {
        object.userData.facilityId = facility.id;
        this.selectable.push(object);
      }
    });
    if (animate) {
      group.scale.setScalar(0.01);
      group.userData.buildAnimation = 0;
      this.spawnSparkles(group.position.clone(), palette.yellow);
    }
    this.facilities.set(facility.id, group);
    this.world.add(group);
    return group;
  }

  _createFacilityObject(type) {
    if (type === 'tent') return this._createTent();
    if (type === 'glamping') return this._createGlamping();
    if (type === 'firepit') return this._createFirepit();
    if (type === 'shop') return this._createShop();
    if (type === 'caravan') return this._createCaravan();
    return new THREE.Group();
  }

  _createTent() {
    const group = new THREE.Group();
    const platform = roundedMesh(3.15, 0.24, 3.25, 0xc38b50, 0.16);
    platform.position.y = 0.12;
    const tent = new THREE.Mesh(tentGeometry(), createMaterial(palette.orange));
    tent.position.y = 0.28;
    tent.castShadow = true;
    tent.receiveShadow = true;
    const flap = new THREE.Mesh(triangleGeometry(1.05, 1.55), createMaterial(0x744c3f));
    flap.position.set(0, 0.34, 1.365);
    const mat = roundedMesh(1.0, 0.08, 0.65, palette.yellow, 0.04);
    mat.position.set(0, 0.31, 1.65);
    const lantern = this._createLantern();
    lantern.position.set(1.28, 0.27, 1.1);
    group.add(platform, tent, flap, mat, lantern);
    return setShadow(group);
  }

  _createGlamping() {
    const group = new THREE.Group();
    const deck = roundedMesh(4.1, 0.3, 3.75, 0xb97a49, 0.18);
    deck.position.y = 0.15;
    const body = roundedMesh(3.35, 2.25, 2.9, palette.cream, 0.22);
    body.position.y = 1.45;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.7, 4), createMaterial(palette.mint));
    roof.position.y = 3.18;
    roof.rotation.y = Math.PI / 4;
    const door = roundedMesh(0.8, 1.55, 0.12, palette.brown, 0.08);
    door.position.set(-0.8, 1.08, 1.52);
    const windowMaterial = createMaterial(0x79c9d2, { flatShading: false });
    windowMaterial.emissive = new THREE.Color(0x275d69);
    windowMaterial.emissiveIntensity = 0.2;
    const window = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.95, 0.1, 3, 0.08), windowMaterial);
    window.position.set(0.72, 1.65, 1.52);
    const planter = roundedMesh(1.1, 0.35, 0.38, palette.coral, 0.08);
    planter.position.set(0.72, 0.57, 1.72);
    group.add(deck, body, roof, door, window, planter);
    return setShadow(group);
  }

  _createFirepit() {
    const group = new THREE.Group();
    const ground = new THREE.Mesh(new THREE.CircleGeometry(1.75, 16), createMaterial(palette.sand));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.04;
    group.add(ground);
    for (let index = 0; index < 10; index += 1) {
      const angle = (index / 10) * Math.PI * 2;
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), createMaterial(0xb2ad97));
      stone.position.set(Math.cos(angle) * 0.72, 0.24, Math.sin(angle) * 0.72);
      stone.scale.set(1.2, 0.72, 1);
      group.add(stone);
    }
    for (let index = 0; index < 3; index += 1) {
      const log = cylinder(0.12, 0.14, 1.2, palette.brown, 7);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = index * Math.PI / 3;
      log.position.y = 0.3;
      group.add(log);
    }
    const flameOuter = new THREE.Mesh(new THREE.ConeGeometry(0.46, 1.25, 7), createMaterial(palette.orange));
    flameOuter.position.y = 0.93;
    const flameInner = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.78, 7), createMaterial(palette.yellow));
    flameInner.position.set(0.06, 0.86, 0.04);
    const light = new THREE.PointLight(0xff8c3d, 2.5, 8, 2);
    light.position.y = 1.1;
    group.add(flameOuter, flameInner, light);
    group.userData.fire = { flameOuter, flameInner, light };
    this.fireEffects.push(group.userData.fire);
    this._createSmoke(group, new THREE.Vector3(0, 1.65, 0));
    return setShadow(group);
  }

  _createShop() {
    const group = new THREE.Group();
    const base = roundedMesh(3.5, 0.25, 3.2, 0xc98c50, 0.16);
    base.position.y = 0.13;
    const body = roundedMesh(3.0, 2.3, 2.55, palette.yellow, 0.2);
    body.position.y = 1.4;
    const roof = roundedMesh(3.5, 0.48, 3.0, palette.coral, 0.14);
    roof.position.y = 2.75;
    const counter = roundedMesh(2.2, 0.85, 0.5, palette.cream, 0.1);
    counter.position.set(0, 0.86, 1.48);
    const awning = roundedMesh(2.7, 0.18, 0.88, palette.mint, 0.08);
    awning.position.set(0, 2.12, 1.58);
    awning.rotation.x = -0.17;
    const sign = this._createTextSign('CAMP SHOP', '#fff3bd', '#de644b', 2.3, 0.58);
    sign.position.set(0, 2.58, 1.56);
    group.add(base, body, roof, counter, awning, sign);
    return setShadow(group);
  }

  _createCaravan() {
    const group = new THREE.Group();
    const body = roundedMesh(3.8, 2.25, 2.2, palette.blue, 0.42);
    body.position.y = 1.65;
    const stripe = roundedMesh(3.86, 0.32, 2.24, palette.cream, 0.1);
    stripe.position.y = 1.75;
    const door = roundedMesh(0.85, 1.65, 0.12, palette.cream, 0.1);
    door.position.set(0.85, 1.4, 1.13);
    const windowMaterial = createMaterial(0x315e68);
    const window = new THREE.Mesh(new RoundedBoxGeometry(1.15, 0.78, 0.1, 3, 0.08), windowMaterial);
    window.position.set(-0.75, 1.85, 1.13);
    const wheels = [];
    for (const x of [-1.25, 1.25]) {
      const wheel = cylinder(0.42, 0.42, 0.28, 0x3c4140, 12);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.48, 0);
      wheels.push(wheel);
    }
    group.add(body, stripe, door, window, ...wheels);
    return setShadow(group);
  }

  _createLantern() {
    const group = new THREE.Group();
    const base = cylinder(0.12, 0.15, 0.18, palette.brown, 8);
    base.position.y = 0.09;
    const glow = roundedMesh(0.24, 0.34, 0.24, palette.yellow, 0.06);
    glow.position.y = 0.34;
    glow.material.emissive = new THREE.Color(0xe99a2c);
    glow.material.emissiveIntensity = 0.5;
    const cap = cylinder(0.11, 0.15, 0.1, palette.brown, 8);
    cap.position.y = 0.56;
    group.add(base, glow, cap);
    return group;
  }

  _createSmoke(parent, origin) {
    for (let index = 0; index < 4; index += 1) {
      const puff = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.18 + index * 0.05, 1),
        createMaterial(0xf1ead1, { transparent: true, opacity: 0.5, flatShading: false }),
      );
      puff.position.copy(origin).add(new THREE.Vector3(0.05 * index, index * 0.38, 0));
      puff.userData.phase = index * 0.9;
      parent.add(puff);
      this.smokePuffs.push(puff);
    }
  }

  _handlePick(event) {
    const travel = this.pointerDown.distanceTo(new THREE.Vector2(event.clientX, event.clientY));
    if (travel > 7) return;
    if (this.placement) {
      const point = this._placementPoint(event);
      if (!point) return;
      const item = this.placement.item;
      this.cancelPlacement();
      this._placeCampItem(item, [point.x, point.z]);
      this.onCampInteract?.({ type: 'placed', item, position: [point.x, point.z] });
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const campHit = this.raycaster.intersectObjects(this.campInteractables, false)[0];
    if (campHit) {
      const action = campHit.object.userData.campAction;
      const payload = campHit.object.userData.campPayload ?? {};
      if (action === 'site') {
        this.spawnSparkles(this.handsOn.origin.clone().add(new THREE.Vector3(0, 0.25, 0)), palette.yellow, 18);
        this.onCampInteract?.({ type: 'site-selected' });
        return;
      }
      if (action === 'stake') {
        if (this.campTool !== 'hammer') {
          this.onCampInteract?.({ type: 'need-tool', tool: 'hammer' });
          return;
        }
        const stake = this.handsOn.stakes[payload.index];
        if (stake.userData.driven) return;
        stake.userData.driven = true;
        stake.position.y = 0.18;
        stake.rotation.z = 0.04;
        const driven = this.handsOn.stakes.filter((item) => item.userData.driven).length;
        this.handsOn.tent.scale.y = 0.58 + driven * 0.105;
        this.spawnSparkles(stake.position.clone().add(new THREE.Vector3(0, 0.35, 0)), palette.yellow, 10);
        this.onCampInteract?.({ type: 'stake-driven', index: payload.index, count: driven });
        return;
      }
      if (action === 'chair') {
        this.sitAtChair();
        this.onCampInteract?.({ type: 'sat-down' });
        return;
      }
      if (action === 'burner') {
        const on = this.toggleBurner();
        this.onCampInteract?.({ type: 'burner-toggle', on });
        return;
      }
      if (action === 'meal') {
        this.eatMeal();
        this.onCampInteract?.({ type: 'meal-eaten' });
        return;
      }
      if (action === 'mug') {
        this.drinkCoffee();
        this.onCampInteract?.({ type: 'coffee-drunk' });
        return;
      }
      if (action === 'dishes') {
        const count = this.scrubDishes();
        this.onCampInteract?.({ type: 'dish-scrubbed', count });
        return;
      }
      if (action === 'lantern') {
        const on = this.toggleLantern();
        this.onCampInteract?.({ type: 'lantern-toggle', on });
        return;
      }
      if (action === 'campfire') {
        const on = this.lightCampfire();
        if (on) this.onCampInteract?.({ type: 'campfire-lit' });
        return;
      }
    }
    const hit = this.raycaster.intersectObjects(this.selectable, false)[0];
    if (!hit) {
      this.onSelect?.(null);
      return;
    }
    const id = hit.object.userData.facilityId;
    const facility = this.facilities.get(id);
    if (facility) {
      this.focusOn(facility.position, 0.25);
      this.onSelect?.({ id, type: facility.userData.facilityType, level: facility.userData.level });
      this.spawnSparkles(facility.position.clone().add(new THREE.Vector3(0, 2.0, 0)), palette.white, 8);
    }
  }

  focusOn(position, zoomOffset = 0) {
    this.focusTarget.copy(position);
    this.focusTarget.y = 0.6;
    this.focusAmount = 1;
    this.desiredZoom = 1.16 + zoomOffset;
  }

  setMode(mode) {
    if (mode === 'camp') {
      this.focusOn(this.handsOn.origin, 0.58);
    } else {
      this.focusTarget.set(0, 0.25, 0);
      this.focusAmount = 1;
      this.desiredZoom = 1.02;
    }
  }

  startActivity(type) {
    const target = this.activityTargets[type];
    if (!target) return;
    this.activity = type;
    this.isSeated = false;
    this.playerTarget.copy(target);
    this.focusOn(target, 0.32);
  }

  upgradeFacility(id) {
    const facility = this.facilities.get(id);
    if (!facility) return;
    facility.userData.level += 1;
    facility.userData.upgradePulse = 1;
    const flagPost = roundedMesh(0.08, 1.1, 0.08, palette.brown, 0.03);
    flagPost.position.set(1.2, 2.6 + facility.userData.level * 0.08, 0.6);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.38), createMaterial(palette.yellow));
    flag.position.set(1.52, flagPost.position.y + 0.32, 0.6);
    flag.rotation.y = Math.PI / 2;
    facility.add(flagPost, flag);
    this.spawnSparkles(facility.position.clone().add(new THREE.Vector3(0, 2.3, 0)), palette.yellow, 18);
  }

  spawnSparkles(position, color = palette.yellow, count = 14) {
    const origin = position?.isVector3
      ? position
      : new THREE.Vector3(position?.x ?? 0, position?.y ?? 0, position?.z ?? 0);
    for (let index = 0; index < count; index += 1) {
      const particle = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.07 + this.random() * 0.06, 0),
        new THREE.MeshBasicMaterial({ color, transparent: true }),
      );
      particle.position.copy(origin);
      particle.position.x += (this.random() - 0.5) * 1.4;
      particle.position.z += (this.random() - 0.5) * 1.4;
      particle.userData.velocity = new THREE.Vector3(
        (this.random() - 0.5) * 0.7,
        0.8 + this.random() * 0.8,
        (this.random() - 0.5) * 0.7,
      );
      particle.userData.life = 0.75 + this.random() * 0.55;
      particle.userData.maxLife = particle.userData.life;
      this.particles.push(particle);
      this.world.add(particle);
    }
  }

  setTime(minutes) {
    const hour = minutes / 60;
    let daylight = 1;
    if (hour < 7) daylight = Math.max(0, (hour - 5) / 2);
    if (hour > 18) daylight = Math.max(0, 1 - (hour - 18) / 3.5);
    const sunset = hour > 17 && hour < 20 ? 1 - Math.abs(hour - 18.5) / 1.5 : 0;
    const dayColor = new THREE.Color(0xefcd67);
    const sunsetColor = new THREE.Color(0xe99266);
    const nightColor = new THREE.Color(0x283b59);
    const sky = nightColor.clone().lerp(dayColor, daylight);
    sky.lerp(sunsetColor, Math.max(0, sunset) * 0.45);
    this.scene.background.copy(sky);
    this.scene.fog.color.copy(sky);
    this.hemiLight.intensity = 0.55 + daylight * 1.15;
    this.sunLight.intensity = 0.35 + daylight * 2.75;
    this.sunLight.color.set(sunset > 0.25 ? 0xffb57a : 0xfff0c4);
    this.renderer.toneMappingExposure = 0.72 + daylight * 0.34;
    this.stars.material.opacity = Math.max(0, 1 - daylight) * 0.9;
    this.fireflies.material.opacity = Math.max(0, 1 - daylight) * 0.85;
    this.isNight = daylight < 0.38;
  }

  resize() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    const aspect = width / height;
    this.camera.left = -this.frustum * aspect;
    this.camera.right = this.frustum * aspect;
    this.camera.top = this.frustum;
    this.camera.bottom = -this.frustum;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  update() {
    const now = performance.now();
    const delta = Math.min((now - this.lastUpdateTime) / 1000, 0.05);
    this.lastUpdateTime = now;
    this.elapsed += delta;
    this.controls.update();

    if (this.focusAmount > 0.001) {
      const ease = 1 - Math.pow(0.001, delta);
      this.controls.target.lerp(this.focusTarget, ease * 1.7);
      if (this.desiredZoom) {
        this.camera.zoom = THREE.MathUtils.lerp(this.camera.zoom, this.desiredZoom, ease * 1.2);
        this.camera.updateProjectionMatrix();
      }
      this.focusAmount *= Math.pow(0.08, delta);
    }

    this.water.rotation.z = Math.sin(this.elapsed * 0.18) * 0.02;
    this.waterMaterial.opacity = 0.86 + Math.sin(this.elapsed * 1.1) * 0.035;

    this.clouds.forEach((cloud, index) => {
      cloud.position.x += delta * (0.24 + index * 0.025);
      if (cloud.position.x > 24) cloud.position.x = -24;
    });

    this.fireEffects.forEach((fire, index) => {
      if (fire.active === false) {
        fire.light.intensity = 0;
        return;
      }
      const pulse = 0.9 + Math.sin(this.elapsed * 8 + index) * 0.12;
      fire.flameOuter.scale.set(pulse, 0.88 + pulse * 0.2, pulse);
      fire.flameInner.scale.set(1.05 - pulse * 0.08, pulse, 1.05 - pulse * 0.08);
      fire.flameOuter.rotation.y += delta * 0.7;
      fire.light.intensity = (this.isNight ? 3.8 : 2.2) + Math.sin(this.elapsed * 11) * 0.35;
    });

    this.smokePuffs.forEach((puff) => {
      const phase = this.elapsed * 0.35 + puff.userData.phase;
      puff.position.y += delta * 0.08;
      puff.position.x += Math.sin(phase) * delta * 0.05;
      if (puff.position.y > 4.1) puff.position.y -= 2.0;
      puff.material.opacity = 0.18 + (Math.sin(phase) + 1) * 0.12;
    });

    this.facilities.forEach((facility) => {
      if (facility.userData.buildAnimation !== undefined && facility.userData.buildAnimation < 1) {
        facility.userData.buildAnimation = Math.min(1, facility.userData.buildAnimation + delta * 2.4);
        const t = facility.userData.buildAnimation;
        const bounce = t < 0.75
          ? 1.12 * Math.sin((t / 0.75) * Math.PI / 2)
          : 1 + Math.sin(((t - 0.75) / 0.25) * Math.PI) * 0.12;
        facility.scale.setScalar(bounce);
      }
      if (facility.userData.upgradePulse > 0) {
        facility.userData.upgradePulse = Math.max(0, facility.userData.upgradePulse - delta * 1.8);
        const scale = 1 + Math.sin(facility.userData.upgradePulse * Math.PI * 4) * facility.userData.upgradePulse * 0.08;
        facility.scale.setScalar(scale);
      }
    });

    this._updatePlayer(delta);
    this._updateGuests(delta);
    this._updateParticles(delta);

    const fireflyPositions = this.fireflies.geometry.attributes.position;
    for (let index = 0; index < fireflyPositions.count; index += 1) {
      const baseY = fireflyPositions.getY(index);
      fireflyPositions.setY(index, baseY + Math.sin(this.elapsed * 2 + index) * 0.0015);
    }
    fireflyPositions.needsUpdate = true;
    this.stars.rotation.y += delta * 0.006;

    this.renderer.render(this.scene, this.camera);
  }

  _updatePlayer(delta) {
    if (this.isSeated) {
      const parts = this.player.userData.parts;
      this.player.position.y = 0.48;
      parts.legA.rotation.x = -1.25;
      parts.legB.rotation.x = -1.25;
      parts.armA.rotation.x = -0.35;
      parts.armB.rotation.x = -0.35;
      return;
    }
    const direction = this.playerTarget.clone().sub(this.player.position);
    direction.y = 0;
    const distance = direction.length();
    const parts = this.player.userData.parts;
    if (distance > 0.08) {
      direction.normalize();
      const step = Math.min(distance, delta * 2.25);
      this.player.position.addScaledVector(direction, step);
      this.player.rotation.y = Math.atan2(direction.x, direction.z);
      const walk = Math.sin(this.elapsed * 11) * 0.45;
      parts.legA.rotation.x = walk;
      parts.legB.rotation.x = -walk;
      parts.armA.rotation.x = -walk * 0.7;
      parts.armB.rotation.x = walk * 0.7;
      this.player.position.y = 0.2 + Math.abs(Math.sin(this.elapsed * 11)) * 0.05;
      if (this.activity) this.focusTarget.lerp(this.player.position, delta * 1.6);
    } else {
      parts.legA.rotation.x *= 0.82;
      parts.legB.rotation.x *= 0.82;
      parts.armA.rotation.x *= 0.82;
      parts.armB.rotation.x *= 0.82;
      this.player.position.y = 0.2 + Math.sin(this.elapsed * 2.2) * 0.018;
      if (this.activity) {
        const finished = this.activity;
        this.activity = null;
        this.spawnSparkles(this.player.position.clone().add(new THREE.Vector3(0, 1.4, 0)), palette.yellow, 12);
        this.onActivityComplete?.(finished);
      }
    }
  }

  _updateGuests(delta) {
    this.guests.forEach((guest, index) => {
      if (!guest.visible) return;
      guest.userData.wait -= delta;
      if (guest.userData.wait <= 0) {
        const target = guest.userData.target;
        const direction = target.clone().sub(guest.position);
        direction.y = 0;
        if (direction.length() < 0.16) {
          guest.userData.wait = 1.5 + this.random() * 3;
          target.set(-4.2 + this.random() * 9.2, 0.2, -2.7 + this.random() * 6.4);
        } else {
          direction.normalize();
          guest.position.addScaledVector(direction, delta * (0.55 + (index % 3) * 0.08));
          guest.rotation.y = Math.atan2(direction.x, direction.z);
          const walk = Math.sin(this.elapsed * 7 + guest.userData.phase) * 0.32;
          guest.userData.parts.legA.rotation.x = walk;
          guest.userData.parts.legB.rotation.x = -walk;
          guest.position.y = 0.2 + Math.abs(Math.sin(this.elapsed * 7 + index)) * 0.025;
        }
      } else {
        guest.position.y = 0.2 + Math.sin(this.elapsed * 2 + index) * 0.012;
      }
    });
  }

  _updateParticles(delta) {
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.userData.life -= delta;
      particle.position.addScaledVector(particle.userData.velocity, delta);
      particle.userData.velocity.y -= delta * 0.65;
      particle.rotation.x += delta * 5;
      particle.rotation.y += delta * 4;
      particle.material.opacity = Math.max(0, particle.userData.life / particle.userData.maxLife);
      particle.scale.setScalar(0.7 + particle.material.opacity * 0.4);
      if (particle.userData.life <= 0) {
        this.world.remove(particle);
        particle.geometry.dispose();
        particle.material.dispose();
        this.particles.splice(index, 1);
      }
    }
  }

  getFacilityInfo(type) {
    return facilityInfo[type];
  }
}
