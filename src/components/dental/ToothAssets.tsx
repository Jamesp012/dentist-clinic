import React from 'react';

// Common styles for realistic teeth
export const TOOTH_STYLE = {
  fill: "#FDFBF7", // Slightly creamy white
  stroke: "#E2D9CE",
  strokeWidth: 1,
  filter: "drop-shadow(0px 2px 2px rgba(0,0,0,0.1))"
};

export const TOOTH_SHADOW = "inset 0 0 10px rgba(139, 69, 19, 0.1)";

// Helper to get tooth type from ID (Universal System)
export const getToothType = (id: number): 'molar' | 'premolar' | 'canine' | 'incisor' => {
  // Molars: 1,2,3, 14,15,16, 17,18,19, 30,31,32
  if ([1, 2, 3, 14, 15, 16, 17, 18, 19, 30, 31, 32].includes(id)) return 'molar';
  // Premolars: 4,5, 12,13, 20,21, 28,29
  if ([4, 5, 12, 13, 20, 21, 28, 29].includes(id)) return 'premolar';
  // Canines: 6, 11, 22, 27
  if ([6, 11, 22, 27].includes(id)) return 'canine';
  // Incisors: 7,8,9,10, 23,24,25,26
  return 'incisor';
};

interface ToothAssetProps extends React.SVGProps<SVGElement> {
  fill?: string;
  stroke?: string;
  strokeWidth?: number | string;
  strokeDasharray?: string;
}

// More detailed Occlusal Paths (Paths that look like the biting surface)
// Viewbox 0 0 100 100
export const RealisticOcclusal = ({ type, ...props }: { type: string } & ToothAssetProps) => {
  const commonProps = {
    fill: props.fill || "#FDFBF7",
    stroke: props.stroke || "#8B5C2A", // darker brown for more contrast
    strokeWidth: props.strokeWidth ? Number(props.strokeWidth) + 1.5 : 3.5, // make lines bolder
    strokeDasharray: props.strokeDasharray
  };

  switch (type) {
    case 'molar':
      return (
        <g>
          <path d="M10,30 Q10,10 30,5 Q70,5 90,30 Q95,50 90,70 Q70,95 30,95 Q10,70 10,30 Z" {...commonProps} />
          {/* Grooves - only show if not missing (dashed) to avoid clutter? Or keep simple */}
          {props.strokeDasharray ? null : (
             <path d="M20,30 Q50,50 80,30 M50,50 L50,85 M20,70 Q50,50 80,70" fill="none" stroke="#8B5C2A" strokeWidth="3.5" strokeLinecap="round" />
          )}
          {props.strokeDasharray ? null : (
             <circle cx="50" cy="50" r="15" fill="url(#toothGradient)" opacity="0.3" />
          )}
        </g>
      );
    case 'premolar':
      return (
        <g>
          <ellipse cx="50" cy="50" rx="35" ry="40" {...commonProps} />
          {props.strokeDasharray ? null : (
             <path d="M20,50 Q50,20 80,50 Q50,80 20,50 Z" fill="none" stroke="#8B5C2A" strokeWidth="3.5" strokeLinecap="round" />
          )}
          {props.strokeDasharray ? null : (
             <path d="M30,50 L70,50" fill="none" stroke="#8B5C2A" strokeWidth="3.5" strokeLinecap="round" />
          )}
        </g>
      );
    case 'canine':
      return (
        <g>
           <path d="M20,50 Q50,10 80,50 Q50,90 20,50 Z" {...commonProps} />
           {props.strokeDasharray ? null : (
              <circle cx="50" cy="50" r="5" fill="#8B5C2A" opacity="0.5" />
           )}
        </g>
      );
    case 'incisor':
    default:
      return (
        <g>
           <rect x="10" y="30" width="80" height="40" rx="10" {...commonProps} />
           {props.strokeDasharray ? null : (
              <path d="M15,50 L85,50" fill="none" stroke="#8B5C2A" strokeWidth="2.5" opacity="0.7" />
           )}
        </g>
      );
  }
};

// More detailed Root/Buccal Paths
// Viewbox 0 0 100 150 (Taller for roots)
export const RealisticBuccal = ({ type, ...props }: { type: string } & ToothAssetProps) => {
  const commonProps = {
    fill: props.fill || "#FDFBF7",
    stroke: props.stroke || "#D1C4B0",
    strokeWidth: props.strokeWidth || "2",
    strokeDasharray: props.strokeDasharray
  };

  const rootFill = props.fill === 'none' ? 'none' : "#F8F5F0";

  switch (type) {
    case 'molar':
      return (
        <g>
          {/* Crown */}
          <path d="M10,100 Q10,80 20,75 L80,75 Q90,80 90,100 Q90,140 50,145 Q10,140 10,100 Z" {...commonProps} />
          {/* Roots (Upper - Pointing UP usually, but here we draw them pointing UP relative to crown at bottom) */}
          <path d="M20,75 Q15,40 25,5 Q40,40 45,75" {...commonProps} fill={rootFill} />
          <path d="M55,75 Q60,40 75,5 Q85,40 80,75" {...commonProps} fill={rootFill} />
          {props.strokeDasharray ? null : (
             <path d="M40,75 Q50,30 60,75" fill="#F3EEE6" stroke="#D1C4B0" strokeWidth="1" /> /* Palatal root hint */
          )}
        </g>
      );
    case 'premolar':
      return (
        <g>
          <path d="M20,100 Q20,80 30,75 L70,75 Q80,80 80,100 Q80,140 50,145 Q20,140 20,100 Z" {...commonProps} />
          <path d="M30,75 Q30,40 50,5 Q70,40 70,75" {...commonProps} fill={rootFill} />
        </g>
      );
    case 'canine':
      return (
        <g>
          <path d="M25,100 L30,75 L70,75 L75,100 Q50,150 25,100 Z" {...commonProps} />
          <path d="M30,75 Q30,40 50,2 Q70,40 70,75" {...commonProps} fill={rootFill} />
        </g>
      );
    case 'incisor':
    default:
      return (
        <g>
          <path d="M25,100 L30,80 L70,80 L75,100 Q50,130 25,100 Z" {...commonProps} />
          <path d="M30,80 Q35,40 50,5 Q65,40 70,80" {...commonProps} fill={rootFill} />
        </g>
      );
  }
};
