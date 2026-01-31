import { useState, useEffect } from 'react';
import { Patient, TreatmentRecord } from '../App';
import { ToothData } from './Tooth';
import { RealisticTooth } from './dental/RealisticTooth';
import { ToothDetailsSidebar } from './dental/ToothDetailsSidebar';
import { 
  HelpCircle,
  Layers,
  Grid,
  Maximize2,
  Plus,
  History,
  ChevronDown,
  X
} from 'lucide-react';
import { toast } from 'sonner';

type DentalChartingProps = {
  patients: Patient[];
  treatmentRecords: TreatmentRecord[];
  setTreatmentRecords: (records: TreatmentRecord[]) => void;
};

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
      isPermanent: true,
      notes: ''
    };
  }
  return data;
};

interface ChartRecord {
  id: string;
  date: string;
  patientId?: number | string;
  data: Record<number, ToothData>;
}

export function DentalCharting({ patients }: DentalChartingProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const activeChart = charts.find(c => c.id === activeChartId) || charts[0];
  const teeth = activeChart.data;

  const handleToothClick = (id: number) => {
    setSelectedTooth(id);
    setIsSidebarOpen(true);
  };

  const handleUpdateTooth = (id: number, updates: Partial<ToothData>) => {
    setCharts(prevCharts => prevCharts.map(chart => {
      if (chart.id === activeChartId) {
        const updatedChart = {
          ...chart,
          data: {
            ...chart.data,
            [id]: { ...chart.data[id], ...updates }
          }
        };
        
        // Save to localStorage
        saveDentalChartToStorage(updatedChart);
        
        return updatedChart;
      }
      return chart;
    }));
  };

  // Save dental chart to localStorage
  const saveDentalChartToStorage = (chart: ChartRecord) => {
    if (!selectedPatient) return;
    
    const storageKey = `dentalChart_patient_${selectedPatient.id}_chart_${chart.id}`;
    localStorage.setItem(storageKey, JSON.stringify({
      id: chart.id,
      date: chart.date,
      patientId: selectedPatient.id,
      data: chart.data
    }));
    
    // Also save the list of chart IDs for this patient
    const chartsListKey = `dentalCharts_patient_${selectedPatient.id}`;
    const existingCharts = JSON.parse(localStorage.getItem(chartsListKey) || '[]');
    if (!existingCharts.includes(chart.id)) {
      existingCharts.push(chart.id);
      localStorage.setItem(chartsListKey, JSON.stringify(existingCharts));
    }
  };

  // Load dental charts from localStorage when patient is selected
  useEffect(() => {
    if (!selectedPatient) {
      setCharts([{ 
        id: '1', 
        date: new Date().toLocaleString(), 
        data: createInitialTeethData() 
      }]);
      setActiveChartId('1');
      return;
    }

    // Load saved charts for this patient
    const chartsListKey = `dentalCharts_patient_${selectedPatient.id}`;
    const chartIds = JSON.parse(localStorage.getItem(chartsListKey) || '[]');
    
    if (chartIds.length === 0) {
      // No saved charts, create initial one
      const initialChart = { 
        id: '1', 
        date: new Date().toLocaleString(),
        patientId: selectedPatient.id,
        data: createInitialTeethData() 
      };
      setCharts([initialChart]);
      setActiveChartId('1');
      saveDentalChartToStorage(initialChart);
    } else {
      // Load all saved charts
      const loadedCharts: ChartRecord[] = [];
      chartIds.forEach((chartId: string) => {
        const storageKey = `dentalChart_patient_${selectedPatient.id}_chart_${chartId}`;
        const savedChart = localStorage.getItem(storageKey);
        if (savedChart) {
          loadedCharts.push(JSON.parse(savedChart));
        }
      });
      
      if (loadedCharts.length > 0) {
        setCharts(loadedCharts);
        setActiveChartId(loadedCharts[loadedCharts.length - 1].id);
      }
    }
  }, [selectedPatient]);

  const handleNewChart = () => {
    if (window.confirm('Create a new chart for this patient? Previous charts will be saved.')) {
      const newId = (charts.length + 1).toString();
      const newChart: ChartRecord = {
        id: newId,
        date: new Date().toLocaleString(),
        patientId: selectedPatient?.id,
        data: createInitialTeethData()
      };
      
      setCharts(prev => [...prev, newChart]);
      setActiveChartId(newId);
      setSelectedTooth(null);
      setIsSidebarOpen(false);
      
      // Save new chart to localStorage
      saveDentalChartToStorage(newChart);
      
      toast.success('New chart created and saved');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-slate-200">
        <div className="flex items-center gap-6">
          <div className="text-xl font-medium text-slate-500">
            {selectedPatient?.name || 'Select Patient'}
          </div>
          
          {/* Patient Selector */}
          <select 
            value={selectedPatient?.id || ''}
            onChange={(e) => {
              const patient = patients.find(p => p.id.toString() === e.target.value);
              setSelectedPatient(patient || null);
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-600 hover:border-slate-300 transition-colors cursor-pointer"
          >
            <option value="">Select Patient...</option>
            {patients.map(patient => (
              <option key={patient.id} value={patient.id}>
                {patient.name}
              </option>
            ))}
          </select>
          
          {/* Chart History Selector */}
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
        {/* Dental History Sidebar */}
        {selectedPatient && isHistoryOpen && (
          <div className="w-80 bg-slate-50 border-r border-slate-200 overflow-y-auto">
            <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-700">Dental Chart History</h3>
                <button 
                  onClick={() => setIsHistoryOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {selectedPatient.name} - {charts.length} chart{charts.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            <div className="p-4 space-y-2">
              {charts.map((chart) => (
                <button
                  key={chart.id}
                  onClick={() => {
                    setActiveChartId(chart.id);
                    setSelectedTooth(null);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    activeChartId === chart.id
                      ? 'bg-sky-500 text-white border-sky-600 shadow-md'
                      : 'bg-white border-slate-200 hover:border-sky-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4" />
                      <span className="font-medium text-sm">{chart.date}</span>
                    </div>
                    {activeChartId === chart.id && (
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded">Active</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs opacity-75">
                    Chart ID: {chart.id}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

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
                      className={`w-10 text-center transition-colors ${id === 8 ? "mr-4" : ""} ${selectedTooth === id ? "bg-yellow-400 text-yellow-900 font-bold rounded-full" : ""}`}
                    >
                      {id}
                    </div>
                  ))}
               </div>
               
               {/* Lower Numbers */}
               <div className="flex justify-center gap-1 text-xs text-slate-400 font-medium">
                  {Array.from({ length: 16 }, (_, i) => 32 - i).map(id => (
                    <div 
                      key={id} 
                      className={`w-10 text-center transition-colors ${id === 25 ? "mr-4" : ""} ${selectedTooth === id ? "bg-yellow-400 text-yellow-900 font-bold rounded-full" : ""}`}
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
           <button 
             onClick={() => setIsHistoryOpen(!isHistoryOpen)}
             className={`p-2 hover:bg-slate-100 rounded ${isHistoryOpen ? 'text-sky-600 bg-sky-50' : 'text-sky-500'}`}
             title="Toggle Chart History"
           >
             <History className="w-5 h-5" />
           </button>
           <div className="w-full h-px bg-slate-200" />
           <button className="p-2 hover:bg-slate-100 rounded text-slate-400">
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
