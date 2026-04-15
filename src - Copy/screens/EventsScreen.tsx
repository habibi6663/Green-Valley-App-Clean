import React from 'react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { CalendarDays, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { db } from '../firebase';
import { EventItem, UserRole } from '../types';

interface EventsScreenProps {
  role: UserRole;
}

function formatCreatedAt(value: unknown) {
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

function formatEventDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function EventsScreen({ role }: EventsScreenProps) {
  const [events, setEvents] = React.useState<EventItem[]>([]);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [date, setDate] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isAdmin = role === 'ADMIN';

  React.useEffect(() => {
    const eventsQuery = query(collection(db, 'events'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(
      eventsQuery,
      (snapshot) => {
        const nextEvents = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as EventItem[];
        setEvents(nextEvents);
      },
      (snapshotError) => {
        console.error('[EVENTS] Failed to stream events:', snapshotError);
        setError('Unable to load events right now.');
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
      await addDoc(collection(db, 'events'), {
        title: title.trim(),
        description: description.trim(),
        date,
        createdAt: serverTimestamp(),
      });

      setTitle('');
      setDescription('');
      setDate('');
    } catch (submitError) {
      console.error('[EVENTS] Failed to create event:', submitError);
      setError('Failed to create the event.');
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

  const handleEdit = async (collectionName: string, item: EventItem) => {
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
            School <span className="text-brand-green">Events.</span>
          </h1>
          <p className="text-outline text-sm font-medium">
            Upcoming school activities streamed live for students, parents, teachers, and admins.
          </p>
        </div>
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 px-5 py-4 min-w-[220px]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Upcoming</p>
          <p className="text-2xl font-bold text-white mt-2">{events.length}</p>
        </div>
      </section>

      {isAdmin && (
        <section className="bg-surface-container-low rounded-3xl border border-outline-variant/10 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center">
              <Plus size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Create Event</h2>
              <p className="text-outline text-xs uppercase tracking-widest">Admins only</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              className="w-full bg-surface-container-high border border-outline-variant/10 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-brand-green/30 transition-all"
            />
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the event..."
              rows={4}
              className="w-full bg-surface-container-high border border-outline-variant/10 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-brand-green/30 transition-all resize-none"
            />
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-surface-container-high border border-outline-variant/10 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-brand-green/30 transition-all"
            />
            {error && <p className="text-error text-sm">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-3 text-xs font-bold uppercase tracking-widest text-surface transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            >
              <Send size={14} />
              {isSubmitting ? 'Creating...' : 'Create Event'}
            </button>
          </form>
        </section>
      )}

      {!isAdmin && error && <p className="text-error text-sm">{error}</p>}

      <section className="grid grid-cols-1 gap-4">
        {events.length > 0 ? (
          events.map((eventItem) => (
            <article
              key={eventItem.id}
              className="rounded-3xl border border-outline-variant/10 bg-surface-container-low p-6 md:p-7"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="mt-1 w-11 h-11 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center">
                    <CalendarDays size={18} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">{eventItem.title}</h3>
                    <p className="text-outline text-sm leading-7 whitespace-pre-wrap">{eventItem.description}</p>
                  </div>
                </div>
                <div className="md:text-right shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Event Date</p>
                  <p className="text-sm text-white mt-2">{formatEventDate(eventItem.date)}</p>
                  <p className="text-[11px] text-outline mt-3">Created {formatCreatedAt(eventItem.createdAt)}</p>
                  {isAdmin && (
                    <div className="flex items-center gap-2 mt-4 md:justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit('events', eventItem);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-outline-variant/10 bg-surface-container-high px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:border-brand-green/30 hover:text-brand-green"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete('events', eventItem.id);
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
            <p className="text-white font-bold">No events scheduled yet.</p>
            <p className="text-outline text-sm mt-2">New events will appear here as soon as admins publish them.</p>
          </div>
        )}
      </section>
    </div>
  );
}
