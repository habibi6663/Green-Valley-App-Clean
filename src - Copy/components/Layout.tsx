import React from 'react';
import { Bell, Search, LayoutDashboard, FileText, User, Calendar, CreditCard, LogOut, ChevronRight, Megaphone, CalendarRange, Images, BookOpen } from 'lucide-react';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Layout({ children, role, activeTab, setActiveTab, onLogout }: LayoutProps) {
  if (!role) return <>{children}</>;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'notes', label: 'Notes', icon: FileText },
    ...(role !== 'PARENT' ? [{ id: 'homework', label: 'Homework', icon: BookOpen }] : []),
    { id: 'notices', label: 'Notices', icon: Megaphone },
    { id: 'events', label: 'Events', icon: CalendarRange },
    { id: 'gallery', label: 'Gallery', icon: Images },
    { id: 'fees', label: 'Fees', icon: CreditCard },
  ];

  const activeItem = navItems.find(item => item.id === activeTab) || { label: 'Profile' };

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex flex-col w-72 bg-surface-container-low border-r border-outline-variant/5 fixed h-screen z-50">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <img src="/logo.png" alt="Green Valley School" className="w-10 h-10 object-contain drop-shadow-md" onError={() => console.log("Logo failed to load")} />
            <div className="flex flex-col">
              <h1 className="font-headline font-bold text-xl tracking-tight text-white leading-none">
                Green <span className="text-brand-green">Valley</span>
              </h1>
              <span className="text-[9px] font-bold text-outline uppercase tracking-widest mt-1">School Portal</span>
            </div>
          </div>

          <nav className="space-y-2">
            <p className="text-[10px] font-bold text-outline uppercase tracking-[0.2em] mb-4 ml-4">Main Menu</p>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all group ${
                  activeTab === item.id 
                    ? 'bg-brand-green text-surface shadow-lg shadow-brand-green/10' 
                    : 'text-outline hover:text-white hover:bg-surface-container-high'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={18} className={activeTab === item.id ? 'text-surface' : 'group-hover:text-brand-green transition-colors'} />
                  <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>
                </div>
                {activeTab === item.id && <ChevronRight size={14} />}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-outline-variant/5 space-y-4">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${
              activeTab === 'profile' 
                ? 'bg-brand-green/10 text-brand-green' 
                : 'text-outline hover:text-white hover:bg-surface-container-high'
            }`}
          >
            <User size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">Profile</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-outline hover:text-error hover:bg-error/10 transition-all"
          >
            <LogOut size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col lg:pl-72">
        {/* Top Bar */}
        <header className="h-20 flex items-center justify-between px-8 bg-surface/80 backdrop-blur-md sticky top-0 z-40 border-b border-outline-variant/5">
          <div className="flex items-center gap-4">
            <div className="lg:hidden flex items-center gap-3 mr-4">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" onError={() => console.log("Logo failed to load")} />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                {activeItem.label}
                <span className="w-1 h-1 rounded-full bg-brand-green"></span>
              </h2>
              <p className="text-[10px] text-outline font-medium uppercase tracking-widest hidden sm:block">Green Valley Institutional Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1 mr-4">
              <button className="p-2.5 text-outline hover:text-white hover:bg-surface-container-high rounded-xl transition-all">
                <Search size={18} />
              </button>
              <button className="p-2.5 text-outline hover:text-white hover:bg-surface-container-high rounded-xl transition-all">
                <Bell size={18} />
              </button>
            </div>
            <div className="lg:hidden flex items-center gap-2">
              <button 
                onClick={() => setActiveTab('profile')}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
                  activeTab === 'profile' ? 'bg-brand-green text-surface border-brand-green' : 'bg-surface-container-high border-outline-variant/10 text-outline'
                }`}
              >
                <User size={18} />
              </button>
              <button 
                onClick={onLogout}
                className="w-10 h-10 rounded-xl flex items-center justify-center bg-surface-container-high border border-outline-variant/10 text-outline hover:text-error hover:bg-error/10 transition-all"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col p-8 max-w-7xl mx-auto w-full pb-32 lg:pb-8">
          {children}
        </main>

        {/* Bottom Nav (Mobile Only) */}
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-50 flex justify-around items-center p-2 bg-surface-container-high/90 backdrop-blur-xl rounded-2xl border border-outline-variant/10 shadow-2xl lg:hidden">
          {navItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-2.5 transition-all duration-300 rounded-xl ${
                activeTab === item.id ? 'bg-brand-green text-surface' : 'text-outline hover:text-white'
              }`}
            >
              <item.icon size={18} />
              <span className="text-[9px] font-bold uppercase tracking-tighter mt-1">{item.label}</span>
            </button>
          ))}
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center flex-1 py-2.5 transition-all duration-300 rounded-xl ${
              activeTab === 'profile' ? 'bg-brand-green text-surface' : 'text-outline hover:text-white'
            }`}
          >
            <User size={18} />
            <span className="text-[9px] font-bold uppercase tracking-tighter mt-1">Profile</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
