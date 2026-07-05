import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EcoFriendlyAnalysis, EcoPlacement, EcoViewLayers, EcoWallSide } from '../../types/ecoAnalysis';
import { DetectedWall, FloorPlanAnalysis, FloorPlanPoint, FloorPlanRoom } from '../../types/floorPlan';
import { buildWallsFromRooms } from '../../utils/planWallUtils';

type EcoFriendlyModel3DProps = {
  plan: FloorPlanAnalysis;
  analysis: EcoFriendlyAnalysis;
  activeLayers: EcoViewLayers;
  sketchPreview?: string;
};

const ROOM_COLORS: Record<string, number> = {
  living: 0x46a8ef,
  kitchen: 0xf59e0b,
  bedroom: 0x00937e,
  bathroom: 0x7c3aed,
  hall: 0x64748b,
  other: 0x94a3b8,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toScenePoint(point: FloorPlanPoint, scale: number, offsetX: number, offsetZ: number) {
  return {
    x: point.x * scale - offsetX,
    z: point.y * scale - offsetZ,
  };
}

function getPlanScale(plan: FloorPlanAnalysis) {
  return 6 / Math.max(plan.totalWidth, plan.totalLength, 1);
}

function getPlanOffsets(plan: FloorPlanAnalysis, scale: number) {
  return {
    offsetX: (plan.totalWidth * scale) / 2,
    offsetZ: (plan.totalLength * scale) / 2,
  };
}

function getRoomPolygon(room: FloorPlanRoom): FloorPlanPoint[] {
  if (room.vertices && room.vertices.length >= 3) {
    return room.vertices;
  }

  return [
    { x: room.x, y: room.y },
    { x: room.x + room.width, y: room.y },
    { x: room.x + room.width, y: room.y + room.length },
    { x: room.x, y: room.y + room.length },
  ];
}

function getWallPosition(
  room: FloorPlanRoom,
  wall: EcoWallSide,
  offset: number,
  scale: number,
  offsetX: number,
  offsetZ: number,
) {
  const t = clamp(offset, 0.05, 0.95);
  let planX = room.x;
  let planY = room.y;

  switch (wall) {
    case 'north':
      planX = room.x + t * room.width;
      planY = room.y;
      break;
    case 'south':
      planX = room.x + t * room.width;
      planY = room.y + room.length;
      break;
    case 'west':
      planX = room.x;
      planY = room.y + t * room.length;
      break;
    case 'east':
      planX = room.x + room.width;
      planY = room.y + t * room.length;
      break;
  }

  const scene = toScenePoint({ x: planX, y: planY }, scale, offsetX, offsetZ);
  return { x: scene.x, z: scene.z, wall };
}

function addWallMesh(
  group: THREE.Group,
  wall: DetectedWall,
  scale: number,
  offsetX: number,
  offsetZ: number,
  wallHeight: number,
) {
  const horizontal = wall.orientation === 'horizontal';
  const thicknessM = horizontal ? wall.length : wall.width;
  const spanM = horizontal ? wall.width : wall.length;
  const thickness = Math.max(thicknessM * scale, 0.035);
  const span = Math.max(spanM * scale, 0.08);
  const centerX = (wall.x + wall.width / 2) * scale - offsetX;
  const centerZ = (wall.y + wall.length / 2) * scale - offsetZ;

  const geometry = horizontal
    ? new THREE.BoxGeometry(span, wallHeight, thickness)
    : new THREE.BoxGeometry(thickness, wallHeight, span);

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.38,
    metalness: 0.02,
    transparent: true,
    opacity: 0.94,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(centerX, wallHeight / 2 + 0.04, centerZ);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function addEcoMarker(
  group: THREE.Group,
  room: FloorPlanRoom,
  placement: EcoPlacement,
  kind: 'ventilation' | 'light' | 'reflective',
  scale: number,
  offsetX: number,
  offsetZ: number,
  wallHeight: number,
) {
  const { x, z, wall } = getWallPosition(room, placement.wall, placement.offset, scale, offsetX, offsetZ);
  const markerGroup = new THREE.Group();
  const panelWidth = 0.55;
  const panelHeight = 0.42;
  const yCenter = wallHeight * 0.52;

  let panelColor = 0x38bdf8;
  let emissive = 0x0ea5e9;
  let metalness = 0.1;
  let roughness = 0.35;

  if (kind === 'light') {
    panelColor = 0xfbbf24;
    emissive = 0xf59e0b;
  } else if (kind === 'reflective') {
    panelColor = 0x67e8f9;
    emissive = 0x22d3ee;
    metalness = 0.85;
    roughness = 0.08;
  }

  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(panelWidth, panelHeight),
    new THREE.MeshStandardMaterial({
      color: panelColor,
      emissive,
      emissiveIntensity: kind === 'reflective' ? 0.35 : 0.55,
      metalness,
      roughness,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
    }),
  );

  const depth = 0.06;
  if (wall === 'north') {
    panel.position.set(x, yCenter, z - depth);
  } else if (wall === 'south') {
    panel.position.set(x, yCenter, z + depth);
  } else if (wall === 'west') {
    panel.rotation.y = Math.PI / 2;
    panel.position.set(x - depth, yCenter, z);
  } else {
    panel.rotation.y = -Math.PI / 2;
    panel.position.set(x + depth, yCenter, z);
  }

  markerGroup.add(panel);

  if (kind === 'ventilation') {
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.28, 8),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0284c7, emissiveIntensity: 0.4 }),
    );
    arrow.rotation.z = -Math.PI / 2;
    arrow.position.set(x, yCenter + 0.55, z);
    markerGroup.add(arrow);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.28, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.06, z);
    markerGroup.add(ring);
  }

  if (kind === 'light') {
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 1.1, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfde68a,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    beam.position.set(x, yCenter - 0.35, z);
    markerGroup.add(beam);

    const glow = new THREE.PointLight(0xfbbf24, 0.85, 2.8);
    glow.position.set(x, yCenter + 0.2, z);
    markerGroup.add(glow);
  }

  if (kind === 'reflective') {
    const sunBlock = new THREE.Mesh(
      new THREE.CircleGeometry(0.2, 24),
      new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.35 }),
    );
    sunBlock.position.set(x, yCenter + 0.75, z - 0.5);
    markerGroup.add(sunBlock);

    const bounce = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0.3, 0.5).normalize(),
      new THREE.Vector3(x, yCenter + 0.75, z - 0.45),
      0.5,
      0xf97316,
      0.12,
      0.08,
    );
    markerGroup.add(bounce);
  }

  group.add(markerGroup);
}

