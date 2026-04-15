import React, { useState } from 'react';
import {
  Menu, X, Bell, Search, LayoutDashboard, FileText, User, Calendar,
  CreditCard, ChevronRight, Megaphone, CalendarRange, Images,
  BookOpen, Users, BarChart3, MessageSquare, Wallet, ClipboardList
} from 'lucide-react';
import { UserRole } from '../types';
import LogoutButton from './LogoutButton';
import LogoutProvider from './logout/LogoutProvider';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onViewChange?: (view: string) => void;
  onLogout: () => Promise<void>;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  showInBottomNav?: boolean;
}

interface ToolLink {
  viewId: string;
  label: string;
  icon: React.ElementType;
}

function getMainNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case 'ADMIN':
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, showInBottomNav: true },
        { id: 'attendance', label: 'Attendance', icon: Calendar, showInBottomNav: true },
        { id: 'notes', label: 'Notes', icon: FileText, showInBottomNav: true },
        { id: 'homework', label: 'Homework', icon: BookOpen },
        { id: 'notices', label: 'Notices', icon: Megaphone },
        { id: 'events', label: 'Events', icon: CalendarRange },
        { id: 'gallery', label: 'Gallery', icon: Images },
        { id: 'fees', label: 'Fees', icon: CreditCard, showInBottomNav: true },
      ];
    case 'TEACHER':
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, showInBottomNav: true },
        { id: 'attendance', label: 'Attendance', icon: Calendar, showInBottomNav: true },
        { id: 'notes', label: 'Notes', icon: FileText, showInBottomNav: true },
        { id: 'homework', label: 'Homework', icon: BookOpen, showInBottomNav: true },
        { id: 'notices', label: 'Notices', icon: Megaphone },
        { id: 'events', label: 'Events', icon: CalendarRange },
        { id: 'gallery', label: 'Gallery', icon: Images },
      ];
    case 'STUDENT':
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, showInBottomNav: true },
        { id: 'attendance', label: 'Attendance', icon: Calendar, showInBottomNav: true },
        { id: 'notes', label: 'Notes', icon: FileText, showInBottomNav: true },
        { id: 'homework', label: 'Homework', icon: BookOpen },
        { id: 'notices', label: 'Notices', icon: Megaphone },
        { id: 'events', label: 'Events', icon: CalendarRange },
        { id: 'gallery', label: 'Gallery', icon: Images },
        { id: 'fees', label: 'Fees', icon: CreditCard, showInBottomNav: true },
      ];
    case 'PARENT':
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, showInBottomNav: true },
        { id: 'attendance', label: 'Attendance', icon: Calendar, showInBottomNav: true },
        { id: 'notes', label: 'Notes', icon: FileText, showInBottomNav: true },
        { id: 'notices', label: 'Notices', icon: Megaphone },
        { id: 'events', label: 'Events', icon: CalendarRange },
        { id: 'gallery', label: 'Gallery', icon: Images },
        { id: 'fees', label: 'Fees', icon: CreditCard, showInBottomNav: true },
      ];
  }
}

function getSidebarTools(role: UserRole): { title: string; links: ToolLink[] } | null {
  switch (role) {
    case 'ADMIN':
      return {
        title: 'Admin Tools',
        links: [
          { viewId: 'users', label: 'User Management', icon: Users },
          { viewId: 'reports', label: 'Reports', icon: BarChart3 },
          { viewId: 'messaging', label: 'Messaging', icon: MessageSquare },
        ],
      };
    case 'TEACHER':
      return {
        title: 'Teacher Tools',
        links: [
          { viewId: 'users', label: 'Class List', icon: ClipboardList },
          { viewId: 'messaging', label: 'Messaging', icon: MessageSquare },
          { viewId: 'assignments', label: 'Assignments', icon: BookOpen },
        ],
      };
    case 'PARENT':
      return {
        title: 'Parent Tools',
        links: [
          { viewId: 'payment', label: 'Make Payment', icon: Wallet },
          { viewId: 'messaging', label: 'Messaging', icon: MessageSquare },
        ],
      };
    case 'STUDENT':
      return {
        title: 'Student Tools',
        links: [{ viewId: 'assignments', label: 'Assignments', icon: ClipboardList }],
      };
    default:
      return null;
  }
}

