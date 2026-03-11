import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { dentalClinicLogo as logo } from '../assets/index';

interface LoadingScreenProps {
  isLoading: boolean;
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  isLoading, 
  message = "Please wait while we load your data..." 
}) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
        >
          <motion.div
            animate={{
              scale: [1, 1.1, 1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative"
          >
            <img 
              src={logo} 
              alt="Dental Clinic Logo" 
              className="w-48 h-48 object-contain"
            />
            <div className="absolute inset-0 bg-teal-400/10 rounded-full blur-3xl -z-10 animate-pulse" />
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 flex flex-col items-center"
          >
            <h1 className="text-2xl font-bold text-teal-800 tracking-tight">Dental Clinic</h1>
            <p className="text-slate-500 font-medium mt-1">{message}</p>
            
            <div className="mt-6 flex gap-1">
              {[0, 0.2, 0.4].map((delay) => (
                <motion.div 
                  key={delay}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }} 
                  transition={{ repeat: Infinity, duration: 0.8, delay }}
                  className="w-2.5 h-2.5 bg-teal-500 rounded-full" 
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
