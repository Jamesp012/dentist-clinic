import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  Info,
  Move
} from "lucide-react";
import { toast } from "sonner";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DentalChart } from "./components/DentalChart";
import { ColorPalette } from "./components/ColorPalette";
import { ColorHistory } from "./components/ColorHistory";

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

const INITIAL_UPPER_POSITIONS = [
  { x: 78, y: 275 }, { x: 140, y: 312 }, { x: 215, y: 342 }, { x: 295, y: 362 }, 
  { x: 382, y: 375 }, { x: 472, y: 382 }, { x: 528, y: 382 }, { x: 618, y: 375 }, 
  { x: 705, y: 362 }, { x: 785, y: 342 }, { x: 860, y: 312 }, { x: 922, y: 275 },
  { x: 960, y: 230 }, { x: 982, y: 185 }
];

const INITIAL_LOWER_POSITIONS = [
  { x: 78, y: 495 }, { x: 140, y: 450 }, { x: 215, y: 415 }, { x: 295, y: 390 }, 
  { x: 382, y: 375 }, { x: 472, y: 365 }, { x: 528, y: 365 }, { x: 618, y: 375 }, 
  { x: 705, y: 390 }, { x: 785, y: 415 }, { x: 860, y: 450 }, { x: 922, y: 495 },
  { x: 960, y: 535 }, { x: 982, y: 580 }
];

