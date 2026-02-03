import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select service...',
  className = 'w-full px-3 py-2 border border-purple-300 rounded-lg'
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Sort options alphabetically and filter by search term
  const sortedAndFilteredOptions = options
    .sort((a, b) => a.localeCompare(b))
    .filter(option => option.toLowerCase().includes(searchTerm.toLowerCase()));

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={isOpen ? searchTerm : value}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`${className} focus:outline-none focus:ring-2 focus:ring-purple-400`}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-purple-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {sortedAndFilteredOptions.length > 0 ? (
            <ul className="py-1">
              {sortedAndFilteredOptions.map((option) => (
                <li key={option}>
                  <button
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`w-full px-3 py-2 text-left hover:bg-purple-100 transition-colors ${
                      value === option ? 'bg-purple-200 font-semibold' : ''
                    }`}
                  >
                    {option}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-2 text-gray-500 text-sm">No services found</div>
          )}
        </div>
      )}
    </div>
  );
}
