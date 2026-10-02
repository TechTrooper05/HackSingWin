'use client';

import React, { useEffect, useRef } from 'react';

export interface FuzzyTextProps {
  children?: React.ReactNode;
  fontSize?: number | string;
  fontWeight?: string | number;
  fontFamily?: string;
  color?: string;
  enableHover?: boolean;
  baseIntensity?: number;
  hoverIntensity?: number;
  fuzzRange?: number;
  fps?: number;
  direction?: 'horizontal' | 'vertical' | 'both';
  transitionDuration?: number;
  clickEffect?: boolean;
  glitchMode?: boolean;
  glitchInterval?: number;
  glitchDuration?: number;
  gradient?: string[] | null;
  letterSpacing?: number;
  className?: string;
  style?: React.CSSProperties;
}

interface CustomCanvasElement extends HTMLCanvasElement {
  cleanupFuzzyText?: () => void;
}

interface TextSegment {
  text: string;
  color: string;
}

export default function FuzzyText({
  children,
  fontSize = 'clamp(2rem, 8vw, 8rem)',
  fontWeight = 900,
  fontFamily = 'inherit',
  color = '#fff',
  enableHover = true,
  baseIntensity = 0.18,
  hoverIntensity = 0.5,
  fuzzRange = 30,
  fps = 60,
  direction = 'horizontal',
  transitionDuration = 0,
  clickEffect = false,
  glitchMode = false,
  glitchInterval = 2000,
  glitchDuration = 200,
  gradient = null,
  letterSpacing = 0,
  className = '',
  style = {},
}: FuzzyTextProps) {
  const canvasRef = useRef<CustomCanvasElement | null>(null);

  useEffect(() => {
    let animationFrameId: number;
    let isCancelled = false;
    let glitchTimeoutId: NodeJS.Timeout | number;
    let glitchEndTimeoutId: NodeJS.Timeout | number;
    let clickTimeoutId: NodeJS.Timeout | number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const init = async () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const computedFontFamily =
        fontFamily === 'inherit'
          ? (typeof window !== 'undefined' && canvas
              ? window.getComputedStyle(canvas).fontFamily
              : 'sans-serif') || 'sans-serif'
          : fontFamily;

      // Extract multi-colored segments or single text from children
      const segments: TextSegment[] = [];
      const reactChildren = React.Children.toArray(children);

      for (const child of reactChildren) {
        if (child == null) continue;
        if (typeof child === 'string' || typeof child === 'number') {
          segments.push({ text: String(child), color });
        } else if (React.isValidElement(child)) {
          const childProps = child.props as {
            style?: { color?: string };
            color?: string;
            children?: React.ReactNode;
          };
          const childColor =
            childProps?.style?.color || childProps?.color || color;
          const childText =
            typeof childProps?.children === 'string'
              ? childProps.children
              : React.Children.toArray(childProps?.children).join('');
          segments.push({ text: String(childText), color: childColor });
        }
      }

      if (segments.length === 0) {
        if (typeof children === 'string' || typeof children === 'number') {
          segments.push({ text: String(children), color });
        }
      }

      const fullText = segments.map((s) => s.text).join('');
      if (!fullText) return;

      // Accurately compute numeric pixel font size (evaluating clamp/rem/calc if passed)
      let numericFontSize: number;
      if (typeof fontSize === 'number') {
        numericFontSize = fontSize;
      } else {
        const temp = document.createElement('span');
        temp.style.fontSize = fontSize;
        temp.style.visibility = 'hidden';
        temp.style.position = 'absolute';
        temp.style.pointerEvents = 'none';
        document.body.appendChild(temp);
        const computedSize = window.getComputedStyle(temp).fontSize;
        numericFontSize = parseFloat(computedSize) || 32;
        document.body.removeChild(temp);
      }

      // Canvas 2D requires explicit pixel values in font property shorthand (e.g. '800 64px sans-serif')
      const validFontString = `${fontWeight} ${Math.round(numericFontSize)}px ${computedFontFamily}`;

      try {
        if (typeof document !== 'undefined' && document.fonts) {
          if (document.fonts.load) {
            await document.fonts.load(validFontString);
          } else if (document.fonts.ready) {
            await document.fonts.ready;
          }
        }
      } catch {
        // Fallback gracefully
      }
      if (isCancelled) return;

      const offscreen = document.createElement('canvas');
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return;

      offCtx.font = validFontString;
      offCtx.textBaseline = 'alphabetic';

      let totalWidth = 0;
      if (letterSpacing !== 0) {
        for (const char of fullText) {
          totalWidth += offCtx.measureText(char).width + letterSpacing;
        }
        totalWidth -= letterSpacing;
      } else {
        totalWidth = offCtx.measureText(fullText).width;
      }

      const metrics = offCtx.measureText(fullText);
      const actualLeft = metrics.actualBoundingBoxLeft ?? 0;
      const actualRight =
        letterSpacing !== 0
          ? totalWidth
          : metrics.actualBoundingBoxRight ?? metrics.width;
      const actualAscent = metrics.actualBoundingBoxAscent ?? numericFontSize;
      const actualDescent =
        metrics.actualBoundingBoxDescent ?? numericFontSize * 0.2;

      const textBoundingWidth = Math.ceil(
        letterSpacing !== 0 ? totalWidth : actualLeft + actualRight
      );
      const tightHeight = Math.ceil(actualAscent + actualDescent);
      if (tightHeight <= 0 || textBoundingWidth <= 0) return;

      const extraWidthBuffer = 10;
      const offscreenWidth = textBoundingWidth + extraWidthBuffer;

      offscreen.width = offscreenWidth;
      offscreen.height = tightHeight;

      const xOffset = extraWidthBuffer / 2;
      offCtx.font = validFontString;
      offCtx.textBaseline = 'alphabetic';

      if (gradient && Array.isArray(gradient) && gradient.length >= 2) {
        const grad = offCtx.createLinearGradient(0, 0, offscreenWidth, 0);
        gradient.forEach((c, i) =>
          grad.addColorStop(i / (gradient.length - 1), c)
        );
        offCtx.fillStyle = grad;

        if (letterSpacing !== 0) {
          let xPos = xOffset;
          for (const char of fullText) {
            offCtx.fillText(char, xPos, actualAscent);
            xPos += offCtx.measureText(char).width + letterSpacing;
          }
        } else {
          offCtx.fillText(fullText, xOffset - actualLeft, actualAscent);
        }
      } else {
        // Draw segment by segment to preserve multi-tone branding
        let xPos = xOffset - (letterSpacing === 0 ? actualLeft : 0);
        for (const seg of segments) {
          offCtx.fillStyle = seg.color;
          if (letterSpacing !== 0) {
            for (const char of seg.text) {
              offCtx.fillText(char, xPos, actualAscent);
              xPos += offCtx.measureText(char).width + letterSpacing;
            }
          } else {
            offCtx.fillText(seg.text, xPos, actualAscent);
            xPos += offCtx.measureText(seg.text).width;
          }
        }
      }

      const horizontalMargin = fuzzRange + 16;
      const verticalMargin = 0;
      canvas.width = offscreenWidth + horizontalMargin * 2;
      canvas.height = tightHeight + verticalMargin * 2;
      ctx.translate(horizontalMargin, verticalMargin);

      const interactiveLeft = horizontalMargin + xOffset;
      const interactiveTop = verticalMargin;
      const interactiveRight = interactiveLeft + textBoundingWidth;
      const interactiveBottom = interactiveTop + tightHeight;

      let isHovering = false;
      let isClicking = false;
      let isGlitching = false;
      let currentIntensity = baseIntensity;
      let targetIntensity = baseIntensity;
      let lastFrameTime = 0;
      const frameDuration = 1000 / fps;

      const startGlitchLoop = () => {
        if (!glitchMode || isCancelled) return;
        glitchTimeoutId = setTimeout(() => {
          if (isCancelled) return;
          isGlitching = true;
          glitchEndTimeoutId = setTimeout(() => {
            isGlitching = false;
            startGlitchLoop();
          }, glitchDuration);
        }, glitchInterval);
      };

      if (glitchMode) startGlitchLoop();

      const run = (timestamp: number) => {
        if (isCancelled) return;

        if (timestamp - lastFrameTime < frameDuration) {
          animationFrameId = window.requestAnimationFrame(run);
          return;
        }
        lastFrameTime = timestamp;

        ctx.clearRect(
          -horizontalMargin,
          -fuzzRange - 10,
          offscreenWidth + 2 * horizontalMargin,
          tightHeight + 2 * (fuzzRange + 10)
        );

        if (isClicking) {
          targetIntensity = 1;
        } else if (isGlitching) {
          targetIntensity = 1;
        } else if (isHovering) {
          targetIntensity = hoverIntensity;
        } else {
          targetIntensity = baseIntensity;
        }

        if (transitionDuration > 0) {
          const step = 1 / (transitionDuration / frameDuration);
          if (currentIntensity < targetIntensity) {
            currentIntensity = Math.min(
              currentIntensity + step,
              targetIntensity
            );
          } else if (currentIntensity > targetIntensity) {
            currentIntensity = Math.max(
              currentIntensity - step,
              targetIntensity
            );
          }
        } else {
          currentIntensity = targetIntensity;
        }

        if (direction === 'horizontal') {
          // Horizontal: shift each row left/right
          for (let j = 0; j < tightHeight; j++) {
            const dx = Math.floor(
              currentIntensity * (Math.random() - 0.5) * fuzzRange
            );
            ctx.drawImage(
              offscreen,
              0,
              j,
              offscreenWidth,
              1,
              dx,
              j,
              offscreenWidth,
              1
            );
          }
        } else if (direction === 'vertical') {
          // Vertical: shift each column up/down
          for (let i = 0; i < offscreenWidth; i++) {
            const dy = Math.floor(
              currentIntensity * (Math.random() - 0.5) * fuzzRange
            );
            ctx.drawImage(
              offscreen,
              i,
              0,
              1,
              tightHeight,
              i,
              dy,
              1,
              tightHeight
            );
          }
        } else {
          // Both: shift horizontally, then vertically
          for (let j = 0; j < tightHeight; j++) {
            const dx = Math.floor(
              currentIntensity * (Math.random() - 0.5) * fuzzRange
            );
            ctx.drawImage(
              offscreen,
              0,
              j,
              offscreenWidth,
              1,
              dx,
              j,
              offscreenWidth,
              1
            );
          }
          const tempData = ctx.getImageData(
            0,
            0,
            offscreenWidth + fuzzRange,
            tightHeight + fuzzRange
          );
          ctx.clearRect(
            -horizontalMargin,
            -fuzzRange - 10,
            offscreenWidth + 2 * horizontalMargin,
            tightHeight + 2 * (fuzzRange + 10)
          );
          ctx.putImageData(tempData, 0, 0);
          for (let i = 0; i < offscreenWidth + fuzzRange; i++) {
            const dy = Math.floor(
              currentIntensity * (Math.random() - 0.5) * fuzzRange * 0.5
            );
            const colData = ctx.getImageData(i, 0, 1, tightHeight + fuzzRange);
            ctx.clearRect(i, -fuzzRange, 1, tightHeight + 2 * fuzzRange);
            ctx.putImageData(colData, i, dy);
          }
        }
        animationFrameId = window.requestAnimationFrame(run);
      };

      animationFrameId = window.requestAnimationFrame(run);

      const isInsideTextArea = (x: number, y: number) => {
        return (
          x >= interactiveLeft &&
          x <= interactiveRight &&
          y >= interactiveTop &&
          y <= interactiveBottom
        );
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!enableHover) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const inside = isInsideTextArea(x, y);
        isHovering = inside;
        if (inside && (enableHover || clickEffect)) {
          canvas.style.cursor = 'pointer';
        } else {
          canvas.style.cursor = 'default';
        }
      };

      const handleMouseLeave = () => {
        isHovering = false;
        canvas.style.cursor = 'default';
      };

      const handleClick = () => {
        if (!clickEffect) return;
        isClicking = true;
        clearTimeout(clickTimeoutId);
        clickTimeoutId = setTimeout(() => {
          isClicking = false;
        }, 150);
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (!enableHover) return;
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        isHovering = isInsideTextArea(x, y);
      };

      const handleTouchEnd = () => {
        isHovering = false;
      };

      if (enableHover) {
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseleave', handleMouseLeave);
        canvas.addEventListener('touchmove', handleTouchMove, {
          passive: false,
        });
        canvas.addEventListener('touchend', handleTouchEnd);
      }

      if (clickEffect) {
        canvas.addEventListener('click', handleClick);
      }

      const cleanup = () => {
        window.cancelAnimationFrame(animationFrameId);
        clearTimeout(glitchTimeoutId);
        clearTimeout(glitchEndTimeoutId);
        clearTimeout(clickTimeoutId);
        if (enableHover) {
          canvas.removeEventListener('mousemove', handleMouseMove);
          canvas.removeEventListener('mouseleave', handleMouseLeave);
          canvas.removeEventListener('touchmove', handleTouchMove);
          canvas.removeEventListener('touchend', handleTouchEnd);
        }
        if (clickEffect) {
          canvas.removeEventListener('click', handleClick);
        }
      };

      canvas.cleanupFuzzyText = cleanup;
    };

    init();

    return () => {
      isCancelled = true;
      window.cancelAnimationFrame(animationFrameId);
      clearTimeout(glitchTimeoutId);
      clearTimeout(glitchEndTimeoutId);
      clearTimeout(clickTimeoutId);
      if (canvas && canvas.cleanupFuzzyText) {
        canvas.cleanupFuzzyText();
      }
    };
  }, [
    children,
    fontSize,
    fontWeight,
    fontFamily,
    color,
    enableHover,
    baseIntensity,
    hoverIntensity,
    fuzzRange,
    fps,
    direction,
    transitionDuration,
    clickEffect,
    glitchMode,
    glitchInterval,
    glitchDuration,
    gradient,
    letterSpacing,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        display: 'block',
        ...style,
      }}
    />
  );
}
