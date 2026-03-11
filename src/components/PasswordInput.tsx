import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
// some changes
interface PasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  autoComplete?: string;
}

export function PasswordInput({
  value,
  onChange,
  placeholder = 'Enter password',
  required = false,
  className = '',
  autoComplete = 'current-password',
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative">
      <Lock className="w-5 h-5 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
      <input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full pl-11 pr-12 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
          className.includes('border-red-500') ? 'border-red-500 ring-red-500/20' : 'border-slate-200'
        } ${className}`}
      />
      <button
        type="button"
        onClick={togglePasswordVisibility}
        className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? (
          <EyeOff className="w-5 h-5" />
        ) : (
          <Eye className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
