import React from 'react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { Bell, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { db } from '../firebase';
import { Notice, UserRole } from '../types';

interface NoticesScreenProps {
  role: UserRole;
  currentUser: {
    id: string;
    fullName?: string;
    email?: string;
  } | null;
}

function formatTimestamp(value: unknown) {
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

export default function NoticesScreen({ role, currentUser }: NoticesScreenProps) {
  const [notices, setNotices] = React.useState<Notice[]>([]);
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isAdmin = role === 'ADMIN';

  React.useEffect(() => {
    const noticesQuery = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      noticesQuery,
      (snapshot) => {
        const nextNotices = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Notice[];
        setNotices(nextNotices);
      },
      (snapshotError) => {
        console.error('[NOTICES] Failed to stream notices:', snapshotError);
        setError('Unable to load notices right now.');
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAdmin) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await addDoc(collection(db, 'notices'), {
        title: title.trim(),
        content: content.trim(),
        createdAt: serverTimestamp(),
        createdBy: currentUser?.fullName || currentUser?.email || currentUser?.id || 'Admin',
      });

      setTitle('');
      setContent('');
    } catch (submitError) {
      console.error('[NOTICES] Failed to create notice:', submitError);
      setError('Failed to publish the notice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (collectionName: string, id: string) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
      alert('Deleted successfully');
    } catch (deleteError) {
      console.error('Delete error:', deleteError);
      alert('Delete failed');
    }
  };

  const handleEdit = async (collectionName: string, item: Notice) => {
    const newTitle = prompt('Edit title:', item.title);
    if (!newTitle) return;

    try {
      await updateDoc(doc(db, collectionName, item.id), {
        title: newTitle,
      });

      alert('Updated successfully');
    } catch (updateError) {
      console.error('Update error:', updateError);
      alert('Update failed');
    }
  };

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight text-white">
            School <span className="text-brand-green">Notices.</span>
          </h1>
          <p className="text-outline text-sm font-medium">
            Real-time notices for every member of the Green Valley community.
          </p>
        </div>
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 px-5 py-4 min-w-[220px]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Live Feed</p>
          <p className="text-2xl font-bold text-white mt-2">{notices.length}</p>
        </div>
      </section>

      {isAdmin && (
        <section className="bg-surface-container-low rounded-3xl border border-outline-variant/10 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center">
              <Plus size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Publish Notice</h2>
              <p className="text-outline text-xs uppercase tracking-widest">Admins only</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notice title"
              className="w-full bg-surface-container-high border border-outline-variant/10 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-brand-green/30 transition-all"
            />
            <textarea
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write the notice content here..."
              rows={5}
              className="w-full bg-surface-container-high border border-outline-variant/10 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-brand-green/30 transition-all resize-none"
            />
            {error && <p className="text-error text-sm">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-3 text-xs font-bold uppercase tracking-widest text-surface transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            >
              <Send size={14} />
              {isSubmitting ? 'Publishing...' : 'Publish Notice'}
            </button>
          </form>
        </section>
      )}

      {!isAdmin && error && <p className="text-error text-sm">{error}</p>}

      <section className="grid grid-cols-1 gap-4">
        {notices.length > 0 ? (
          notices.map((notice) => (
            <article
              key={notice.id}
              className="rounded-3xl border border-outline-variant/10 bg-surface-container-low p-6 md:p-7"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="mt-1 w-11 h-11 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center">
                    <Bell size={18} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">{notice.title}</h3>
                    <p className="text-outline text-sm leading-7 whitespace-pre-wrap">{notice.content}</p>
                  </div>
                </div>
                <div className="md:text-right shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Published</p>
                  <p className="text-sm text-white mt-2">{formatTimestamp(notice.createdAt)}</p>
                  <p className="text-[11px] text-outline mt-1">By {notice.createdBy}</p>
                  {isAdmin && (
                    <div className="flex items-center gap-2 mt-4 md:justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit('notices', notice);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-outline-variant/10 bg-surface-container-high px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:border-brand-green/30 hover:text-brand-green"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete('notices', notice.id);
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
            <p className="text-white font-bold">No notices yet.</p>
            <p className="text-outline text-sm mt-2">New notices will appear here in real time.</p>
          </div>
        )}
      </section>
    </div>
  );
}
