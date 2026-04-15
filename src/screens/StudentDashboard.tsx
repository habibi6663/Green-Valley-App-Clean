import React from 'react';
import { CreditCard, ArrowRight, ExternalLink, Microscope, Sigma, ScrollText, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs, doc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { Assignment, Note, Fee, Attendance } from '../types';
import { AttendanceAnalytics, calculateAttendanceStats } from '../lib/attendanceUtils';

interface StudentDashboardProps {
  onViewBilling: () => void;
  onViewAssignments: () => void;
  onViewNotes: () => void;
}

export default function StudentDashboard({ onViewBilling, onViewAssignments, onViewNotes }: StudentDashboardProps) {
  const [assignments, setAssignments] = React.useState<Assignment[]>([]);
  const [latestNote, setLatestNote] = React.useState<Note | null>(null);
  const [totalFees, setTotalFees] = React.useState(0);
  const [attendanceStats, setAttendanceStats] = React.useState<AttendanceAnalytics>({ weekly: 0, monthly: 0, yearly: 0 });
  const [userName, setUserName] = React.useState('Student');
  const [isLoading, setIsLoading] = React.useState(true);

  const iconMap: Record<string, any> = {
    'microscope': Microscope,
    'sigma': Sigma,
    'scroll-text': ScrollText,
  };

  React.useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    let attendanceUnsubscribe: (() => void) | undefined;
    // Fetch User Profile AND Setup Attendance
    const userUnsubscribe = onSnapshot(doc(db, 'users', uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserName(data.fullName?.split(' ')[0] || data.name?.split(' ')[0] || 'Student');
        
        if (attendanceUnsubscribe) attendanceUnsubscribe();
        
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('class', '==', data.class || 'General'),
          where('section', '==', data.section || 'A')
        );
        
        attendanceUnsubscribe = onSnapshot(attendanceQuery, (snapshot) => {
          if (!snapshot.empty) {
            const records = snapshot.docs.map(doc => {
              const attData = doc.data();
              if (attData.students && Array.isArray(attData.students)) {
                const s = attData.students.find((stu: any) => stu.studentId === uid);
                if (s) {
                  return { ...attData, status: s.status } as Attendance;
                }
              }
              // Fallback for legacy records
              if (attData.studentId === uid) {
                 return attData as Attendance;
              }
              return null;
            }).filter(Boolean) as Attendance[];
            
            setAttendanceStats(calculateAttendanceStats(records));
          } else {
            setAttendanceStats({ weekly: 0, monthly: 0, yearly: 0 });
          }
          setIsLoading(false);
        });
      }
    });

    return () => {
      userUnsubscribe();
      assignmentsUnsubscribe();
      notesUnsubscribe();
      feesUnsubscribe();
      if (attendanceUnsubscribe) attendanceUnsubscribe();
    };
  }, []);

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div className="space-y-2">
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-headline text-2xl md:text-4xl md:text-5xl font-bold tracking-tight text-white"
          >
            Hello, <span className="text-brand-green">{userName}.</span>
          </motion.h2>
          <p className="text-outline text-sm font-medium tracking-wide">Your academic performance is on track this term.</p>
        </div>
        
        <div 
          onClick={onViewBilling}
          className="w-full md:w-auto bg-surface-container-high rounded-2xl p-4 md:p-6 flex items-center gap-6 border border-outline-variant/10 hover:border-brand-green/30 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-green/10 flex items-center justify-center text-brand-green">
            <CreditCard size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Semester Fees</p>
            <h3 className="text-xl font-bold text-white">${totalFees.toLocaleString()}</h3>
          </div>
          <ArrowRight size={20} className="text-outline group-hover:text-brand-green group-hover:translate-x-1 transition-all ml-4" />
        </div>
      </section>

      {/* Quick Stats Bento */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Attendance Card */}
        <div className="bg-surface-container-low rounded-2xl p-4 md:p-8 border border-outline-variant/5 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-brand-green" />
              <h4 className="font-bold text-white">Attendance Stats</h4>
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-outline">Real-time</span>
          </div>
          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {Object.entries(attendanceStats).map(([period, rate]) => (
              <div key={period} className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-outline">{period}</span>
                  <span className="text-brand-green">{rate}%</span>
                </div>
                <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-brand-green rounded-full transition-all duration-1000" style={{ width: `${rate}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Notes */}
        <div className="md:col-span-2 bg-surface-container-low rounded-2xl p-4 md:p-8 border border-outline-variant/5 flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2 text-outline">
              <ScrollText size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Latest Notes</span>
            </div>
            <h4 className="font-bold text-2xl text-white leading-tight">
              {latestNote ? latestNote.title : 'No notes available yet'}
            </h4>
            <button 
              onClick={onViewNotes}
              className="text-brand-green font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all"
            >
              Open Notebook <ExternalLink size={14} />
            </button>
          </div>
          <div className="w-full md:w-32 h-32 rounded-xl overflow-hidden border border-outline-variant/10">
            <img 
              src={latestNote?.image || "https://picsum.photos/seed/school-notes/400/400"} 
              alt="Notes" 
              className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </section>

      {/* Assignments List */}
      <section className="space-y-8">
        <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
          <h4 className="font-bold text-2xl text-white">Assignments</h4>
          <button 
            onClick={onViewAssignments}
            className="text-xs font-bold text-outline uppercase tracking-widest hover:text-white transition-colors"
          >
            View All
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {assignments.length > 0 ? (
            assignments.map((assignment) => {
              const Icon = iconMap[assignment.icon || ''] || ScrollText;
              return (
                <div 
                  key={assignment.id} 
                  onClick={onViewAssignments}
                  className="group bg-surface-container-low hover:bg-surface-container-high transition-all rounded-2xl p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-outline-variant/5 cursor-pointer"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-surface-container-highest flex items-center justify-center text-brand-green group-hover:scale-110 transition-transform">
                      <Icon size={24} />
                    </div>
                    <div>
                      <h5 className="text-lg font-bold text-white group-hover:text-brand-green transition-colors">{assignment.title}</h5>
                      <p className="text-outline text-xs mt-1 line-clamp-1">{assignment.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-outline mb-1">Due Date</p>
                      <p className="text-sm font-bold text-white">{assignment.dueDate}</p>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full border ${assignment.priority === 'High' ? 'border-error/20 bg-error/5 text-error' : 'border-outline-variant/20 text-outline'}`}>
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        {assignment.priority}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-outline text-sm text-center py-10 italic">No assignments found.</p>
          )}
        </div>
      </section>
    </div>
  );
}
