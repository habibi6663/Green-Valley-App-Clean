import React from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { BookOpen, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { auth, db } from '../firebase';
import { HomeworkItem, UserRole } from '../types';
import { getTeacherClassList } from '../lib/teacherClassUtils';
import { VALID_CLASSES } from '../constants';

interface HomeworkScreenProps {
  role: UserRole;
  user: any;
}

type HomeworkFormState = {
  title: string;
  description: string;
  subject: string;
  className: string;
};

function formatHomeworkDate(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate().toLocaleString();
  }

  if (typeof value === 'string' && value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString();
    }
  }

  return 'Just now';
}

export default function HomeworkScreen({ role, user }: HomeworkScreenProps) {
  const [homework, setHomework] = React.useState<HomeworkItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [form, setForm] = React.useState<HomeworkFormState>({
    title: '',
    description: '',
    subject: '',
    className: '',
  });

  const isTeacher = role === 'TEACHER';
  const canModifyHomework = role === 'TEACHER' || role === 'ADMIN';
  const teacherClasses = React.useMemo(() => getTeacherClassList(user), [user]);

  React.useEffect(() => {
    const homeworkCollection = collection(db, 'homework');
    const unsubscribers: Array<() => void> = [];
    const buckets = new Map<string, HomeworkItem[]>();

    const applyBuckets = () => {
      const merged = new Map<string, HomeworkItem>();

      buckets.forEach((items) => {
        items.forEach((item) => merged.set(item.id, item));
      });

      const nextHomework = Array.from(merged.values()).sort((a, b) =>
        String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
      );

      setHomework(nextHomework);
      setIsLoading(false);
    };

    const handleSnapshotError = (snapshotError: unknown) => {
      console.error('[HOMEWORK] Failed to stream homework:', snapshotError);
      setError('Unable to load homework right now.');
      setIsLoading(false);
    };

    const listenToQuery = (bucketKey: string, sourceQuery: ReturnType<typeof query>) => {
      const unsubscribe = onSnapshot(
        sourceQuery,
        (snapshot) => {
          buckets.set(
            bucketKey,
            snapshot.docs.map((homeworkDoc) => {
              const data = homeworkDoc.data() as Omit<HomeworkItem, 'id'>;
              return {
                id: homeworkDoc.id,
                ...data,
              };
            })
          );
          applyBuckets();
        },
        handleSnapshotError
      );

      unsubscribers.push(unsubscribe);
    };

    if (role === 'ADMIN') {
      listenToQuery('all', query(homeworkCollection, orderBy('createdAt', 'desc')));
    } else if (role === 'TEACHER') {
      if (teacherClasses.length === 0) {
        setHomework([]);
        setIsLoading(false);
        return () => undefined;
      }

      teacherClasses.forEach((className) => {
        listenToQuery(
          `class:${className}`,
          query(homeworkCollection, where('class', '==', className))
        );
      });
    } else if (role === 'STUDENT') {
      const studentClass = typeof user?.class === 'string' ? user.class.trim() : '';
      if (!studentClass) {
        setHomework([]);
        setIsLoading(false);
        return () => undefined;
      }

      listenToQuery(
        `class:${studentClass}`,
        query(homeworkCollection, where('class', '==', studentClass))
      );
    } else {
      setHomework([]);
      setIsLoading(false);
      return () => undefined;
    }

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [role, user, teacherClasses]);

  React.useEffect(() => {
    if (!isTeacher) return;

    if (teacherClasses.length === 1 && !form.className) {
      setForm((prev) => ({
        ...prev,
        className: teacherClasses[0],
      }));
    }
  }, [isTeacher, teacherClasses, form.className]);

  const handleAddHomework = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isTeacher) return;

    const title = form.title.trim();
    const description = form.description.trim();
    const subject = form.subject.trim();
    const className = form.className.trim();

    if (!title || !description || !subject || !className) {
      alert('Fill all fields');
      return;
    }

    if (!VALID_CLASSES.includes(className)) {
      alert('Invalid class selected');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await addDoc(collection(db, 'homework'), {
        title,
        description,
        subject,
        class: className,
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser?.uid || user?.id || 'unknown',
      });

      setForm({
        title: '',
        description: '',
        subject: '',
        className: teacherClasses.length === 1 ? teacherClasses[0] : '',
      });

      alert('Homework added');
    } catch (submitError) {
      console.error('[HOMEWORK] Failed to add homework:', submitError);
      alert('Failed to add homework');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditHomework = async (item: HomeworkItem) => {
    if (!canModifyHomework) return;

    const newTitle = window.prompt('Edit title:', item.title);
    if (!newTitle) return;

    const newDescription = window.prompt('Edit description:', item.description);
    if (!newDescription) return;

    const newSubject = window.prompt('Edit subject:', item.subject);
    if (!newSubject) return;

    const newClassName = window.prompt('Edit class:', item.class);
    if (!newClassName) return;

    if (!VALID_CLASSES.includes(newClassName.trim())) {
      alert('Invalid class selected');
      return;
    }

    try {
      await updateDoc(doc(db, 'homework', item.id), {
        title: newTitle.trim(),
        description: newDescription.trim(),
        subject: newSubject.trim(),
        class: newClassName.trim(),
      });

      alert('Updated');
    } catch (updateError) {
      console.error('[HOMEWORK] Failed to update homework:', updateError);
      alert('Update failed');
    }
  };

  const handleDeleteHomework = async (id: string) => {
    if (!canModifyHomework) return;

    try {
      await deleteDoc(doc(db, 'homework', id));
      alert('Deleted');
    } catch (deleteError) {
      console.error('[HOMEWORK] Failed to delete homework:', deleteError);
      alert('Delete failed');
    }
  };

  const classOptions = isTeacher
    ? teacherClasses
    : Array.from(new Set(homework.map((item) => item.class).filter(Boolean)));

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="font-headline text-2xl md:text-4xl md:text-5xl font-bold tracking-tight text-white">
            Class <span className="text-brand-green">Homework.</span>
          </h1>
          <p className="text-outline text-sm font-medium">
            Real-time homework updates for teachers, students, and administrators.
          </p>
        </div>
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 px-5 py-4 min-w-[220px]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Live Homework</p>
          <p className="text-2xl font-bold text-white mt-2">{homework.length}</p>
        </div>
      </section>

      {isTeacher && (
        <section className="bg-surface-container-low rounded-3xl border border-outline-variant/10 p-4 md:p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center">
              <Plus size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Add Homework</h2>
              <p className="text-outline text-xs uppercase tracking-widest">Teachers only</p>
            </div>
          </div>

          <form onSubmit={handleAddHomework} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                required
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Homework title"
                className="w-full bg-surface-container-high border border-outline-variant/10 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-brand-green/30 transition-all"
              />
              <input
                required
                value={form.subject}
                onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
                placeholder="Subject"
                className="w-full bg-surface-container-high border border-outline-variant/10 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-brand-green/30 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px] gap-4">
              <textarea
                required
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Homework description"
                rows={4}
                className="w-full bg-surface-container-high border border-outline-variant/10 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-brand-green/30 transition-all resize-none"
              />
              {teacherClasses.length > 0 ? (
                <select
                  required
                  value={form.className}
                  onChange={(event) => setForm((prev) => ({ ...prev, className: event.target.value }))}
                  className="w-full bg-surface-container-high border border-outline-variant/10 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-brand-green/30 transition-all appearance-none h-fit"
                >
                  <option value="">Select Class</option>
                  {classOptions.map((className) => (
                    <option key={className} value={className}>
                      Class {className}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  required
                  value={form.className}
                  onChange={(event) => setForm((prev) => ({ ...prev, className: event.target.value }))}
                  className="w-full bg-surface-container-high border border-outline-variant/10 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-brand-green/30 transition-all appearance-none h-fit"
                >
                  <option value="" disabled>Select Class (Nursery–8)</option>
                  {VALID_CLASSES.map((cls) => (
                    <option key={cls} value={cls}>Class {cls}</option>
                  ))}
                </select>
              )}
            </div>

            {error && <p className="text-error text-sm">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-full bg-brand-green w-full md:w-auto min-h-[44px] px-6 py-3 text-xs font-bold uppercase tracking-widest text-surface transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            >
              <Send size={14} />
              {isSubmitting ? 'Saving...' : 'Add Homework'}
            </button>
          </form>
        </section>
      )}

      {!isTeacher && error && <p className="text-error text-sm">{error}</p>}

      <section className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-brand-green/20 border-t-brand-green rounded-full animate-spin"></div>
            <p className="text-outline text-xs font-bold uppercase tracking-widest">Loading Homework...</p>
          </div>
        ) : homework.length > 0 ? (
          homework.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-outline-variant/10 bg-surface-container-low p-4 md:p-6 md:p-7"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="mt-1 w-11 h-11 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center">
                    <BookOpen size={18} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-bold text-white">{item.title}</h3>
                      <span className="inline-flex rounded-full bg-brand-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-green">
                        {item.subject}
                      </span>
                      <span className="inline-flex rounded-full bg-surface-container-high px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                        Class {item.class}
                      </span>
                    </div>
                    <p className="text-outline text-sm leading-7 whitespace-pre-wrap">{item.description}</p>
                  </div>
                </div>

                <div className="md:text-right shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Assigned</p>
                  <p className="text-sm text-white mt-2">{formatHomeworkDate(item.createdAt)}</p>
                  <p className="text-[11px] text-outline mt-1">Class {item.class}</p>
                  {canModifyHomework && (
                    <div className="flex items-center gap-2 mt-4 md:justify-end">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEditHomework(item);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-outline-variant/10 bg-surface-container-high px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:border-brand-green/30 hover:text-brand-green"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteHomework(item.id);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-error/20 bg-error/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-error transition-all hover:bg-error/15"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-outline-variant/10 bg-surface-container-low/40 p-10 text-center">
            <p className="text-white font-bold">No homework yet.</p>
            <p className="text-outline text-sm mt-2">Homework for your class will appear here in real time.</p>
          </div>
        )}
      </section>
    </div>
  );
}
