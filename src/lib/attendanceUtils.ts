import { Attendance } from '../types';

export interface AttendanceAnalytics {
  weekly: number;
  monthly: number;
  yearly: number;
}

export function calculateAttendanceStats(records: Attendance[]): AttendanceAnalytics {
  if (!records || records.length === 0) {
    return { weekly: 0, monthly: 0, yearly: 0 };
  }

  const now = new Date();
  
  // Weekly limits: last 7 days
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);
  startOfWeek.setHours(0, 0, 0, 0);

  // Monthly limits: current month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Yearly limits: current year
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  startOfYear.setHours(0, 0, 0, 0);

  const stats = {
    weekly: { present: 0, total: 0 },
    monthly: { present: 0, total: 0 },
    yearly: { present: 0, total: 0 }
  };

  records.forEach(r => {
    let recordDate: Date;
    // Prefer Firestore timestamp
    if (r.createdAt && typeof (r.createdAt as any).toDate === 'function') {
      recordDate = (r.createdAt as any).toDate();
    } else {
      recordDate = new Date(r.date);
    }
    
    // Safety check just in case date parsing failed
    if (isNaN(recordDate.getTime())) return;
    
    const isPresent = r.status === 'PRESENT';

    if (recordDate >= startOfWeek) {
      stats.weekly.total++;
      if (isPresent) stats.weekly.present++;
    }
    if (recordDate >= startOfMonth) {
      stats.monthly.total++;
      if (isPresent) stats.monthly.present++;
    }
    if (recordDate >= startOfYear) {
      stats.yearly.total++;
      if (isPresent) stats.yearly.present++;
    }
  });

  const calcPercent = (present: number, total: number) => {
    if (total === 0) return 0; // Graceful 0% if no records in range
    return Math.round((present / total) * 100);
  };

  return {
    weekly: calcPercent(stats.weekly.present, stats.weekly.total),
    monthly: calcPercent(stats.monthly.present, stats.monthly.total),
    yearly: calcPercent(stats.yearly.present, stats.yearly.total)
  };
}
