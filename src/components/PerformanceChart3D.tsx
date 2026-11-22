import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { InterviewSession } from '../types/interview';
import { detectSoftwareGl, prefersReducedMotion, scheduleAfterDraw } from '../utils/webgl';

interface BreakdownDatum {
  key: string;
  label: string;
  shortLabel: string;
  score: number;
  detail: string;
}

interface PerformanceChart3DProps {
  session: InterviewSession;
}

export default function PerformanceChart3D({ session }: PerformanceChart3DProps) {
  const [mode, setMode] = useState<'skill' | 'question'>('skill');
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const skillItems: BreakdownDatum[] = [
    {
      key: 'average',
      label: 'Average',
      shortLabel: 'Average',
      score: session.metrics.averageScore,
      detail: 'Mean across all 5 interview questions',
    },
    {
      key: 'technical',
      label: 'Technical',
      shortLabel: 'Technical',
      score: session.metrics.technicalScore,
      detail: 'Technical accuracy & architectural depth',
    },
    {
      key: 'hr',
      label: 'HR',
      shortLabel: 'HR',
      score: session.metrics.hrScore,
      detail: 'Behavioral structure & situational clarity',
    },
    {
      key: 'clarity',
      label: 'Clarity',
      shortLabel: 'Clarity',
      score: session.metrics.communicationScore,
      detail: 'Explanation pacing & conciseness',
    },
    {
      key: 'confidence',
      label: 'Confidence',
      shortLabel: 'Confidence',
      score: session.metrics.confidenceScore,
      detail: 'Decisiveness & ownership in delivery',
    },
  ];

  const questionItems: BreakdownDatum[] = session.records.map((rec) => ({
    key: rec.question.id,
    label: `Question ${rec.question.index}`,
    shortLabel: `Q${rec.question.index}`,
    score: rec.evaluation.score,
    detail: `${rec.question.category} · ${rec.question.topic}`,
  }));

  const items = mode === 'skill' ? skillItems : questionItems;
  const activeItem = items[selectedIdx] ?? items[0];

  const mountRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef<BreakdownDatum[]>(items);
  const selectedIdxRef = useRef<number>(selectedIdx);
  const onSelectRef = useRef((idx: number) => setSelectedIdx(idx));

  itemsRef.current = items;
  selectedIdxRef.current = selectedIdx;

  useEffect(() => {
    setSelectedIdx(0);
  }, [mode, session.id]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const reducedMotion = prefersReducedMotion();

    const scene = new THREE.Scene();
    const width = container.clientWidth || 560;
    const height = container.clientHeight || 240;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 3.35, 6.9);
    camera.lookAt(0, 0.72, 0);

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
    renderer.toneMappingExposure = 1.08;
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

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
    keyLight.position.set(4, 8, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xf43f5e, 1.6);
    rimLight.position.set(-5, 4, -4);
    scene.add(rimLight);

    const hemiLight = new THREE.HemisphereLight(0xfda4af, 0x18181b, 0.55);
    scene.add(hemiLight);

    // Stage grid floor
    const grid = new THREE.GridHelper(9.5, 10, 0x9f1239, 0x27272a);
    grid.position.y = 0;
    scene.add(grid);

    const stageMat = new THREE.MeshStandardMaterial({
      color: 0x110d12,
      roughness: 0.75,
      metalness: 0.25,
    });
    const stageGeo = new THREE.PlaneGeometry(9.5, 5.2);
    stageGeo.rotateX(-Math.PI / 2);
    const stageMesh = new THREE.Mesh(stageGeo, stageMat);
    stageMesh.position.y = -0.02;
    scene.add(stageMesh);

    // Build 5 interactive pillars (base body + glowing cap)
    const pillarCount = 5;
    const baseGeo = new THREE.BoxGeometry(0.76, 1, 0.76);
    baseGeo.translate(0, 0.5, 0); // bottom-center pivot!
    const capGeo = new THREE.BoxGeometry(0.8, 0.09, 0.8);

    const pillarEntries: Array<{
      group: THREE.Group;
      body: THREE.Mesh;
      cap: THREE.Mesh;
      bodyMat: THREE.MeshPhysicalMaterial;
      capMat: THREE.MeshStandardMaterial;
      currentHeight: number;
    }> = [];

    const clickables: THREE.Object3D[] = [];
    const spacing = 1.45;
    const startX = -((pillarCount - 1) * spacing) / 2;

    for (let i = 0; i < pillarCount; i++) {
      const group = new THREE.Group();
      group.position.set(startX + i * spacing, 0, 0);

      const bodyMat = new THREE.MeshPhysicalMaterial({
        color: i % 2 === 0 ? 0xbe123c : 0xd4d4d8,
        roughness: 0.32,
        metalness: 0.45,
        envMapIntensity: 0.5,
        clearcoat: 0.45,
      });
      const body = new THREE.Mesh(baseGeo, bodyMat);
      body.userData.pillarIndex = i;
      group.add(body);
      clickables.push(body);

      const capMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xf43f5e,
        emissiveIntensity: 0.55,
        roughness: 0.2,
        metalness: 0.6,
      });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.userData.pillarIndex = i;
      group.add(cap);
      clickables.push(cap);

      scene.add(group);
      pillarEntries.push({
        group,
        body,
        cap,
        bodyMat,
        capMat,
        currentHeight: 0.25,
      });
    }

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(clickables, false);
      if (hits.length > 0) {
        const idx = hits[0].object.userData.pillarIndex;
        if (typeof idx === 'number') {
          onSelectRef.current(idx);
        }
      }
    };

    renderer.domElement.addEventListener('click', handleClick);

    const resizeObserver = new ResizeObserver(() => {
      if (!container || disposed) return;
      const w = container.clientWidth || 560;
      const h = container.clientHeight || 240;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    let disposed = false;
    let rafId = 0;
    let timerId = 0;
    let contextLost = false;
    let prevTime = performance.now();

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

      const currentItems = itemsRef.current;
      const activeIdx = selectedIdxRef.current;

      for (let i = 0; i < pillarEntries.length; i++) {
        const entry = pillarEntries[i];
        const datum = currentItems[i];
        const targetH = datum ? Math.max(0.2, (datum.score / 10) * 2.15) : 0.2;

        entry.currentHeight = reducedMotion
          ? targetH
          : THREE.MathUtils.damp(entry.currentHeight, targetH, 7.5, dt);

        entry.body.scale.y = entry.currentHeight;
        entry.cap.position.y = entry.currentHeight + 0.05;

        const isSelected = i === activeIdx;
        entry.bodyMat.color.setHex(isSelected ? 0xf43f5e : i % 2 === 0 ? 0xbe123c : 0xe4e4e7);
        entry.capMat.emissiveIntensity = isSelected ? 1.2 : 0.35;
        entry.group.scale.setScalar(
          reducedMotion ? (isSelected ? 1.08 : 1) : THREE.MathUtils.damp(entry.group.scale.x, isSelected ? 1.08 : 1, 8, dt),
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
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      baseGeo.dispose();
      capGeo.dispose();
      stageGeo.dispose();
      stageMat.dispose();
      for (const entry of pillarEntries) {
        entry.bodyMat.dispose();
        entry.capMat.dispose();
      }
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="rounded-xl border border-rose-500/20 bg-[#0d0a0f]/95 p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">
            3D Performance Breakdown
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            Click any 3D pillar or selector tab to inspect individual scores
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950/90 p-1">
          <button
            type="button"
            onClick={() => setMode('skill')}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              mode === 'skill'
                ? 'bg-rose-700/80 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            By Skill
          </button>
          <button
            type="button"
            onClick={() => setMode('question')}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              mode === 'question'
                ? 'bg-rose-700/80 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            By Question
          </button>
        </div>
      </div>

      <div
        ref={mountRef}
        data-testid="performance-3d-canvas"
        className="h-56 w-full cursor-pointer overflow-hidden rounded-lg border border-zinc-800/80 bg-[#08060a]"
      />

      <div className="mt-4 grid grid-cols-5 gap-2">
        {items.map((item, idx) => {
          const isSelected = idx === selectedIdx;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setSelectedIdx(idx)}
              className={`cursor-pointer rounded-lg border px-2.5 py-2 text-center transition-colors ${
                isSelected
                  ? 'border-rose-500/70 bg-rose-950/50 text-white'
                  : 'border-zinc-800/90 bg-zinc-950/70 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              <div className="truncate text-[11px] font-medium">{item.shortLabel}</div>
              <div className="font-mono text-sm font-semibold tabular-nums text-rose-300">
                {item.score.toFixed(1)}
              </div>
            </button>
          );
        })}
      </div>

      {activeItem && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-950/80 px-4 py-2.5 text-xs">
          <div>
            <span className="font-medium text-white">{activeItem.label}</span>
            <span className="mx-2 text-zinc-600" aria-hidden="true">
              ·
            </span>
            <span className="text-zinc-400">{activeItem.detail}</span>
          </div>
          <span className="font-mono font-semibold tabular-nums text-rose-400">
            {activeItem.score.toFixed(1)} / 10.0
          </span>
        </div>
      )}
    </div>
  );
}
