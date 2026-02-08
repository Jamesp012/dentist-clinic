import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, History, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { Patient } from '../App';
import { ToothData } from './Tooth';
import { ToothDetailsSidebar } from './dental/ToothDetailsSidebar';

// Interactive dental chart using backgroundngipin.png as the guide image.
// Icons from /public/all-teeth are positioned over the chart and can be
// dragged/resized. Clicking an icon opens the ToothDetailsSidebar.

type ToothLayout = {
  // id is used both for display and as the file name (e.g. "1.png", "A.png")
  id: string;
  leftPct: number;
  topPct: number;
  widthPct: number;
};

// Numeric ids for data model (permanent and primary teeth)
const PERMANENT_IDS = Array.from({ length: 32 }, (_, i) => i + 1); // 1-32
const PRIMARY_IDS = Array.from({ length: 20 }, (_, i) => 101 + i); // 101-120 (A-T)

// Mapping for primary teeth numeric ids to letter labels
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
  120: 'T',
};

// Helper to create initial ToothData for all permanent and primary teeth
const createInitialTeethData = (): Record<number, ToothData> => {
  const data: Record<number, ToothData> = {};
  const allIds = [...PERMANENT_IDS, ...PRIMARY_IDS];

  for (const id of allIds) {
    data[id] = {
      id,
      surfaces: {
        occlusal: 'healthy',
        mesial: 'healthy',
        distal: 'healthy',
        buccal: 'healthy',
        lingual: 'healthy',
      },
      generalCondition: 'healthy',
      // Primary teeth are marked non‑permanent
      isPermanent: id <= 32,
      notes: '',
    };
  }

  return data;
};

type ChartRecord = {
  id: string;
  date: string;
  patientId?: string | number;
  data: Record<number, ToothData>;
};

type DentalChartWebsiteProps = {
  patients?: Patient[];
};

// Simple color map for general tooth conditions, used to decorate icons
const CONDITION_COLORS: Record<string, string> = {
  caries: '#f97373',
  broken: '#fb923c',
  cracked: '#fdba74',
  chipped: '#fbbf24',
  loose: '#38bdf8',
  impacted: '#a855f7',
  retained_root: '#f97316',
  abscess: '#ef4444',
  non_vital: '#6366f1',
  erosion: '#fde68a',
  discolored: '#a3a3a3',
  stained: '#22c55e',
  needs_filling: '#0ea5e9',
  needs_root_canal: '#4f46e5',
  needs_extraction: '#b91c1c',
  missing: '#e8545c',
};

