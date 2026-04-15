import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface BillingHistoryScreenProps {
  onBack: () => void;
}

export default function BillingHistoryScreen({ onBack }: BillingHistoryScreenProps) {
  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-outline hover:text-white transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Back to Dashboard</span>
        </button>

        <div className="space-y-2">
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-headline text-2xl md:text-4xl md:text-5xl font-bold tracking-tight text-white"
          >
            Fees & <span className="text-brand-green">Payments.</span>
          </motion.h2>
          <p className="text-outline text-sm font-medium tracking-wide">This area is reserved for the upcoming payments experience.</p>
        </div>
      </section>
      <section className="bg-surface-container-low rounded-3xl border border-outline-variant/10 min-h-[420px] flex items-center justify-center">
        <div className="flex flex-col items-center justify-center h-full text-center p-4 md:p-6">
          <h1 className="text-2xl font-semibold mb-2 text-white">💳 Fees & Payments</h1>
          <p className="text-outline mb-4">
            This feature is coming soon.
          </p>
          <p className="text-sm text-outline/80">
            Online fee payment will be available in a future update.
          </p>
        </div>
      </section>
    </div>
  );
}
