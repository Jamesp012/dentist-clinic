import React, { useRef, useState } from 'react';
import Moveable from 'react-moveable';
import { cn } from '@/lib/utils';
import { 
  getToothType, 
  RealisticOcclusal, 
  RealisticBuccal 
} from './ToothAssets';
import { ToothData } from '../Tooth';

interface RealisticToothProps {
  id: number | string;
  data: ToothData;
  isSelected: boolean;
  isGumSelected?: boolean;
  onToothClick: (id: number | string) => void;
  view: 'buccal' | 'occlusal';
  rotation?: number;
  scale?: number;
  labelOffset?: { x: number; y: number };
}

export function RealisticTooth({ 
  id, 
  data, 
  isSelected, 
  onToothClick, 
  view,
  rotation: externalRotation,
  scale: externalScale = 1,
  labelOffset = { x: 0, y: 0 }
}: RealisticToothProps) {
  const targetRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');
  const [isShapeEditMode, setIsShapeEditMode] = useState(false);

  const type = getToothType(id);
  
  const isUpper = typeof id === 'number' 
    ? id >= 1 && id <= 16 
    : (id as string).toUpperCase() >= 'A' && (id as string).toUpperCase() <= 'J';

  const isMissing = data.generalCondition === 'missing';
  const condition = data.generalCondition;

  const getToothFill = () => {
    if (isMissing) return 'none';
    if (condition === 'amalgam') return 'url(#amalgamGradient)'; 
    if (condition === 'composite') return '#F8F9FA';
    if (condition === 'crown') return 'url(#crownGradient)';
    if (condition === 'discolored') return '#F3E5D0';
    return 'url(#glassBaseGradient)'; 
  };

  const getStrokeProps = () => {
    if (isMissing) {
      return {
        stroke: 'rgba(0,0,0,0.6)',
        strokeDasharray: '3 3',
        strokeWidth: 2
      };
    }
    return {
      stroke: isSelected ? '#0EA5E9' : 'rgba(0,0,0,0.8)',
      strokeWidth: isSelected ? 2.5 : 1.8
    };
  };

  const strokeProps = getStrokeProps();
  const toothFill = getToothFill();

  const getSvgTransform = () => {
    if (externalRotation !== undefined) {
      return `rotate(${externalRotation}deg) scale(${externalScale})`;
    }
    return isUpper ? `scale(${externalScale})` : `rotate(180deg) scale(${externalScale})`;
  };

  return (
    <>
      <div 
        ref={targetRef}
        className={cn(
          "group relative cursor-move transition-none select-none",
          isSelected && "z-30 drop-shadow-2xl",
          "w-full h-full flex items-center justify-center"
        )}
        onClick={() => onToothClick(id)}
        style={{
          transform: transform,
        }}
      >
        {/* Tooth Number/Letter Label */}
        <div 
          className={cn(
            "absolute text-[11px] font-black pointer-events-none transition-all duration-300 tracking-tighter z-50",
            isSelected ? "text-sky-500 scale-150 drop-shadow-md" : "text-slate-300"
          )}
          style={{ 
            left: '50%', 
            top: '50%', 
            transform: `translate(calc(-50% + ${labelOffset.x}px), calc(-50% + ${labelOffset.y}px))` 
          }}
        >
          {id}
        </div>

        {/* Shape Edit Mode Toggle */}
        {isSelected && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsShapeEditMode(!isShapeEditMode);
            }}
            className={cn(
              "absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold transition-all z-50 shadow-lg",
              isShapeEditMode 
                ? "bg-sky-500 text-white" 
                : "bg-white text-slate-700 hover:bg-slate-100"
            )}
          >
            {isShapeEditMode ? "Done" : "Custom Shape"}
          </button>
        )}

        {/* Tooltip */}
        {data.notes && (
          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900/95 text-white text-[11px] rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-[100] w-max max-w-[180px] text-center backdrop-blur-xl border border-white/10">
            {data.notes}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900/95" />
          </div>
        )}

        {/* Glassmorphism SVG */}
        <svg 
          viewBox={view === 'buccal' ? "0 0 100 150" : "0 0 100 100"} 
          className={cn(
            "w-full h-full transition-transform duration-700", 
            !isMissing && "filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.08)]"
          )}
          style={{ transform: getSvgTransform() }}
        >
          <defs>
            {/* Frosted Glass Base */}
            <linearGradient id="glassBaseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.95)" />
              <stop offset="60%" stopColor="rgba(248, 250, 252, 0.85)" />
              <stop offset="100%" stopColor="rgba(241, 245, 249, 0.9)" />
            </linearGradient>

            {/* Depth Shading */}
            <radialGradient id="innerDepth" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(0,0,0,0.02)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>

            {/* Surface Reflection */}
            <linearGradient id="shineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0.8" />
              <stop offset="40%" stopColor="white" stopOpacity="0" />
            </linearGradient>

            {/* Condition Gradients */}
            <linearGradient id="crownGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
            
            <linearGradient id="amalgamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            <filter id="frostedBlur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" />
            </filter>
          </defs>

          <g className={cn(isMissing && "opacity-20")} filter={!isMissing ? "url(#frostedBlur)" : undefined}>
             {view === 'occlusal' ? (
               <RealisticOcclusal 
                 type={type} 
                 fill={toothFill}
                 {...strokeProps}
               />
             ) : (
               <RealisticBuccal 
                 type={type}
                 fill={toothFill}
                 {...strokeProps}
               />
             )}
             
             {/* Glass Layer Details */}
             {!isMissing && (
               <>
                 <path 
                   d={type === 'molar' ? "M20,30 Q50,15 80,30" : "M30,35 Q50,25 70,35"} 
                   fill="url(#shineGradient)" 
                   opacity="0.6"
                   pointerEvents="none"
                 />
                 <circle cx="50" cy="50" r="40" fill="url(#innerDepth)" pointerEvents="none" />
               </>
             )}
          </g>

          {/* Condition Markers */}
          {!isMissing && (
            <g pointerEvents="none">
              {condition === 'caries' && (
                <circle cx="50" cy="50" r="14" fill="rgba(15, 23, 42, 0.4)" filter="blur(3px)" />
              )}
              {(condition === 'extraction' || condition === 'needs_extraction') && (
                <g stroke={condition === 'extraction' ? '#EF4444' : '#F59E0B'} strokeWidth="4" strokeLinecap="round" opacity="0.8">
                  <line x1="25" y1="25" x2="75" y2="75" />
                  <line x1="75" y1="25" x2="25" y2="75" />
                </g>
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Moveable Component for Drag, Resize, Rotate, Reshape */}
      {isSelected && !isShapeEditMode && (
        <Moveable
          target={targetRef}
          draggable={true}
          resizable={true}
          rotatable={true}
          scalable={true}
          warpable={true}
          keepRatio={false}
          throttleDrag={0}
          throttleRotate={0}
          throttleResize={0}
          throttleScale={0}
          renderDirections={["nw", "n", "ne", "w", "e", "sw", "s", "se"]}
          origin={false}
          onDrag={({ target, transform }) => {
            target!.style.transform = transform;
          }}
          onDragEnd={({ target, lastEvent }) => {
            if (lastEvent) {
              setTransform(target!.style.transform);
            }
          }}
          onResize={({ target, width, height, drag }) => {
            target!.style.width = `${width}px`;
            target!.style.height = `${height}px`;
            target!.style.transform = drag.transform;
          }}
          onResizeEnd={({ target }) => {
            setTransform(target!.style.transform);
          }}
          onScale={({ target, transform }) => {
            target!.style.transform = transform;
          }}
          onScaleEnd={({ target }) => {
            setTransform(target!.style.transform);
          }}
          onRotate={({ target, transform }) => {
            target!.style.transform = transform;
          }}
          onRotateEnd={({ target }) => {
            setTransform(target!.style.transform);
          }}
          onWarp={({ target, transform }) => {
            target!.style.transform = transform;
          }}
          onWarpEnd={({ target }) => {
            setTransform(target!.style.transform);
          }}
        />
      )}
    </>
  );
}
