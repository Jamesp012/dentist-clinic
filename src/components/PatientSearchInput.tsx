import { useState, useRef, useEffect } from 'react';
import { Patient } from '../App';
import { Search, X } from 'lucide-react';

type PatientSearchInputProps = {
  patients: Patient[];
  selectedPatientId: string;
  onSelectPatient: (patientId: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
};

export function PatientSearchInput({ 
  patients, 
  selectedPatientId, 
  onSelectPatient,
  placeholder = "Search patient...",
  className = "",
  required = false
}: PatientSearchInputProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Initialize search term from selected patient only on mount
  useEffect(() => {
    if (selectedPatientId) {
      const patient = patients.find(p => String(p.id) === String(selectedPatientId));
      if (patient && !searchTerm) {
        setSearchTerm(patient.name);
      }
    }
  }, []);

  // Filter patients based on search term
  const filteredPatients = searchTerm
    ? patients.filter(patient =>
        patient.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : patients;

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    setShowSuggestions(true);
    if (!value) {
      onSelectPatient('');
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    setSearchTerm(patient.name);
    setShowSuggestions(false);
    onSelectPatient(String(patient.id));
  };

  const handleClear = () => {
    setSearchTerm('');
    setShowSuggestions(false);
    onSelectPatient('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          required={required}
          className={`w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredPatients.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredPatients.map((patient) => (
            <button
              key={patient.id}
              type="button"
              onClick={() => handleSelectPatient(patient)}
              className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors"
            >
              <div className="font-medium">{patient.name}</div>
              {patient.email && (
                <div className="text-xs text-gray-500">{patient.email}</div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showSuggestions && searchTerm && filteredPatients.length === 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500"
        >
          No patients found
        </div>
      )}
    </div>
  );
}
