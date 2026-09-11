// Vertical Parallax — Originkit

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

type ImageValue = string | { src?: string } | null | undefined;

type ItemInput = ImageValue | { image?: ImageValue; offsetY?: number };

interface Plate {
  src: string | null;
  offsetY: number;
  tag: string;
}

export interface VerticalParallaxProps {
  items?: ItemInput[];

  background?: string;

  labels?: { show?: boolean; width?: number; gap?: number };
  font?: CSSProperties;
  textColor?: string;

  direction?: "vertical" | "horizontal";
  spacing?: number;
  alternate?: boolean;

  cardWidth?: number;
  cardHeight?: number;
  radius?: number;

  parallax?: number;
  sensitivity?: number;
  smoothing?: number;
  style?: CSSProperties;
}

const PLACEHOLDER_COUNT = 10;

const EVEN_DRIFT = 0.3;
const ODD_DRIFT = 0.15;

const COVER_SLACK = 0.02;

const FADE_START = 0.15;
const FADE_END = 0.42;

const ALT_WIDTH = 0.667;
const ALT_HEIGHT = 1.5;

const LABEL_CASE = "uppercase" as const;

const DEFAULT_BACKGROUND = "#000000";
const DEFAULT_TEXT_COLOR = "#0A0A0A";

const DEFAULT_LABELS = {
  show: false,
  width: 256,
  gap: 32,
};

const DEFAULT_FONT: CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace",
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: "0.08em",
  lineHeight: 1.4,
};

const DEFAULTS = {
  direction: "vertical" as const,
  spacing: 2,
  alternate: false,
  cardWidth: 400,
  cardHeight: 300,
  radius: 0,
  parallax: 6,
  sensitivity: 5,
  smoothing: 7,
};

// Sem defaults de imagens externas (o original vinha com fotos do
// Unsplash) — sem itens, cai sozinho nos placeholders em gradiente já
// embutidos no componente, sem chamar rede nenhuma.
const DEFAULT_ITEMS: ItemInput[] = [];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function wrap(value: number, span: number): number {
  return ((value % span) + span) % span;
}

function resolveSrc(value: ImageValue): string | null {
  if (!value) return null;
  if (typeof value === "string") return value || null;
  const src = value.src;
  return typeof src === "string" && src ? src : null;
}

function imageOf(item: ItemInput): string | null {
  if (item && typeof item === "object" && "image" in item) return resolveSrc(item.image);
  return resolveSrc(item as ImageValue);
}

function offsetOf(item: ItemInput): number {
  if (item && typeof item === "object" && "offsetY" in item) {
    const offset = (item as { offsetY?: number }).offsetY;
    return typeof offset === "number" && isFinite(offset) ? offset : 0;
  }
  return 0;
}

function autoTag(index: number): string {
  return `${String(index + 1).padStart(2, "0")}/`;
}

function placeholderFill(index: number): string {
  const hue = (index * 37 + 24) % 360;
  return `linear-gradient(155deg, hsl(${hue} 24% 78%), hsl(${(hue + 40) % 360} 18% 52%))`;
}

interface Frame {
  tops: number[];
  heights: number[];
  widths: number[];
  count: number;
  span: number;
  viewport: number;
  ease: number;
  drift: number;
  axisIsY: boolean;
}

