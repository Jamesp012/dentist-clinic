import { useState, useEffect, useCallback } from 'react';
import { Patient } from '../App';
import { 
  Palette, 
  History, 
  Save, 
  Settings,
  ChevronDown,
  LayoutGrid,
  MousePointer2,
  Share2,
  Printer,
  Move,
  Calendar,
  Sparkles,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { PatientSearch } from './PatientSearch';
import { formatToDD_MM_YYYY } from '../utils/dateHelpers';
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DentalChart } from './Orthodontic/DentalChart';
import { ColorPalette } from './Orthodontic/ColorPalette';
import { ColorHistory } from './Orthodontic/ColorHistory';

type BracesChartingProps = {
  patients: Patient[];
};

type ColorHistoryEntry = {
  date: string;
  colorName: string;
  colorValue: string;
  notes?: string;
  toothNumber?: number;
};

type PaymentRecord = {
  id: string;
  date: string;
  amount: number;
  description: string;
  type: 'payment' | 'charge';
};

type BracesData = {
  patientId: string;
  rubberBandColors: { [toothNumber: number]: string };
  bracketType: 'metal' | 'ceramic';
  colorHistory: ColorHistoryEntry[];
  paymentRecords: PaymentRecord[];
  totalCost: number;
  totalPaid: number;
  lastUpdated?: string;
  chartSnapshots?: ChartSnapshot[];
  currentBracketVisibility?: boolean[];
};

type ChartSnapshot = {
  id: string;
  timestamp: string;
  bracketColors: string[];
  bracketVisibility: boolean[];
};

