import React, { useState } from 'react';
import {
  Menu, X, Bell, Search, LayoutDashboard, FileText, User, Calendar,
  CreditCard, LogOut, ChevronRight, Megaphone, CalendarRange, Images,
  BookOpen, Users, BarChart3, MessageSquare, Wallet, ClipboardList, Loader2
} from 'lucide-react';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onViewChange?: (view: string) => void;
  onLogout: () => void;
}

// ── Role-based navigation configuration ───────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  /** If true, shown in bottom mobile nav (max 5 per role) */
  showInBottomNav?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
  /** If set, clicking the item triggers onViewChange(viewId) instead of setActiveTab */
  viewId?: string;
}

// Main tab items per role (sidebar + bottom nav)
function getMainNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case 'ADMIN':
      return [
        { id: 'dashboard',  label: 'Dashboard',  icon: LayoutDashboard, showInBottomNav: true },
        { id: 'attendance', label: 'Attendance',  icon: Calendar,        showInBottomNav: true },
        { id: 'notes',      label: 'Notes',       icon: FileText,        showInBottomNav: true },
        { id: 'homework',   label: 'Homework',    icon: BookOpen,        showInBottomNav: false },
        { id: 'notices',    label: 'Notices',     icon: Megaphone,       showInBottomNav: false },
        { id: 'events',     label: 'Events',      icon: CalendarRange,   showInBottomNav: false },
        { id: 'gallery',    label: 'Gallery',     icon: Images,          showInBottomNav: false },
        { id: 'fees',       label: 'Fees',        icon: CreditCard,      showInBottomNav: true },
      ];
    case 'TEACHER':
      return [
        { id: 'dashboard',  label: 'Dashboard',  icon: LayoutDashboard, showInBottomNav: true },
        { id: 'attendance', label: 'Attendance',  icon: Calendar,        showInBottomNav: true },
        { id: 'notes',      label: 'Notes',       icon: FileText,        showInBottomNav: true },
        { id: 'homework',   label: 'Homework',    icon: BookOpen,        showInBottomNav: true },
        { id: 'notices',    label: 'Notices',     icon: Megaphone,       showInBottomNav: false },
        { id: 'events',     label: 'Events',      icon: CalendarRange,   showInBottomNav: false },
        { id: 'gallery',    label: 'Gallery',     icon: Images,          showInBottomNav: false },
      ];
    case 'STUDENT':
      return [
        { id: 'dashboard',  label: 'Dashboard',  icon: LayoutDashboard, showInBottomNav: true },
        { id: 'attendance', label: 'Attendance',  icon: Calendar,        showInBottomNav: true },
        { id: 'notes',      label: 'Notes',       icon: FileText,        showInBottomNav: true },
        { id: 'homework',   label: 'Homework',    icon: BookOpen,        showInBottomNav: false },
        { id: 'notices',    label: 'Notices',     icon: Megaphone,       showInBottomNav: false },
        { id: 'events',     label: 'Events',      icon: CalendarRange,   showInBottomNav: false },
        { id: 'gallery',    label: 'Gallery',     icon: Images,          showInBottomNav: false },
        { id: 'fees',       label: 'Fees',        icon: CreditCard,      showInBottomNav: true },
      ];
    case 'PARENT':
      return [
        { id: 'dashboard',  label: 'Dashboard',  icon: LayoutDashboard, showInBottomNav: true },
        { id: 'attendance', label: 'Attendance',  icon: Calendar,        showInBottomNav: true },
        { id: 'notes',      label: 'Notes',       icon: FileText,        showInBottomNav: true },
        { id: 'notices',    label: 'Notices',     icon: Megaphone,       showInBottomNav: false },
        { id: 'events',     label: 'Events',      icon: CalendarRange,   showInBottomNav: false },
        { id: 'gallery',    label: 'Gallery',     icon: Images,          showInBottomNav: false },
        { id: 'fees',       label: 'Fees',        icon: CreditCard,      showInBottomNav: true },
      ];
  }
}

// Extra sidebar-only tool sections per role (trigger onViewChange)
interface ToolLink {
  viewId: string;
  label: string;
  icon: React.ElementType;
}

