import React from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Camera, ImagePlus, Pencil, Trash2, Upload } from 'lucide-react';
import { auth, db, storage } from '../firebase';
import { GalleryItem, UserRole } from '../types';

interface GalleryScreenProps {
  role: UserRole;
}

function formatCreatedAt(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Just now';
  }

  return parsed.toLocaleString();
}

export default function GalleryScreen({ role }: GalleryScreenProps) {
  const [gallery, setGallery] = React.useState<GalleryItem[]>([]);
  const [caption, setCaption] = React.useState('');
  const [selectedImage, setSelectedImage] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);

  const isAdmin = role === 'ADMIN';

  React.useEffect(() => {
    const galleryQuery = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(galleryQuery, (snapshot) => {
      setGallery(
        snapshot.docs.map((galleryDoc) => ({
          id: galleryDoc.id,
          ...galleryDoc.data(),
        })) as GalleryItem[]
      );
    });

    return () => unsub();
  }, []);

  const handleUploadImage = async () => {
    if (!selectedImage) {
      alert('Please select an image');
      return;
    }

    if (!selectedImage.type.startsWith('image/')) {
      alert('Only image files are allowed');
      return;
    }

    setUploading(true);

    try {
      const safeName = `${Date.now()}_${selectedImage.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(storage, `gallery/${safeName}`);

      await uploadBytes(storageRef, selectedImage);

      const imageUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'gallery'), {
        imageUrl,
        caption,
        createdAt: new Date().toISOString(),
        uploadedBy: auth.currentUser?.uid || 'admin',
      });

      setCaption('');
      setSelectedImage(null);
      alert('Image uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = async (item: GalleryItem) => {
    const newCaption = prompt('Edit caption:', item.caption);

    if (!newCaption) return;

    try {
      await updateDoc(doc(db, 'gallery', item.id), {
        caption: newCaption,
      });

      alert('Caption updated');
    } catch (error) {
      console.error('Update error:', error);
      alert('Update failed');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'gallery', id));
      alert('Deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete failed');
    }
  };

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="font-headline text-2xl md:text-4xl md:text-5xl font-bold tracking-tight text-white">
            School <span className="text-brand-green">Gallery.</span>
          </h1>
          <p className="text-outline text-sm font-medium">
            Campus moments, celebrations, and shared highlights in one live gallery.
          </p>
        </div>
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 px-5 py-4 min-w-[220px]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Photos</p>
          <p className="text-2xl font-bold text-white mt-2">{gallery.length}</p>
        </div>
      </section>

      {isAdmin && (
        <section className="bg-surface-container-low rounded-3xl border border-outline-variant/10 p-4 md:p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center">
              <ImagePlus size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Upload Gallery Image</h2>
              <p className="text-outline text-xs uppercase tracking-widest">Admins only</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-4">
            <label className="flex items-center justify-center gap-3 rounded-2xl border border-dashed border-outline-variant/20 bg-surface-container-high px-4 py-3 text-sm text-outline cursor-pointer hover:border-brand-green/30 transition-all">
              <Upload size={16} />
              <span>{selectedImage ? selectedImage.name : 'Select an image'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
              />
            </label>
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption"
              className="w-full bg-surface-container-high border border-outline-variant/10 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-brand-green/30 transition-all"
            />
            <button
              type="button"
              onClick={handleUploadImage}
              disabled={uploading}
              className="rounded-full bg-brand-green w-full md:w-auto min-h-[44px] px-6 py-3 text-xs font-bold uppercase tracking-widest text-surface transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {gallery.length > 0 ? (
          gallery.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-outline-variant/10 bg-surface-container-low overflow-hidden"
            >
              <div className="aspect-[4/3] bg-surface-container-high overflow-hidden">
                <img src={item.imageUrl} alt={item.caption || 'gallery'} className="w-full h-full object-cover" />
              </div>
              <div className="p-5 space-y-3">
                <p className="text-white text-sm leading-6 min-h-[48px]">
                  {item.caption || 'No caption added.'}
                </p>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Uploaded</p>
                    <p className="text-xs text-outline mt-1">{formatCreatedAt(item.createdAt)}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(item);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-outline-variant/10 bg-surface-container-high px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:border-brand-green/30 hover:text-brand-green"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
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
          <div className="md:col-span-2 xl:col-span-3 rounded-3xl border border-dashed border-outline-variant/10 bg-surface-container-low/40 p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center mx-auto mb-4">
              <Camera size={24} />
            </div>
            <p className="text-white font-bold">No gallery images yet.</p>
            <p className="text-outline text-sm mt-2">Uploaded images will appear here in real time for everyone.</p>
          </div>
        )}
      </section>
    </div>
  );
}
