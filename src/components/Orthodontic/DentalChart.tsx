import React, { useRef } from "react";
import { motion } from "motion/react";

interface Position {
  x: number;
  y: number;
}

interface DentalChartProps {
  colors: string[];
  selectedIndices: number[];
  onToothClick: (index: number) => void;
  selectionMode: "single" | "all";
  upperPositions: Position[];
  lowerPositions: Position[];
  bracketVisibility?: boolean[];
  // No position change callback when positions are fixed
}

interface DraggableBracketProps {
  pos: Position & { index: number };
  color: string;
  isSelected: boolean;
  onToothClick: (index: number) => void;
  scale?: number;
}

const DraggableBracket: React.FC<DraggableBracketProps> = ({
  pos,
  color,
  isSelected,
  onToothClick,
  scale = 1,
}) => {
  const mainSize = 24 * scale;
  const mainOffset = mainSize / 2;
  const ringSize = 20 * scale;
  const ringOffset = ringSize / 2;
  const circleRadius = 35 * scale;

  return (
    <g
      className="cursor-pointer transition-opacity"
      onClick={(e) => {
        e.stopPropagation();
        onToothClick(pos.index);
      }}
    >
      <circle cx={pos.x} cy={pos.y} r={circleRadius} fill="transparent" />

      <rect
        x={pos.x - mainOffset}
        y={pos.y - mainOffset}
        width={mainSize}
        height={mainSize}
        rx={3}
        fill="#94A3B8"
        stroke="#475569"
        strokeWidth={1}
      />

      <g stroke="#64748B" strokeWidth={0.5}>
        <rect
          x={pos.x - 11 * scale}
          y={pos.y - 11 * scale}
          width={7 * scale}
          height={7 * scale}
          rx={1.5}
          fill="#CBD5E1"
        />
        <rect
          x={pos.x + 4 * scale}
          y={pos.y - 11 * scale}
          width={7 * scale}
          height={7 * scale}
          rx={1.5}
          fill="#CBD5E1"
        />
        <rect
          x={pos.x - 11 * scale}
          y={pos.y + 4 * scale}
          width={7 * scale}
          height={7 * scale}
          rx={1.5}
          fill="#CBD5E1"
        />
        <rect
          x={pos.x + 4 * scale}
          y={pos.y + 4 * scale}
          width={7 * scale}
          height={7 * scale}
          rx={1.5}
          fill="#CBD5E1"
        />
      </g>

      <motion.rect
        x={pos.x - ringOffset}
        y={pos.y - ringOffset}
        width={ringSize}
        height={ringSize}
        rx={6}
        fill="transparent"
        stroke={color}
        strokeWidth={4.5}
        initial={false}
        animate={{
          stroke: color,
          scale: isSelected ? 1.15 : 1,
        }}
        className="drop-shadow-sm"
      />

      <rect
        x={pos.x - 12 * scale}
        y={pos.y - 1.5 * scale}
        width={24 * scale}
        height={3 * scale}
        fill="#1E293B"
        fillOpacity={0.6}
      />

      <rect
        x={pos.x - 1 * scale}
        y={pos.y - 12 * scale}
        width={2 * scale}
        height={24 * scale}
        fill="#1E293B"
        fillOpacity={0.15}
      />

      {isSelected && (
        <circle
          cx={pos.x}
          cy={pos.y}
          r={22}
          fill="none"
          stroke="#F97316"
          strokeWidth={3}
          strokeDasharray="4 2"
          opacity={0.8}
        />
      )}
    </g>
  );
};

export const DentalChart: React.FC<DentalChartProps> = ({ 
  colors, 
  selectedIndices, 
  onToothClick,
  upperPositions,
  lowerPositions,
  bracketVisibility,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const width = 1000;
  const height = 650;

  const getWirePath = (points: Position[]) => {
    if (points.length < 2) return "";
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      d += ` Q ${p1.x},${p1.y} ${midX},${midY}`;
    }
    const last = points[points.length - 1];
    d += ` T ${last.x},${last.y}`;
    return d;
  };

  // Dragging removed — positions are fixed to the provided arrays



  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div 
        className="relative w-full rounded-2xl overflow-hidden border-2 border-gray-300 bg-transparent transition-colors duration-300 shadow-2xl"
      >
        <svg 
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-auto block overflow-visible"
        >
          {/* Background orthodontic image */}
          <image
            href="/dental-base.png"
            x={0}
            y={0}
            width={width}
            height={height}
            preserveAspectRatio="xMidYMid meet"
          />

          <g opacity={0.2}>
            {(() => {
              const upFirst = upperPositions[0];
              const upLast = upperPositions[upperPositions.length - 1] || upFirst;
              const lowFirst = lowerPositions[0];
              const lowLast = lowerPositions[lowerPositions.length - 1] || lowFirst;
              const guides = [] as { x1: number; y1: number; x2: number; y2: number }[];
              if (upFirst && upLast) {
                guides.push({ x1: upFirst.x, y1: upFirst.y, x2: upLast.x, y2: upLast.y });
              }
              if (lowFirst && lowLast) {
                guides.push({ x1: lowFirst.x, y1: lowFirst.y, x2: lowLast.x, y2: lowLast.y });
              }
              return guides;
            })().map((line, i) => (
              <line
                key={`guide-${i}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#94A3B8"
                strokeWidth={1}
                strokeDasharray="10 10"
              />
            ))}
          </g>

          <path
            d={getWirePath(upperPositions.filter(p => !!p))}
            fill="none"
            stroke="#475569"
            strokeWidth={3}
            strokeLinecap="round"
            className="opacity-40"
          />
          <path
            d={getWirePath(lowerPositions.filter(p => !!p))}
            fill="none"
            stroke="#94A3B8"
            strokeWidth={2.5}
            strokeLinecap="round"
            className="opacity-30"
          />

          <g className="pointer-events-auto">
            {upperPositions.map((pos, i) => {
              if (!pos) return null;
              const globalIndex = i;
              if (bracketVisibility && bracketVisibility[globalIndex] === false) return null;
              const isEdge = i < 3 || i >= upperPositions.length - 3;
              return (
                <DraggableBracket 
                  key={`u-${i}`}
                  pos={{ ...pos, index: i }}
                  color={colors[i]}
                  isSelected={selectedIndices.includes(i)}
                  onToothClick={onToothClick}
                  scale={isEdge ? 0.8 : 1}
                />
              );
            })}
            {lowerPositions.map((pos, i) => {
              if (!pos) return null;
              const globalIndex = i + 16;
              if (bracketVisibility && bracketVisibility[globalIndex] === false) return null;
              const isEdge = i < 3 || i >= lowerPositions.length - 3;
              return (
                <DraggableBracket 
                  key={`l-${i}`}
                  pos={{ ...pos, index: i + 16 }}
                  color={colors[i + 16]}
                  isSelected={selectedIndices.includes(i + 16)}
                  onToothClick={onToothClick}
                  scale={isEdge ? 0.8 : 1}
                />
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};
