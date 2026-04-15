import React from 'react';
import { UserPlus, Search, User, Trash2, Edit2, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../firebase';
import { collection, onSnapshot, query, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { auth } from '../firebase';
import { fetchSignInMethodsForEmail } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { VALID_CLASSES } from '../constants';

interface UserManagementScreenProps {
  onAddUser: () => void;
  onBack: () => void;
}

export default function UserManagementScreen({ onAddUser, onBack }: UserManagementScreenProps) {
  const [filter, setFilter] = React.useState('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedClass, setSelectedClass] = React.useState('ALL');
  const [selectedSection, setSelectedSection] = React.useState('ALL');
  const [users, setUsers] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [editingUser, setEditingUser] = React.useState<any | null>(null);
  const [editForm, setEditForm] = React.useState<{ fullName: string; role: string; class: string; section: string; assignedClasses: string[] }>({ fullName: '', role: '', class: '', section: '', assignedClasses: [] });
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [errorDetails, setErrorDetails] = React.useState<string | null>(null);

  // Real-time listener — purely synchronous, no async inside, no UI shaking
  React.useEffect(() => {
    const path = 'users';
    const q = query(collection(db, path));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('[DEBUG] Fetched users:', usersData);
      setUsers(usersData); // replace state, do NOT append
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // One-shot ghost-user cleanup on mount — completely decoupled from the real-time listener
  React.useEffect(() => {
    const cleanupGhosts = async () => {
      try {
        const { getDocs, collection: fsCol } = await import('firebase/firestore');
        const snapshot = await getDocs(fsCol(db, 'users'));
        const ghostIds: string[] = [];

        for (const d of snapshot.docs) {
          const email = d.data().email;
          if (!email) { ghostIds.push(d.id); continue; }
          try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            if (methods.length === 0) ghostIds.push(d.id);
          } catch {
            // Keep user on any auth API error — safe default
          }
        }

        if (ghostIds.length > 0) {
          console.log('[DEBUG] Ghost users (deleted from Auth), cleaning up:', ghostIds);
          for (const gid of ghostIds) {
            await deleteDoc(doc(db, 'users', gid)).catch(() => {});
          }
        }
      } catch (err) {
        console.error('[DEBUG] Ghost cleanup error:', err);
      }
    };
    cleanupGhosts();
  }, []);

  const filteredUsers = users.filter(u => {
    const matchesRole = filter === 'ALL' || (u.role || '').toUpperCase() === filter;
    const matchesClass = selectedClass === 'ALL' || u.class === selectedClass;
    const matchesSection = selectedSection === 'ALL' || u.section === selectedSection;
    
    const nameToMatch = u.fullName || u.name || '';
    const matchesSearch =
      nameToMatch.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.class || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesRole && matchesClass && matchesSection && matchesSearch;
  });

  const handleEditClick = (user: any) => {
    setEditingUser(user);
    const existingAssignments = user.assignedClasses ? user.assignedClasses.map((ac: any) => typeof ac === 'string' ? ac : ac.class).filter(Boolean) : (user.classes || []);
    setEditForm({
      fullName: user.fullName || user.name || '',
      role: user.role || 'STUDENT',
      class: user.class || VALID_CLASSES[0],
      section: user.section || 'A',
      assignedClasses: existingAssignments,
    });
    setErrorDetails(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsUpdating(true);
    setErrorDetails(null);
    try {
      const isTeacher = editForm.role.toLowerCase() === 'teacher';
      if (isTeacher && editForm.assignedClasses.length > 10) {
        return setErrorDetails('Cannot assign more than 10 classes to a teacher.');
      }

      const updatePayload: any = {
        fullName: editForm.fullName,
        role: editForm.role.toLowerCase(),
      };

      if (isTeacher) {
        // Build structured assignments or string array depending on app standard
        updatePayload.assignedClasses = editForm.assignedClasses.map(c => ({ class: c }));
        updatePayload.class = editForm.assignedClasses[0] || VALID_CLASSES[0];
      } else {
        if (!VALID_CLASSES.includes(editForm.class)) {
          return setErrorDetails('Invalid class selected.');
        }
        updatePayload.class = editForm.class;
        updatePayload.section = editForm.section;
      }

      await updateDoc(doc(db, 'users', editingUser.id), updatePayload);
      // 'students' collection removed — no parallel sync needed
      console.log(`[FIRESTORE] User updated successfully: ${editingUser.id}`);
      setEditingUser(null);
    } catch (err: any) {
      console.error('[FIRESTORE ERROR] Update failed:', err);
      setErrorDetails(err.message || 'Failed to update user.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete the profile for ${name}?`)) {
      try {
        console.log(`[FIRESTORE] Deleting user document for ${id}`);
        await deleteDoc(doc(db, 'users', id));
        console.info(`[AUTH NOTICE] Due to client-side restrictions, the user's Firebase Auth identity must be securely removed via the Firebase Console or an Admin SDK.`);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
      }
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

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div className="space-y-2">
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-headline text-4xl md:text-5xl font-bold tracking-tight text-white"
            >
              User <span className="text-brand-green">Registry.</span>
            </motion.h2>
            <p className="text-outline text-sm font-medium tracking-wide">Manage system access and institutional identities.</p>
          </div>
          <button
            onClick={onAddUser}
            className="px-8 py-4 bg-brand-green text-surface rounded-full font-bold text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
          >
            <UserPlus size={18} />
            Add New User
          </button>
        </div>
      </section>

      {/* Filters & Search */}
      <section className="flex flex-col md:flex-row gap-6 justify-between items-center bg-surface-container-low p-6 rounded-2xl border border-outline-variant/5">
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {['ALL', 'ADMIN', 'TEACHER', 'STUDENT', 'PARENT'].map((r) => (
              <button
                key={r}
                onClick={() => setFilter(r)}
                className={`px-5 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${filter === r ? 'bg-brand-green text-surface' : 'bg-surface-container-high text-outline border border-outline-variant/5 hover:border-brand-green/30'}`}
              >
                {r}
              </button>
            ))}
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-surface-container-high border border-outline-variant/10 rounded-full px-4 py-2 text-[9px] font-bold text-white uppercase tracking-widest outline-none focus:border-brand-green/40 transition-all"
            >
              <option value="ALL">All Classes</option>
              {VALID_CLASSES.map(cls => (
                <option key={cls} value={cls}>Class {cls}</option>
              ))}
            </select>

            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="bg-surface-container-high border border-outline-variant/10 rounded-full px-4 py-2 text-[9px] font-bold text-white uppercase tracking-widest outline-none focus:border-brand-green/40 transition-all"
            >
              <option value="ALL">All Sections</option>
              {['A', 'B', 'C', 'D', 'E'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search registry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-high border border-outline-variant/10 rounded-full px-12 py-3 text-sm text-white focus:border-brand-green/40 transition-all outline-none"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={16} />
        </div>
      </section>

      {/* User Table */}
      <section className="bg-surface-container-low rounded-2xl border border-outline-variant/5 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-10 h-10 border-2 border-brand-green/20 border-t-brand-green rounded-full animate-spin" />
              <p className="text-outline text-[10px] font-bold uppercase tracking-widest">Accessing Registry...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high/30">
                  <th className="px-6 py-4 text-[9px] font-bold text-outline uppercase tracking-widest">Identity</th>
                  <th className="px-6 py-4 text-[9px] font-bold text-outline uppercase tracking-widest">Role</th>
                  <th className="px-6 py-4 text-[9px] font-bold text-outline uppercase tracking-widest">Placement</th>
                  <th className="px-6 py-4 text-[9px] font-bold text-outline uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-container-high/20 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-outline group-hover:text-brand-green transition-colors">
                          <User size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-brand-green transition-colors">
                            {user.fullName || user.name || '—'}
                          </p>
                          <p className="text-[10px] text-outline font-medium">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-outline">{user.role}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-outline">
                          {user.class || 'General'} - {user.section || 'A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(user)}
                          className="p-2 hover:bg-surface-container-high rounded-lg text-outline hover:text-white transition-all"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id, user.fullName || user.name || user.email)}
                          className="p-2 hover:bg-error/10 rounded-lg text-outline hover:text-error transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-outline text-xs italic">No users found in the registry.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-low border border-outline-variant/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-outline-variant/5">
              <h3 className="font-headline font-bold text-xl text-white">Edit User Profile</h3>
              <p className="text-xs text-outline mt-1">{editingUser.email}</p>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-6">
              {errorDetails && (
                <div className="bg-error/10 border border-error/20 rounded-xl p-4 flex items-center gap-3 text-error text-xs">
                  {errorDetails}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Full Name</label>
                <input
                  required
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-green/40 transition-all outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-green/40 transition-all outline-none appearance-none"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="TEACHER">TEACHER</option>
                  <option value="STUDENT">STUDENT</option>
                  <option value="PARENT">PARENT</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {editForm.role.toLowerCase() === 'teacher' ? (
                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Assigned Classes (Max 10)</label>
                    <div className="bg-surface-container-high border border-outline-variant/10 rounded-xl p-4 gap-2 grid grid-cols-3 md:grid-cols-4 max-h-48 overflow-y-auto">
                      {VALID_CLASSES.map(cls => {
                        const isChecked = editForm.assignedClasses.includes(cls);
                        return (
                          <label key={cls} className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  if (editForm.assignedClasses.length >= 10) return;
                                  setEditForm(prev => ({ ...prev, assignedClasses: [...prev.assignedClasses, cls] }));
                                } else {
                                  setEditForm(prev => ({ ...prev, assignedClasses: prev.assignedClasses.filter(c => c !== cls) }));
                                }
                              }}
                              className="accent-brand-green"
                            />
                            <span className="text-xs text-white">Class {cls}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Class (Nursery–8)</label>
                      <select
                        value={editForm.class}
                        onChange={(e) => setEditForm(prev => ({ ...prev, class: e.target.value }))}
                        className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-green/40 transition-all outline-none appearance-none"
                      >
                        {VALID_CLASSES.map(cls => (
                          <option key={cls} value={cls}>Class {cls}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Section</label>
                      <input
                        type="text"
                        value={editForm.section}
                        onChange={(e) => setEditForm(prev => ({ ...prev, section: e.target.value }))}
                        className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-green/40 transition-all outline-none"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={isUpdating}
                  className="flex-1 py-3 bg-surface-container-high text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-outline-variant/20 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 py-3 bg-brand-green text-surface rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
