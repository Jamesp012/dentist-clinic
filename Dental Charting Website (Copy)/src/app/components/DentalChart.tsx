import React, { useState, useRef } from 'react';
import { ToothData, Surface, Condition } from '../Tooth';
import { RealisticTooth } from './dental/RealisticTooth';
import { ToothDetailsSidebar } from './dental/ToothDetailsSidebar';
import { cn } from '@/lib/utils';
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
  Image as ImageIcon,
  X
} from 'lucide-react';
import { toast } from 'sonner';

// Reference image used for absolute anatomical precision
import gumBackground from "figma:asset/6807b15895aedf003f4cf16dd0bee914a122a1d8.png";

const createInitialTeethData = (): Record<string | number, ToothData> => {
  const data: Record<string | number, ToothData> = {};
  for (let i = 1; i <= 32; i++) {
    data[i] = {
      id: i,
      surfaces: { occlusal: 'healthy', mesial: 'healthy', distal: 'healthy', buccal: 'healthy', lingual: 'healthy' },
      generalCondition: 'healthy',
      isPermanent: true,
      notes: ''
    };
  }
  const primaryIds = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T'];
  primaryIds.forEach(id => {
    data[id] = {
      id: id,
      surfaces: { occlusal: 'healthy', mesial: 'healthy', distal: 'healthy', buccal: 'healthy', lingual: 'healthy' },
      generalCondition: 'healthy',
      isPermanent: false,
      notes: ''
    };
  });
  return data;
};

interface ChartRecord {
  id: string;
  date: string;
  data: Record<string | number, ToothData>;
}

