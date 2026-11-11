"use client";

import { Suspense, useRef, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Center, Environment } from "@react-three/drei";
import * as THREE from "three";

export interface Logo3DProps {
  modelUrl: string;
  width?: number | string;
  height?: number | string;
  fallbackImage?: string;
  autoRotateSpeed?: number;
  materialColor?: number;
  metalness?: number;
  roughness?: number;
  className?: string;
}

const RESUME_LERP = 0.03;
const DRAG_SENSITIVITY = 0.01;

function Model({
  url,
  isHovered,
  isDragging,
  dragDelta,
  autoRotateSpeed = 0.6,
  materialColor = 0xc0c0c0,
  metalness = 0.95,
  roughness = 0.15,
}: {
  url: string;
  isHovered: boolean;
  isDragging: boolean;
  dragDelta: React.MutableRefObject<{ x: number; y: number }>;
  autoRotateSpeed?: number;
  materialColor?: number;
  metalness?: number;
  roughness?: number;
}) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  const [autoScale, setAutoScale] = useState(1);
  const autoSpeedRef = useRef(autoRotateSpeed);

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene as any);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      setAutoScale(1.6 / maxDim);
    }

    const chromeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(materialColor),
      metalness,
      roughness,
      envMapIntensity: 1.5,
    });

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = chromeMat;
      }
    });
  }, [scene, materialColor, metalness, roughness]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (isDragging) {
      groupRef.current.rotation.y += dragDelta.current.x * DRAG_SENSITIVITY;
      groupRef.current.rotation.x += dragDelta.current.y * DRAG_SENSITIVITY;
      groupRef.current.rotation.x = THREE.MathUtils.clamp(
        groupRef.current.rotation.x,
        -Math.PI / 3,
        Math.PI / 3
      );
      dragDelta.current.x = 0;
      dragDelta.current.y = 0;
      autoSpeedRef.current = 0;
    } else if (isHovered) {
      autoSpeedRef.current = THREE.MathUtils.lerp(
        autoSpeedRef.current,
        0,
        0.15
      );
      groupRef.current.rotation.y += delta * autoSpeedRef.current;
    } else {
      autoSpeedRef.current = THREE.MathUtils.lerp(
        autoSpeedRef.current,
        autoRotateSpeed,
        RESUME_LERP
      );
      groupRef.current.rotation.y += delta * autoSpeedRef.current;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        0,
        RESUME_LERP
      );
    }
  });

  return (
    <group ref={groupRef} scale={autoScale}>
      <Center>
        <primitive object={scene} />
      </Center>
    </group>
  );
}

export default function Logo3D({
  modelUrl,
  width = 60,
  height = 60,
  fallbackImage,
  autoRotateSpeed = 0.6,
  materialColor = 0xc0c0c0,
  metalness = 0.95,
  roughness = 0.15,
  className = "",
}: Logo3DProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragDelta = useRef({ x: 0, y: 0 });
  const lastPointer = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    isDraggingRef.current = true;
    setIsDragging(true);
    lastPointer.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    dragDelta.current.x += e.clientX - lastPointer.current.x;
    dragDelta.current.y += e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    isDraggingRef.current = false;
    setIsDragging(false);
  }, []);

  return (
    <div
      ref={containerRef}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => {
        setIsHovered(false);
        isDraggingRef.current = false;
        setIsDragging(false);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={className}
      style={{
        width,
        height,
        cursor: isDragging ? "grabbing" : isHovered ? "grab" : "pointer",
        touchAction: "none",
      }}
    >
      <Suspense
        fallback={
          fallbackImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={fallbackImage}
              alt="logo fallback"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          ) : (
            <div className="w-full h-full animate-pulse bg-white/10 rounded-full" />
          )
        }
      >
        <Canvas
          camera={{ position: [0, 0, 3], fov: 35 }}
          gl={{ alpha: true, antialias: true }}
          style={{ background: "transparent", pointerEvents: "none" }}
          dpr={[1, 2]}
        >
          <Environment preset="city" />
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={2} />
          <directionalLight position={[-3, 2, 4]} intensity={0.8} />
          <Model
            url={modelUrl}
            isHovered={isHovered}
            isDragging={isDragging}
            dragDelta={dragDelta}
            autoRotateSpeed={autoRotateSpeed}
            materialColor={materialColor}
            metalness={metalness}
            roughness={roughness}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}
