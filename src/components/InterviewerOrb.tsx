import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { OrbState } from '../types/interview';
import { detectSoftwareGl, prefersReducedMotion, scheduleAfterDraw } from '../utils/webgl';

interface InterviewerOrbProps {
  state: OrbState;
  sizeClass?: string;
  interactive?: boolean;
}

const _colorTarget = new THREE.Color();

const STATE_PRESETS: Record<
  OrbState,
  { coreHex: number; emissiveHex: number; spinSpeed: number; pulseAmp: number; ringSpeed: number }
> = {
  idle: {
    coreHex: 0x7f1d1d,
    emissiveHex: 0x9f1239,
    spinSpeed: 0.45,
    pulseAmp: 0.03,
    ringSpeed: 0.55,
  },
  generating: {
    coreHex: 0x9f1239,
    emissiveHex: 0xe11d48,
    spinSpeed: 1.55,
    pulseAmp: 0.075,
    ringSpeed: 1.85,
  },
  evaluating: {
    coreHex: 0xbe123c,
    emissiveHex: 0xf43f5e,
    spinSpeed: 2.1,
    pulseAmp: 0.09,
    ringSpeed: 2.25,
  },
  feedback: {
    coreHex: 0xbe123c,
    emissiveHex: 0xfb7185,
    spinSpeed: 0.8,
    pulseAmp: 0.045,
    ringSpeed: 0.9,
  },
};

