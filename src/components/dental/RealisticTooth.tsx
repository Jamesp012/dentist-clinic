import React from 'react';
import { Tooth, ToothData } from '../..//Tooth';

interface RealisticToothProps {
  id: number;
  data: ToothData;
  isSelected?: boolean;
  onToothClick?: (id: number) => void;
  view?: 'occlusal' | 'buccal' | 'lingual';
}

export function RealisticTooth({ id, data, isSelected = false, onToothClick }: RealisticToothProps) {
  // Minimal wrapper that delegates to the existing `Tooth` component.
  return (
    <Tooth
      id={id}
      data={data}
      isSelected={isSelected}
      onSurfaceClick={() => { /* noop for realistic wrapper */ }}
      onToothClick={(i) => onToothClick && onToothClick(i)}
    />
  );
}