function addWindFlows(
  group: THREE.Group,
  plan: FloorPlanAnalysis,
  analysis: EcoFriendlyAnalysis,
  scale: number,
  offsetX: number,
  offsetZ: number,
) {
  const roomById = new Map(plan.rooms.map((room) => [room.id, room]));
  const processedRooms = new Set<string>();

  analysis.ventilationPoints.forEach((point, index) => {
    if (processedRooms.has(point.roomId)) return;

    const room = roomById.get(point.roomId);
    if (!room) return;

    const roomVents = analysis.ventilationPoints.filter((item) => item.roomId === point.roomId);
    const start = roomVents[0];
    const end = roomVents.find(
      (item) =>
        item.id !== start.id &&
        ((item.wall === 'north' && start.wall === 'south') ||
          (item.wall === 'south' && start.wall === 'north') ||
          (item.wall === 'east' && start.wall === 'west') ||
          (item.wall === 'west' && start.wall === 'east')),
    );

    const from = start;
    const to = end ?? roomVents[1] ?? start;

    const fromPos = getWallPosition(room, from.wall, from.offset, scale, offsetX, offsetZ);
    const toPos = getWallPosition(room, to.wall, to.offset, scale, offsetX, offsetZ);

    const startVec = new THREE.Vector3(fromPos.x, 0.35, fromPos.z);
    const endVec = new THREE.Vector3(toPos.x, 0.35, toPos.z);
    const midVec = startVec.clone().lerp(endVec, 0.5);
    midVec.y += 0.25 + index * 0.02;

    const curve = new THREE.QuadraticBezierCurve3(startVec, midVec, endVec);
    const points = curve.getPoints(20);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.75 }),
    );
    group.add(line);

    const direction = endVec.clone().sub(startVec).normalize();
    const arrow = new THREE.ArrowHelper(direction, midVec, 0.45, 0x0284c7, 0.14, 0.1);
    group.add(arrow);

    processedRooms.add(point.roomId);
  });
}

