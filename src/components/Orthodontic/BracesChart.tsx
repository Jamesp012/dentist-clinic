import React from 'react';

interface Bracket {
  id: string;
  x?: number; // Optional as we calculate internally
  y?: number; // Optional as we calculate internally
  color: string;
}

interface BracesChartProps {
  upperBrackets: Bracket[];
  lowerBrackets: Bracket[];
  onBracketClick?: (id: string) => void;
}

export function BracesChart({ upperBrackets, lowerBrackets, onBracketClick }: BracesChartProps) {
  // Tooth dimensions and definitions
  // 14 teeth per row: 7 left, 7 right
  const teethDefs = [
    { type: 'molar', width: 34, height: 36, offsetY: -4 },
    { type: 'molar', width: 34, height: 38, offsetY: -2 },
    { type: 'premolar', width: 26, height: 40, offsetY: 0 },
    { type: 'premolar', width: 26, height: 42, offsetY: 0 },
    { type: 'canine', width: 28, height: 46, offsetY: 2 }, // Pointy/Longer
    { type: 'lateral', width: 26, height: 44, offsetY: 1 },
    { type: 'central', width: 32, height: 48, offsetY: 0 },
  ];

  // Generate layout
  const generateTeethLayout = (isUpper: boolean) => {
    const teeth = [];
    const midX = 260;
    const baseY = 145; // Contact plane
    
    // Right side (Indices 7-13)
    let currentX = midX;
    for (let i = 0; i < 7; i++) {
      const def = teethDefs[6 - i];
      const height = def.height;
      let y = isUpper ? baseY - height : baseY;
      
      teeth.push({
        ...def,
        x: currentX,
        y: y,
        index: 7 + i,
        rotate: 0,
      });
      currentX += def.width;
    }
    
    // Left side (Indices 6-0)
    currentX = midX;
    for (let i = 0; i < 7; i++) {
      const def = teethDefs[6 - i];
      currentX -= def.width;
      const height = def.height;
      let y = isUpper ? baseY - height : baseY;
      
      teeth.unshift({
        ...def,
        x: currentX,
        y: y,
        index: 6 - i,
        rotate: 0,
      });
    }
    
    return teeth;
  };

  const upperTeeth = generateTeethLayout(true);
  const lowerTeeth = generateTeethLayout(false);

  // Generate Scalloped Gum Path
  const generateGumPath = (teeth: any[], isUpper: boolean) => {
    if (teeth.length === 0) return '';

    const startX = teeth[0].x - 20;
    const deepY = isUpper ? 50 : 240;
    
    let path = `M ${startX} ${deepY}`; 

    teeth.forEach((tooth, i) => {
      const toothCenterX = tooth.x + tooth.width / 2;
      const toothTopY = tooth.y;
      
      const prevGapX = tooth.x;
      const nextGapX = tooth.x + tooth.width;
      
      const marginOffset = tooth.type === 'canine' ? 6 : 2;
      const marginY = isUpper ? tooth.y + marginOffset : tooth.y + tooth.height - marginOffset;
      
      const papillaOffset = 15;
      const papillaY = isUpper ? marginY + papillaOffset : marginY - papillaOffset;

      if (i === 0) {
        path += ` L ${prevGapX} ${papillaY}`;
      }

      path += ` Q ${toothCenterX} ${marginY - (isUpper ? 10 : -10)} ${nextGapX} ${papillaY}`;
    });

    const endX = teeth[teeth.length - 1].x + teeth[teeth.length - 1].width + 20;
    path += ` L ${endX} ${deepY} Z`;

    return path;
  };

  const upperGumPath = generateGumPath(upperTeeth, true);
  const lowerGumPath = generateGumPath(lowerTeeth, false);

  const createToothPath = (x: number, y: number, width: number, height: number, isUpper: boolean) => {
    const m = 1;
    const w = width - m * 2;
    const h = height;
    const startX = x + m;
    const startY = y;
    
    const radius = w * 0.45;
    const cornerRadius = 6;

    if (isUpper) {
      return `
        M ${startX} ${startY + h - cornerRadius}
        L ${startX} ${startY + radius}
        Q ${startX} ${startY}, ${startX + w / 2} ${startY}
        Q ${startX + w} ${startY}, ${startX + w} ${startY + radius}
        L ${startX + w} ${startY + h - cornerRadius}
        Q ${startX + w} ${startY + h}, ${startX + w - cornerRadius} ${startY + h}
        L ${startX + cornerRadius} ${startY + h}
        Q ${startX} ${startY + h}, ${startX} ${startY + h - cornerRadius}
        Z
      `;
    } else {
      return `
        M ${startX} ${startY + cornerRadius}
        L ${startX} ${startY + h - radius}
        Q ${startX} ${startY + h}, ${startX + w / 2} ${startY + h}
        Q ${startX + w} ${startY + h}, ${startX + w} ${startY + h - radius}
        L ${startX + w} ${startY + cornerRadius}
        Q ${startX + w} ${startY}, ${startX + w - cornerRadius} ${startY}
        L ${startX + cornerRadius} ${startY}
        Q ${startX} ${startY}, ${startX} ${startY + cornerRadius}
        Z
      `;
    }
  };

  const renderTeethRow = (teethData: any[], bracketsState: Bracket[], isUpper: boolean) => {
    const bracketY = isUpper ? 125 : 165;

    const points = teethData.map(t => ({
      x: t.x + t.width / 2,
      y: bracketY
    }));

    let wirePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        const prev = points[i-1];
        const curr = points[i];
        const cp1x = prev.x + (curr.x - prev.x) / 3;
        const cp1y = prev.y; 
        const cp2x = curr.x - (curr.x - prev.x) / 3;
        const cp2y = curr.y;
        wirePath += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${curr.x} ${curr.y}`;
    }

    return (
      <g>
        {/* Teeth Layer */}
        {teethData.map((tooth, i) => {
          const centerX = tooth.x + tooth.width / 2;
          const centerY = tooth.y + tooth.height / 2;
          const pathD = createToothPath(tooth.x, tooth.y, tooth.width, tooth.height, isUpper);
          
          return (
            <g key={`tooth-${isUpper ? 'u' : 'l'}-${i}`}>
              <path
                d={pathD}
                fill="#FFFCF5"
                stroke="#E0D5C7"
                strokeWidth="0.5"
              />
              
              <path
                 d={`M ${centerX - tooth.width*0.2} ${centerY - tooth.height*0.2} 
                     Q ${centerX} ${centerY - tooth.height*0.3} ${centerX + tooth.width*0.2} ${centerY - tooth.height*0.15}
                     Q ${centerX} ${centerY} ${centerX - tooth.width*0.2} ${centerY - tooth.height*0.2}`}
                 fill="white"
                 opacity="0.3"
              />
            </g>
          );
        })}

        {/* Wire Layer */}
        <path
          d={wirePath}
          fill="none"
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="3"
          transform="translate(0, 1.5)"
        />
        <path
          d={wirePath}
          fill="none"
          stroke="url(#chromeGradientVertical)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d={wirePath}
          fill="none"
          stroke="white"
          strokeWidth="0.8"
          opacity="0.7"
          transform="translate(0, -0.5)"
        />

        {/* Brackets Layer */}
        {teethData.map((tooth, i) => {
          const bracketState = bracketsState[i];
          const color = bracketState ? bracketState.color : '#e8e8e8';
          const centerX = tooth.x + tooth.width / 2;
          const centerY = bracketY;

          const isDefaultColor = color === '#e8e8e8';

          return (
            <g 
                key={`bracket-${isUpper ? 'u' : 'l'}-${i}`}
                onClick={() => onBracketClick?.(bracketState.id)}
                className="cursor-pointer hover:brightness-110 transition-all"
            >
                <rect
                    x={centerX - 5}
                    y={centerY - 4}
                    width="10"
                    height="8"
                    rx="2"
                    fill="black"
                    opacity="0.25"
                    transform="translate(1, 1)"
                />

                <rect
                    x={centerX - 5}
                    y={centerY - 4}
                    width="10"
                    height="8"
                    rx="2"
                    fill={isDefaultColor ? "url(#chromeGradientVertical)" : color}
                    stroke="rgba(0,0,0,0.4)"
                    strokeWidth="0.5"
                />

                <path
                    d={`M ${centerX - 3} ${centerY - 3} L ${centerX + 3} ${centerY - 3} 
                        M ${centerX - 3} ${centerY + 3} L ${centerX + 3} ${centerY + 3}`}
                    stroke="rgba(0,0,0,0.4)"
                    strokeWidth="1"
                />

                <rect
                    x={centerX - 5}
                    y={centerY - 1}
                    width="10"
                    height="2"
                    fill="#222"
                    opacity="0.7"
                />

                <ellipse
                    cx={centerX - 2}
                    cy={centerY - 2}
                    rx="2"
                    ry="1.5"
                    fill="white"
                    opacity="0.8"
                    transform={`rotate(-45 ${centerX - 2} ${centerY - 2})`}
                />
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <svg
      viewBox="0 0 520 290"
      className="w-full h-auto drop-shadow-lg"
      style={{ maxWidth: '1000px', margin: '0 auto', minHeight: '500px' }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="cleanGumGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E8A9B3" />
          <stop offset="100%" stopColor="#D97F8C" />
        </linearGradient>

        <linearGradient id="realisticGumGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E8A9B3" />
          <stop offset="100%" stopColor="#D97F8C" />
        </linearGradient>

        

        <linearGradient id="chromeGradientVertical" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#888" />
          <stop offset="30%" stopColor="#fff" />
          <stop offset="50%" stopColor="#666" />
          <stop offset="70%" stopColor="#fff" />
          <stop offset="100%" stopColor="#888" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="100%" height="100%" fill="#FEF7F0" />

      <path 
        d={upperGumPath} 
        fill="url(#realisticGumGradient)"
      />

      <path 
        d={lowerGumPath} 
        fill="url(#realisticGumGradient)"
      />

      {renderTeethRow(upperTeeth, upperBrackets, true)}
      {renderTeethRow(lowerTeeth, lowerBrackets, false)}
    </svg>
  );
}