// Orthodontic colors (updated palette)
const COLORS = [
  { name: 'No Color', value: 'transparent' },
  { name: 'Navy Blue', value: '#001F3F' },
  { name: 'Royal Blue', value: '#4169E1' },
  { name: 'Light Blue', value: '#7DD3FC' },
  { name: 'Teal', value: '#0D9488' },
  { name: 'Aqua', value: '#00CED1' },
  { name: 'Green', value: '#16A34A' },
  { name: 'Lime', value: '#A3E635' },
  { name: 'Yellow', value: '#FBBF24' },
  { name: 'Orange', value: '#FB923C' },
  { name: 'Coral', value: '#FF7F7F' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Bubblegum Pink', value: '#FFB6C1' },
  { name: 'Lilac', value: '#C8A2C8' },
  { name: 'Lavender', value: '#A78BFA' },
  { name: 'Purple', value: '#7C3AED' },
  { name: 'Burgundy', value: '#6B0216' },
  { name: 'Black', value: '#000000' },
  { name: 'Grey', value: '#6B7280' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Gold', value: '#FFD700' },
];


// Hard-coded percent positions for brackets (matches screenshot)
const FIXED_UPPER_POSITIONS = [
  { x: 11.13, y: 23.09 },
  { x: 13.73, y: 23.69 },
  { x: 17.25, y: 25.1 },
  { x: 21.54, y: 26.1 },
  { x: 26.62, y: 26.9 },
  { x: 31.7, y: 27.7 },
  { x: 37.04, y: 28.5 },
  { x: 45.11, y: 28.9 },
  { x: 53.96, y: 28.9 },
  { x: 61.78, y: 28.3 },
  { x: 68.03, y: 27.5 },
  { x: 73.24, y: 26.9 },
  { x: 78.31, y: 25.9 },
  { x: 82.74, y: 24.9 },
  { x: 86.26, y: 23.69 },
  { x: 89.25, y: 22.09 }
];
const FIXED_LOWER_POSITIONS = [
  { x: 11.65, y: 46 },
  { x: 15.16, y: 49.2 },
  { x: 20.37, y: 52.41 },
  { x: 25.58, y: 54.41 },
  { x: 31.44, y: 55.81 },
  { x: 36.52, y: 56.41 },
  { x: 41.72, y: 57.41 },
  { x: 46.93, y: 57.41 },
  { x: 52.14, y: 57.21 },
  { x: 57.61, y: 57.01 },
  { x: 63.08, y: 56.41 },
  { x: 68.81, y: 55.81 },
  { x: 74.15, y: 54.59 },
  { x: 79.75, y: 51.16 },
  { x: 84.3, y: 48.36 },
  { x: 89.12, y: 45.35 }
];

// Available rubber band colors
const rubberBandColorOptions = [
  { name: 'Clear', value: '#E8F4F8', stroke: '#B0C4DE' },
  { name: 'Red', value: '#FF6B6B', stroke: '#DC143C' },
  { name: 'Blue', value: '#4ECDC4', stroke: '#1E90FF' },
  { name: 'Green', value: '#95E1D3', stroke: '#32CD32' },
  { name: 'Purple', value: '#C197D2', stroke: '#9370DB' },
  { name: 'Pink', value: '#FFB6C1', stroke: '#FF69B4' },
  { name: 'Orange', value: '#FFB347', stroke: '#FF8C00' },
  { name: 'Yellow', value: '#FFE66D', stroke: '#FFD700' },
  { name: 'Teal', value: '#06D6A0', stroke: '#008B8B' },
  { name: 'Lime', value: '#C7F464', stroke: '#7FFF00' },
  { name: 'Turquoise', value: '#4DD0E1', stroke: '#00CED1' },
  { name: 'Lavender', value: '#DCC6E0', stroke: '#9966CC' },
  { name: 'Coral', value: '#FF7F7F', stroke: '#FF6347' },
  { name: 'Mint', value: '#B5EAD7', stroke: '#98FF98' },
  { name: 'Gold', value: '#FFD700', stroke: '#DAA520' },
  { name: 'Silver', value: '#C0C0C0', stroke: '#A9A9A9' },
];

export function BracesCharting({ patients }: BracesChartingProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [bracesData, setBracesData] = useState<{ [patientId: string]: BracesData }>({});
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [activeTab, setActiveTab] = useState<"palette" | "history">("palette");
  const [selectionMode, setSelectionMode] = useState<"single" | "all">("all");
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [previewColors, setPreviewColors] = useState<string[]>(new Array(32).fill(COLORS[0].value));
  const [bracketColors, setBracketColors] = useState<string[]>(new Array(32).fill(COLORS[0].value));
  // Use static, hard-coded percent positions
  const [upperPositions] = useState(FIXED_UPPER_POSITIONS);
  const [lowerPositions] = useState(FIXED_LOWER_POSITIONS);
  const [bracketVisibility, setBracketVisibility] = useState<boolean[]>(new Array(32).fill(true));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // No normalization needed; positions are static

  const saveChanges = () => {
    if (!selectedPatient) return;

    const currentData = getPatientBracesData();
    const newHistoryEntry: ColorHistoryEntry = {
      date: new Date().toISOString(),
      colorName: selectedColor?.name || 'Manual Save',
      colorValue: selectedColor?.value || '',
      notes: `Saved current braces chart`
    };

    const snapshot: ChartSnapshot = {
      id: `${Date.now()}`,
      timestamp: new Date().toISOString(),
      bracketColors: [...previewColors],
      bracketVisibility: [...bracketVisibility],
    };

    setBracesData({
      ...bracesData,
      [selectedPatient.id]: {
        ...currentData,
        colorHistory: [newHistoryEntry, ...(currentData.colorHistory || [])],
        lastUpdated: new Date().toISOString(),
        currentBracketVisibility: [...bracketVisibility],
        chartSnapshots: [snapshot, ...(currentData.chartSnapshots || [])]
      }
    });

    // persist to localStorage so saved charts survive navigation / refresh
    try {
      const storageObj = {
        bracketColors: [...previewColors],
        chartSnapshots: [snapshot, ...(currentData.chartSnapshots || [])],
        colorHistory: [newHistoryEntry, ...(currentData.colorHistory || [])],
        currentBracketVisibility: [...bracketVisibility],
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(`ortho_chart_${selectedPatient.id}`, JSON.stringify(storageObj));
    } catch (e) {
      console.error('Failed to persist braces data to localStorage', e);
    }
    // reflect that changes are saved
    setBracketColors([...previewColors]);
    setHasUnsavedChanges(false);
    // Removed auto-download of JSON file on save
  };

  // Load data from localStorage on mount and apply fixed positions
  // No effect needed for static positions
  const upperTeeth = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const lowerTeeth = [32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17];

  const getPatientBracesData = (): BracesData => {
    if (!selectedPatient) return { patientId: '', rubberBandColors: {}, bracketType: 'metal', colorHistory: [], paymentRecords: [], totalCost: 0, totalPaid: 0 };
    
    if (!bracesData[selectedPatient.id]) {
      const defaultColors: { [toothNumber: number]: string } = {};
      [...upperTeeth, ...lowerTeeth].forEach(tooth => {
        defaultColors[tooth as number] = COLORS[0].value;
      });
      
      return {
        patientId: String(selectedPatient.id),
        rubberBandColors: defaultColors,
        bracketType: 'metal',
        colorHistory: [],
        paymentRecords: [],
        totalCost: 0,
        totalPaid: 0,
        chartSnapshots: [],
        currentBracketVisibility: new Array(32).fill(true)
      };
    }
    
    return bracesData[selectedPatient.id];
  };

  // Sync bracket visibility when patient changes
  useEffect(() => {
    if (!selectedPatient) return;
    const data = bracesData[selectedPatient.id];
    if (data && Array.isArray(data.currentBracketVisibility) && data.currentBracketVisibility.length === 32) {
      setBracketVisibility(data.currentBracketVisibility);
    } else {
      setBracketVisibility(new Array(32).fill(true));
    }
  }, [selectedPatient, bracesData]);

  // Load persisted braces data from localStorage when patient selected
  useEffect(() => {
    if (!selectedPatient) return;
    try {
      const saved = localStorage.getItem(`ortho_chart_${selectedPatient.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        const entry: BracesData = {
          patientId: String(selectedPatient.id),
          rubberBandColors: {},
          bracketType: 'metal',
          colorHistory: parsed.colorHistory || [],
          paymentRecords: [],
          totalCost: 0,
          totalPaid: 0,
          lastUpdated: parsed.lastUpdated || new Date().toISOString(),
          chartSnapshots: parsed.chartSnapshots || [],
          currentBracketVisibility: parsed.currentBracketVisibility || new Array(32).fill(true)
        };

        setBracesData(prev => ({ ...prev, [selectedPatient.id]: entry }));
      }
    } catch (e) {
      console.error('Failed to load persisted braces data', e);
    }
  }, [selectedPatient]);

  const handleColorSelect = (color: typeof COLORS[0]) => {
    setSelectedColor(color);
    if (selectionMode === "all") {
      setPreviewColors(new Array(32).fill(color.value));
    } else if (selectedIndices.length > 0) {
      const newPreview = [...previewColors];
      selectedIndices.forEach(idx => {
        newPreview[idx] = color.value;
      });
      setPreviewColors(newPreview);
    }
  };

  // applyColors removed — preview changes are live and saved only when Save is clicked

  const toggleToothSelection = (index: number) => {
    if (selectionMode === "all") {
      setSelectionMode("single");
      setSelectedIndices([index]);
      const newPreview = [...bracketColors];
      newPreview[index] = selectedColor.value;
      setPreviewColors(newPreview);
    } else {
      const isSelected = selectedIndices.includes(index);
      let newIndices;
      if (isSelected) {
        newIndices = selectedIndices.filter(i => i !== index);
      } else {
        newIndices = [...selectedIndices, index];
      }
      setSelectedIndices(newIndices);
      
      const newPreview = [...bracketColors];
      newIndices.forEach(idx => {
        newPreview[idx] = selectedColor.value;
      });
      setPreviewColors(newPreview);
    }
  };


  // Bracket positions are static; no handler needed

  const updateBracketVisibility = (makeVisible: boolean) => {
    if (!selectedPatient) return;
    if (selectedIndices.length === 0) return; // require explicit selection for individual control

    const indices = selectedIndices;

    const nextVisibility = [...bracketVisibility];
    indices.forEach(idx => {
      if (idx >= 0 && idx < nextVisibility.length) {
        nextVisibility[idx] = makeVisible;
      }
    });

    // Just update visibility visually; only persist when user clicks Save
    setBracketVisibility(nextVisibility);
    setHasUnsavedChanges(true);
  };

  // Sync bracket colors and preview when patient or stored data changes
  useEffect(() => {
    if (!selectedPatient) return;
    const data = bracesData[selectedPatient.id];
    if (data && Array.isArray(data.chartSnapshots) && data.chartSnapshots.length > 0) {
      const latest = data.chartSnapshots[0];
      if (Array.isArray(latest.bracketColors) && latest.bracketColors.length === 32) {
        setBracketColors([...latest.bracketColors]);
        setPreviewColors([...latest.bracketColors]);
      }
      if (Array.isArray(data.currentBracketVisibility) && data.currentBracketVisibility.length === 32) {
        setBracketVisibility([...data.currentBracketVisibility]);
      }
    } else {
      // fallback to defaults
      setBracketColors(new Array(32).fill(COLORS[0].value));
      setPreviewColors(new Array(32).fill(COLORS[0].value));
    }
    setHasUnsavedChanges(false);
  }, [selectedPatient, bracesData]);

  // Bracket positions are static; no effect needed for loading positions

  // Track unsaved changes by comparing preview vs last-saved bracketColors and visibility
  useEffect(() => {
    if (!selectedPatient) {
      setHasUnsavedChanges(false);
      return;
    }
    const data = bracesData[selectedPatient.id] || {} as BracesData;
    const savedVisibility = Array.isArray(data.currentBracketVisibility) ? data.currentBracketVisibility : new Array(32).fill(true);
    const colorsChanged = previewColors.some((c, i) => c !== bracketColors[i]);
    const visibilityChanged = savedVisibility.some((v, i) => v !== bracketVisibility[i]);
    setHasUnsavedChanges(colorsChanged || visibilityChanged);
  }, [previewColors, bracketVisibility, bracketColors, selectedPatient, bracesData]);

  const handleRemoveBrackets = () => {
    // If in 'all' mode, remove brackets from all teeth immediately
    if (selectionMode === 'all') {
      const nextVisibility = new Array(32).fill(false);
      setBracketVisibility(nextVisibility);
      setSelectedIndices([]);
      setHasUnsavedChanges(true);
      return;
    }

    // Default: remove for selected indices only
    updateBracketVisibility(false);
  };
  const handleAddBrackets = () => {
    // If in 'all' mode, add brackets to all teeth immediately
    if (selectionMode === 'all') {
      const nextVisibility = new Array(32).fill(true);
      setBracketVisibility(nextVisibility);
      setSelectedIndices([]);
      setHasUnsavedChanges(true);
      return;
    }

    // If no specific teeth selected, add one bracket at a time (first hidden)
    if (selectedIndices.length === 0) {
      const firstHidden = bracketVisibility.findIndex(v => v === false);
      if (firstHidden === -1) return; // nothing to add
      const nextVisibility = [...bracketVisibility];
      nextVisibility[firstHidden] = true;
      setBracketVisibility(nextVisibility);
      setSelectedIndices([firstHidden]);
      setHasUnsavedChanges(true);
      return;
    }

    // If there are selected indices, apply add to those
    updateBracketVisibility(true);
  };

  const handleSnapshotSelect = (index: number) => {
    if (!selectedPatient) return;
    const data = getPatientBracesData();
    const snapshots = data.chartSnapshots || [];
    const snapshot = snapshots[index];
    if (!snapshot) return;

    setBracketColors([...snapshot.bracketColors]);
    setPreviewColors([...snapshot.bracketColors]);
    setBracketVisibility([...snapshot.bracketVisibility]);
  };

    return (
      <div className="p-6 bg-white">
        {/* Patient Selection */}
        <label className="block text-xs mb-1 font-medium text-gray-700">Select Patient</label>
        <PatientSearch
          patients={patients}
          selectedPatient={selectedPatient}
          onSelectPatient={setSelectedPatient}
          placeholder="Search for a patient..."
          inputClassName="pl-9 pr-8 py-1.5 text-sm mt-2 mb-4"
        />

        {/* When no patient selected, show the braces chart and palette but disable interactions */}
        {!selectedPatient && (
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-stretch mt-4">
            <div className="flex-1 bg-white p-8 rounded-xl shadow-xl border border-cyan-100">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex bg-cyan-50 p-1.5 rounded-2xl">
                    <button
                      onClick={() => toast.error('Please select a patient first')}
                      className="flex items-center gap-2.5 px-4 py-2 rounded-lg text-xs font-bold transition-all text-slate-400"
                    >
                      SELECT ALL
                    </button>
                    <button
                      onClick={() => toast.error('Please select a patient first')}
                      className="flex items-center gap-2.5 px-4 py-2 rounded-lg text-xs font-bold transition-all text-slate-400"
                    >
                      PRECISION
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => toast.error('Please select a patient first')}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-red-200 rounded-lg text-red-400 text-xs font-bold"
                  >
                    REMOVE BRACKET
                  </button>
                  <button
                    onClick={() => toast.error('Please select a patient first')}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-cyan-200 rounded-lg text-cyan-400 text-xs font-bold"
                  >
                    ADD BRACKET
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6 shadow-xl">
                <div className="h-full">
                  <DentalChart
                    colors={previewColors}
                    selectedIndices={selectedIndices}
                    onToothClick={(idx: number) => toast.error('Please select a patient first')}
                    selectionMode={selectionMode}
                    upperPositions={upperPositions}
                    lowerPositions={lowerPositions}
                    draggable={false}
                    bracketVisibility={bracketVisibility}
                  />
                </div>
              </div>

              <button
                onClick={() => toast.error('Please select a patient first')}
                className={`w-full py-2 px-4 rounded-md font-semibold text-sm transition-all shadow-md bg-gray-100 text-gray-400 text-center`}
              >
                SAVE
              </button>
            </div>

            <div className="lg:w-96 bg-white rounded-xl shadow-lg border border-cyan-100 backdrop-blur-sm bg-opacity-90 flex flex-col">
              <div className="flex p-3 bg-cyan-50/30 border-b border-cyan-100 rounded-t-xl">
                <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-xs text-slate-400">PALETTE</div>
                <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-xs text-slate-400">HISTORY</div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {activeTab === "palette" ? (
                    <ColorPalette
                      key="palette"
                      colors={COLORS}
                      selectedColor={selectedColor}
                      onColorSelect={() => toast.error('Please select a patient first')}
                      showSpecs={false}
                    />
                  ) : (
                    <ColorHistory
                      key="history"
                      history={(getPatientBracesData().colorHistory || []).map(entry => ({
                        color: { name: entry.colorName || 'Chart Snapshot', value: entry.colorValue || '#E5E7EB' },
                        timestamp: new Date(entry.date).toLocaleString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          month: 'short',
                          day: 'numeric'
                        })
                      }))}
                      onSelectItem={() => toast.error('Please select a patient first')}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {selectedPatient && (
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-stretch mt-4">
            {/* Main Dental Chart Area */}
            <motion.div 
              className="flex-1 bg-white p-8 rounded-xl shadow-xl border border-cyan-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  {/* title removed as requested */}
                  
                  <div className="flex bg-cyan-50 p-1.5 rounded-2xl">
                    <button 
                      onClick={() => setSelectionMode("all")}
                      className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        selectionMode === "all" ? "bg-white text-cyan-800 shadow-md" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      SELECT ALL
                    </button>
                    <button 
                      onClick={() => setSelectionMode("single")}
                      className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        selectionMode === "single" ? "bg-white text-cyan-800 shadow-md" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <MousePointer2 className="w-4 h-4" />
                      PRECISION
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleRemoveBrackets}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-red-200 rounded-lg hover:bg-red-50 transition-all text-red-600 text-xs font-bold"
                  >
                    REMOVE BRACKET
                  </button>
                  <button
                    onClick={handleAddBrackets}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-cyan-200 rounded-lg hover:bg-cyan-50 transition-all text-cyan-600 text-xs font-bold"
                  >
                    ADD BRACKET
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6 shadow-xl">
                <div className="h-full">
                  <DentalChart 
                    colors={previewColors} 
                    selectedIndices={selectedIndices}
                    onToothClick={toggleToothSelection}
                    selectionMode={selectionMode}
                    upperPositions={upperPositions}
                    lowerPositions={lowerPositions}
                    draggable={false}
                    bracketVisibility={bracketVisibility}
                  />
                </div>
              </div>

              <button
                onClick={saveChanges}
                disabled={!hasUnsavedChanges}
                className={`w-full py-2 px-4 rounded-md font-semibold text-sm transition-all shadow-md ${hasUnsavedChanges ? 'bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-700 hover:to-teal-600 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
              >
                <Save className="w-4 h-4 inline mr-2" />
                SAVE
              </button>

            </motion.div>

            {/* Color Palette Sidebar */}
            <motion.div 
              className="lg:w-96 bg-white rounded-xl shadow-lg border border-cyan-100 backdrop-blur-sm bg-opacity-90 flex flex-col"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex p-3 bg-cyan-50/30 border-b border-cyan-100 rounded-t-xl">
                <button 
                  onClick={() => setActiveTab("palette")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-xs transition-all ${
                    activeTab === "palette" ? "bg-white text-cyan-700 shadow-md" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Palette className="w-4 h-4" />
                  PALETTE
                </button>
                <button 
                  onClick={() => setActiveTab("history")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-xs transition-all ${
                    activeTab === "history" ? "bg-white text-cyan-700 shadow-md" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <History className="w-4 h-4" />
                  HISTORY
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {activeTab === "palette" ? (
                    <ColorPalette 
                      key="palette"
                      colors={COLORS}
                      selectedColor={selectedColor}
                      onColorSelect={handleColorSelect}
                      showSpecs={false}
                    />
                  ) : (
                    <ColorHistory
                      key="history"
                      history={(getPatientBracesData().colorHistory || []).map(entry => ({
                        color: { name: entry.colorName || 'Chart Snapshot', value: entry.colorValue || '#E5E7EB' },
                        timestamp: new Date(entry.date).toLocaleString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          month: 'short',
                          day: 'numeric'
                        })
                      }))}
                      onSelectItem={handleSnapshotSelect}
                    />
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </div>
  );
}
