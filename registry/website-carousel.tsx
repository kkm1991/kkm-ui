"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import clsx from "clsx";

export interface CarouselItem {
  id?: string | number;
  name: string;
  tech?: string;
  url?: string;
  icon?: string;
  badge?: string;
  featured?: boolean;
  description?: string;
}

export interface WebsiteCarouselProps {
  items: CarouselItem[];
  cardWidth?: number;
  cardGap?: number;
  maxMomentumCards?: number;
  onItemClick?: (item: CarouselItem) => void;
  className?: string;
}

const SCALE_CENTER = 1;
const SCALE_SIDE = 0.88;
const SCALE_FAR = 0.72;

const OPACITY_CENTER = 1;
const OPACITY_SIDE = 0.9;
const OPACITY_FAR = 0.55;

const ROTATE_Y_SIDE = 6;
const ROTATE_Y_FAR = 12;

const TRANSLATE_Z_SIDE = -60;
const TRANSLATE_Z_FAR = -120;

const TRANSITION_CONFIG = {
  duration: 0.4,
  ease: [0.22, 1, 0.36, 1] as const,
};

function getCardVisual(distance: number) {
  const absoluteDistance = Math.abs(distance);
  const direction = Math.sign(distance) || 1;
  const localDistance = Math.min(absoluteDistance, 1);
  const sideProgress = Math.min(Math.max((absoluteDistance - 1) / 1, 0), 1);

  if (absoluteDistance <= 1) {
    return {
      scale: SCALE_CENTER + (SCALE_SIDE - SCALE_CENTER) * localDistance,
      opacity: OPACITY_CENTER + (OPACITY_SIDE - OPACITY_CENTER) * localDistance,
      rotateY: -direction * ROTATE_Y_SIDE * localDistance,
      translateZ: TRANSLATE_Z_SIDE * localDistance,
    };
  }

  if (absoluteDistance <= 2) {
    return {
      scale: SCALE_SIDE + (SCALE_FAR - SCALE_SIDE) * sideProgress,
      opacity: OPACITY_SIDE + (OPACITY_FAR - OPACITY_SIDE) * sideProgress,
      rotateY: -direction * (ROTATE_Y_SIDE + (ROTATE_Y_FAR - ROTATE_Y_SIDE) * sideProgress),
      translateZ: TRANSLATE_Z_SIDE + (TRANSLATE_Z_FAR - TRANSLATE_Z_SIDE) * sideProgress,
    };
  }

  const fadeProgress = Math.max(0, 1 - (absoluteDistance - 2) / 0.75);
  return {
    scale: SCALE_FAR * 0.9,
    opacity: OPACITY_FAR * fadeProgress,
    rotateY: -direction * (ROTATE_Y_FAR + 3),
    translateZ: TRANSLATE_Z_FAR - 40,
  };
}

