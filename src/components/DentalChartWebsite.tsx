import React, { useRef, useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
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

// Simple color map for general tooth conditions, used to decorate icons
const CONDITION_COLORS: Record<string, string> = {
  caries: '#f97373',
  broken: '#fb923c',
  cracked: '#fdba74',
  chipped: '#fbbf24',
  loose: '#38bdf8',
  impacted: '#a855f7',
  retained_root: '#f97316',
  abscess: '#8DB600',
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

type ChartSnapshot = {
  id: string;
  patientId: string;
  patientName: string;
  createdAt: string; // ISO
  teeth: Record<number, ToothData>;
};

interface DentalChartWebsiteProps {
  patients?: { id: string | number; name: string }[];
}

export function DentalChartWebsite({ patients: propPatients }: DentalChartWebsiteProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const historyRef = useRef<HTMLDivElement | null>(null);
  const legendRef = useRef<HTMLDivElement | null>(null);
  const okButtonRef = useRef<HTMLButtonElement | null>(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [patientQuery, setPatientQuery] = useState('');
  const [selectedPatientObj, setSelectedPatientObj] = useState<{ id: string; name: string } | null>(null);
  
  // Patient selector + chart history (persisted to localStorage)
  const [patients, setPatients] = useState<{ id: string | number; name: string }[]>(() => {
    if (propPatients && propPatients.length > 0) return propPatients;
    try {
      const raw = localStorage.getItem('patients');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const [teeth, setTeeth] = useState<Record<number, ToothData>>(() => createInitialTeethData());
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [layout, setLayout] = useState<ToothLayout[]>(INITIAL_LAYOUT);
  const [hovered, setHovered] = useState(false);
  const [legendHeight, setLegendHeight] = useState<number | null>(null);
  const [showSelectPatientModal, setShowSelectPatientModal] = useState(false);
  
  const [chartHistory, setChartHistory] = useState<ChartSnapshot[]>(() => {
    try {
      const raw = localStorage.getItem('dentalChartHistory');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (propPatients && propPatients.length > 0) {
      setPatients(propPatients);
      // If currently selected patient is not in the new list, clear selection
      if (selectedPatientObj && !propPatients.find(p => p.id === selectedPatientObj.id)) {
        setSelectedPatientObj(null);
        setPatientQuery('');
      }
    }
  }, [propPatients, selectedPatientObj]);

  useEffect(() => {
    try {
      localStorage.setItem('dentalChartHistory', JSON.stringify(chartHistory));
    } catch (e) {
      // ignore
    }
  }, [chartHistory]);

  useEffect(() => {
    try {
      localStorage.setItem('patients', JSON.stringify(patients));
    } catch (e) {}
  }, [patients]);

  useEffect(() => {
    if (showSelectPatientModal) {
      try {
        okButtonRef.current?.focus();
      } catch (e) {}
    }
  }, [showSelectPatientModal]);

  const filteredPatients = patients.filter((p) => p.name.toLowerCase().includes(patientQuery.toLowerCase()));

  const saveChartSnapshot = () => {
    if (!selectedPatientObj) {
      alert('Select a patient before saving the chart');
      return;
    }

    const snapshot: ChartSnapshot = {
      id: Date.now().toString(),
      patientId: selectedPatientObj.id,
      patientName: selectedPatientObj.name,
      createdAt: new Date().toISOString(),
      teeth: teeth,
    };

    setChartHistory((prev) => [snapshot, ...prev]);
  };

  const loadChartSnapshot = (snapshot: ChartSnapshot) => {
    if (!snapshot) return;
    setTeeth(snapshot.teeth);
    // set selected patient to match snapshot
    setSelectedPatientObj({ id: snapshot.patientId, name: snapshot.patientName });
  };

  const handleNewChart = () => {
    if (!confirm('Create a new empty chart? Unsaved changes will be lost.')) return;
    setTeeth(createInitialTeethData());
  };

  const getToothNumericId = (iconId: string): number | null => {
    const numeric = parseInt(iconId, 10);
    if (!Number.isNaN(numeric)) return numeric;

    const entry = Object.entries(PRIMARY_LABELS).find(([, label]) => label === iconId);
    return entry ? Number(entry[0]) : null;
  };

  // Keep legend height synced to the chart container size
  useEffect(() => {
    // Prefer measuring the legend element to extend it to the bottom of the visible viewport.
    // Fallback to measuring the dashboard sidebar up to the sign-out area, then history or container.
    const legendEl = legendRef.current;
    const sidebarEl = document.getElementById('app-sidebar');
    const historyEl = historyRef.current;
    const containerEl = containerRef.current;

    const computeHeight = () => {
      try {
        // If the legend element exists, size it to reach the bottom of the viewport
        if (legendEl) {
          const lgRect = legendEl.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          // subtract a small margin so the bottom isn't flush against the viewport edge
          const h = Math.max(0, Math.round(viewportHeight - lgRect.top - 8));
          setLegendHeight(h);
          return;
        }

        if (sidebarEl) {
          const signoutEl = document.getElementById('sidebar-signout');
          const sbRect = sidebarEl.getBoundingClientRect();
          if (signoutEl) {
            const soRect = signoutEl.getBoundingClientRect();
            const h = Math.max(0, Math.round(soRect.top - sbRect.top));
            setLegendHeight(h);
            return;
          }
          setLegendHeight(Math.round(sbRect.height));
          return;
        }

        if (historyEl) {
          setLegendHeight(Math.round(historyEl.getBoundingClientRect().height));
          return;
        }

        if (containerEl) {
          setLegendHeight(Math.round(containerEl.getBoundingClientRect().height));
          return;
        }
      } catch (e) {
        // ignore
      }
    };

    computeHeight();

    let ro: ResizeObserver | null = null;
    try {
      if ((window as any).ResizeObserver) {
        ro = new (window as any).ResizeObserver(() => computeHeight());
        if (legendEl) ro.observe(legendEl);
        if (sidebarEl) ro.observe(sidebarEl);
        if (historyEl) ro.observe(historyEl);
        if (containerEl) ro.observe(containerEl);
        const signoutEl = document.getElementById('sidebar-signout');
        if (signoutEl && ro) ro.observe(signoutEl);
      } else {
        window.addEventListener('resize', computeHeight);
      }
    } catch (e) {
      window.addEventListener('resize', computeHeight);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', computeHeight);
    };
  }, [historyRef, containerRef, layout]);

  const handleToothClick = (toothId: number | null) => {
    if (!toothId) return;
    // prompt user to select patient if none selected
    if (!selectedPatientObj) {
      setShowSelectPatientModal(true);
      return;
    }
    setSelectedTooth(toothId);
    setIsSidebarOpen(true);
  };

  const handleUpdateTooth = (id: number, updates: Partial<ToothData>) => {
    setTeeth((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...updates },
    }));
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

  const handleIconClick = (event: React.MouseEvent, iconId: string) => {
    event.stopPropagation();
    if (!selectedPatientObj) {
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
    const container = containerRef.current;
    const rect = container?.getBoundingClientRect();
    if (!rect || !container) return;
    // prompt user to select patient when trying to interact with chart without selection
    if (!selectedPatientObj) {
      setShowSelectPatientModal(true);
      return;
    }
    
    // Account for scroll position when calculating coordinates
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;
    const scrollWidth = container.scrollWidth;
    const scrollHeight = container.scrollHeight;

    const clickX = ((event.clientX - rect.left + scrollLeft) / scrollWidth) * 100;
    const clickY = ((event.clientY - rect.top + scrollTop) / scrollHeight) * 100;

    let nearest: ToothLayout | null = null;
    let minDist = Infinity;
    const MAX_CLICK_DISTANCE = 5; // Allow 5% radius click distance for background clicking

    layout.forEach((tooth) => {
      const dx = clickX - tooth.leftPct;
      const dy = clickY - tooth.topPct;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDist) {
        minDist = d;
        nearest = tooth;
      }
    });

    if (nearest && minDist <= MAX_CLICK_DISTANCE) {
      const numericId = getToothNumericId(nearest.id);
      if (numericId) {
        // Ensure missing state is explicitly applied in teeth state so color renders
        setTeeth((prev) => {
          const current = prev[numericId];
          if (!current) return prev;
          if (current.generalCondition === 'missing') {
            // re-assign to force update (no-op change)
            return { ...prev, [numericId]: { ...current, generalCondition: 'missing' } };
          }
          return prev;
        });
        handleToothClick(numericId);
      }
    }
  };

  // When patient selection changes, load the most recent chart for that patient
  useEffect(() => {
    if (!selectedPatientObj) {
      // no patient selected -> reset to blank chart
      setTeeth(createInitialTeethData());
      return;
    }

    // find the most recent saved snapshot for this patient (by createdAt desc)
    const snapshots = chartHistory.filter((c) => String(c.patientId) === String(selectedPatientObj.id));
    if (snapshots.length === 0) {
      // no history -> blank chart
      setTeeth(createInitialTeethData());
      return;
    }

    const latest = snapshots.reduce((a, b) => (new Date(a.createdAt) > new Date(b.createdAt) ? a : b));
    if (latest) {
      setTeeth(latest.teeth);
    }
  }, [selectedPatientObj, chartHistory]);

  // If the user clears the patient search input, treat as clearing selection
  useEffect(() => {
    if (patientQuery.trim() === '') {
      setSelectedPatientObj(null);
    }
  }, [patientQuery]);

  // Normalize various possible condition names to canonical keys used by the renderer
  const normalizeCondition = (raw?: string) => {
    if (!raw) return 'healthy';
    const key = raw.toLowerCase();
    if (key === 'dental_caries' || key === 'caries') return 'caries';
    if (key === 'cavity') return 'cavity';
    if (key === 'tooth_decay' || key === 'decay') return 'decay';
    if (key === 'tooth_abscess' || key === 'abscess') return 'abscess';
    if (key === 'non_vital_tooth' || key === 'non_vital') return 'non_vital';
    if (key === 'broken_tooth' || key === 'broken') return 'broken';
    if (key === 'cracked_tooth' || key === 'cracked') return 'cracked';
    if (key === 'chipped_tooth' || key === 'chipped') return 'chipped';
    if (key === 'missing_tooth' || key === 'missing') return 'missing';
    if (key === 'retained_root') return 'retained_root';
    if (key === 'impacted_tooth' || key === 'impacted') return 'impacted';
    if (key === 'loose_tooth' || key === 'loose') return 'loose';
    if (key === 'tooth_erosion' || key === 'erosion') return 'erosion';
    if (key === 'discolored_tooth' || key === 'discolored') return 'discolored';
    if (key === 'stained_tooth' || key === 'stained') return 'stained';
    if (key === 'needs_filling') return 'needs_filling';
    if (key === 'needs_root_canal_treatment' || key === 'needs_root_canal') return 'needs_root_canal';
    if (key === 'needs_extraction' || key === 'extraction') return 'needs_extraction';
    return key;
  };

  // Render SVG overlays for a tooth. Accepts a single condition or an array of conditions.
  // When multiple conditions are provided, each is rendered in order and masked to the tooth image.
  const renderConditionOverlays = (toothId: string, conditionRaw?: string | string[]) => {
    // If multiple conditions provided, compose them in order. "missing" overrides everything.
    if (Array.isArray(conditionRaw)) {
      const normalized = conditionRaw.map((c) => normalizeCondition(c));
      if (normalized.includes('missing')) {
        // Render missing override (same as single-case missing)
        return (
          <div
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{
              WebkitMaskImage: `url(/all-teeth/${toothId}.png)`,
              WebkitMaskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              WebkitMaskSize: '100% 100%',
              maskImage: `url(/all-teeth/${toothId}.png)`,
              maskRepeat: 'no-repeat',
              maskPosition: 'center',
              maskSize: '100% 100%',
            }}
          >
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <rect x="0" y="0" width="100" height="100" fill="#fb6a72" opacity={1} />
              <rect x="2" y="2" width="96" height="96" fill="none" stroke="#fb6a72" strokeWidth={1.25} strokeDasharray="2 3" opacity={1} />
            </svg>
          </div>
        );
      }

      // Otherwise compose each normalized condition by recursing into the single-case renderer
      return <>{normalized.map((c) => renderConditionOverlays(toothId, c))}</>;
    }

    const condition = normalizeCondition(conditionRaw as string | undefined);
    const maskId = `mask-tooth-${toothId}-${condition}`;
    const patternCaries = `pat-caries-${toothId}-${condition}`;
    const patternCavity = `pat-cavity-${toothId}-${condition}`;
    const speckleId = `pat-speckle-${toothId}-${condition}`;
    const filterId = `dropShadow-${toothId}-${condition}`;
    const radDecayId = `rad-decay-${toothId}-${condition}`;
    const gradErosionId = `grad-erosion-${toothId}-${condition}`;
    const gradDiscolorId = `grad-discolor-${toothId}-${condition}`;

    // helper to produce deterministic speckle positions based on tooth id
    const specklePositions = Array.from({ length: 8 }, (_, i) => ({
      cx: 15 + ((i * 37 + toothId.length * 13) % 60),
      cy: 10 + ((i * 29 + toothId.length * 7) % 70),
      r: 1 + ((i * 17 + toothId.length) % 3),
    }));

    // missing_tooth overrides all others: render ghost silhouette with dotted outline
    if (condition === 'missing') {
      return (
        <div
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            WebkitMaskImage: `url(/all-teeth/${toothId}.png)`,
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            WebkitMaskSize: '100% 100%',
            maskImage: `url(/all-teeth/${toothId}.png)`,
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
            maskSize: '100% 100%',
          }}
        >
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <rect x="0" y="0" width="100" height="100" fill="#fb6a72" opacity={1} />
            <rect x="2" y="2" width="96" height="96" fill="none" stroke="#fb6a72" strokeWidth={1.25} strokeDasharray="2 3" opacity={1} />
          </svg>
        </div>
      );
    }

    // Otherwise, build layered SVG: disease/structural first, cosmetic above.
    return (
      <div
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          WebkitMaskImage: `url(/all-teeth/${toothId}.png)`,
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          WebkitMaskSize: '100% 100%',
          maskImage: `url(/all-teeth/${toothId}.png)`,
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
          maskSize: '100% 100%',
        }}
      >
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            {/* patterns */}
            <pattern id={patternCaries} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
              <rect width="2" height="6" fill="#9ca3af" />
            </pattern>
            <pattern id={patternCavity} patternUnits="userSpaceOnUse" width="8" height="8">
              <circle cx="2" cy="2" r="1.2" fill="#f59e0b" />
              <circle cx="6" cy="6" r="1.2" fill="#f59e0b" />
            </pattern>
            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
              <feOffset in="blur" dx="0" dy="4" result="offset" />
              <feMerge>
                <feMergeNode in="offset" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <pattern id={speckleId} patternUnits="userSpaceOnUse" width="10" height="10">
              <circle cx="2" cy="3" r="1" fill="#7c3f00" />
            </pattern>

            <radialGradient id={radDecayId} cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#000000" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.0" />
            </radialGradient>

            <linearGradient id={gradErosionId} x1="50%" x2="50%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.65" />
            </linearGradient>

            <linearGradient id={gradDiscolorId} x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#fff7ed" stopOpacity="0" />
              <stop offset="100%" stopColor="#facc15" stopOpacity="0.7" />
            </linearGradient>
          </defs>

          {/* Disease / structural layers (below cosmetic) */}
          {condition === 'caries' && (
            <rect x="0" y="0" width="100" height="100" fill={`url(#${patternCaries})`} opacity={0.65} />
          )}

          {condition === 'cavity' && (
            <rect x="0" y="0" width="100" height="100" fill={`url(#${patternCavity})`} opacity={0.7} />
          )}

          {condition === 'decay' && (
            <rect x="0" y="0" width="100" height="100" fill={`url(#${radDecayId})`} opacity={0.7} />
          )}

          {condition === 'abscess' && (
            // Fill the whole tooth with an apple-green tone to indicate abscess
            <g>
              <rect x="0" y="0" width="100" height="100" fill="#8DB600" opacity={0.5} />
              <rect x="2" y="2" width="96" height="96" fill="none" stroke="#5b8a00" strokeWidth={0.9} opacity={0.9} />
            </g>
          )}


          {condition === 'non_vital' && (
            <g>
              <rect x="0" y="0" width="100" height="100" fill="#6b5b95" opacity={0.35} />
              <rect x="1" y="1" width="98" height="98" fill="none" stroke="#000000" strokeWidth={2} opacity={0.9} />
            </g>
          )}

          {condition === 'broken' && (
            <g opacity={0.7}>
              <path d="M65 30 L78 26 L72 40 L86 48 L70 50 L78 60 L60 56 L66 44 L54 36 Z" fill="#ffffff" opacity={0.95} />
              <path d="M58 36 L72 34 L68 46" stroke="#b91c1c" strokeWidth={1.6} fill="none" />
            </g>
          )}

          {condition === 'loose' && (
            <g opacity={0.98} fill="none">
              <g filter={`url(#${filterId})`}>
                <ellipse cx="50" cy="52" rx="28" ry="30" fill="#000000" opacity={0.08} />
              </g>
              <path d="M10 10 C30 5,70 5,90 10 C80 30,80 70,90 90 C70 85,30 85,10 90 Z" stroke="#374151" strokeWidth={1.6} />
              <g transform="translate(2,0)">
                <path d="M10 10 C30 5,70 5,90 10 C80 30,80 70,90 90 C70 85,30 85,10 90 Z" stroke="#374151" strokeWidth={1.6} opacity={0.6} />
              </g>
              <circle cx="50" cy="50" r="24" stroke="#60a5fa" strokeWidth={1.4} opacity={0.25} strokeDasharray="3 4" />
            </g>
          )}

          {condition === 'loose' && (
            // Wave-like dark pattern inside the tooth for loose teeth
            <g opacity={0.95}>
              <path d="M0 62 C18 46, 36 78, 54 62 C72 46, 90 66, 100 62 L100 100 L0 100 Z" fill="rgba(0,0,0,0.78)" />
              <path d="M0 52 C18 36, 36 68, 54 52 C72 36, 90 56, 100 52 L100 100 L0 100 Z" fill="rgba(255,255,255,0.06)" />
              <path d="M0 70 C22 56, 40 88, 60 70 C78 54, 96 72, 100 70 L100 100 L0 100 Z" fill="rgba(0,0,0,0.5)" opacity={0.6} />
            </g>
          )}

          {condition === 'cracked' && (
            <g opacity={0.75}>
              <path d="M52 12 L48 36 L60 36 L44 72" stroke="#2563eb" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )}

          {condition === 'chipped' && (
            <g opacity={0.98}>
              <path d="M20 28 C28 22, 34 24, 40 30 C36 28, 30 30, 24 34 C22 32, 20 30, 20 28 Z" fill="#ffffff" />
              {/* jagged missing piece */}
              <path d="M34 26 L38 22 L42 26 L40 30 L36 28 Z" fill="#f3f4f6" stroke="#d1d5db" strokeWidth={0.8} />
              <path d="M36 28 L44 32" stroke="#f97316" strokeWidth={1.4} opacity={0.9} />
              <path d="M42 26 L48 28 L44 34" stroke="#d1d5db" strokeWidth={0.6} opacity={0.6} />
            </g>
          )}

          {condition === 'retained_root' && (
            <g opacity={0.95}>
              <rect x="0" y="55" width="100" height="45" fill="#fff7ed" stroke="#f59e0b" strokeWidth={1} opacity={0.95} />
              <path d="M10 60 L30 70" stroke="#f59e0b" strokeWidth={1.2} opacity={0.7} />
            </g>
          )}

          {condition === 'impacted' && (
            <g opacity={0.95}>
              <rect x="0" y="55" width="100" height="45" fill="#312E81" opacity={0.95} />
              <g transform="rotate(-20 50 50)" opacity={0.9}>
                <rect x="-10" y="40" width="30" height="8" fill="#2d2b5f" />
                <rect x="20" y="40" width="30" height="8" fill="#2d2b5f" />
              </g>
            </g>
          )}

          {condition === 'erosion' && (
            <g>
              <rect x="0" y="0" width="100" height="100" fill={`url(#${gradErosionId})`} opacity={0.9} />
              <g opacity={0.9} fill="#f59e0b">
                <circle cx="26" cy="34" r="3" />
                <circle cx="38" cy="40" r="2.6" />
                <circle cx="62" cy="52" r="3.4" />
                <circle cx="74" cy="58" r="2.8" />
              </g>
              <rect x="6" y="66" width="18" height="4" fill="#f59e0b" opacity={0.4} transform="rotate(-12 15 68)" />
            </g>
          )}

          {condition === 'discolored' && (
            <rect x="0" y="0" width="100" height="100" fill={`url(#${gradDiscolorId})`} opacity={1} />
          )}

          {condition === 'stained' && (
            <g opacity={0.98}>
              {Array.from({ length: 16 }, (_, i) => ({
                cx: 8 + ((i * 31 + toothId.length * 13) % 74),
                cy: 6 + ((i * 21 + toothId.length * 11) % 82),
                r: 1.8 + ((i * 11 + toothId.length) % 3.2),
              })).map((p, i) => (
                <ellipse key={i} cx={`${p.cx}%`} cy={`${p.cy}%`} rx={p.r + 0.6} ry={p.r - 0.4} fill="#6b3f00" opacity={0.98} />
              ))}
            </g>
          )}

          {condition === 'needs_filling' && (
            <g opacity={0.75}>
              <circle cx="50" cy="50" r="8" fill="none" stroke="#10b981" strokeWidth={2} />
            </g>
          )}

          {condition === 'needs_root_canal' && (
            <g opacity={0.85} stroke="#ef4444" strokeWidth={2} strokeLinecap="round" fill="none">
              <path d="M50 12 L50 88" />
            </g>
          )}

          {condition === 'loose' && (
            <g opacity={0.9} fill="none">
              <path d="M10 10 C30 5,70 5,90 10 C80 30,80 70,90 90 C70 85,30 85,10 90 Z" stroke="#374151" strokeWidth={1.6} />
              <g transform="translate(2,0)">
                <path d="M10 10 C30 5,70 5,90 10 C80 30,80 70,90 90 C70 85,30 85,10 90 Z" stroke="#374151" strokeWidth={1.6} opacity={0.6} />
              </g>
            </g>
          )}

          {(condition === 'needs_extraction' || condition === 'extraction') && (
            <g opacity={0.95} pointerEvents="none">
              <line x1="20" y1="20" x2="80" y2="80" stroke="#111827" strokeWidth={4} strokeLinecap="round" />
              <line x1="80" y1="20" x2="20" y2="80" stroke="#111827" strokeWidth={4} strokeLinecap="round" />
            </g>
          )}

          {condition === 'caries' && (
            <circle cx="50" cy="50" r="14" fill="rgba(15, 23, 42, 0.4)" filter="blur(3px)" />
          )}
        </svg>
      </div>
    );
  };

  // Legend items to display on the left of the chart
  const LEGEND_ITEMS: { key: string; label: string }[] = [
    { key: 'caries', label: 'Dental Caries' },
    { key: 'cavity', label: 'Cavity' },
    { key: 'decay', label: 'Tooth Decay' },
    { key: 'abscess', label: 'Tooth Abscess' },
    { key: 'non_vital', label: 'Non-vital tooth' },
    { key: 'broken', label: 'Broken tooth' },
    { key: 'loose', label: 'Loose tooth' },
    { key: 'cracked', label: 'Cracked tooth' },
    { key: 'chipped', label: 'Chipped tooth' },
    { key: 'retained_root', label: 'Retained root' },
    { key: 'impacted', label: 'Impacted tooth' },
    { key: 'erosion', label: 'Erosion' },
    { key: 'discolored', label: 'Discolored tooth' },
    { key: 'stained', label: 'Stained tooth' },
    { key: 'needs_filling', label: 'Needs filling' },
    { key: 'needs_root_canal', label: 'Needs root canal' },
    { key: 'extraction', label: 'Extraction' },
    { key: 'needs_extraction', label: 'Needs extraction' },
    { key: 'missing', label: 'Missing tooth' },
  ];

  return (
    <div className="flex flex-col h-full bg-white font-sans relative">
      <style>{`
        .floatLooseAnim { animation: floatLoose 2.6s ease-in-out infinite; }
        @keyframes floatLoose {
          0% { transform: translateY(-8%); }
          50% { transform: translateY(-20%); }
          100% { transform: translateY(-8%); }
        }

        /* Dental chart action buttons themed to #13b5a7 */
        .dental-save-btn {
          background: #13b5a7;
          color: #ffffff;
          border: 1px solid rgba(0,0,0,0.04);
          transition: background .15s ease, transform .08s ease;
        }
        .dental-save-btn:hover { background: #119a8f; }

        .dental-new-btn {
          background: #ffffff;
          color: #13b5a7;
          border: 1px solid #13b5a7;
          transition: background .12s ease, color .12s ease;
        }
        .dental-new-btn:hover { background: rgba(19,181,167,0.06); }
      `}</style>
      {/* Header: patient selector + actions */}
      <div className="p-3 border-b bg-white flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm text-slate-700 font-medium whitespace-nowrap">Patient</label>
          <div className="relative flex-1 max-w-full">
            <input
              value={patientQuery}
              onChange={(e) => setPatientQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (patientQuery.trim().length === 0) return;
                  const existing = patients.find((p) => p.name.toLowerCase() === patientQuery.toLowerCase());
                  if (existing) setSelectedPatientObj(existing);
                  else {
                    const np = { id: Date.now().toString(), name: patientQuery.trim() };
                    setPatients((s) => [np, ...s]);
                    setSelectedPatientObj(np);
                  }
                }
              }}
              placeholder="Search or enter patient name..."
              className="px-3 py-2 border border-slate-200 rounded-md w-full bg-white text-slate-700 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
            />
            {patientQuery.length > 0 && filteredPatients.length > 0 && !(selectedPatientObj && selectedPatientObj.name.toLowerCase() === patientQuery.toLowerCase()) && (
              <div className="absolute mt-1 bg-white border border-slate-200 rounded-md w-full max-h-48 overflow-auto z-[100] shadow-lg">
                {filteredPatients.map((p) => (
                  <div
                    key={p.id}
                    className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-slate-700 text-sm"
                    onClick={() => {
                      setSelectedPatientObj(p);
                      setPatientQuery(p.name);
                    }}
                  >
                    {p.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedPatientObj && (
            <div className="text-xs text-teal-700 bg-teal-50 px-3 py-2 rounded-md border border-teal-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              Active: <span className="font-bold">{selectedPatientObj.name}</span>
            </div>
          )}
        </div>

        {/* Buttons Row - Positioned strictly below search bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setShowLegend(!showLegend)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                showLegend ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Legend
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                showHistory ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              History
            </button>
          </div>
          
          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <button
              onClick={handleNewChart}
              className="px-3 py-1.5 rounded-md dental-new-btn text-xs font-semibold shadow-sm"
            >
              New
            </button>
            <button
              onClick={saveChartSnapshot}
              className="px-4 py-1.5 rounded-md dental-save-btn shadow-md text-xs font-bold"
            >
              Save Chart
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row h-full gap-3 p-2 bg-white overflow-hidden relative">
        {/* Legend Column */}
        {showLegend && (
          <div
            ref={legendRef}
            className={`${
              isMobile ? 'fixed inset-0 z-[60] bg-white p-6' : 'w-full md:w-64 bg-gray-50 rounded-xl p-4'
            } flex flex-col gap-3 shadow-sm flex-shrink-0 overflow-hidden`}
            style={!isMobile ? { maxHeight: '80vh' } : {}}
          >
            <div className="flex items-center justify-between border-b border-slate-300 pb-2">
              <div className="text-base font-semibold text-slate-700">Legend</div>
              {isMobile && (
                <button onClick={() => setShowLegend(false)} className="p-1 hover:bg-slate-100 rounded">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-auto pr-2">
              <div className="grid grid-cols-1 gap-2">
                {LEGEND_ITEMS.map((it) => (
                  <div
                    key={it.key}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 transition"
                  >
                    <div className="relative w-10 h-10 flex-shrink-0">
                      <img
                        src="/all-teeth/1.png"
                        alt="tooth"
                        className="w-full h-full object-contain select-none pointer-events-none"
                        draggable={false}
                      />
                      {renderConditionOverlays('1', it.key)}
                    </div>
                    <div className="text-sm text-slate-700 break-words">{it.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Chart Area */}
        <div className="flex-1 flex flex-col items-center justify-start p-2 gap-3 overflow-auto min-w-0">
          <div
            ref={containerRef}
            className="relative w-full max-w-full overflow-auto scrollbar-thin scrollbar-thumb-teal-500 scrollbar-track-slate-100 hover:scrollbar-thumb-teal-600"
            style={{ minHeight: '300px' }} // reduced min height for compact view
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={handleContainerClick}
          >
            <div className="relative w-full" style={{ minWidth: isMobile ? '600px' : 'auto' }}>
              <img
                src="/backgroundngipin.png"
                alt="Dental chart background"
                className="block w-full h-auto select-none pointer-events-none"
                draggable={false}
              />

              {layout.map((tooth) => {
                const numericId = getToothNumericId(tooth.id);
                const toothData = numericId ? teeth[numericId] : undefined;
                const conditions =
                  toothData?.conditions?.length > 0
                    ? toothData.conditions
                    : toothData?.generalCondition
                    ? [toothData.generalCondition]
                    : [];
                const primaryCondition = conditions[0] ?? 'healthy';

                const zIndex =
                  10 + (Math.round(tooth.topPct) % 30) + (conditions.includes('loose') ? 50 : 0);

                return (
                  <div
                    key={tooth.id}
                    className={`absolute ${selectedPatientObj ? 'cursor-pointer' : 'cursor-default'} group transition-all duration-200`}
                    style={{
                      left: `${tooth.leftPct}%`,
                      top: `${tooth.topPct}%`,
                      width: `${tooth.widthPct}%`,
                      transform: `translate(-50%, ${conditions.includes('loose') ? '-60%' : '-50%'})`,
                      zIndex: (selectedTooth === numericId ? 1000 : 10 + Math.round(tooth.topPct) + Math.round(tooth.leftPct / 2)) + (conditions.includes('loose') ? 200 : 0),
                      pointerEvents: 'none', // ignore clicks on the outer container
                    }}
                  >
                    {/* Visual selection indicator */}
                    {selectedTooth === numericId && (
                      <div className="absolute inset-0 bg-sky-400/20 rounded-full animate-pulse ring-2 ring-sky-400 ring-offset-2 z-0" />
                    )}

                    {/* Hitbox reduction: use a smaller inner div for the click event to prevent overlapping container clicks */}
                    <div 
                      className="absolute inset-0 z-10 pointer-events-auto" // capture clicks here
                      style={{ transform: 'scale(0.8)' }}
                      onClick={(e) => handleIconClick(e, tooth.id)}
                    />
                    
                    {conditions.includes('loose') && (
                      <div
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: '78%',
                          transform: 'translate(-50%, -50%)',
                          width: '60%',
                          height: '18%',
                          background: 'rgba(0,0,0,0.36)',
                          borderRadius: '50%',
                          filter: 'blur(8px)',
                          zIndex: 1,
                          pointerEvents: 'none',
                        }}
                      />
                    )}

                    <img
                      src={`/all-teeth/${tooth.id}.png`}
                      alt={`Tooth ${tooth.id}`}
                      className={`w-full select-none pointer-events-none ${
                        conditions.includes('loose') ? 'floatLooseAnim' : ''
                      }`}
                      style={conditions.includes('loose') ? { zIndex: 2 } : undefined}
                      draggable={false}
                    />

                    {renderConditionOverlays(tooth.id, conditions.length ? conditions : primaryCondition)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* History Panel */}
        {showHistory && (
          <div
            ref={historyRef}
            className={`${
              isMobile ? 'fixed inset-0 z-[60] bg-white p-6' : 'w-full md:w-80 bg-white border border-slate-100 rounded-xl p-4'
            } flex-shrink-0 flex flex-col gap-3 overflow-hidden shadow-sm`}
            style={!isMobile ? { maxHeight: '80vh' } : {}}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-base font-semibold text-slate-700">Chart History</h3>
              {isMobile && (
                <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-slate-100 rounded">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              )}
            </div>
            {selectedPatientObj ? (
              <div className="flex-1 overflow-auto pr-2 space-y-2">
                {chartHistory.filter((c) => c.patientId === selectedPatientObj.id).length === 0 && (
                  <div className="text-sm text-slate-500 py-4 text-center">No history found</div>
                )}
                {chartHistory
                  .filter((c) => c.patientId === selectedPatientObj.id)
                  .map((c) => {
                    const date = new Date(c.createdAt);
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          loadChartSnapshot(c);
                          if (isMobile) setShowHistory(false);
                        }}
                        className="p-3 bg-slate-50 border border-slate-100 rounded-lg hover:border-teal-300 hover:bg-teal-50 cursor-pointer transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-slate-800 truncate max-w-[150px]">
                              {c.patientName}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                            LOAD
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400 text-center px-4">
                Select a patient to view their clinical history
              </div>
            )}
          </div>
        )}
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

      {/* Modal: prompt user to select a patient before editing */}
      {showSelectPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSelectPatientModal(false)} />
          <div className="relative w-full max-w-md mx-4">
            <div className="rounded-lg overflow-hidden shadow-lg" role="dialog" aria-modal="true">
              <div className="p-4 bg-gradient-to-r from-teal-400 via-cyan-400 to-green-400 text-white">
                <h2 className="text-lg font-semibold">Select a patient</h2>
              </div>
              <div className="p-4 bg-white text-slate-800">
                <p className="mb-4">Please select a patient first to enable chart editing.</p>
                <div className="flex justify-end">
                  <button
                    ref={okButtonRef}
                    onClick={() => setShowSelectPatientModal(false)}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
