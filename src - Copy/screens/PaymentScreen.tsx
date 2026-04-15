import React from 'react';
import { CreditCard, Landmark, CheckCircle2, AlertCircle, ArrowRight, Lock, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, addDoc, serverTimestamp, getDocs, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { Fee } from '../types';

interface PaymentScreenProps {
  onBack: () => void;
  onViewHistory: () => void;
}

export default function PaymentScreen({ onBack, onViewHistory }: PaymentScreenProps) {
  const [paymentType, setPaymentType] = React.useState<'CARD' | 'BANK'>('CARD');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [fees, setFees] = React.useState<Fee[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const path = 'fees';
    const fetchFees = async () => {
      let studentId = auth.currentUser?.uid;

      // If parent, find their child first
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists() && userDoc.data().role === 'PARENT') {
          // Query 'users' collection for linked student (students collection removed)
          const studentsQ = query(
            collection(db, 'users'),
            where('role', '==', 'STUDENT'),
            where('parentId', '==', auth.currentUser.uid)
          );
          const studentsSnapshot = await getDocs(studentsQ);
          if (!studentsSnapshot.empty) {
            studentId = studentsSnapshot.docs[0].id;
            console.log('[DEBUG] Found linked student UID:', studentId);
          }
        }
      }

      if (!studentId) {
        setIsLoading(false);
        return;
      }

      const q = query(
        collection(db, path), 
        where('studentId', '==', studentId)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const feesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Fee[];
        setFees(feesData);
        setIsLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      });

      return unsubscribe;
    };

    let unsubscribe: (() => void) | undefined;
    fetchFees().then(unsub => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const totalBalance = fees
    .filter(f => f.status !== 'PAID')
    .reduce((sum, f) => sum + f.amount, 0);

  const pendingFees = fees.filter(f => f.status !== 'PAID');
  const paidFees = fees.filter(f => f.status === 'PAID').slice(0, 3);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalBalance <= 0) return;

    setIsProcessing(true);
    const path = 'fees';
    
    try {
      // Mark all pending fees as paid for this demo
      const promises = pendingFees.map(fee => 
        updateDoc(doc(db, path, fee.id), {
          status: 'PAID'
        })
      );

      await Promise.all(promises);
      onBack();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-16">
      {/* Header */}
      <section className="space-y-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-outline hover:text-white transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Back to Dashboard</span>
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div className="space-y-2">
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-headline text-4xl md:text-5xl font-bold tracking-tight text-brand-green"
            >
              ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </motion.h2>
            <p className="text-outline text-sm font-medium tracking-wide">Total Balance Due</p>
          </div>
          {pendingFees.length > 0 && (
            <div className="flex flex-col md:items-end gap-1">
              <p className="text-error text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                <AlertCircle size={14} />
                {pendingFees.some(f => f.status === 'OVERDUE') ? 'Overdue payments detected' : 'Pending payments'}
              </p>
              <p className="text-outline text-[10px] font-bold uppercase tracking-widest">Next Due: {pendingFees[0].dueDate}</p>
            </div>
          )}
        </div>
      </section>

      {/* Payment Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Payment Form */}
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/5">
            <h3 className="font-bold text-lg text-white mb-8 border-b border-outline-variant/10 pb-4">Secure Payment</h3>
            
            <form className="space-y-8" onSubmit={handlePayment}>
              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => setPaymentType('CARD')}
                  className={`flex-1 py-4 rounded-xl border transition-all flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-widest ${paymentType === 'CARD' ? 'bg-brand-green text-surface border-brand-green' : 'bg-surface-container-high text-outline border-outline-variant/10 hover:border-brand-green/30'}`}
                >
                  <CreditCard size={18} />
                  Credit Card
                </button>
                <button 
                  type="button"
                  onClick={() => setPaymentType('BANK')}
                  className={`flex-1 py-4 rounded-xl border transition-all flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-widest ${paymentType === 'BANK' ? 'bg-brand-green text-surface border-brand-green' : 'bg-surface-container-high text-outline border-outline-variant/10 hover:border-brand-green/30'}`}
                >
                  <Landmark size={18} />
                  Bank Transfer
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Cardholder Name</label>
                  <input 
                    className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-green/40 transition-all outline-none" 
                    placeholder="Alexander Vance" 
                    type="text"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Card Number</label>
                  <input 
                    className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-green/40 transition-all outline-none" 
                    placeholder="•••• •••• •••• 4242" 
                    type="text"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Expiry</label>
                    <input 
                      className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-green/40 transition-all outline-none" 
                      placeholder="MM/YY" 
                      type="text"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">CVC</label>
                    <input 
                      className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-green/40 transition-all outline-none" 
                      placeholder="•••" 
                      type="text"
                      required
                    />
                  </div>
                </div>
              </div>

              <button 
                disabled={isProcessing || totalBalance <= 0}
                className="w-full py-5 bg-brand-green text-surface rounded-full font-bold text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2 mt-8"
              >
                {isProcessing ? 'Processing...' : `Pay $${totalBalance.toLocaleString()} Now`}
                <ArrowRight size={18} className={isProcessing ? 'animate-pulse' : ''} />
              </button>
              
              <p className="text-center text-[9px] text-outline uppercase tracking-widest flex items-center justify-center gap-2">
                <Lock size={12} />
                Secure Encrypted Transaction
              </p>
            </form>
          </div>
        </div>

        {/* Breakdown & History */}
        <div className="lg:col-span-5 space-y-8">
          {/* Breakdown */}
          <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/5">
            <h3 className="font-bold text-lg text-white mb-6 border-b border-outline-variant/10 pb-4">Invoice</h3>
            <div className="space-y-4">
              {pendingFees.length > 0 ? (
                pendingFees.map((fee) => (
                  <div key={fee.id} className="flex justify-between items-center text-sm">
                    <span className="text-outline">Tuition Fee</span>
                    <span className="text-white font-bold">${fee.amount.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-outline text-xs text-center py-4 italic">No pending invoices.</p>
              )}
              <div className="pt-4 border-t border-outline-variant/10 flex justify-between items-center">
                <span className="font-bold text-white">Total</span>
                <span className="font-bold text-brand-green text-lg">${totalBalance.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/5">
            <div className="flex justify-between items-center mb-6 border-b border-outline-variant/10 pb-4">
              <h3 className="font-bold text-lg text-white">History</h3>
              <button 
                onClick={onViewHistory}
                className="text-[10px] font-bold text-outline uppercase tracking-widest hover:text-white transition-colors"
              >
                View All
              </button>
            </div>
            <div className="space-y-6">
              {paidFees.length > 0 ? (
                paidFees.map((fee) => (
                  <div 
                    key={fee.id} 
                    className="flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-brand-green">
                      <CheckCircle2 size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">Tuition Fee</p>
                      <p className="text-[10px] text-outline font-bold uppercase tracking-widest">Paid</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">${fee.amount.toLocaleString()}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-brand-green">Success</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-outline text-xs text-center py-4 italic">No payment history.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
