/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserRole } from './types';
import Layout from './components/ResponsiveLayout';
import LoginScreen from './screens/LoginScreen';
import NetworkStatusBanner from './components/NetworkStatusBanner';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AdminDashboard = React.lazy(() => import('./screens/AdminDashboard'));
const TeacherDashboard = React.lazy(() => import('./screens/TeacherDashboard'));
const StudentDashboard = React.lazy(() => import('./screens/StudentDashboard'));
const ParentDashboard = React.lazy(() => import('./screens/ParentDashboard'));
const AttendanceScreen = React.lazy(() => import('./screens/AttendanceScreen'));
const AcademicVault = React.lazy(() => import('./screens/AcademicVault'));
const PaymentScreen = React.lazy(() => import('./screens/PaymentScreen'));
const UserManagementScreen = React.lazy(() => import('./screens/UserManagementScreen'));
const ReportGenerationScreen = React.lazy(() => import('./screens/ReportGenerationScreen'));
const MessagingScreen = React.lazy(() => import('./screens/MessagingScreen'));
const AssignmentListScreen = React.lazy(() => import('./screens/AssignmentListScreen'));
const BillingHistoryScreen = React.lazy(() => import('./screens/BillingHistoryScreen'));
const ProfileScreen = React.lazy(() => import('./screens/ProfileScreen'));
const NoticesScreen = React.lazy(() => import('./screens/NoticesScreen'));
const EventsScreen = React.lazy(() => import('./screens/EventsScreen'));
const GalleryScreen = React.lazy(() => import('./screens/GalleryScreen'));
const HomeworkScreen = React.lazy(() => import('./screens/HomeworkScreen'));

const DASHBOARD_PATHS: Record<UserRole, string> = {
  ADMIN: '/admin',
  TEACHER: '/teacher',
  STUDENT: '/student',
  PARENT: '/parent',
};

const ROLE_PERMISSIONS: Record<UserRole, { tabs: string[]; views: string[] }> = {
  ADMIN: {
    tabs: ['dashboard', 'attendance', 'notes', 'homework', 'notices', 'events', 'gallery', 'fees', 'profile'],
    views: ['users', 'addUser', 'reports', 'messaging', 'attendance', 'billing'],
  },
  TEACHER: {
    tabs: ['dashboard', 'attendance', 'notes', 'homework', 'notices', 'events', 'gallery', 'fees', 'profile'],
    views: ['messaging', 'assignments', 'users', 'attendance'],
  },
  STUDENT: {
    tabs: ['dashboard', 'attendance', 'notes', 'homework', 'notices', 'events', 'gallery', 'fees', 'profile'],
    views: ['assignments', 'billing'],
  },
  PARENT: {
    tabs: ['dashboard', 'attendance', 'notes', 'notices', 'events', 'gallery', 'fees', 'profile'],
    views: ['payment', 'messaging', 'attendance', 'billing'],
  },
};

function normalizeUserRole(role: unknown): UserRole | null {
  if (typeof role !== 'string') return null;

  const normalizedRole = role.toUpperCase();
  return ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'].includes(normalizedRole)
    ? normalizedRole as UserRole
    : null;
}

function syncDashboardPath(role: UserRole | null) {
  const nextPath = role ? DASHBOARD_PATHS[role] : '/';
  if (window.location.pathname !== nextPath) {
    window.history.replaceState(null, '', nextPath);
  }
}

