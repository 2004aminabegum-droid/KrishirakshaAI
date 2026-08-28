'use client';

import React, { useRef, useEffect } from 'react';
import { DetectedPest } from '../utils/hybridEngine';

interface PestBoundingBoxProps {
  imageSrc: string;
  pests: DetectedPest[];
}

export function PestBoundingBox({ imageSrc, pests }: PestBoundingBoxProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Draw bounding boxes for each pest
      pests.forEach((pest) => {
        if (!pest.bounding_box) return;
        pest.bounding_box.forEach((box) => {
          const x = box.x_min * img.width;
          const y = box.y_min * img.height;
          const w = (box.x_max - box.x_min) * img.width;
          const h = (box.y_max - box.y_min) * img.height;

          // Box border
          ctx.strokeStyle = '#f59e0b'; // Amber-500
          ctx.lineWidth = Math.max(3, Math.round(img.width / 150));
          ctx.strokeRect(x, y, w, h);

          // Background box for label
          const labelText = `${pest.name} (${Math.round(pest.confidence * 100)}%)`;
          ctx.font = `bold ${Math.max(12, Math.round(img.width / 40))}px sans-serif`;
          const textWidth = ctx.measureText(labelText).width;
          const textHeight = Math.max(16, Math.round(img.width / 35));

          ctx.fillStyle = 'rgba(180, 83, 9, 0.9)'; // Amber-700
          ctx.fillRect(x, y - textHeight - 4 > 0 ? y - textHeight - 4 : y, textWidth + 10, textHeight + 4);

          // Text label
          ctx.fillStyle = '#ffffff';
          ctx.fillText(labelText, x + 5, y - textHeight - 4 > 0 ? y - 6 : y + textHeight - 2);
        });
      });
    };
    img.src = imageSrc;
  }, [imageSrc, pests]);

  return (
    <div className="relative inline-block overflow-hidden rounded-xl border border-slate-800 shadow-md">
      <canvas ref={canvasRef} className="max-h-80 w-auto object-contain rounded-lg" />
    </div>
  );
}
