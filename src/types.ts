export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';

export interface Student {
  id: string;
  name: string;
  rollNo: string;
  avatar: string;
  status?: 'PRESENT' | 'ABSENT' | 'PENDING';
  class?: string;
  section?: string;
}

export interface ScheduleItem {
  time: string;
  subject: string;
  location: string;
}

export interface UpdateItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'REPORT' | 'EVENT' | 'ALERT';
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'High' | 'Normal' | 'Optional';
  icon: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  subject: string;
  createdAt: string;
  teacherId: string;
  image?: string;
}

export interface Fee {
  id: string;
  studentId: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  dueDate?: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  subject?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  createdAt?: string;
  createdBy: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  createdAt?: string;
}

export interface GalleryItem {
  id: string;
  imageUrl: string;
  caption: string;
  createdAt: string;
  uploadedBy: string;
}

export interface HomeworkItem {
  id: string;
  title: string;
  description: string;
  subject: string;
  class: string;
  createdAt?: string;
  createdBy: string;
}
