import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { DetectedWall, FloorPlanAnalysis, FloorPlanPoint, FloorPlanRoom } from '../../types/floorPlan';
import { buildWallsFromRooms } from '../../utils/planWallUtils';

type FloorPlanModel3DProps = {
  plan: FloorPlanAnalysis;
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

export function FloorPlanModel3D({ plan, sketchPreview }: FloorPlanModel3DProps) {
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
    scene.background = new THREE.Color(0xeef2f6);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(7.8, 7.2, 8.8);
    camera.lookAt(0, 1.1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.25));
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd7e0df, 0.55));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
    keyLight.position.set(8, 12, 6);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-6, 5, -4);
    scene.add(fillLight);

    const planGroup = new THREE.Group();
    const scale = getPlanScale(plan);
    const { offsetX, offsetZ } = getPlanOffsets(plan, scale);
    const wallHeight = clamp(plan.ceilingHeight * 0.55, 1.0, 1.8);

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
  }, [plan, sketchPreview]);

  return (
    <div
      className="floor-plan-model-3d"
      ref={containerRef}
      aria-label="Modelo 3D del plano interpretado"
    />
  );
}
