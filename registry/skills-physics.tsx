"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import Matter from "matter-js";

export interface PhysicsItem {
  src: string;
  label?: string;
  alt?: string;
}

export interface SkillsPhysicsProps {
  items: PhysicsItem[];
  iconSize?: number;
  className?: string;
  minHeight?: number;
  gravity?: number;
  bounciness?: number;
}

const WALL_THICKNESS = 60;

export default function SkillsPhysics({
  items,
  iconSize: propIconSize,
  className = "",
  minHeight = 350,
  gravity = 1,
  bounciness = 0.45,
}: SkillsPhysicsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const wallsRef = useRef<Matter.Body[]>([]);
  const bodiesRef = useRef<Matter.Body[]>([]);
  const rafRef = useRef<number>(0);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mouseConstraintRef = useRef<Matter.MouseConstraint | null>(null);
  const [currentIconSize, setCurrentIconSize] = useState(propIconSize || 80);
  const iconSizeRef = useRef(propIconSize || 80);
  const [, setIsReady] = useState(false);

  const createWalls = useCallback((width: number, height: number) => {
    return [
      // bottom
      Matter.Bodies.rectangle(
        width / 2,
        height - 8 + WALL_THICKNESS / 2,
        width + WALL_THICKNESS * 2,
        WALL_THICKNESS,
        { isStatic: true, render: { visible: false } }
      ),
      // left
      Matter.Bodies.rectangle(
        -WALL_THICKNESS / 2,
        height / 2,
        WALL_THICKNESS,
        height * 2,
        { isStatic: true, render: { visible: false } }
      ),
      // right
      Matter.Bodies.rectangle(
        width + WALL_THICKNESS / 2,
        height / 2,
        WALL_THICKNESS,
        height * 2,
        { isStatic: true, render: { visible: false } }
      ),
      // top
      Matter.Bodies.rectangle(
        width / 2,
        -WALL_THICKNESS / 2,
        width + WALL_THICKNESS * 2,
        WALL_THICKNESS,
        { isStatic: true, render: { visible: false } }
      ),
    ];
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !items.length) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Calculate responsive icon size if not explicitly locked by prop
    const calculatedSize = propIconSize
      ? propIconSize
      : width < 480
      ? 64
      : width < 768
      ? 76
      : width < 1024
      ? 86
      : 94;

    setCurrentIconSize(calculatedSize);
    iconSizeRef.current = calculatedSize;
    const radius = calculatedSize / 2;

    // 1. Create engine
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: gravity, scale: 0.001 },
    });
    engineRef.current = engine;

    // 2. Create walls
    const walls = createWalls(width, height);
    wallsRef.current = walls;
    Matter.Composite.add(engine.world, walls);

    // 3. Create bodies with safe responsive spawn coordinates
    const columns = Math.max(
      2,
      Math.min(items.length, Math.floor((width - 20) / (calculatedSize + 12)))
    );
    const totalRows = Math.ceil(items.length / columns);
    const availableHeight = height - calculatedSize - 30;
    const rowGap =
      totalRows > 1
        ? Math.min(calculatedSize + 14, Math.max(30, availableHeight / (totalRows - 1)))
        : 0;

    const bodies = items.map((_, i) => {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const x = (width / (columns + 1)) * (col + 1) + (Math.random() - 0.5) * 16;
      const y = radius + 15 + row * rowGap;

      return Matter.Bodies.rectangle(x, y, calculatedSize, calculatedSize, {
        chamfer: { radius: Math.round(calculatedSize * 0.18) },
        restitution: bounciness,
        friction: 0.3,
        frictionAir: 0.02,
        density: 0.003,
        label: `item-${i}`,
      });
    });
    bodiesRef.current = bodies;
    Matter.Composite.add(engine.world, bodies);

    // 4. Mouse / Touch Drag Overlay
    const overlayCanvas = document.createElement("canvas");
    overlayCanvas.width = width;
    overlayCanvas.height = height;
    overlayCanvas.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;cursor:grab;background:transparent;";
    container.appendChild(overlayCanvas);

    const mouse = Matter.Mouse.create(overlayCanvas);
    mouse.pixelRatio = 1;

    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    });
    mouseConstraintRef.current = mouseConstraint;
    Matter.Composite.add(engine.world, mouseConstraint);

    Matter.Events.on(mouseConstraint, "startdrag", () => {
      overlayCanvas.style.cursor = "grabbing";
    });
    Matter.Events.on(mouseConstraint, "enddrag", () => {
      overlayCanvas.style.cursor = "grab";
    });

    // 5. Start Runner
    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);

    // 6. Animation Frame Loop
    const animate = () => {
      const curRadius = iconSizeRef.current / 2;
      bodies.forEach((body, i) => {
        const el = iconRefs.current[i];
        if (!el) return;
        const { x, y } = body.position;
        const angle = body.angle;
        el.style.transform = `translate(${x - curRadius}px, ${y - curRadius}px) rotate(${angle}rad)`;
        el.style.opacity = "1";
      });
      rafRef.current = requestAnimationFrame(animate);
    };

    setIsReady(true);
    rafRef.current = requestAnimationFrame(animate);

    // 7. Resize Observer
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;

      overlayCanvas.width = newWidth;
      overlayCanvas.height = newHeight;

      Matter.Composite.remove(engine.world, wallsRef.current);
      const newWalls = createWalls(newWidth, newHeight);
      wallsRef.current = newWalls;
      Matter.Composite.add(engine.world, newWalls);

      const curRadius = iconSizeRef.current / 2;
      bodiesRef.current.forEach((body) => {
        Matter.Body.setPosition(body, {
          x: Math.max(curRadius + 5, Math.min(newWidth - curRadius - 5, body.position.x)),
          y: Math.max(curRadius + 5, Math.min(newHeight - curRadius - 15, body.position.y)),
        });
      });
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 8. Cleanup
    return () => {
      cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
      Matter.Runner.stop(runner);
      Matter.Composite.clear(engine.world, false);
      Matter.Engine.clear(engine);
      overlayCanvas.remove();
      setIsReady(false);
    };
  }, [items, propIconSize, gravity, bounciness, createWalls]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden w-full min-h-[380px] sm:min-h-[350px] md:min-h-[330px] ${className}`}
      style={{ minHeight }}
    >
      {items.map((item, i) => (
        <div
          key={`${item.label || item.src}-${i}`}
          ref={(el) => {
            iconRefs.current[i] = el;
          }}
          className="absolute top-0 left-0 pointer-events-none select-none"
          style={{
            width: currentIconSize,
            height: currentIconSize,
            opacity: 0,
            willChange: "transform",
          }}
        >
          <div className="w-full h-full rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 flex flex-col items-center justify-center gap-1 shadow-lg shadow-black/20 hover:border-white/20 transition-colors">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.src}
              alt={item.alt || item.label || "logo"}
              width={Math.round(currentIconSize * 0.52)}
              height={Math.round(currentIconSize * 0.52)}
              className="object-contain pointer-events-none"
              draggable={false}
            />
            {item.label && (
              <span className="text-[9px] sm:text-[10px] font-medium text-white/70 leading-none truncate max-w-[85%] text-center">
                {item.label}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
