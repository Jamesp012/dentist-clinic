import { useState } from 'react';
import { Patient, TreatmentRecord } from '../App';
import { Sparkles, Star, Zap, StickyNote, Plus, Calendar, ChevronUp, ChevronDown, Copy, Info, X } from 'lucide-react';
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
  status: 'permanent' | 'temporary';
};

type DentalChart = {
  id: string;
  patientId: string | number;
  patientName: string;
  createdAt: string;
  toothConditions: ToothCondition[];
  summary?: string;
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
  const [chartHistory, setChartHistory] = useState<DentalChart[]>([]);
  const [hoveredTooth, setHoveredTooth] = useState<number | null>(null);
  const [clickedTooth] = useState<number | null>(null);
  const [showSparkles, setShowSparkles] = useState<number | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [expandedChartId, setExpandedChartId] = useState<string | null>(null);
  const [sidebarTooth, setSidebarTooth] = useState<number | null>(null);

  // Adult teeth numbering (Universal Numbering System)
  const upperTeeth = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const lowerTeeth = [32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17];

  const getToothCondition = (toothNumber: number): ToothCondition => {
    if (!selectedPatient) return { toothNumber, conditions: ['Healthy'], notes: '', status: 'permanent' };
    
    const patientConditions = toothConditions[selectedPatient.id] || [];
    const condition = patientConditions.find(c => c.toothNumber === toothNumber);
    return condition || { toothNumber, conditions: ['Healthy'], notes: '', status: 'permanent' };
  };

  const updateToothCondition = (toothNumber: number, conditions: string[], notes: string, status?: 'permanent' | 'temporary') => {
    if (!selectedPatient) return;

    const patientConditions = toothConditions[selectedPatient.id] || [];
    const existingCondition = patientConditions.find(c => c.toothNumber === toothNumber);
    const updatedConditions = patientConditions.filter(c => c.toothNumber !== toothNumber);
    
    if (conditions.length > 0 && conditions[0] !== 'Healthy') {
      updatedConditions.push({ 
        toothNumber, 
        conditions, 
        notes,
        status: status || existingCondition?.status || 'permanent'
      });
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
    console.log('=== HANDLE TOOTH CLICK CALLED ===');
    console.log('Tooth number:', toothNumber);
    console.log('Setting sidebar tooth to:', toothNumber);
    
    setSidebarTooth(toothNumber);
    
    console.log('Sidebar tooth state should now be:', toothNumber);
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

  const handleAddNewChart = () => {
    if (!selectedPatient) {
      alert('Please select a patient first');
      return;
    }

    const patientConditions = toothConditions[selectedPatient.id] || [];
    
    // Create a new chart entry with timestamp
    const newChart: DentalChart = {
      id: Date.now().toString(),
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      createdAt: new Date().toISOString(),
      toothConditions: [...patientConditions],
      summary: patientConditions
        .map(c => `Tooth #${c.toothNumber}: ${c.conditions[0]}${c.notes ? ` - ${c.notes}` : ''}`)
        .join('; ')
    };

    // Add to chart history
    setChartHistory([...chartHistory, newChart]);
    
    // Clear the current chart for new entries
    setToothConditions({
      ...toothConditions,
      [selectedPatient.id]: []
    });

    alert('Chart saved successfully! You can now create a new chart.');
  };

  const ToothSVG = ({ number, onClick }: { number: number; onClick: () => void }) => {
    const condition = getToothCondition(number);
    const primaryCondition = condition.conditions[0] || 'Healthy';
    const colorClass = toothConditionColors[primaryCondition] || toothConditionColors['Healthy'];
    const isHovered = hoveredTooth === number;
    const isClicked = clickedTooth === number;
    const hasSparkles = showSparkles === number;
    const isPermanent = condition.status === 'permanent';

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
    // Use black for permanent, gray for temporary as the base stroke
    const baseStrokeColor = isPermanent ? '#000000' : '#9ca3af';
    
    // Update stroke color based on condition but respect permanent/temporary status
    let strokeColor = baseStrokeColor;
    
    // For specific conditions, adjust the stroke color but keep permanent/temporary distinction
    if (primaryCondition === 'Cavity' || primaryCondition === 'Decay' || primaryCondition === 'Abscess') {
      strokeColor = isPermanent ? '#dc2626' : '#a3a3a3'; // Red for permanent, muted for temporary
    } else if (primaryCondition === 'Missing' || primaryCondition === 'Extraction') {
      strokeColor = isPermanent ? '#1f2937' : '#9ca3af'; // Dark for permanent, gray for temporary
    } else if (primaryCondition === 'Cracked' || primaryCondition === 'Fractured') {
      strokeColor = isPermanent ? '#b45309' : '#a3a3a3'; // Amber for permanent, muted for temporary
    }

    return (
      <div
        className="relative flex flex-col items-center bg-transparent cursor-pointer p-1"
        onClick={() => {
          console.log('=== BUTTON CLICKED - TOOTH:', number);
          onClick();
        }}
        onMouseEnter={() => setHoveredTooth(number)}
        onMouseLeave={() => setHoveredTooth(null)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
      >
        <motion.div
          className="flex flex-col items-center select-none pointer-events-none"
          animate={isHovered ? { scale: 1.1, y: -3 } : { scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
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
              onClick={(e) => {
                e.stopPropagation();
                handleNotesClick(number, e);
              }}
              className="absolute -bottom-3 -right-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full p-2 shadow-lg hover:shadow-2xl border-2 border-white z-10"
              whileHover={{ scale: 1.25, rotate: 10 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              title="Add/Edit Notes"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              style={{ pointerEvents: 'auto' }}
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
                <div className="text-xs opacity-90 mt-1">
                  {isPermanent ? '🔒 Permanent' : '🕐 Temporary'}
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

  const conditionSummary = patientChartData.reduce((acc: { [key: string]: number }, tooth: ToothCondition) => {
    tooth.conditions.forEach((condition: string) => {
      acc[condition] = (acc[condition] || 0) + 1;
    });
    return acc;
  }, {} as { [key: string]: number });

  return (
    <div className="p-8 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">

      {/* Patient Selection */}
      <motion.div 
        className="bg-white p-6 rounded-xl shadow-lg border border-purple-100 mb-6 backdrop-blur-sm bg-opacity-90 relative"
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
            className="bg-white p-8 rounded-xl shadow-xl border border-purple-100 mb-6 backdrop-blur-sm bg-opacity-90 relative z-10"
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
                Click a tooth to open details panel and select conditions
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
              <div className="flex justify-center gap-3 mb-6" style={{ position: 'relative', zIndex: 100 }}>
                <div className="flex gap-3" style={{ position: 'relative', zIndex: 100 }}>
                  {upperTeeth.slice(0, 8).map((tooth, index) => (
                    <motion.div
                      key={tooth}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                      style={{ pointerEvents: 'auto', zIndex: 100 }}
                    >
                      <ToothSVG number={tooth} onClick={() => handleToothClick(tooth)} />
                    </motion.div>
                  ))}
                </div>
                <div className="w-12" />
                <div className="flex gap-3" style={{ position: 'relative', zIndex: 100 }}>
                  {upperTeeth.slice(8, 16).map((tooth, index) => (
                    <motion.div
                      key={tooth}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + index * 0.05 }}
                      style={{ pointerEvents: 'auto', zIndex: 100 }}
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
                className="mt-8 flex justify-center gap-4 flex-wrap"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.05 }}
              >
                <motion.button
                  onClick={handleAddNewChart}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-lg shadow-lg font-semibold transition-all duration-300 flex items-center gap-2"
                  whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(59, 130, 246, 0.3)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Plus className="w-5 h-5" />
                  Add New Chart
                </motion.button>
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

          {/* Tooth Details Sidebar - Shows when tooth is selected */}
          <AnimatePresence>
            {sidebarTooth !== null && (
              <motion.div
                className="fixed right-0 top-0 h-screen w-80 bg-white shadow-2xl border-l-4 border-purple-500 overflow-y-auto z-50"
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 400, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800">Tooth #{sidebarTooth}</h3>
                    <button
                      onClick={() => setSidebarTooth(null)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>

                  {selectedPatient && (
                    <div className="space-y-6">
                      {/* Current Condition */}
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-3">Current Condition</h4>
                        <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                          <div 
                            className="w-6 h-6 rounded-full border-2 border-gray-300"
                            style={{
                              backgroundColor: toothConditionColors[getToothCondition(sidebarTooth).conditions[0]]?.includes('fill-') 
                                ? (toothConditionColors[getToothCondition(sidebarTooth).conditions[0]]?.match(/fill-([\w-]+)/) || [])[1]
                                : '#ffffff'
                            }}
                          />
                          <span className="font-medium text-gray-700">
                            {getToothCondition(sidebarTooth).conditions[0] || 'Healthy'}
                          </span>
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-3">Tooth Status</h4>
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                          {getToothCondition(sidebarTooth).status === 'permanent' ? '🔒 Permanent' : '🕐 Temporary'}
                        </span>
                      </div>

                      {/* Conditions List */}
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-3">Condition History</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {getToothCondition(sidebarTooth).conditions.map((cond, idx) => (
                            <div key={idx} className="text-sm p-2 bg-gray-50 rounded border-l-2 border-blue-500">
                              {cond}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Notes */}
                      {getToothCondition(sidebarTooth).notes && (
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-3">Notes</h4>
                          <p className="text-sm text-gray-600 p-3 bg-yellow-50 rounded-lg border-l-2 border-yellow-500">
                            {getToothCondition(sidebarTooth).notes}
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-4">
                        <motion.button
                          onClick={() => handleNotesClick(sidebarTooth, {} as React.MouseEvent)}
                          className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Edit Notes
                        </motion.button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                  {Object.entries(conditionSummary).map(([condition, count]: [string, number], index: number) => (
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
          </motion.div>

          {/* Chart History Section */}
          {selectedPatient && chartHistory.filter(c => c.patientId === selectedPatient.id).length > 0 && (
            <motion.div 
              className="bg-white p-6 rounded-xl shadow-lg border border-purple-100 mb-6 backdrop-blur-sm bg-opacity-90"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Chart History
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {chartHistory
                  .filter(c => c.patientId === selectedPatient.id)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((chart, index) => (
                    <motion.div 
                      key={chart.id}
                      className="border-2 border-purple-100 rounded-lg overflow-hidden"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                    >
                      <motion.div
                        onClick={() => setExpandedChartId(expandedChartId === chart.id ? null : chart.id)}
                        className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 cursor-pointer transition-all duration-300 flex items-center justify-between"
                        whileHover={{ scale: 1.01 }}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Calendar className="w-5 h-5 text-purple-600" />
                          <div>
                            <p className="font-medium text-gray-800">
                              Chart #{chartHistory.filter(c => c.patientId === selectedPatient.id).length - index}
                            </p>
                            <p className="text-xs text-gray-600">
                              {new Date(chart.createdAt).toLocaleDateString()} at {new Date(chart.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <motion.div
                          animate={{ rotate: expandedChartId === chart.id ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          {expandedChartId === chart.id ? (
                            <ChevronUp className="w-5 h-5 text-purple-600" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-purple-600" />
                          )}
                        </motion.div>
                      </motion.div>

                      {/* Expanded Chart Details */}
                      <AnimatePresence>
                        {expandedChartId === chart.id && (
                          <motion.div 
                            className="p-4 bg-white border-t-2 border-purple-100"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="space-y-3">
                              <div>
                                <h4 className="font-semibold text-gray-800 mb-2">Tooth Conditions:</h4>
                                <div className="space-y-2">
                                  {chart.toothConditions.map((tooth) => (
                                    <div key={tooth.toothNumber} className="pl-4 border-l-3 border-purple-300">
                                      <p className="text-sm font-medium text-gray-700">
                                        Tooth #{tooth.toothNumber}: <span className="text-purple-600">{tooth.conditions.join(', ')}</span>
                                      </p>
                                      {tooth.notes && (
                                        <p className="text-xs text-gray-600 mt-1">
                                          <span className="font-medium">Notes:</span> {tooth.notes}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {chart.summary && (
                                <div className="pt-3 border-t border-gray-200">
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium">Summary:</span> {chart.summary}
                                  </p>
                                </div>
                              )}
                              <div className="pt-2 flex gap-2">
                                <motion.button
                                  onClick={() => {
                                    // Load this chart back into the current editor
                                    setToothConditions({
                                      ...toothConditions,
                                      [selectedPatient.id]: [...chart.toothConditions]
                                    });
                                  }}
                                  className="flex-1 px-3 py-2 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-all duration-200"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Copy className="w-3 h-3 inline mr-1" />
                                  Load Chart
                                </motion.button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
              </div>
            </motion.div>
          )}

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

          {/* Tooth Details Sidebar */}
          <AnimatePresence>
            {sidebarTooth !== null && (
              <>
                {/* Backdrop */}
                <motion.div
                  className="fixed inset-0 bg-black bg-opacity-30 z-30"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSidebarTooth(null);
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />

                {/* Sidebar */}
                <motion.div
                  className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-40 overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                  {/* Header */}
                  <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex items-center justify-between z-10">
                    <div>
                      <h2 className="text-2xl font-bold">Tooth #{sidebarTooth}</h2>
                      <p className="text-sm opacity-90">Tooth Details & Conditions</p>
                    </div>
                    <motion.button
                      onClick={() => setSidebarTooth(null)}
                      className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X className="w-6 h-6" />
                    </motion.button>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Tooth Status Section */}
                    <motion.div
                      className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border-2 border-purple-200"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Tooth Status
                      </h3>
                      <div className="space-y-3">
                        {(['permanent', 'temporary'] as const).map((status) => (
                          <motion.button
                            key={status}
                            onClick={() => {
                              const currentCondition = getToothCondition(sidebarTooth);
                              updateToothCondition(
                                sidebarTooth,
                                currentCondition.conditions,
                                currentCondition.notes,
                                status
                              );
                            }}
                            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all text-left border-2 flex items-center justify-between ${
                              getToothCondition(sidebarTooth).status === status
                                ? 'bg-white border-purple-500 text-purple-600 shadow-lg'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300'
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <span className="flex items-center gap-2">
                              {status === 'permanent' ? '🔒' : '🕐'}
                              <span className="capitalize">{status}</span>
                            </span>
                            {getToothCondition(sidebarTooth).status === status && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center"
                              >
                                <span className="text-white text-sm">✓</span>
                              </motion.div>
                            )}
                          </motion.button>
                        ))}
                      </div>
                      <div className="mt-4 p-3 bg-white rounded-lg text-xs text-gray-600 border border-gray-200">
                        <span className="font-semibold text-gray-700">Legend:</span>
                        <div className="mt-2 space-y-1">
                          <div>🔒 <span className="font-semibold text-black">Permanent</span> teeth have <span className="font-semibold text-black">black outline</span></div>
                          <div>🕐 <span className="font-semibold text-gray-500">Temporary</span> teeth have <span className="font-semibold text-gray-500">gray outline</span></div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Tooth Condition Section */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Select Condition
                      </h3>
                      <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                        {conditionCycleOrder.map((condition: string, index: number) => {
                          const colorClass = toothConditionColors[condition] || toothConditionColors['Healthy'];
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
                          const isPermanent = getToothCondition(sidebarTooth).status === 'permanent';
                          let strokeColor = isPermanent ? '#000000' : '#9ca3af';
                          
                          if (condition === 'Cavity' || condition === 'Decay' || condition === 'Abscess') {
                            strokeColor = isPermanent ? '#dc2626' : '#a3a3a3';
                          } else if (condition === 'Missing' || condition === 'Extraction') {
                            strokeColor = isPermanent ? '#1f2937' : '#9ca3af';
                          } else if (condition === 'Cracked' || condition === 'Fractured') {
                            strokeColor = isPermanent ? '#b45309' : '#a3a3a3';
                          }

                          const isSelected = getToothCondition(sidebarTooth).conditions[0] === condition;

                          return (
                            <motion.button
                              key={condition}
                              onClick={() => {
                                const currentCondition = getToothCondition(sidebarTooth);
                                updateToothCondition(
                                  sidebarTooth,
                                  [condition],
                                  currentCondition.notes,
                                  currentCondition.status
                                );
                              }}
                              className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                                isSelected
                                  ? 'bg-purple-50 border-purple-500 shadow-lg'
                                  : 'bg-white border-gray-200 hover:border-purple-300'
                              }`}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.25 + index * 0.02 }}
                            >
                              <svg 
                                width="45" 
                                height="60" 
                                viewBox="0 0 50 80"
                                className="drop-shadow-md"
                              >
                                <defs>
                                  <linearGradient id={`sidebarCrown-${condition}-${sidebarTooth}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor={toothColor} stopOpacity="1" />
                                    <stop offset="100%" stopColor={toothColor} stopOpacity="0.9" />
                                  </linearGradient>
                                </defs>
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
                                  fill={`url(#sidebarCrown-${condition}-${sidebarTooth})`}
                                  stroke={strokeColor}
                                  strokeWidth="2"
                                  strokeLinejoin="round"
                                  strokeLinecap="round"
                                />
                              </svg>
                              <span className="text-xs font-semibold text-gray-700 text-center leading-tight whitespace-normal">
                                {condition}
                              </span>
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center mt-1"
                                >
                                  <span className="text-white text-xs">✓</span>
                                </motion.div>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>

                    {/* Legend Section */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                    >
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Condition Reference
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(toothConditionColors).map(([condition, colorClass], index) => {
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
                          const isPermanent = getToothCondition(sidebarTooth).status === 'permanent';
                          let strokeColor = isPermanent ? '#000000' : '#9ca3af';
                          
                          if (condition === 'Cavity' || condition === 'Decay' || condition === 'Abscess') {
                            strokeColor = isPermanent ? '#dc2626' : '#a3a3a3';
                          } else if (condition === 'Missing' || condition === 'Extraction') {
                            strokeColor = isPermanent ? '#1f2937' : '#9ca3af';
                          } else if (condition === 'Cracked' || condition === 'Fractured') {
                            strokeColor = isPermanent ? '#b45309' : '#a3a3a3';
                          }

                          return (
                            <motion.div
                              key={condition}
                              className="flex flex-col items-center gap-1 p-2 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 hover:border-purple-400 transition-all"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.4 + index * 0.02 }}
                              whileHover={{ scale: 1.05 }}
                            >
                              <svg 
                                width="35" 
                                height="50" 
                                viewBox="0 0 50 80"
                                className="drop-shadow-md"
                              >
                                <defs>
                                  <linearGradient id={`legendThumb-${condition}-${sidebarTooth}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor={toothColor} stopOpacity="1" />
                                    <stop offset="100%" stopColor={toothColor} stopOpacity="0.9" />
                                  </linearGradient>
                                </defs>
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
                                  fill={`url(#legendThumb-${condition}-${sidebarTooth})`}
                                  stroke={strokeColor}
                                  strokeWidth="2"
                                  strokeLinejoin="round"
                                  strokeLinecap="round"
                                />
                              </svg>
                              <span className="text-xs font-semibold text-gray-700 text-center leading-tight whitespace-normal">
                                {condition}
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>

                    {/* Notes Section */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        Notes
                      </h3>
                      <textarea
                        value={getToothCondition(sidebarTooth).notes}
                        onChange={(e) => {
                          const currentCondition = getToothCondition(sidebarTooth);
                          updateToothCondition(
                            sidebarTooth,
                            currentCondition.conditions,
                            e.target.value,
                            currentCondition.status
                          );
                        }}
                        placeholder="Add notes or observations..."
                        className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        rows={4}
                      />
                    </motion.div>

                    {/* Close Button */}
                    <motion.button
                      onClick={() => setSidebarTooth(null)}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 shadow-lg transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Done
                    </motion.button>
                  </div>
                </motion.div>
              </>
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