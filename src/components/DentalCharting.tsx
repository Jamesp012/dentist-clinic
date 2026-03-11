import { useState, useEffect } from 'react';
import { Patient, TreatmentRecord } from '../App';
import { ToothData } from './Tooth';
import { RealisticTooth } from './dental/RealisticTooth';
import { ToothDetailsSidebar } from './dental/ToothDetailsSidebar';
import { 
  Plus,
  History,
  X,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

type DentalChartingProps = {
  patients: Patient[];
  treatmentRecords: TreatmentRecord[];
  setTreatmentRecords: (records: TreatmentRecord[]) => void;
};

// Tooth ID sets
const UPPER_PERMANENT_IDS = Array.from({ length: 16 }, (_, i) => i + 1); // 1-16
const LOWER_PERMANENT_IDS = Array.from({ length: 16 }, (_, i) => i + 17); // 17-32

// Primary teeth (A-T) mapped to numeric ids so we can reuse ToothData/RealisticTooth
// A-E (upper right to upper left) => 101-105, 106-110
// K-O (lower left) & P-T (lower right) => 111-115, 116-120
const UPPER_PRIMARY_IDS = Array.from({ length: 10 }, (_, i) => 101 + i); // 101-110 (A-J)
const LOWER_PRIMARY_IDS = Array.from({ length: 10 }, (_, i) => 111 + i); // 111-120 (K-T)

const PRIMARY_LABELS: Record<number, string> = {
  101: 'A',
  102: 'B',
  103: 'C',
  104: 'D',
  105: 'E',
  106: 'F',
  107: 'G',
  108: 'H',
  109: 'I',
  110: 'J',
  111: 'K',
  112: 'L',
  113: 'M',
  114: 'N',
  115: 'O',
  116: 'P',
  117: 'Q',
  118: 'R',
  119: 'S',
  120: 'T'
};

// Helper to create fresh initial state
const createInitialTeethData = (): Record<number, ToothData> => {
  const data: Record<number, ToothData> = {};
  const allIds = [
    ...UPPER_PERMANENT_IDS,
    ...LOWER_PERMANENT_IDS,
    ...UPPER_PRIMARY_IDS,
    ...LOWER_PRIMARY_IDS
  ];

  for (const id of allIds) {
    data[id] = {
      id,
      surfaces: {
        occlusal: 'healthy',
        mesial: 'healthy',
        distal: 'healthy',
        buccal: 'healthy',
        lingual: 'healthy'
      },
      generalCondition: 'healthy',
      // Primary teeth use the lighter outline from RealisticTooth
      isPermanent: id <= 32,
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
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);
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
  const [archOpacity, setArchOpacity] = useState(0.9);

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
    if (!selectedPatient) {
      toast.info('Please select a patient first.');
      return;
    }

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

  const handleSaveChart = () => {
    if (!selectedPatient) {
      toast.info('Please select a patient first.');
      return;
    }

    if (!activeChart) {
      toast.error('No chart available to save.');
      return;
    }

    saveDentalChartToStorage(activeChart);
    toast.success('Dental chart saved');
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(patientSearch.trim().toLowerCase())
  );

  const recentPatientIds: Array<string | number> = JSON.parse(
    localStorage.getItem('dentalChart_recentPatients') || '[]'
  );

  const recentPatients = recentPatientIds
    .map(id => patients.find(patient => String(patient.id) === String(id)))
    .filter((patient): patient is Patient => Boolean(patient));

  const recentlyAddedPatients = [...patients].slice(-5).reverse();

  const suggestionPatients = patientSearch.trim()
    ? filteredPatients
    : [
        ...recentPatients,
        ...recentlyAddedPatients.filter(
          patient => !recentPatients.some(recent => String(recent.id) === String(patient.id))
        )
      ];

  return (
    <div className="flex flex-col h-full bg-white font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-slate-200">
        <div className="flex items-center gap-6">
          <div className="text-xl font-medium text-slate-500">
            {selectedPatient?.name || 'Select Patient'}
          </div>
          
          {/* Patient Selector */}
          <div className="relative">
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => {
                const value = e.target.value;
                setPatientSearch(value);
                setShowPatientSuggestions(true);
                if (!value.trim()) {
                  setSelectedPatient(null);
                }
              }}
              onFocus={() => setShowPatientSuggestions(true)}
              onBlur={() => setTimeout(() => setShowPatientSuggestions(false), 150)}
              placeholder="Search patient..."
              className="px-3 py-1.5 bg-slate-50 border border-cyan-200 rounded-md text-sm text-slate-600 hover:border-teal-300 transition-colors w-64 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
            />
            {showPatientSuggestions && (
              <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg">
                {suggestionPatients.length > 0 ? (
                  suggestionPatients.map(patient => (
                    <button
                      key={patient.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedPatient(patient);
                        setPatientSearch(patient.name);
                        setShowPatientSuggestions(false);
                        const nextRecent = [patient.id, ...recentPatientIds.filter(id => String(id) !== String(patient.id))].slice(0, 5);
                        localStorage.setItem('dentalChart_recentPatients', JSON.stringify(nextRecent));
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {patient.name}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-slate-400">No matching patients</div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (!selectedPatient) {
                toast.info('Please select a patient first.');
                return;
              }
              setIsHistoryOpen(!isHistoryOpen);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-600 hover:border-slate-300 transition-colors"
            title="View patient charts"
          >
            <History className="w-4 h-4 text-slate-400" />
            <span>View {selectedPatient?.name || 'Patient'}&#39;s Charts</span>
          </button>
          
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="uppercase tracking-[0.16em] text-[10px] text-slate-400">Arch Opacity</span>
            <input
              type="range"
              min={40}
              max={100}
              value={Math.round(archOpacity * 100)}
              onChange={(e) => setArchOpacity(Number(e.target.value) / 100)}
              className="w-32 accent-sky-500 cursor-pointer"
            />
          </div>

          <button 
            onClick={handleSaveChart}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-sm transition-colors font-medium text-sm"
          >
            <Save className="w-4 h-4" />
            Save Chart
          </button>

          <button 
            onClick={handleNewChart}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg shadow-sm transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Chart
          </button>
        </div>
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
          <div className="relative max-w-5xl w-full flex flex-col items-center gap-6">
            {/* Modern Legends Container */}
            <div className="relative w-full max-w-4xl p-10 mb-6 rounded-3xl bg-white/70 backdrop-blur-xl border border-slate-200/50 shadow-lg overflow-hidden group">

  {/* Top Gradient Glow */}
  <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[28rem] h-[16rem] 
    bg-gradient-to-r from-teal-400/20 via-cyan-400/20 to-blue-400/20 
    rounded-full opacity-60 pointer-events-none" />

  <div className="relative flex flex-col gap-10">

    {/* Tooth Type Legend */}
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div className="flex items-center gap-4 group/item">
        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-300 flex items-center justify-center shadow-sm transition-transform group-hover/item:scale-110">
          <div className="w-6 h-6 rounded-full border border-slate-200 bg-slate-50/50" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Permanent</span>
          <span className="text-[10px] font-semibold text-slate-400">Outer Ring (1-32)</span>
        </div>
      </div>

      <div className="flex items-center gap-4 group/item">
        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-300 flex items-center justify-center shadow-sm transition-transform group-hover/item:scale-110">
          <div className="w-4 h-4 rounded-full border border-slate-100 bg-slate-50/30" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Primary</span>
          <span className="text-[10px] font-semibold text-slate-400">Inner Ring (A-T)</span>
        </div>
      </div>

      <div className="flex items-center gap-4 group/item">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shadow-sm transition-transform group-hover/item:scale-110">
          <div className="w-6 h-6 rounded-full bg-rose-200/80" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-black text-rose-600 uppercase tracking-wider">Gums</span>
          <span className="text-[10px] font-semibold text-rose-300">Tissue Base</span>
        </div>
      </div>
    </div>

    {/* Modern Status Divider */}
    <div className="relative flex items-center justify-center">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-slate-200" />
      </div>
      <div className="relative px-6 py-1 bg-white/90 rounded-full border border-slate-200">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Condition Glossary</span>
      </div>
    </div>

    {/* Condition Legend - Modern Pills */}
    <div className="flex flex-wrap items-center justify-center gap-3">
      <div className="flex items-center gap-2.5 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm text-xs font-bold text-slate-700 transition-all hover:border-slate-400 hover:shadow-md">
        <div className="w-3.5 h-3.5 rounded-full bg-slate-800/40 blur-sm" />
        Caries / Decay
      </div>
      <div className="flex items-center gap-2.5 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm text-xs font-bold text-slate-700 transition-all hover:border-slate-400 hover:shadow-md">
        <div className="w-3.5 h-3.5 rounded-md bg-gradient-to-br from-amber-300 to-amber-600 shadow" />
        Crown / Gold
      </div>
      <div className="flex items-center gap-2.5 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm text-xs font-bold text-slate-700 transition-all hover:border-slate-400 hover:shadow-md">
        <div className="w-3.5 h-3.5 rounded-md bg-gradient-to-br from-slate-300 to-slate-500 shadow" />
        Amalgam
      </div>
      <div className="flex items-center gap-2.5 px-4 py-2 bg-rose-50 border border-rose-100 rounded-2xl shadow-sm text-xs font-bold text-rose-600 transition-all hover:border-rose-300 hover:shadow-md">
        <div className="relative w-3.5 h-3.5">
          <div className="absolute inset-0 bg-rose-500 rotate-45 w-full h-0.5 top-1/2 -translate-y-1/2 rounded-full" />
          <div className="absolute inset-0 bg-rose-500 -rotate-45 w-full h-0.5 top-1/2 -translate-y-1/2 rounded-full" />
        </div>
        Extraction
      </div>
      <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-xs font-bold text-slate-400">
        <div className="w-3.5 h-3.5 rounded-md border-2 border-dashed border-slate-300" />
        Missing
      </div>
    </div>

  </div>
</div>

            {/* Occlusal-style Double Arch Layout */}
            {(() => {
              const CHART_WIDTH = 640;
              const CHART_HEIGHT = 760;

              return (
                <div
                  className="relative"
                  style={{ width: CHART_WIDTH, height: CHART_HEIGHT }}
                >
                  {/* Upper gum background */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 bg-rose-200/90"
                    style={{ top: 60, width: 380, height: 240, borderRadius: '220px 220px 140px 140px', opacity: archOpacity }}
                  />
                  <div
                    className="absolute left-1/2 -translate-x-1/2 bg-rose-100"
                    style={{ top: 95, width: 280, height: 180, borderRadius: '220px 220px 140px 140px', opacity: archOpacity }}
                  />

                  {/* Lower gum background */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 bg-rose-200/90"
                    style={{ bottom: 60, width: 380, height: 240, borderRadius: '140px 140px 220px 220px', opacity: archOpacity }}
                  />
                  <div
                    className="absolute left-1/2 -translate-x-1/2 bg-rose-100"
                    style={{ bottom: 95, width: 280, height: 180, borderRadius: '140px 140px 220px 220px', opacity: archOpacity }}
                  />

                  {/* Helper to render teeth on an arc that follows the jaw */}
                  {(() => {
                    const renderArc = (
                      ids: number[],
                      options: {
                        centerX: number;
                        centerY: number;
                        radiusX: number;
                        radiusY: number;
                        startAngle: number;
                        endAngle: number;
                        labelPrimary?: boolean;
                      }
                    ) => {
                      const { centerX, centerY, radiusX, radiusY, startAngle, endAngle, labelPrimary } = options;

                      return ids.map((id, index) => {
                        const t = ids.length === 1 ? 0.5 : index / (ids.length - 1);
                        const angleDeg = startAngle + t * (endAngle - startAngle);
                        const angleRad = (angleDeg * Math.PI) / 180;
                        const x = centerX + radiusX * Math.cos(angleRad);
                        const y = centerY + radiusY * Math.sin(angleRad);
                        const label = labelPrimary ? PRIMARY_LABELS[id] : id;

                        const toothData = teeth[id];
                        if (!toothData) return null;

                        return (
                          <div
                            key={id}
                            className="absolute flex flex-col items-center"
                            style={{
                              left: `${x}px`,
                              top: `${y}px`,
                              transform: 'translate(-50%, -50%) scale(0.9)'
                            }}
                          >
                            <RealisticTooth
                              id={id}
                              data={toothData}
                              isSelected={selectedTooth === id}
                              onToothClick={handleToothClick}
                              view="occlusal"
                            />
                            <span
                              className={`mt-0.5 text-[10px] font-medium ${
                                selectedTooth === id ? 'text-sky-600' : 'text-slate-500'
                              }`}
                            >
                              {label}
                            </span>
                          </div>
                        );
                      });
                    };

                    const cx = CHART_WIDTH / 2;

                    return (
                      <>
                        {/* Upper permanent (1-16) outer arc closely following outer gum */}
                        {renderArc(UPPER_PERMANENT_IDS, {
                          centerX: cx,
                          centerY: 210,
                          radiusX: 190,
                          radiusY: 155,
                          startAngle: 205,
                          endAngle: 335
                        })}

                        {/* Upper primary (A-J) inner arc following inner gum */}
                        {renderArc(UPPER_PRIMARY_IDS, {
                          centerX: cx,
                          centerY: 215,
                          radiusX: 150,
                          radiusY: 120,
                          startAngle: 205,
                          endAngle: 335,
                          labelPrimary: true
                        })}

                        {/* Lower permanent (17-32) outer arc */}
                        {renderArc(LOWER_PERMANENT_IDS, {
                          centerX: cx,
                          centerY: CHART_HEIGHT - 210,
                          radiusX: 190,
                          radiusY: 155,
                          startAngle: 25,
                          endAngle: 155
                        })}

                        {/* Lower primary (K-T) inner arc */}
                        {renderArc(LOWER_PRIMARY_IDS, {
                          centerX: cx,
                          centerY: CHART_HEIGHT - 215,
                          radiusX: 150,
                          radiusY: 120,
                          startAngle: 25,
                          endAngle: 155,
                          labelPrimary: true
                        })}
                      </>
                    );
                  })()}
                </div>
              );
            })()}
          </div>
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
