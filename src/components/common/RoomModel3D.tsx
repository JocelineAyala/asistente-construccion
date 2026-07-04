import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type RoomModel3DProps = {
  height: number;
  length: number;
  mode: 'temperature' | 'ventilation';
  showWindows: boolean;
  width: number;
};

function clampDimension(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function RoomModel3D({
  height,
  length,
  mode,
  showWindows,
  width,
}: RoomModel3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);

    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100);
    camera.position.set(5.2, 4.2, 6.4);
    camera.lookAt(0, 0.9, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 2.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(4, 6, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const room = new THREE.Group();
    const roomLength = clampDimension(length);
    const roomWidth = clampDimension(width);
    const roomHeight = clampDimension(height);
    const maxFootprint = Math.max(roomLength, roomWidth);
    const normalizedLength = (roomLength / maxFootprint) * 4;
    const normalizedWidth = (roomWidth / maxFootprint) * 4;
    const normalizedHeight = Math.max(1.6, Math.min(3.4, roomHeight * 0.85));

    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xd9eee7, roughness: 0.75 });
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      opacity: 0.82,
      roughness: 0.65,
      transparent: true,
    });
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x0f766e, transparent: true, opacity: 0.45 });

    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(normalizedWidth, 0.06, normalizedLength),
      floorMaterial,
    );
    floor.receiveShadow = true;
    room.add(floor);

    const wallThickness = 0.06;
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(normalizedWidth, normalizedHeight, wallThickness),
      wallMaterial,
    );
    backWall.position.set(0, normalizedHeight / 2, -normalizedLength / 2);
    room.add(backWall);

    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, normalizedHeight, normalizedLength),
      wallMaterial,
    );
    leftWall.position.set(-normalizedWidth / 2, normalizedHeight / 2, 0);
    room.add(leftWall);

    const rightWall = leftWall.clone();
    rightWall.position.x = normalizedWidth / 2;
    room.add(rightWall);

    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(normalizedWidth, normalizedHeight, normalizedLength)),
      edgeMaterial,
    );
    outline.position.y = normalizedHeight / 2;
    room.add(outline);

    if (showWindows) {
      const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        emissive: 0x164e63,
        emissiveIntensity: 0.12,
        opacity: 0.72,
        transparent: true,
      });
      const windowPanel = new THREE.Mesh(
        new THREE.BoxGeometry(Math.max(0.8, normalizedWidth * 0.34), 0.68, 0.035),
        windowMaterial,
      );
      windowPanel.position.set(0, normalizedHeight * 0.58, -normalizedLength / 2 - 0.035);
      room.add(windowPanel);
    }

    const accentColor = mode === 'ventilation' ? 0x14b8a6 : 0xf59e0b;
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.85,
    });

    const flowGroup = new THREE.Group();
    const flowCount = mode === 'ventilation' ? 3 : 5;

    for (let index = 0; index < flowCount; index += 1) {
      const radius = mode === 'ventilation' ? 0.025 : 0.045;
      const lengthScale = mode === 'ventilation' ? normalizedLength * 0.5 : normalizedHeight * 0.5;
      const cylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, lengthScale, 18),
        accentMaterial,
      );
      const cone = new THREE.Mesh(new THREE.ConeGeometry(radius * 3.2, 0.18, 18), accentMaterial);

      if (mode === 'ventilation') {
        cylinder.rotation.x = Math.PI / 2;
        cylinder.position.set((index - 1) * 0.62, normalizedHeight * (0.42 + index * 0.08), -0.15);
        cone.rotation.x = Math.PI / 2;
        cone.position.set(cylinder.position.x, cylinder.position.y, normalizedLength * 0.24);
      } else {
        cylinder.position.set((index - 2) * 0.38, normalizedHeight * 0.28, (index % 2) * 0.58 - 0.25);
        cone.position.set(cylinder.position.x, normalizedHeight * 0.58, cylinder.position.z);
      }

      flowGroup.add(cylinder);
      flowGroup.add(cone);
    }

    room.add(flowGroup);
    room.rotation.y = -0.58;
    scene.add(room);

    let frameId = 0;
    let isDragging = false;
    let lastPointerX = 0;

    const resize = () => {
      const { clientWidth } = container;
      const canvasHeight = Math.max(260, Math.round(clientWidth * 0.78));
      renderer.setSize(clientWidth, canvasHeight, false);
      camera.aspect = clientWidth / canvasHeight;
      camera.updateProjectionMatrix();
    };

    const animate = () => {
      flowGroup.position.y = Math.sin(performance.now() * 0.002) * 0.05;
      if (!isDragging) {
        room.rotation.y += 0.002;
      }
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };

    const handlePointerDown = (event: PointerEvent) => {
      isDragging = true;
      lastPointerX = event.clientX;
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isDragging) {
        return;
      }

      const delta = event.clientX - lastPointerX;
      room.rotation.y += delta * 0.01;
      lastPointerX = event.clientX;
    };

    const handlePointerUp = (event: PointerEvent) => {
      isDragging = false;
      renderer.domElement.releasePointerCapture(event.pointerId);
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('resize', resize);
    resize();
    animate();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [height, length, mode, showWindows, width]);

  return <div className="room-model-3d" ref={containerRef} aria-label="Modelo 3D del cuarto" />;
}
