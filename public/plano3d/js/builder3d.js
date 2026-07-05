// builder3d.js
// Convierte segmentos de pared 2D en un modelo 3D REALISTA con Three.js.
// Mantiene la estructura (paredes extruidas) pero añade:
//   - Iluminación basada en imagen (RoomEnvironment) + tone mapping ACES.
//   - Sombras suaves.
//   - Texturas PBR procedurales (yeso en muros, madera en piso).
//   - Muebles con geometría redondeada y materiales.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export class Builder3D {
  constructor(container) {
    this.container = container;
    this.wallHeight = 2.6;
    this.placeMode = null;
    this.furniture = [];

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf4f8fb);

    const w = container.clientWidth || 400;
    const h = container.clientHeight || 300;
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    this.camera.position.set(7, 9, 11);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 1, 0);

    // --- Iluminación realista basada en imagen (IBL) ---
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xc7d2dd, 0.62));
    const sun = new THREE.DirectionalLight(0xffffff, 2.55);
    sun.position.set(8, 16, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
    sun.shadow.bias = -0.0002;
    this.scene.add(sun);

    // --- Texturas procedurales ---
    this.wallMat = new THREE.MeshStandardMaterial({
      map: makePlasterTexture(),
      roughness: 0.92,
      metalness: 0.0,
      color: 0xf3efe7,
    });
    const woodTex = makeWoodTexture();
    woodTex.repeat.set(6, 6);

    this.floorMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.75, metalness: 0.0 });
    this.floor = null;
    this.roof = null;
    this.roofVisible = true;
    this.floorPlanTexture = null;
    this.floorPlanMesh = null;

    this.wallGroup = new THREE.Group();
    this.furnitureGroup = new THREE.Group();
    this.roofGroup = new THREE.Group();
    this.scene.add(this.wallGroup, this.furnitureGroup, this.roofGroup);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // --- Edición de muros en 3D ---
    this.wallEditMode = "none"; // 'none' | 'select' | 'add' | 'delete'
    this.onWallPick = null; // (segmentIndex) => void   (select/delete)
    this.onWallAdd = null; // (segmentoEnPx) => void     (add)
    this._corners = []; // esquinas (aristas) para imantar: {world, px, py}
    this._cornerKeys = new Set();
    this._cornerGroup = new THREE.Group();
    this._cornerGroup.visible = false;
    this.scene.add(this._cornerGroup);
    this._selectedIndex = null;
    this._hoverIndex = null;
    this._addStart = null;
    this._downPos = null;
    this._groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._selectMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.7, emissive: 0x4a3600 });
    this._hoverMat = new THREE.MeshStandardMaterial({ color: 0xf87171, roughness: 0.7, emissive: 0x4a1010 });

    // Ventanas y puertas
    this.onOpeningAdd = null; // ({x, y (px), type}) => void
    this.openings = []; // [{x, y, type: 'window'|'door'}]
    this.openingCfg = { windowWidth: 1.1, windowHeight: 1.1, sill: 0.9, doorWidth: 0.9, doorHeight: 2.05 };
    this.openingGroup = new THREE.Group();
    this.scene.add(this.openingGroup);
    this.acGroup = new THREE.Group();
    this.scene.add(this.acGroup);
    this.acSuggestion = null;
    this.windGroup = new THREE.Group();
    this.scene.add(this.windGroup);
    this.windOverlay = { visible: false, pairs: [], bounds: null };
    this._glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xcff4ff, roughness: 0.02, metalness: 0, transmission: 0.92,
      transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false,
    });
    this._frameMat = new THREE.MeshStandardMaterial({ color: 0x3a4653, roughness: 0.6 });
    this._doorMat = new THREE.MeshStandardMaterial({ color: 0xb5793f, roughness: 0.55 });

    const dom = this.renderer.domElement;
    dom.addEventListener("pointerdown", (e) => this._onPointerDown(e));
    dom.addEventListener("pointermove", (e) => this._onPointerMove(e));
    dom.addEventListener("pointerup", (e) => this._onPointerUp(e));

    window.addEventListener("resize", () => this._resize());
    this._animate();
  }

  buildWalls(segments, imgW, imgH, wallHeight = 2.6) {
    this.wallHeight = wallHeight;
    this.wallGroup.clear();
    this.roofGroup.clear();
    if (this.floor) {
      this.scene.remove(this.floor);
      this.floor.geometry.dispose();
      this.floor = null;
    }
    if (this.floorPlanMesh) {
      this.scene.remove(this.floorPlanMesh);
      this.floorPlanMesh.geometry.dispose();
      this.floorPlanMesh = null;
    }
    this.openingGroup.clear();
    this._segments = segments;
    this._imgW = imgW;
    this._imgH = imgH;

    const worldW = 12;
    this.scaleFactor = worldW / imgW;
    const thickness = 0.14;
    const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
    this._corners = [];
    this._cornerKeys = new Set();
    this._selectedIndex = null;
    this._hoverIndex = null;

    segments.forEach((s, index) => {
      const a = this._toWorld(s.x1, s.y1);
      const b = this._toWorld(s.x2, s.y2);
      const len = a.distanceTo(b);
      if (len < 0.15) return;
      expandBounds(bounds, a);
      expandBounds(bounds, b);

      // Construye el muro dejando huecos para ventanas/puertas de este tramo.
      this._buildWallWithOpenings(a, b, index, wallHeight, thickness);

      // Registra las esquinas (aristas) para imantar al agregar.
      this._registerCorner(a, s.x1, s.y1);
      this._registerCorner(b, s.x2, s.y2);
    });

    this.openings
      .filter((opening) => opening.span)
      .forEach((opening) => this._buildSpanOpening(opening, wallHeight, thickness, bounds));

    this._rebuildCornerMarkers();
    this._buildBoundedFloor(bounds, thickness);
    this._buildRoof(bounds, thickness);
    this._renderACSuggestion();
    this._renderWindOverlay();
    if (this._floorPlanSource) {
      this.setFloorPlanTexture(this._floorPlanSource, this._floorPlanImgW, this._floorPlanImgH);
    }
  }

  setWallHeight(h) {
    if (this._segments) this.buildWalls(this._segments, this._imgW, this._imgH, h);
  }

  setRoofVisible(visible) {
    this.roofVisible = !!visible;
    this.roofGroup.visible = this.roofVisible;
  }

  // ---------- Ventanas y puertas ----------
  setOpenings(openings, cfg) {
    if (Array.isArray(openings)) this.openings = openings;
    if (cfg) this.openingCfg = { ...this.openingCfg, ...cfg };
    if (this._segments) this.buildWalls(this._segments, this._imgW, this._imgH, this.wallHeight);
    this.highlightSegment(this._selectedIndex);
  }

  // Construye un muro (a→b) dejando huecos donde caen ventanas/puertas.
  setACSuggestion(suggestion) {
    this.acSuggestion = suggestion || null;
    this._renderACSuggestion();
  }

  setWindOverlay(data) {
    this.windOverlay = data || { visible: false, pairs: [], bounds: null };
    this._renderWindOverlay();
  }

  _buildWallWithOpenings(a, b, index, wallHeight, thickness) {
    const dir = b.clone().sub(a);
    const L = dir.length();
    if (L < 0.15) return;
    dir.normalize();

    // Aberturas que caen sobre este muro, ordenadas por distancia desde 'a'.
    const cfg = this.openingCfg;
    const ops = [];
    for (const op of this.openings) {
      if (op.span) continue;
      const w = this._toWorld(op.x, op.y);
      const rel = w.clone().sub(a);
      const d = rel.dot(dir);
      if (d < -thickness || d > L + thickness) continue;
      const perp = rel.clone().sub(dir.clone().multiplyScalar(d)).length();
      if (perp > 0.4) continue; // no está sobre este muro
      const width = op.type === "door" ? cfg.doorWidth : cfg.windowWidth;
      ops.push({
        d: Math.max(0, Math.min(L, d)),
        width: Math.min(width, L),
        type: op.type,
        swing: op.swing || 1,
        hinge: op.hinge || "start",
        clearance: op.clearance ?? 0.08,
        sideOffset: op.sideOffset || 0,
      });
    }
    ops.sort((p, q) => p.d - q.d);

    // Tramos macizos entre aberturas (un poco más largos para cerrar esquinas).
    let cursor = -thickness / 2;
    const solid = (d0, d1) => {
      const len = d1 - d0;
      if (len <= 0.02) return;
      const piece = this._wallPiece(a, dir, d0, d1, 0, wallHeight, thickness, index);
      this.wallGroup.add(piece);
    };

    for (const op of ops) {
      const start = Math.max(-thickness / 2, op.d - op.width / 2);
      const end = Math.min(L + thickness / 2, op.d + op.width / 2);
      const cutWidth = end - start;
      const cutCenter = (start + end) / 2;
      if (cutWidth <= 0.04) continue;
      solid(cursor, start);
      if (op.type === "window") {
        // dintel y antepecho (arriba y abajo del hueco)
        this.wallGroup.add(this._wallPiece(a, dir, start, end, 0, cfg.sill, thickness, index));
        this.wallGroup.add(
          this._wallPiece(a, dir, start, end, cfg.sill + cfg.windowHeight, wallHeight, thickness, index)
        );
        this._addWindow(a, dir, cutCenter, cutWidth, cfg.sill, cfg.windowHeight, thickness);
      } else {
        this._addDoor(a, dir, cutCenter, cutWidth, thickness, op.swing || 1, op.hinge || "start", op.clearance ?? 0.08, op.sideOffset || 0);
      }
      cursor = end;
    }
    solid(cursor, L + thickness / 2);
  }

  _buildSpanOpening(opening, wallHeight, thickness, bounds) {
    const a = this._toWorld(opening.x1, opening.y1);
    const b = this._toWorld(opening.x2, opening.y2);
    const dir = b.clone().sub(a);
    const L = dir.length();
    if (L < 0.15) return;
    dir.normalize();
    expandBounds(bounds, a);
    expandBounds(bounds, b);

    if (opening.type === "door") {
      this._addDoor(a, dir, L / 2, L, thickness, opening.swing || 1, opening.hinge || "start", opening.clearance ?? 0.08, opening.sideOffset || 0);
      return;
    }

    const cfg = this.openingCfg;
    this.wallGroup.add(this._wallPiece(a, dir, 0, L, 0, cfg.sill, thickness, -1));
    this.wallGroup.add(
      this._wallPiece(a, dir, 0, L, cfg.sill + cfg.windowHeight, wallHeight, thickness, -1)
    );
    this._addWindow(a, dir, L / 2, L, cfg.sill, cfg.windowHeight, thickness);
  }

  _wallPiece(a, dir, d0, d1, y0, y1, thickness, index) {
    const len = Math.max(0.001, d1 - d0);
    const geo = new THREE.BoxGeometry(len, y1 - y0, thickness);
    const mesh = new THREE.Mesh(geo, this.wallMat);
    const midD = (d0 + d1) / 2;
    const pos = a.clone().add(dir.clone().multiplyScalar(midD));
    mesh.position.set(pos.x, (y0 + y1) / 2, pos.z);
    mesh.rotation.y = -Math.atan2(dir.z, dir.x);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.segmentIndex = index;
    return mesh;
  }

  _addWindow(a, dir, d, width, sill, height, thickness) {
    const center = a.clone().add(dir.clone().multiplyScalar(d));
    const rotY = -Math.atan2(dir.z, dir.x);
    const y = sill + height / 2;
    const bar = Math.min(0.07, Math.max(0.035, width * 0.07));

    const addBar = (offsetD, offsetY, w, h) => {
      const p = center.clone().add(dir.clone().multiplyScalar(offsetD));
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, thickness * 1.15), this._frameMat);
      frame.position.set(p.x, y + offsetY, p.z);
      frame.rotation.y = rotY;
      frame.castShadow = true;
      this.openingGroup.add(frame);
    };

    addBar(0, height / 2 - bar / 2, width, bar);
    addBar(0, -height / 2 + bar / 2, width, bar);
    addBar(-width / 2 + bar / 2, 0, bar, height);
    addBar(width / 2 - bar / 2, 0, bar, height);

    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(0.05, width - bar * 2.2), Math.max(0.05, height - bar * 2.2), thickness * 0.22),
      this._glassMat
    );
    glass.position.set(center.x, y, center.z);
    glass.rotation.y = rotY;
    glass.renderOrder = 5;
    this.openingGroup.add(glass);
  }

  _addDoor(a, dir, d, width, thickness, swing = 1, hingeSide = "start", clearance = 0.08, sideOffset = 0) {
    const cfg = this.openingCfg;
    const doorH = cfg.doorHeight;
    const dShifted = d + sideOffset;
    // Bisagra en el borde izquierdo del hueco (según dirección del muro).
    const hingeD = hingeSide === "end" ? dShifted + width / 2 : dShifted - width / 2;
    const hingeDir = hingeSide === "end" ? dir.clone().multiplyScalar(-1) : dir.clone();
    const hinge = a.clone().add(dir.clone().multiplyScalar(hingeD));
    // Perpendicular hacia adentro (giro 90°): la puerta se dibuja abierta.
    const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize().multiplyScalar(swing >= 0 ? 1 : -1);
    const safeClearance = Math.max(thickness * 0.5, Math.min(clearance, 0.1));
    const shiftedHinge = hinge.clone().add(perp.clone().multiplyScalar(safeClearance));

    const leaf = new THREE.Mesh(new THREE.BoxGeometry(width, doorH, 0.05), this._doorMat);
    const leafMid = shiftedHinge.clone().add(perp.clone().multiplyScalar(width / 2));
    leaf.position.set(leafMid.x, doorH / 2, leafMid.z);
    leaf.rotation.y = -Math.atan2(perp.z, perp.x);
    leaf.castShadow = true;
    this.openingGroup.add(leaf);

    const tab = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(0.08, width * 0.08), 0.16, 0.08),
      this._doorMat
    );
    tab.position.set(shiftedHinge.x, 0.08, shiftedHinge.z);
    tab.rotation.y = -Math.atan2(dir.z, dir.x);
    tab.castShadow = true;
    this.openingGroup.add(tab);

    // Arco de barrido en el piso (contorno como en el croquis).
    const a0 = Math.atan2(hingeDir.z, hingeDir.x);
    const a1 = Math.atan2(perp.z, perp.x);
    const pts = [];
    const steps = 18;
    for (let i = 0; i <= steps; i++) {
      const ang = a0 + (a1 - a0) * (i / steps);
      pts.push(new THREE.Vector3(shiftedHinge.x + Math.cos(ang) * width, 0.02, shiftedHinge.z + Math.sin(ang) * width));
    }
    const arc = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0xb5793f })
    );
    this.openingGroup.add(arc);
  }

  _renderACSuggestion() {
    if (!this.acGroup) return;
    this.acGroup.clear();
    if (!this.acSuggestion || !this._imgW || !this._imgH || !this.scaleFactor) return;

    const s = this.acSuggestion;
    const pos = this._toWorld(s.x, s.y);
    const flow = new THREE.Vector3(Math.cos(s.angle), 0, Math.sin(s.angle)).normalize();
    const tangent = new THREE.Vector3(-flow.z, 0, flow.x).normalize();
    const wallOffset = 0.08;
    const base = pos.clone().add(flow.clone().multiplyScalar(wallOffset));
    const unitY = Math.min(this.wallHeight - 0.35, 2.15);
    const unitRotY = -Math.atan2(tangent.z, tangent.x);

    const unit = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.28, 0.16),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45, metalness: 0.05 })
    );
    unit.position.set(base.x, unitY, base.z);
    unit.rotation.y = unitRotY;
    unit.castShadow = true;
    this.acGroup.add(unit);

    const face = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.18, 0.018),
      new THREE.MeshStandardMaterial({ color: 0xe8f7fb, roughness: 0.35, metalness: 0.02 })
    );
    face.position.set(
      base.x + flow.x * 0.09,
      unitY - 0.005,
      base.z + flow.z * 0.09
    );
    face.rotation.y = unitRotY;
    this.acGroup.add(face);

    const grilleMat = new THREE.MeshBasicMaterial({ color: 0x64748b });
    for (let i = -2; i <= 2; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.012, 0.008), grilleMat);
      slat.position.set(
        base.x + flow.x * 0.102 + tangent.x * i * 0.008,
        unitY - 0.055 + i * 0.022,
        base.z + flow.z * 0.102 + tangent.z * i * 0.008
      );
      slat.rotation.y = unitRotY;
      this.acGroup.add(slat);
    }

    const vent = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.035, 0.025),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    vent.position.set(
      base.x + flow.x * 0.112,
      unitY - 0.115,
      base.z + flow.z * 0.112
    );
    vent.rotation.y = unitRotY;
    this.acGroup.add(vent);

    const rayMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 });
    (s.rays || []).filter((_, i) => i % 3 === 0).forEach((ray) => {
      const end = this._toWorld(ray.x2, ray.y2);
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(pos.x, 1.75, pos.z),
        new THREE.Vector3(end.x, 1.15, end.z),
      ]);
      this.acGroup.add(new THREE.Line(geo, rayMat));
    });
  }

  _renderWindOverlay() {
    if (!this.windGroup) return;
    this.windGroup.clear();
    const data = this.windOverlay || {};
    if (!data.visible || !this._imgW || !this._imgH || !this.scaleFactor) return;

    const pairs = (data.pairs && data.pairs.length) ? data.pairs : this._fallbackWindPairs3D(data.bounds);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.62 });
    const heatMat = new THREE.LineBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.58 });
    const softMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.28 });
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.72 });
    const heatArrowMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.72 });

    pairs.forEach((pair) => {
      const start = this._toWorld(pair.a.point.x, pair.a.point.y);
      const end = this._toWorld(pair.b.point.x, pair.b.point.y);
      const dir = end.clone().sub(start);
      const len = dir.length();
      if (len < 0.2) return;
      dir.normalize();
      const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
      const mat = pair.heatRisk ? heatMat : pair.fallback ? softMat : lineMat;

      [-0.16, 0, 0.16].forEach((offset, idx) => {
        const y = 1.05 + idx * 0.22;
        const p0 = start.clone().add(perp.clone().multiplyScalar(offset)).setY(y);
        const p2 = end.clone().add(perp.clone().multiplyScalar(offset)).setY(y);
        const mid = start.clone().lerp(end, 0.5).add(perp.clone().multiplyScalar(offset + 0.22)).setY(y + 0.08);
        const curve = new THREE.QuadraticBezierCurve3(p0, mid, p2);
        const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(32));
        this.windGroup.add(new THREE.Line(geo, mat));
      });

      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 16), pair.heatRisk ? heatArrowMat : arrowMat);
      cone.position.copy(end.clone().add(dir.clone().multiplyScalar(-0.12)).setY(1.45));
      cone.rotation.z = -Math.PI / 2;
      cone.rotation.y = -Math.atan2(dir.z, dir.x);
      this.windGroup.add(cone);
    });
  }

  _fallbackWindPairs3D(bounds) {
    const b = bounds || {
      minX: this._imgW * 0.18,
      maxX: this._imgW * 0.82,
      minY: this._imgH * 0.25,
      maxY: this._imgH * 0.75,
    };
    if (!Number.isFinite(b.minX)) return [];
    const width = b.maxX - b.minX;
    const height = b.maxY - b.minY;
    const wind = this.windOverlay?.wind || {};
    const dir2 = wind.vector || { x: 1, y: 0 };
    const perp2 = { x: -dir2.y, y: dir2.x };
    const distance = Math.max(width, height) * 0.35;
    const center = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
    return [0.35, 0.5, 0.65].map((ratio) => ({
      fallback: true,
      heatRisk: !!wind.heatRisk,
      a: { point: { x: center.x - dir2.x * distance + perp2.x * (ratio - 0.5) * height * 0.42, y: center.y - dir2.y * distance + perp2.y * (ratio - 0.5) * height * 0.42 } },
      b: { point: { x: center.x + dir2.x * distance + perp2.x * (ratio - 0.5) * height * 0.42, y: center.y + dir2.y * distance + perp2.y * (ratio - 0.5) * height * 0.42 } },
    }));
  }

  _toWorld(px, py) {
    const x = (px - this._imgW / 2) * this.scaleFactor;
    const z = (py - this._imgH / 2) * this.scaleFactor;
    return new THREE.Vector3(x, 0, z);
  }

  setPlaceMode(type) {
    this.placeMode = type;
  }

  _onClick(event) {
    if (!this.placeMode || !this.floor) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hit = this.raycaster.intersectObject(this.floor)[0];
    if (!hit) return;
    this._addFurniture(this.placeMode, hit.point.x, hit.point.z);
  }

  // ---------- Edición de muros en 3D ----------
  setWallEditMode(mode) {
    this.wallEditMode = mode || "none";
    this._addStart = null;
    this._clearPreviewLine();
    this._hoverWall(null);
    this._cornerGroup.visible = this.wallEditMode === "add";
    if (this._snapMarker) this._snapMarker.visible = false;
    // Congela la cámara mientras se edita para no rotar sin querer.
    const editing = ["add", "delete"].includes(this.wallEditMode);
    this.controls.enabled = !editing;
    this.renderer.domElement.style.cursor =
      this.wallEditMode === "none" ? "grab" : "crosshair";
  }

  // Resalta (ámbar) el muro seleccionado; se mantiene tras reconstruir.
  _applyWallMaterial(index, material) {
    if (index == null) return;
    for (const m of this.wallGroup.children) {
      if (m.userData.segmentIndex === index) m.material = material;
    }
  }

  highlightSegment(index) {
    const next = index == null || index < 0 ? null : index;
    if (this._selectedIndex != null && this._selectedIndex !== this._hoverIndex) {
      this._applyWallMaterial(this._selectedIndex, this.wallMat);
    }
    this._selectedIndex = next;
    if (next != null) this._applyWallMaterial(next, this._selectMat);
  }

  _setPointer(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
  }

  _onPointerDown(event) {
    this._downPos = { x: event.clientX, y: event.clientY };
  }

  _onPointerMove(event) {
    if (this.wallEditMode === "none") return;
    this._setPointer(event);

    if (this.wallEditMode === "add") {
      const p = this._pickFloorSnapped();
      this._updateSnapMarker(p);
      if (this._addStart && p) this._updatePreviewLine(this._addStart.world, p.world);
      return;
    }

    // select / delete: resalta el muro bajo el cursor.
    const hit = this.raycaster.intersectObjects(this.wallGroup.children, false)[0];
    this._hoverWall(hit ? hit.object : null);
  }

  _onPointerUp(event) {
    const moved =
      this._downPos &&
      Math.hypot(event.clientX - this._downPos.x, event.clientY - this._downPos.y) > 6;
    this._downPos = null;
    if (moved) return; // fue un arrastre de cámara, no un clic

    if (this.placeMode) return this._onClick(event); // colocar mueble (legacy)
    if (this.wallEditMode === "none") return;
    this._setPointer(event);

    if (this.wallEditMode === "add") {
      const p = this._pickFloorSnapped();
      if (!p) return;
      if (!this._addStart) {
        this._addStart = p;
        this._updateSnapMarker(p);
        return;
      }
      const seg = { x1: this._addStart.px, y1: this._addStart.py, x2: p.px, y2: p.py };
      this._addStart = null;
      this._clearPreviewLine();
      const longEnough = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1) > 4;
      if (longEnough && this.onWallAdd) this.onWallAdd(seg);
      return;
    }

    if (this.wallEditMode === "window") {
      const hit = this.raycaster.intersectObjects(this.wallGroup.children, false)[0];
      if (!hit) return;
      const px = this._worldToPx(hit.point.x);
      const py = this._worldToPz(hit.point.z);
      if (this.onOpeningAdd) this.onOpeningAdd({ x: px, y: py, type: "window" });
      return;
    }
    if (this.wallEditMode === "door") {
      const hit = this.raycaster.intersectObjects(this.wallGroup.children, false)[0];
      if (!hit) return;
      const px = this._worldToPx(hit.point.x);
      const py = this._worldToPz(hit.point.z);
      if (this.onOpeningAdd) this.onOpeningAdd({ x: px, y: py, type: "door" });
      return;
    }

    // select / delete: elige el muro tocado.
    const hit = this.raycaster.intersectObjects(this.wallGroup.children, false)[0];
    const index = hit ? hit.object.userData.segmentIndex : -1;
    if (this.onWallPick) this.onWallPick(index == null ? -1 : index);
  }

  _hoverWall(mesh) {
    const index = mesh ? mesh.userData.segmentIndex : null;
    if (this._hoverIndex === index) return;
    if (this._hoverIndex != null && this._hoverIndex !== this._selectedIndex) {
      this._applyWallMaterial(this._hoverIndex, this.wallMat);
    }
    this._hoverIndex = index == null ? null : index;
    if (this._hoverIndex != null && this._hoverIndex !== this._selectedIndex) {
      const m = this.wallEditMode === "delete" ? this._hoverMat : this._selectMat;
      this._applyWallMaterial(this._hoverIndex, m);
    }
  }

  _registerCorner(world, px, py) {
    const key = `${Math.round(world.x * 100)},${Math.round(world.z * 100)}`;
    if (this._cornerKeys.has(key)) return;
    this._cornerKeys.add(key);
    this._corners.push({ world: world.clone(), px, py });
  }

  _rebuildCornerMarkers() {
    this._cornerGroup.clear();
    const r = Math.max(0.05, (this.scaleFactor || 0.02) * 6);
    const geo = new THREE.SphereGeometry(r, 12, 12);
    const material = new THREE.MeshBasicMaterial({ color: 0x60a5fa });
    for (const c of this._corners) {
      const s = new THREE.Mesh(geo, material);
      s.position.set(c.world.x, 0.02, c.world.z);
      this._cornerGroup.add(s);
    }
  }

  _pickFloorSnapped() {
    const pt = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this._groundPlane, pt)) return null;
    let best = null;
    let bestD = Infinity;
    for (const c of this._corners) {
      const d = Math.hypot(c.world.x - pt.x, c.world.z - pt.z);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    const snapRadius = Math.max(0.15, (this.scaleFactor || 0.02) * 22);
    if (best && bestD <= snapRadius) {
      return { world: best.world.clone(), px: best.px, py: best.py, snapped: true };
    }
    return { world: pt.clone(), px: this._worldToPx(pt.x), py: this._worldToPz(pt.z), snapped: false };
  }

  _worldToPx(x) {
    return x / this.scaleFactor + this._imgW / 2;
  }

  _worldToPz(z) {
    return z / this.scaleFactor + this._imgH / 2;
  }

  _updateSnapMarker(p) {
    if (!this._snapMarker) {
      this._snapMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x34d399 })
      );
      this._snapMarker.visible = false;
      this.scene.add(this._snapMarker);
    }
    if (!p || this.wallEditMode !== "add") {
      this._snapMarker.visible = false;
      return;
    }
    this._snapMarker.visible = true;
    this._snapMarker.position.set(p.world.x, 0.04, p.world.z);
    this._snapMarker.material.color.set(p.snapped ? 0x34d399 : 0x93a4b3);
  }

  _updatePreviewLine(a, b) {
    const pts = [new THREE.Vector3(a.x, 0.04, a.z), new THREE.Vector3(b.x, 0.04, b.z)];
    if (!this._previewLine) {
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      this._previewLine = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x60a5fa }));
      this.scene.add(this._previewLine);
    } else {
      this._previewLine.geometry.setFromPoints(pts);
    }
    this._previewLine.visible = true;
  }

  _clearPreviewLine() {
    if (this._previewLine) this._previewLine.visible = false;
  }

  _buildBoundedFloor(bounds, wallThickness) {
    if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.minZ)) return;

    const pad = wallThickness * 0.65;
    const width = Math.max(0.3, bounds.maxX - bounds.minX + pad * 2);
    const depth = Math.max(0.3, bounds.maxZ - bounds.minZ + pad * 2);
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minZ + bounds.maxZ) / 2;
    this.floorBounds = {
      width,
      depth,
      cx,
      cz,
      minX: bounds.minX - pad,
      maxX: bounds.maxX + pad,
      minZ: bounds.minZ - pad,
      maxZ: bounds.maxZ + pad,
    };

    const geo = new THREE.PlaneGeometry(width, depth);
    this.floor = new THREE.Mesh(geo, this.floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.set(cx, -0.003, cz);
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);
  }

  _buildRoof(bounds, wallThickness) {
    if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.minZ)) return;

    const pad = wallThickness * 0.95;
    const width = Math.max(0.3, bounds.maxX - bounds.minX + pad * 2);
    const depth = Math.max(0.3, bounds.maxZ - bounds.minZ + pad * 2);
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minZ + bounds.maxZ) / 2;
    const y = this.wallHeight + 0.07;

    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xf4f7f5,
      roughness: 0.82,
      metalness: 0.0,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.12, depth), roofMat);
    slab.position.set(cx, y, cz);
    slab.castShadow = true;
    slab.receiveShadow = true;
    this.roofGroup.add(slab);

    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xd5ddd8, roughness: 0.7 });
    const addEdge = (x, z, w, d) => {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), edgeMat);
      edge.position.set(x, y - 0.03, z);
      edge.castShadow = true;
      this.roofGroup.add(edge);
    };
    addEdge(cx, cz - depth / 2, width, 0.08);
    addEdge(cx, cz + depth / 2, width, 0.08);
    addEdge(cx - width / 2, cz, 0.08, depth);
    addEdge(cx + width / 2, cz, 0.08, depth);
    this.roofGroup.visible = this.roofVisible;
  }

  setFloorPlanTexture(sourceCanvas, imgW = this._imgW, imgH = this._imgH) {
    if (!sourceCanvas || !this.floor || !imgW || !imgH) return;

    this._floorPlanSource = sourceCanvas;
    this._floorPlanImgW = imgW;
    this._floorPlanImgH = imgH;

    if (this.floorPlanTexture) {
      this.floorPlanTexture.dispose();
      this.floorPlanTexture = null;
    }
    if (this.floorPlanMesh) {
      this.scene.remove(this.floorPlanMesh);
      this.floorPlanMesh.geometry.dispose();
      this.floorPlanMesh.material.dispose();
      this.floorPlanMesh = null;
    }

    this.floorPlanTexture = new THREE.CanvasTexture(sourceCanvas);
    this.floorPlanTexture.colorSpace = THREE.SRGBColorSpace;
    this.floorPlanTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.floorPlanTexture.wrapT = THREE.ClampToEdgeWrapping;
    this._mapFloorPlanTextureToBounds(this.floorPlanTexture, imgW, imgH);
    this.floorPlanTexture.needsUpdate = true;

    const mat = new THREE.MeshBasicMaterial({
      map: this.floorPlanTexture,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const floorBounds = this.floorBounds || {
      width: imgW * this.scaleFactor,
      depth: imgH * this.scaleFactor,
      cx: 0,
      cz: 0,
    };
    const width = floorBounds.width;
    const depth = floorBounds.depth;
    const geo = new THREE.PlaneGeometry(width, depth);
    this.floorPlanMesh = new THREE.Mesh(geo, mat);
    this.floorPlanMesh.rotation.x = -Math.PI / 2;
    this.floorPlanMesh.position.set(floorBounds.cx, 0.006, floorBounds.cz);
    this.scene.add(this.floorPlanMesh);
  }

  _mapFloorPlanTextureToBounds(texture, imgW, imgH) {
    if (!this.floorBounds || !this.scaleFactor) return;

    const uMin = clamp01(this.floorBounds.minX / this.scaleFactor / imgW + 0.5);
    const uMax = clamp01(this.floorBounds.maxX / this.scaleFactor / imgW + 0.5);
    const vMin = clamp01(this.floorBounds.minZ / this.scaleFactor / imgH + 0.5);
    const vMax = clamp01(this.floorBounds.maxZ / this.scaleFactor / imgH + 0.5);

    texture.offset.set(uMin, 1 - vMax);
    texture.repeat.set(Math.max(0.01, uMax - uMin), Math.max(0.01, vMax - vMin));
  }

  _addFurniture(type, x, z) {
    const obj = FURNITURE_FACTORY[type]?.();
    if (!obj) return;
    obj.position.set(x, 0, z);
    obj.traverse((m) => {
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    obj.userData.type = type;
    this.furnitureGroup.add(obj);
    this.furniture.push(type);
    if (this.onChange) this.onChange();
  }

  clearFurniture() {
    this.furnitureGroup.clear();
    this.furniture = [];
    if (this.onChange) this.onChange();
  }

  _resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// ---------- Texturas procedurales (sin dependencias externas) ----------
function makePlasterTexture(size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const x = c.getContext("2d");
  const img = x.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const n = (Math.random() - 0.5) * 22;
    const v = 236 + n;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v - 2;
    img.data[i * 4 + 2] = v - 8;
    img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeWoodTexture(size = 512) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const x = c.getContext("2d");
  x.fillStyle = "#8a5a2b";
  x.fillRect(0, 0, size, size);
  const planks = 6;
  const ph = size / planks;
  for (let p = 0; p < planks; p++) {
    const s = 120 + Math.random() * 55;
    x.fillStyle = `rgb(${s},${s * 0.6},${s * 0.32})`;
    x.fillRect(0, p * ph, size, ph - 2);
    for (let g = 0; g < 45; g++) {
      x.strokeStyle = `rgba(60,30,10,${Math.random() * 0.14})`;
      x.lineWidth = 1;
      const yy = p * ph + Math.random() * ph;
      x.beginPath();
      x.moveTo(0, yy);
      x.bezierCurveTo(size / 3, yy + (Math.random() - 0.5) * 6, (2 * size) / 3, yy + (Math.random() - 0.5) * 6, size, yy);
      x.stroke();
    }
    x.fillStyle = "rgba(25,12,4,0.55)";
    x.fillRect(0, p * ph + ph - 2, size, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- Muebles (geometría redondeada + materiales) ----------
function mat(color, roughness = 0.7, metalness = 0.0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
function rbox(w, h, d, material, radius = 0.03) {
  const r = Math.min(radius, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  return new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.max(0.008, r)), material);
}

function expandBounds(bounds, point) {
  bounds.minX = Math.min(bounds.minX, point.x);
  bounds.maxX = Math.max(bounds.maxX, point.x);
  bounds.minZ = Math.min(bounds.minZ, point.z);
  bounds.maxZ = Math.max(bounds.maxZ, point.z);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

const WOOD = () => mat(0x9c6a3c, 0.6);
const METAL = () => mat(0xcfd8dc, 0.35, 0.8);
const FABRIC = () => mat(0x4f7cac, 0.9);
const CERAMIC = () => mat(0xf5f7fa, 0.25, 0.05);

const FURNITURE_FACTORY = {
  table() {
    const g = new THREE.Group();
    const wood = WOOD();
    const top = rbox(1.2, 0.07, 0.8, wood, 0.02);
    top.position.y = 0.75;
    g.add(top);
    [[-0.52, -0.32], [0.52, -0.32], [-0.52, 0.32], [0.52, 0.32]].forEach(([x, z]) => {
      const leg = rbox(0.07, 0.75, 0.07, wood, 0.015);
      leg.position.set(x, 0.375, z);
      g.add(leg);
    });
    return g;
  },
  chair() {
    const g = new THREE.Group();
    const wood = WOOD();
    const fab = FABRIC();
    const seat = rbox(0.46, 0.08, 0.46, fab, 0.03);
    seat.position.y = 0.46;
    g.add(seat);
    const back = rbox(0.46, 0.5, 0.07, fab, 0.03);
    back.position.set(0, 0.72, -0.2);
    g.add(back);
    [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]].forEach(([x, z]) => {
      const leg = rbox(0.05, 0.46, 0.05, wood, 0.01);
      leg.position.set(x, 0.23, z);
      g.add(leg);
    });
    return g;
  },
  bed() {
    const g = new THREE.Group();
    const frame = rbox(1.45, 0.32, 2.05, WOOD(), 0.04);
    frame.position.y = 0.16;
    g.add(frame);
    const mattress = rbox(1.36, 0.22, 1.96, mat(0xe8e2d6, 0.85), 0.06);
    mattress.position.y = 0.42;
    g.add(mattress);
    const duvet = rbox(1.38, 0.1, 1.2, mat(0x6d97c4, 0.9), 0.05);
    duvet.position.set(0, 0.54, 0.4);
    g.add(duvet);
    const pillow = rbox(1.1, 0.14, 0.36, mat(0xffffff, 0.9), 0.07);
    pillow.position.set(0, 0.58, -0.72);
    g.add(pillow);
    const head = rbox(1.45, 0.55, 0.1, WOOD(), 0.04);
    head.position.set(0, 0.45, -1.02);
    g.add(head);
    return g;
  },
  toilet() {
    const g = new THREE.Group();
    const ceramic = CERAMIC();
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.42, 24), ceramic);
    bowl.position.y = 0.21;
    g.add(bowl);
    const seat = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 12, 24), ceramic);
    seat.rotation.x = Math.PI / 2;
    seat.position.y = 0.43;
    g.add(seat);
    const tank = rbox(0.46, 0.5, 0.16, ceramic, 0.03);
    tank.position.set(0, 0.48, -0.28);
    g.add(tank);
    return g;
  },
  door() {
    const g = new THREE.Group();
    const leaf = rbox(0.88, 2.02, 0.05, mat(0xb5793f, 0.55), 0.02);
    leaf.position.y = 1.01;
    g.add(leaf);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 16), METAL());
    knob.position.set(0.36, 1.0, 0.05);
    g.add(knob);
    return g;
  },
};
