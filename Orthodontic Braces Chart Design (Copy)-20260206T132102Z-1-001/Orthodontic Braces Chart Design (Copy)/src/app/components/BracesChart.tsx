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
  // This creates a path that follows the root of each tooth
  const generateGumPath = (teeth: any[], isUpper: boolean) => {
    if (teeth.length === 0) return '';

    // Start slightly outside the first tooth
    const startX = teeth[0].x - 20;
    // Base Y is the deep part of the gum (root direction)
    const deepY = isUpper ? 50 : 240;
    // The "papilla" Y is the tip of the gum between teeth
    // The "margin" Y is the highest point of the gum on the tooth
    
    let path = `M ${startX} ${deepY}`; 

    // Loop through teeth to create the scallop
    teeth.forEach((tooth, i) => {
      const toothCenterX = tooth.x + tooth.width / 2;
      const toothTopY = tooth.y; // For upper, this is the top (root) of the visible tooth
      
      // Points
      const prevGapX = tooth.x;
      const nextGapX = tooth.x + tooth.width;
      
      // Papilla (point between teeth)
      // For upper: Papilla is LOWER (larger Y) than the gingival margin (smaller Y)
      // For lower: Papilla is HIGHER (smaller Y) than the gingival margin (larger Y)
      
      // Gingival Margin (High point of gum on tooth)
      // Adjust offset based on tooth type for realism (canines have higher gums)
      const marginOffset = tooth.type === 'canine' ? 6 : 2;
      const marginY = isUpper ? tooth.y + marginOffset : tooth.y + tooth.height - marginOffset;
      
      // Papilla Y (The tip between teeth)
      // Should be closer to the contact plane
      const papillaOffset = 15;
      const papillaY = isUpper ? marginY + papillaOffset : marginY - papillaOffset;

      if (i === 0) {
        // First segment - connect from deep start to first papilla area
        path += ` L ${prevGapX} ${papillaY}`;
      }

      // Curve over the tooth root (Gingival Margin)
      // Control points for a nice rounded scallop
      path += ` Q ${toothCenterX} ${marginY - (isUpper ? 10 : -10)} ${nextGapX} ${papillaY}`;
    });

    // Close the shape back to deep Y
    const endX = teeth[teeth.length - 1].x + teeth[teeth.length - 1].width + 20;
    path += ` L ${endX} ${deepY} Z`;

    return path;
  };

  const upperGumPath = generateGumPath(upperTeeth, true);
  const lowerGumPath = generateGumPath(lowerTeeth, false);

  // Helper to create tooth path
  const createToothPath = (x: number, y: number, width: number, height: number, isUpper: boolean) => {
    const m = 1; // margin
    const w = width - m * 2;
    const h = height;
    const startX = x + m;
    const startY = y;
    
    const radius = w * 0.45; // Slightly rounder
    const cornerRadius = 6; // Softer corners

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

  // Combine teeth with bracket state
  const renderTeethRow = (teethData: any[], bracketsState: Bracket[], isUpper: boolean) => {
    const bracketY = isUpper ? 125 : 165;

    // Generate wire path
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
              {/* Main Tooth Body */}
              <path
                d={pathD}
                fill="url(#realToothGradient)"
                stroke="rgba(100,80,70,0.15)" // Slightly warmer stroke
                strokeWidth="0.5"
                filter="url(#subtleShadow)"
              />
              
              {/* Enamel Texture (Vertical Striations) */}
              <path 
                d={pathD}
                fill="url(#enamelTexture)"
                opacity="0.3"
                style={{ mixBlendMode: 'multiply' }}
              />

              {/* Inner Depth Shadow */}
               <path 
                d={pathD}
                fill="none"
                stroke="url(#innerShadowGradient)"
                strokeWidth="4"
                opacity="0.2"
                clipPath={`url(#clip-${isUpper ? 'u' : 'l'}-${i})`}
              />
              
              {/* Specular Highlight (wet look) - More organic shape */}
              <path
                 d={`M ${centerX - tooth.width*0.2} ${centerY - tooth.height*0.2} 
                     Q ${centerX} ${centerY - tooth.height*0.3} ${centerX + tooth.width*0.2} ${centerY - tooth.height*0.15}
                     Q ${centerX} ${centerY} ${centerX - tooth.width*0.2} ${centerY - tooth.height*0.2}`}
                 fill="white"
                 opacity="0.5"
                 filter="url(#blurFilterSmall)"
              />
            </g>
          );
        })}

        {/* Wire Layer */}
        <path
          d={wirePath}
          fill="none"
          stroke="rgba(0,0,0,0.4)"
          strokeWidth="3"
          filter="url(#blurFilter)"
          transform="translate(0, 1.5)"
        />
        <path
          d={wirePath}
          fill="none"
          stroke="url(#chromeGradient)"
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
                {/* Bracket Drop Shadow */}
                <rect
                    x={centerX - 5}
                    y={centerY - 4}
                    width="10"
                    height="8"
                    rx="2"
                    fill="black"
                    opacity="0.4"
                    filter="url(#blurFilter)"
                    transform="translate(1, 1)"
                />

                {/* Bracket Base */}
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

                {!isDefaultColor && (
                   <rect
                    x={centerX - 5}
                    y={centerY - 4}
                    width="10"
                    height="8"
                    rx="2"
                    fill="url(#glassOverlay)"
                    opacity="0.4"
                   />
                )}

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
                    opacity="0.9"
                    transform={`rotate(-45 ${centerX - 2} ${centerY - 2})`}
                    filter="url(#blurFilterSmall)"
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
      className="w-full h-full"
      style={{ maxWidth: '900px', margin: '0 auto' }}
    >
      <defs>
        {/* --- REALISTIC GUM TEXTURE & COLOR --- */}
        <filter id="gumNoise" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="5" result="noise" />
          <feDiffuseLighting in="noise" lightingColor="#fff" surfaceScale="1.5" result="diffuse">
            <feDistantLight azimuth="45" elevation="60" />
          </feDiffuseLighting>
          <feComposite operator="in" in="diffuse" in2="SourceGraphic" result="composite" />
          <feBlend mode="overlay" in="composite" in2="SourceGraphic" opacity="0.4" />
        </filter>

        <linearGradient id="realisticGumGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#c0555e" /> {/* Deep red root */}
          <stop offset="20%" stopColor="#d46b75" />
          <stop offset="60%" stopColor="#e88e96" /> {/* Healthy Pink */}
          <stop offset="100%" stopColor="#ed9ca3" /> {/* Light margin */}
        </linearGradient>

        {/* --- REALISTIC TOOTH MATERIAL --- */}
        <linearGradient id="realToothGradient" x1="0%" y1="0%" x2="0%" y2="100%">
           <stop offset="0%" stopColor="#f5f0d5" /> {/* Warmer dentin yellow */}
           <stop offset="25%" stopColor="#ffffff" /> {/* Body */}
           <stop offset="80%" stopColor="#f8f9fa" />
           <stop offset="100%" stopColor="#dbe4eb" /> {/* Translucent enamel */}
        </linearGradient>

        <pattern id="enamelTexture" width="4" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(90)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#888" strokeWidth="0.5" opacity="0.1" />
        </pattern>

        <linearGradient id="innerShadowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#554433" stopOpacity="0.4"/>
            <stop offset="20%" stopColor="#554433" stopOpacity="0"/>
            <stop offset="80%" stopColor="#554433" stopOpacity="0"/>
            <stop offset="100%" stopColor="#554433" stopOpacity="0.4"/>
        </linearGradient>

        <linearGradient id="chromeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#666" />
          <stop offset="30%" stopColor="#fff" />
          <stop offset="50%" stopColor="#444" />
          <stop offset="70%" stopColor="#fff" />
          <stop offset="100%" stopColor="#666" />
        </linearGradient>

        <linearGradient id="chromeGradientVertical" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#888" />
          <stop offset="30%" stopColor="#fff" />
          <stop offset="50%" stopColor="#666" />
          <stop offset="70%" stopColor="#fff" />
          <stop offset="100%" stopColor="#888" />
        </linearGradient>
        
        <linearGradient id="glassOverlay" x1="0%" y1="0%" x2="100%" y2="100%">
           <stop offset="0%" stopColor="white" stopOpacity="0.6"/>
           <stop offset="50%" stopColor="white" stopOpacity="0"/>
           <stop offset="100%" stopColor="black" stopOpacity="0.3"/>
        </linearGradient>

        <filter id="subtleShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur"/>
            <feOffset in="blur" dx="0" dy="1" result="offsetBlur"/>
            <feComposite in="offsetBlur" in2="SourceAlpha" operator="out" result="outerShadow"/>
            <feComponentTransfer>
                <feFuncA type="linear" slope="0.2"/>
            </feComponentTransfer>
            <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>

        <filter id="blurFilter">
            <feGaussianBlur stdDeviation="2" />
        </filter>
        <filter id="blurFilterSmall">
            <feGaussianBlur stdDeviation="0.8" />
        </filter>
        
        <radialGradient id="cavityGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#300000" />
            <stop offset="100%" stopColor="#150000" />
        </radialGradient>
      </defs>

      {/* Mouth Cavity Depth */}
      <rect x="0" y="0" width="100%" height="100%" fill="url(#cavityGradient)" opacity="1" />

      {/* SCALLOPED GUMS */}
      {/* Upper Gum */}
      <path 
        d={upperGumPath} 
        fill="url(#realisticGumGradient)"
        filter="url(#gumNoise)"
      />
      {/* Upper Gum Shadow/Ambient Occlusion where teeth meet gums */}
      <path 
        d={upperGumPath} 
        fill="none" 
        stroke="#803030" 
        strokeWidth="1" 
        opacity="0.4"
        filter="url(#blurFilterSmall)"
      />

      {/* Lower Gum */}
      <path 
        d={lowerGumPath} 
        fill="url(#realisticGumGradient)"
        filter="url(#gumNoise)"
      />
       {/* Lower Gum Shadow */}
       <path 
        d={lowerGumPath} 
        fill="none" 
        stroke="#803030" 
        strokeWidth="1" 
        opacity="0.4"
        filter="url(#blurFilterSmall)"
      />

      {/* Render Teeth Rows */}
      {renderTeethRow(upperTeeth, upperBrackets, true)}
      {renderTeethRow(lowerTeeth, lowerBrackets, false)}

    </svg>
  );
}