export function EcoFriendlyModel3D({
  plan,
  analysis,
  activeLayers,
  sketchPreview,
}: EcoFriendlyModel3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const hasRooms = plan.rooms.length > 0;
    const detectedWalls =
      (plan.detectedWalls?.length ?? 0) > 0
        ? plan.detectedWalls!
        : buildWallsFromRooms(plan.rooms);

    if (!container || (!hasRooms && detectedWalls.length === 0)) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe8f4f0);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(7.8, 7.4, 8.8);
    camera.lookAt(0, 1.1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    scene.add(new THREE.HemisphereLight(0xfff7ed, 0xd7e0df, 0.65));

    const sunLight = new THREE.DirectionalLight(0xffedd5, 1.35);
    sunLight.position.set(10, 14, 4);
    sunLight.castShadow = true;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.45);
    fillLight.position.set(-6, 5, -4);
    scene.add(fillLight);

    const planGroup = new THREE.Group();
    const ecoGroup = new THREE.Group();
    const scale = getPlanScale(plan);
    const { offsetX, offsetZ } = getPlanOffsets(plan, scale);
    const wallHeight = clamp(plan.ceilingHeight * 0.55, 1.0, 1.8);

    const roomById = new Map(plan.rooms.map((room) => [room.id, room]));

    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(plan.totalWidth * scale + 0.4, 0.05, plan.totalLength * scale + 0.4),
      new THREE.MeshStandardMaterial({ color: 0xdce4e3, roughness: 0.95 }),
    );
    slab.position.set(0, 0.01, 0);
    slab.receiveShadow = true;
    planGroup.add(slab);

    if (sketchPreview) {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(sketchPreview, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        const sketchFloor = new THREE.Mesh(
          new THREE.PlaneGeometry(plan.totalWidth * scale, plan.totalLength * scale),
          new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.72,
            depthWrite: false,
          }),
        );
        sketchFloor.rotation.x = -Math.PI / 2;
        sketchFloor.position.y = 0.028;
        planGroup.add(sketchFloor);
      });
    }

    plan.rooms.forEach((room) => {
      const roomGroup = new THREE.Group();
      const polygon = getRoomPolygon(room);
      const color = ROOM_COLORS[room.type] ?? ROOM_COLORS.other;

      const floorMaterial = new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity: 0.16,
        roughness: 0.9,
        depthWrite: false,
      });
      const edgeMaterial = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.45,
      });

      const shape = new THREE.Shape();
      polygon.forEach((point, index) => {
        const scenePoint = toScenePoint(point, scale, offsetX, offsetZ);
        if (index === 0) shape.moveTo(scenePoint.x, scenePoint.z);
        else shape.lineTo(scenePoint.x, scenePoint.z);
      });
      shape.closePath();

      const floor = new THREE.Mesh(
        new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false }),
        floorMaterial,
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = 0.032;
      roomGroup.add(floor);

      const outlinePoints = polygon.map((point) => {
        const scenePoint = toScenePoint(point, scale, offsetX, offsetZ);
        return new THREE.Vector3(scenePoint.x, 0.05, scenePoint.z);
      });
      outlinePoints.push(outlinePoints[0].clone());
      roomGroup.add(
        new THREE.Line(new THREE.BufferGeometry().setFromPoints(outlinePoints), edgeMaterial),
      );

      planGroup.add(roomGroup);
    });

    detectedWalls.forEach((wall) => {
      addWallMesh(planGroup, wall, scale, offsetX, offsetZ, wallHeight);
    });

    const addPlacements = (
      placements: EcoPlacement[],
      kind: 'ventilation' | 'light' | 'reflective',
    ) => {
      placements.forEach((placement) => {
        const room = roomById.get(placement.roomId);
        if (!room) return;
        addEcoMarker(ecoGroup, room, placement, kind, scale, offsetX, offsetZ, wallHeight);
      });
    };

    if (activeLayers.ventilacion) {
      addPlacements(analysis.ventilationPoints, 'ventilation');
    }
    if (activeLayers.luz) {
      addPlacements(analysis.lightPoints, 'light');
    }
    if (activeLayers.ventanas) {
      addPlacements(analysis.reflectiveWindows, 'reflective');
    }
    if (activeLayers.viento) {
      addWindFlows(ecoGroup, plan, analysis, scale, offsetX, offsetZ);
    }

    planGroup.add(ecoGroup);
    planGroup.rotation.y = -0.4;
    scene.add(planGroup);

    let frameId = 0;
    let isDragging = false;
    let lastPointerX = 0;

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      const canvasHeight = Math.max(420, clientHeight || Math.round(clientWidth * 0.72));
      renderer.setSize(clientWidth, canvasHeight, false);
      camera.aspect = clientWidth / canvasHeight;
      camera.updateProjectionMatrix();
    };

    const animate = () => {
      if (!isDragging) planGroup.rotation.y += 0.0008;
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };

    const handlePointerDown = (event: PointerEvent) => {
      isDragging = true;
      lastPointerX = event.clientX;
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isDragging) return;
      planGroup.rotation.y += (event.clientX - lastPointerX) * 0.006;
      lastPointerX = event.clientX;
    };

    const handlePointerUp = (event: PointerEvent) => {
      isDragging = false;
      renderer.domElement.releasePointerCapture(event.pointerId);
    };

    const preventScroll = (event: WheelEvent) => event.preventDefault();

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('wheel', preventScroll, { passive: false });
    container.addEventListener('wheel', preventScroll, { passive: false });
    window.addEventListener('resize', resize);
    resize();
    animate();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('wheel', preventScroll);
      container.removeEventListener('wheel', preventScroll);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [plan, analysis, activeLayers, sketchPreview]);

  return (
    <div
      className="floor-plan-model-3d eco-friendly-model-3d"
      ref={containerRef}
      aria-label="Modelo 3D ecofriendly con ventilación, luz y ventanas reflectantes"
    />
  );
}
