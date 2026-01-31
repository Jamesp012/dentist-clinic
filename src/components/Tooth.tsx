import React from 'react';
import { cn } from '../lib/utils';

export type Surface = 'occlusal' | 'mesial' | 'distal' | 'buccal' | 'lingual';
export type Condition = 
  | 'healthy' 
  | 'caries' 
  | 'amalgam' 
  | 'composite' 
  | 'crown' 
  | 'missing' 
  | 'extraction'
  | 'broken'
  | 'cracked'
  | 'chipped'
  | 'loose'
  | 'impacted'
  | 'retained_root'
  | 'abscess'
  | 'non_vital'
  | 'erosion'
  | 'discolored'
  | 'stained'
  | 'needs_filling'
  | 'needs_root_canal'
  | 'needs_extraction';

export interface ToothData {
  id: number;
  surfaces: Record<Surface, Condition>;
  generalCondition: Condition;
  isPermanent: boolean; // true = permanent (black outline), false = temporary (light grey outline)
  notes?: string;
}

interface ToothProps {
  id: number;
  data: ToothData;
  isSelected: boolean;
  onSurfaceClick: (id: number, surface: Surface) => void;
  onToothClick: (id: number) => void;
}

const CONDITION_COLORS: Record<Condition, string> = {
  healthy: 'fill-white',
  caries: 'fill-red-400',
  amalgam: 'fill-slate-400',
  composite: 'fill-amber-100',
  crown: 'fill-yellow-400',
  missing: 'fill-transparent opacity-20',
  extraction: 'fill-slate-200'
};

export function Tooth({ id, data, isSelected, onSurfaceClick, onToothClick }: ToothProps) {
  const isUpper = id >= 1 && id <= 16;
  
  // Universal Numbering System Logic for Surfaces
  // 1-8: Right Upper (Mesial is Left side of tooth visually)
  // 9-16: Left Upper (Mesial is Right side of tooth visually)
  // 17-24: Left Lower (Mesial is Right side of tooth visually)
  // 25-32: Right Lower (Mesial is Left side of tooth visually)
  
  // Simplified visual mapping for the "Box" representation
  // Top = Buccal (Upper), Lingual (Lower)
  // Bottom = Lingual (Upper), Buccal (Lower)
  // Center = Occlusal
  // Left = Distal (1-8, 25-32), Mesial (9-16, 17-24) -- Wait, let's just stick to absolute positions for the click handler
  // and let the parent component interpret "Left" vs "Mesial" if needed.
  // actually, let's just pass 'top', 'bottom', 'left', 'right', 'center' and map them to dental terms in the parent or here.
  
  // To keep it simple for this demo, I will map them directly here assuming standard view:
  // Top: Buccal (Upper), Lingual (Lower)
  // Bottom: Lingual (Upper), Buccal (Lower)
  // Left: Distal (Right side of mouth), Mesial (Left side of mouth)
  // Right: Mesial (Right side of mouth), Distal (Left side of mouth)
  
  const getSurfaceColor = (surface: Surface) => {
    if (data.generalCondition === 'missing') return 'fill-slate-100';
    return CONDITION_COLORS[data.surfaces[surface]] || 'fill-white hover:fill-blue-50';
  };

  // Map visual zones to dental surfaces based on quadrant
  const getSurfaceFromZone = (zone: 'top' | 'bottom' | 'left' | 'right' | 'center'): Surface => {
    if (zone === 'center') return 'occlusal';
    
    // Upper Arch (1-16)
    if (id <= 16) {
      if (zone === 'top') return 'buccal';
      if (zone === 'bottom') return 'lingual';
      // Right Upper (1-8)
      if (id <= 8) {
        return zone === 'right' ? 'mesial' : 'distal';
      }
      // Left Upper (9-16)
      return zone === 'left' ? 'mesial' : 'distal';
    } 
    // Lower Arch (17-32)
    else {
      if (zone === 'top') return 'lingual';
      if (zone === 'bottom') return 'buccal';
      // Left Lower (17-24)
      if (id <= 24) {
        return zone === 'left' ? 'mesial' : 'distal';
      }
      // Right Lower (25-32)
      return zone === 'right' ? 'mesial' : 'distal';
    }
  };

  const handleZoneClick = (e: React.MouseEvent, zone: 'top' | 'bottom' | 'left' | 'right' | 'center') => {
    e.stopPropagation();
    onSurfaceClick(id, getSurfaceFromZone(zone));
  };

  // Paths for a standardized "Dental Map" representation
  // 100x100 SVG coordinate system
  
  return (
    <div 
      className={cn(
        "flex flex-col items-center gap-1 p-1 rounded-md transition-all",
        isSelected ? "bg-blue-100 ring-2 ring-blue-500" : "hover:bg-slate-100"
      )}
      onClick={() => onToothClick(id)}
    >
      <span className="text-xs font-bold text-slate-500">{id}</span>
      <svg viewBox="0 0 100 100" className="w-12 h-12 drop-shadow-sm">
        {/* Missing X Overlay if needed, but we treat it as state */}
        
        {/* Top Trapezoid */}
        <path 
          d="M0,0 L100,0 L80,20 L20,20 Z" 
          className={cn("stroke-slate-300 stroke-1 transition-colors cursor-pointer", getSurfaceColor(getSurfaceFromZone('top')))}
          onClick={(e) => handleZoneClick(e, 'top')}
        />
        
        {/* Bottom Trapezoid */}
        <path 
          d="M20,80 L80,80 L100,100 L0,100 Z" 
          className={cn("stroke-slate-300 stroke-1 transition-colors cursor-pointer", getSurfaceColor(getSurfaceFromZone('bottom')))}
          onClick={(e) => handleZoneClick(e, 'bottom')}
        />

        {/* Left Trapezoid */}
        <path 
          d="M0,0 L20,20 L20,80 L0,100 Z" 
          className={cn("stroke-slate-300 stroke-1 transition-colors cursor-pointer", getSurfaceColor(getSurfaceFromZone('left')))}
          onClick={(e) => handleZoneClick(e, 'left')}
        />

        {/* Right Trapezoid */}
        <path 
          d="M80,20 L100,0 L100,100 L80,80 Z" 
          className={cn("stroke-slate-300 stroke-1 transition-colors cursor-pointer", getSurfaceColor(getSurfaceFromZone('right')))}
          onClick={(e) => handleZoneClick(e, 'right')}
        />

        {/* Center Square */}
        <rect 
          x="20" y="20" width="60" height="60" 
          className={cn("stroke-slate-300 stroke-1 transition-colors cursor-pointer", getSurfaceColor('occlusal'))}
          onClick={(e) => handleZoneClick(e, 'center')}
        />
        
        {data.generalCondition === 'missing' && (
           <path d="M0,0 L100,100 M100,0 L0,100" stroke="red" strokeWidth="2" />
        )}
      </svg>
    </div>
  );
}