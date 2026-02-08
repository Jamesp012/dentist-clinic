import React, { useState } from 'react';
import { ToothData } from './Tooth';
import { RealisticTooth } from './dental/RealisticTooth';
import { ToothDetailsSidebar } from './dental/ToothDetailsSidebar';
import { cn } from '../lib/utils';
import {
  CheckCircle2,
  HelpCircle,
  MoreVertical,
  Layers,
  Grid,
  Maximize2,
  Plus,
  History,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

// Helper to create fresh initial state
const createInitialTeethData = (): Record<number, ToothData> => {
  const data: Record<number, ToothData> = {};
  for (let i = 1; i <= 32; i++) {
    data[i] = {
      id: i,
      surfaces: {
        occlusal: 'healthy',
        mesial: 'healthy',
        distal: 'healthy',
        buccal: 'healthy',
        lingual: 'healthy',
      },
      generalCondition: 'healthy',
      isPermanent: true, // All teeth default to permanent
      notes: '',
    };
  }
  return data;
};

interface ChartRecord {
  id: string;
  date: string;
  data: Record<number, ToothData>;
}

export function DentalChartWebsite() {
  // Initialize with one chart
  const [charts, setCharts] = useState<ChartRecord[]>([
    {
      id: '1',
      date: new Date().toLocaleString(),
      data: createInitialTeethData(),
    },
  ]);
  const [activeChartId, setActiveChartId] = useState<string>('1');
  const [selectedTooth, setSelectedTooth] = useState<number | null>(12);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Derived active teeth data
  const activeChart = charts.find((c) => c.id === activeChartId) || charts[0];
  const teeth = activeChart.data;

  const handleToothClick = (id: number) => {
    setSelectedTooth(id);
    setIsSidebarOpen(true);
  };

  const handleUpdateTooth = (id: number, updates: Partial<ToothData>) => {
    setCharts((prevCharts) =>
      prevCharts.map((chart) => {
        if (chart.id === activeChartId) {
          return {
            ...chart,
            data: {
              ...chart.data,
              [id]: { ...chart.data[id], ...updates },
            },
          };
        }
        return chart;
      }),
    );
  };

  const handleNewChart = () => {
    if (
      window.confirm(
        'Create a new chart for this patient? Previous charts will be saved.',
      )
    ) {
      const newId = (charts.length + 1).toString();
      const newChart: ChartRecord = {
        id: newId,
        date: new Date().toLocaleString(),
        data: createInitialTeethData(),
      };

      setCharts((prev) => [...prev, newChart]);
      setActiveChartId(newId);
      setSelectedTooth(null);
      setIsSidebarOpen(false);
      toast.success('New chart created');
    }
  };

  const getFDINumber = (id: number) => {
    // Upper Right (1-8) -> 18-11
    if (id >= 1 && id <= 8) return `1${9 - id}`;
    // Upper Left (9-16) -> 21-28
    if (id >= 9 && id <= 16) return `2${id - 8}`;
    // Lower Left (17-24) -> 38-31 (Universal 17 is 38)
    if (id >= 17 && id <= 24) return `3${25 - id}`;
    // Lower Right (25-32) -> 48-41 (Universal 32 is 48)
    if (id >= 25 && id <= 32) return `4${id - 24}`;
    return id;
  };

  return (
    <div className="flex flex-col h-full bg-white font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-slate-200">
        <div className="flex items-center gap-6">
          <div className="text-xl font-medium text-slate-500">Krista</div>

          {/* Chart Selector */}
          <div className="relative group">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-600 hover:border-slate-300 transition-colors cursor-pointer">
              <History className="w-4 h-4 text-slate-400" />
              <select
                value={activeChartId}
                onChange={(e) => setActiveChartId(e.target.value)}
                className="bg-transparent border-none outline-none appearance-none cursor-pointer pr-4 font-medium min-w-[140px]"
              >
                {charts.map((chart) => (
                  <option key={chart.id} value={chart.id}>
                    {chart.date}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-3 pointer-events-none text-slate-400" />
            </div>
            <div className="absolute top-full left-0 mt-1 hidden group-hover:block bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
              Select chart history
            </div>
          </div>
        </div>

        <button
          onClick={handleNewChart}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg shadow-sm transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          New Chart
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Chart Area */}
        <div className="flex-1 flex items-center justify-center bg-white p-8 overflow-auto">
          <div className="relative max-w-6xl w-full flex flex-col gap-1">
            {/* Upper Arch Roots (Buccal) */}
            <div className="relative flex justify-center gap-1 mb-[-10px] z-0">
              {Array.from({ length: 16 }, (_, i) => i + 1).map((id) => (
                <div key={id} className={id === 8 ? 'mr-4' : ''}>
                  <RealisticTooth
                    id={id}
                    data={teeth[id]}
                    isSelected={selectedTooth === id}
                    onToothClick={handleToothClick}
                    view="buccal"
                  />
                </div>
              ))}
            </div>

            {/* Upper Arch Crowns (Occlusal) */}
            <div className="flex justify-center gap-1 z-10">
              {Array.from({ length: 16 }, (_, i) => i + 1).map((id) => (
                <div key={id} className={id === 8 ? 'mr-4' : ''}>
                  <RealisticTooth
                    id={id}
                    data={teeth[id]}
                    isSelected={selectedTooth === id}
                    onToothClick={handleToothClick}
                    view="occlusal"
                  />
                </div>
              ))}
            </div>

            {/* Tooth Numbers (Upper & Lower) */}
            <div className="py-6 flex flex-col gap-2">
              {/* Upper Numbers */}
              <div className="flex justify-center gap-1 text-xs text-slate-400 font-medium">
                {Array.from({ length: 16 }, (_, i) => i + 1).map((id) => (
                  <div
                    key={id}
                    className={cn(
                      'w-10 text-center transition-colors',
                      id === 8 && 'mr-4',
                      selectedTooth === id &&
                        'bg-yellow-400 text-yellow-900 font-bold rounded-full',
                    )}
                  >
                    {id}
                  </div>
                ))}
              </div>

              {/* Lower Numbers (FDI) */}
              <div className="flex justify-center gap-1 text-[10px] text-slate-400 font-bold tracking-tight uppercase">
                {Array.from({ length: 16 }, (_, i) => i + 1).map((id) => (
                  <div
                    key={id}
                    className={cn(
                      'w-10 text-center transition-colors',
                      id === 8 && 'mr-4',
                      selectedTooth === id &&
                        'bg-slate-900 text-white font-bold rounded-full',
                    )}
                  >
                    {getFDINumber(id)}
                  </div>
                ))}
              </div>
            </div>

            {/* Lower Arch Crowns (Occlusal) */}
            <div className="flex justify-center gap-1 z-10 mt-[-10px]">
              {Array.from({ length: 16 }, (_, i) => i + 17).map((id) => (
                <div key={id} className={id === 24 ? 'mr-4' : ''}>
                  <RealisticTooth
                    id={id}
                    data={teeth[id]}
                    isSelected={selectedTooth === id}
                    onToothClick={handleToothClick}
                    view="occlusal"
                  />
                </div>
              ))}
            </div>

            {/* Lower Arch Roots (Buccal) */}
            <div className="relative flex justify-center gap-1 mt-[-10px] z-0">
              {Array.from({ length: 16 }, (_, i) => i + 17).map((id) => (
                <div key={id} className={id === 24 ? 'mr-4' : ''}>
                  <RealisticTooth
                    id={id}
                    data={teeth[id]}
                    isSelected={selectedTooth === id}
                    onToothClick={handleToothClick}
                    view="buccal"
                  />
                </div>
              ))}
            </div>

            {/* Quick Actions & Legend */}
            <div className="mt-8 flex flex-col lg:flex-row gap-6 items-start">
              {/* Quick Actions */}
              <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Quick Markers
                    </span>
                  </div>
                  <button className="p-1 rounded-md hover:bg-slate-100 text-slate-400">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {[
                    'Caries',
                    'Filling',
                    'Crown',
                    'Extraction',
                    'RCT',
                    'Bridge',
                    'Implant',
                    'Fracture',
                  ].map((label) => (
                    <button
                      key={label}
                      className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="w-full lg:w-80 bg-slate-50 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Legend
                    </span>
                  </div>
                  <Grid className="w-4 h-4 text-slate-400" />
                </div>

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Healthy</span>
                    <span className="w-4 h-1 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Caries</span>
                    <span className="w-4 h-1 rounded-full bg-rose-400" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Restoration</span>
                    <span className="w-4 h-1 rounded-full bg-sky-400" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Missing</span>
                    <span className="w-4 h-1 rounded-full bg-slate-300" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <ToothDetailsSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          selectedTooth={selectedTooth}
          toothData={selectedTooth ? teeth[selectedTooth] : null}
          onUpdateTooth={handleUpdateTooth}
          onSelectTooth={handleToothClick}
          allTeethIds={Array.from({ length: 32 }, (_, i) => i + 1)}
        />
      </div>
    </div>
  );
}