function ScreenLoadingFallback() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center rounded-3xl border border-outline-variant/10 bg-surface-container-low px-4 py-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-brand-green/20 border-t-brand-green" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
          Loading secure module...
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [role, setRole] = React.useState<UserRole | null>(null);
  const [currentUser, setCurrentUser] = React.useState<any | null>(null);
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [currentView, setCurrentView] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState<string | null>(null);

  React.useEffect(() => {
    console.log('[APP] Initializing Auth State Listener...');
    let isActive = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isActive) return;
      setIsLoading(true);
      setAuthError(null);

      if (user) {
        try {
          console.log('[APP] Auth state changed: User detected. UID:', user.uid);
          let userDoc = await getDoc(doc(db, 'users', user.uid));
          if (!isActive) return;
          
          if (!userDoc.exists()) {
            console.log('[APP] User document not found in Firestore. Retrying in 1.5s...');
            await new Promise(resolve => setTimeout(resolve, 1500));
            if (!isActive) return;
            userDoc = await getDoc(doc(db, 'users', user.uid));
          }

          if (userDoc.exists()) {
            if (!isActive) return;
            const userData = userDoc.data();
            const normalizedRole = normalizeUserRole(userData.role);

            if (normalizedRole) {
              console.log('[APP] User session enriched. Role:', normalizedRole);
              setRole(normalizedRole);
              setCurrentUser({ id: user.uid, ...userData, role: normalizedRole });
            } else {
              console.warn('[APP] User session missing role for UID:', user.uid);
              setRole(null);
              setCurrentUser(null);
              setAuthError('Account found, but no role assigned. Please contact admin.');
            }
          } else {
            const adminEmails = ['greenvalleyschool119@gmail.com', 'darkn8gaming@gmail.com'];
            if (!isActive) return;
            if (user.email && adminEmails.includes(user.email.toLowerCase())) {
              setRole('ADMIN');
              setCurrentUser({ id: user.uid, email: user.email, role: 'ADMIN' });
            } else {
              setRole(null);
              setCurrentUser(null);
            }
          }
        } catch (error) {
          if (!isActive) return;
          setRole(null);
          setCurrentUser(null);
          setAuthError('Unable to load your account profile. Please try again.');
        }
      } else {
        if (!isActive) return;
        setRole(null);
        setCurrentUser(null);
        setAuthError(null);
      }
      if (isActive) {
        setIsLoading(false);
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    if (!isLoading) {
      syncDashboardPath(role);
    }
  }, [role, isLoading]);

  React.useEffect(() => {
    if (isLoading || !role) return;

    const validateRoute = () => {
      const permissions = ROLE_PERMISSIONS[role];
      if (!permissions) return;

      const isTabAllowed = permissions.tabs.includes(activeTab);
      const isViewAllowed = !currentView || permissions.views.includes(currentView);

      if (!isTabAllowed || !isViewAllowed) {
        console.warn(`Access denied for role ${role} to ${activeTab}/${currentView}`);
        setActiveTab('dashboard');
        setCurrentView(null);
      }
    };

    validateRoute();
  }, [role, activeTab, currentView, isLoading]);

  const handleLogin = (selectedRole: string) => {
    const normalizedRole = normalizeUserRole(selectedRole);
    if (!normalizedRole) {
      setAuthError('Account found, but no role assigned. Please contact admin.');
      return;
    }

    console.log('[APP] Logging in as:', normalizedRole);
    setAuthError(null);
    setRole(normalizedRole);
    setActiveTab('dashboard');
    setCurrentView(null);
  };

  const handleLogout = React.useCallback(async () => {
    try {
      await signOut(auth);
      if (typeof window !== 'undefined') {
        const firebaseKeys = Object.keys(window.localStorage).filter((key) => key.startsWith('firebase:'));
        firebaseKeys.forEach((key) => window.localStorage.removeItem(key));
        window.sessionStorage.clear();
        window.history.replaceState(null, '', '/');
      }
      setRole(null);
      setCurrentUser(null);
      setActiveTab('dashboard');
      setCurrentView(null);
      setAuthError(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center space-y-6">
        <div className="w-16 h-16 bg-brand-green-dim/20 rounded-lg flex items-center justify-center border border-brand-green/20 animate-pulse">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-brand-green rounded-md rotate-45 shadow-[0_0_20px_rgba(16,185,129,0.3)]"></div>
        </div>
        <div className="flex flex-col items-center space-y-2">
          <p className="text-white font-headline font-bold text-xl tracking-tight">Green Valley Portal</p>
          <p className="text-outline text-xs uppercase tracking-widest font-bold animate-pulse">Synchronizing Identity...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (!role) return <LoginScreen onLogin={handleLogin} errorMessage={authError} />;
    
    console.log("[DEBUG] Current Active Tab:", activeTab);

    // Alias for Notes Screen as requested
    const NotesScreen = () => <AcademicVault role={role} user={currentUser} />;

    // Handle sub-views with role-based validation
    return (
      <React.Suspense fallback={<ScreenLoadingFallback />}>
        {currentView === 'payment' && role === 'PARENT' && (
          <PaymentScreen onBack={() => setCurrentView(null)} onViewHistory={() => setActiveTab('fees')} />
        )}
        {currentView === 'users' && (role === 'ADMIN' || role === 'TEACHER') && (
          <UserManagementScreen onAddUser={() => setCurrentView('addUser')} onBack={() => setCurrentView(null)} />
        )}
        {currentView === 'reports' && role === 'ADMIN' && (
          <ReportGenerationScreen onBack={() => setCurrentView(null)} />
        )}
        {currentView === 'messaging' && (role === 'PARENT' || role === 'TEACHER' || role === 'ADMIN') && (
          <MessagingScreen onBack={() => setCurrentView(null)} />
        )}
        {currentView === 'assignments' && (role === 'STUDENT' || role === 'TEACHER') && (
          <AssignmentListScreen onBack={() => setCurrentView(null)} />
        )}

        {activeTab === 'attendance' && <AttendanceScreen onBack={() => setActiveTab('dashboard')} user={currentUser} />}
        {activeTab === 'fees' && <BillingHistoryScreen onBack={() => setActiveTab('dashboard')} />}
        {activeTab === 'notes' && <NotesScreen />}
        {activeTab === 'homework' && <HomeworkScreen role={role} user={currentUser} />}
        {activeTab === 'notices' && <NoticesScreen role={role} currentUser={currentUser} />}
        {activeTab === 'events' && <EventsScreen role={role} />}
        {activeTab === 'gallery' && <GalleryScreen role={role} />}
        {activeTab === 'profile' && <ProfileScreen role={role} />}

        {activeTab === 'dashboard' && (() => {
          console.log('[DEBUG] Evaluating Dashboard for role:', role);
          switch (role?.toString().toUpperCase()) {
            case 'ADMIN':
              return (
                <AdminDashboard
                  onManageUsers={() => setCurrentView('users')}
                  onGenerateReports={() => setCurrentView('reports')}
                  onViewAttendance={() => setActiveTab('attendance')}
                  onViewFees={() => setActiveTab('fees')}
                  onViewNotes={() => setActiveTab('notes')}
                />
              );
            case 'TEACHER':
              return (
                <TeacherDashboard
                  onTakeAttendance={() => setActiveTab('attendance')}
                  onUploadNotes={() => setActiveTab('notes')}
                  onViewClassLists={() => setCurrentView('users')}
                />
              );
            case 'STUDENT':
              return (
                <StudentDashboard
                  onViewBilling={() => setActiveTab('fees')}
                  onViewAssignments={() => setCurrentView('assignments')}
                  onViewNotes={() => setActiveTab('notes')}
                />
              );
            case 'PARENT':
              return (
                <ParentDashboard
                  onMakePayment={() => setCurrentView('payment')}
                  onViewUpdates={() => setActiveTab('dashboard')}
                  onContactTeacher={() => setCurrentView('messaging')}
                  onViewAttendance={() => setActiveTab('attendance')}
                  onViewNotes={() => setActiveTab('notes')}
                />
              );
            default:
              return <div className="text-white">Dashboard for {role} coming soon.</div>;
          }
        })()}
      </React.Suspense>
    );
  };

  return (
    <>
      <NetworkStatusBanner />
      <Layout
        role={role}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setCurrentView(null);
        }}
        onViewChange={(view) => {
          setCurrentView(view);
        }}
        onLogout={handleLogout}
      >
        {renderContent()}
      </Layout>
    </>
  );
}
