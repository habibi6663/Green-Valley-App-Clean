import React from 'react';
import { Wallet, MessageSquare, FileText, Calendar, ChevronRight, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, getDocs } from 'firebase/firestore';
import { Fee, Attendance, UpdateItem } from '../types';
import { AttendanceAnalytics, calculateAttendanceStats } from '../lib/attendanceUtils';
import { MOCK_UPDATES } from '../constants';

interface ParentDashboardProps {
  onMakePayment: () => void;
  onViewUpdates: () => void;
  onContactTeacher: () => void;
  onViewAttendance: () => void;
  onViewNotes: () => void;
}

export default function ParentDashboard({ 
  onMakePayment, 
  onViewUpdates, 
  onContactTeacher, 
  onViewAttendance,
  onViewNotes
}: ParentDashboardProps) {
  const [totalFees, setTotalFees] = React.useState(0);
  const [attendanceStats, setAttendanceStats] = React.useState<AttendanceAnalytics>({ weekly: 0, monthly: 0, yearly: 0 });
  const [userName, setUserName] = React.useState('Parent');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Fetch Parent Profile
    const userUnsubscribe = onSnapshot(doc(db, 'users', uid), (doc) => {
      if (doc.exists()) {
        const name = doc.data().name || 'Parent';
        setUserName(name.includes(' ') ? `The ${name.split(' ').pop()} Family` : name);
      }
    });

    const fetchStudentData = async () => {
      // Find the student linked to this parent from 'users' collection
      const studentsQ = query(
        collection(db, 'users'),
        where('role', '==', 'STUDENT'),
        where('parentId', '==', uid)
      );
      const studentsSnapshot = await getDocs(studentsQ);
      
      if (studentsSnapshot.empty) {
        console.log('[DEBUG] No linked student found for parent UID:', uid);
        setIsLoading(false);
        return;
      }

      const studentId = studentsSnapshot.docs[0].id;

      // Fetch Fees
      const feesQuery = query(
        collection(db, 'fees'),
        where('studentId', '==', studentId),
        where('status', '!=', 'PAID')
      );
      const feesUnsub = onSnapshot(feesQuery, (snapshot) => {
        const total = snapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
        setTotalFees(total);
      });

      // Fetch Attendance
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('class', '==', studentsSnapshot.docs[0].data().class || 'General'),
        where('section', '==', studentsSnapshot.docs[0].data().section || 'A')
      );
      
      const attendanceUnsub = onSnapshot(attendanceQuery, (snapshot) => {
        if (!snapshot.empty) {
          const records = snapshot.docs.map(doc => {
            const attData = doc.data();
            if (attData.students && Array.isArray(attData.students)) {
              const s = attData.students.find((stu: any) => stu.studentId === studentId);
              if (s) {
                return { ...attData, status: s.status } as Attendance;
              }
            }
            if (attData.studentId === studentId) {
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

      return () => {
        feesUnsub();
        attendanceUnsub();
      };
    };

    let cleanup: (() => void) | undefined;
    fetchStudentData().then(unsub => {
      cleanup = unsub;
    });

    return () => {
      userUnsubscribe();
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="space-y-2">
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-headline text-4xl md:text-5xl font-bold tracking-tight text-white"
        >
          Welcome, <span className="text-brand-green">{userName}.</span>
        </motion.h2>
        <p className="text-outline text-sm font-medium tracking-wide">Track your child's progress and manage school requirements.</p>
      </section>

      {/* Academic Vault Shortcut */}
      <section 
        onClick={onViewNotes}
        className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/10 hover:border-brand-green/30 transition-all cursor-pointer group relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-green/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-brand-green/10 transition-all" />
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-brand-green/10 flex items-center justify-center text-brand-green">
              <FileText size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-white tracking-tight">Academic Vault.</h3>
              <p className="text-outline text-sm font-medium">Access your child's lecture notes and learning materials.</p>
            </div>
          </div>
          <button className="flex items-center gap-3 px-8 py-4 bg-surface-container-high text-white rounded-full font-bold text-xs uppercase tracking-widest hover:bg-brand-green hover:text-surface transition-all group-hover:scale-105 active:scale-95">
            Open Registry
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Quick Stats & Fees */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Fee Payment Card */}
        <div className="md:col-span-4 bg-surface-container-high rounded-2xl p-8 border border-outline-variant/10 flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="w-12 h-12 rounded-xl bg-brand-green/10 flex items-center justify-center text-brand-green mb-6">
              <Wallet size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">School Fees</h3>
            <p className="text-outline text-xs mb-6">Outstanding balance for the current term.</p>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-outline">Total Balance</span>
                <span className="text-white font-bold">${totalFees.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <button 
            disabled
            className="w-full py-4 bg-brand-green text-surface rounded-full font-bold text-xs uppercase tracking-widest opacity-50 cursor-not-allowed mt-8"
          >
            Pay (Coming Soon)
          </button>
        </div>

        {/* Performance Chart Card */}
        <div className="md:col-span-8 bg-surface-container-low rounded-2xl p-8 border border-outline-variant/5 flex flex-col justify-between min-h-[300px]">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Academic Performance</h3>
              <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Term 2 Progress</p>
            </div>
          </div>
          
          <div className="flex-1 flex items-end justify-between gap-4 px-2">
            {[40, 65, 85, 75, 92].map((height, idx) => (
              <div 
                key={idx} 
                className={`w-full rounded-t-lg relative group transition-all duration-500 ${idx === 4 ? 'bg-brand-green' : 'bg-surface-container-high'}`} 
                style={{ height: `${height}%` }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-surface text-[10px] font-bold px-2 py-1 rounded">
                  {height}%
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-outline font-bold uppercase tracking-widest mt-6">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May'].map(m => <span key={m}>{m}</span>)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Attendance Overview */}
        <div 
          onClick={onViewAttendance}
          className="md:col-span-4 bg-surface-container-low rounded-2xl p-8 border border-outline-variant/5 flex flex-col items-center justify-center cursor-pointer hover:border-brand-green/30 transition-all group"
        >
          <div className="relative w-24 h-24 mb-6">
            <svg className="w-full h-full" viewBox="0 0 36 36">
              <circle className="text-surface-container-high" cx="18" cy="18" r="15.9155" fill="none" stroke="currentColor" strokeWidth="3" />
              <circle 
                className="text-brand-green transition-all duration-1000" 
                cx="18" cy="18" r="15.9155" 
                fill="none" stroke="currentColor" 
                strokeWidth="3" 
                strokeDasharray={`${attendanceStats.yearly}, 100`} 
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center -translate-y-1">
              <span className="text-2xl font-bold text-white">{attendanceStats.yearly}%</span>
              <span className="text-[7px] text-outline uppercase tracking-widest font-bold">Yearly</span>
            </div>
          </div>
          
          <div className="w-full space-y-3 mt-2">
            <div className="flex justify-between items-center text-xs border-b border-outline-variant/5 pb-2">
              <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Weekly</span>
              <span className="font-bold text-white">{attendanceStats.weekly}%</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Monthly</span>
              <span className="font-bold text-white">{attendanceStats.monthly}%</span>
            </div>
          </div>
        </div>

        {/* Recent Updates */}
        <div className="md:col-span-8 bg-surface-container-low rounded-2xl p-8 border border-outline-variant/5">
          <div className="flex justify-between items-center mb-8 border-b border-outline-variant/10 pb-4">
            <h3 className="font-bold text-lg text-white">Recent Updates</h3>
            <button 
              onClick={onViewUpdates}
              className="text-[10px] font-bold text-outline uppercase tracking-widest hover:text-white transition-colors"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {MOCK_UPDATES.map((update) => (
              <div 
                key={update.id} 
                onClick={onViewUpdates}
                className="flex items-center gap-4 p-4 rounded-xl hover:bg-surface-container-high transition-all group cursor-pointer border border-transparent hover:border-outline-variant/10"
              >
                <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center text-brand-green">
                  {update.type === 'REPORT' ? <FileText size={18} /> : <Calendar size={18} />}
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-bold text-sm">{update.title}</h4>
                  <p className="text-outline text-xs mt-0.5">{update.description}</p>
                </div>
                <span className="text-[9px] text-outline font-bold uppercase tracking-widest">{update.timestamp}</span>
                <ChevronRight size={16} className="text-outline group-hover:text-brand-green transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAB */}
      <div className="fixed bottom-24 right-6 md:bottom-12 md:right-12 z-40">
        <button 
          onClick={onContactTeacher}
          className="w-14 h-14 rounded-full bg-brand-green text-surface shadow-2xl flex items-center justify-center group hover:scale-105 active:scale-90 transition-all"
        >
          <MessageSquare size={24} />
          <div className="absolute right-full mr-4 bg-surface-container-high text-white px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-bold text-[10px] uppercase tracking-widest border border-outline-variant/10">
            Contact Teacher
          </div>
        </button>
      </div>
    </div>
  );
}