function getSidebarTools(role: UserRole): { title: string; links: ToolLink[] } | null {
  switch (role) {
    case 'ADMIN':
      return {
        title: 'Admin Tools',
        links: [
          { viewId: 'users',     label: 'User Management', icon: Users },
          { viewId: 'reports',   label: 'Reports',         icon: BarChart3 },
          { viewId: 'messaging', label: 'Messaging',       icon: MessageSquare },
        ],
      };
    case 'TEACHER':
      return {
        title: 'Teacher Tools',
        links: [
          { viewId: 'users',     label: 'Class List',  icon: ClipboardList },
          { viewId: 'messaging', label: 'Messaging',   icon: MessageSquare },
          { viewId: 'assignments', label: 'Assignments', icon: BookOpen },
        ],
      };
    case 'PARENT':
      return {
        title: 'Parent Tools',
        links: [
          { viewId: 'payment',   label: 'Make Payment', icon: Wallet },
          { viewId: 'messaging', label: 'Messaging',    icon: MessageSquare },
        ],
      };
    case 'STUDENT':
      return {
        title: 'Student Tools',
        links: [
          { viewId: 'assignments', label: 'Assignments', icon: ClipboardList },
        ],
      };
    default:
      return null;
  }
}

export default function Layout({ children, role, activeTab, setActiveTab, onViewChange, onLogout }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!role) return <>{children}</>;

  const mainNavItems = getMainNavItems(role);
  const sidebarTools = getSidebarTools(role);

  // Bottom nav: only items flagged showInBottomNav to avoid overflow (max 5 + profile)
  const bottomNavItems = mainNavItems.filter(item => item.showInBottomNav).slice(0, 4);

  const activeItem = mainNavItems.find(item => item.id === activeTab) || { label: 'Profile' };

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-screen flex bg-surface overflow-x-hidden">
      {/* ── Mobile Sidebar Overlay ── */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className={`flex flex-col w-72 bg-surface-container-low border-r border-outline-variant/5 fixed h-screen z-50 transition-transform duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Logo */}
        <div className="p-6 md:p-8 pb-4">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Green Valley School"
                className="w-10 h-10 object-contain drop-shadow-md"
                onError={() => console.log('Logo failed to load')}
              />
              <div className="flex flex-col">
                <h1 className="font-headline font-bold text-xl tracking-tight text-white leading-none">
                  Green <span className="text-brand-green">Valley</span>
                </h1>
                <span className="text-[9px] font-bold text-outline uppercase tracking-widest mt-1">School Portal</span>
              </div>
            </div>
            <button
              className="lg:hidden p-2 text-outline hover:text-white transition-colors"
              onClick={closeSidebar}
            >
              <X size={20} />
            </button>
          </div>

          {/* Role Badge */}
          <div className="mb-6 px-3 py-1.5 bg-brand-green/10 rounded-xl border border-brand-green/10 inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
            <span className="text-[9px] font-bold text-brand-green uppercase tracking-widest">{role}</span>
          </div>

          {/* Main Navigation */}
          <nav className="space-y-1">
            <p className="text-[10px] font-bold text-outline uppercase tracking-[0.2em] mb-3 ml-3">Main Menu</p>
            {mainNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); closeSidebar(); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all group ${
                  activeTab === item.id
                    ? 'bg-brand-green text-surface shadow-lg shadow-brand-green/10'
                    : 'text-outline hover:text-white hover:bg-surface-container-high'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    size={17}
                    className={activeTab === item.id ? 'text-surface' : 'group-hover:text-brand-green transition-colors'}
                  />
                  <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>
                </div>
                {activeTab === item.id && <ChevronRight size={14} />}
              </button>
            ))}
          </nav>

          {/* Role-Specific Tools Section */}
          {sidebarTools && (
            <nav className="mt-6 space-y-1">
              <p className="text-[10px] font-bold text-outline uppercase tracking-[0.2em] mb-3 ml-3">
                {sidebarTools.title}
              </p>
              {sidebarTools.links.map((link) => (
                <button
                  key={link.viewId}
                  onClick={() => {
                    onViewChange?.(link.viewId);
                    closeSidebar();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-outline hover:text-white hover:bg-surface-container-high transition-all group"
                >
                  <link.icon size={17} className="group-hover:text-brand-green transition-colors flex-shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-widest">{link.label}</span>
                  <ChevronRight size={12} className="ml-auto opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </nav>
          )}
        </div>

        {/* Bottom: Profile + Logout */}
        <div className="mt-auto p-6 md:p-8 border-t border-outline-variant/5 space-y-1">
          <button
            onClick={() => { setActiveTab('profile'); closeSidebar(); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
              activeTab === 'profile'
                ? 'bg-brand-green/10 text-brand-green'
                : 'text-outline hover:text-white hover:bg-surface-container-high'
            }`}
          >
            <User size={17} />
            <span className="text-xs font-bold uppercase tracking-widest">Profile</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-outline hover:text-error hover:bg-error/10 transition-all"
          >
            <LogOut size={17} />
            <span className="text-xs font-bold uppercase tracking-widest">Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:pl-72 min-w-0">
        {/* Top Bar */}
        <header className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8 bg-surface/80 backdrop-blur-md sticky top-0 z-30 border-b border-outline-variant/5 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger - mobile */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-outline hover:text-white transition-colors flex-shrink-0"
            >
              <Menu size={22} />
            </button>
            <div className="space-y-0.5 min-w-0">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 truncate">
                {activeItem.label}
                <span className="w-1 h-1 rounded-full bg-brand-green flex-shrink-0" />
              </h2>
              <p className="text-[9px] text-outline font-medium uppercase tracking-widest hidden sm:block">
                Green Valley Institutional Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1">
              <button className="p-2.5 text-outline hover:text-white hover:bg-surface-container-high rounded-xl transition-all">
                <Search size={17} />
              </button>
              <button className="p-2.5 text-outline hover:text-white hover:bg-surface-container-high rounded-xl transition-all">
                <Bell size={17} />
              </button>
            </div>
            {/* Mobile quick actions */}
            <div className="lg:hidden flex items-center gap-2">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${
                  activeTab === 'profile'
                    ? 'bg-brand-green text-surface border-brand-green'
                    : 'bg-surface-container-high border-outline-variant/10 text-outline'
                }`}
              >
                <User size={16} />
              </button>
              <button
                onClick={onLogout}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-container-high border border-outline-variant/10 text-outline hover:text-error hover:bg-error/10 transition-all"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Screen Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 md:px-8 py-6 md:py-8 pb-28 lg:pb-10 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>

        {/* ── Bottom Nav (Mobile Only) ────────────────────────────────── */}
        <nav className="fixed bottom-0 left-0 right-0 lg:hidden z-50 bg-surface-container-low/95 backdrop-blur-xl border-t border-outline-variant/10 safe-area-inset-bottom">
          <div className="flex justify-around items-center px-2 py-2">
            {bottomNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-xl transition-all duration-200 min-w-0 ${
                  activeTab === item.id
                    ? 'text-brand-green'
                    : 'text-outline hover:text-white'
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-all ${
                  activeTab === item.id ? 'bg-brand-green/15' : ''
                }`}>
                  <item.icon size={20} />
                </div>
                <span className="text-[8px] font-bold uppercase tracking-tight mt-0.5 truncate w-full text-center">
                  {item.label}
                </span>
              </button>
            ))}
            {/* Profile always in bottom nav */}
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-xl transition-all duration-200 ${
                activeTab === 'profile' ? 'text-brand-green' : 'text-outline hover:text-white'
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-all ${
                activeTab === 'profile' ? 'bg-brand-green/15' : ''
              }`}>
                <User size={20} />
              </div>
              <span className="text-[8px] font-bold uppercase tracking-tight mt-0.5">Profile</span>
            </button>

            {/* More button for remaining items */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-xl transition-all duration-200 text-outline hover:text-white"
            >
              <div className="p-1.5 rounded-lg">
                <Menu size={20} />
              </div>
              <span className="text-[8px] font-bold uppercase tracking-tight mt-0.5">More</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