function DefaultCard({
  item,
  onClick,
}: {
  item: CarouselItem;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-white/5 to-transparent p-6 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-amber-400/40 cursor-pointer h-[380px]"
    >
      <div className="flex items-start justify-between">
        {item.icon ? (
          <div className="h-14 w-14 rounded-2xl bg-white/10 p-2.5 backdrop-blur-md border border-white/10 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.icon}
              alt={item.name}
              className="h-full w-full object-contain"
            />
          </div>
        ) : (
          <div className="h-14 w-14 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center font-bold text-amber-300">
            {item.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        {item.badge && (
          <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-400/20">
            {item.badge}
          </span>
        )}
      </div>

      <div className="my-auto space-y-2">
        <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
          {item.name}
        </h3>
        {item.tech && (
          <p className="text-xs font-mono text-neutral-400 leading-relaxed">
            {item.tech}
          </p>
        )}
        {item.description && (
          <p className="text-sm text-neutral-300/80 line-clamp-3">
            {item.description}
          </p>
        )}
      </div>

      <div className="pt-4 border-t border-white/10 flex items-center justify-between">
        <span className="text-xs font-medium text-amber-400 group-hover:underline">
          View Project &rarr;
        </span>
      </div>
    </div>
  );
}

export default function WebsiteCarousel({
  items,
  cardWidth = 300,
  cardGap = 44,
  maxMomentumCards = 6,
  onItemClick,
  className = "",
}: WebsiteCarouselProps) {
  const numItems = items.length;
  const visibleRange = Math.min(6, numItems);
  const cardStep = cardWidth + cardGap;

  const [activeVirtualIndex, setActiveVirtualIndex] = useState(visibleRange);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const progress = useMotionValue(visibleRange);

  const dragPointerIdRef = useRef<number | null>(null);
  const dragStartXRef = useRef(0);
  const dragStartYRef = useRef(0);
  const dragStartProgressRef = useRef(visibleRange);
  const lastPointerXRef = useRef(0);
  const lastPointerTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const isHorizontalDragRef = useRef(false);
  const directionDecidedRef = useRef(false);

  const normalizeIndex = useCallback(
    (index: number) => {
      if (numItems === 0) return 0;
      const mod = index % numItems;
      return mod < 0 ? mod + numItems : mod;
    },
    [numItems]
  );

  const settleAt = useCallback(
    (target: number, momentum = 0) => {
      const roundedTarget = Math.round(target);
      const currentProgress = progress.get();
      const currentRounded = Math.round(currentProgress);
      const normalizedCurrent =
        normalizeIndex(currentRounded - visibleRange) + visibleRange;
      const delta = roundedTarget - currentRounded;

      progress.jump(normalizedCurrent + (currentProgress - currentRounded));

      const animTarget = normalizedCurrent + delta;
      const normalizedFinal =
        normalizeIndex(animTarget - visibleRange) + visibleRange;
      setActiveVirtualIndex(normalizedFinal);

      const absMomentum = Math.abs(momentum);
      const transitionConfig =
        absMomentum > 1
          ? {
              duration: 0.35 + absMomentum * 0.1,
              ease: [0.25, 1, 0.5, 1] as const,
            }
          : TRANSITION_CONFIG;

      animate(progress, animTarget, {
        ...transitionConfig,
        onComplete: () => {
          progress.jump(normalizedFinal);
          setActiveVirtualIndex(normalizedFinal);
        },
      });
    },
    [normalizeIndex, progress, visibleRange]
  );

  const goPrev = () => settleAt(Math.round(progress.get()) - 1);
  const goNext = () => settleAt(Math.round(progress.get()) + 1);

  const getMomentumCards = (deltaX: number, velocity: number): number => {
    const absVelocity = Math.abs(velocity);
    const absDelta = Math.abs(deltaX);
    if (absDelta < 40 && absVelocity < 0.3) return 0;

    const direction = deltaX < 0 || velocity < 0 ? 1 : -1;
    // Velocity scaling: e.g. 0.5 -> 1-2 cards, 2.0 -> 6 cards
    const velocityCards = Math.round(absVelocity * 3);
    const distanceCards = Math.round(absDelta / cardStep);
    const rawCards = Math.max(1, Math.max(velocityCards, distanceCards));
    return direction * Math.min(rawCards, maxMomentumCards);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}

    dragPointerIdRef.current = event.pointerId;
    dragStartXRef.current = event.clientX;
    dragStartYRef.current = event.clientY;
    dragStartProgressRef.current = progress.get();
    lastPointerXRef.current = event.clientX;
    lastPointerTimeRef.current = event.timeStamp;
    velocityRef.current = 0;
    hasDraggedRef.current = false;
    isHorizontalDragRef.current = false;
    directionDecidedRef.current = false;
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;

    const deltaX = event.clientX - dragStartXRef.current;
    const deltaY = event.clientY - dragStartYRef.current;
    const absoluteX = Math.abs(deltaX);
    const absoluteY = Math.abs(deltaY);

    if (!directionDecidedRef.current) {
      if (absoluteX < 6 && absoluteY < 6) return;
      directionDecidedRef.current = true;
      if (absoluteY > absoluteX * 1.15) {
        dragPointerIdRef.current = null;
        setIsDragging(false);
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {}
        return;
      }
      isHorizontalDragRef.current = true;
    }

    if (!isHorizontalDragRef.current) return;
    if (absoluteX > 4) hasDraggedRef.current = true;

    const elapsed = Math.max(1, event.timeStamp - lastPointerTimeRef.current);
    velocityRef.current = (event.clientX - lastPointerXRef.current) / elapsed;
    lastPointerXRef.current = event.clientX;
    lastPointerTimeRef.current = event.timeStamp;

    progress.set(dragStartProgressRef.current - deltaX / cardStep);
    event.preventDefault();
  };

  const finishPointerDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;
    const deltaX = event.clientX - dragStartXRef.current;
    const velocity = velocityRef.current;
    const momentumCards = getMomentumCards(deltaX, velocity);
    const target =
      momentumCards !== 0
        ? dragStartProgressRef.current + momentumCards
        : Math.round(dragStartProgressRef.current - deltaX / cardStep);

    dragPointerIdRef.current = null;
    setIsDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {}

    settleAt(target, momentumCards);
  };

  if (!numItems) return null;

  const totalVirtualCards = numItems + visibleRange * 2;
  const virtualCards = Array.from({ length: totalVirtualCards }, (_, i) => {
    const realIndex = normalizeIndex(i - visibleRange);
    return {
      item: items[realIndex],
      virtualIndex: i,
    };
  });

  return (
    <div
      ref={containerRef}
      className={clsx("relative w-full max-w-6xl mx-auto select-none", className)}
    >
      <div
        className={clsx(
          "relative flex items-center justify-center min-h-[500px]",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        style={{ perspective: "1200px", touchAction: "pan-y" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerDrag}
        onPointerCancel={finishPointerDrag}
      >
        {virtualCards.map((card) => {
          return (
            <CardWrapper
              key={card.virtualIndex}
              item={card.item}
              virtualIndex={card.virtualIndex}
              progress={progress}
              cardStep={cardStep}
              cardWidth={cardWidth}
              isDragging={isDragging}
              onClick={() => {
                if (!hasDraggedRef.current) {
                  if (onItemClick) onItemClick(card.item);
                  else if (card.item.url) window.open(card.item.url, "_blank");
                }
              }}
            />
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-center items-center gap-4 mt-6">
        <button
          onClick={goPrev}
          aria-label="Previous card"
          className="p-3 rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all shadow-md backdrop-blur-md"
        >
          <IconChevronLeft size={22} />
        </button>
        <span className="font-mono text-xs text-white/40">
          {normalizeIndex(activeVirtualIndex - visibleRange) + 1} / {numItems}
        </span>
        <button
          onClick={goNext}
          aria-label="Next card"
          className="p-3 rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all shadow-md backdrop-blur-md"
        >
          <IconChevronRight size={22} />
        </button>
      </div>
    </div>
  );
}

function CardWrapper({
  item,
  virtualIndex,
  progress,
  cardStep,
  cardWidth,
  isDragging,
  onClick,
}: {
  item: CarouselItem;
  virtualIndex: number;
  progress: MotionValue<number>;
  cardStep: number;
  cardWidth: number;
  isDragging: boolean;
  onClick: () => void;
}) {
  const [nearestSlot, setNearestSlot] = useState(0);
  const distance = useTransform(progress, (v) => virtualIndex - v);
  const x = useTransform(distance, (v) => v * cardStep);
  const scale = useTransform(distance, (v) => getCardVisual(v).scale);
  const opacity = useTransform(distance, (v) => getCardVisual(v).opacity);
  const rotateY = useTransform(distance, (v) => getCardVisual(v).rotateY);
  const translateZ = useTransform(distance, (v) => getCardVisual(v).translateZ);

  useMotionValueEvent(progress, "change", (v) => {
    setNearestSlot(Math.round(v));
  });

  const isCenter = nearestSlot === virtualIndex;

  return (
    <motion.div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        x,
        rotateY,
        scale,
        opacity,
        translateZ,
        zIndex: Math.max(0, 100 - Math.abs(nearestSlot - virtualIndex) * 20),
        pointerEvents: isCenter ? "auto" : "none",
        willChange: isDragging ? "transform, opacity" : "auto",
      }}
    >
      <div
        style={{
          width: cardWidth,
          transform: "translate(-50%, -50%)",
        }}
      >
        <DefaultCard item={item} onClick={onClick} />
      </div>
    </motion.div>
  );
}
