import { useState } from 'react';
import { Patient } from '../App';
import { Sparkles, Star, RotateCcw, History, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { PatientSearch } from './PatientSearch';

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
        defaultColors[tooth as number] = rubberBandColorOptions[0].value;
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



  return (
    <div className="p-8 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 min-h-screen">

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
        <>
          {/* Color Palette */}
          <motion.div 
            className="bg-white p-6 rounded-xl shadow-lg border border-purple-100 mb-6 backdrop-blur-sm bg-opacity-90"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
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

            {/* Professional Braces Chart - Like Reference Image */}
            <div className="space-y-6">
              {/* UPPER TEETH ARCH */}
              <div className="relative mx-auto" style={{ width: '800px', height: '280px' }}>
                <svg width="800" height="280" viewBox="0 0 800 280" className="w-full">
                  <defs>
                    <linearGradient id="upperGumGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#ff9eb5' }} />
                      <stop offset="100%" style={{ stopColor: '#ff6a8f' }} />
                    </linearGradient>
                    <linearGradient id="upperToothGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#fffdf7' }} />
                      <stop offset="100%" style={{ stopColor: '#e8e8e8' }} />
                    </linearGradient>
                    <linearGradient id="bracketGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#e0e0e0' }} />
                      <stop offset="50%" style={{ stopColor: '#a0a0a0' }} />
                      <stop offset="100%" style={{ stopColor: '#707070' }} />
                    </linearGradient>
                    <linearGradient id="wireGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#e0e0e0' }} />
                      <stop offset="50%" style={{ stopColor: '#b0b0b0' }} />
                      <stop offset="100%" style={{ stopColor: '#909090' }} />
                    </linearGradient>
                  </defs>

                  {/* Upper Gum - Major curved shape */}
                  <path
                    d="M 40,50
                       C 40,20 120,5 400,5
                       C 680,5 760,20 760,50
                       C 760,80 720,110 620,128
                       C 520,142 420,148 400,148
                       C 380,148 280,142 180,128
                       C 80,110 40,80 40,50
                       Z"
                    fill="url(#upperGumGradient)"
                    filter="url(#gumShadow)"
                  />

                  {/* Gum shine/highlight */}
                  <ellipse cx="400" cy="28" rx="300" ry="16" fill="white" opacity="0.25" />

                  {/* Individual Teeth - 16 teeth across */}
                  {upperTeeth.map((tooth, index) => {
                    const teethSpacing = 44;
                    const centerIndex = 7.5;
                    const offset = index - centerIndex;
                    
                    // Teeth positioned on gum curve - aligned with gum edge
                    const startX = 40 + index * teethSpacing;
                    const gumCurve = Math.pow(Math.abs(offset) * 0.15, 1.6) * 24;
                    const toothY = 145 - gumCurve; // Teeth start where gum ends
                    const toothWidth = 40;
                    const toothHeight = 52;
                    
                    // Rotation to follow arch
                    const rotation = offset * 3;
                    
                    const currentData = getPatientBracesData();
                    const rubberBandColor = currentData.rubberBandColors[tooth] || rubberBandColorOptions[0].value;
                    const colorOption = rubberBandColorOptions.find(c => c.value === rubberBandColor) || rubberBandColorOptions[0];
                    const isHovered = hoveredTooth === tooth;
                    const isSelected = selectedTooth === tooth;

                    return (
                      <g 
                        key={tooth} 
                        onClick={() => handleToothClick(tooth)} 
                        onMouseEnter={() => setHoveredTooth(tooth)} 
                        onMouseLeave={() => setHoveredTooth(null)} 
                        style={{ cursor: 'pointer' }}
                        transform={`translate(${startX + toothWidth/2},${toothY + toothHeight/2}) rotate(${rotation}) translate(${-(startX + toothWidth/2)},${-(toothY + toothHeight/2)})`}
                      >
                        {/* Tooth - smooth rounded shape, sitting on gum */}
                        <ellipse
                          cx={startX + toothWidth/2}
                          cy={toothY + toothHeight/2}
                          rx="22"
                          ry="28"
                          fill="url(#upperToothGradient)"
                          stroke={isHovered ? '#4b90ff' : '#c0c0c0'}
                          strokeWidth={isHovered ? '2' : '1'}
                        />
                        
                        {/* Tooth shine */}
                        <ellipse
                          cx={startX + toothWidth/2 - 8}
                          cy={toothY + 15}
                          rx="4"
                          ry="8"
                          fill="white"
                          opacity="0.5"
                        />
                        
                        {/* Left bracket */}
                        <rect
                          x={startX + 8}
                          y={toothY + 28}
                          width="11"
                          height="11"
                          rx="1"
                          fill="url(#bracketGradient)"
                          stroke="#555555"
                          strokeWidth="0.6"
                        />
                        
                        {/* Right bracket */}
                        <rect
                          x={startX + 26}
                          y={toothY + 28}
                          width="11"
                          height="11"
                          rx="1"
                          fill="url(#bracketGradient)"
                          stroke="#555555"
                          strokeWidth="0.6"
                        />
                        
                        {/* Bracket slot details */}
                        <line x1={startX + 9} y1={toothY + 31.5} x2={startX + 18} y2={toothY + 31.5} stroke="#444444" strokeWidth="0.8" opacity="0.9" />
                        <line x1={startX + 9} y1={toothY + 35} x2={startX + 18} y2={toothY + 35} stroke="#444444" strokeWidth="0.8" opacity="0.9" />
                        <line x1={startX + 27} y1={toothY + 31.5} x2={startX + 36} y2={toothY + 31.5} stroke="#444444" strokeWidth="0.8" opacity="0.9" />
                        <line x1={startX + 27} y1={toothY + 35} x2={startX + 36} y2={toothY + 35} stroke="#444444" strokeWidth="0.8" opacity="0.9" />
                        
                        {/* Bracket shine */}
                        <rect x={startX + 9} y={toothY + 28.5} width="1.5" height="2" fill="white" opacity="0.6" />
                        <rect x={startX + 27} y={toothY + 28.5} width="1.5" height="2" fill="white" opacity="0.6" />
                        
                        {/* Left rubber band */}
                        <circle
                          cx={startX + 13.5}
                          cy={toothY + 33.5}
                          r="6.5"
                          fill={rubberBandColor}
                          stroke={colorOption.stroke}
                          strokeWidth="1"
                          opacity={isSelected ? 1 : 0.9}
                          filter="url(#gumShadow)"
                        />
                        
                        {/* Right rubber band */}
                        <circle
                          cx={startX + 31.5}
                          cy={toothY + 33.5}
                          r="6.5"
                          fill={rubberBandColor}
                          stroke={colorOption.stroke}
                          strokeWidth="1"
                          opacity={isSelected ? 1 : 0.9}
                          filter="url(#gumShadow)"
                        />
                        
                        {/* Rubber band shine */}
                        <ellipse cx={startX + 12} cy={toothY + 31.5} rx="2" ry="2.5" fill="white" opacity="0.4" />
                        <ellipse cx={startX + 30} cy={toothY + 31.5} rx="2" ry="2.5" fill="white" opacity="0.4" />
                      </g>
                    );
                  })}

                  {/* Upper Archwire */}
                  <path
                    d="M 25,128
                       Q 400,110 775,128"
                    stroke="url(#wireGradient)"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                  
                  {/* Wire shine */}
                  <path
                    d="M 25,126.5
                       Q 400,108.5 775,126.5"
                    stroke="white"
                    strokeWidth="1"
                    fill="none"
                    opacity="0.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* LOWER TEETH ARCH */}
              <div className="relative mx-auto" style={{ width: '800px', height: '280px' }}>
                <svg width="800" height="280" viewBox="0 0 800 280" className="w-full">
                  <defs>
                    <linearGradient id="lowerGumGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#ff6a8f' }} />
                      <stop offset="100%" style={{ stopColor: '#ff3366' }} />
                    </linearGradient>
                    <linearGradient id="lowerToothGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#fffdf7' }} />
                      <stop offset="100%" style={{ stopColor: '#e8e8e8' }} />
                    </linearGradient>
                  </defs>

                  {/* Lower Gum - Major curved shape */}
                  <path
                    d="M 40,230
                       C 40,260 120,275 400,275
                       C 680,275 760,260 760,230
                       C 760,200 720,170 620,152
                       C 520,138 420,132 400,132
                       C 380,132 280,138 180,152
                       C 80,170 40,200 40,230
                       Z"
                    fill="url(#lowerGumGradient)"
                    filter="url(#gumShadow)"
                  />

                  {/* Gum shine/highlight */}
                  <ellipse cx="400" cy="252" rx="300" ry="16" fill="white" opacity="0.2" />

                  {/* Individual Teeth - 16 teeth across */}
                  {lowerTeeth.map((tooth, index) => {
                    const teethSpacing = 44;
                    const centerIndex = 7.5;
                    const offset = index - centerIndex;
                    
                    // Teeth positioned on gum curve (opposite of upper)
                    const startX = 40 + index * teethSpacing;
                    const gumCurve = Math.pow(Math.abs(offset) * 0.15, 1.6) * 24;
                    const toothY = 135 + gumCurve; // Lower teeth start where gum begins
                    const toothWidth = 40;
                    const toothHeight = 52;
                    
                    // Rotation to follow arch
                    const rotation = -offset * 3;
                    
                    const currentData = getPatientBracesData();
                    const rubberBandColor = currentData.rubberBandColors[tooth] || rubberBandColorOptions[0].value;
                    const colorOption = rubberBandColorOptions.find(c => c.value === rubberBandColor) || rubberBandColorOptions[0];
                    const isHovered = hoveredTooth === tooth;
                    const isSelected = selectedTooth === tooth;

                    return (
                      <g 
                        key={tooth} 
                        onClick={() => handleToothClick(tooth)} 
                        onMouseEnter={() => setHoveredTooth(tooth)} 
                        onMouseLeave={() => setHoveredTooth(null)} 
                        style={{ cursor: 'pointer' }}
                        transform={`translate(${startX + toothWidth/2},${toothY + toothHeight/2}) rotate(${rotation}) translate(${-(startX + toothWidth/2)},${-(toothY + toothHeight/2)})`}
                      >
                        {/* Tooth - smooth rounded shape */}
                        <ellipse
                          cx={startX + toothWidth/2}
                          cy={toothY + toothHeight/2 + 5}
                          rx="22"
                          ry="28"
                          fill="url(#lowerToothGradient)"
                          stroke={isHovered ? '#4b90ff' : '#c0c0c0'}
                          strokeWidth={isHovered ? '2' : '1'}
                        />
                        
                        {/* Tooth shine */}
                        <ellipse
                          cx={startX + toothWidth/2 - 8}
                          cy={toothY + 25}
                          rx="4"
                          ry="8"
                          fill="white"
                          opacity="0.5"
                        />
                        
                        {/* Left bracket */}
                        <rect
                          x={startX + 8}
                          y={toothY + 28}
                          width="11"
                          height="11"
                          rx="1"
                          fill="url(#bracketGradient)"
                          stroke="#555555"
                          strokeWidth="0.6"
                        />
                        
                        {/* Right bracket */}
                        <rect
                          x={startX + 26}
                          y={toothY + 28}
                          width="11"
                          height="11"
                          rx="1"
                          fill="url(#bracketGradient)"
                          stroke="#555555"
                          strokeWidth="0.6"
                        />
                        
                        {/* Bracket slot details */}
                        <line x1={startX + 9} y1={toothY + 31.5} x2={startX + 18} y2={toothY + 31.5} stroke="#444444" strokeWidth="0.8" opacity="0.9" />
                        <line x1={startX + 9} y1={toothY + 35} x2={startX + 18} y2={toothY + 35} stroke="#444444" strokeWidth="0.8" opacity="0.9" />
                        <line x1={startX + 27} y1={toothY + 31.5} x2={startX + 36} y2={toothY + 31.5} stroke="#444444" strokeWidth="0.8" opacity="0.9" />
                        <line x1={startX + 27} y1={toothY + 35} x2={startX + 36} y2={toothY + 35} stroke="#444444" strokeWidth="0.8" opacity="0.9" />
                        
                        {/* Bracket shine */}
                        <rect x={startX + 9} y={toothY + 28.5} width="1.5" height="2" fill="white" opacity="0.6" />
                        <rect x={startX + 27} y={toothY + 28.5} width="1.5" height="2" fill="white" opacity="0.6" />
                        
                        {/* Left rubber band */}
                        <circle
                          cx={startX + 13.5}
                          cy={toothY + 33.5}
                          r="6.5"
                          fill={rubberBandColor}
                          stroke={colorOption.stroke}
                          strokeWidth="1"
                          opacity={isSelected ? 1 : 0.9}
                          filter="url(#gumShadow)"
                        />
                        
                        {/* Right rubber band */}
                        <circle
                          cx={startX + 31.5}
                          cy={toothY + 33.5}
                          r="6.5"
                          fill={rubberBandColor}
                          stroke={colorOption.stroke}
                          strokeWidth="1"
                          opacity={isSelected ? 1 : 0.9}
                          filter="url(#gumShadow)"
                        />
                        
                        {/* Rubber band shine */}
                        <ellipse cx={startX + 12} cy={toothY + 31.5} rx="2" ry="2.5" fill="white" opacity="0.4" />
                        <ellipse cx={startX + 30} cy={toothY + 31.5} rx="2" ry="2.5" fill="white" opacity="0.4" />
                      </g>
                    );
                  })}

                  {/* Lower Archwire */}
                  <path
                    d="M 25,152
                       Q 400,170 775,152"
                    stroke="url(#wireGradient)"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                  
                  {/* Wire shine */}
                  <path
                    d="M 25,153.5
                       Q 400,171.5 775,153.5"
                    stroke="white"
                    strokeWidth="1"
                    fill="none"
                    opacity="0.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
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

          {/* History Section */}
          <div className="grid grid-cols-1 gap-6 mt-6">
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
                  getPatientBracesData().colorHistory.map((entry: { colorValue: string; colorName: string; date: string; notes?: string }, index: number) => (
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
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No color change history yet</p>
                    <p className="text-xs mt-1">Start selecting colors to build your history!</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}