export default function App() {
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [bracketColors, setBracketColors] = useState<string[]>(new Array(28).fill("#E2E8F0"));
  const [previewColors, setPreviewColors] = useState<string[]>(new Array(28).fill("#E2E8F0"));
  
  // Positional state
  const [upperPositions, setUpperPositions] = useState(INITIAL_UPPER_POSITIONS);
  const [lowerPositions, setLowerPositions] = useState(INITIAL_LOWER_POSITIONS);
  
  const [history, setHistory] = useState<{ color: any; timestamp: string }[]>([]);
  const [activeTab, setActiveTab] = useState<"palette" | "history">("palette");
  const [selectionMode, setSelectionMode] = useState<"single" | "all">("all");
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  useEffect(() => {
    setPreviewColors([...bracketColors]);
  }, [bracketColors]);

  const handleColorSelect = (color: typeof COLORS[0]) => {
    setSelectedColor(color);
    if (selectionMode === "all") {
      setPreviewColors(new Array(28).fill(color.value));
    } else if (selectedIndices.length > 0) {
      const newPreview = [...previewColors];
      selectedIndices.forEach(idx => {
        newPreview[idx] = color.value;
      });
      setPreviewColors(newPreview);
    }
  };

  const applyColors = () => {
    setBracketColors([...previewColors]);
    setHistory(prev => [
      { 
        color: selectedColor, 
        timestamp: new Date().toLocaleString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          month: "short",
          day: "numeric"
        }) 
      }, 
      ...prev
    ]);
    toast.success("Bracket configuration applied");
  };

  const saveAdjustments = () => {
    localStorage.setItem('ortho_bracket_positions', JSON.stringify({ upper: upperPositions, lower: lowerPositions }));
    toast.success("Bracket positions saved successfully");
  };

  const resetPositions = () => {
    setUpperPositions(INITIAL_UPPER_POSITIONS);
    setLowerPositions(INITIAL_LOWER_POSITIONS);
    toast.info("Bracket positions reset to clinical default");
  };

  const resetAll = () => {
    const defaultColor = "#E2E8F0";
    setPreviewColors(new Array(28).fill(defaultColor));
    setBracketColors(new Array(28).fill(defaultColor));
    setSelectedIndices([]);
    resetPositions();
    toast.info("Full chart reset");
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
    if (index < 14) {
      const newPos = [...upperPositions];
      newPos[index] = { x, y };
      setUpperPositions(newPos);
    } else {
      const newPos = [...lowerPositions];
      newPos[index - 14] = { x, y };
      setLowerPositions(newPos);
    }
  }, [upperPositions, lowerPositions]);

  // Load saved positions on mount
  useEffect(() => {
    const saved = localStorage.getItem('ortho_bracket_positions');
    if (saved) {
      try {
        const { upper, lower } = JSON.parse(saved);
        if (upper && lower) {
          setUpperPositions(upper);
          setLowerPositions(lower);
        }
      } catch (e) {
        console.error("Failed to load saved positions");
      }
    }
  }, []);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-[#FFFBF5] text-slate-900 font-sans flex flex-col">
        {/* Top Professional Bar */}
        <div className="bg-[#2C1810] text-[#D4B996] px-6 py-2 flex justify-between items-center text-[10px] font-bold tracking-wider uppercase">
          <div className="flex gap-8">
            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> ORTHO-STATION LIVE</span>
            <span className="flex items-center gap-2 opacity-60">PATIENT ENCRYPTED DATA CHANNEL</span>
          </div>
          <div className="flex gap-6 opacity-60">
            <span>ID: #BR-772-XP</span>
            <span>STATION 4</span>
          </div>
        </div>

        {/* Main Header */}
        <header className="bg-white/90 backdrop-blur-xl border-b border-orange-100 px-10 py-5 flex items-center justify-between shadow-sm sticky top-0 z-50">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#451A03] to-[#2C1810] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-100">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tighter text-slate-800 leading-none">ORTHO<span className="text-orange-600">CHART</span></h1>
                <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Diagnostic Configuration</p>
              </div>
            </div>
            
            <div className="h-10 w-px bg-orange-100" />
            
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Active Case</span>
              <button className="text-sm font-black text-slate-700 flex items-center gap-2 hover:text-orange-600 transition-colors">
                WALKER, JONATHAN <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <button className="p-2.5 hover:bg-orange-50 rounded-xl transition-all text-slate-400 hover:text-orange-600">
                <Share2 className="w-5 h-5" />
              </button>
              <button className="p-2.5 hover:bg-orange-50 rounded-xl transition-all text-slate-400 hover:text-orange-600">
                <Printer className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-4 pl-6 border-l border-orange-100">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-black text-slate-800 uppercase">Dr. Sarah Johnson</div>
                <div className="text-[10px] font-bold text-orange-600 uppercase tracking-tighter">Clinical Director</div>
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded-2xl border-2 border-white ring-1 ring-orange-100 overflow-hidden shadow-sm">
                <img src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=120&h=120" alt="Doctor" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col xl:flex-row overflow-hidden">
          <div className="flex-1 overflow-auto p-6 lg:p-10 flex flex-col items-center">
            <div className="w-full max-w-6xl bg-white rounded-[3rem] shadow-2xl shadow-orange-200/40 border border-orange-100 overflow-hidden flex flex-col">
              <div className="px-12 py-8 border-b border-orange-50 flex items-center justify-between bg-white">
                <div className="flex items-center gap-10">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">BRACES MAPPING</h2>
                    <p className="text-sm text-slate-400 font-bold">Drag brackets to adjust positioning on the tooth surface.</p>
                  </div>
                  
                  <div className="flex bg-orange-50 p-1.5 rounded-2xl">
                    <button 
                      onClick={() => setSelectionMode("all")}
                      className={`flex items-center gap-2.5 px-6 py-2.5 rounded-[1rem] text-xs font-black transition-all ${
                        selectionMode === "all" ? "bg-white text-orange-800 shadow-md shadow-orange-100" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      SELECT ALL
                    </button>
                    <button 
                      onClick={() => setSelectionMode("single")}
                      className={`flex items-center gap-2.5 px-6 py-2.5 rounded-[1rem] text-xs font-black transition-all ${
                        selectionMode === "single" ? "bg-white text-orange-800 shadow-md shadow-orange-100" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <MousePointer2 className="w-4 h-4" />
                      PRECISION
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={resetPositions}
                    className="flex items-center gap-2.5 px-6 py-3 border-2 border-orange-50 rounded-2xl hover:bg-orange-50 transition-all text-slate-500 text-xs font-black uppercase tracking-widest group"
                  >
                    <RotateCcw className="w-4 h-4 group-hover:rotate-[-45deg] transition-transform" />
                    RESET POSITIONS
                  </button>
                  <button 
                    onClick={saveAdjustments}
                    className="flex items-center gap-2.5 px-6 py-3 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-200"
                  >
                    <Save className="w-4 h-4" />
                    SAVE ADJUSTMENT
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-white p-10 flex items-center justify-center relative min-h-[500px]">
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

              <div className="px-12 py-10 bg-orange-50/20 border-t border-orange-100 flex justify-center">
                <button 
                  onClick={applyColors}
                  className="group relative flex items-center gap-5 px-16 py-6 bg-[#2C1810] hover:bg-[#451A03] text-white rounded-[2rem] font-black text-base transition-all shadow-2xl shadow-orange-200 hover:shadow-orange-300 active:scale-95 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400/0 via-white/20 to-orange-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  <Palette className="w-6 h-6" />
                  APPLY COLOR SELECTION
                </button>
              </div>
            </div>
          </div>

          <aside className="w-full xl:w-[460px] bg-white border-l border-orange-100 flex flex-col shadow-2xl">
            <div className="flex p-3 bg-orange-50/30 border-b border-orange-100">
              <button 
                onClick={() => setActiveTab("palette")}
                className={`flex-1 flex items-center justify-center gap-4 py-5 rounded-2xl font-black text-xs tracking-widest transition-all ${
                  activeTab === "palette" ? "bg-white text-orange-700 shadow-xl shadow-orange-100 ring-1 ring-orange-100" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Palette className="w-5 h-5" />
                COLOR PALETTE
              </button>
              <button 
                onClick={() => setActiveTab("history")}
                className={`flex-1 flex items-center justify-center gap-4 py-5 rounded-2xl font-black text-xs tracking-widest transition-all ${
                  activeTab === "history" ? "bg-white text-orange-700 shadow-xl shadow-orange-100 ring-1 ring-orange-100" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <History className="w-5 h-5" />
                HISTORY LOG
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
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
                    history={history}
                  />
                )}
              </AnimatePresence>
            </div>

            <div className="p-8 border-t border-orange-100 bg-[#FFFBF5]">
              <div className="bg-[#2C1810] rounded-3xl p-8 text-white shadow-2xl shadow-orange-200 relative overflow-hidden group">
                <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-orange-600 rounded-lg">
                      <Move className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">Adjustment Mode</span>
                  </div>
                  <p className="text-base font-bold leading-relaxed text-orange-50">
                    Precision placement: Simply drag any bracket icon to its ideal clinical position.
                  </p>
                  <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-orange-400 uppercase tracking-tighter">Persistence</span>
                      <span className="text-xs font-bold">READY TO SAVE</span>
                    </div>
                    <button className="text-xs font-black underline underline-offset-8 text-orange-400 hover:text-white transition-colors">HELP CENTER</button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </DndProvider>
  );
}
