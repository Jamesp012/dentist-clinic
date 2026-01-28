import { useState } from 'react';
import { Patient, TreatmentRecord } from '../App';
import { Info, Sparkles, Star, Zap, StickyNote } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PatientSearch } from './PatientSearch';

type DentalChartingProps = {
  patients: Patient[];
  treatmentRecords: TreatmentRecord[];
  setTreatmentRecords: (records: TreatmentRecord[]) => void;
};

type ToothCondition = {
  toothNumber: number;
  conditions: string[];
  notes: string;
};

const toothConditionColors: { [key: string]: string } = {
  'Healthy': 'fill-white stroke-gray-400',
  'Cavity': 'fill-red-200 stroke-red-500',
  'Decay': 'fill-red-300 stroke-red-600',
  'Filled': 'fill-blue-200 stroke-blue-500',
  'Composite': 'fill-blue-300 stroke-blue-600',
  'Crown': 'fill-yellow-200 stroke-yellow-600',
  'Root Canal': 'fill-purple-200 stroke-purple-500',
  'Endodontic': 'fill-purple-300 stroke-purple-600',
  'Missing': 'fill-gray-300 stroke-gray-500',
  'Extraction': 'fill-gray-400 stroke-gray-600',
  'Implant': 'fill-green-200 stroke-green-500',
  'Bridge': 'fill-orange-200 stroke-orange-500',
  'Cracked': 'fill-amber-200 stroke-amber-600',
  'Fractured': 'fill-amber-300 stroke-amber-700',
  'Sensitive': 'fill-cyan-200 stroke-cyan-500',
  'Abscess': 'fill-rose-300 stroke-rose-600',
  'Gum Disease': 'fill-lime-200 stroke-lime-600',
  'Bruxism': 'fill-indigo-200 stroke-indigo-600',
  'Stained': 'fill-yellow-300 stroke-yellow-700',
  'Discolored': 'fill-yellow-400 stroke-yellow-800',
  'Exposed Root': 'fill-pink-200 stroke-pink-600',
  'Plaque/Tartar': 'fill-slate-300 stroke-slate-600',
};

// Order of conditions for cycling through on tap
const conditionCycleOrder = [
  'Healthy',
  'Cavity',
  'Decay',
  'Filled',
  'Composite',
  'Crown',
  'Root Canal',
  'Endodontic',
  'Missing',
  'Extraction',
  'Implant',
  'Bridge',
  'Cracked',
  'Fractured',
  'Sensitive',
  'Abscess',
  'Gum Disease',
  'Bruxism',
  'Stained',
  'Discolored',
  'Exposed Root',
  'Plaque/Tartar'
];

