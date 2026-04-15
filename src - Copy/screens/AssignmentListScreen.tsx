import React from 'react';
import { FileText, Download, Calendar, Clock, Tag, ExternalLink, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { Assignment } from '../types';

interface AssignmentListScreenProps {
  onBack: () => void;
}

export default function AssignmentListScreen({ onBack }: AssignmentListScreenProps) {
  const [assignments, setAssignments] = React.useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const assignmentsQuery = query(
      collection(db, 'assignments'),
      orderBy('dueDate', 'asc')
    );
    const unsubscribe = onSnapshot(assignmentsQuery, (snapshot) => {
      setAssignments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Assignment[]);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDownload = (title: string) => {
    console.log(`Downloading: ${title}`);
  };

  const handleSubmit = (title: string) => {
    console.log(`Submitting work for: ${title}`);
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
            Task <span className="text-brand-green">Atelier.</span>
          </motion.h2>
          <p className="text-outline text-sm font-medium tracking-wide">Manage and submit your academic assignments.</p>
        </div>
      </section>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Pending Tasks', value: assignments.length.toString().padStart(2, '0'), color: 'text-brand-green' },
          { label: 'Due This Week', value: '02', color: 'text-white' },
          { label: 'Completion Rate', value: '88%', color: 'text-outline' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/5">
            <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-2">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Assignment List */}
      <section className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-brand-green/20 border-t-brand-green rounded-full animate-spin"></div>
            <p className="text-outline text-xs font-bold uppercase tracking-widest">Loading Tasks...</p>
          </div>
        ) : assignments.length > 0 ? (
          assignments.map((assignment) => (
            <div key={assignment.id} className="group bg-surface-container-low hover:bg-surface-container-high rounded-2xl p-8 border border-outline-variant/5 transition-all flex flex-col lg:flex-row gap-8 items-start lg:items-center">
              <div className="w-14 h-14 rounded-xl bg-surface-container-high flex items-center justify-center text-brand-green shrink-0 group-hover:scale-105 transition-transform">
                <FileText size={24} />
              </div>
              
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-white group-hover:text-brand-green transition-colors">{assignment.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                    assignment.priority === 'High' ? 'bg-error/10 text-error' : 'bg-brand-green/10 text-brand-green'
                  }`}>
                    {assignment.priority}
                  </span>
                </div>
                <p className="text-outline text-sm leading-relaxed max-w-2xl line-clamp-2">{assignment.description}</p>
                
                <div className="flex flex-wrap gap-6 pt-1">
                  <div className="flex items-center gap-2 text-outline">
                    <Calendar size={14} />
                    <span className="text-[10px] font-medium uppercase tracking-widest">Due: {assignment.dueDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-outline">
                    <Tag size={14} />
                    <span className="text-[10px] font-medium uppercase tracking-widest">Academic</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 w-full lg:w-auto">
                <button 
                  onClick={() => handleDownload(assignment.title)}
                  className="flex-1 lg:flex-none px-6 py-3 rounded-full bg-surface-container-high text-outline text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  Brief
                  <Download size={14} />
                </button>
                <button 
                  onClick={() => handleSubmit(assignment.title)}
                  className="flex-1 lg:flex-none px-6 py-3 rounded-full bg-brand-green text-surface text-[10px] font-bold uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  Submit
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/20">
            <p className="text-outline text-sm italic">No assignments assigned yet.</p>
          </div>
        )}
      </section>
    </div>
  );
 }