// Hardcoded layout imported from the provided dental-chart-layout.json
const INITIAL_LAYOUT: ToothLayout[] = [
  { id: '1', leftPct: 16.818181818181817, topPct: 43.850548330868314, widthPct: 18.59090909090909 },
  { id: '2', leftPct: 18.272727272727273, topPct: 36.43804701780983, widthPct: 18.954545454545453 },
  { id: '3', leftPct: 20.40909090909091, topPct: 28.368751969587723, widthPct: 18.95454545454545 },
  { id: '4', leftPct: 22.181818181818183, topPct: 22.85597911721205, widthPct: 18.727272727272727 },
  { id: '5', leftPct: 26.272727272727277, topPct: 17.97173890207679, widthPct: 19.318181818181817 },
  { id: '6', leftPct: 30.363636363636363, topPct: 12.81630286349911, widthPct: 18.227272727272727 },
  { id: '7', leftPct: 36.272727272727266, topPct: 9.189127922844644, widthPct: 19.318181818181817 },
  { id: '8', leftPct: 44.59090909090909, topPct: 7.861409903555806, widthPct: 18.590909090909093 },
  { id: '9', leftPct: 53.22727272727272, topPct: 7.604344629075002, widthPct: 18.772727272727273 },
  { id: '10', leftPct: 60.999999999999986, topPct: 10.731519569729462, widthPct: 18.227272727272727 },
  { id: '11', leftPct: 67.81818181818183, topPct: 12.559237589018307, widthPct: 18.590909090909093 },
  { id: '12', leftPct: 71.95454545454545, topPct: 18.228804176557585, widthPct: 18.545454545454547 },
  { id: '13', leftPct: 75.13636363636364, topPct: 21.57065274480804, widthPct: 18.409090909090907 },
  { id: '14', leftPct: 78.18181818181819, topPct: 28.11168669510692, widthPct: 18.954545454545453 },
  { id: '15', leftPct: 79.04545454545455, topPct: 35.1527206454058, widthPct: 18.772727272727273 },
  { id: '16', leftPct: 80.63636363636364, topPct: 45.00734206603192, widthPct: 19.136363636363637 },
  { id: '17', leftPct: 80.86363636363636, topPct: 56.44483550073952, widthPct: 18.59090909090909 },
  { id: '18', leftPct: 79.9090909090909, topPct: 64.1144020882788, widthPct: 19.136363636363633 },
  { id: '19', leftPct: 77.63636363636363, topPct: 71.41250131305848, widthPct: 18.77272727272727 },
  { id: '20', leftPct: 75.77272727272727, topPct: 77.69646998887657, widthPct: 18.954545454545453 },
  { id: '21', leftPct: 73.5, topPct: 82.06657965505023, widthPct: 18.590909090909093 },
  { id: '22', leftPct: 67.81818181818183, topPct: 85.42255877226228, widthPct: 18.40909090909091 },
  { id: '23', leftPct: 61.77272727272728, topPct: 90.46359272256113, widthPct: 18.772727272727273 },
  { id: '24', leftPct: 53.72727272727273, topPct: 92.17690865357119, widthPct: 18.954545454545457 },
  { id: '25', leftPct: 45.36363636363635, topPct: 90.76304964392679, widthPct: 18.772727272727273 },
  { id: '26', leftPct: 36.81818181818181, topPct: 90.07799481083994, widthPct: 18.59090909090909 },
  { id: '27', leftPct: 28.59090909090909, topPct: 86.70788514466629, widthPct: 18.772727272727277 },
  { id: '28', leftPct: 26, topPct: 83.22337339021385, widthPct: 18.772727272727273 },
  { id: '29', leftPct: 23.18181818181818, topPct: 76.02554570475134, widthPct: 18.77272727272727 },
  { id: '30', leftPct: 19.636363636363637, topPct: 71.02690340133728, widthPct: 18.772727272727273 },
  { id: '31', leftPct: 19.18181818181818, topPct: 63.60027153931719, widthPct: 18.954545454545453 },
  { id: '32', leftPct: 17.681818181818183, topPct: 56.83043341246072, widthPct: 18.772727272727273 },
  { id: 'A', leftPct: 30, topPct: 26.45841246659889, widthPct: 18.954545454545453 },
  { id: 'B', leftPct: 30.090909090909108, topPct: 22.988031261108056, widthPct: 18.772727272727273 },
  { id: 'C', leftPct: 34.909090909090914, topPct: 19.003519506655593, widthPct: 19.5 },
  { id: 'D', leftPct: 40.090909090909086, topPct: 17.07552994804957, widthPct: 18.590909090909093 },
  { id: 'E', leftPct: 46.54545454545455, topPct: 15.276073026683946, widthPct: 19.136363636363637 },
  { id: 'F', leftPct: 52.09090909090911, topPct: 15.019007752203139, widthPct: 18.954545454545453 },
  { id: 'G', leftPct: 57.45454545454546, topPct: 16.175801487366755, widthPct: 18.59090909090909 },
  { id: 'H', leftPct: 62.454545454545475, topPct: 20.288845879059604, widthPct: 18.409090909090907 },
  { id: 'I', leftPct: 65.27272727272727, topPct: 22.473900712146445, widthPct: 18.77272727272727 },
  { id: 'J', leftPct: 67.54545454545455, topPct: 26.072814554877695, widthPct: 18.772727272727273 },
  { id: 'K', leftPct: 66.36363636363637, topPct: 72.1184751780366, widthPct: 18.954545454545457 },
  { id: 'L', leftPct: 66.45454545454545, topPct: 77.51684594213349, widthPct: 18.59090909090909 },
  { id: 'M', leftPct: 63.81818181818182, topPct: 82.52961879450913, widthPct: 18.954545454545453 },
  { id: 'N', leftPct: 58.27272727272727, topPct: 83.42934725519197, widthPct: 18.954545454545453 },
  { id: 'O', leftPct: 52.90909090909091, topPct: 86.5141305489616, widthPct: 18.59090909090909 },
  { id: 'P', leftPct: 46.63636363636365, topPct: 86.5141305489616, widthPct: 19.136363636363637 },
  { id: 'Q', leftPct: 40.54545454545455, topPct: 85.61440208827881, widthPct: 19.500000000000004 },
  { id: 'R', leftPct: 35.72727272727273, topPct: 81.75842297106674, widthPct: 19.136363636363637 },
  { id: 'S', leftPct: 32.36363636363636, topPct: 77.90244385385469, widthPct: 18.40909090909091 },
  { id: 'T', leftPct: 28.636363636363637, topPct: 71.9899425407962, widthPct: 18.590909090909093 },
];

