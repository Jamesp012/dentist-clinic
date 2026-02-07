import React, { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { motion } from "motion/react";
import { BracesChart } from "./BracesChart";

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
  onPositionChange: (index: number, x: number, y: number) => void;
}

const ITEM_TYPE = "BRACKET";

interface DraggableBracketProps {
  pos: Position & { index: number };
  color: string;
  isSelected: boolean;
  onToothClick: (index: number) => void;
}

const DraggableBracket: React.FC<DraggableBracketProps> = ({ pos, color, isSelected, onToothClick }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ITEM_TYPE,
    item: { index: pos.index },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [pos.index]);

  return (
    <g 
      ref={(node) => { drag(node); }}
      className={`cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? "opacity-20" : "opacity-100"}`}
      onClick={(e) => {
        e.stopPropagation();
        onToothClick(pos.index);
      }}
    >
      <circle cx={pos.x} cy={pos.y} r={35} fill="transparent" />
      
      <rect
        x={pos.x - 12}
        y={pos.y - 12}
        width={24}
        height={24}
        rx={3}
        fill="#94A3B8"
        stroke="#475569"
        strokeWidth={1}
      />

      <g stroke="#64748B" strokeWidth={0.5}>
        <rect x={pos.x - 11} y={pos.y - 11} width={7} height={7} rx={1.5} fill="#CBD5E1" />
        <rect x={pos.x + 4} y={pos.y - 11} width={7} height={7} rx={1.5} fill="#CBD5E1" />
        <rect x={pos.x - 11} y={pos.y + 4} width={7} height={7} rx={1.5} fill="#CBD5E1" />
        <rect x={pos.x + 4} y={pos.y + 4} width={7} height={7} rx={1.5} fill="#CBD5E1" />
      </g>

      <motion.rect
        x={pos.x - 10}
        y={pos.y - 10}
        width={20}
        height={20}
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
        x={pos.x - 12}
        y={pos.y - 1.5}
        width={24}
        height={3}
        fill="#1E293B"
        fillOpacity={0.6}
      />

      <rect
        x={pos.x - 1}
        y={pos.y - 12}
        width={2}
        height={24}
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
  onPositionChange
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const width = 1000;
  const height = 650;

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ITEM_TYPE,
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
    drop: (item: { index: number }, monitor) => {
      const clientOffset = monitor.getClientOffset();
      if (clientOffset && svgRef.current) {
        const svgElement = svgRef.current;
        const pt = svgElement.createSVGPoint();
        pt.x = clientOffset.x;
        pt.y = clientOffset.y;
        
        const svgPt = pt.matrixTransform(svgElement.getScreenCTM()?.inverse());
        
        onPositionChange(item.index, Math.round(svgPt.x), Math.round(svgPt.y));
      }
    },
  }), [onPositionChange]);

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

  // Convert positions to brackets format
  const upperBrackets = upperPositions.map((pos, i) => ({
    id: `upper-${i}`,
    color: colors[i],
    x: pos.x,
    y: pos.y
  }));

  const lowerBrackets = lowerPositions.map((pos, i) => ({
    id: `lower-${i}`,
    color: colors[i + 14],
    x: pos.x,
    y: pos.y
  }));

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div 
        ref={(node) => { drop(node); }}
        className={`relative w-full rounded-2xl overflow-hidden bg-gradient-to-br from-white to-gray-50 border-2 transition-colors duration-300 shadow-2xl ${
          isOver ? "border-orange-400 bg-orange-50/10" : "border-gray-300"
        }`}
        style={{ minHeight: '600px' }}
      >
        <div className="relative w-full h-full py-12 px-8 flex items-center justify-center">
          <div className="w-full h-auto block select-none pointer-events-none opacity-100 scale-[1.1]">
            <BracesChart 
              upperBrackets={upperBrackets}
              lowerBrackets={lowerBrackets}
              onBracketClick={(id) => {
                const parts = id.split('-');
                const idx = parseInt(parts[1]);
                onToothClick(parts[0] === 'upper' ? idx : idx + 14);
              }}
            />
          </div>
        </div>

        <svg 
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`} 
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
        >
          <g opacity={0.2}>
            {[
              { x1: upperPositions[0].x, y1: upperPositions[0].y, x2: upperPositions[13].x, y2: upperPositions[13].y },
              { x1: lowerPositions[0].x, y1: lowerPositions[0].y, x2: lowerPositions[13].x, y2: lowerPositions[13].y },
            ].map((line, i) => (
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
            d={getWirePath(upperPositions)}
            fill="none"
            stroke="#475569"
            strokeWidth={3}
            strokeLinecap="round"
            className="opacity-40"
          />
          <path
            d={getWirePath(lowerPositions)}
            fill="none"
            stroke="#94A3B8"
            strokeWidth={2.5}
            strokeLinecap="round"
            className="opacity-30"
          />

          <g className="pointer-events-auto">
            {upperPositions.map((pos, i) => (
              <DraggableBracket 
                key={`u-${i}`}
                pos={{ ...pos, index: i }}
                color={colors[i]}
                isSelected={selectedIndices.includes(i)}
                onToothClick={onToothClick}
              />
            ))}
            {lowerPositions.map((pos, i) => (
              <DraggableBracket 
                key={`l-${i}`}
                pos={{ ...pos, index: i + 14 }}
                color={colors[i + 14]}
                isSelected={selectedIndices.includes(i + 14)}
                onToothClick={onToothClick}
              />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
};
