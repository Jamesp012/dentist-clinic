import React from 'react';

interface Bracket {
  id: string;
  x?: number;
  y?: number;
  color: string;
}

interface BracesChartProps {
  upperBrackets: Bracket[];
  lowerBrackets: Bracket[];
  onBracketClick?: (id: string) => void;
}

// This component now only renders the orthodontic base image as a background.
// All interactive brackets are handled by the overlay SVG in DentalChart.tsx.
export function BracesChart(_props: BracesChartProps) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <img
        src="/dental-base.png"
        alt="Orthodontic dental arches"
        className="w-full h-auto max-w-5xl object-contain select-none pointer-events-none"
      />
    </div>
  );
}
