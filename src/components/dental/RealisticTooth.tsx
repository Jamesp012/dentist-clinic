import React from 'react';
import { cn } from '../../lib/utils';
import { 
  getToothType, 
  RealisticOcclusal, 
  RealisticBuccal 
} from './ToothAssets';
import { ToothData, Surface, Condition } from '../Tooth';

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
  view 
}: RealisticToothProps) {
  const type = getToothType(id);
  const isUpper = id >= 1 && id <= 16;
  
  // Determine rotation/transform based on position and view
  const getTransform = () => {
    if (view === 'buccal') {
      // Upper Buccal (Row 1): Roots UP. SVG is drawn Roots UP. No rotation.
      // Lower Buccal (Row 4): Roots DOWN. SVG is drawn Roots UP. Rotate 180.
      return isUpper ? '' : 'rotate(180)';
    } else {
      // Occlusal views
      // Usually mirrored. Let's just rotate 180 for lower to match orientation
      return isUpper ? '' : 'rotate(180)';
    }
  };

  const isMissing = data.generalCondition === 'missing';
  const condition = data.generalCondition;

  // Determine fill color based on condition
  const getToothFill = () => {
    if (isMissing) return 'none';
    if (condition === 'amalgam') return '#8B8B8B'; // Silver/grey
    if (condition === 'composite') return '#F5EFE0'; // Tooth-colored
    if (condition === 'crown') return '#FFD700'; // Gold
    if (condition === 'discolored') return '#D4C5A9'; // Yellowish
    if (condition === 'stained') return '#C4B5A0'; // Brownish stain
    if (condition === 'non_vital') return '#E5E5E5'; // Greyish dead tooth
    return '#FDFBF7'; // Natural tooth color
  };

  // Determine stroke style
  const getStrokeProps = () => {
    if (isMissing) {
      return {
        stroke: data.isPermanent ? '#000000' : '#D1D5DB',
        strokeDasharray: '4 4',
        strokeWidth: 2
      };
    }
    return {
      stroke: data.isPermanent ? '#000000' : '#D1D5DB', // Black for permanent, light grey for temporary
      strokeWidth: 1
    };
  };

  const strokeProps = getStrokeProps();
  const toothFill = getToothFill();

  return (
    <div 
      className={cn(
        "group relative cursor-pointer transition-transform duration-200 select-none",
        isSelected && "z-10",
        view === 'buccal' ? "h-24 w-10" : "h-14 w-10", // Taller for roots
        "flex items-center justify-center"
      )}
      onClick={() => onToothClick(id)}
    >
      {/* Tooltip for Notes */}
      {data.notes && (
        <div className={cn(
          "absolute left-1/2 -translate-x-1/2 px-3 py-2 bg-slate-900/95 text-white text-xs rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[100] w-max max-w-[180px] text-center backdrop-blur-sm",
          // Position logic: Always show tooltip above
          "bottom-full mb-2"
        )}>
          {data.notes}
          {/* Arrow */}
          <div className={cn(
            "absolute left-1/2 -translate-x-1/2 border-4 border-transparent",
            "top-full border-t-slate-900/95"
          )} />
        </div>
      )}

      {/* SVG Container */}
      <svg 
        viewBox={view === 'buccal' ? "0 0 100 150" : "0 0 100 100"} 
        className={cn(
          "w-full h-full transition-all", 
          !isMissing && "drop-shadow-sm hover:drop-shadow-md"
        )}
        style={{ transform: getTransform() }}
      >
        <defs>
          <radialGradient id={`toothGradient-${id}`} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#E6DCCA" stopOpacity="0.2" />
          </radialGradient>
          
          {/* Pattern for caries/decay */}
          <pattern id={`cariesPattern-${id}`} patternUnits="userSpaceOnUse" width="8" height="8">
            <rect width="8" height="8" fill="#6B7280" opacity="0.3"/>
            <circle cx="2" cy="2" r="1" fill="#4B5563" opacity="0.5"/>
            <circle cx="6" cy="6" r="1" fill="#4B5563" opacity="0.5"/>
          </pattern>
        </defs>

        <g className={cn(isMissing && "opacity-40")}>
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
        </g>

        {/* Condition-specific overlays */}
        {!isMissing && (
          <>
            {/* Caries: Show a hole/cavity */}
            {condition === 'caries' && view === 'occlusal' && (
              <>
                {/* Dark cavity hole in center */}
                <ellipse 
                  cx="50" cy="50" rx="20" ry="15" 
                  fill="#1F2937"
                  className="transition-all duration-300"
                />
                {/* Decayed area around the hole */}
                <ellipse 
                  cx="50" cy="50" rx="28" ry="22" 
                  fill={`url(#cariesPattern-${id})`}
                  opacity="0.6"
                  className="transition-all duration-300"
                />
              </>
            )}
            
            {/* Caries on buccal view: show grey decay */}
            {condition === 'caries' && view === 'buccal' && (
              <rect 
                x="25" y={isUpper ? "20" : "80"} width="50" height="30" 
                fill={`url(#cariesPattern-${id})`}
                opacity="0.5"
                className="transition-all duration-300"
              />
            )}

            {/* Broken tooth: Show jagged break line */}
            {condition === 'broken' && view === 'buccal' && (
              <>
                <path 
                  d={`M20,${isUpper ? '60' : '90'} L30,${isUpper ? '55' : '85'} L40,${isUpper ? '65' : '95'} L50,${isUpper ? '58' : '88'} L60,${isUpper ? '68' : '98'} L70,${isUpper ? '62' : '92'} L80,${isUpper ? '60' : '90'}`}
                  stroke="#DC2626"
                  strokeWidth="2"
                  fill="none"
                />
                {/* Show missing part */}
                <rect 
                  x="20" y={isUpper ? "60" : "0"} 
                  width="60" 
                  height={isUpper ? "40" : "90"}
                  fill="white"
                  opacity="0.8"
                />
              </>
            )}

            {/* Cracked tooth: Show crack lines */}
            {condition === 'cracked' && (
              <>
                <path 
                  d={view === 'occlusal' 
                    ? "M50,20 Q48,40 50,50 Q52,60 48,80"
                    : "M50,10 Q48,50 50,80 Q52,110 48,140"
                  }
                  stroke="#4B5563"
                  strokeWidth="1.5"
                  fill="none"
                  opacity="0.7"
                />
                <path 
                  d={view === 'occlusal'
                    ? "M30,30 Q45,45 60,35"
                    : "M30,40 Q50,60 70,45"
                  }
                  stroke="#4B5563"
                  strokeWidth="1"
                  fill="none"
                  opacity="0.5"
                />
              </>
            )}

            {/* Chipped tooth: Small chip on edge */}
            {condition === 'chipped' && view === 'buccal' && (
              <path 
                d={`M${isUpper ? '35,10' : '35,140'} L${isUpper ? '40,5' : '40,145'} L${isUpper ? '45,10' : '45,140'} Z`}
                fill="white"
                stroke="#D1C4B0"
                strokeWidth="1"
              />
            )}

            {/* Abscess: Red swollen area */}
            {condition === 'abscess' && view === 'buccal' && (
              <ellipse 
                cx="30" 
                cy={isUpper ? "120" : "30"} 
                rx="20" 
                ry="15" 
                fill="#EF4444"
                opacity="0.4"
                className="transition-all duration-300"
              />
            )}

            {/* Erosion: Worn surface */}
            {condition === 'erosion' && view === 'occlusal' && (
              <ellipse 
                cx="50" cy="50" rx="25" ry="20" 
                fill="#9CA3AF"
                opacity="0.4"
                className="transition-all duration-300"
              />
            )}

            {/* Impacted: Tilted/rotated appearance */}
            {condition === 'impacted' && view === 'buccal' && (
              <line 
                x1="10" y1={isUpper ? "30" : "120"} 
                x2="90" y2={isUpper ? "50" : "100"}
                stroke="#F59E0B"
                strokeWidth="2"
                strokeDasharray="5 3"
                opacity="0.6"
              />
            )}

            {/* Retained root: Only show root portion */}
            {condition === 'retained_root' && view === 'buccal' && (
              <rect 
                x="20" 
                y={isUpper ? "0" : "80"}
                width="60" 
                height={isUpper ? "60" : "70"}
                fill="white"
                opacity="0.9"
              />
            )}

            {/* Needs filling: Yellow/orange warning indicator */}
            {condition === 'needs_filling' && view === 'occlusal' && (
              <ellipse 
                cx="50" cy="50" rx="15" ry="12" 
                fill="#F59E0B"
                opacity="0.5"
                className="transition-all duration-300"
              />
            )}

            {/* Needs root canal: Red center indicator */}
            {condition === 'needs_root_canal' && view === 'buccal' && (
              <line 
                x1="50" 
                y1={isUpper ? "60" : "40"}
                x2="50" 
                y2={isUpper ? "140" : "110"}
                stroke="#DC2626"
                strokeWidth="3"
                opacity="0.6"
              />
            )}

            {/* Needs extraction: Orange X mark */}
            {condition === 'needs_extraction' && (
              <>
                <line 
                  x1="20" y1="20" 
                  x2="80" y2={view === 'buccal' ? "80" : "80"} 
                  stroke="#F59E0B" 
                  strokeWidth="3"
                  opacity="0.7"
                />
                <line 
                  x1="80" y1="20" 
                  x2="20" y2={view === 'buccal' ? "80" : "80"} 
                  stroke="#F59E0B" 
                  strokeWidth="3"
                  opacity="0.7"
                />
              </>
            )}

            {/* Extraction: Show red X mark (already exists but keeping for reference) */}
            {condition === 'extraction' && (
              <>
                <line 
                  x1="20" y1="20" 
                  x2="80" y2={view === 'buccal' ? "80" : "80"} 
                  stroke="#EF4444" 
                  strokeWidth="3"
                  opacity="0.7"
                />
                <line 
                  x1="80" y1="20" 
                  x2="20" y2={view === 'buccal' ? "80" : "80"} 
                  stroke="#EF4444" 
                  strokeWidth="3"
                  opacity="0.7"
                />
              </>
            )}

            {/* Crown: Add shine/reflection effect */}
            {condition === 'crown' && (
              <ellipse 
                cx="40" cy={view === 'buccal' ? "40" : "35"} 
                rx="15" ry="20" 
                fill="white" 
                opacity="0.4"
                className="transition-all duration-300"
              />
            )}

            {/* Amalgam: Add metallic sheen */}
            {condition === 'amalgam' && view === 'occlusal' && (
              <ellipse 
                cx="50" cy="50" rx="18" ry="14" 
                fill="#B8B8B8"
                opacity="0.8"
                className="transition-all duration-300"
              />
            )}

            {/* Composite: Slightly different shade in center */}
            {condition === 'composite' && view === 'occlusal' && (
              <ellipse 
                cx="50" cy="50" rx="16" ry="12" 
                fill="#E8DCC8"
                opacity="0.6"
                className="transition-all duration-300"
              />
            )}

            {/* Loose tooth: Dotted outline to indicate mobility */}
            {condition === 'loose' && (
              <rect 
                x="15" y="15" 
                width="70" 
                height={view === 'buccal' ? "120" : "70"}
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2"
                strokeDasharray="3 3"
                opacity="0.5"
              />
            )}
          </>
        )}
      </svg>
    </div>
  );
}