export default function InterviewerOrb({
  state,
  sizeClass = 'h-72 w-full',
  interactive = true,
}: InterviewerOrbProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<OrbState>(state);
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const reducedMotion = prefersReducedMotion();

    const scene = new THREE.Scene();
    const width = container.clientWidth || 360;
    const height = container.clientHeight || 300;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.4);

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

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const keyLight = new THREE.DirectionalLight(0xfda4af, 1.05);
    keyLight.position.set(4, 5, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xf43f5e, 2.4);
    rimLight.position.set(-4, -3, -3);
    scene.add(rimLight);

    const hemiLight = new THREE.HemisphereLight(0xfda4af, 0x09070a, 0.45);
    scene.add(hemiLight);

    // Composite 3D Holographic Interviewer Orb Group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 1. Inner Core Sphere (PBR Metallic + Emissive)
    const coreGeo = new THREE.SphereGeometry(0.96, 40, 40);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x7f1d1d,
      emissive: 0x9f1239,
      emissiveIntensity: 0.85,
      roughness: 0.36,
      metalness: 0.38,
      envMapIntensity: 0.4,
      clearcoat: 0.7,
      clearcoatRoughness: 0.2,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    rootGroup.add(coreMesh);

    // 2. Inner Lattice Cage (Icosahedron Wireframe)
    const latticeGeo = new THREE.IcosahedronGeometry(1.28, 1);
    const latticeMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    });
    const latticeMesh = new THREE.Mesh(latticeGeo, latticeMat);
    rootGroup.add(latticeMesh);

    // 3. Outer Containment Shell (Subtle Translucent Ring Frame)
    const outerGeo = new THREE.IcosahedronGeometry(1.42, 0);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xfda4af,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    rootGroup.add(outerMesh);

    // 4. Three Tilted Orbital Rings + Satellite Nodes
    const ringGeo = new THREE.TorusGeometry(1.66, 0.024, 14, 96);
    const whiteRingMat = new THREE.MeshStandardMaterial({
      color: 0xfafafa,
      emissive: 0xe4e4e7,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.8,
    });
    const crimsonRingMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.65,
      roughness: 0.2,
      metalness: 0.7,
    });
    const roseRingMat = new THREE.MeshStandardMaterial({
      color: 0xfda4af,
      emissive: 0xfb7185,
      emissiveIntensity: 0.4,
      roughness: 0.25,
      metalness: 0.75,
    });

    const nodeGeo = new THREE.SphereGeometry(0.055, 16, 16);

    const createRingAssembly = (
      mat: THREE.Material,
      rx: number,
      ry: number,
      rz: number,
      scale: number,
    ) => {
      const ringGroup = new THREE.Group();
      ringGroup.rotation.set(rx, ry, rz);
      ringGroup.scale.setScalar(scale);

      const torus = new THREE.Mesh(ringGeo, mat);
      ringGroup.add(torus);

      const sat1 = new THREE.Mesh(nodeGeo, whiteRingMat);
      sat1.position.set(1.66, 0, 0);
      ringGroup.add(sat1);

      const sat2 = new THREE.Mesh(nodeGeo, crimsonRingMat);
      sat2.position.set(-1.66, 0, 0);
      ringGroup.add(sat2);

      rootGroup.add(ringGroup);
      return ringGroup;
    };

    const ringA = createRingAssembly(whiteRingMat, 0.42, 0.35, 0.15, 1.0);
    const ringB = createRingAssembly(crimsonRingMat, -0.35, 1.15, 0.85, 1.06);
    const ringC = createRingAssembly(roseRingMat, 1.18, -0.42, 0.4, 0.94);

    // 5. Particle Halo Cloud
    const particleCount = 110;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = 1.9 + ((i * 37) % 100) / 85;
      const theta = i * 2.39996; // Golden angle
      const phi = Math.acos(1 - (2 * (i + 0.5)) / particleCount);
      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xfda4af,
      size: 0.042,
      transparent: true,
      opacity: 0.65,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    rootGroup.add(particles);

    let disposed = false;
    let rafId = 0;
    let timerId = 0;
    let contextLost = false;
    let prevTime = performance.now();
    let elapsed = 0;
    let currentSpin = STATE_PRESETS[stateRef.current].spinSpeed;
    let currentRingSpeed = STATE_PRESETS[stateRef.current].ringSpeed;

    const handlePointerMove = (e: PointerEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerLeave = () => {
      pointerRef.current.x = 0;
      pointerRef.current.y = 0;
    };

    const resizeObserver = new ResizeObserver(() => {
      if (!container || disposed) return;
      const w = container.clientWidth || 360;
      const h = container.clientHeight || 300;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    if (interactive) {
      container.addEventListener('pointermove', handlePointerMove);
      container.addEventListener('pointerleave', handlePointerLeave);
    }

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
    };
    const handleContextRestored = () => {
      contextLost = false;
      prevTime = performance.now();
      scheduleNext();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const renderFrame = (now: number) => {
      if (disposed || contextLost) return;
      const dt = Math.min(0.1, (now - prevTime) / 1000);
      prevTime = now;
      elapsed += dt;

      const preset = STATE_PRESETS[stateRef.current];
      currentSpin = THREE.MathUtils.damp(currentSpin, preset.spinSpeed, 4.5, dt);
      currentRingSpeed = THREE.MathUtils.damp(currentRingSpeed, preset.ringSpeed, 4.5, dt);

      _colorTarget.setHex(preset.coreHex);
      coreMat.color.lerp(_colorTarget, Math.min(1, dt * 4));
      _colorTarget.setHex(preset.emissiveHex);
      coreMat.emissive.lerp(_colorTarget, Math.min(1, dt * 4));

      if (!reducedMotion) {
        const pulse = 1 + Math.sin(elapsed * (1.8 + currentSpin)) * preset.pulseAmp;
        coreMesh.scale.setScalar(pulse);
        latticeMesh.rotation.y += dt * currentSpin * 0.6;
        latticeMesh.rotation.x += dt * currentSpin * 0.28;
        outerMesh.rotation.y -= dt * currentSpin * 0.32;

        ringA.rotation.z += dt * currentRingSpeed * 0.72;
        ringB.rotation.x += dt * currentRingSpeed * 0.65;
        ringC.rotation.y -= dt * currentRingSpeed * 0.58;
        particles.rotation.y += dt * 0.16;

        rootGroup.rotation.y = THREE.MathUtils.damp(
          rootGroup.rotation.y,
          pointerRef.current.x * 0.28,
          5,
          dt,
        );
        rootGroup.rotation.x = THREE.MathUtils.damp(
          rootGroup.rotation.x,
          -pointerRef.current.y * 0.22,
          5,
          dt,
        );
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
          80,
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
      resizeObserver.disconnect();
      if (interactive) {
        container.removeEventListener('pointermove', handlePointerMove);
        container.removeEventListener('pointerleave', handlePointerLeave);
      }
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      coreGeo.dispose();
      coreMat.dispose();
      latticeGeo.dispose();
      latticeMat.dispose();
      outerGeo.dispose();
      outerMat.dispose();
      ringGeo.dispose();
      nodeGeo.dispose();
      whiteRingMat.dispose();
      crimsonRingMat.dispose();
      roseRingMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [interactive]);

  return (
    <div
      ref={mountRef}
      role="img"
      aria-label={`3D AI Interviewer Orb in ${state} state`}
      data-orb-state={state}
      className={sizeClass}
    />
  );
}
