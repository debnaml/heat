'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { AttentionZone } from '@/lib/types';

interface HeatmapCanvasProps {
  screenshot: string; // base64
  zones: AttentionZone[];
  opacity: number;
  showHeatmap: boolean;
  highlightedZone: string | null;
}

function getHeatColor(intensity: number): [number, number, number, number] {
  if (intensity <= 20) return [0, 0, 255, 0.1];
  if (intensity <= 40) return [0, 255, 255, 0.3];
  if (intensity <= 60) return [0, 255, 0, 0.5];
  if (intensity <= 80) return [255, 255, 0, 0.7];
  return [255, 0, 0, 0.9];
}

export default function HeatmapCanvas({
  screenshot,
  zones,
  opacity,
  showHeatmap,
  highlightedZone,
}: HeatmapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    element: string;
    reason: string;
  } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Load the image once
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const scale = containerWidth / img.width;
        setCanvasSize({
          width: containerWidth,
          height: img.height * scale,
        });
      }
    };
    img.src = `data:image/png;base64,${screenshot}`;
  }, [screenshot]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && imgRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const scale = containerWidth / imgRef.current.width;
        setCanvasSize({
          width: containerWidth,
          height: imgRef.current.height * scale,
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || canvasSize.width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasSize;
    canvas.width = width;
    canvas.height = height;

    // Draw the screenshot
    ctx.drawImage(img, 0, 0, width, height);

    if (!showHeatmap) return;

    // Create an offscreen canvas for the heatmap layer
    const heatCanvas = document.createElement('canvas');
    heatCanvas.width = width;
    heatCanvas.height = height;
    const heatCtx = heatCanvas.getContext('2d');
    if (!heatCtx) return;

    // Draw each zone as a radial gradient
    for (const zone of zones) {
      const cx = (zone.x / 100) * width;
      const cy = (zone.y / 100) * height;
      const rx = ((zone.width / 100) * width) / 2;
      const ry = ((zone.height / 100) * height) / 2;
      const radius = Math.max(rx, ry);

      const [r, g, b, a] = getHeatColor(zone.intensity);
      const gradient = heatCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${a})`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      heatCtx.globalCompositeOperation = 'screen';
      heatCtx.fillStyle = gradient;
      heatCtx.beginPath();
      heatCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      heatCtx.fill();

      // If this zone is highlighted, draw a border
      if (highlightedZone === zone.id) {
        heatCtx.globalCompositeOperation = 'source-over';
        heatCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        heatCtx.lineWidth = 2;
        heatCtx.beginPath();
        heatCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        heatCtx.stroke();
      }
    }

    // Composite heatmap onto main canvas
    ctx.globalAlpha = opacity;
    ctx.drawImage(heatCanvas, 0, 0);
    ctx.globalAlpha = 1;
  }, [canvasSize, zones, opacity, showHeatmap, highlightedZone]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const percX = (mouseX / rect.width) * 100;
      const percY = (mouseY / rect.height) * 100;

      // Find if mouse is over any zone
      const hoveredZone = zones.find((zone) => {
        const halfW = zone.width / 2;
        const halfH = zone.height / 2;
        return (
          percX >= zone.x - halfW &&
          percX <= zone.x + halfW &&
          percY >= zone.y - halfH &&
          percY <= zone.y + halfH
        );
      });

      if (hoveredZone) {
        setTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          element: hoveredZone.element,
          reason: hoveredZone.reason,
        });
      } else {
        setTooltip(null);
      }
    },
    [zones]
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg"
        style={{ height: canvasSize.height || 'auto' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      />
      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none bg-black/90 text-white text-xs rounded-lg px-3 py-2 max-w-xs shadow-lg border border-zinc-700"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 10,
            transform: 'translateY(-100%)',
          }}
        >
          <p className="font-semibold text-blue-300">{tooltip.element}</p>
          <p className="text-zinc-300 mt-1">{tooltip.reason}</p>
        </div>
      )}
    </div>
  );
}