export function DentalCharting({ patients, treatmentRecords, setTreatmentRecords }: DentalChartingProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [toothConditions, setToothConditions] = useState<{ [patientId: string]: ToothCondition[] }>({});
  const [hoveredTooth, setHoveredTooth] = useState<number | null>(null);
  const [clickedTooth, setClickedTooth] = useState<number | null>(null);
  const [showSparkles, setShowSparkles] = useState<number | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);

  // Adult teeth numbering (Universal Numbering System)
  const upperTeeth = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const lowerTeeth = [32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17];

  const getToothCondition = (toothNumber: number): ToothCondition => {
    if (!selectedPatient) return { toothNumber, conditions: ['Healthy'], notes: '' };
    
    const patientConditions = toothConditions[selectedPatient.id] || [];
    const condition = patientConditions.find(c => c.toothNumber === toothNumber);
    return condition || { toothNumber, conditions: ['Healthy'], notes: '' };
  };

  const updateToothCondition = (toothNumber: number, conditions: string[], notes: string) => {
    if (!selectedPatient) return;

    const patientConditions = toothConditions[selectedPatient.id] || [];
    const updatedConditions = patientConditions.filter(c => c.toothNumber !== toothNumber);
    
    if (conditions.length > 0 && conditions[0] !== 'Healthy') {
      updatedConditions.push({ toothNumber, conditions, notes });
    }

    setToothConditions({
      ...toothConditions,
      [selectedPatient.id]: updatedConditions
    });
    
    // Show sparkles effect when condition is saved
    setShowSparkles(toothNumber);
    setTimeout(() => setShowSparkles(null), 1000);
  };

  const handleToothClick = (toothNumber: number) => {
    if (!selectedPatient) return;
    
    setClickedTooth(toothNumber);
    setTimeout(() => setClickedTooth(null), 300);
    
    // Get current tooth condition
    const currentCondition = getToothCondition(toothNumber);
    
    // Find the index of the current condition in the cycle order
    const currentIndex = conditionCycleOrder.indexOf(currentCondition.conditions[0]);
    // Get the next condition in the cycle
    const nextCondition = conditionCycleOrder[(currentIndex + 1) % conditionCycleOrder.length];
    
    // Apply the next condition immediately
    updateToothCondition(toothNumber, [nextCondition], currentCondition.notes);
  };

  const handleNotesClick = (toothNumber: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTooth(toothNumber);
    setShowNotesModal(true);
  };

  const handleSaveNotes = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTooth) return;

    const formData = new FormData(e.currentTarget);
    const notes = formData.get('notes') as string;

    const currentCondition = getToothCondition(selectedTooth);
    updateToothCondition(selectedTooth, currentCondition.conditions, notes);
    setShowNotesModal(false);
    setSelectedTooth(null);
  };

  const handleSaveTreatmentRecord = () => {
    if (!selectedPatient) {
      alert('Please select a patient first');
      return;
    }

    const patientConditions = toothConditions[selectedPatient.id] || [];
    if (patientConditions.length === 0) {
      alert('Please mark at least one tooth condition before saving');
      return;
    }

    // Create a treatment record from the marked conditions
    const conditionSummary = patientConditions
      .map(c => `Tooth #${c.toothNumber}: ${c.conditions[0]}${c.notes ? ` - ${c.notes}` : ''}`)
      .join('; ');

    const newRecord: TreatmentRecord = {
      id: Date.now().toString(),
      patientId: selectedPatient.id,
      date: new Date().toISOString(),
      description: conditionSummary,
      type: 'Dental Charting',
      cost: 0,
      notes: 'Treatment record created from dental charting'
    };

    setTreatmentRecords([...treatmentRecords, newRecord]);
    alert('Treatment record saved successfully!');
    // Clear the conditions for this patient
    setToothConditions({
      ...toothConditions,
      [selectedPatient.id]: []
    });
  };

  const ToothSVG = ({ number, onClick }: { number: number; onClick: () => void }) => {
    const condition = getToothCondition(number);
    const primaryCondition = condition.conditions[0] || 'Healthy';
    const colorClass = toothConditionColors[primaryCondition] || toothConditionColors['Healthy'];
    const isHovered = hoveredTooth === number;
    const isClicked = clickedTooth === number;
    const hasSparkles = showSparkles === number;

    // Extract color from class for SVG use
    const getColorFromClass = (cls: string): string => {
      const colorMap: { [key: string]: string } = {
        'fill-white': '#ffffff',
        'fill-red-200': '#fecaca',
        'fill-blue-200': '#bfdbfe',
        'fill-yellow-200': '#fef08a',
        'fill-purple-200': '#e9d5ff',
        'fill-gray-300': '#d1d5db',
        'fill-green-200': '#dcfce7',
        'fill-orange-200': '#fed7aa',
      };
      const matches = cls.match(/fill-\w+-\d+/);
      return matches ? colorMap[matches[0]] || '#ffffff' : '#ffffff';
    };

    const toothColor = getColorFromClass(colorClass);
    const strokeColor = colorClass.includes('white') ? '#9ca3af' : 
                       colorClass.includes('red') ? '#ef4444' :
                       colorClass.includes('blue') ? '#3b82f6' :
                       colorClass.includes('yellow') ? '#eab308' :
                       colorClass.includes('purple') ? '#a855f7' :
                       colorClass.includes('gray') ? '#6b7280' :
                       colorClass.includes('green') ? '#22c55e' :
                       colorClass.includes('orange') ? '#f97316' : '#9ca3af';

    return (
      <div className="relative flex flex-col items-center">
        <motion.div
          className="flex flex-col items-center cursor-pointer select-none"
          onClick={onClick}
          onMouseEnter={() => setHoveredTooth(number)}
          onMouseLeave={() => setHoveredTooth(null)}
          whileHover={{ scale: 1.15, y: -5 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <motion.span 
            className="text-xs mb-1 text-gray-600 font-medium"
            animate={isHovered ? { scale: 1.2, color: '#3b82f6' } : {}}
          >
            {number}
          </motion.span>
          
          <div className="relative">
            <motion.svg 
              width="50" 
              height="70" 
              viewBox="0 0 50 80"
              className="drop-shadow-md"
              animate={isClicked ? { 
                rotate: [0, -10, 10, -10, 10, 0],
                scale: [1, 1.1, 1]
              } : {}}
              transition={{ duration: 0.3 }}
            >
              <defs>
                <linearGradient id={`crownGradient-${number}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={toothColor} stopOpacity="1" />
                  <stop offset="100%" stopColor={toothColor} stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id={`rootGradient-${number}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={toothColor} stopOpacity="0.95" />
                  <stop offset="100%" stopColor={toothColor} stopOpacity="0.7" />
                </linearGradient>
                <linearGradient id={`toothShine-${number}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="white" stopOpacity="0.7" />
                  <stop offset="50%" stopColor="white" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="white" stopOpacity="0" />
                </linearGradient>
                <radialGradient id={`toothHighlight-${number}`}>
                  <stop offset="0%" stopColor="white" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="white" stopOpacity="0" />
                </radialGradient>
                <filter id={`shadow-${number}`}>
                  <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodOpacity="0.4"/>
                </filter>
                <filter id={`glow-${number}`}>
                  <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.6" floodColor="#3b82f6"/>
                </filter>
              </defs>
              
              {/* Glow background on hover */}
              {isHovered && (
                <motion.circle
                  cx="25"
                  cy="35"
                  r="22"
                  fill="#3b82f6"
                  opacity="0.1"
                  initial={{ r: 18 }}
                  animate={{ r: 24 }}
                  transition={{ duration: 0.3 }}
                />
              )}
              
              {/* REALISTIC TOOTH - Exact reference image shape */}
              <path
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
                fill={`url(#crownGradient-${number})`}
                stroke={strokeColor}
                strokeWidth="2.2"
                strokeLinejoin="round"
                strokeLinecap="round"
                filter={isHovered ? `url(#glow-${number})` : `url(#shadow-${number})`}
              />
              
              {/* Top chewing surface line */}
              <path
                d="M 14 16 Q 20 14, 26 16"
                stroke={strokeColor}
                strokeWidth="1.2"
                opacity="0.4"
                fill="none"
              />
              
              {/* Tooth surface highlight */}
              <ellipse
                cx="18"
                cy="22"
                rx="3"
                ry="5"
                fill="white"
                opacity="0.35"
              />
              
              {/* Gum line */}
              <ellipse
                cx="25"
                cy="43"
                rx="16"
                ry="3"
                fill="none"
                stroke="#d1d5db"
                strokeWidth="1.5"
                opacity="0.6"
              />
              
              {/* Shine/highlight on crown for healthy teeth */}
              {primaryCondition === 'Healthy' && (
                <>
                  <ellipse
                    cx="18"
                    cy="22"
                    rx="5"
                    ry="7"
                    fill={`url(#toothShine-${number})`}
                    opacity="0.7"
                  />
                  <circle
                    cx="16"
                    cy="19"
                    r="2.5"
                    fill={`url(#toothHighlight-${number})`}
                    opacity="0.9"
                  />
                </>
              )}
              
              {/* Animated sparkle on hover */}
              {isHovered && (
                <motion.ellipse
                  cx="18"
                  cy="22"
                  rx="3"
                  ry="5"
                  fill="white"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: [0, 0.8, 0], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
              )}
            </motion.svg>

            {/* Sparkles effect when condition is updated */}
            <AnimatePresence>
              {hasSparkles && (
                <>
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute top-1/2 left-1/2"
                      initial={{ 
                        x: 0, 
                        y: 0, 
                        scale: 0,
                        opacity: 1
                      }}
                      animate={{ 
                        x: Math.cos((i * Math.PI) / 4) * 35,
                        y: Math.sin((i * Math.PI) / 4) * 35,
                        scale: 1,
                        opacity: 0
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                    </motion.div>
                  ))}
                </>
              )}
            </AnimatePresence>

            {/* Status badge for non-healthy teeth */}
            <AnimatePresence>
              {condition.conditions[0] !== 'Healthy' && (
                <motion.div
                  className="absolute -top-3 -right-2"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  whileHover={{ rotate: 360, scale: 1.2 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                  <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <Zap className="w-3 h-3 text-white" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Notes button - Always visible and easily clickable */}
            <motion.button
              onClick={(e) => handleNotesClick(number, e)}
              className="absolute -bottom-3 -right-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full p-2 shadow-lg hover:shadow-2xl pointer-events-auto border-2 border-white"
              whileHover={{ scale: 1.25, rotate: 10 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              title="Add/Edit Notes"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
            >
              <StickyNote className="w-4 h-4 text-white" />
            </motion.button>

            {/* Notes indicator badge - shows when notes exist */}
            <AnimatePresence>
              {condition.notes && (
                <motion.div
                  className="absolute -top-3 -left-3"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                  <div className="w-5 h-5 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full shadow-md flex items-center justify-center border-2 border-white">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Enhanced tooltip */}
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
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-xl">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  <span className="font-medium">
                    {condition.conditions[0] === 'Healthy' 
                      ? 'Healthy Tooth' 
                      : condition.conditions.join(', ')}
                  </span>
                </div>
                {condition.conditions[0] !== 'Healthy' && condition.notes && (
                  <div className="text-xs opacity-90 mt-1">{condition.notes}</div>
                )}
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gradient-to-br from-blue-600 to-purple-600 rotate-45" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const patientChartData = selectedPatient
    ? toothConditions[selectedPatient.id] || []
    : [];

  const conditionSummary = patientChartData.reduce((acc, tooth) => {
    tooth.conditions.forEach(condition => {
      acc[condition] = (acc[condition] || 0) + 1;
    });
    return acc;
  }, {} as { [key: string]: number });

  return (
    <div className="p-8 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
      <motion.div 
        className="mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Interactive Dental Charting
        </h1>
        <p className="text-gray-600">Visual tooth condition tracking with interactive features</p>
      </motion.div>

      {/* Patient Selection */}
      <motion.div 
        className="bg-white p-6 rounded-xl shadow-lg border border-purple-100 mb-6 backdrop-blur-sm bg-opacity-90 relative z-20"
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

      {selectedPatient ? (
        <>
          {/* Dental Chart */}
          <motion.div 
            className="bg-white p-8 rounded-xl shadow-xl border border-purple-100 mb-6 backdrop-blur-sm bg-opacity-90"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-6 h-6 text-purple-600" />
                <h2 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Dental Chart - {selectedPatient.name}
                </h2>
              </div>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500" />
                Tap a tooth to cycle through conditions (Healthy → Cavity → Filled → Crown → Root Canal → Missing → Implant → Bridge)
              </p>
            </div>

            {/* Upper Teeth */}
            <div className="mb-16">
              <motion.div 
                className="text-center text-sm font-medium text-purple-600 mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Upper Teeth
              </motion.div>
              <div className="flex justify-center gap-3 mb-6">
                <div className="flex gap-3">
                  {upperTeeth.slice(0, 8).map((tooth, index) => (
                    <motion.div
                      key={tooth}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                    >
                      <ToothSVG number={tooth} onClick={() => handleToothClick(tooth)} />
                    </motion.div>
                  ))}
                </div>
                <div className="w-12" />
                <div className="flex gap-3">
                  {upperTeeth.slice(8, 16).map((tooth, index) => (
                    <motion.div
                      key={tooth}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + index * 0.05 }}
                    >
                      <ToothSVG number={tooth} onClick={() => handleToothClick(tooth)} />
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="border-b-4 border-gradient-to-r from-purple-300 via-blue-300 to-purple-300" style={{ 
                background: 'linear-gradient(90deg, #d8b4fe 0%, #93c5fd 50%, #d8b4fe 100%)',
                height: '3px'
              }} />
            </div>

            {/* Lower Teeth */}
            <div>
              <div className="border-b-4 border-gradient-to-r from-purple-300 via-blue-300 to-purple-300 mb-6" style={{ 
                background: 'linear-gradient(90deg, #d8b4fe 0%, #93c5fd 50%, #d8b4fe 100%)',
                height: '3px'
              }} />
              <div className="flex justify-center gap-3 mb-4">
                <div className="flex gap-3">
                  {lowerTeeth.slice(0, 8).reverse().map((tooth, index) => (
                    <motion.div
                      key={tooth}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.2 + index * 0.05 }}
                    >
                      <ToothSVG number={tooth} onClick={() => handleToothClick(tooth)} />
                    </motion.div>
                  ))}
                </div>
                <div className="w-12" />
                <div className="flex gap-3">
                  {lowerTeeth.slice(8, 16).reverse().map((tooth, index) => (
                    <motion.div
                      key={tooth}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.6 + index * 0.05 }}
                    >
                      <ToothSVG number={tooth} onClick={() => handleToothClick(tooth)} />
                    </motion.div>
                  ))}
                </div>
              </div>
              <motion.div 
                className="text-center text-sm font-medium text-purple-600"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
              >
                Lower Teeth
              </motion.div>
            </div>

            {/* Save Treatment Record Button */}
            {selectedPatient && (toothConditions[selectedPatient.id]?.length || 0) > 0 && (
              <motion.div
                className="mt-8 flex justify-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.05 }}
              >
                <motion.button
                  onClick={handleSaveTreatmentRecord}
                  className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg shadow-lg font-semibold transition-all duration-300"
                  whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(16, 185, 129, 0.3)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  Save Treatment Record
                </motion.button>
              </motion.div>
            )}

            {/* Legend */}
            <motion.div 
              className="mt-8 pt-8 border-t-2 border-purple-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.1 }}
            >
              <h3 className="text-sm mb-4 font-medium text-gray-700">
                Comprehensive Condition Legend (Click any tooth to cycle through these conditions)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {Object.entries(toothConditionColors).map(([condition, colorClass], index) => (
                  <motion.div
                    key={condition}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-transparent hover:border-purple-200 transition-all"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 2.2 + index * 0.03 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <svg width="25" height="32" viewBox="0 0 50 70">
                      {/* Crown */}
                      <path
                        d="M25 10
                           C 18 10, 14 12, 12 16
                           C 10 19, 9 22, 9 26
                           C 9 28, 10 30, 12 31
                           L 38 31
                           C 40 30, 41 28, 41 26
                           C 41 22, 40 19, 38 16
                           C 36 12, 32 10, 25 10 Z"
                        className={colorClass}
                        strokeWidth="2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      {/* Left root */}
                      <path
                        d="M18 31 L 18 34 Q 18 38, 16 43 Q 15 48, 15 53 Q 15 57, 17 60 Q 18 62, 20 63 Q 22 62, 23 60 Q 25 57, 25 53 Q 25 48, 24 43 Q 23 38, 23 34 L 23 31 Z"
                        className={colorClass}
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        opacity="0.9"
                      />
                      {/* Right root */}
                      <path
                        d="M32 31 L 32 34 Q 32 38, 34 43 Q 35 48, 35 53 Q 35 57, 33 60 Q 32 62, 30 63 Q 28 62, 27 60 Q 25 57, 25 53 Q 25 48, 26 43 Q 27 38, 27 34 L 27 31 Z"
                        className={colorClass}
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        opacity="0.9"
                      />
                    </svg>
                    <span className="text-xs font-semibold text-gray-700 text-center leading-tight">
                      {condition}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Condition Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div 
              className="bg-white p-6 rounded-xl shadow-lg border border-purple-100 backdrop-blur-sm bg-opacity-90"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Condition Summary
              </h2>
              {Object.keys(conditionSummary).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(conditionSummary).map(([condition, count], index) => (
                    <motion.div 
                      key={condition} 
                      className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg hover:from-purple-100 hover:to-blue-100 transition-all duration-300"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      whileHover={{ scale: 1.02, x: 5 }}
                    >
                      <span className="font-medium text-gray-700">{condition}</span>
                      <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full text-sm font-medium shadow-md">
                        {count} teeth
                      </span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div 
                  className="text-gray-500 text-center py-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Star className="w-12 h-12 text-yellow-400" />
                    <span>All teeth are healthy! 🎉</span>
                  </div>
                </motion.div>
              )}
            </motion.div>

            <motion.div 
              className="bg-white p-6 rounded-xl shadow-lg border border-purple-100 backdrop-blur-sm bg-opacity-90"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Notes & Observations
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {patientChartData
                  .filter(tooth => tooth.notes)
                  .map((tooth, index) => (
                    <motion.div 
                      key={tooth.toothNumber} 
                      className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg hover:from-purple-100 hover:to-blue-100 transition-all duration-300"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <p className="text-sm mb-1">
                        <span className="font-medium text-purple-600">Tooth #{tooth.toothNumber}</span>
                        <span className="text-gray-500"> - {tooth.conditions.join(', ')}</span>
                      </p>
                      <p className="text-sm text-gray-600">{tooth.notes}</p>
                    </motion.div>
                  ))}
                {patientChartData.filter(tooth => tooth.notes).length === 0 && (
                  <p className="text-gray-500 text-center py-8">No notes recorded</p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Notes Modal */}
          <AnimatePresence>
            {showNotesModal && selectedTooth && (
              <motion.div 
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div 
                  className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border-2 border-purple-200"
                  initial={{ scale: 0.8, y: 50 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.8, y: 50 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Info className="w-6 h-6 text-blue-600" />
                    </motion.div>
                    <h2 className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Tooth #{selectedTooth}
                    </h2>
                  </div>
                  <form onSubmit={handleSaveNotes} className="space-y-4">
                    <div>
                      <label className="block text-sm mb-1 font-medium text-gray-700">Notes</label>
                      <textarea
                        name="notes"
                        rows={3}
                        defaultValue={getToothCondition(selectedTooth).notes}
                        placeholder="Add any observations or treatment details..."
                        className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                      />
                    </div>
                    <div className="flex gap-3 justify-end">
                      <motion.button
                        type="button"
                        onClick={() => {
                          setShowNotesModal(false);
                          setSelectedTooth(null);
                        }}
                        className="px-6 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-300"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        type="submit"
                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 shadow-lg transition-all duration-300"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Save Notes
                      </motion.button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        <motion.div 
          className="bg-white p-12 rounded-xl shadow-xl border border-purple-100 text-center backdrop-blur-sm bg-opacity-90"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          </motion.div>
          <p className="text-gray-600 text-lg">Please select a patient to view their dental chart</p>
        </motion.div>
      )}
    </div>
  );
}