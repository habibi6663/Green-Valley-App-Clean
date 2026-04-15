import React from 'react';
import { FileText, Download, Filter, BarChart, PieChart, Activity, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface ReportGenerationScreenProps {
  onBack: () => void;
}

export default function ReportGenerationScreen({ onBack }: ReportGenerationScreenProps) {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [hasReport, setHasReport] = React.useState(false);
  const [timeframe, setTimeframe] = React.useState('Term 1');
  const [format, setFormat] = React.useState('PDF');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setHasReport(false);
    
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'Academic Performance', timeframe, format }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Report generated:', data);
        setHasReport(true);
      } else {
        console.error('Failed to generate report');
      }
    } catch (error) {
      console.error('Error calling report API:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-16">
      {/* Header */}
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
            className="font-headline text-4xl md:text-5xl font-bold tracking-tight text-white"
          >
            Report <span className="text-brand-green">Engine.</span>
          </motion.h2>
          <p className="text-outline text-sm font-medium tracking-wide">Generate institutional insights and academic summaries.</p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Configuration Panel */}
        <section className="lg:col-span-4">
          <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/5 space-y-8">
            <h3 className="text-[10px] font-bold text-outline uppercase tracking-widest flex items-center gap-2">
              <Filter size={14} className="text-brand-green" />
              Parameters
            </h3>
            <form className="space-y-6" onSubmit={handleGenerate}>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Report Type</label>
                <select className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-green/40 transition-all appearance-none">
                  <option>Academic Performance</option>
                  <option>Attendance Analytics</option>
                  <option>Financial Collection</option>
                  <option>Institutional Growth</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Timeframe</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Term 1', 'Term 2'].map((t) => (
                    <button 
                      key={t}
                      type="button" 
                      onClick={() => setTimeframe(t)}
                      className={`py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
                        timeframe === t ? 'bg-brand-green text-surface border-brand-green' : 'bg-surface-container-high border-outline-variant/10 text-outline hover:border-brand-green/30'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Format</label>
                <div className="flex gap-6">
                  {['PDF', 'CSV'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormat(f)}
                      className="flex items-center gap-2 group"
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${format === f ? 'border-brand-green' : 'border-outline-variant/30'}`}>
                        {format === f && <div className="w-2 h-2 rounded-full bg-brand-green"></div>}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${format === f ? 'text-white' : 'text-outline group-hover:text-white'}`}>{f}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button 
                disabled={isGenerating}
                className="w-full py-5 bg-brand-green text-surface rounded-full font-bold text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-3 mt-4"
              >
                {isGenerating ? 'Generating...' : (
                  <>
                    Initialize Generation
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* Preview Section */}
        <section className="lg:col-span-8">
          <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/5 min-h-[500px] flex flex-col">
            <div className="flex justify-between items-center mb-12">
              <h3 className="text-[10px] font-bold text-outline uppercase tracking-widest">Live Preview</h3>
              <div className="flex gap-2">
                {[BarChart, PieChart, Activity].map((Icon, idx) => (
                  <button 
                    key={idx}
                    className="p-2 bg-surface-container-high rounded-lg text-outline hover:text-white transition-colors"
                  >
                    <Icon size={16} />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
              {isGenerating ? (
                <div className="w-24 h-24 rounded-full bg-surface-container-high flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full border-2 border-brand-green/10 border-t-brand-green animate-spin"></div>
                  <FileText size={32} className="text-brand-green animate-pulse" />
                </div>
              ) : hasReport ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <div className="w-20 h-20 rounded-full bg-brand-green/10 flex items-center justify-center mx-auto">
                    <FileText size={32} className="text-brand-green" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-white font-bold text-lg">Report Ready</h4>
                    <p className="text-outline text-xs max-w-xs mx-auto">The synthesis is complete. Your document is ready.</p>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center mx-auto">
                    <FileText size={32} className="text-outline/30" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-white font-bold text-lg">Awaiting Parameters</h4>
                    <p className="text-outline text-xs max-w-xs mx-auto">Configure the report settings to begin synthesis.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-12 pt-8 border-t border-outline-variant/5 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center">
                  <Download size={18} className="text-outline" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Last Generated</p>
                  <p className="text-[10px] text-outline font-medium">Academic_Summary_Q3.pdf</p>
                </div>
              </div>
              <button className="text-brand-green font-bold text-[10px] uppercase tracking-widest hover:underline">
                Download Archive
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
