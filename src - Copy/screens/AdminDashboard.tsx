import React from 'react';
import { Users as UsersIcon, GraduationCap, Search, Shield, User, Filter, ArrowRight, X, UserPlus, AlertCircle, Check, Loader2, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { UserRole } from '../types';
import { VALID_CLASSES } from '../constants';

interface AdminDashboardProps {
  onManageUsers: () => void;
  onGenerateReports: () => void;
  onViewAttendance: () => void;
  onViewFees: () => void;
  onViewNotes: () => void;
}

export default function AdminDashboard({ 
  onManageUsers, 
  onGenerateReports, 
  onViewAttendance, 
  onViewFees,
  onViewNotes
}: AdminDashboardProps) {
  const [users, setUsers] = React.useState<any[]>([]);
  const [filterRole, setFilterRole] = React.useState<string>('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Modals Local State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<any | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = React.useState<any | null>(null);
  
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  
  const [formData, setFormData] = React.useState({
    fullName: '',
    email: '',
    password: '',
    role: 'STUDENT' as UserRole,
    class: '',
    section: '',
    assignedClasses: [] as string[],
    childId: ''
  });

  React.useEffect(() => {
    console.log('[ADMIN] Initializing real-time User Stream...');
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log("Admin users:", usersData);
      setUsers(usersData);
      setIsLoading(false);
    }, (error) => {
      console.error('[ADMIN] Stream Error:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openRegisterModal = () => {
    setEditingUser(null);
    setFormData({
      fullName: '',
      email: '',
      password: '',
      role: 'STUDENT',
      class: '',
      section: '',
      assignedClasses: [],
      childId: ''
    });
    setError(null);
    setSuccess(false);
    setIsModalOpen(true);
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    
    let assignedArr: string[] = [];
    if (user.assignedClasses && Array.isArray(user.assignedClasses)) {
      assignedArr = user.assignedClasses.map((ac: any) => typeof ac === 'string' ? ac : ac.class).filter(Boolean);
    } else if (user.classes && Array.isArray(user.classes)) {
      assignedArr = user.classes.map((c: any) => typeof c === 'string' ? c : c.class).filter(Boolean);
    }

    setFormData({
      fullName: user.fullName || '',
      email: user.email || '',
      password: '', 
      role: (user.role || 'STUDENT') as UserRole,
      class: user.class || '',
      section: user.section || '',
      assignedClasses: assignedArr,
      childId: user.childId || ''
    });
    setError(null);
    setSuccess(false);
    setIsModalOpen(true);
  };


  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      console.log('[AUTH] Registering new personnel:', formData.email);
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCredential.user.uid;
      
      await setDoc(doc(db, "users", uid), {
        uid: uid,
        fullName: formData.fullName,
        email: formData.email,
        role: formData.role,
        class: formData.role === 'STUDENT' ? formData.class || VALID_CLASSES[0] : "",
        section: formData.role === 'STUDENT' ? formData.section || "A" : "",
        assignedClasses: formData.role === 'TEACHER' ? formData.assignedClasses.map(c => ({ class: c })) : [],
        childId: formData.role === 'PARENT' ? formData.childId : "",
        createdAt: new Date().toISOString()
      });

      console.log("User created:", uid);
      setSuccess(true);
      setTimeout(async () => {
        await signOut(auth);
        setIsModalOpen(false);
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const userRef = doc(db, "users", editingUser.id);
      await updateDoc(userRef, {
        fullName: formData.fullName,
        role: formData.role,
        class: formData.role === 'STUDENT' ? formData.class : "",
        section: formData.role === 'STUDENT' ? formData.section : "",
        assignedClasses: formData.role === 'TEACHER' ? formData.assignedClasses.map(c => ({ class: c })) : [],
        childId: formData.role === 'PARENT' ? formData.childId : ""
      });

      console.log("User updated:", editingUser.id);
      setSuccess(true);
      setTimeout(() => setIsModalOpen(false), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteUser) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await deleteDoc(doc(db, "users", confirmDeleteUser.id));
      console.log("User deleted:", confirmDeleteUser.id);
      setConfirmDeleteUser(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalUsers = users.length;
  const totalStudents = users.filter(u => (u.role || '').toUpperCase() === 'STUDENT').length;

  const filteredUsers = users.filter(user => {
    const matchesRole = filterRole === 'ALL' || (user.role || '').toUpperCase() === filterRole;
    const matchesSearch = (user.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (user.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-12 pb-24 relative">
      <AnimatePresence>
        {/* Main Modal (Register/Edit) */}
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setIsModalOpen(false)}
              className="fixed inset-0 bg-surface/80 backdrop-blur-sm z-[100] cursor-pointer"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-surface-container-low border border-outline-variant/10 rounded-3xl p-8 shadow-2xl z-[101] overflow-hidden"
            >
              {success ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 rounded-full bg-brand-green/20 flex items-center justify-center text-brand-green"
                  >
                    <Check size={40} />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">{editingUser ? 'Profile Updated.' : 'Identity Provisioned.'}</h3>
                  <p className="text-outline text-sm">Synchronizing with institutional records...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold text-white tracking-tight">{editingUser ? 'Update Profile.' : 'Register Personnel.'}</h2>
                      <p className="text-outline text-xs font-bold uppercase tracking-widest leading-none">
                        {editingUser ? `Editing ${editingUser.email}` : 'Provision account privileges.'}
                      </p>
                    </div>
                    <button 
                      onClick={() => setIsModalOpen(false)}
                      disabled={isSubmitting}
                      className="text-outline hover:text-white transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {error && (
                    <div className="flex items-center gap-3 p-4 bg-error/10 border border-error/20 rounded-2xl text-error text-xs">
                      <AlertCircle size={16} />
                      <span className="font-bold">{error}</span>
                    </div>
                  )}

                  <form onSubmit={editingUser ? handleUpdate : handleRegister} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Full Name</label>
                        <input 
                          required
                          type="text"
                          value={formData.fullName}
                          onChange={e => setFormData({...formData, fullName: e.target.value})}
                          placeholder="Julian Vance"
                          className="w-full bg-surface-container-high border border-outline-variant/5 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-green/30 transition-all font-body"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Email Address</label>
                        <input 
                          required
                          type="email"
                          disabled={!!editingUser}
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          className="w-full bg-surface-container-high border border-outline-variant/5 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-green/30 transition-all font-body disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {!editingUser && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Permanent Password</label>
                        <input 
                          required
                          type="password"
                          value={formData.password}
                          onChange={e => setFormData({...formData, password: e.target.value})}
                          placeholder="••••••••"
                          className="w-full bg-surface-container-high border border-outline-variant/5 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-green/30 transition-all font-body"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Governance Role</label>
                      <select 
                        value={formData.role}
                        onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                        className="w-full bg-surface-container-high border border-outline-variant/5 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-green/30 transition-all font-bold appearance-none cursor-pointer"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="TEACHER">TEACHER</option>
                        <option value="STUDENT">STUDENT</option>
                        <option value="PARENT">PARENT</option>
                      </select>
                    </div>

                    <AnimatePresence mode="wait">
                      {formData.role === 'STUDENT' && (
                        <motion.div 
                          key="student-fields"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2"
                        >
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Class (Nursery–8)</label>
                            <select 
                              required
                              value={formData.class}
                              onChange={e => setFormData({...formData, class: e.target.value})}
                              className="w-full bg-surface-container-high border border-outline-variant/5 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-green/30 transition-all font-body appearance-none"
                            >
                              <option value="" disabled>Select Class</option>
                              {VALID_CLASSES.map(cls => (
                                <option key={cls} value={cls}>Class {cls}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Section</label>
                            <input 
                              required
                              type="text"
                              value={formData.section}
                              onChange={e => setFormData({...formData, section: e.target.value})}
                              placeholder="e.g. A"
                              className="w-full bg-surface-container-high border border-outline-variant/5 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-green/30 transition-all font-body"
                            />
                          </div>
                        </motion.div>
                      )}

                      {formData.role === 'TEACHER' && (
                        <motion.div 
                          key="teacher-fields"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2 pb-2"
                        >
                          <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Assigned Classes (Max 10)</label>
                          <div className="bg-surface-container-high border border-outline-variant/10 rounded-xl p-4 gap-2 grid grid-cols-3 md:grid-cols-4 max-h-48 overflow-y-auto">
                            {VALID_CLASSES.map(cls => {
                              const isChecked = formData.assignedClasses.includes(cls);
                              return (
                                <label key={cls} className="flex items-center gap-2 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        if (formData.assignedClasses.length >= 10) return;
                                        setFormData(prev => ({ ...prev, assignedClasses: [...prev.assignedClasses, cls] }));
                                      } else {
                                        setFormData(prev => ({ ...prev, assignedClasses: prev.assignedClasses.filter(c => c !== cls) }));
                                      }
                                    }}
                                    className="accent-brand-green"
                                  />
                                  <span className="text-xs text-white">Class {cls}</span>
                                </label>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}

                      {formData.role === 'PARENT' && (
                        <motion.div 
                          key="parent-fields"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2 pb-2"
                        >
                          <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Child ID (Student UID)</label>
                          <input 
                            required
                            type="text"
                            value={formData.childId}
                            onChange={e => setFormData({...formData, childId: e.target.value})}
                            placeholder="Paste the unique ID of the child"
                            className="w-full bg-surface-container-high border border-outline-variant/5 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-green/30 transition-all font-body"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 bg-brand-green text-surface rounded-2xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-green/10 flex items-center justify-center gap-3 disabled:opacity-70 disabled:grayscale"
                    >
                      {isSubmitting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <span>{editingUser ? 'Update Personnel' : 'Authorize Personnel'}</span>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          </>
        )}

        {/* Delete Confirmation Modal */}
        {confirmDeleteUser && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-surface/90 backdrop-blur-md z-[200]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-surface-container-low border border-outline-variant/10 rounded-3xl p-8 shadow-2xl z-[201] text-center space-y-6"
            >
              <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white tracking-tight">Revoke Account?</h3>
                <p className="text-outline text-sm leading-relaxed">
                  Are you sure you want to delete <span className="text-white font-bold">{confirmDeleteUser.fullName}</span>? This action is irreversible.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <button 
                  onClick={() => setConfirmDeleteUser(null)}
                  disabled={isSubmitting}
                  className="py-3 bg-surface-container-high text-outline rounded-xl font-bold text-[10px] uppercase tracking-widest hover:text-white transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="py-3 bg-error text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-error/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <span>Confirm Delete</span>}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-headline text-4xl md:text-5xl font-bold tracking-tight text-white"
            >
              Admin<br/>
              <span className="text-brand-green">Dashboard.</span>
            </motion.h1>
            <p className="text-outline text-sm font-bold uppercase tracking-widest">
              Institutional Governance & Metrics.
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/5 min-w-[200px]">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Total Personnel</span>
                <UsersIcon size={14} className="text-brand-green" />
              </div>
              <span className="text-3xl font-bold text-white">{totalUsers}</span>
            </div>

            <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/5 min-w-[160px]">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Students</span>
                <GraduationCap size={14} className="text-brand-green" />
              </div>
              <span className="text-3xl font-bold text-white">{totalStudents}</span>
            </div>

            <div 
              onClick={onViewNotes}
              className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/5 min-w-[160px] hover:border-brand-green/30 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Notes</span>
                <Search size={14} className="text-brand-green group-hover:scale-125 transition-transform" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-white tracking-tighter">Vault.</span>
                <ArrowRight size={18} className="text-outline group-hover:text-brand-green group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Controls: Search & Filter */}
      <section className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between border-b border-outline-variant/10 pb-8">
        <div className="relative w-full md:max-w-md group">
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-brand-green transition-colors" />
          <input 
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant/5 rounded-full py-4 pl-14 pr-6 text-white text-sm outline-none focus:border-brand-green/30 transition-all font-body"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {['ALL', 'ADMIN', 'TEACHER', 'STUDENT', 'PARENT'].map((role) => (
            <button 
              key={role}
              onClick={() => setFilterRole(role)}
              className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                filterRole === role 
                  ? 'bg-brand-green text-surface' 
                  : 'bg-surface-container-high text-outline hover:text-white hover:border-brand-green/30 border border-outline-variant/5'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </section>

      {/* User Table/Directory */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-2 border-brand-green/20 border-t-brand-green rounded-full animate-spin" />
          <p className="text-outline text-[10px] font-bold uppercase tracking-widest">Synchronizing Database...</p>
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredUsers.map((user) => (
              <motion.div
                layout
                key={user.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5 hover:border-brand-green/20 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                      alt={user.fullName} 
                      className="w-10 h-10 rounded-xl bg-surface-container-high object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white text-sm truncate">{user.fullName || 'No Name'}</h4>
                    <p className="text-outline text-[10px] font-bold uppercase tracking-widest truncate">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-3 pr-2 border-r border-outline-variant/10 mr-1">
                    <button 
                      onClick={() => openEditModal(user)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container-high text-outline hover:text-brand-green hover:bg-brand-green/10 transition-all"
                    >
                      <Pencil size={14} />
                    </button>
                    {(user.role || '').toUpperCase() !== 'ADMIN' && (
                      <button 
                        onClick={() => setConfirmDeleteUser(user)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container-high text-outline hover:text-error hover:bg-error/10 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border transition-all ${
                    (user.role || '').toUpperCase() === 'ADMIN' ? 'bg-error/5 text-error border-error/10' :
                    (user.role || '').toUpperCase() === 'TEACHER' ? 'bg-brand-green/5 text-brand-green border-brand-green/10' :
                    (user.role || '').toUpperCase() === 'STUDENT' ? 'bg-primary/5 text-primary border-primary/10' :
                    'bg-outline/5 text-outline border-outline-variant/10'
                  }`}>
                    {user.role || 'GHOST'}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredUsers.length === 0 && (
            <div className="col-span-full py-20 bg-surface-container-low/50 rounded-2xl border border-dashed border-outline-variant/10 text-center">
              <p className="text-outline text-xs font-bold uppercase tracking-widest">No users found in directory.</p>
            </div>
          )}
        </section>
      )}

      {/* Floating Action Button for Adding Users */}
      <div className="fixed bottom-24 right-8 z-[50]">
        <button 
          onClick={openRegisterModal}
          className="flex items-center gap-3 px-8 py-4 bg-brand-green text-surface rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all"
        >
          <UserPlus size={18} />
          <span className="font-bold text-xs uppercase tracking-widest">Register Personnel</span>
        </button>
      </div>
    </div>
  );
}
