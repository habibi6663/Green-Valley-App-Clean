import React from 'react';
import { ShieldAlert, GraduationCap, User, Users, AtSign, Lock, ArrowRight, UserPlus, LogIn, AlertCircle, Check } from 'lucide-react';
import { UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { VALID_CLASSES } from '../constants';

interface LoginScreenProps {
  onLogin: (role: UserRole) => void;
  errorMessage?: string | null;
}

const VALID_ROLES: UserRole[] = ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'];

export default function LoginScreen({ onLogin, errorMessage = null }: LoginScreenProps) {
  const [mode, setMode] = React.useState<'login' | 'signup' | 'forgot-password'>('login');
  const [selectedRole, setSelectedRole] = React.useState<UserRole>('STUDENT');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [signupClass, setSignupClass] = React.useState(VALID_CLASSES[0]);

  const roles = [
    { id: 'ADMIN' as UserRole, label: 'Admin', icon: ShieldAlert },
    { id: 'TEACHER' as UserRole, label: 'Teacher', icon: GraduationCap },
    { id: 'STUDENT' as UserRole, label: 'Student', icon: User },
    { id: 'PARENT' as UserRole, label: 'Guardian', icon: Users },
  ];

  // Filter roles based on mode: Only Student and Parent for signup
  const visibleRoles = mode === 'signup'
    ? roles.filter(r => r.id === 'STUDENT' || r.id === 'PARENT')
    : roles;

  React.useEffect(() => {
    setError(errorMessage);
  }, [errorMessage]);

  const fillDemo = (role: UserRole) => {
    const emails: Record<UserRole, string> = {
      ADMIN: 'admin@greenvalley.edu',
      TEACHER: 'teacher@greenvalley.edu',
      STUDENT: 'student@greenvalley.edu',
      PARENT: 'parent@greenvalley.edu'
    };
    setEmail(emails[role]);
    setPassword('password123');
    setSelectedRole(role);
    if (mode === 'signup') {
      setName(`Demo ${role.charAt(0) + role.slice(1).toLowerCase()}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("SIGNUP FUNCTION TRIGGERED");
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    console.log(`[AUTH] Starting ${mode} process for ${email}`);

    try {
      if (mode === 'forgot-password') {
        console.log('[AUTH] Calling sendPasswordResetEmail for:', email);
        await sendPasswordResetEmail(auth, email);
        console.log('[AUTH] Password reset email sent successfully.');
        setSuccessMessage(`A password reset link has been sent to ${email}. Please check your inbox and your SPAM folder.`);
        setIsProcessing(false);
        return;
      }

      if (mode === 'signup') {
        try {
          console.log("SIGNUP FUNCTION TRIGGERED");
          console.log("DB CHECK (signup):", db);
          console.log("STEP 1: Start signup");

          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const uid = userCredential.user.uid;
          
          console.log("STEP 2: Auth success:", uid);
          console.log("STEP 3: Writing to Firestore...");

          if (!VALID_CLASSES.includes(signupClass)) {
            alert('Invalid class selected');
            return setIsProcessing(false);
          }

          await setDoc(doc(db, "users", uid), {
            uid: uid,
            fullName: name || "No Name",
            email: email,
            role: (selectedRole || "STUDENT").toUpperCase(),
            class: signupClass,
            section: "A",
            createdAt: new Date().toISOString()
          });

          console.log("STEP 4: Firestore write success");
          alert("User successfully saved to Firestore");
          onLogin(selectedRole as UserRole);
          
        } catch (error: any) {
          console.error("SIGNUP ERROR:", error);
          alert("SIGNUP ERROR: " + error.message);
        }
      } else {
        console.log('[AUTH] Calling signInWithEmailAndPassword...');
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('[AUTH] Login successful. UID:', user.uid);

        // Fetch user role from Firestore
        console.log('[FIRESTORE] Fetching user role for UID:', user.uid);
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const normalizedRole =
            typeof userData.role === 'string' ? userData.role.toUpperCase() as UserRole : null;

          if (normalizedRole && VALID_ROLES.includes(normalizedRole)) {
            console.log('[FIRESTORE] User document found. Role:', normalizedRole);
            onLogin(normalizedRole);
          } else {
            console.warn('[FIRESTORE] User document found for UID:', user.uid, 'but role is missing.');
            setError('Account found, but no role assigned. Please contact admin.');
          }
        } else {
          // Fallback for default admins if doc doesn't exist yet
          const adminEmails = ['greenvalleyschool119@gmail.com', 'darkn8gaming@gmail.com'];
          if (user.email && adminEmails.includes(user.email.toLowerCase())) {
            console.log('[FIRESTORE] Default Admin detected via email. Granting ADMIN role and creating doc.');
            await setDoc(doc(db, 'users', user.uid), {
              uid: user.uid,
              fullName: user.displayName || user.email?.split('@')[0] || 'Admin',
              email: user.email,
              role: 'ADMIN',
              class: 'System',
              section: '',
              createdAt: new Date().toISOString()
            });
            onLogin('ADMIN');
          } else {
            console.warn('[FIRESTORE] No user document found for UID:', user.uid);
            console.log('[FIRESTORE] Creating default profile for UID:', user.uid);

            const defaultRole = 'student';
            const defaultDocData = {
              uid: user.uid,
              fullName: user.displayName || user.email?.split('@')[0] || 'Unknown User',
              email: user.email,
              role: defaultRole,
              class: VALID_CLASSES[0],
              section: '',
              createdAt: new Date().toISOString()
            };

            await setDoc(doc(db, 'users', user.uid), defaultDocData);

            // 'students' collection removed — users collection is single source of truth
            console.log('[FIRESTORE] Default profile created successfully.');
            onLogin('STUDENT');
          }
        }
      }
    } catch (err: any) {
      console.error('[AUTH ERROR] Full Error Object:', err);
      console.error('[AUTH ERROR] Code:', err.code);
      console.error('[AUTH ERROR] Message:', err.message);

      // Show exact Firebase error message as requested
      let exactMessage = err.message || 'An unknown authentication error occurred.';

      // Special handling for operation-not-allowed which is common when setting up a new project
      if (err.code === 'auth/operation-not-allowed') {
        exactMessage = 'Email/Password sign-in is disabled. Please enable it in the Firebase Console (Authentication > Sign-in method).';
      }

      setError(`Authentication Failed: ${exactMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 md:p-12">
      <main className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Identity Section */}
        <section className="lg:col-span-5 flex flex-col space-y-8">
          <div className="flex items-center space-x-4">
            <img src="/logo.png" alt="Green Valley Logo" className="w-16 h-16 object-contain drop-shadow-xl" onError={() => console.log("Logo failed to load")} />
            <div className="flex flex-col">
              <h1 className="font-headline font-extrabold text-3xl tracking-tight text-white leading-none mb-1">
                Green <span className="text-brand-green">Valley</span>
              </h1>
              <span className="text-xs font-bold text-outline uppercase tracking-widest leading-none">School Portal</span>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="font-headline text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tighter text-white">
              {mode === 'login' ? 'Access the' : mode === 'signup' ? 'Join the' : 'Reset your'} <span className="text-brand-green">{mode === 'forgot-password' ? 'Password.' : 'Portal.'}</span>
            </h2>
            <p className="text-on-surface-variant text-lg max-w-sm leading-relaxed">
              {mode === 'login'
                ? 'Sign in with your email and password. We will detect your account role automatically.'
                : mode === 'signup'
                  ? 'Create your account to begin your journey at Green Valley School.'
                  : 'Enter your email address to receive a secure password reset link.'}
            </p>
          </div>

          {mode === 'signup' && (
            <div className="grid grid-cols-2 gap-3">
              {visibleRoles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className={`group flex flex-col items-start p-5 rounded-lg transition-all duration-300 border ${selectedRole === role.id
                    ? 'border-primary/40 bg-surface-container-high'
                    : 'bg-surface-container-low hover:bg-surface-container-high border-outline-variant/15'
                    }`}
                >
                  <role.icon
                    size={24}
                    className={`mb-4 transition-colors ${selectedRole === role.id ? 'text-white' : 'text-outline group-hover:text-white'}`}
                  />
                  <span className={`font-body text-xs uppercase tracking-widest transition-colors ${selectedRole === role.id ? 'text-white' : 'text-outline group-hover:text-white'}`}>
                    {role.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Form Section */}
        <section className="lg:col-span-7 lg:pl-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-8 md:p-12 rounded-lg shadow-[0px_24px_48px_rgba(0,0,0,0.4)]"
          >
            <div className="flex gap-4 mb-8 p-1 bg-surface-container-low rounded-full border border-outline-variant/10">
              <button
                onClick={() => { setMode('login'); setError(null); setSuccessMessage(null); }}
                className={`flex-1 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${mode === 'login' ? 'bg-brand-green text-surface' : 'text-outline hover:text-white'}`}
              >
                <LogIn size={14} />
                Login
              </button>
              <button
                onClick={() => { setMode('signup'); setSelectedRole('STUDENT'); setError(null); setSuccessMessage(null); }}
                className={`flex-1 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${mode === 'signup' ? 'bg-brand-green text-surface' : 'text-outline hover:text-white'}`}
              >
                <UserPlus size={14} />
                Sign Up
              </button>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-error/10 border border-error/20 rounded-lg p-4 flex items-center gap-3 text-error text-sm"
                  >
                    <AlertCircle size={18} />
                    {error}
                  </motion.div>
                )}
                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-brand-green/10 border border-brand-green/20 rounded-lg p-4 flex items-center gap-3 text-brand-green text-sm"
                  >
                    <Check size={18} />
                    {successMessage}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-4">
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <label className="font-body text-[11px] uppercase tracking-[0.05em] text-outline ml-1">Full Name</label>
                    <div className="relative group">
                      <input
                        className="w-full bg-transparent border border-outline-variant/15 focus:border-outline-variant/40 rounded-full px-6 py-4 text-white placeholder:text-outline/50 focus:ring-1 focus:ring-surface-bright transition-all outline-none"
                        placeholder="John Doe"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required={mode === 'signup'}
                      />
                      <User className="absolute right-6 top-1/2 -translate-y-1/2 text-outline/30 group-focus-within:text-white transition-colors" size={20} />
                    </div>
                  </div>
                )}

                {mode === 'signup' && (
                  <div className="space-y-2">
                    <label className="font-body text-[11px] uppercase tracking-[0.05em] text-outline ml-1">Class (Nursery–8)</label>
                    <select
                      className="w-full bg-transparent border border-outline-variant/15 focus:border-outline-variant/40 rounded-full px-6 py-4 text-white placeholder:text-outline/50 focus:ring-1 focus:ring-surface-bright transition-all outline-none appearance-none cursor-pointer"
                      value={signupClass}
                      onChange={(e) => setSignupClass(e.target.value)}
                      required={mode === 'signup'}
                    >
                      {VALID_CLASSES.map(cls => (
                        <option key={cls} value={cls} className="bg-surface-container-high text-white">Class {cls}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Email Input */}
                <div className="space-y-2">
                  <label className="font-body text-[11px] uppercase tracking-[0.05em] text-outline ml-1">Academic ID / Email</label>
                  <div className="relative group">
                    <input
                      className="w-full bg-transparent border border-outline-variant/15 focus:border-outline-variant/40 rounded-full px-6 py-4 text-white placeholder:text-outline/50 focus:ring-1 focus:ring-surface-bright transition-all outline-none"
                      placeholder={mode === 'login' ? 'your.email@greenvalley.edu' : 'your.email@example.com'}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <AtSign className="absolute right-6 top-1/2 -translate-y-1/2 text-outline/30 group-focus-within:text-white transition-colors" size={20} />
                  </div>
                </div>

                {/* Password Input */}
                {mode !== 'forgot-password' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-end ml-1">
                      <label className="font-body text-[11px] uppercase tracking-[0.05em] text-outline">Secure Password</label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => { setMode('forgot-password'); setError(null); setSuccessMessage(null); }}
                          className="font-body text-[10px] uppercase tracking-[0.05em] text-outline hover:text-white transition-colors"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <div className="relative group">
                      <input
                        className="w-full bg-transparent border border-outline-variant/15 focus:border-outline-variant/40 rounded-full px-6 py-4 text-white placeholder:text-outline/50 focus:ring-1 focus:ring-surface-bright transition-all outline-none"
                        placeholder="••••••••••••"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required={mode !== 'forgot-password'}
                      />
                      <Lock className="absolute right-6 top-1/2 -translate-y-1/2 text-outline/30 group-focus-within:text-white transition-colors" size={20} />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex flex-col space-y-6">
                {/* Submit Button */}
                <button
                  disabled={isProcessing}
                  className={`metallic-cta w-full py-4 rounded-full font-headline font-bold text-on-primary tracking-tight text-lg active:scale-95 transition-transform duration-150 flex items-center justify-center space-x-2 ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
                  type="submit"
                >
                  <span>{isProcessing ? 'Processing...' : (mode === 'login' ? 'Initialize Session' : mode === 'signup' ? 'Create Account' : 'Send Reset Link')}</span>
                  <ArrowRight size={20} className={isProcessing ? 'animate-pulse' : ''} />
                </button>

                {mode === 'forgot-password' && (
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(null); setSuccessMessage(null); }}
                    className="text-outline hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
                  >
                    Back to Login
                  </button>
                )}

                {mode === 'signup' && (
                  <>
                    <div className="flex items-center space-x-4">
                      <div className="h-px flex-grow bg-outline-variant/15"></div>
                      <span className="font-body text-[10px] uppercase tracking-widest text-outline/40">Quick Demo Access</span>
                      <div className="h-px flex-grow bg-outline-variant/15"></div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {visibleRoles.map((role) => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => fillDemo(role.id)}
                          className="py-2 px-1 rounded-lg border border-outline-variant/10 bg-surface-container-low hover:bg-surface-container-high text-[9px] font-bold uppercase tracking-tighter text-outline hover:text-brand-green transition-all"
                        >
                          {role.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <div className="flex items-center space-x-4">
                  <div className="h-px flex-grow bg-outline-variant/15"></div>
                  <span className="font-body text-[10px] uppercase tracking-widest text-outline/40">Secure Verification</span>
                  <div className="h-px flex-grow bg-outline-variant/15"></div>
                </div>
              </div>
            </form>
          </motion.div>

          {/* Bottom Disclaimer */}
          <footer className="mt-8 text-center lg:text-left">
            <p className="font-body text-[11px] text-outline/40 uppercase tracking-[0.1em] leading-relaxed">
              By accessing this portal, you agree to the <button onClick={() => console.log('Viewing Privacy Protocols')} className="text-outline/60 hover:text-white underline underline-offset-4 decoration-outline-variant">Privacy Protocols</button> and <button onClick={() => console.log('Viewing Academic Integrity Code')} className="text-outline/60 hover:text-white underline underline-offset-4 decoration-outline-variant">Academic Integrity Code</button>.
            </p>
          </footer>
        </section>
      </main>

      {/* Decorative Elements */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
      <div className="fixed bottom-0 left-0 w-[300px] h-[300px] bg-surface-bright/20 rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/4"></div>
    </div>
  );
}
