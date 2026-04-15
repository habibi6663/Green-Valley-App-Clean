import React from 'react';
import { Check, X, Send, Search, Bell, ArrowLeft, History, MessageSquare, AlertCircle, Loader2, Shield } from 'lucide-react';
import { UserRole, Student } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { getTeacherAssignments, getTeacherClassList } from '../lib/teacherClassUtils';
import { VALID_CLASSES } from '../constants';

interface AttendanceScreenProps {
  onBack: () => void;
  user: any;
}

export default function AttendanceScreen({ onBack, user }: AttendanceScreenProps) {
  const [allStudents, setAllStudents] = React.useState<any[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = React.useState('10');
  const [selectedSection, setSelectedSection] = React.useState('A');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [adminReports, setAdminReports] = React.useState<any[]>([]);

  // Override States
  const [pendingOverride, setPendingOverride] = React.useState<any | null>(null);
  const [overrideReason, setOverrideReason] = React.useState('');

  const role = (user?.role || '').toUpperCase() as UserRole;
  const isElevated = role === 'ADMIN' || role === 'TEACHER';
  const teacherAssignments = React.useMemo(() => getTeacherAssignments(user), [user]);
  const teacherClasses = React.useMemo(() => getTeacherClassList(user), [user]);

  // Initialize selected class for teachers
  React.useEffect(() => {
    if (role === 'TEACHER' && teacherAssignments.length > 0) {
      setSelectedClass(teacherAssignments[0].class);
      setSelectedSection(teacherAssignments[0].section || 'ALL');
    }
  }, [role, teacherAssignments]);

  React.useEffect(() => {
    console.log('[ATTENDANCE] Fetching records for role:', role);
    let q;
    
    // BACKEND FILTERING (UI-LEVEL FOR NOW, but using specific queries)
    if (role === 'STUDENT') {
      q = query(collection(db, 'users'), where('uid', '==', user.id));
    } else if (role === 'PARENT' && user.childId) {
      q = query(collection(db, 'users'), where('uid', '==', user.childId));
    } else if (role === 'TEACHER' && teacherClasses.length > 0) {
      q = query(
        collection(db, 'users'),
        where('role', '==', 'STUDENT'),
        where('class', 'in', teacherClasses)
      );
    } else if (role === 'TEACHER') {
      q = query(collection(db, 'users'), where('role', '==', '__NO_ASSIGNED_CLASSES__'));
    } else {
      q = query(collection(db, 'users'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const studentsData = usersData.filter(u => u.role?.toLowerCase() === 'student');

      const studentList = studentsData.map(u => ({
        id: u.id,
        name: u.fullName || u.name || 'Unknown Student',
        class: (u.class || 'General').toString(),
        section: (u.section || 'A').toString(),
        rollNo: u.id.slice(0, 4).toUpperCase(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email || u.id}`,
        status: 'PENDING'
      }));

      // SYNC WITH ATTENDANCE RECORDS FOR TODAY
      const today = new Date().toISOString().split('T')[0];
      const attQuery =
        role === 'TEACHER' && teacherClasses.length > 0
          ? query(
              collection(db, 'attendance'),
              where('date', '==', today),
              where('class', 'in', teacherClasses)
            )
          : query(collection(db, 'attendance'), where('date', '==', today));
      
      onSnapshot(attQuery, (attSnapshot) => {
        const attDocs = attSnapshot.docs.reduce((acc: any, doc) => {
          const data = doc.data();
          if (data.students && Array.isArray(data.students)) {
            data.students.forEach((s: any) => {
              acc[s.studentId] = {
                status: s.status,
                lastModifiedBy: s.lastModifiedBy,
                modificationReason: s.modificationReason
              };
            });
          } else if (data.studentId) {
            acc[data.studentId] = { 
              status: data.status,
              lastModifiedBy: data.lastModifiedBy,
              modificationReason: data.modificationReason 
            };
          }
          return acc;
        }, {});

        const syncedList = studentList.map(s => {
          const record = attDocs[s.id] || { status: 'PENDING' };
          return {
            ...s,
            status: record.status,
            lastModifiedBy: record.lastModifiedBy,
            modificationReason: record.modificationReason
          };
        });

        setAllStudents(syncedList);
      });

      // For Student/Parent, they only ever see their own class, so force it
      if (studentList.length > 0 && (role === 'STUDENT' || role === 'PARENT')) {
        setSelectedClass(studentList[0].class);
        setSelectedSection(studentList[0].section);
      }

      setIsLoading(false);
    }, (error) => {
      console.error('[ATTENDANCE] Error fetching students:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, role, teacherClasses]);

  React.useEffect(() => {
    const filtered = allStudents.filter(s => {
      if (role === 'TEACHER' && selectedSection === 'ALL') {
        return s.class === selectedClass;
      }
      return s.class === selectedClass && s.section === selectedSection;
    });
    setStudents(filtered);
  }, [allStudents, selectedClass, selectedSection, role]);

  // Admin Historical Reports Stream
  React.useEffect(() => {
    if (role !== 'ADMIN') return;

    const q = query(
      collection(db, 'attendance'),
      where('class', '==', selectedClass),
      where('section', '==', selectedSection)
    );

    const unsub = onSnapshot(q, (snap) => {
      const reports = snap.docs.map(d => {
        const data = d.data();
        const total = data.students?.length || 0;
        const present = data.students?.filter((s: any) => s.status === 'PRESENT').length || 0;
        return {
          id: d.id,
          date: data.date,
          total,
          present,
          absent: total - present
        };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setAdminReports(reports);
    });

    return () => unsub();
  }, [role, selectedClass, selectedSection]);

  const toggleStatus = (id: string, status: 'PRESENT' | 'ABSENT', student: any) => {
    if (!isElevated) return;
    
    // TEACHER RESTRICTION: Block modification if already marked
    if (role === 'TEACHER' && student.status !== 'PENDING') {
      console.warn('[SECURITY] Teacher modification blocked for existing record.');
      return;
    }

    // ADMIN OVERRIDE: Trigger modal for existing records
    if (role === 'ADMIN' && student.status !== 'PENDING' && student.status !== status) {
      setPendingOverride({ student, targetStatus: status });
      setOverrideReason('');
      return;
    }

    // Normal behavior (first marking for today)
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleExecuteOverride = async () => {
    if (!pendingOverride || !overrideReason.trim()) return;
    setIsSubmitting(true);
    const today = new Date().toISOString().split('T')[0];
    
    try {
      console.log('[OVERRIDE] Executing Admin correction for:', pendingOverride.student.name);

      const q = query(
        collection(db, 'attendance'),
        where('class', '==', selectedClass),
        where('section', '==', selectedSection),
        where('date', '==', today)
      );
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const targetDoc = snap.docs[0];
        const docData = targetDoc.data();
        let updatedStudents = docData.students || [];
        
        let found = false;
        updatedStudents = updatedStudents.map((s: any) => {
          if (s.studentId === pendingOverride.student.id) {
            found = true;
            return {
              ...s,
              status: pendingOverride.targetStatus,
              lastModifiedBy: user.id,
              lastModifiedRole: 'ADMIN',
              lastModifiedAt: new Date().toISOString(),
              modificationReason: overrideReason
            };
          }
          return s;
        });

        // Add the student dynamically if they weren't in the array
        if (!found) {
          updatedStudents.push({
            studentId: pendingOverride.student.id,
            name: pendingOverride.student.name,
            status: pendingOverride.targetStatus,
            lastModifiedBy: user.id,
            lastModifiedRole: 'ADMIN',
            lastModifiedAt: new Date().toISOString(),
            modificationReason: overrideReason
          });
        }

        await updateDoc(doc(db, 'attendance', targetDoc.id), {
          students: updatedStudents
        });
      } else {
        // Fallback for legacy architecture fallback override
        const fallbackId = `${pendingOverride.student.id}_${today}`;
        await setDoc(doc(db, 'attendance', fallbackId), {
           studentId: pendingOverride.student.id,
           name: pendingOverride.student.name,
           class: selectedClass,
           section: selectedSection,
           date: today,
           status: pendingOverride.targetStatus,
           lastModifiedBy: user.id,
           lastModifiedRole: 'ADMIN',
           lastModifiedAt: new Date().toISOString(),
           modificationReason: overrideReason
        }, { merge: true });
      }

      // Create Audit Log
      await addDoc(collection(db, 'attendance_logs'), {
        studentId: pendingOverride.student.id,
        name: pendingOverride.student.name,
        previousStatus: pendingOverride.student.status,
        newStatus: pendingOverride.targetStatus,
        class: selectedClass,
        section: selectedSection,
        date: today,
        changedBy: user.id,
        role: 'ADMIN',
        reason: overrideReason,
        timestamp: new Date().toISOString()
      });

      setPendingOverride(null);
      setOverrideReason('');
    } catch (error) {
      console.error('[OVERRIDE] Operation failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitting = async () => {
    if (!isElevated) return; // Write restriction
    setIsSubmitting(true);
    const path = 'attendance';
    const today = new Date().toISOString().split('T')[0];
    
    if (students.length === 0) {
      alert("No students to submit.");
      setIsSubmitting(false);
      return;
    }

    try {
      const attQuery = query(
        collection(db, "attendance"),
        where("class", "==", selectedClass),
        where("section", "==", selectedSection),
        where("date", "==", today)
      );
      
      const existing = await getDocs(attQuery);
      if (!existing.empty) {
        alert("Attendance already marked today for this class.");
        setIsSubmitting(false);
        return;
      }

      await addDoc(collection(db, path), {
        class: selectedClass,
        section: selectedSection,
        date: today,
        students: students.map(s => ({
          studentId: s.id,
          name: s.name,
          status: s.status !== 'PENDING' ? s.status : 'ABSENT',
        })),
        markedBy: user.id,
        createdAt: serverTimestamp()
      });

      alert("Attendance marked successfully.");
      onBack();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  const presentCount = students.filter(s => s.status === 'PRESENT').length;

  return (
    <div className="space-y-12 pb-32 relative">
      <AnimatePresence>
        {/* Admin Override Modal */}
        {pendingOverride && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setPendingOverride(null)}
              className="fixed inset-0 bg-surface/90 backdrop-blur-md z-[200] cursor-pointer"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-surface-container-low border border-outline-variant/10 rounded-3xl p-8 shadow-2xl z-[201] space-y-8"
            >
              <div className="flex items-center gap-4 text-brand-green">
                <div className="w-12 h-12 rounded-2xl bg-brand-green/10 flex items-center justify-center">
                  <History size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Override Attendance.</h3>
                  <p className="text-outline text-xs font-bold uppercase tracking-widest leading-none">Accountability Override Protocol.</p>
                </div>
              </div>

              <div className="p-4 bg-surface-container-high rounded-2xl border border-outline-variant/5">
                <p className="text-outline text-sm leading-relaxed">
                  Modifying <span className="text-white font-bold">{pendingOverride.student.name}'s</span> status from <span className="text-white font-bold">{pendingOverride.student.status}</span> to <span className="text-brand-green font-bold">{pendingOverride.targetStatus}</span>.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Reason for modification</label>
                  <textarea 
                    value={overrideReason}
                    onChange={e => setOverrideReason(e.target.value)}
                    placeholder="e.g. Student rectified records with documentation..."
                    rows={3}
                    className="w-full bg-surface-container-high border border-outline-variant/5 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-brand-green/30 transition-all font-body resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setPendingOverride(null)}
                    disabled={isSubmitting}
                    className="py-4 bg-surface-container-high text-outline rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:text-white transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={isSubmitting || !overrideReason.trim()}
                    onClick={handleExecuteOverride}
                    className="py-4 bg-brand-green text-surface rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-green/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                  >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <span>Confirm Change</span>}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <section className="space-y-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-outline hover:text-white transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Back to Dashboard</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-headline text-4xl md:text-5xl font-bold tracking-tight text-white"
            >
              {selectedSection === 'ALL' ? `Class ${selectedClass}` : `Class ${selectedClass}-${selectedSection}`}<br/>
              <span className="text-brand-green">Attendance.</span>
            </motion.h2>
            
            {/* Conditional Selectors */}
            {role === 'ADMIN' && (
              <div className="flex gap-4">
                <select 
                  value={selectedClass} 
                  onChange={e => setSelectedClass(e.target.value)}
                  className="bg-surface-container-high border border-outline-variant/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-green/40 transition-all font-bold tracking-wider cursor-pointer"
                >
                  {VALID_CLASSES.map(cls => (
                    <option key={cls} value={cls}>Class {cls}</option>
                  ))}
                </select>
                
                <select 
                  value={selectedSection} 
                  onChange={e => setSelectedSection(e.target.value)}
                  className="bg-surface-container-high border border-outline-variant/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-green/40 transition-all font-bold tracking-wider cursor-pointer"
                >
                  {['A', 'B', 'C', 'D', 'E'].map(section => (
                    <option key={section} value={section}>Section {section}</option>
                  ))}
                </select>
              </div>
            )}

            {role === 'TEACHER' && (
              <div className="flex gap-4">
                <select 
                  value={teacherAssignments.some((ac) => ac.section)
                    ? `${selectedClass}-${selectedSection}`
                    : selectedClass}
                  onChange={e => {
                    const [c, s] = e.target.value.split('-');
                    setSelectedClass(c);
                    setSelectedSection(s || 'ALL');
                  }}
                  className="bg-surface-container-high border border-outline-variant/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-green/40 transition-all font-bold tracking-wider cursor-pointer"
                >
                  {teacherAssignments.map((ac, i: number) => (
                    <option
                      key={`${ac.class}-${ac.section || i}`}
                      value={ac.section ? `${ac.class}-${ac.section}` : ac.class}
                    >
                      {ac.section ? `Class ${ac.class}-${ac.section}` : `Class ${ac.class} - All Sections`}
                    </option>
                  ))}
                  {teacherAssignments.length === 0 && (
                    <option disabled>No assigned classes</option>
                  )}
                </select>
              </div>
            )}

            {(role === 'STUDENT' || role === 'PARENT') && (
              <p className="text-outline text-[10px] font-bold uppercase tracking-widest bg-surface-container-high px-4 py-2 rounded-lg inline-block">
                View Only Mode • Syncing Live
              </p>
            )}
          </div>

          <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/5 min-w-[240px] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 text-[10px] text-outline opacity-50 font-bold tracking-widest">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}</div>
            <div>
              <div className="flex justify-between items-baseline mb-4">
                <span className="text-[10px] font-bold text-outline uppercase tracking-widest leading-relaxed">Present<br/>Count</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold text-white">{presentCount}</span>
                  <span className="text-outline text-xs">/ {students.length}</span>
                </div>
              </div>
              <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-brand-green h-full transition-all duration-500" 
                  style={{ width: `${students.length > 0 ? (presentCount / students.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Admin Dashboard Report - Historical List */}
      {role === 'ADMIN' && (
        <section className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-6 mb-8 mt-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-lg text-white">Historical Reports</h3>
              <p className="text-outline text-xs uppercase tracking-widest font-bold">Class {selectedClass}-{selectedSection} Overview</p>
            </div>
            <div className="px-3 py-1 bg-brand-green/10 text-brand-green rounded-lg text-[10px] font-bold tracking-widest uppercase">
              {adminReports.length} Records found
            </div>
          </div>
          
          <div className="space-y-3">
            {adminReports.length > 0 ? adminReports.map(report => (
              <div key={report.id} className="flex flex-col sm:flex-row justify-between sm:items-center bg-surface-container-high p-4 rounded-xl border border-outline-variant/5">
                <div className="flex items-center gap-4 mb-3 sm:mb-0">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-outline">
                    <History size={16} />
                  </div>
                  <div>
                    <p className="text-xs text-outline font-bold uppercase tracking-widest leading-none">Date</p>
                    <p className="text-sm font-bold text-white mt-1">{report.date}</p>
                  </div>
                </div>
                <div className="flex gap-6 sm:gap-12">
                  <div className="text-center">
                    <p className="text-[10px] text-outline font-bold uppercase tracking-widest">Total</p>
                    <p className="text-sm font-bold text-white">{report.total}</p>
                  </div>
                  <div className="text-center">
                     <p className="text-[10px] text-outline font-bold uppercase tracking-widest">Present</p>
                     <p className="text-sm font-bold text-brand-green">{report.present}</p>
                  </div>
                  <div className="text-center">
                     <p className="text-[10px] text-outline font-bold uppercase tracking-widest">Absent</p>
                     <p className="text-sm font-bold text-error">{report.absent}</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-6 text-outline font-bold text-xs uppercase tracking-widest border border-dashed border-outline-variant/10 rounded-xl">
                 No reports exist for this class.
              </div>
            )}
          </div>
        </section>
      )}

      {/* Controls - Only for Elevated Roles */}
      {isElevated && (
        <section className="flex flex-wrap gap-4 items-center border-b border-outline-variant/10 pb-8">
          <button 
            onClick={() => setStudents(prev => prev.map(s => ({ ...s, status: 'PRESENT' })))}
            className="px-6 py-2.5 bg-brand-green text-surface rounded-full font-bold text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all"
          >
            Mark All Present
          </button>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-surface-container-high text-white rounded-full text-[10px] font-bold uppercase tracking-widest border border-outline-variant/10">
              Alpha
            </button>
            <button className="px-4 py-2 bg-surface-container-low text-outline rounded-full text-[10px] font-bold uppercase tracking-widest border border-outline-variant/10">
              Roll No
            </button>
          </div>
        </section>
      )}

      {/* Student List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-2 border-brand-green/20 border-t-brand-green rounded-full animate-spin" />
          <p className="text-outline text-[10px] font-bold uppercase tracking-widest">Loading Personnel...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-surface-container-low border border-outline-variant/5 rounded-2xl">
          <p className="text-outline text-sm font-bold tracking-widest uppercase">No students found in Class {selectedClass}-{selectedSection}.</p>
          {role === 'TEACHER' && <p className="text-[10px] text-brand-green/60 font-medium">Please check your assigned classes in profile.</p>}
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {students.map((student) => (
            <div 
              key={student.id} 
              className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5 hover:border-brand-green/20 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img 
                    src={student.avatar} 
                    alt={student.name} 
                    className={`w-10 h-10 rounded-xl object-cover transition-all grayscale group-hover:grayscale-0 ${student.status !== 'PENDING' ? 'grayscale-0' : ''}`} 
                    referrerPolicy="no-referrer"
                  />
                  {student.status === 'PRESENT' && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-brand-green rounded-full border-2 border-surface-container-low flex items-center justify-center">
                      <Check size={10} className="text-surface" />
                    </div>
                  )}
                  {student.status === 'ABSENT' && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-error rounded-full border-2 border-surface-container-low flex items-center justify-center">
                      <X size={10} className="text-white" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-sm truncate">{student.name}</h4>
                    {student.lastModifiedBy && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-brand-green/10 text-brand-green rounded-md" title={`Reason: ${student.modificationReason}`}>
                        <Shield size={8} />
                        <span className="text-[7px] font-bold uppercase tracking-widest">Modified</span>
                      </div>
                    )}
                  </div>
                  <p className="text-outline text-[10px] font-bold uppercase tracking-widest">Roll No. {student.rollNo}</p>
                </div>
              </div>
              
              {isElevated && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleStatus(student.id, 'PRESENT', student)}
                    disabled={role === 'TEACHER' && student.status !== 'PENDING'}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 disabled:grayscale ${student.status === 'PRESENT' ? 'bg-brand-green text-surface' : 'bg-surface-container-high text-outline hover:text-white'}`}
                  >
                    <Check size={18} />
                  </button>
                  <button 
                    onClick={() => toggleStatus(student.id, 'ABSENT', student)}
                    disabled={role === 'TEACHER' && student.status !== 'PENDING'}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 disabled:grayscale ${student.status === 'ABSENT' ? 'bg-error text-white' : 'bg-surface-container-high text-outline hover:text-error'}`}
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              {!isElevated && (
                <div className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
                  student.status === 'PRESENT' ? 'bg-brand-green/10 text-brand-green' : 
                  student.status === 'ABSENT' ? 'bg-error/10 text-error' : 
                  'bg-surface-container-high text-outline'
                }`}>
                  {student.status}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Submit FAB - Only for elevated roles */}
      {isElevated && (
        <div className="fixed bottom-24 right-8 z-50">
          <button 
            onClick={handleSubmitting}
            disabled={isSubmitting || students.length === 0 || students.every(s => s.status !== 'PENDING')}
            className="flex items-center gap-3 px-8 py-4 bg-brand-green text-surface rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <span className="font-bold text-xs uppercase tracking-widest group-disabled:hidden">
              {isSubmitting ? 'Submitting...' : 'Submit List'}
            </span>
            <span className="font-bold text-xs uppercase tracking-widest hidden group-disabled:block">
              {students.length === 0 ? 'No Students' : 'Locked'}
            </span>
            <Send size={18} className={isSubmitting ? 'animate-pulse' : 'group-disabled:hidden'} />
            <Check size={18} className="hidden group-disabled:block opacity-50" />
          </button>
        </div>
      )}
    </div>
  );
}
