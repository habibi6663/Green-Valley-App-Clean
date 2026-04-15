/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserRole } from './types';
import Layout from './components/Layout';
import LoginScreen from './screens/LoginScreen';
import AdminDashboard from './screens/AdminDashboard';
import TeacherDashboard from './screens/TeacherDashboard';
import StudentDashboard from './screens/StudentDashboard';
import ParentDashboard from './screens/ParentDashboard';
import AttendanceScreen from './screens/AttendanceScreen';
import AcademicVault from './screens/AcademicVault';
import PaymentScreen from './screens/PaymentScreen';
import UserManagementScreen from './screens/UserManagementScreen';
import ReportGenerationScreen from './screens/ReportGenerationScreen';
import MessagingScreen from './screens/MessagingScreen';
import AssignmentListScreen from './screens/AssignmentListScreen';
import BillingHistoryScreen from './screens/BillingHistoryScreen';
import ProfileScreen from './screens/ProfileScreen';
import NoticesScreen from './screens/NoticesScreen';
import EventsScreen from './screens/EventsScreen';
import GalleryScreen from './screens/GalleryScreen';
import HomeworkScreen from './screens/HomeworkScreen';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const DASHBOARD_PATHS: Record<UserRole, string> = {
  ADMIN: '/admin',
  TEACHER: '/teacher',
  STUDENT: '/student',
  PARENT: '/parent',
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

export default function App() {
  const [role, setRole] = React.useState<UserRole | null>(null);
  const [currentUser, setCurrentUser] = React.useState<any | null>(null);
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [currentView, setCurrentView] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState<string | null>(null);

  React.useEffect(() => {
    console.log('[APP] Initializing Auth State Listener...');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      setAuthError(null);
      if (user) {
        try {
          console.log('[APP] Auth state changed: User detected. UID:', user.uid);
          let userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (!userDoc.exists()) {
            console.log('[APP] User document not found in Firestore. Retrying in 1.5s...');
            await new Promise(resolve => setTimeout(resolve, 1500));
            userDoc = await getDoc(doc(db, 'users', user.uid));
          }

          if (userDoc.exists()) {
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
            if (user.email && adminEmails.includes(user.email.toLowerCase())) {
              setRole('ADMIN');
              setCurrentUser({ id: user.uid, email: user.email, role: 'ADMIN' });
            } else {
              setRole(null);
              setCurrentUser(null);
            }
          }
        } catch (error) {
          setRole(null);
          setCurrentUser(null);
          setAuthError('Unable to load your account profile. Please try again.');
        }
      } else {
        setRole(null);
        setCurrentUser(null);
        setAuthError(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (!isLoading) {
      syncDashboardPath(role);
    }
  }, [role, isLoading]);

  React.useEffect(() => {
    if (isLoading || !role) return;

    const validateRoute = () => {
      // Define allowed tabs and views for each role
      const rolePermissions: Record<UserRole, { tabs: string[], views: string[] }> = {
        ADMIN: {
          tabs: ['dashboard', 'attendance', 'notes', 'homework', 'notices', 'events', 'gallery', 'fees', 'profile'],
          views: ['users', 'addUser', 'reports', 'messaging', 'attendance', 'billing']
        },
        TEACHER: {
          tabs: ['dashboard', 'attendance', 'notes', 'homework', 'notices', 'events', 'gallery', 'fees', 'profile'],
          views: ['messaging', 'assignments', 'users', 'attendance']
        },
        STUDENT: {
          tabs: ['dashboard', 'attendance', 'notes', 'homework', 'notices', 'events', 'gallery', 'fees', 'profile'],
          views: ['assignments', 'billing']
        },
        PARENT: {
          tabs: ['dashboard', 'attendance', 'notes', 'notices', 'events', 'gallery', 'fees', 'profile'],
          views: ['payment', 'messaging', 'attendance', 'billing']
        }
      };

      const permissions = rolePermissions[role];
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setRole(null);
      setActiveTab('dashboard');
      setCurrentView(null);
      setAuthError(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center space-y-6">
        <div className="w-16 h-16 bg-brand-green-dim/20 rounded-lg flex items-center justify-center border border-brand-green/20 animate-pulse">
          <div className="w-8 h-8 bg-brand-green rounded-md rotate-45 shadow-[0_0_20px_rgba(16,185,129,0.3)]"></div>
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
    if (currentView === 'payment' && role === 'PARENT') {
      return <PaymentScreen onBack={() => setCurrentView(null)} onViewHistory={() => setActiveTab('fees')} />;
    }
    if (currentView === 'users' && (role === 'ADMIN' || role === 'TEACHER')) {
      return <UserManagementScreen onAddUser={() => setCurrentView('addUser')} onBack={() => setCurrentView(null)} />;
    }
    if (currentView === 'reports' && role === 'ADMIN') {
      return <ReportGenerationScreen onBack={() => setCurrentView(null)} />;
    }
    if (currentView === 'messaging' && (role === 'PARENT' || role === 'TEACHER' || role === 'ADMIN')) {
      return <MessagingScreen onBack={() => setCurrentView(null)} />;
    }
    if (currentView === 'assignments' && (role === 'STUDENT' || role === 'TEACHER')) {
      return <AssignmentListScreen onBack={() => setCurrentView(null)} />;
    }

    // Handle main tabs
    if (activeTab === 'attendance') return <AttendanceScreen onBack={() => setActiveTab('dashboard')} user={currentUser} />;
    if (activeTab === 'fees') return <BillingHistoryScreen onBack={() => setActiveTab('dashboard')} />;
    if (activeTab === 'notes') return <NotesScreen />;
    if (activeTab === 'homework') return <HomeworkScreen role={role} user={currentUser} />;
    if (activeTab === 'notices') return <NoticesScreen role={role} currentUser={currentUser} />;
    if (activeTab === 'events') return <EventsScreen role={role} />;
    if (activeTab === 'gallery') return <GalleryScreen role={role} />;
    if (activeTab === 'profile') {
      return <ProfileScreen role={role} onLogout={handleLogout} />;
    }

    // Default Dashboards based on role
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
  };

  return (
    <Layout 
      role={role} 
      activeTab={activeTab} 
      setActiveTab={(tab) => { setActiveTab(tab); setCurrentView(null); }}
      onLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
}
