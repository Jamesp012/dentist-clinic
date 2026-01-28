// Custom Peso Sign Icon Component
// Mimics lucide-react icon style

interface PesoSignProps {
  className?: string;
}

export function PesoSign({ className = "w-6 h-6" }: PesoSignProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Vertical line */}
      <line x1="7" y1="3" x2="7" y2="21" />
      {/* P shape */}
      <path d="M7 3h6a4 4 0 0 1 0 8H7" />
      {/* Horizontal lines */}
      <line x1="3" y1="11" x2="11" y2="11" />
      <line x1="3" y1="15" x2="11" y2="15" />
    </svg>
  );
}
