import { useState, useEffect } from 'react';
import { Patient } from '../App';
import { Sparkles, Star, RotateCcw, History, Calendar, Save } from 'lucide-react';
import { motion } from 'motion/react';
import { PatientSearch } from './PatientSearch';
import { formatToDD_MM_YYYY } from '../utils/dateHelpers';

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
  const [saveNotification, setSaveNotification] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('bracesChartData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setBracesData(parsedData);
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
        setSaveNotification(true);
        const timer = setTimeout(() => setSaveNotification(false), 2000);
        return () => clearTimeout(timer);
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

  const handleToothClick = (toothNumber: number) => {
    if (!selectedPatient) return;
    setSelectedTooth(toothNumber);
  };

  // Apply selected color to ALL brackets when color is clicked
  const handleColorSelect = (color: typeof rubberBandColorOptions[0]) => {
    if (!selectedPatient) return;
    
    setSelectedColor(color);
    
    // Apply to all brackets at once
    const currentData = getPatientBracesData();
    const updatedColors: { [toothNumber: number]: string } = {};
    [...upperTeeth, ...lowerTeeth].forEach(tooth => {
      updatedColors[tooth] = color.value;
    });
    
    const newHistoryEntry: ColorHistoryEntry = {
      date: new Date().toISOString(),
      colorName: color.name,
      colorValue: color.value,
      notes: `Changed all brackets to ${color.name}`
    };
    
    setBracesData({
      ...bracesData,
      [selectedPatient.id]: {
        ...currentData,
        rubberBandColors: updatedColors,
        colorHistory: [newHistoryEntry, ...currentData.colorHistory],
        lastUpdated: new Date().toISOString()
      }
    });
  };

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
        rubberBandColors: updatedColors,
        lastUpdated: new Date().toISOString()
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
        rubberBandColors: resetColors,
        lastUpdated: new Date().toISOString()
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
          {/* Main Content: Dental Chart + Color Palette Side by Side */}
          <div className="flex flex-col lg:flex-row gap-6 mb-6">
            
            {/* Dental Chart - Primary Focus */}
            <motion.div 
              className="flex-1 bg-white p-8 rounded-xl shadow-xl border border-purple-100 backdrop-blur-sm bg-opacity-90"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                  <h2 className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent text-xl font-bold">
                    Braces Chart - {selectedPatient.name}
                  </h2>
                </div>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span>Select a color to apply it to all brackets</span>
                </p>
              </div>

              {/* Professional Braces Chart - Improved Spacing and Anatomy */}
              <div className="space-y-3">
              {/* UPPER TEETH ARCH */}
              <div className="relative mx-auto" style={{ width: '800px', height: '220px' }}>
                <svg width="800" height="220" viewBox="0 0 800 220" className="w-full">
                  <defs>
                    <filter id="gumShadow">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
                      <feOffset dx="0" dy="1" result="offsetblur" />
                      <feComponentTransfer>
                        <feFuncA type="linear" slope="0.3"/>
                      </feComponentTransfer>
                    </filter>
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

                  {/* Upper Gum - Improved anatomical curve */}
                  <path
                    d="M 40,60
                       C 40,25 120,10 400,10
                       C 680,10 760,25 760,60
                       C 760,85 720,108 620,120
                       C 520,130 420,135 400,135
                       C 380,135 280,130 180,120
                       C 80,108 40,85 40,60
                       Z"
                    fill="url(#upperGumGradient)"
                    filter="url(#gumShadow)"
                  />

                  {/* Gum shine/highlight */}
                  <ellipse cx="400" cy="28" rx="300" ry="14" fill="white" opacity="0.3" />
                  
                  {/* Gum texture lines for realism */}
                  {[...Array(15)].map((_, i) => (
                    <path
                      key={`gum-line-${i}`}
                      d={`M ${60 + i * 47},65 Q ${65 + i * 47},72 ${70 + i * 47},78`}
                      stroke="#ff8fa0"
                      strokeWidth="0.4"
                      fill="none"
                      opacity="0.3"
                    />
                  ))}

                  {/* Individual Teeth - 16 teeth across - Improved anatomy */}
                  {upperTeeth.map((tooth, index) => {
                    const teethSpacing = 44;  // Tighter spacing for professional look
                    const centerIndex = 7.5;
                    const offset = index - centerIndex;
                    
                    // Better teeth positioning - roots embedded in gums
                    const startX = 30 + index * teethSpacing;
                    const gumCurve = Math.pow(Math.abs(offset) * 0.12, 1.5) * 22;
                    const toothY = 132 - gumCurve; // Proper tooth emergence
                    const toothWidth = 38;
                    const toothHeight = 50;
                    
                    // Rotation to follow arch naturally
                    const rotation = offset * 2.5;
                    
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
                        {/* Tooth root (in gum) */}
                        <path
                          d={`M ${startX + 15},135 L ${startX + 10},155 Q ${startX + 15},160 ${startX + 23},155 L ${startX + 18},135`}
                          fill="#f5e6d3"
                          opacity="0.6"
                        />
                        
                        {/* Tooth crown - more realistic shape */}
                        <path
                          d={`M ${startX + 10},135
                             L ${startX + 8},105 Q ${startX + 8},80 ${startX + 19},75
                             L ${startX + 30},75 Q ${startX + 41},80 ${startX + 41},105
                             L ${startX + 39},135
                             Z`}
                          fill="url(#upperToothGradient)"
                          stroke={isHovered ? '#4b90ff' : '#d0d0d0'}
                          strokeWidth={isHovered ? '1.5' : '0.8'}
                        />
                        
                        {/* Tooth highlight/shine for depth */}
                        <ellipse
                          cx={startX + 15}
                          cy={90}
                          rx="4"
                          ry="10"
                          fill="white"
                          opacity="0.6"
                        />
                        
                        {/* Tooth midline shadow for dimension */}
                        <line
                          x1={startX + 19}
                          y1={75}
                          x2={startX + 19}
                          y2={133}
                          stroke="#ddd"
                          strokeWidth="0.5"
                          opacity="0.3"
                        />
                        
                        {/* SINGLE centered bracket */}
                        <rect
                          x={startX + 15}
                          y={toothY + 25}
                          width="10"
                          height="10"
                          rx="0.8"
                          fill="url(#bracketGradient)"
                          stroke="#555555"
                          strokeWidth="0.5"
                        />
                        
                        {/* Bracket slot details for realism */}
                        <line x1={startX + 16} y1={toothY + 28.5} x2={startX + 24} y2={toothY + 28.5} stroke="#333" strokeWidth="0.6" opacity="0.8" />
                        <line x1={startX + 16} y1={toothY + 32} x2={startX + 24} y2={toothY + 32} stroke="#333" strokeWidth="0.6" opacity="0.8" />
                        
                        {/* Bracket shine */}
                        <rect x={startX + 16} y={toothY + 25.5} width="1.2" height="2" fill="white" opacity="0.7" />
                        
                        {/* Single rubber band centered on bracket */}
                        <circle
                          cx={startX + 20}
                          cy={toothY + 30}
                          r="6.5"
                          fill={rubberBandColor}
                          stroke={colorOption.stroke}
                          strokeWidth="1"
                          opacity={isSelected ? 1 : 0.9}
                          filter="url(#gumShadow)"
                        />
                        
                        {/* Rubber band shine */}
                        <ellipse cx={startX + 18} cy={toothY + 28} rx="2" ry="2.5" fill="white" opacity="0.5" />
                      </g>
                    );
                  })}

                  {/* Upper Archwire - Improved alignment and curve */}
                  <path
                    d="M 20,135
                       Q 400,115 780,135"
                    stroke="url(#wireGradient)"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    filter="url(#gumShadow)"
                  />
                  
                  {/* Wire connection points to brackets - visual continuity */}
                  {upperTeeth.map((tooth, index) => {
                    const teethSpacing = 44;
                    const centerIndex = 7.5;
                    const offset = index - centerIndex;
                    const startX = 30 + index * teethSpacing;
                    const gumCurve = Math.pow(Math.abs(offset) * 0.12, 1.5) * 22;
                    const toothY = 132 - gumCurve;
                    
                    return (
                      <g key={`wire-connection-${tooth}`}>
                        {/* Center bracket to wire connection */}
                        <line x1={startX + 20} y1={toothY + 35} x2={startX + 20} y2={toothY + 50} stroke="#999" strokeWidth="0.8" opacity="0.4" />
                      </g>
                    );
                  })}
                  
                  {/* Wire shine */}
                  <path
                    d="M 20,133
                       Q 400,113.5 780,133"
                    stroke="white"
                    strokeWidth="0.8"
                    fill="none"
                    opacity="0.4"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* LOWER TEETH ARCH - Reduced spacing from 200px to ~60px gap */}
              <div className="relative mx-auto" style={{ width: '800px', height: '220px' }}>
                <svg width="800" height="220" viewBox="0 0 800 220" className="w-full">
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

                  {/* Lower Gum - Improved anatomical curve */}
                  <path
                    d="M 40,160
                       C 40,185 120,200 400,210
                       C 680,200 760,185 760,160
                       C 760,135 720,112 620,100
                       C 520,90 420,85 400,85
                       C 380,85 280,90 180,100
                       C 80,112 40,135 40,160
                       Z"
                    fill="url(#lowerGumGradient)"
                    filter="url(#gumShadow)"
                  />

                  {/* Gum shine/highlight */}
                  <ellipse cx="400" cy="192" rx="300" ry="14" fill="white" opacity="0.2" />
                  
                  {/* Gum texture lines for realism */}
                  {[...Array(15)].map((_, i) => (
                    <path
                      key={`lower-gum-line-${i}`}
                      d={`M ${60 + i * 47},155 Q ${65 + i * 47},148 ${70 + i * 47},142`}
                      stroke="#ff5578"
                      strokeWidth="0.4"
                      fill="none"
                      opacity="0.3"
                    />
                  ))}

                  {/* Individual Teeth - 16 teeth across - Improved anatomy */}
                  {lowerTeeth.map((tooth, index) => {
                    const teethSpacing = 44;  // Tighter spacing for professional look
                    const centerIndex = 7.5;
                    const offset = index - centerIndex;
                    
                    // Better teeth positioning - roots embedded in gums
                    const startX = 30 + index * teethSpacing;
                    const gumCurve = Math.pow(Math.abs(offset) * 0.12, 1.5) * 22;
                    const toothY = 85 + gumCurve; // Lower teeth start where gum begins
                    const toothWidth = 38;
                    const toothHeight = 50;
                    
                    // Rotation to follow arch
                    const rotation = -offset * 2.5;
                    
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
                        {/* Tooth root (in gum) */}
                        <path
                          d={`M ${startX + 15},85 L ${startX + 10},65 Q ${startX + 15},60 ${startX + 23},65 L ${startX + 18},85`}
                          fill="#f5e6d3"
                          opacity="0.6"
                        />
                        
                        {/* Tooth crown - more realistic shape for lower teeth */}
                        <path
                          d={`M ${startX + 10},85
                             L ${startX + 8},115 Q ${startX + 8},140 ${startX + 19},145
                             L ${startX + 30},145 Q ${startX + 41},140 ${startX + 41},115
                             L ${startX + 39},85
                             Z`}
                          fill="url(#lowerToothGradient)"
                          stroke={isHovered ? '#4b90ff' : '#d0d0d0'}
                          strokeWidth={isHovered ? '1.5' : '0.8'}
                        />
                        
                        {/* Tooth highlight/shine for depth */}
                        <ellipse
                          cx={startX + 15}
                          cy={130}
                          rx="4"
                          ry="10"
                          fill="white"
                          opacity="0.6"
                        />
                        
                        {/* Tooth midline shadow for dimension */}
                        <line
                          x1={startX + 19}
                          y1={145}
                          x2={startX + 19}
                          y2={87}
                          stroke="#ddd"
                          strokeWidth="0.5"
                          opacity="0.3"
                        />
                        
                        {/* SINGLE centered bracket */}
                        <rect
                          x={startX + 15}
                          y={toothY + 25}
                          width="10"
                          height="10"
                          rx="0.8"
                          fill="url(#bracketGradient)"
                          stroke="#555555"
                          strokeWidth="0.5"
                        />
                        
                        {/* Bracket slot details */}
                        <line x1={startX + 16} y1={toothY + 28.5} x2={startX + 24} y2={toothY + 28.5} stroke="#333" strokeWidth="0.6" opacity="0.8" />
                        <line x1={startX + 16} y1={toothY + 32} x2={startX + 24} y2={toothY + 32} stroke="#333" strokeWidth="0.6" opacity="0.8" />
                        
                        {/* Bracket shine */}
                        <rect x={startX + 16} y={toothY + 25.5} width="1.2" height="2" fill="white" opacity="0.7" />
                        
                        {/* Single rubber band centered on bracket */}
                        <circle
                          cx={startX + 20}
                          cy={toothY + 30}
                          r="6.5"
                          fill={rubberBandColor}
                          stroke={colorOption.stroke}
                          strokeWidth="1"
                          opacity={isSelected ? 1 : 0.9}
                          filter="url(#gumShadow)"
                        />
                        
                        {/* Rubber band shine */}
                        <ellipse cx={startX + 18} cy={toothY + 28} rx="2" ry="2.5" fill="white" opacity="0.5" />
                      </g>
                    );
                  })}

                  {/* Lower Archwire - Improved alignment */}
                  <path
                    d="M 20,85
                       Q 400,105 780,85"
                    stroke="url(#wireGradient)"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    filter="url(#gumShadow)"
                  />
                  
                  {/* Wire connection points to brackets */}
                  {lowerTeeth.map((tooth, index) => {
                    const teethSpacing = 44;
                    const centerIndex = 7.5;
                    const offset = index - centerIndex;
                    const startX = 30 + index * teethSpacing;
                    const gumCurve = Math.pow(Math.abs(offset) * 0.12, 1.5) * 22;
                    const toothY = 85 + gumCurve;
                    
                    return (
                      <g key={`lower-wire-connection-${tooth}`}>
                        {/* Center bracket to wire connection */}
                        <line x1={startX + 20} y1={toothY + 35} x2={startX + 20} y2={toothY + 55} stroke="#999" strokeWidth="0.8" opacity="0.4" />
                      </g>
                    );
                  })}
                  
                  {/* Wire shine */}
                  <path
                    d="M 20,83
                       Q 400,103 780,83"
                    stroke="white"
                    strokeWidth="0.8"
                    fill="none"
                    opacity="0.4"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            {/* Tips Section */}
            <motion.div 
              className="mt-6 pt-6 border-t-2 border-purple-100"
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

            {/* Color Palette Sidebar */}
            <motion.div 
              className="lg:w-80 bg-white p-6 rounded-xl shadow-lg border border-purple-100 backdrop-blur-sm bg-opacity-90 h-fit"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  Rubber Band Colors
                </h3>
                <motion.button
                  onClick={resetAllColors}
                  className="px-3 py-1.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-1"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Reset all rubber bands to clear"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </motion.button>
              </div>
              
              <p className="text-xs text-gray-600 mb-3 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-500" />
                Click any color to apply to all brackets
              </p>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {rubberBandColorOptions.map((color, index) => (
                  <motion.button
                    key={color.name}
                    onClick={() => handleColorSelect(color)}
                    className={`relative group transition-all`}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.03 }}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.85 }}
                  >
                    <div
                      className={`w-full aspect-square rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border-3 ${
                        selectedColor.name === color.name
                          ? 'border-purple-600 ring-2 ring-purple-200 scale-105'
                          : 'border-white hover:border-purple-300'
                      }`}
                      style={{ backgroundColor: color.value }}
                    />
                    <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                      <div className="bg-black bg-opacity-80 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap">
                        {color.name}
                      </div>
                    </div>
                    {selectedColor.name === color.name && (
                      <motion.div
                        className="absolute -top-1.5 -right-1.5"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <div className="w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center shadow-lg">
                          <Sparkles className="w-2.5 h-2.5 text-white" />
                        </div>
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>

              <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <p className="text-xs font-medium text-gray-700 mb-2">Selected:</p>
                <div className="flex items-center gap-2">
                  <span 
                    className="inline-block w-6 h-6 rounded-full border-2 border-white shadow-md"
                    style={{ backgroundColor: selectedColor.value }}
                  />
                  <span className="text-sm font-semibold text-purple-700">{selectedColor.name}</span>
                </div>
              </div>

              {saveNotification && (
                <motion.div
                  className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-xs"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Changes saved</span>
                </motion.div>
              )}
            </motion.div>
          </div>

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
                                {formatToDD_MM_YYYY(entry.date)}
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