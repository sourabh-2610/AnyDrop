"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

interface DeviceNode {
  mesh: THREE.Mesh;
  label: string;
  targetY: number;
  floatOffset: number;
  floatSpeed: number;
}

export default function HeroCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // -- Scene setup -----------------------------------------------
    const scene = new THREE.Scene();
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // -- Lighting -------------------------------------------------
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    
    const cyanLight = new THREE.PointLight(0x06B6D4, 2.5, 15);
    cyanLight.position.set(3, 4, 3);
    scene.add(cyanLight);

    const emeraldLight = new THREE.PointLight(0x10B981, 3.0, 15);
    emeraldLight.position.set(-3, 2, 2);
    scene.add(emeraldLight);

    // -- Material factory -----------------------------------------
    const cardMat = (color: number, emissive: number) =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.2,
        metalness: 0.8,
        transparent: true,
        opacity: 0.88,
        emissive,
        emissiveIntensity: 0.25,
      });

    // -- Device cards ---------------------------------------------
    const deviceData: { label: string; color: number; emissive: number; pos: [number, number, number] }[] = [
      { label: "Phone",       color: 0x0F291E, emissive: 0x10B981, pos: [-3.5, 0.5, 0] },
      { label: "Laptop",      color: 0x0E2838, emissive: 0x06B6D4, pos: [-1.2, -0.8, 0.5] },
      { label: "Desktop",     color: 0x181F38, emissive: 0x6366F1, pos: [1.2, 0.6, 0.3] },
      { label: "Smart Board", color: 0x0F2E22, emissive: 0x34D399, pos: [3.4, -0.3, 0] },
    ];

    const nodes: DeviceNode[] = deviceData.map(({ label, color, emissive, pos }) => {
      const geo = new THREE.BoxGeometry(1.15, 1.45, 0.12);
      const mesh = new THREE.Mesh(geo, cardMat(color, emissive));
      mesh.position.set(...pos);
      mesh.rotation.x = -0.08;
      scene.add(mesh);
      return {
        mesh,
        label,
        targetY: pos[1],
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.4 + Math.random() * 0.3,
      };
    });

    // -- Central Pulsing Core Orb ---------------------------------
    const orbGeo = new THREE.SphereGeometry(0.32, 32, 32);
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0x10B981,
      roughness: 0.1,
      metalness: 0.3,
      emissive: 0x10B981,
      emissiveIntensity: 0.8,
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.set(0, 0, 0.5);
    scene.add(orb);

    // -- Connection lines -----------------------------------------
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x06B6D4,
      transparent: true,
      opacity: 0.45,
    });

    const lines: THREE.Line[] = nodes.map((node) => {
      const points = [orb.position.clone(), node.mesh.position.clone()];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geo, lineMat);
      scene.add(line);
      return line;
    });

    // -- Particle starfield ---------------------------------------
    const particleCount = 120;
    const pPositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3 + 0] = (Math.random() - 0.5) * 14;
      pPositions[i * 3 + 1] = (Math.random() - 0.5) * 9;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 5 - 2;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      size: 0.05,
      color: 0x34D399,
      transparent: true,
      opacity: 0.65,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // -- Traveling file energy packets on lines -------------------
    const travelParticles: { mesh: THREE.Mesh; node: DeviceNode; t: number; speed: number }[] = [];
    const tpGeo = new THREE.SphereGeometry(0.06, 12, 12);
    nodes.forEach((node) => {
      const tpMat = new THREE.MeshBasicMaterial({ color: 0x38BDF8 });
      const tp = new THREE.Mesh(tpGeo, tpMat);
      scene.add(tp);
      travelParticles.push({ mesh: tp, node, t: Math.random(), speed: 0.35 + Math.random() * 0.35 });
    });

    // -- Resize handler -------------------------------------------
    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // -- Animation loop -------------------------------------------
    let frameId: number;
    let t = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (prefersReduced) { renderer.render(scene, camera); return; }

      t += 0.012;

      // Float nodes
      nodes.forEach((node) => {
        node.mesh.position.y = node.targetY + Math.sin(t * node.floatSpeed + node.floatOffset) * 0.18;
        node.mesh.rotation.y = Math.sin(t * 0.3 + node.floatOffset) * 0.08;
      });

      // Pulse orb
      const orbScale = 1 + Math.sin(t * 2.2) * 0.08;
      orb.scale.setScalar(orbScale);
      orb.position.y = Math.sin(t * 0.8) * 0.1;
      (orbMat as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + Math.sin(t * 2.5) * 0.3;

      // Update connection lines
      lines.forEach((line, i) => {
        const pts = [orb.position.clone(), nodes[i].mesh.position.clone()];
        (line.geometry as THREE.BufferGeometry).setFromPoints(pts);
      });

      // Traveling file energy packets
      travelParticles.forEach((tp) => {
        tp.t = (tp.t + tp.speed * 0.009) % 1;
        tp.mesh.position.lerpVectors(orb.position, tp.node.mesh.position, tp.t);
      });

      // Drift background particles
      particles.rotation.y += 0.001;
      particles.rotation.x += 0.0004;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-full h-full"
      aria-hidden="true"
    />
  );
}
