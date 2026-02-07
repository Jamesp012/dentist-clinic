import React from 'react';

// Modern clinical style constants
export const TOOTH_STYLE = {
  fill: "rgba(255, 255, 255, 0.9)",
  stroke: "rgba(0, 0, 0, 0.1)",
  strokeWidth: 1,
};

export const getToothType = (id: number | string): 'molar' | 'premolar' | 'canine' | 'incisor' => {
  const numId = typeof id === 'number' ? id : parseInt(id as string);
  
  if (!isNaN(numId)) {
    if ([1, 2, 3, 14, 15, 16, 17, 18, 19, 30, 31, 32].includes(numId)) return 'molar';
    if ([4, 5, 12, 13, 20, 21, 28, 29].includes(numId)) return 'premolar';
    if ([6, 11, 22, 27].includes(numId)) return 'canine';
    return 'incisor';
  } else {
    const letter = (id as string).toUpperCase();
    if (['A', 'B', 'I', 'J', 'K', 'L', 'S', 'T'].includes(letter)) return 'molar';
    if (['C', 'H', 'M', 'R'].includes(letter)) return 'canine';
    return 'incisor';
  }
};

interface ToothAssetProps extends React.SVGProps<SVGElement> {
  fill?: string;
  stroke?: string;
  strokeWidth?: number | string;
  strokeDasharray?: string;
}

export const RealisticOcclusal = ({ type, ...props }: { type: string } & ToothAssetProps) => {
  const commonProps = {
    fill: props.fill,
    stroke: props.stroke,
    strokeWidth: props.strokeWidth,
    strokeDasharray: props.strokeDasharray
  };

  switch (type) {
    case 'molar':
      return (
        <g>
          {/* Main Body */}
          <path d="M15,30 C15,10 30,5 50,5 C70,5 85,10 85,30 C85,50 90,70 80,85 C70,95 30,95 20,85 C10,70 15,50 15,30 Z" {...commonProps} />
          {/* Inner Depth / Occlusal Pattern */}
          {!props.strokeDasharray && (
            <>
              <path d="M25,35 Q50,45 75,35 M50,45 L50,80 M30,75 Q50,65 70,75" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="2" strokeLinecap="round" />
              <path d="M50,45 L50,15 M25,35 L10,25 M75,35 L90,25" fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth="1.5" strokeLinecap="round" />
            </>
          )}
        </g>
      );
    case 'premolar':
      return (
        <g>
          <ellipse cx="50" cy="50" rx="35" ry="40" {...commonProps} />
          {!props.strokeDasharray && (
            <path d="M30,50 Q50,55 70,50" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="2" strokeLinecap="round" />
          )}
        </g>
      );
    case 'canine':
      return (
        <g>
           <path d="M25,50 C25,20 50,5 50,5 C50,5 75,20 75,50 C75,80 50,95 50,95 C50,95 25,80 25,50 Z" {...commonProps} />
           {!props.strokeDasharray && (
              <circle cx="50" cy="50" r="4" fill="rgba(0,0,0,0.05)" />
           )}
        </g>
      );
    case 'incisor':
    default:
      return (
        <g>
           <path d="M15,40 C15,30 30,25 50,25 C70,25 85,30 85,40 L85,60 C85,75 70,80 50,80 C30,80 15,75 15,60 Z" {...commonProps} />
           {!props.strokeDasharray && (
              <line x1="20" y1="50" x2="80" y2="50" stroke="rgba(0,0,0,0.03)" strokeWidth="1" />
           )}
        </g>
      );
  }
};

export const RealisticBuccal = ({ type, ...props }: { type: string } & ToothAssetProps) => {
  const commonProps = {
    fill: props.fill,
    stroke: props.stroke,
    strokeWidth: props.strokeWidth,
    strokeDasharray: props.strokeDasharray
  };

  switch (type) {
    case 'molar':
      return (
        <g>
          <path d="M15,80 Q15,60 25,55 L75,55 Q85,60 85,80 Q85,120 50,130 Q15,120 15,80 Z" {...commonProps} />
          <path d="M25,55 Q20,30 30,5 Q40,30 45,55" {...commonProps} />
          <path d="M55,55 Q60,30 70,5 Q80,30 75,55" {...commonProps} />
        </g>
      );
    default:
      return (
        <g>
          <path d="M25,80 L30,60 L70,60 L75,80 Q50,110 25,80 Z" {...commonProps} />
          <path d="M30,60 Q35,30 50,5 Q65,30 70,60" {...commonProps} />
        </g>
      );
  }
};
