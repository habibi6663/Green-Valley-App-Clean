import React from 'react';
import { FileText, Calendar, ArrowLeft, ClipboardList } from 'lucide-react';
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
    const q = query(collection(db, 'assignments'), orderBy('dueDate', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setAssignments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment)));
        setIsLoading(false);
      },
      () => setIsLoading(false)
    );
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-12">
      {/* Header */}
      <section className="space-y-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-outline hover:text-white transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Back to Dashboard</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-headline text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white"
            >
              Assign<span className="text-brand-green">ments.</span>
            </motion.h2>
            <p className="text-outline text-sm font-medium tracking-wide">
              Your pending academic tasks.
            </p>
          </div>

          {/* Total count badge */}
          {!isLoading && (
            <div className="bg-surface-container-low rounded-2xl px-6 py-4 border border-outline-variant/5 flex items-center gap-4 self-start md:self-auto">
              <ClipboardList size={20} className="text-brand-green" />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-outline">Total</p>
                <p className="text-2xl font-bold text-white leading-none mt-0.5">
                  {assignments.length.toString().padStart(2, '0')}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Assignment List */}
      <section className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-10 h-10 border-2 border-brand-green/20 border-t-brand-green rounded-full animate-spin" />
            <p className="text-outline text-[10px] font-bold uppercase tracking-widest animate-pulse">
              Loading assignments…
            </p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/20 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center text-outline/60">
              <ClipboardList size={28} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-white font-bold text-sm">No assignments yet</p>
              <p className="text-outline text-xs">Check back later — your teacher will post tasks here.</p>
            </div>
          </div>
        ) : (
          assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="group bg-surface-container-low hover:bg-surface-container-high rounded-2xl p-4 md:p-6 border border-outline-variant/5 hover:border-brand-green/20 transition-all flex flex-col sm:flex-row gap-4 sm:items-center"
            >
              {/* Icon */}
              <div className="w-11 h-11 rounded-xl bg-surface-container-high flex items-center justify-center text-brand-green group-hover:scale-105 transition-transform flex-shrink-0">
                <FileText size={20} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-white group-hover:text-brand-green transition-colors truncate">
                    {assignment.title}
                  </h3>
                  {assignment.priority && (
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest flex-shrink-0 ${
                      assignment.priority === 'High'
                        ? 'bg-error/10 text-error'
                        : 'bg-surface-container-highest text-outline'
                    }`}>
                      {assignment.priority}
                    </span>
                  )}
                </div>

                {assignment.description && (
                  <p className="text-outline text-xs leading-relaxed line-clamp-2">
                    {assignment.description}
                  </p>
                )}

                {assignment.dueDate && (
                  <div className="flex items-center gap-1.5 text-outline">
                    <Calendar size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      Due: {assignment.dueDate}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
