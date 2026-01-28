import { useState } from 'react';
import { Patient } from '../App';
import { Sparkles, Star, Palette, RotateCcw, History, Calendar, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PatientSearch } from './PatientSearch';
import { PesoSign } from './icons/PesoSign';

type BracesChartingProps = {
  patients: Patient[];
};

type ColorHistoryEntry = {
  date: string;
  colorName: string;
  colorValue: string;
  notes?: string;
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
};

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
  const [selectedColor, setSelectedColor] = useState(rubberBandColorOptions[0]);
  const [hoveredTooth, setHoveredTooth] = useState<number | null>(null);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

  // Adult teeth numbering (Universal Numbering System)
  const upperTeeth = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const lowerTeeth = [32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17];

  const getPatientBracesData = (): BracesData => {
    if (!selectedPatient) return { patientId: '', rubberBandColors: {}, bracketType: 'metal', colorHistory: [], paymentRecords: [], totalCost: 0, totalPaid: 0 };
    
    if (!bracesData[selectedPatient.id]) {
      // Initialize with default clear rubber bands for all teeth
      const defaultColors: { [toothNumber: number]: string } = {};
      [...upperTeeth, ...lowerTeeth].forEach(tooth => {
        defaultColors[tooth] = rubberBandColorOptions[0].value;
      });
      
      return {
        patientId: selectedPatient.id,
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

  const updateRubberBandColor = (toothNumber: number, colorValue: string) => {
    if (!selectedPatient) return;
    
    const currentData = getPatientBracesData();
    const updatedColors = {
      ...currentData.rubberBandColors,
      [toothNumber]: colorValue
    };
    
    setBracesData({
      ...bracesData,
      [selectedPatient.id]: {
        ...currentData,
        rubberBandColors: updatedColors
      }
    });
  };

  // Apply color to ALL brackets at once
  const applyColorToAllBrackets = (colorValue: string) => {
    if (!selectedPatient) return;
    
    const currentData = getPatientBracesData();
    const updatedColors: { [toothNumber: number]: string } = {};
    [...upperTeeth, ...lowerTeeth].forEach(tooth => {
      updatedColors[tooth] = colorValue;
    });
    
    setBracesData({
      ...bracesData,
      [selectedPatient.id]: {
        ...currentData,
        rubberBandColors: updatedColors
      }
    });
  };

  const handleToothClick = (toothNumber: number) => {
    if (!selectedPatient) return;
    setSelectedTooth(toothNumber);
    updateRubberBandColor(toothNumber, selectedColor.value);
  };

  // Updated: Apply selected color to ALL brackets when color is clicked
  const handleColorSelect = (color: typeof rubberBandColorOptions[0]) => {
    if (!selectedPatient) return;
    
    setSelectedColor(color);
    applyColorToAllBrackets(color.value);
    
    // Add to color history
    const currentData = getPatientBracesData();
    const newHistoryEntry: ColorHistoryEntry = {
      date: new Date().toISOString(),
      colorName: color.name,
      colorValue: color.value,
      notes: `Changed all rubber bands to ${color.name}`
    };
    
    setBracesData({
      ...bracesData,
      [selectedPatient.id]: {
        ...currentData,
        rubberBandColors: (() => {
          const updatedColors: { [toothNumber: number]: string } = {};
          [...upperTeeth, ...lowerTeeth].forEach(tooth => {
            updatedColors[tooth] = color.value;
          });
          return updatedColors;
        })(),
        colorHistory: [newHistoryEntry, ...currentData.colorHistory]
      }
    });
  };

  const resetAllColors = () => {
    if (!selectedPatient) return;
    const currentData = getPatientBracesData();
    const resetColors: { [toothNumber: number]: string } = {};
    [...upperTeeth, ...lowerTeeth].forEach(tooth => {
      resetColors[tooth] = rubberBandColorOptions[0].value;
    });
    
    setBracesData({
      ...bracesData,
      [selectedPatient.id]: {
        ...currentData,
        rubberBandColors: resetColors
      }
    });
  };

  const ToothWithBraces = ({ number, onClick }: { number: number; onClick: () => void }) => {
    const currentData = getPatientBracesData();
    const rubberBandColor = currentData.rubberBandColors[number] || rubberBandColorOptions[0].value;
    const colorOption = rubberBandColorOptions.find(c => c.value === rubberBandColor) || rubberBandColorOptions[0];
    const isHovered = hoveredTooth === number;
    const isSelected = selectedTooth === number;

    return (
      <div className="relative flex flex-col items-center">
        <motion.div
          className="flex flex-col items-center cursor-pointer select-none"
          onClick={onClick}
          onMouseEnter={() => setHoveredTooth(number)}
          onMouseLeave={() => setHoveredTooth(null)}
          whileHover={{ scale: 1.15, y: -5 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <motion.span 
            className="text-xs mb-1 text-gray-700 font-semibold"
            animate={isHovered ? { scale: 1.2, color: '#3b82f6' } : {}}
          >
            {number}
          </motion.span>
          
          <div className="relative">
            <motion.svg 
              width="40" 
              height="50" 
              viewBox="0 0 60 80"
              className="drop-shadow-lg"
              animate={isSelected ? { 
                rotate: [0, -5, 5, -5, 5, 0],
                scale: [1, 1.05, 1]
              } : {}}
              transition={{ duration: 0.4 }}
            >
              <defs>
                {/* Enamel shine gradient */}
                <linearGradient id={`enamelShine-${number}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#f8f9fa" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#e9ecef" stopOpacity="0.1" />
                </linearGradient>
                
                {/* Metal bracket gradient */}
                <linearGradient id={`metalGradient-${number}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#D3D3D3" />
                  <stop offset="50%" stopColor="#A9A9A9" />
                  <stop offset="100%" stopColor="#808080" />
                </linearGradient>
                
                {/* Wire gradient */}
                <linearGradient id={`wireGradient-${number}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#C0C0C0" />
                  <stop offset="50%" stopColor="#A0A0A0" />
                  <stop offset="100%" stopColor="#909090" />
                </linearGradient>
                
                {/* Tooth shadow */}
                <filter id={`toothShadow-${number}`}>
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25"/>
                </filter>
                
                {/* Glow effect for hover */}
                <filter id={`glow-${number}`}>
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* Hover glow effect */}
              {isHovered && (
                <motion.rect
                  x="10" y="5" width="40" height="60"
                  rx="8"
                  fill="none"
                  stroke="#60A5FA"
                  strokeWidth="2"
                  opacity="0.4"
                  className="blur-md"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                />
              )}
              
              {/* REALISTIC TOOTH SHAPE - Matches DentalCharting */}
              <motion.path
                d="M 16 12
                   C 14 12, 12 14, 12 16
                   L 12 26
                   C 12 28, 13 30, 14 31
                   L 14 38
                   C 14 40, 16 42, 18 42
                   C 19 40, 20 38, 20 35
                   C 20 38, 21 40, 22 42
                   C 24 42, 26 40, 26 38
                   L 26 31
                   C 27 30, 28 28, 28 26
                   L 28 16
                   C 28 14, 26 12, 24 12
                   C 22 12, 21 14, 20 16
                   C 20 14, 19 12, 18 12
                   C 17 12, 16 12, 16 12
                   Z"
                fill="white"
                stroke="#d4d4d4"
                strokeWidth="1.5"
                strokeLinejoin="round"
                filter={`url(#toothShadow-${number})`}
                animate={isHovered ? { 
                  filter: `url(#glow-${number})`,
                  strokeWidth: 2
                } : {}}
              />
              
              {/* Top chewing surface line */}
              <motion.path
                d="M 14 16 Q 20 14, 26 16"
                stroke="#d4d4d4"
                strokeWidth="1"
                opacity="0.4"
                fill="none"
              />
              
              {/* Enamel shine on crown */}
              <ellipse
                cx="18"
                cy="22"
                rx="3"
                ry="5"
                fill="white"
                opacity="0.35"
              />
              
              {/* METAL BRACKET - centered on tooth */}
              <motion.rect
                x="17"
                y="21"
                width="10"
                height="10"
                rx="2"
                fill={`url(#metalGradient-${number})`}
                stroke="#696969"
                strokeWidth="0.8"
                animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
                style={{ transformOrigin: "22px 26px" }}
              />
              
              {/* Bracket details (slots) */}
              <rect
                x="18"
                y="24"
                width="8"
                height="1.5"
                rx="0.5"
                fill="#505050"
                opacity="0.6"
              />
              <rect
                x="18"
                y="27"
                width="8"
                height="1.5"
                rx="0.5"
                fill="#505050"
                opacity="0.6"
              />
              
              {/* Bracket shine */}
              <rect
                x="18"
                y="22"
                width="2"
                height="3"
                fill="white"
                opacity="0.4"
              />
              
              {/* ARCHWIRE - horizontal wire through bracket */}
              <line
                x1="0"
                y1="26"
                x2="60"
                y2="26"
                stroke={`url(#wireGradient-${number})`}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              
              {/* Wire shine */}
              <line
                x1="0"
                y1="25.5"
                x2="60"
                y2="23.5"
                stroke="white"
                strokeWidth="0.5"
                opacity="0.5"
                strokeLinecap="round"
              />
              
              {/* RUBBER BAND (O-Ring) - colorful elastic around bracket */}
              <motion.circle
                cx="30"
                cy="24"
                r="6.5"
                fill={rubberBandColor}
                stroke={colorOption.stroke}
                strokeWidth="1.2"
                opacity="0.85"
                animate={isSelected ? { 
                  scale: [1, 1.15, 1],
                  opacity: [0.85, 1, 0.85]
                } : {}}
                style={{ transformOrigin: "30px 24px" }}
                transition={{ duration: 0.5 }}
              />
              
              {/* Rubber band shine effect */}
              <motion.ellipse
                cx="28"
                cy="22"
                rx="2.5"
                ry="3"
                fill="white"
                opacity="0.3"
                animate={isHovered ? { opacity: 0.5 } : { opacity: 0.3 }}
              />
              
              {/* Inner circle detail on rubber band */}
              <circle
                cx="30"
                cy="24"
                r="4"
                fill="none"
                stroke={colorOption.stroke}
                strokeWidth="0.5"
                opacity="0.3"
              />
            </motion.svg>

            {/* Color indicator badge */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  className="absolute -top-1 -right-1"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                  <div 
                    className="w-5 h-5 rounded-full border-2 border-white shadow-lg"
                    style={{ backgroundColor: rubberBandColor }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Tooltip */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              className="absolute z-50 pointer-events-none"
              style={{ top: '100%', marginTop: '8px' }}
              initial={{ opacity: 0, y: -10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-xl">
                <div className="flex items-center gap-1">
                  <Palette className="w-3 h-3" />
                  <span className="font-medium">
                    Tooth #{number} - {colorOption.name}
                  </span>
                </div>
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gradient-to-br from-purple-600 to-pink-600 rotate-45" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="p-8 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 min-h-screen">
      <motion.div 
        className="mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl mb-2 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
          Braces Color Customization
        </h1>
        <p className="text-gray-600">Design your perfect braces look with custom rubber band colors</p>
      </motion.div>

      {/* Patient Selection */}
      <motion.div 
        className="bg-white p-6 rounded-xl shadow-lg border border-purple-100 mb-6 backdrop-blur-sm bg-opacity-90"
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
        <>
          {/* Color Palette */}
          <motion.div 
            className="bg-white p-6 rounded-xl shadow-lg border border-purple-100 mb-6 backdrop-blur-sm bg-opacity-90"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-purple-600" />
                <h2 className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  Rubber Band Color Palette
                </h2>
              </div>
              <motion.button
                onClick={resetAllColors}
                className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RotateCcw className="w-4 h-4" />
                Reset All
              </motion.button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4 flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              Select a color, then click on any tooth to apply it
            </p>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
              {rubberBandColorOptions.map((color, index) => (
                <motion.button
                  key={color.name}
                  onClick={() => handleColorSelect(color)}
                  className={`relative group`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.02 }}
                  whileHover={{ scale: 1.15, y: -5 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <div
                    className={`w-full aspect-square rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border-4 ${
                      selectedColor.name === color.name
                        ? 'border-purple-600 ring-4 ring-purple-200'
                        : 'border-white hover:border-purple-300'
                    }`}
                    style={{ backgroundColor: color.value }}
                  />
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {color.name}
                    </div>
                  </div>
                  {selectedColor.name === color.name && (
                    <motion.div
                      className="absolute -top-1 -right-1"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center shadow-lg">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>

            <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <p className="text-sm">
                <span className="font-semibold text-purple-700">Currently Selected:</span>{' '}
                <span className="inline-flex items-center gap-2">
                  <span 
                    className="inline-block w-4 h-4 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: selectedColor.value }}
                  />
                  {selectedColor.name}
                </span>
              </p>
            </div>
          </motion.div>

          {/* Dental Chart with Braces */}
          <motion.div 
            className="bg-white p-8 rounded-xl shadow-xl border border-purple-100 backdrop-blur-sm bg-opacity-90"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-6 h-6 text-purple-600" />
                <h2 className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  Braces Chart - {selectedPatient.name}
                </h2>
              </div>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500" />
                Click any tooth to apply the selected rubber band color
              </p>
            </div>

            {/* Upper Teeth */}
            <div className="mb-16">
              <motion.div 
                className="text-center text-sm font-medium text-purple-600 mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Upper Teeth
              </motion.div>
              <div className="flex justify-center gap-2 mb-6">
                <div className="flex gap-2">
                  {upperTeeth.slice(0, 8).map((tooth, index) => (
                    <motion.div
                      key={tooth}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.04 }}
                    >
                      <ToothWithBraces number={tooth} onClick={() => handleToothClick(tooth)} />
                    </motion.div>
                  ))}
                </div>
                <div className="w-8" />
                <div className="flex gap-2">
                  {upperTeeth.slice(8, 16).map((tooth, index) => (
                    <motion.div
                      key={tooth}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + index * 0.04 }}
                    >
                      <ToothWithBraces number={tooth} onClick={() => handleToothClick(tooth)} />
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="border-b-4 border-gradient-to-r from-purple-300 via-pink-300 to-purple-300" style={{ 
                background: 'linear-gradient(90deg, #d8b4fe 0%, #fbcfe8 50%, #d8b4fe 100%)',
                height: '3px'
              }} />
            </div>

            {/* Lower Teeth */}
            <div>
              <div className="border-b-4 border-gradient-to-r from-purple-300 via-pink-300 to-purple-300 mb-6" style={{ 
                background: 'linear-gradient(90deg, #d8b4fe 0%, #fbcfe8 50%, #d8b4fe 100%)',
                height: '3px'
              }} />
              <div className="flex justify-center gap-2 mb-4">
                <div className="flex gap-2">
                  {lowerTeeth.slice(0, 8).reverse().map((tooth, index) => (
                    <motion.div
                      key={tooth}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.1 + index * 0.04 }}
                    >
                      <ToothWithBraces number={tooth} onClick={() => handleToothClick(tooth)} />
                    </motion.div>
                  ))}
                </div>
                <div className="w-8" />
                <div className="flex gap-2">
                  {lowerTeeth.slice(8, 16).reverse().map((tooth, index) => (
                    <motion.div
                      key={tooth}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.4 + index * 0.04 }}
                    >
                      <ToothWithBraces number={tooth} onClick={() => handleToothClick(tooth)} />
                    </motion.div>
                  ))}
                </div>
              </div>
              <motion.div 
                className="text-center text-sm font-medium text-purple-600"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.7 }}
              >
                Lower Teeth
              </motion.div>
            </div>

            {/* Tips Section */}
            <motion.div 
              className="mt-8 pt-8 border-t-2 border-purple-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8 }}
            >
              <h3 className="text-sm mb-3 font-medium text-gray-700">
                💡 Braces Care Tips
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold text-purple-600">Color Selection:</span> Choose colors that complement your skin tone or match special occasions!
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-r from-pink-50 to-blue-50 rounded-lg border border-pink-200">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold text-pink-600">Maintenance:</span> Rubber bands should be changed every 4-6 weeks during your orthodontic visits.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* History and Payment Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Color Change History */}
            <motion.div
              className="bg-white p-6 rounded-xl shadow-lg border border-purple-100 backdrop-blur-sm bg-opacity-90"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.9 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-purple-600" />
                <h2 className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  Color Change History
                </h2>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {getPatientBracesData().colorHistory.length > 0 ? (
                  getPatientBracesData().colorHistory.map((entry, index) => {
                    const colorInfo = rubberBandColorOptions.find(c => c.value === entry.colorValue);
                    return (
                      <motion.div
                        key={index}
                        className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 hover:shadow-md transition-shadow"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 2.0 + index * 0.05 }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-full border-3 border-white shadow-md flex-shrink-0"
                              style={{ backgroundColor: entry.colorValue }}
                            />
                            <div>
                              <p className="font-semibold text-gray-800">{entry.colorName}</p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(entry.date).toLocaleDateString('en-US', { 
                                  month: 'long', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </p>
                              {entry.notes && (
                                <p className="text-xs text-gray-600 mt-1 italic">{entry.notes}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No color change history yet</p>
                    <p className="text-xs mt-1">Start selecting colors to build your history!</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Payment Balance */}
            <motion.div
              className="bg-white p-6 rounded-xl shadow-lg border border-purple-100 backdrop-blur-sm bg-opacity-90"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.9 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <PesoSign className="w-5 h-5 text-green-600" />
                <h2 className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Payment Summary
                </h2>
              </div>

              {/* Balance Summary Card */}
              <div className="mb-6 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 shadow-md">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Cost</p>
                    <p className="text-2xl font-bold text-gray-800">
                      ₱{getPatientBracesData().totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Paid</p>
                    <p className="text-2xl font-bold text-green-600">
                      ₱{getPatientBracesData().totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                
                <div className="pt-4 border-t-2 border-green-300">
                  <p className="text-xs text-gray-600 mb-2">Remaining Balance</p>
                  <p className={`text-3xl font-bold ${
                    (getPatientBracesData().totalCost - getPatientBracesData().totalPaid) > 0 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    ₱{(getPatientBracesData().totalCost - getPatientBracesData().totalPaid).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  
                  {(getPatientBracesData().totalCost - getPatientBracesData().totalPaid) === 0 && (
                    <motion.div
                      className="mt-3 px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm flex items-center gap-2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <CreditCard className="w-4 h-4" />
                      Fully Paid!
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Payment History */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Payment History
                </h3>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {getPatientBracesData().paymentRecords.length > 0 ? (
                    getPatientBracesData().paymentRecords.map((record, index) => (
                      <motion.div
                        key={record.id}
                        className={`p-3 rounded-lg border ${
                          record.type === 'payment' 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-blue-50 border-blue-200'
                        }`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 2.1 + index * 0.05 }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{record.description}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(record.date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </p>
                          </div>
                          <div className={`text-right`}>
                            <p className={`font-bold ${
                              record.type === 'payment' ? 'text-green-600' : 'text-blue-600'
                            }`}>
                              {record.type === 'payment' ? '-' : '+'}₱{record.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-gray-500">
                              {record.type === 'payment' ? 'Payment' : 'Charge'}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No payment records yet</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}