export default function ResponsiveLayout({
  children,
  role,
  activeTab,
  setActiveTab,
  onViewChange,
  onLogout,
}: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!role) return <>{children}</>;

  const mainNavItems = getMainNavItems(role);
  const sidebarTools = getSidebarTools(role);
  const bottomNavItems = mainNavItems.filter((item) => item.showInBottomNav).slice(0, 4);
  const activeItem = mainNavItems.find((item) => item.id === activeTab) || { label: 'Profile' };

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <LogoutProvider onLogout={onLogout}>
      <div className="min-h-screen flex bg-surface overflow-x-hidden">
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={closeSidebar}
          />
        )}

        <aside
          className={`fixed z-50 flex h-screen w-72 flex-col border-r border-outline-variant/5 bg-surface-container-low transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="p-6 pb-4 md:p-8">
            <div className="mb-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Green Valley School"
                  className="h-10 w-10 object-contain drop-shadow-md"
                  onError={() => console.log('Logo failed to load')}
                />
                <div className="flex flex-col">
                  <h1 className="font-headline text-xl font-bold tracking-tight text-white leading-none">
                    Green <span className="text-brand-green">Valley</span>
                  </h1>
                  <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-outline">School Portal</span>
                </div>
              </div>
              <button
                className="p-2 text-outline transition-colors hover:text-white lg:hidden"
                onClick={closeSidebar}
                aria-label="Close navigation"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6 inline-flex items-center gap-2 rounded-xl border border-brand-green/10 bg-brand-green/10 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-green animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-brand-green">{role}</span>
            </div>

            <nav className="space-y-1">
              <p className="mb-3 ml-3 text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                Main Menu
              </p>
              {mainNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    closeSidebar();
                  }}
                  className={`group flex w-full items-center justify-between rounded-2xl px-4 py-3 transition-all ${
                    activeTab === item.id
                      ? 'bg-brand-green text-surface shadow-lg shadow-brand-green/10'
                      : 'text-outline hover:bg-surface-container-high hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      size={17}
                      className={activeTab === item.id ? 'text-surface' : 'transition-colors group-hover:text-brand-green'}
                    />
                    <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>
                  </div>
                  {activeTab === item.id && <ChevronRight size={14} />}
                </button>
              ))}
            </nav>

            {sidebarTools && (
              <nav className="mt-6 space-y-1">
                <p className="mb-3 ml-3 text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                  {sidebarTools.title}
                </p>
                {sidebarTools.links.map((link) => (
                  <button
                    key={link.viewId}
                    onClick={() => {
                      onViewChange?.(link.viewId);
                      closeSidebar();
                    }}
                    className="group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-outline transition-all hover:bg-surface-container-high hover:text-white"
                  >
                    <link.icon size={17} className="flex-shrink-0 transition-colors group-hover:text-brand-green" />
                    <span className="text-xs font-bold uppercase tracking-widest">{link.label}</span>
                    <ChevronRight size={12} className="ml-auto opacity-40 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </button>
                ))}
              </nav>
            )}
          </div>

          <div className="mt-auto space-y-3 border-t border-outline-variant/5 p-6 md:p-8">
            <button
              onClick={() => {
                setActiveTab('profile');
                closeSidebar();
              }}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 transition-all ${
                activeTab === 'profile'
                  ? 'bg-brand-green/10 text-brand-green'
                  : 'text-outline hover:bg-surface-container-high hover:text-white'
              }`}
            >
              <User size={17} />
              <span className="text-xs font-bold uppercase tracking-widest">Profile</span>
            </button>

            <LogoutButton className="w-full justify-start border-outline-variant/10 bg-surface-container-high/70 px-4 py-3 text-outline hover:border-error/20 hover:bg-error/10 hover:text-error" />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col lg:pl-72">
          <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center justify-between border-b border-outline-variant/5 bg-surface/80 px-4 backdrop-blur-md md:h-20 md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="flex-shrink-0 p-2 text-outline transition-colors hover:text-white lg:hidden"
                aria-label="Open navigation"
              >
                <Menu size={22} />
              </button>
              <div className="min-w-0 space-y-0.5">
                <h2 className="flex items-center gap-2 truncate text-sm font-bold uppercase tracking-widest text-white">
                  {activeItem.label}
                  <span className="h-1 w-1 flex-shrink-0 rounded-full bg-brand-green" />
                </h2>
                <p className="hidden text-[9px] font-medium uppercase tracking-widest text-outline sm:block">
                  Green Valley Institutional Portal
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="hidden items-center gap-1 sm:flex">
                <button className="rounded-xl p-2.5 text-outline transition-all hover:bg-surface-container-high hover:text-white">
                  <Search size={17} />
                </button>
                <button className="rounded-xl p-2.5 text-outline transition-all hover:bg-surface-container-high hover:text-white">
                  <Bell size={17} />
                </button>
              </div>

              <LogoutButton className="hidden border-brand-green/10 bg-surface-container-high/80 px-5 py-2.5 text-outline hover:border-brand-green/25 hover:bg-brand-green/10 hover:text-brand-green lg:inline-flex" />

              <div className="flex items-center gap-2 lg:hidden">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
                    activeTab === 'profile'
                      ? 'border-brand-green bg-brand-green text-surface'
                      : 'border-outline-variant/10 bg-surface-container-high text-outline'
                  }`}
                  aria-label="Open profile"
                >
                  <User size={16} />
                </button>
                <LogoutButton compact showLabel={false} className="border-outline-variant/10 bg-surface-container-high text-outline hover:text-error hover:bg-error/10" />
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 pb-28 md:px-8 md:py-8 lg:pb-10">
              {children}
            </div>
          </main>

          <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-outline-variant/10 bg-surface-container-low/95 backdrop-blur-xl lg:hidden safe-area-inset-bottom">
            <div className="flex items-center justify-around px-2 py-2">
              {bottomNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 py-2 transition-all duration-200 ${
                    activeTab === item.id ? 'text-brand-green' : 'text-outline hover:text-white'
                  }`}
                >
                  <div className={`rounded-lg p-1.5 transition-all ${activeTab === item.id ? 'bg-brand-green/15' : ''}`}>
                    <item.icon size={20} />
                  </div>
                  <span className="mt-0.5 w-full truncate text-center text-[8px] font-bold uppercase tracking-tight">
                    {item.label}
                  </span>
                </button>
              ))}

              <button
                onClick={() => {
                  setActiveTab('profile');
                }}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 py-2 transition-all duration-200 ${
                  activeTab === 'profile' ? 'text-brand-green' : 'text-outline hover:text-white'
                }`}
              >
                <div className={`rounded-lg p-1.5 transition-all ${activeTab === 'profile' ? 'bg-brand-green/15' : ''}`}>
                  <User size={20} />
                </div>
                <span className="mt-0.5 text-[8px] font-bold uppercase tracking-tight">Profile</span>
              </button>

              <button
                onClick={() => setIsSidebarOpen(true)}
                className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 py-2 text-outline transition-all duration-200 hover:text-white"
              >
                <div className="rounded-lg p-1.5">
                  <Menu size={20} />
                </div>
                <span className="mt-0.5 text-[8px] font-bold uppercase tracking-tight">More</span>
              </button>
            </div>
          </nav>
        </div>
      </div>
    </LogoutProvider>
  );
}
