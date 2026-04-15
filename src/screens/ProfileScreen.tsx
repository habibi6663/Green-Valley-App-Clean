import React from 'react';
import { User, Shield, Settings, Bell, Lock, ChevronRight } from 'lucide-react';
import { UserRole } from '../types';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import LogoutButton from '../components/LogoutButton';
import { getDisplayRollNumber } from '../lib/rollNumberUtils';

interface ProfileScreenProps {
  role: UserRole | null;
}

export default function ProfileScreen({ role }: ProfileScreenProps) {
  const user = auth.currentUser;
  const [rollNumber, setRollNumber] = React.useState<string>('');

  React.useEffect(() => {
    const fetchRollNumber = async () => {
      if (!user?.uid || role !== 'STUDENT') return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setRollNumber(getDisplayRollNumber(userDoc.data()));
        }
      } catch (err) {
        console.error('[PROFILE] Error fetching roll number:', err);
      }
    };
    fetchRollNumber();
  }, [user?.uid, role]);

  const settingsOptions = [
    { icon: Bell, label: 'Notifications', description: 'Alerts and updates' },
    { icon: Lock, label: 'Privacy & Security', description: 'Password and data' },
    { icon: Settings, label: 'Preferences', description: 'Language and theme' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-12">
      {/* Profile Header */}
      <section className="flex flex-col items-center text-center space-y-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-surface-container-high flex items-center justify-center border border-brand-green/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
            <User size={40} className="text-brand-green" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 md:w-10 md:h-10 bg-brand-green rounded-full flex items-center justify-center border-4 border-surface">
            <Shield size={14} className="text-surface" />
          </div>
        </div>
        
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white">{user?.displayName || 'User'}</h2>
          <p className="text-outline text-[10px] font-bold uppercase tracking-widest">{role} • {user?.email}</p>
          {role === 'STUDENT' && (
            <p className="text-outline/70 text-[10px] font-bold uppercase tracking-widest">
              Roll No: <span className="text-white">{rollNumber || 'Not assigned'}</span>
            </p>
          )}
        </div>
      </section>

      {/* Settings List */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-bold text-outline uppercase tracking-widest ml-4">Account Settings</h3>
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/5 overflow-hidden">
          {settingsOptions.map((option, idx) => (
            <button 
              key={idx}
              className={`w-full flex items-center justify-between p-5 hover:bg-surface-container-high transition-all text-left group ${idx !== settingsOptions.length - 1 ? 'border-b border-outline-variant/5' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-outline group-hover:text-brand-green transition-colors">
                  <option.icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{option.label}</p>
                  <p className="text-[10px] text-outline font-medium">{option.description}</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-outline group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>
      </section>

      {/* Logout Section */}
      <section className="pt-8">
        <LogoutButton
          className="w-full justify-center rounded-full border-error/20 bg-surface-container-low px-4 py-4 text-error hover:border-error/20 hover:bg-error/5 hover:text-error"
          label="Sign Out of Portal"
        />
      </section>
    </div>
  );
}