export function DentalChartWebsite({ patients = [] }: DentalChartWebsiteProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<ToothLayout[]>(INITIAL_LAYOUT);
  const [hovered, setHovered] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [suggestionPortalNode, setSuggestionPortalNode] = useState<HTMLElement | null>(null);
  const [suggestionPos, setSuggestionPos] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const [showSelectPatientModal, setShowSelectPatientModal] = useState(false);

  // Create a detached portal node for suggestions so they render above stacking contexts
  useEffect(() => {
    const node = document.createElement('div');
    document.body.appendChild(node);
    setSuggestionPortalNode(node);
    return () => {
      try {
        document.body.removeChild(node);
      } catch (_) {
        /* ignore */
      }
      setSuggestionPortalNode(null);
    };
  }, []);

  const updateSuggestionPos = () => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setSuggestionPos({ left: rect.left, top: rect.bottom + 6, width: rect.width });
  };

  useEffect(() => {
    if (showPatientSuggestions) updateSuggestionPos();
    const onResize = () => updateSuggestionPos();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [showPatientSuggestions, patientSearch]);

  const [charts, setCharts] = useState<ChartRecord[]>([
    {
      id: '1',
      date: new Date().toLocaleString(),
      data: createInitialTeethData(),
    },
  ]);
  const [activeChartId, setActiveChartId] = useState<string>('1');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const activeChart = charts.find((c) => c.id === activeChartId) || charts[0];
  const teeth = activeChart.data;

  // Tooth data and sidebar state
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Save dental chart to localStorage for the selected patient
  const saveDentalChartToStorage = (chart: ChartRecord) => {
    if (!selectedPatient) return;

    const storageKey = `dentalChart_patient_${selectedPatient.id}_chart_${chart.id}`;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        id: chart.id,
        date: chart.date,
        patientId: selectedPatient.id,
        data: chart.data,
      }),
    );

    const chartsListKey = `dentalCharts_patient_${selectedPatient.id}`;
    const existingCharts = JSON.parse(localStorage.getItem(chartsListKey) || '[]');
    if (!existingCharts.includes(chart.id)) {
      existingCharts.push(chart.id);
      localStorage.setItem(chartsListKey, JSON.stringify(existingCharts));
    }
  };

  // Load charts whenever the selected patient changes
  useEffect(() => {
    if (!selectedPatient) {
      setCharts([
        {
          id: '1',
          date: new Date().toLocaleString(),
          data: createInitialTeethData(),
        },
      ]);
      setActiveChartId('1');
      setSelectedTooth(null);
      setIsSidebarOpen(false);
      setIsHistoryOpen(false);
      return;
    }

    const chartsListKey = `dentalCharts_patient_${selectedPatient.id}`;
    const chartIds = JSON.parse(localStorage.getItem(chartsListKey) || '[]');

    if (chartIds.length === 0) {
      const initialChart: ChartRecord = {
        id: '1',
        date: new Date().toLocaleString(),
        patientId: selectedPatient.id,
        data: createInitialTeethData(),
      };
      setCharts([initialChart]);
      setActiveChartId('1');
      saveDentalChartToStorage(initialChart);
    } else {
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

  const getToothNumericId = (iconId: string): number | null => {
    const numeric = parseInt(iconId, 10);
    if (!Number.isNaN(numeric)) return numeric;

    const entry = Object.entries(PRIMARY_LABELS).find(([, label]) => label === iconId);
    return entry ? Number(entry[0]) : null;
  };

  const handleToothClick = (toothId: number | null) => {
    if (!toothId) return;
    setSelectedTooth(toothId);
    setIsSidebarOpen(true);
  };

  const handleUpdateTooth = (id: number, updates: Partial<ToothData>) => {
    setCharts((prevCharts) =>
      prevCharts.map((chart) => {
        if (chart.id === activeChartId) {
          const updatedChart: ChartRecord = {
            ...chart,
            data: {
              ...chart.data,
              [id]: { ...chart.data[id], ...updates },
            },
          };

          if (selectedPatient) {
            saveDentalChartToStorage(updatedChart);
          }

          return updatedChart;
        }
        return chart;
      }),
    );
  };

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const handleDownload = () => {
    const data = layout.map(({ id, leftPct, topPct, widthPct }) => ({
      id,
      leftPct,
      topPct,
      widthPct,
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dental-chart-layout.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
        patientId: selectedPatient.id,
        data: createInitialTeethData(),
      };

      setCharts((prev) => [...prev, newChart]);
      setActiveChartId(newId);
      setSelectedTooth(null);
      setIsSidebarOpen(false);

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

  const handleIconClick = (event: React.MouseEvent, iconId: string) => {
    event.stopPropagation();
    if (!selectedPatient) {
      setShowSelectPatientModal(true);
      return;
    }
    const numericId = getToothNumericId(iconId);
    if (!numericId) return;

    // Ensure the tooth's permanent/temporary status is fixed based on id
    setTeeth((prev) => {
      const current = prev[numericId];
      if (!current) return prev;
      const shouldBePermanent = numericId <= 32;
      if (current.isPermanent === shouldBePermanent) return prev;
      return {
        ...prev,
        [numericId]: { ...current, isPermanent: shouldBePermanent },
      };
    });

    handleToothClick(numericId);
  };

  // Fallback: when icons overlap, determine clicked tooth by nearest center to click point
  const handleContainerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedPatient) {
      setShowSelectPatientModal(true);
      return;
    }
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = ((event.clientX - rect.left) / rect.width) * 100;
    const clickY = ((event.clientY - rect.top) / rect.height) * 100;

    let nearest: ToothLayout | null = null;
    let minDist = Infinity;
    layout.forEach((tooth) => {
      const dx = clickX - tooth.leftPct;
      const dy = clickY - tooth.topPct;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDist) {
        minDist = d;
        nearest = tooth;
      }
    });

    if (nearest) {
      const numericId = getToothNumericId(nearest.id);
      if (numericId) {
        // Ensure missing state is explicitly applied in teeth state so color renders
        setCharts((prevCharts) =>
          prevCharts.map((chart) => {
            if (chart.id !== activeChartId) return chart;
            const current = chart.data[numericId];
            if (!current || current.generalCondition !== 'missing') return chart;
            return {
              ...chart,
              data: {
                ...chart.data,
                [numericId]: { ...current, generalCondition: 'missing' },
              },
            };
          }),
        );
        handleToothClick(numericId);
      }
    }
  };

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(patientSearch.trim().toLowerCase()),
  );

  const recentPatientIds: Array<string | number> = JSON.parse(
    localStorage.getItem('dentalChart_recentPatients') || '[]',
  );

  const recentPatients = recentPatientIds
    .map((id) => patients.find((patient) => String(patient.id) === String(id)))
    .filter((patient): patient is Patient => Boolean(patient));

  const recentlyAddedPatients = [...patients].slice(-5).reverse();

  const suggestionPatients = patientSearch.trim()
    ? filteredPatients
    : [
        ...recentPatients,
        ...recentlyAddedPatients.filter(
          (patient) => !recentPatients.some((recent) => String(recent.id) === String(patient.id)),
        ),
      ];

  return (
    <div className="flex flex-col h-full bg-transparent font-sans">
      {/* Header with patient search and actions */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white/60 backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <div className="text-base font-medium text-slate-600">
            {selectedPatient?.name || 'Select Patient'}
          </div>

          {patients.length > 0 && (
            <div className="relative">
              <input
                ref={inputRef}
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
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-600 hover:border-slate-300 transition-colors w-64"
              />
              {/* Suggestions are rendered into a fixed portal so they always appear above the chart */}
              {showPatientSuggestions && patientSearch.trim().length > 0 && suggestionPortalNode && (
                createPortal(
                  <div
                    style={{ left: suggestionPos?.left ?? 0, top: suggestionPos?.top ?? 0, width: suggestionPos?.width ?? 240 }}
                    className="fixed z-[9999] mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg"
                  >
                    {suggestionPatients.length > 0 ? (
                      suggestionPatients.map((patient) => (
                        <button
                          key={patient.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedPatient(patient);
                            setPatientSearch(patient.name);
                            setShowPatientSuggestions(false);
                            const nextRecent = [
                              patient.id,
                              ...recentPatientIds.filter((id) => String(id) !== String(patient.id)),
                            ].slice(0, 5);
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
                  </div>,
                  suggestionPortalNode,
                )
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveChart}
            className="flex items-center gap-2 px-4 py-2 bg-teal-200 hover:bg-teal-300 text-teal-900 rounded-lg shadow-sm transition-colors font-medium text-sm"
          >
            <Save className="w-4 h-4" />
            Save Chart
          </button>

          <button
            onClick={handleNewChart}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-200 hover:bg-cyan-300 text-cyan-900 rounded-lg shadow-sm transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Chart
          </button>
        </div>
      </div>

      {/* Select-patient modal (rendered into portal if available) */}
      {showSelectPatientModal && (
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowSelectPatientModal(false)} />
            <div className="relative bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
              <h3 className="text-lg font-semibold mb-2">Select patient first</h3>
              <p className="text-sm text-slate-600 mb-4">Please select a patient before editing the dental chart.</p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowSelectPatientModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSelectPatientModal(false);
                    inputRef.current?.focus();
                  }}
                  className="px-4 py-2 rounded-lg bg-teal-500 text-white"
                >
                  Select Patient
                </button>
              </div>
            </div>
          </div>,
          suggestionPortalNode || document.body,
        )
      )}

      <div className="flex-1 p-2">
        <div className="flex h-full gap-2 items-start">
          {/* Left: History / charts list */}
          <aside className="w-64 flex-shrink-0">
            {selectedPatient ? (
              <div className="border border-slate-200 bg-white/60 rounded-md overflow-hidden">
                <div className="border-b border-slate-200 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setIsHistoryOpen((open) => !open)}
                    className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
                  >
                    <History className="w-4 h-4" />
                    <span>{isHistoryOpen ? 'Hide Chart History' : `View ${selectedPatient.name}'s Charts (${charts.length})`}</span>
                  </button>
                </div>

                {isHistoryOpen && (
                  <div className="p-4">
                    <div className="flex flex-col gap-2">
                      {charts.map((chart) => (
                        <button
                          key={chart.id}
                          type="button"
                          onClick={() => {
                            setActiveChartId(chart.id);
                            setSelectedTooth(null);
                            setIsSidebarOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                            activeChartId === chart.id
                              ? 'bg-sky-500 text-white border-sky-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300'
                          }`}
                        >
                          <div className="font-medium">{chart.date}</div>
                          <div className="opacity-75">Chart ID: {chart.id}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-slate-200 bg-white/60 rounded-md p-4 text-sm text-slate-600">
                <div className="font-medium mb-1">No patient selected</div>
                <div className="text-xs opacity-75">Select a patient to view saved charts.</div>
              </div>
            )}
          </aside>

          {/* Right: Chart area */}
          <main className="flex-1 flex flex-col items-start justify-start">
            <div
              ref={containerRef}
              className={`relative inline-block overflow-hidden transition-shadow duration-150 ${
                hovered ? 'shadow-[0_0_0_2px_rgba(59,130,246,0.8)]' : 'shadow-[0_0_0_1px_rgba(148,163,184,0.6)]'
              }`}
              onMouseLeave={() => setHovered(false)}
              onMouseEnter={() => setHovered(true)}
              onClick={handleContainerClick}
            >
              {/* Background image defines the exact field size */}
              <img
                src="/backgroundngipin.png"
                alt="Dental chart background"
                className="block w-[550px] max-w-full h-auto select-none pointer-events-none"
                draggable={false}
              />
              {layout.map((tooth) => {
                const numericId = getToothNumericId(tooth.id);
                const toothData = numericId ? teeth[numericId] : undefined;
                const condition = toothData?.generalCondition ?? 'healthy';
                const color = condition !== 'healthy' ? CONDITION_COLORS[condition] : undefined;

                const zIndex = 10 + (Math.round(tooth.topPct) % 30); // keep teeth under sidebar z-50
                return (
                  <div
                    key={tooth.id}
                    className="absolute cursor-pointer group"
                    style={{
                      left: `${tooth.leftPct}%`,
                      top: `${tooth.topPct}%`,
                      width: `${tooth.widthPct}%`,
                      transform: 'translate(-50%, -50%)',
                      zIndex,
                    }}
                  >
                    <img
                      src={`/all-teeth/${tooth.id}.png`}
                      alt={`Tooth ${tooth.id}`}
                      className="w-full select-none drop-shadow-sm pointer-events-none"
                      draggable={false}
                    />

                    {condition !== 'healthy' && (
                      <div
                        aria-hidden
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          backgroundColor: color ?? '#e8545c',
                          opacity: 0.5,
                          WebkitMaskImage: `url(/all-teeth/${tooth.id}.png)`,
                          WebkitMaskRepeat: 'no-repeat',
                          WebkitMaskPosition: 'center',
                          WebkitMaskSize: '100% 100%',
                          maskImage: `url(/all-teeth/${tooth.id}.png)`,
                          maskRepeat: 'no-repeat',
                          maskPosition: 'center',
                          maskSize: '100% 100%',
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </main>
        </div>
      </div>

      <ToothDetailsSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        selectedTooth={selectedTooth}
        toothData={selectedTooth ? teeth[selectedTooth] : null}
        onUpdateTooth={handleUpdateTooth}
        onSelectTooth={handleToothClick}
        fixedIsPermanent={selectedTooth != null ? selectedTooth <= 32 : undefined}
      />
    </div>
  );
}