export default function VerticalParallax({
  items = DEFAULT_ITEMS,
  background = DEFAULT_BACKGROUND,
  labels,
  font = DEFAULT_FONT,
  textColor = DEFAULT_TEXT_COLOR,
  direction = DEFAULTS.direction,
  spacing = DEFAULTS.spacing,
  alternate = DEFAULTS.alternate,
  cardWidth = DEFAULTS.cardWidth,
  cardHeight = DEFAULTS.cardHeight,
  radius = DEFAULTS.radius,
  parallax = DEFAULTS.parallax,
  sensitivity = DEFAULTS.sensitivity,
  smoothing = DEFAULTS.smoothing,
  style,
}: VerticalParallaxProps) {
  const label = { ...DEFAULT_LABELS, ...labels };

  const axisIsY = direction !== "horizontal";

  const containerRef = useRef<HTMLDivElement | null>(null);
  const rowNodes = useRef<(HTMLDivElement | null)[]>([]);
  const imageNodes = useRef<(HTMLElement | null)[]>([]);
  const labelNodes = useRef<(HTMLDivElement | null)[]>([]);
  const target = useRef(0);
  const current = useRef(0);
  const [viewport, setViewport] = useState(0);

  const source = useMemo<Plate[]>(() => {
    const resolved: Plate[] = [];
    for (const item of items ?? []) {
      const src = imageOf(item);
      if (!src) continue;
      resolved.push({
        src,
        offsetY: offsetOf(item),
        tag: autoTag(resolved.length),
      });
    }
    if (resolved.length) return resolved;
    return Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => ({
      src: null,
      offsetY: 0,
      tag: autoTag(i),
    }));
  }, [items]);

  const gap = clamp(spacing, 0, 10) * 20;
  const ease = 0.15 - (clamp(smoothing, 0, 10) / 10) * 0.13;
  const drift = clamp(parallax, 0, 10) / 10;
  const wheelMultiplier = 0.4 + (clamp(sensitivity, 0, 10) / 10) * 1.2;
  const dragMultiplier = 0.6 + (clamp(sensitivity, 0, 10) / 10) * 1.8;

  const layout = useMemo(() => {
    const n = source.length;
    const evenSize = {
      width: Math.round(cardWidth),
      height: Math.round(cardHeight),
    };
    const oddSize = alternate
      ? {
          width: Math.round(cardWidth * ALT_WIDTH),
          height: Math.round(cardHeight * ALT_HEIGHT),
        }
      : evenSize;
    const sizeAt = (i: number) => (i % 2 === 0 ? evenSize : oddSize);

    const extentOf = (size: { width: number; height: number }) =>
      axisIsY ? size.height : size.width;

    if (!n) {
      return { count: 0, tops: [], heights: [], widths: [], span: 0 };
    }

    const blockLength = alternate && n % 2 === 1 ? n * 2 : n;
    let blockSpan = 0;
    for (let i = 0; i < blockLength; i += 1) blockSpan += extentOf(sizeAt(i));
    blockSpan += blockLength * gap;

    const tallest = Math.max(extentOf(evenSize), extentOf(oddSize));
    let count = blockLength;
    if (blockSpan > 0) {
      const need = viewport + tallest * 2;
      const repeats = Math.max(1, Math.ceil(need / blockSpan));
      count = blockLength * repeats;
    }

    const tops: number[] = [];
    const heights: number[] = [];
    const widths: number[] = [];
    let cursor = 0;
    for (let i = 0; i < count; i += 1) {
      const size = sizeAt(i);
      tops.push(cursor);
      heights.push(size.height);
      widths.push(size.width);
      cursor += extentOf(size) + gap;
    }
    return { count, tops, heights, widths, span: cursor };
  }, [source.length, cardWidth, cardHeight, alternate, gap, viewport, axisIsY]);

  const frame = useRef<Frame>({
    tops: [],
    heights: [],
    widths: [],
    count: 0,
    span: 0,
    viewport: 0,
    ease: 0.06,
    drift: 0,
    axisIsY: true,
  });
  frame.current = {
    tops: layout.tops,
    heights: layout.heights,
    widths: layout.widths,
    count: layout.count,
    span: layout.span,
    viewport,
    ease,
    drift,
    axisIsY,
  };

  const input = useRef({ wheelMultiplier, dragMultiplier, axisIsY });
  input.current = { wheelMultiplier, dragMultiplier, axisIsY };

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setViewport(axisIsY ? rect.height : rect.width);
    });
    observer.observe(node);
    const rect = node.getBoundingClientRect();
    setViewport(axisIsY ? rect.height : rect.width);
    return () => observer.disconnect();
  }, [axisIsY]);

  useEffect(() => {
    rowNodes.current.length = layout.count;
    imageNodes.current.length = layout.count;
    labelNodes.current.length = layout.count;
  }, [layout.count]);

  useEffect(() => {
    let raf = 0;
    let last = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const c = frame.current;
      const delta = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60;
      last = now;
      if (!c.count || c.span <= 0 || c.viewport <= 0) return;

      if (current.current > c.span || current.current < -c.span) {
        const shift = Math.trunc(current.current / c.span) * c.span;
        current.current -= shift;
        target.current -= shift;
      }

      const k = 1 - Math.pow(1 - c.ease, delta * 60);
      current.current += (target.current - current.current) * k;

      for (let i = 0; i < c.count; i += 1) {
        const row = rowNodes.current[i];
        if (!row) continue;
        const extent = c.axisIsY ? c.heights[i] : c.widths[i];
        const raw = c.tops[i] - current.current;

        const pos = wrap(raw + extent, c.span) - extent;
        row.style.transform = c.axisIsY
          ? `translate3d(0, ${pos}px, 0)`
          : `translate3d(${pos}px, 0, 0)`;

        const progress = clamp((c.viewport - pos) / (c.viewport + extent), 0, 1);

        const picture = imageNodes.current[i];
        if (picture) {
          const amp = (i % 2 === 0 ? EVEN_DRIFT : ODD_DRIFT) * c.drift;

          const scale = 1 + amp * 2 + COVER_SLACK;
          const shift = (progress - 0.5) * 2 * amp * extent;
          picture.style.transform = c.axisIsY
            ? `translate3d(0, ${shift}px, 0) scale(${scale})`
            : `translate3d(${shift}px, 0, 0) scale(${scale})`;
        }

        const writing = labelNodes.current[i];
        if (writing) {
          const t = clamp((progress - FADE_START) / (FADE_END - FADE_START), 0, 1);
          writing.style.opacity = `${t}`;
        }
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      target.current += event.deltaY * input.current.wheelMultiplier;
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    let pointer: number | null = null;
    let last = 0;

    const onDown = (event: PointerEvent) => {
      if (pointer !== null) return;
      pointer = event.pointerId;
      last = input.current.axisIsY ? event.clientY : event.clientX;
      node.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (pointer !== event.pointerId) return;
      const value = input.current.axisIsY ? event.clientY : event.clientX;
      const delta = value - last;
      last = value;

      target.current -= delta * input.current.dragMultiplier;
    };
    const onUp = (event: PointerEvent) => {
      if (pointer !== event.pointerId) return;
      pointer = null;
      if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
    };

    node.addEventListener("pointerdown", onDown);
    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerup", onUp);
    node.addEventListener("pointercancel", onUp);
    return () => {
      node.removeEventListener("pointerdown", onDown);
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerup", onUp);
      node.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const labelStyle: CSSProperties = {
    ...font,
    color: textColor,
    textTransform: LABEL_CASE,
    width: label.width,
    flexShrink: 0,
    opacity: 0,
    willChange: "opacity",
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background,
        cursor: "grab",
        touchAction: axisIsY ? "pan-x" : "pan-y",
        userSelect: "none",
        opacity: viewport > 0 ? 1 : 0,
        transition: "opacity 0.35s ease",
        ...style,
      }}
    >
      {Array.from({ length: layout.count }, (_, i) => {
        const plate = source[i % source.length];
        const isEven = i % 2 === 0;
        const writing = label.show ? (
          <div
            ref={(el) => {
              labelNodes.current[i] = el;
            }}
            style={{
              ...labelStyle,
              textAlign: isEven ? "right" : "left",
            }}
          >
            {plate.tag}
          </div>
        ) : null;

        const spacer = label.show ? <div style={{ width: label.width, flexShrink: 0 }} /> : null;

        return (
          <div
            key={i}
            ref={(el) => {
              rowNodes.current[i] = el;
            }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: axisIsY ? "100%" : layout.widths[i],
              height: axisIsY ? layout.heights[i] : "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: label.show ? label.gap : 0,
              transform: axisIsY
                ? `translate3d(0, ${layout.tops[i]}px, 0)`
                : `translate3d(${layout.tops[i]}px, 0, 0)`,
              willChange: "transform",
              pointerEvents: "none",
            }}
          >
            {isEven ? writing : spacer}
            <div
              style={{
                position: "relative",
                width: layout.widths[i],
                height: layout.heights[i],
                flexShrink: 0,
                overflow: "hidden",
                borderRadius: radius,
                background: plate.src ? "#111" : placeholderFill(i % source.length),
              }}
            >
              {plate.src ? (
                <img
                  ref={(el) => {
                    imageNodes.current[i] = el;
                  }}
                  src={plate.src}
                  alt=""
                  draggable={false}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",

                    objectPosition: `50% calc(50% + ${plate.offsetY}px)`,
                    willChange: "transform",
                  }}
                />
              ) : (
                <div
                  ref={(el) => {
                    imageNodes.current[i] = el;
                  }}
                  style={{
                    width: "100%",
                    height: "100%",
                    background: placeholderFill(i % source.length),
                    willChange: "transform",
                  }}
                />
              )}
            </div>
            {isEven ? spacer : writing}
          </div>
        );
      })}
    </div>
  );
}
