import React, { useState } from 'react';
import { ToothData, Surface, Condition } from './Tooth';
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
  ChevronDown
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
        lingual: 'healthy'
      },
      generalCondition: 'healthy',
      isPermanent: true, // All teeth default to permanent
      notes: ''
    };
  }
  return data;
};

interface ChartRecord {
  id: string;
  date: string;
  data: Record<number, ToothData>;
}

export function DentalChart() {
  // Initialize with one chart
  const [charts, setCharts] = useState<ChartRecord[]>([
    { 
      id: '1', 
      date: new Date().toLocaleString(), 
      data: createInitialTeethData() 
    }
  ]);
  const [activeChartId, setActiveChartId] = useState<string>('1');
  const [selectedTooth, setSelectedTooth] = useState<number | null>(12); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Derived active teeth data
  const activeChart = charts.find(c => c.id === activeChartId) || charts[0];
  const teeth = activeChart.data;

  const handleToothClick = (id: number) => {
    setSelectedTooth(id);
    setIsSidebarOpen(true);
  };

  const handleUpdateTooth = (id: number, updates: Partial<ToothData>) => {
    setCharts(prevCharts => prevCharts.map(chart => {
      if (chart.id === activeChartId) {
        return {
          ...chart,
          data: {
            ...chart.data,
            [id]: { ...chart.data[id], ...updates }
          }
        };
      }
      return chart;
    }));
  };

  const handleNewChart = () => {
    if (window.confirm('Create a new chart for this patient? Previous charts will be saved.')) {
      const newId = (charts.length + 1).toString();
      const newChart: ChartRecord = {
        id: newId,
        date: new Date().toLocaleString(),
        data: createInitialTeethData()
      };
      
      setCharts(prev => [...prev, newChart]);
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
                {charts.map(chart => (
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
               {Array.from({ length: 16 }, (_, i) => i + 1).map(id => (
                 <div key={id} className={id === 8 ? "mr-4" : ""}>
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
               {Array.from({ length: 16 }, (_, i) => i + 1).map(id => (
                 <div key={id} className={id === 8 ? "mr-4" : ""}>
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
                  {Array.from({ length: 16 }, (_, i) => i + 1).map(id => (
                    <div 
                      key={id} 
                      className={cn(
                        "w-10 text-center transition-colors", 
                        id === 8 && "mr-4",
                        selectedTooth === id && "bg-yellow-400 text-yellow-900 font-bold rounded-full"
                      )}
                    >
                      {id}
                    </div>
                  ))}
               </div>
               
               {/* Lower Numbers (Reversed: 32 down to 17) */}
               <div className="flex justify-center gap-1 text-xs text-slate-400 font-medium">
                  {Array.from({ length: 16 }, (_, i) => 32 - i).map(id => (
                    <div 
                      key={id} 
                      className={cn(
                        "w-10 text-center transition-colors", 
                        id === 25 && "mr-4",
                        selectedTooth === id && "bg-yellow-400 text-yellow-900 font-bold rounded-full"
                      )}
                    >
                      {id}
                    </div>
                  ))}
               </div>
            </div>

            {/* Lower Arch Crowns (Occlusal) */}
            <div className="flex justify-center gap-1 z-10">
               {Array.from({ length: 16 }, (_, i) => 32 - i).map(id => (
                 <div key={id} className={id === 25 ? "mr-4" : ""}>
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
               {Array.from({ length: 16 }, (_, i) => 32 - i).map(id => (
                 <div key={id} className={id === 25 ? "mr-4" : ""}>
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

          </div>
        </div>

        {/* Right Controls (Floating) */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 bg-white shadow-lg border border-slate-200 rounded-lg p-2">
           <button className="p-2 hover:bg-slate-100 rounded text-sky-500">
             <Layers className="w-5 h-5" />
           </button>
           <div className="w-full h-px bg-slate-200" />
           <button className="p-2 hover:bg-slate-100 rounded text-slate-400">
             <Grid className="w-5 h-5" />
           </button>
           <button className="p-2 hover:bg-slate-100 rounded text-slate-400">
             <Maximize2 className="w-5 h-5" />
           </button>
        </div>

        {/* Bottom Right Help */}
        <div className="absolute bottom-6 right-6">
           <button className="w-10 h-10 rounded-full border border-slate-800 flex items-center justify-center hover:bg-slate-50">
             <HelpCircle className="w-6 h-6 text-slate-700" />
           </button>
        </div>

        {/* Sidebar */}
        <ToothDetailsSidebar 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          selectedTooth={selectedTooth}
          toothData={selectedTooth ? teeth[selectedTooth] : null}
          onUpdateTooth={handleUpdateTooth}
          onSelectTooth={handleToothClick}
        />
      </div>
    </div>
  );
}