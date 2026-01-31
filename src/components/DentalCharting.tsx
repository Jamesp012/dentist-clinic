import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { Patient, TreatmentRecord } from '../App';

type DentalChartingProps = {
  patients: Patient[];
  treatmentRecords: TreatmentRecord[];
  setTreatmentRecords: (records: TreatmentRecord[]) => void;
};

export function DentalCharting({ patients, treatmentRecords, setTreatmentRecords }: DentalChartingProps) {
  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen">
      <motion.div 
        className="bg-white p-12 rounded-xl shadow-xl border border-purple-100 text-center"
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
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Dental Charting</h2>
        <p className="text-gray-600 text-lg">This feature is being redesigned</p>
      </motion.div>
    </div>
  );
}
