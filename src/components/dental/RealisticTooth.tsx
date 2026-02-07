import React, { useState } from 'react';
import Moveable from 'react-moveable';
import { cn } from '../../lib/utils';
import {
  getToothType,
  RealisticOcclusal,
  RealisticBuccal,
} from './ToothAssets';
import { ToothData } from '../Tooth';

interface RealisticToothProps {
  id: number;
  data: ToothData;
  isSelected: boolean;
  isGumSelected?: boolean;
  onToothClick: (id: number) => void;
  view: 'buccal' | 'occlusal';
}

export function RealisticTooth({
  id,
  data,
  isSelected,
  onToothClick,
  view,
}: RealisticToothProps) {
  const [transform, setTransform] = useState<string>('');

  const ref = React.useRef<HTMLDivElement | null>(null);

  const type = getToothType(id);
  const isUpper = id >= 1 && id <= 16;

  const isMissing = data.generalCondition === 'missing';
  const condition = data.generalCondition;

  const getToothFill = () => {
    if (isMissing) return 'none';
    if (condition === 'amalgam') return '#8B8B8B';
    if (condition === 'composite') return '#F5EFE0';
    if (condition === 'crown') return '#E5E7EB';
    if (condition === 'discolored') return '#D4C5A9';
    if (condition === 'stained') return '#C4B5A0';
    if (condition === 'non_vital') return '#E5E5E5';
    return 'url(#toothGradient)';
  };

  const getStrokeProps = () => {
    if (isMissing) {
      return {
        stroke: data.isPermanent ? '#0F172A' : '#CBD5F5',
        strokeDasharray: '4 4',
        strokeWidth: 2,
      };
    }
    return {
      stroke: data.isPermanent ? '#0F172A' : '#CBD5F5',
      strokeWidth: 1.5,
    };
  };

  const strokeProps = getStrokeProps();
  const toothFill = getToothFill();

  const baseRotation = view === 'buccal' ? (isUpper ? 0 : 180) : isUpper ? 0 : 180;

  return (
    <div
      ref={ref}
      className={cn(
        'relative group cursor-pointer select-none',
        isSelected && 'z-10',
        view === 'buccal' ? 'h-24 w-10' : 'h-14 w-10',
        'flex items-center justify-center',
      )}
      onClick={() => onToothClick(id)}
      style={{ transform }}
    >
      {data.notes && (
        <div
          className={cn(
            'pointer-events-none absolute left-1/2 bottom-full mb-2 w-max max-w-[180px] -translate-x-1/2 rounded-md bg-slate-900/95 px-3 py-2 text-xs text-white shadow-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100 backdrop-blur-sm z-[100]',
          )}
        >
          {data.notes}
          <div
            className={cn(
              'absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900/95',
            )}
          />
        </div>
      )}

      <div className="relative flex h-full w-full items-center justify-center">
        <svg
          viewBox={view === 'buccal' ? '0 0 100 150' : '0 0 100 100'}
          className={cn(
            'h-full w-full transition-all',
            !isMissing && 'drop-shadow-[0_0_15px_rgba(56,189,248,0.35)] group-hover:drop-shadow-[0_0_18px_rgba(56,189,248,0.65)]',
          )}
          style={{ transform: `rotate(${baseRotation}deg)` }}
        >
          <defs>
            <radialGradient id="toothGradient" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="35%" stopColor="#F7F2E9" stopOpacity="0.98" />
              <stop offset="100%" stopColor="#E5D6C2" stopOpacity="0.95" />
            </radialGradient>

            <filter id="toothShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feOffset dx="0" dy={isUpper ? 4 : -4} in="SourceAlpha" result="shadowOffset" />
              <feGaussianBlur in="shadowOffset" stdDeviation="3" result="shadowBlur" />
              <feColorMatrix
                in="shadowBlur"
                type="matrix"
                values="0 0 0 0 0   0 0 0 0 0.2   0 0 0 0 0.4  0 0 0 0.25 0"
                result="shadowColor"
              />
              <feMerge>
                <feMergeNode in="shadowColor" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <pattern id="cariesPattern" patternUnits="userSpaceOnUse" width="8" height="8">
              <rect width="8" height="8" fill="#4B5563" opacity="0.35" />
              <circle cx="2" cy="2" r="1" fill="#111827" opacity="0.7" />
              <circle cx="6" cy="6" r="1" fill="#111827" opacity="0.7" />
            </pattern>
          </defs>

          <g filter="url(#toothShadow)">
            {view === 'occlusal' ? (
              <RealisticOcclusal type={type} fill={toothFill} {...strokeProps} />
            ) : (
              <RealisticBuccal type={type} fill={toothFill} {...strokeProps} />
            )}
          </g>

          {!isMissing && (
            <>
              {condition === 'caries' && view === 'occlusal' && (
                <>
                  <ellipse
                    cx="50"
                    cy="48"
                    rx="18"
                    ry="13"
                    fill="#020617"
                    opacity="0.95"
                    className="transition-all duration-300"
                  />
                  <ellipse
                    cx="50"
                    cy="48"
                    rx="26"
                    ry="20"
                    fill="url(#cariesPattern)"
                    opacity="0.8"
                    className="transition-all duration-300"
                  />
                </>
              )}

              {condition === 'caries' && view === 'buccal' && (
                <rect
                  x="24"
                  y={isUpper ? '22' : '78'}
                  width="52"
                  height="34"
                  rx="10"
                  fill="url(#cariesPattern)"
                  opacity="0.9"
                  className="transition-all duration-300"
                />
              )}

              {condition === 'broken' && view === 'buccal' && (
                <>
                  <path
                    d={`M20,${isUpper ? '64' : '86'} L30,${
                      isUpper ? '58' : '92'
                    } L40,${isUpper ? '69' : '81'} L50,${
                      isUpper ? '60' : '90'
                    } L60,${isUpper ? '72' : '78'} L70,${
                      isUpper ? '66' : '84'
                    } L80,${isUpper ? '64' : '86'}`}
                    stroke="#EF4444"
                    strokeWidth="2.2"
                    fill="none"
                  />
                  <rect
                    x="20"
                    y={isUpper ? '64' : '0'}
                    width="60"
                    height={isUpper ? '44' : '86'}
                    fill="#F9FAFB"
                    opacity="0.92"
                  />
                </>
              )}

              {condition === 'cracked' && (
                <>
                  <path
                    d={
                      view === 'occlusal'
                        ? 'M50,18 Q48,40 52,52 Q49,64 51,82'
                        : 'M50,8 Q48,52 52,84 Q49,118 51,142'
                    }
                    stroke="#1F2937"
                    strokeWidth="1.6"
                    fill="none"
                    opacity="0.85"
                  />
                  <path
                    d={
                      view === 'occlusal'
                        ? 'M32,30 Q47,46 64,38'
                        : 'M32,42 Q50,62 70,48'
                    }
                    stroke="#4B5563"
                    strokeWidth="1.2"
                    fill="none"
                    opacity="0.75"
                  />
                </>
              )}

              {condition === 'chipped' && view === 'buccal' && (
                <path
                  d={`${isUpper ? 'M36,12 L42,5 L48,12' : 'M36,138 L42,145 L48,138'} Z`}
                  fill="#F9FAFB"
                  stroke="#D1C4B0"
                  strokeWidth="1"
                />
              )}

              {condition === 'abscess' && view === 'buccal' && (
                <ellipse
                  cx="30"
                  cy={isUpper ? '118' : '32'}
                  rx="22"
                  ry="16"
                  fill="#EF4444"
                  opacity="0.55"
                  className="transition-all duration-300"
                />
              )}

              {condition === 'erosion' && view === 'occlusal' && (
                <ellipse
                  cx="50"
                  cy="50"
                  rx="27"
                  ry="21"
                  fill="#9CA3AF"
                  opacity="0.45"
                  className="transition-all duration-300"
                />
              )}

              {condition === 'impacted' && view === 'buccal' && (
                <line
                  x1="10"
                  y1={isUpper ? '32' : '118'}
                  x2="90"
                  y2={isUpper ? '52' : '98'}
                  stroke="#F97316"
                  strokeWidth="2.3"
                  strokeDasharray="5 3"
                  opacity="0.75"
                />
              )}
            </>
          )}
        </svg>
      </div>

      {isSelected && ref.current && (
        <Moveable
          target={ref.current}
          draggable
          throttleDrag={0}
          onDrag={e => {
            setTransform(e.transform);
          }}
          keepRatio
          scalable={false}
          rotatable
          throttleRotate={0}
          onRotate={e => {
            setTransform(e.drag.transform);
          }}
          origin={false}
          edge={false}
          padding={{ left: 4, right: 4, top: 4, bottom: 4 }}
          hideDefaultLines={false}
          snappable={false}
          className="z-[60]"
        />
      )}
    </div>
  );
}