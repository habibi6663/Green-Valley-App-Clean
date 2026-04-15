import React from 'react';
import { ArrowLeft, UploadCloud, FileText, Download, Microscope, Sigma, ScrollText, Send, Trash2, Calculator, Microscope as MicroscopeIcon, FileCheck, ExternalLink, Printer, Search, ChevronDown, BookOpen, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, storage } from '../firebase';
import { collection, onSnapshot, query, addDoc, doc, updateDoc, deleteDoc, where, Query, DocumentData } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { getTeacherClassList } from '../lib/teacherClassUtils';
import { VALID_CLASSES } from '../constants';

interface Note {
  id: string;
  title: string;
  content: string;
  subject: string;
  class?: string;
  section?: string;
  image: string;
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
  uploadedBy: string;
}

interface AcademicVaultProps {
  role: UserRole;
  user: any;
}

export default function AcademicVault({ role, user }: AcademicVaultProps) {
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [filter, setFilter] = React.useState('All Files');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [newNote, setNewNote] = React.useState({
    title: '',
    content: '',
    subject: 'Science',
    class: '',
    section: ''
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [expandedNoteId, setExpandedNoteId] = React.useState<string | null>(null);
  const teacherClasses = React.useMemo(() => getTeacherClassList(user), [user]);

  React.useEffect(() => {
    console.log('[VAULT DEBUG] Initializing stream');
    console.log('[VAULT DEBUG] Current USER:', user);
    console.log('[VAULT DEBUG] Current ROLE:', role);

    const path = 'notes';
    const snapshotBuckets = new Map<string, Note[]>();

    const applyBuckets = () => {
      const mergedNotes = new Map<string, Note>();

      snapshotBuckets.forEach((bucket) => {
        bucket.forEach((note) => mergedNotes.set(note.id, note));
      });

      const notesData = Array.from(mergedNotes.values()).sort((a, b) =>
        String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
      );

      console.log("[VAULT DEBUG] RAW FETCHED NOTES:", notesData);
      setNotes(notesData);
      setIsLoading(false);
    };

    const handleSnapshotError = (error: unknown) => {
      console.error("[VAULT DEBUG] Fetch Error:", error);
      handleFirestoreError(error, OperationType.GET, path);
    };

    const createBucketListener = (key: string, notesQuery: Query<DocumentData>) => onSnapshot(
      notesQuery,
      (snapshot) => {
        snapshotBuckets.set(key, snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Note[]);
        applyBuckets();
      },
      handleSnapshotError
    );

    if (role === 'TEACHER') {
      if (teacherClasses.length === 0) {
        setNotes([]);
        setIsLoading(false);
        return () => undefined;
      }

      const unsubscribeAssigned = createBucketListener(
        'assigned',
        query(collection(db, path), where('class', 'in', teacherClasses))
      );
      const unsubscribeGeneral = createBucketListener(
        'general',
        query(collection(db, path), where('class', '==', 'General'))
      );

      return () => {
        unsubscribeAssigned();
        unsubscribeGeneral();
      };
    }

    const unsubscribe = createBucketListener('all', query(collection(db, path)));
    return () => unsubscribe();
  }, [role, user, teacherClasses]);

  console.log("[VAULT DEBUG] RENDER STATE - TOTAL NOTES:", notes.length);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-2 border-brand-green/20 border-t-brand-green rounded-full animate-spin" />
        <p className="text-outline text-[10px] font-bold uppercase tracking-widest">Initializing User Profile...</p>
      </div>
    );
  }

  // ROBUST ROLE-BASED FILTERING
  const filteredData = notes.filter(note => {
    // ADMIN sees everything
    if (role === 'ADMIN') return true;

    if (role === 'TEACHER') {
      const noteClass = String(note.class || '').trim();
      return noteClass === 'General' || teacherClasses.includes(noteClass);
    }

    // STUDENT & PARENT check
    const noteClass = String(note.class || '').trim();
    const noteSection = String(note.section || '').trim().toUpperCase();
    const userClass = String(user?.class || '').trim();
    const userSection = String(user?.section || '').trim().toUpperCase();

    // Show if matches or if it's a general resource
    const isMatch = noteClass === userClass && noteSection === userSection;
    const isGeneral = noteClass === 'General' || !note.class;

    return isMatch || isGeneral;
  });

  // Apply Subject Filter on top of Role Filter
  const subjectFiltered = filter === 'All Files' 
    ? filteredData 
    : filteredData.filter(n => n.subject === filter);

  // TEMPORARY TEST: Fallback to all notes if filtered result is empty to debug invisibility
  const filteredNotes = subjectFiltered;

  console.log("[VAULT DEBUG] FINAL FILTERED NOTES:", filteredNotes.length);

  const iconMap: Record<string, any> = {
    'Science': Microscope,
    'Mathematics': Calculator,
    'English': BookOpen,
    'History': BookOpen,
    'Humanities': BookOpen,
  };


  const isTeacher = role === 'TEACHER';
  const isAdmin = role === 'ADMIN';

  const analytics = React.useMemo(() => {
    if (!isAdmin) return null;
    
    const byClass: Record<string, number> = {};
    const bySubject: Record<string, number> = {};
    
    notes.forEach(note => {
      const cls = note.class || 'General';
      const subj = note.subject || 'Other';
      byClass[cls] = (byClass[cls] || 0) + 1;
      bySubject[subj] = (bySubject[subj] || 0) + 1;
    });
    
    return { byClass, bySubject };
  }, [notes, isAdmin]);

  const handleUpload = async () => {
    console.log("STEP 0 - start");

    if (!selectedFile) {
      console.log("NO FILE");
      alert("Please select a file");
      return;
    }

    if (!VALID_CLASSES.includes(newNote.class)) {
      alert("Invalid class selected");
      return;
    }

    setIsUploading(true);

    try {
      console.log("STEP 1 - before storageRef");

      const safeFileName = `${Date.now()}_${selectedFile.name}`;
      const storageRef = ref(storage, `notes/${safeFileName}`);

      console.log("STEP 2 - before uploadBytes");

      await uploadBytes(storageRef, selectedFile);

      console.log("STEP 3 - after uploadBytes");

      const fileUrl = await getDownloadURL(storageRef);

      console.log("STEP 4 - after getDownloadURL", fileUrl);

      await addDoc(collection(db, "notes"), {
        ...newNote,
        fileUrl,
        fileName: selectedFile.name,
        createdAt: new Date().toISOString(),
        uploadedBy: auth.currentUser?.uid || 'anonymous'
      });

      console.log("STEP 5 - after Firestore save");
    } catch (error) {
      console.error("UPLOAD ERROR:", error);
      alert("Upload failed");
    }

    console.log("STEP 6 - end");

    setIsUploading(false);
  };


  const handleDownload = (title: string) => {
    console.log(`Downloading resource: ${title}`);
  };

  const handleEdit = async (note: Note) => {
    const newTitle = window.prompt('Edit title:', note.title);
    if (!newTitle) return;

    try {
      await updateDoc(doc(db, 'notes', note.id), {
        title: newTitle,
      });
      alert('Note updated successfully');
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update note');
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await deleteDoc(doc(db, 'notes', noteId));
      alert('Note deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete note');
    }
  };

  return (
    <div className="space-y-16 pb-32">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <button 
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-outline hover:text-white transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Back</span>
          </button>
          <div className="space-y-2">
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-headline text-2xl md:text-4xl md:text-5xl font-bold tracking-tight text-white"
            >
              Academic <span className="text-brand-green">Vault.</span>
            </motion.h2>
            <p className="text-outline text-sm font-medium tracking-wide">Central repository for lecture materials and shared knowledge.</p>
          </div>
        </div>

        {isTeacher && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-3 px-8 py-4 bg-brand-green text-surface rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all text-xs font-bold uppercase tracking-widest"
          >
            <UploadCloud size={18} />
            Publish Resources
          </button>
        )}
      </section>

      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isUploading && setIsModalOpen(false)}
              className="fixed inset-0 bg-surface/90 backdrop-blur-md z-[200] cursor-pointer"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-surface-container-low border border-outline-variant/10 rounded-3xl p-4 md:p-8 shadow-2xl z-[201] space-y-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center gap-4 text-brand-green">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-brand-green/10 flex items-center justify-center">
                  <UploadCloud size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Post Academic Material.</h3>
                  <p className="text-outline text-xs font-bold uppercase tracking-widest leading-none">Global Resource Distribution Protocol.</p>
                </div>
              </div>

              <form className="space-y-6" onSubmit={(e) => {
                e.preventDefault();
                handleUpload();
              }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Class</label>
                    <select 
                      className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-green/40 transition-all outline-none appearance-none"
                      value={newNote.class}
                      onChange={e => setNewNote({ ...newNote, class: e.target.value })}
                      required
                    >
                      <option value="" disabled>Select Class</option>
                      {VALID_CLASSES.map(cls => (
                        <option key={cls} value={cls}>Class {cls}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Section</label>
                    <select 
                      className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-green/40 transition-all outline-none appearance-none"
                      value={newNote.section}
                      onChange={e => setNewNote({ ...newNote, section: e.target.value })}
                      required
                    >
                      <option value="">Select Section</option>
                      {['A', 'B', 'C', 'D', 'E'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Subject</label>
                  <select 
                    className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-green/40 transition-all outline-none appearance-none"
                    value={newNote.subject}
                    onChange={e => setNewNote({ ...newNote, subject: e.target.value })}
                  >
                    <option value="Science">Science</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Humanities">Humanities</option>
                    <option value="English">English</option>
                    <option value="History">History</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Title</label>
                  <input 
                    className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-green/40 transition-all outline-none" 
                    placeholder="e.g. Advanced Thermodynamics" 
                    type="text"
                    value={newNote.title}
                    onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Content</label>
                  <textarea 
                    className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-green/40 transition-all outline-none min-h-[120px] resize-none" 
                    placeholder="Document content or link..." 
                    value={newNote.content}
                    onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Attachment (Optional)</label>
                  <div className="relative group">
                    <input 
                      type="file" 
                      id="note-file"
                      className="hidden" 
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    <label 
                      htmlFor="note-file"
                      className="flex items-center justify-between w-full bg-surface-container-high border border-dashed border-outline-variant/20 rounded-xl px-4 py-4 cursor-pointer hover:border-brand-green/40 hover:bg-brand-green/5 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-surface/50 flex items-center justify-center text-outline group-hover:text-brand-green transition-colors">
                          <FileText size={20} />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-white tracking-tight">
                            {selectedFile ? selectedFile.name : 'Choose academic file...'}
                          </p>
                          <p className="text-[9px] text-outline font-bold uppercase tracking-widest mt-0.5">
                            {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : 'PDF, DOCX, IMAGES (MAX 10MB)'}
                          </p>
                        </div>
                      </div>
                      <div className="px-4 py-2 bg-surface rounded-lg text-[9px] font-bold text-outline uppercase tracking-widest border border-outline-variant/10 group-hover:border-brand-green/20 group-hover:text-brand-green transition-all">
                        {selectedFile ? 'Change' : 'Select'}
                      </div>
                    </label>
                    {selectedFile && (
                      <button 
                        type="button"
                        onClick={(e) => { e.preventDefault(); setSelectedFile(null); }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-error text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-all z-10"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isUploading}
                    className="py-4 bg-surface-container-high text-outline rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:text-white transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isUploading}
                    className="py-4 bg-brand-green w-full md:w-auto min-h-[44px] text-surface rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-green/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-surface/20 border-t-surface rounded-full animate-spin" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Publish Note</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Analytics Dashboard (Admin Only) */}
      {isAdmin && analytics && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="bg-surface-container-low rounded-3xl p-4 md:p-8 border border-outline-variant/5">
            <h3 className="text-outline text-[10px] font-bold uppercase tracking-widest mb-6 border-b border-outline-variant/10 pb-4 flex items-center gap-2">
              <Calculator size={14} /> Class-wise Distribution
            </h3>
            <div className="space-y-6">
              {Object.entries(analytics.byClass).map(([cls, count]) => (
                <div key={cls} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold tracking-tight">
                    <span className="text-white">Class {cls}</span>
                    <span className="text-brand-green">{count} Notes</span>
                  </div>
                  <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((count / 20) * 100, 100)}%` }}
                      className="h-full bg-brand-green shadow-[0_0_10px_rgba(0,184,148,0.3)]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-low rounded-3xl p-4 md:p-8 border border-outline-variant/5">
            <h3 className="text-outline text-[10px] font-bold uppercase tracking-widest mb-6 border-b border-outline-variant/10 pb-4 flex items-center gap-2">
              <Microscope size={14} /> Subject Analysis
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(analytics.bySubject).map(([sub, count]) => (
                <div key={sub} className="p-4 bg-surface-container-high rounded-2xl border border-outline-variant/5">
                  <p className="text-[10px] font-bold text-outline uppercase tracking-widest opacity-60 mb-1">{sub}</p>
                  <p className="text-2xl font-bold text-white tracking-tight">{count}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Library Content */}
      <div className="space-y-8">
        <div className="flex flex-wrap gap-2">
          {['All Files', 'Science', 'Mathematics', 'English', 'History'].map((f) => (
            <button 
              key={f} 
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${filter === f ? 'bg-brand-green text-surface' : 'bg-surface-container-low text-outline border border-outline-variant/5 hover:border-brand-green/30'}`}
            >
              {f}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-2 border-brand-green/20 border-t-brand-green rounded-full animate-spin" />
            <p className="text-outline text-[10px] font-bold uppercase tracking-widest">Accessing Vault...</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-surface-container-low rounded-3xl border border-outline-variant/5">
            <p className="text-outline text-sm font-bold tracking-widest uppercase">No resources found.</p>
            <p className="text-[10px] text-brand-green/60 font-medium tracking-wide">The vault is currently empty for your selection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredNotes.map((note) => {
                const Icon = iconMap[note.subject] || FileText;
                const handleNoteClick = () => {
                  console.log("Clicked note:", note);
                  console.log("File URL:", note.fileUrl);

                  if (!note.fileUrl) {
                    alert("No file available");
                    return;
                  }

                  if (!note.fileUrl.startsWith("http")) {
                    alert("Invalid file URL");
                    return;
                  }

                  const link = document.createElement("a");
                  link.href = note.fileUrl;
                  link.target = "_blank";
                  link.rel = "noopener noreferrer";
                  link.click();
                };

                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={note.id} 
                    onClick={handleNoteClick}
                    className="bg-surface-container-low rounded-2xl overflow-hidden border border-outline-variant/5 group hover:border-brand-green/20 transition-all flex flex-col h-full"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={note.image} 
                        alt={note.title} 
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 brightness-75 group-hover:scale-110" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-4 left-4 flex gap-2">
                        <span className="bg-surface/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[9px] font-bold text-brand-green uppercase tracking-widest border border-brand-green/20">
                          {note.subject}
                        </span>
                        {note.class && (
                          <span className="bg-surface/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[9px] font-bold text-white uppercase tracking-widest border border-outline-variant/10">
                            {note.class}-{note.section}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-4 md:p-6 space-y-4 flex-grow flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <h4 className="font-bold text-white text-base group-hover:text-brand-green transition-colors leading-tight">{note.title}</h4>
                          <Icon className="text-outline group-hover:text-brand-green transition-colors flex-shrink-0" size={18} />
                        </div>
                        <p className={`text-xs text-outline leading-relaxed ${expandedNoteId === note.id ? 'whitespace-pre-wrap' : 'line-clamp-3'}`}>
                          {note.content}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-6 border-t border-outline-variant/10 mt-4">
                        <div className="flex flex-col">
                          <span className="text-[8px] text-outline font-bold uppercase tracking-widest">Released</span>
                          <span className="text-[10px] text-white font-bold opacity-80">{new Date(note.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isTeacher && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log("EDIT CLICKED");
                                  handleEdit(note);
                                }}
                                className="flex items-center justify-center p-2.5 rounded-xl transition-all active:scale-95 bg-surface-container-high text-outline hover:text-white"
                                title="Edit Note"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log("DELETE CLICKED");
                                  handleDelete(note.id);
                                }}
                                className="flex items-center justify-center p-2.5 rounded-xl transition-all active:scale-95 bg-surface-container-high text-outline hover:text-white"
                                title="Delete Note"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={(event) => {
                              event.stopPropagation();
                              handleNoteClick();
                            }}
                            className={`flex items-center justify-center p-2.5 rounded-xl transition-all active:scale-95 group/btn ${
                              note.fileUrl 
                                ? 'bg-brand-green/10 text-brand-green hover:bg-brand-green hover:text-surface' 
                                : expandedNoteId === note.id 
                                  ? 'bg-brand-green text-surface' 
                                  : 'bg-surface-container-high text-outline hover:text-white'
                            }`}
                            title={note.fileUrl ? "View Document" : "Read Full Note"}
                          >
                            {note.fileUrl ? <ExternalLink size={14} /> : <FileText size={14} />}
                          </button>

                          {note.fileUrl && note.fileUrl.startsWith('https') && (
                            <a 
                              href={note.fileUrl} 
                              download={note.fileName || 'note-attachment'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-6 py-2.5 bg-brand-green text-surface rounded-full font-bold text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-green/20"
                            >
                              Download
                              <Download size={12} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
