import React from 'react';
import { UserCheck, UploadCloud, ArrowUpRight, GraduationCap, Calendar, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { Student, ScheduleItem } from '../types';
import { MOCK_SCHEDULE } from '../constants';

interface TeacherDashboardProps {
  onTakeAttendance: () => void;
  onUploadNotes: () => void;
  onViewClassLists: () => void;
}

export default function TeacherDashboard({ onTakeAttendance, onUploadNotes, onViewClassLists }: TeacherDashboardProps) {
  const [userName, setUserName] = React.useState('Instructor');
  const [students, setStudents] = React.useState<Student[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Fetch Teacher Profile
    const userUnsubscribe = onSnapshot(doc(db, 'users', uid), (doc) => {
      if (doc.exists()) {
        setUserName(doc.data().name || 'Instructor');
      }
    });

    // Fetch Students from 'users' collection (students collection removed)
    const studentsUnsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const allUsers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log('Users:', allUsers);

        const studentList = allUsers
          .filter(u => u.role?.toLowerCase() === 'student')
          .slice(0, 5)
          .map(u => ({
            id: u.id,
            name: u.fullName || u.name || 'Unknown',
            rollNo: u.id.slice(0, 4).toUpperCase(),
            avatar: `https://picsum.photos/seed/${u.id}/200`,
            class: u.class || 'General',
            section: u.section || 'A'
          })) as Student[];
        
        setStudents(studentList); // replace state
        setIsLoading(false);
      }
    );

    return () => {
      userUnsubscribe();
      studentsUnsubscribe();
    };
  }, []);

  return (
    <div className="space-y-16">
      {/* Welcome Hero */}
      <section className="space-y-2">
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-headline text-4xl md:text-5xl font-bold tracking-tight text-white"
        >
          Welcome, <span className="text-brand-green">{userName}.</span>
        </motion.h2>
        <p className="text-outline text-sm font-medium tracking-wide">
          Manage your classes and track student progress in real-time.
        </p>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div 
          onClick={onTakeAttendance}
          className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/10 hover:border-brand-green/30 transition-all cursor-pointer group flex flex-col justify-between min-h-[200px]"
        >
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-xl bg-brand-green/10 flex items-center justify-center text-brand-green">
              <UserCheck size={24} />
            </div>
            <ArrowUpRight size={20} className="text-outline group-hover:text-brand-green group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Take Attendance</h3>
            <p className="text-outline text-xs">Mark presence for your current class session</p>
          </div>
        </div>

        <div 
          onClick={onUploadNotes}
          className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/10 hover:border-brand-green/30 transition-all cursor-pointer group flex flex-col justify-between min-h-[200px]"
        >
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-xl bg-brand-green/10 flex items-center justify-center text-brand-green">
              <UploadCloud size={24} />
            </div>
            <ArrowUpRight size={20} className="text-outline group-hover:text-brand-green group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Upload Notes</h3>
            <p className="text-outline text-xs">Distribute materials to your assigned classes</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        {/* Today's Schedule */}
        <div className="lg:col-span-1 space-y-8">
          <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
            <h4 className="font-bold text-lg text-white">Schedule</h4>
            <span className="text-[10px] font-bold text-outline uppercase tracking-widest">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="space-y-8">
            {MOCK_SCHEDULE.map((item, idx) => (
              <div key={idx} className="flex gap-6">
                <div className="w-16 shrink-0">
                  <p className="text-[10px] font-bold text-brand-green uppercase tracking-widest">{item.time}</p>
                </div>
                <div className="space-y-1">
                  <h5 className="text-sm font-bold text-white">{item.subject}</h5>
                  <p className="text-xs text-outline">{item.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assigned Students */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
            <h4 className="font-bold text-lg text-white">Assigned Students</h4>
            <button 
              onClick={onViewClassLists}
              className="text-[10px] font-bold text-outline uppercase tracking-widest hover:text-white transition-colors"
            >
              View All
            </button>
          </div>
          <div className="bg-surface-container-low rounded-2xl overflow-hidden border border-outline-variant/5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high/30">
                  <th className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Student</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Placement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {students.map((student) => (
                  <tr 
                    key={student.id} 
                    onClick={() => console.log(`Viewing profile: ${student.name}`)}
                    className="hover:bg-surface-container-high/20 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={student.avatar} 
                          alt={student.name} 
                          className="w-8 h-8 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all" 
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-sm font-bold text-white group-hover:text-brand-green transition-colors">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-outline">
                      {student.class} - {student.section}
                    </td>
                  </tr>
                ))}
                {students.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-outline text-xs italic">No students assigned yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