export function DentalChart() {
  const [charts, setCharts] = useState<ChartRecord[]>([{ id: '1', date: new Date().toLocaleString(), data: createInitialTeethData() }]);
  const [activeChartId, setActiveChartId] = useState<string>('1');
  const [selectedTooth, setSelectedTooth] = useState<number | string | null>(null); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tracingOpacity, setTracingOpacity] = useState(1.0);

  const activeChart = charts.find(c => c.id === activeChartId) || charts[0];
  const teeth = activeChart.data;

  const handleToothClick = (id: number | string) => {
    setSelectedTooth(id);
    setIsSidebarOpen(true);
  };

  const handleUpdateTooth = (id: number | string, updates: Partial<ToothData>) => {
    setCharts(prevCharts => prevCharts.map(chart => {
      if (chart.id === activeChartId) {
        return { ...chart, data: { ...chart.data, [id]: { ...chart.data[id], ...updates } } };
      }
      return chart;
    }));
  };

  const handleNewChart = () => {
    if (window.confirm('Create a new chart? Previous records are preserved in history.')) {
      const newId = (charts.length + 1).toString();
      setCharts(prev => [...prev, { id: newId, date: new Date().toLocaleString(), data: createInitialTeethData() }]);
      setActiveChartId(newId);
      setSelectedTooth(null);
      setIsSidebarOpen(false);
      toast.success('New chart session started');
    }
  };

  // PRECISION COORDINATES TO MATCH REFERENCE IMAGE (Horseshoe Arch)
  const archPositions: Record<string | number, { x: number, y: number, rot: number }> = {
    // UPPER PERMANENT (1-16) - Smooth horseshoe curve
    1:  { x: 86, y: 44, rot: -88 },
    2:  { x: 84, y: 35, rot: -80 },
    3:  { x: 81, y: 26, rot: -70 },
    4:  { x: 77, y: 17, rot: -55 },
    5:  { x: 71, y: 10, rot: -40 },
    6:  { x: 64, y: 5,  rot: -25 },
    7:  { x: 57, y: 2,  rot: -10 },
    8:  { x: 52, y: 1,  rot: -3 },
    9:  { x: 48, y: 1,  rot: 3 },
    10: { x: 43, y: 2,  rot: 10 },
    11: { x: 36, y: 5,  rot: 25 },
    12: { x: 29, y: 10, rot: 40 },
    13: { x: 23, y: 17, rot: 55 },
    14: { x: 19, y: 26, rot: 70 },
    15: { x: 16, y: 35, rot: 80 },
    16: { x: 14, y: 44, rot: 88 },

    // LOWER PERMANENT (17-32) - Tapered V-horseshoe
    17: { x: 14, y: 56, rot: 92 },
    18: { x: 16, y: 65, rot: 100 },
    19: { x: 19, y: 75, rot: 110 },
    20: { x: 23, y: 84, rot: 125 },
    21: { x: 30, y: 91, rot: 140 },
    22: { x: 37, y: 96, rot: 155 },
    23: { x: 44, y: 98, rot: 170 },
    24: { x: 48.5, y: 99, rot: 177 },
    25: { x: 51.5, y: 99, rot: -177 },
    26: { x: 56, y: 98, rot: -170 },
    27: { x: 63, y: 96, rot: -155 },
    28: { x: 70, y: 91, rot: -140 },
    29: { x: 77, y: 84, rot: -125 },
    30: { x: 81, y: 75, rot: -110 },
    31: { x: 84, y: 65, rot: -100 },
    32: { x: 86, y: 56, rot: -92 },

    // UPPER PRIMARY (A-J) - Nested inner layer
    'A': { x: 74, y: 34, rot: -90 },
    'B': { x: 72, y: 26, rot: -75 },
    'C': { x: 68, y: 19, rot: -55 },
    'D': { x: 61, y: 14, rot: -30 },
    'E': { x: 53, y: 12, rot: -5 },
    'F': { x: 47, y: 12, rot: 5 },
    'G': { x: 39, y: 14, rot: 30 },
    'H': { x: 32, y: 19, rot: 55 },
    'I': { x: 28, y: 26, rot: 75 },
    'J': { x: 26, y: 34, rot: 90 },

    // LOWER PRIMARY (K-T) - Nested inner layer
    'K': { x: 26, y: 66, rot: 90 },
    'L': { x: 28, y: 74, rot: 105 },
    'M': { x: 32, y: 81, rot: 125 },
    'N': { x: 39, y: 85, rot: 150 },
    'O': { x: 47, y: 87, rot: 175 },
    'P': { x: 53, y: 87, rot: -175 },
    'Q': { x: 61, y: 85, rot: -150 },
    'R': { x: 68, y: 81, rot: -125 },
    'S': { x: 72, y: 74, rot: -105 },
    'T': { x: 74, y: 66, rot: -90 },
  };

  const allTeethIds = [
    ...Array.from({ length: 16 }, (_, i) => i + 1), 
    ...['A','B','C','D','E','F','G','H','I','J'], 
    ...Array.from({ length: 16 }, (_, i) => i + 17), 
    ...['K','L','M','N','O','P','Q','R','S','T']
  ];

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] font-sans selection:bg-sky-100">
      {/* Precision Navigation Header */}
      <header className="flex items-center justify-between px-10 py-5 bg-white border-b border-slate-200 z-50 shadow-sm">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
             <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
               Clinical Odontogram 
               <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">v2.0</span>
             </h1>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Diagnostic Dental Charting</p>
          </div>
          
          <div className="h-10 w-px bg-slate-100 mx-2" />

          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50/80 border border-slate-200 rounded-2xl transition-all focus-within:ring-2 focus-within:ring-sky-500/20">
            <History className="w-4 h-4 text-slate-400" />
            <select 
              value={activeChartId} 
              onChange={(e) => setActiveChartId(e.target.value)} 
              className="bg-transparent border-none outline-none appearance-none cursor-pointer pr-6 font-bold text-slate-700 min-w-[160px]"
            >
              {charts.map(chart => <option key={chart.id} value={chart.id}>{chart.date}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 border border-slate-200 rounded-2xl group">
              <ImageIcon className="w-4 h-4 text-sky-500" />
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Arch Opacity</label>
              <input 
                type="range" 
                min="0" max="1" step="0.1" 
                value={tracingOpacity} 
                onChange={(e) => setTracingOpacity(parseFloat(e.target.value))} 
                className="w-24 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500" 
              />
          </div>
          
          <button 
            onClick={handleNewChart} 
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-sky-600 text-white rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-95 font-black text-sm"
          >
            <Plus className="w-4 h-4" />
            New Chart
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden relative">
        <section className="flex-1 flex items-center justify-center bg-[#f1f5f9] p-16 overflow-auto">
          <div className="relative w-full max-w-[850px] aspect-[3/4] bg-white rounded-[60px] shadow-3xl shadow-slate-900/10 border-[12px] border-white p-12">
            
            {/* ANATOMICAL GUM ARCH - Strict alignment with Reference */}
            <div 
              className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-700"
              style={{ 
                opacity: tracingOpacity,
                backgroundImage: `url(${gumBackground})`,
                backgroundSize: '95% 95%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            />

            {/* Render Precision Teeth */}
            {allTeethIds.map(id => {
              const pos = archPositions[id];
              if (!pos) return null;
              
              const isPrimary = typeof id === 'string';
              const toothScale = isPrimary ? 1.05 : 1.35;
              const containerSize = isPrimary ? 50 : 66;

              // Orbit labels with precise spacing
              const labelRadius = isPrimary ? 28 : 42;
              const rad = (pos.rot) * (Math.PI / 180);
              const lx = Math.sin(rad) * labelRadius;
              const ly = -Math.cos(rad) * labelRadius;

              return (
                <div 
                  key={id} 
                  className="absolute z-10" 
                  style={{ 
                    left: `${pos.x}%`, 
                    top: `${pos.y}%`, 
                    transform: `translate(-50%, -50%)`, 
                    width: `${containerSize}px`, 
                    height: `${containerSize}px` 
                  }}
                >
                  <RealisticTooth 
                    id={id} 
                    data={teeth[id]} 
                    isSelected={selectedTooth === id} 
                    onToothClick={handleToothClick} 
                    view="occlusal" 
                    rotation={pos.rot} 
                    scale={toothScale}
                    labelOffset={{ x: lx, y: ly }}
                  />
                </div>
              );
            })}

            {/* Legend Labels */}
            <div className="absolute top-8 left-12 text-[10px] font-black text-slate-300 uppercase tracking-widest">Upper Right</div>
            <div className="absolute top-8 right-12 text-[10px] font-black text-slate-300 uppercase tracking-widest">Upper Left</div>
            <div className="absolute bottom-8 right-12 text-[10px] font-black text-slate-300 uppercase tracking-widest">Lower Left</div>
            <div className="absolute bottom-8 left-12 text-[10px] font-black text-slate-300 uppercase tracking-widest">Lower Right</div>
          </div>
        </section>

        {/* Sidebar Controls */}
        <ToothDetailsSidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          selectedTooth={selectedTooth} 
          toothData={selectedTooth ? teeth[selectedTooth] : null} 
          onUpdateTooth={handleUpdateTooth} 
          onSelectTooth={handleToothClick} 
          allTeethIds={allTeethIds} 
        />
      </main>
    </div>
  );
}