import { useState, useEffect, useCallback } from 'react';
import { Patient } from '../App';
import { 
  Palette, 
  History, 
  RotateCcw, 
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
};

// Orthodontic colors
const COLORS = [
  { name: "Silver", value: "#E2E8F0" },
  { name: "Midnight Blue", value: "#1E3A8A" },
  { name: "Royal Blue", value: "#3B82F6" },
  { name: "Forest Green", value: "#065F46" },
  { name: "Deep Red", value: "#991B1B" },
  { name: "Soft Pink", value: "#F472B6" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Gold", value: "#F59E0B" },
  { name: "Obsidian", value: "#111827" },
  { name: "Teal", value: "#0D9488" },
  { name: "Coral", value: "#F43F5E" },
  { name: "Lavender", value: "#A78BFA" },
];

// 16 brackets per arch to match full dentition
const INITIAL_UPPER_POSITIONS = [
  { x: 60, y: 260 }, { x: 115, y: 295 }, { x: 175, y: 325 }, { x: 240, y: 345 },
  { x: 310, y: 360 }, { x: 385, y: 370 }, { x: 455, y: 375 }, { x: 525, y: 375 },
  { x: 595, y: 370 }, { x: 665, y: 360 }, { x: 730, y: 345 }, { x: 790, y: 325 },
  { x: 845, y: 295 }, { x: 895, y: 260 }, { x: 935, y: 230 }, { x: 965, y: 205 }
];

const INITIAL_LOWER_POSITIONS = [
  { x: 75, y: 515 }, { x: 130, y: 485 }, { x: 190, y: 455 }, { x: 255, y: 435 },
  { x: 320, y: 420 }, { x: 390, y: 410 }, { x: 460, y: 405 }, { x: 530, y: 405 },
  { x: 600, y: 410 }, { x: 670, y: 420 }, { x: 735, y: 435 }, { x: 795, y: 455 },
  { x: 850, y: 485 }, { x: 900, y: 515 }, { x: 940, y: 545 }, { x: 970, y: 575 }
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
  const [previewColors, setPreviewColors] = useState<string[]>(new Array(32).fill("#E2E8F0"));
  const [bracketColors, setBracketColors] = useState<string[]>(new Array(32).fill("#E2E8F0"));
  const [upperPositions, setUpperPositions] = useState(INITIAL_UPPER_POSITIONS);
  const [lowerPositions, setLowerPositions] = useState(INITIAL_LOWER_POSITIONS);

  // Helper to normalize saved positions to 16 upper + 16 lower
  const normalizePositions = (saved: any[] | undefined, initial: typeof INITIAL_UPPER_POSITIONS) => {
    if (!Array.isArray(saved) || saved.length === 0) return initial;
    const result = [...initial];
    saved.forEach((pos, idx) => {
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number' && idx < result.length) {
        result[idx] = { x: pos.x, y: pos.y };
      }
    });
    return result;
  };

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('bracesChartData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setBracesData(parsedData);
      }
      const savedPositions = localStorage.getItem('ortho_bracket_positions');
      if (savedPositions) {
        const { upper, lower } = JSON.parse(savedPositions);
        setUpperPositions(normalizePositions(upper, INITIAL_UPPER_POSITIONS));
        setLowerPositions(normalizePositions(lower, INITIAL_LOWER_POSITIONS));
      }
    } catch (error) {
      console.error('Error loading saved braces data:', error);
    }
  }, []);

  // Save data to localStorage whenever bracesData changes
  useEffect(() => {
    if (Object.keys(bracesData).length > 0) {
      try {
        localStorage.setItem('bracesChartData', JSON.stringify(bracesData));
      } catch (error) {
        console.error('Error saving braces data:', error);
      }
    }
  }, [bracesData]);

  // Adult teeth numbering (Universal Numbering System)
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
        totalPaid: 0
      };
    }
    
    return bracesData[selectedPatient.id];
  };

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

  const applyColors = () => {
    if (!selectedPatient) return;
    
    setBracketColors([...previewColors]);
    
    const currentData = getPatientBracesData();
    const newHistoryEntry: ColorHistoryEntry = {
      date: new Date().toISOString(),
      colorName: selectedColor.name,
      colorValue: selectedColor.value,
      notes: `Applied ${selectedColor.name} to brackets`
    };
    
    setBracesData({
      ...bracesData,
      [selectedPatient.id]: {
        ...currentData,
        colorHistory: [newHistoryEntry, ...currentData.colorHistory],
        lastUpdated: new Date().toISOString()
      }
    });
  };

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

  const handlePositionChange = useCallback((index: number, x: number, y: number) => {
    if (index < 16) {
      const newPos = [...upperPositions];
      newPos[index] = { x, y };
      setUpperPositions(newPos);
      try {
        localStorage.setItem('ortho_bracket_positions', JSON.stringify({ upper: newPos, lower: lowerPositions }));
      } catch (error) {
        console.error('Error saving positions:', error);
      }
    } else {
      const newPos = [...lowerPositions];
      newPos[index - 16] = { x, y };
      setLowerPositions(newPos);
      try {
        localStorage.setItem('ortho_bracket_positions', JSON.stringify({ upper: upperPositions, lower: newPos }));
      } catch (error) {
        console.error('Error saving positions:', error);
      }
    }
  }, [upperPositions, lowerPositions]);

  const resetPositions = () => {
    setUpperPositions(INITIAL_UPPER_POSITIONS);
    setLowerPositions(INITIAL_LOWER_POSITIONS);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-8 bg-white">
        {/* Patient Selection */}
        <motion.div 
          className="relative bg-white p-6 rounded-xl shadow-lg border border-purple-100 mb-6 backdrop-blur-sm bg-opacity-90 z-40"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <label className="block text-sm mb-2 font-medium text-gray-700">Select Patient</label>
          <PatientSearch
            patients={patients}
            selectedPatient={selectedPatient}
            onSelectPatient={setSelectedPatient}
          />
        </motion.div>

        {selectedPatient && (
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-stretch">
            {/* Main Dental Chart Area */}
            <motion.div 
              className="flex-1 bg-white p-8 rounded-xl shadow-xl border border-purple-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                      BRACES MAPPING - {selectedPatient.name}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Drag brackets to adjust positioning. Select color mode to apply shades.
                    </p>
                  </div>
                  
                  <div className="flex bg-orange-50 p-1.5 rounded-2xl">
                    <button 
                      onClick={() => setSelectionMode("all")}
                      className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        selectionMode === "all" ? "bg-white text-orange-800 shadow-md" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      SELECT ALL
                    </button>
                    <button 
                      onClick={() => setSelectionMode("single")}
                      className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        selectionMode === "single" ? "bg-white text-orange-800 shadow-md" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <MousePointer2 className="w-4 h-4" />
                      PRECISION
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button 
                    onClick={() => {
                      resetPositions();
                      try {
                        localStorage.setItem('ortho_bracket_positions', JSON.stringify({ upper: INITIAL_UPPER_POSITIONS, lower: INITIAL_LOWER_POSITIONS }));
                      } catch (error) {
                        console.error('Error resetting positions:', error);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-gray-600 text-xs font-bold"
                  >
                    <RotateCcw className="w-4 h-4" />
                    RESET POSITIONS
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
                    onPositionChange={handlePositionChange}
                  />
                </div>
              </div>

              <button 
                onClick={applyColors}
                className="w-full py-4 px-6 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg font-bold text-lg hover:from-pink-700 hover:to-purple-700 transition-all shadow-lg"
              >
                <Palette className="w-5 h-5 inline mr-2" />
                APPLY COLOR SELECTION
              </button>

              {/* Tips Section */}
              <motion.div 
                className="mt-6 pt-6 border-t-2 border-purple-100"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <h3 className="text-sm mb-3 font-medium text-gray-700">
                  💡 Braces Care Tips
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold text-purple-600">Drag & Drop:</span> Precisely position each bracket on the tooth surface for optimal alignment.
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-pink-50 to-blue-50 rounded-lg border border-pink-200">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold text-pink-600">Color Selection:</span> Apply rubber band colors to all or individual brackets with precision mode.
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Color Palette Sidebar */}
            <motion.div 
              className="lg:w-96 bg-white rounded-xl shadow-lg border border-purple-100 backdrop-blur-sm bg-opacity-90 flex flex-col"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex p-3 bg-orange-50/30 border-b border-purple-100 rounded-t-xl">
                <button 
                  onClick={() => setActiveTab("palette")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-xs transition-all ${
                    activeTab === "palette" ? "bg-white text-orange-700 shadow-md" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Palette className="w-4 h-4" />
                  PALETTE
                </button>
                <button 
                  onClick={() => setActiveTab("history")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-xs transition-all ${
                    activeTab === "history" ? "bg-white text-orange-700 shadow-md" : "text-slate-400 hover:text-slate-600"
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
                    />
                  ) : (
                    <ColorHistory 
                      key="history"
                      history={getPatientBracesData().colorHistory.map(entry => ({
                        color: { name: entry.colorName, value: entry.colorValue },
                        timestamp: new Date(entry.date).toLocaleString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          month: "short",
                          day: "numeric"
                        })
                      }))}
                    />
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}
