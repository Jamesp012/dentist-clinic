import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Palette, 
  History, 
  LayoutGrid,
  MousePointer2,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { Patient } from "../App";

interface Position {
  x: number;
  y: number;
}

const ORTHO_COLORS = [
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

// Bracket positions for each tooth - manually calibrated from dental image
const INITIAL_UPPER_POSITIONS = [
  { x: 125, y: 245 }, { x: 185, y: 245 }, { x: 245, y: 245 }, { x: 305, y: 245 },
  { x: 365, y: 245 }, { x: 425, y: 245 }, { x: 485, y: 245 }, { x: 545, y: 245 },
  { x: 605, y: 245 }, { x: 665, y: 245 }, { x: 725, y: 245 }, { x: 785, y: 245 },
  { x: 845, y: 245 }, { x: 905, y: 245 }
];

const INITIAL_LOWER_POSITIONS = [
  { x: 125, y: 375 }, { x: 185, y: 375 }, { x: 245, y: 375 }, { x: 305, y: 375 },
  { x: 365, y: 375 }, { x: 425, y: 375 }, { x: 485, y: 375 }, { x: 545, y: 375 },
  { x: 605, y: 375 }, { x: 665, y: 375 }, { x: 725, y: 375 }, { x: 785, y: 375 },
  { x: 845, y: 375 }, { x: 905, y: 375 }
];

interface AdvancedBracesChartProps {
  patient: Patient;
}

export const AdvancedBracesChart: React.FC<AdvancedBracesChartProps> = ({ patient }) => {
  const [selectedColor, setSelectedColor] = useState(ORTHO_COLORS[0]);
  const [bracketColors, setBracketColors] = useState<string[]>(new Array(28).fill("#E2E8F0"));
  const [previewColors, setPreviewColors] = useState<string[]>(new Array(28).fill("#E2E8F0"));
  
  const [history, setHistory] = useState<{ color: any; timestamp: string }[]>([]);
  const [activeTab, setActiveTab] = useState<"palette" | "history">("palette");
  const [selectionMode, setSelectionMode] = useState<"single" | "all">("all");
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const upperPositions = INITIAL_UPPER_POSITIONS;
  const lowerPositions = INITIAL_LOWER_POSITIONS;

  // Load saved data
  useEffect(() => {
    const saved = localStorage.getItem(`ortho_chart_${patient.id}`);
    if (saved) {
      try {
        const { colors, history: savedHistory } = JSON.parse(saved);
        setBracketColors(colors);
        setPreviewColors(colors);
        setHistory(savedHistory);
      } catch (e) {
        console.error("Failed to load saved data");
      }
    }
  }, [patient.id]);

  useEffect(() => {
    setPreviewColors([...bracketColors]);
  }, [bracketColors]);

  const handleColorSelect = (color: typeof ORTHO_COLORS[0]) => {
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
    const newEntry = {
      color: selectedColor,
      timestamp: new Date().toLocaleString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        day: "numeric"
      })
    };
    setHistory(prev => [newEntry, ...prev]);
    
    localStorage.setItem(`ortho_chart_${patient.id}`, JSON.stringify({
      colors: previewColors,
      history: [newEntry, ...history]
    }));
    
    toast.success("Bracket configuration applied");
  };

  const resetAll = () => {
    setPreviewColors(new Array(28).fill("#E2E8F0"));
    setBracketColors(new Array(28).fill("#E2E8F0"));
    setSelectedIndices([]);
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

  const getWirePath = (points: Position[]) => {
    if (points.length < 2) return "";
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      d += ` Q ${p1.x},${p1.y} ${midX},${midY}`;
    }
    const last = points[points.length - 1];
    d += ` T ${last.x},${last.y}`;
    return d;
  };

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-orange-100 px-10 py-5 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-800 leading-none">ORTHO<span className="text-orange-600">CHART</span></h1>
          <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Patient: {patient.name}</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col xl:flex-row overflow-hidden">
        <div className="flex-1 overflow-auto p-6 lg:p-10 flex flex-col items-center">
          <div className="w-full max-w-6xl bg-white rounded-[3rem] shadow-2xl shadow-orange-200/40 border border-orange-100 overflow-hidden flex flex-col">
            <div className="px-12 py-8 border-b border-orange-50 flex items-center justify-between bg-white">
              <div className="flex items-center gap-10">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">BRACES MAPPING</h2>
                  <p className="text-sm text-slate-400 font-bold">Click brackets to select and apply colors.</p>
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


            </div>

            <div className="flex-1 bg-gradient-to-b from-[#FEF5F1] to-[#FFFBF5] p-10 flex items-center justify-center relative min-h-[500px] overflow-hidden">
              {/* Dental Base Image Background */}
              <div className="absolute inset-0 flex items-center justify-center px-10 py-8">
                <img 
                  src="/dental-base.png" 
                  alt="Dental Base" 
                  className="w-full max-w-5xl h-auto object-contain select-none pointer-events-none opacity-95"
                />
              </div>

              {/* Interactive SVG Overlay */}
              <svg 
                viewBox="0 0 1000 650" 
                className="w-full max-w-5xl relative z-10"
              >
                {/* Alignment Diagonals */}
                <g opacity={0.1}>
                  <line x1={upperPositions[0].x} y1={upperPositions[0].y} x2={upperPositions[13].x} y2={upperPositions[13].y} stroke="#94A3B8" strokeWidth={1} strokeDasharray="10 10" />
                  <line x1={lowerPositions[0].x} y1={lowerPositions[0].y} x2={lowerPositions[13].x} y2={lowerPositions[13].y} stroke="#94A3B8" strokeWidth={1} strokeDasharray="10 10" />
                </g>

                {/* Brackets (no connecting wire for now) */}
                <g className="pointer-events-auto">
                  {upperPositions.map((pos, i) => {
                    const isSelected = selectedIndices.includes(i);
                    const color = previewColors[i];

                    return (
                      <g 
                        key={`u-${i}`} 
                        onClick={() => toggleToothSelection(i)}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Clickable hit area */}
                        <circle cx={pos.x} cy={pos.y} r={32} fill="transparent" />

                        {/* Bracket drop shadow */}
                        <rect
                          x={pos.x - 7}
                          y={pos.y - 7}
                          width={14}
                          height={14}
                          rx={3}
                          fill="#020617"
                          opacity={0.4}
                          transform="translate(1, 1)"
                        />

                        {/* Bracket metal base (dark blue square) */}
                        <rect
                          x={pos.x - 7}
                          y={pos.y - 7}
                          width={14}
                          height={14}
                          rx={3}
                          fill="#0b2956"
                          stroke="#38bdf8"
                          strokeWidth={0.9}
                        />

                        {/* Color / ligature overlay (inner square) */}
                        <motion.rect
                          x={pos.x - 5}
                          y={pos.y - 5}
                          width={10}
                          height={10}
                          rx={2}
                          fill={color}
                          fillOpacity={0.95}
                          animate={{
                            scale: isSelected ? 1.1 : 1,
                          }}
                        />

                        {/* Bracket cross bars */}
                        <path
                          d={`M ${pos.x - 4} ${pos.y - 2.5} L ${pos.x + 4} ${pos.y - 2.5} M ${pos.x - 4} ${pos.y + 2.5} L ${pos.x + 4} ${pos.y + 2.5}`}
                          stroke="rgba(15,23,42,0.9)"
                          strokeWidth={0.9}
                        />

                        {/* Center slot – wire passes here visually */}
                        <rect
                          x={pos.x - 5}
                          y={pos.y - 1}
                          width={10}
                          height={2}
                          fill="#020617"
                          opacity={0.95}
                        />

                        {/* Top highlight */}
                        <ellipse
                          cx={pos.x - 2}
                          cy={pos.y - 3}
                          rx={2}
                          ry={1.3}
                          fill="white"
                          opacity={0.85}
                        />

                        {/* Selection ring */}
                        {isSelected && (
                          <circle
                            cx={pos.x}
                            cy={pos.y}
                            r={18}
                            fill="none"
                            stroke="#F97316"
                            strokeWidth={2}
                            opacity={0.8}
                          />
                        )}
                      </g>
                    );
                  })}

                  {lowerPositions.map((pos, i) => {
                    const index = i + 14;
                    const isSelected = selectedIndices.includes(index);
                    const color = previewColors[index];

                    return (
                      <g 
                        key={`l-${i}`} 
                        onClick={() => toggleToothSelection(index)}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Clickable hit area */}
                        <circle cx={pos.x} cy={pos.y} r={32} fill="transparent" />

                        {/* Bracket drop shadow */}
                        <rect
                          x={pos.x - 7}
                          y={pos.y - 7}
                          width={14}
                          height={14}
                          rx={3}
                          fill="#020617"
                          opacity={0.4}
                          transform="translate(1, 1)"
                        />

                        {/* Bracket metal base (dark blue square) */}
                        <rect
                          x={pos.x - 7}
                          y={pos.y - 7}
                          width={14}
                          height={14}
                          rx={3}
                          fill="#0b2956"
                          stroke="#38bdf8"
                          strokeWidth={0.9}
                        />

                        {/* Color / ligature overlay (inner square) */}
                        <motion.rect
                          x={pos.x - 5}
                          y={pos.y - 5}
                          width={10}
                          height={10}
                          rx={2}
                          fill={color}
                          fillOpacity={0.95}
                          animate={{
                            scale: isSelected ? 1.1 : 1,
                          }}
                        />

                        {/* Bracket cross bars */}
                        <path
                          d={`M ${pos.x - 4} ${pos.y - 2.5} L ${pos.x + 4} ${pos.y - 2.5} M ${pos.x - 4} ${pos.y + 2.5} L ${pos.x + 4} ${pos.y + 2.5}`}
                          stroke="rgba(15,23,42,0.9)"
                          strokeWidth={0.9}
                        />

                        {/* Center slot – wire passes here visually */}
                        <rect
                          x={pos.x - 5}
                          y={pos.y - 1}
                          width={10}
                          height={2}
                          fill="#020617"
                          opacity={0.95}
                        />

                        {/* Top highlight */}
                        <ellipse
                          cx={pos.x - 2}
                          cy={pos.y - 3}
                          rx={2}
                          ry={1.3}
                          fill="white"
                          opacity={0.85}
                        />

                        {/* Selection ring */}
                        {isSelected && (
                          <circle
                            cx={pos.x}
                            cy={pos.y}
                            r={18}
                            fill="none"
                            stroke="#F97316"
                            strokeWidth={2}
                            opacity={0.8}
                          />
                        )}
                      </g>
                    );
                  })}
                </g>

                {/* Legend */}
                <g transform="translate(60, 60)">
                  <rect x="-15" y="-15" width="200" height="70" rx="20" fill="white" fillOpacity="0.9" />
                  <circle cx={0} cy={0} r={6} fill="#F97316" />
                  <text x={18} y={5} fontSize="11" fontWeight="900" fill="#334155">Maxillary Arch</text>
                  <circle cx={0} cy={25} r={6} fill="#CBD5E1" />
                  <text x={18} y={30} fontSize="11" fontWeight="900" fill="#334155">Mandibular Arch</text>
                </g>
              </svg>
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

        {/* Sidebar */}
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

          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            {activeTab === "palette" ? (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 tracking-[0.2em] mb-5 uppercase">Active Selection</h3>
                  <div className="flex items-center gap-5 bg-orange-50/50 p-5 rounded-3xl border border-orange-100/50 shadow-sm">
                    <div className="w-20 h-20 rounded-2xl shadow-inner border-4 border-white ring-1 ring-orange-100" style={{ backgroundColor: selectedColor.value }} />
                    <div>
                      <div className="text-xl font-black text-slate-800 tracking-tight">{selectedColor.name}</div>
                      <div className="text-[11px] font-mono text-orange-600 font-bold uppercase tracking-wider mt-0.5">{selectedColor.value}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[9px] bg-white px-2 py-0.5 rounded-full border border-orange-100 text-slate-500 font-bold uppercase">Clinical Grade</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-black text-slate-400 tracking-[0.2em] mb-5 uppercase">Available Ligature Shades</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {ORTHO_COLORS.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => handleColorSelect(color)}
                        className={`group relative aspect-square rounded-2xl transition-all duration-300 ${
                          selectedColor.value === color.value 
                            ? "ring-2 ring-orange-600 ring-offset-4 scale-105" 
                            : "hover:scale-110 active:scale-95"
                        }`}
                      >
                        <div className="w-full h-full rounded-2xl shadow-sm border border-slate-100 overflow-hidden" style={{ backgroundColor: color.value }} />
                        {selectedColor.value === color.value && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-2xl">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10 font-bold shadow-xl">
                          {color.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-orange-50">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Material Specs</span>
                      <p className="text-xs font-bold text-slate-700">Clinical Elastomer</p>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Durability</span>
                      <p className="text-xs font-bold text-slate-700">Tear Resistant</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">Clinical Application Log</h3>
                  <span className="text-[9px] bg-orange-100 px-2.5 py-1 rounded-full font-black text-orange-700">
                    {history.length} RECORDS
                  </span>
                </div>

                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <History className="w-10 h-10 text-orange-200 mb-5" />
                    <p className="text-sm font-bold text-slate-400 leading-relaxed italic">
                      Patient history is currently empty.<br/>
                      Initialize color mapping to record.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((item, index) => (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        key={index}
                        className="group bg-white border border-orange-50 p-5 rounded-3xl flex items-center gap-5 hover:border-orange-200 hover:shadow-2xl hover:shadow-orange-100/50 transition-all"
                      >
                        <div className="w-14 h-14 rounded-2xl shadow-sm border-2 border-white ring-1 ring-slate-100 flex-shrink-0" style={{ backgroundColor: item.color.value }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-slate-800 truncate tracking-tight">{item.color.name}</span>
                            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">{item.color.value}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase mt-2">{item.timestamp}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
};
