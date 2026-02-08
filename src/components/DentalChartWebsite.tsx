import React, { useRef, useState, useCallback } from 'react';
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

export function DentalChartWebsite() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<ToothLayout[]>(INITIAL_LAYOUT);
  const [hovered, setHovered] = useState(false);

  // Tooth data and sidebar state
  const [teeth, setTeeth] = useState<Record<number, ToothData>>(() => createInitialTeethData());
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  return (
    <div className="flex flex-col h-full bg-transparent font-sans">
      <div className="flex-1 flex flex-col items-center justify-center p-2 gap-3">
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
            const isMissing = condition === 'missing';
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
                // Clicks are handled at container level to avoid overlap/hitbox issues
              >
                <img
                  src={`/all-teeth/${tooth.id}.png`}
                  alt={`Tooth ${tooth.id}`}
                  className="w-full select-none drop-shadow-sm pointer-events-none"
                  draggable={false}
                />

                {/* Colored masked overlay for any non-healthy condition (uses tooth PNG as mask) */}
                {condition !== 'healthy' && (
                  <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundColor: color ?? '#e8545c',
                      opacity: 0.5,
                      // Clip the colored overlay to the tooth PNG so we don't paint the whole bounding box
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
                {/* Icons are fixed size and position (non-draggable, non-resizable) */}
              </div>
            );
          })}
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
