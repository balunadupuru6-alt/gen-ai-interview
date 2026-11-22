import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { detectSoftwareGl, prefersReducedMotion, scheduleAfterDraw } from '../utils/webgl';

export default function BackgroundScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const reducedMotion = prefersReducedMotion();

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070608, 0.032);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 120);
    camera.position.set(0, 4.5, 16);
    camera.lookAt(0, 0.2, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const keyLight = new THREE.DirectionalLight(0xf43f5e, 1.4);
    keyLight.position.set(6, 12, 8);
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xfda4af, 0x09070a, 0.7);
    scene.add(hemiLight);

    // Undulating wireframe terrain floor
    const terrainGeo = new THREE.PlaneGeometry(54, 42, 34, 26);
    terrainGeo.rotateX(-Math.PI / 2);
    const baseY = new Float32Array(terrainGeo.attributes.position.count);
    for (let i = 0; i < terrainGeo.attributes.position.count; i++) {
      const x = terrainGeo.attributes.position.getX(i);
      const z = terrainGeo.attributes.position.getZ(i);
      const wave = Math.sin(x * 0.22) * 0.65 + Math.cos(z * 0.25) * 0.65;
      baseY[i] = wave;
      terrainGeo.attributes.position.setY(i, wave);
    }
    const terrainMat = new THREE.MeshBasicMaterial({
      color: 0xbe123c,
      wireframe: true,
      transparent: true,
      opacity: 0.44,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.position.set(0, -4.4, -4);
    scene.add(terrain);

    // Subtle background orbital arcs
    const arcGeo = new THREE.TorusGeometry(11.5, 0.03, 8, 96);
    const arcMat = new THREE.MeshBasicMaterial({
      color: 0xe11d48,
      transparent: true,
      opacity: 0.3,
    });
    const arc1 = new THREE.Mesh(arcGeo, arcMat);
    arc1.rotation.set(Math.PI * 0.35, Math.PI * 0.14, 0);
    arc1.position.set(-1.2, 2.2, -9);
    scene.add(arc1);

    const arc2 = new THREE.Mesh(arcGeo, arcMat);
    arc2.scale.setScalar(0.84);
    arc2.rotation.set(-Math.PI * 0.25, -Math.PI * 0.22, Math.PI * 0.12);
    arc2.position.set(1.4, 2.6, -10);
    scene.add(arc2);

    // Floating polyhedral shards
    const shardGeo = new THREE.OctahedronGeometry(0.32, 0);
    const crimsonShardMat = new THREE.MeshStandardMaterial({
      color: 0xbe123c,
      roughness: 0.35,
      metalness: 0.55,
      flatShading: true,
    });
    const silverShardMat = new THREE.MeshStandardMaterial({
      color: 0x71717a,
      roughness: 0.45,
      metalness: 0.45,
      flatShading: true,
    });

    const shards: Array<{
      mesh: THREE.Mesh;
      baseY: number;
      speed: number;
      phase: number;
      rotSpeed: number;
    }> = [];

    const shardCoords: Array<[number, number, number, number, boolean]> = [
      [-11.5, 4.2, -3, 1.3, false],
      [-8.8, -0.5, -2, 0.9, true],
      [-5.4, 3.6, -5, 0.65, true],
      [10.8, 3.1, -3.5, 1.0, false],
      [9.4, -0.8, -2, 0.85, true],
      [12.2, 0.5, -4, 0.75, false],
      [-10.2, 1.9, -6, 0.8, true],
      [5.8, 4.8, -6.5, 0.6, false],
      [-2.8, 5.1, -7, 0.55, true],
      [3.5, -1.6, -3.5, 0.7, false],
    ];

    for (let i = 0; i < shardCoords.length; i++) {
      const [x, y, z, scale, isCrimson] = shardCoords[i];
      const mesh = new THREE.Mesh(shardGeo, isCrimson ? crimsonShardMat : silverShardMat);
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(scale);
      scene.add(mesh);
      shards.push({
        mesh,
        baseY: y,
        speed: 0.45 + (i % 4) * 0.14,
        phase: i * 1.1,
        rotSpeed: 0.35 + (i % 3) * 0.18,
      });
    }

    let disposed = false;
    let rafId = 0;
    let timerId = 0;
    let contextLost = false;
    let prevTime = performance.now();
    let elapsed = 0;

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
    };
    const handleContextRestored = () => {
      contextLost = false;
      prevTime = performance.now();
      scheduleNext();
    };

    window.addEventListener('resize', handleResize);
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const renderFrame = (now: number) => {
      if (disposed || contextLost) return;
      const dt = Math.min(0.1, (now - prevTime) / 1000);
      prevTime = now;
      elapsed += dt;

      if (!reducedMotion) {
        const pos = terrainGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const z = pos.getZ(i);
          const wave =
            Math.sin(x * 0.22 + elapsed * 0.55) * 0.65 +
            Math.cos(z * 0.25 + elapsed * 0.42) * 0.65;
          pos.setY(i, wave);
        }
        pos.needsUpdate = true;

        arc1.rotation.z = elapsed * 0.04;
        arc2.rotation.z = -elapsed * 0.03;

        for (const item of shards) {
          item.mesh.position.y = item.baseY + Math.sin(elapsed * item.speed + item.phase) * 0.35;
          item.mesh.rotation.x += dt * item.rotSpeed;
          item.mesh.rotation.y += dt * item.rotSpeed * 0.8;
        }
      }

      renderer.render(scene, camera);

      if (!reducedMotion) {
        scheduleNext();
      }
    };

    const scheduleNext = () => {
      if (disposed || contextLost) return;
      if (isSoftwareGl) {
        scheduleAfterDraw(
          renderer,
          () => {
            if (!disposed) renderFrame(performance.now());
          },
          (id) => {
            timerId = id;
          },
          90,
        );
      } else {
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    renderer.render(scene, camera);
    if (!reducedMotion) {
      scheduleNext();
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      terrainGeo.dispose();
      terrainMat.dispose();
      arcGeo.dispose();
      arcMat.dispose();
      shardGeo.dispose();
      crimsonShardMat.dispose();
      silverShardMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-85"
    />
  );
}
