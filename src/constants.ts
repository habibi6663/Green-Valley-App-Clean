import { Student, ScheduleItem, UpdateItem, Assignment, Note } from './types';

export const MOCK_STUDENTS: Student[] = [
  { id: '1', name: 'Aaron Mitchell', rollNo: '001', avatar: 'https://picsum.photos/seed/aaron/200', status: 'PRESENT', grade: 'A+', class: 'Biology – Cell Structure' },
  { id: '2', name: 'Bethany Chen', rollNo: '002', avatar: 'https://picsum.photos/seed/bethany/200', status: 'PENDING', grade: 'A-', class: 'Chemistry – Acids and Bases' },
  { id: '3', name: 'David Kalu', rollNo: '003', avatar: 'https://picsum.photos/seed/david/200', status: 'ABSENT', grade: 'B+', class: 'Biology – Cell Structure' },
  { id: '4', name: 'Elena Rossi', rollNo: '004', avatar: 'https://picsum.photos/seed/elena/200', status: 'PENDING', grade: 'A', class: 'Science – Motion and Force' },
  { id: '5', name: 'Felix Vance', rollNo: '005', avatar: 'https://picsum.photos/seed/felix/200', status: 'PENDING' },
  { id: '6', name: 'Grace Harper', rollNo: '006', avatar: 'https://picsum.photos/seed/grace/200', status: 'PENDING' },
];

export const MOCK_SCHEDULE: ScheduleItem[] = [
  { time: '09:00 — 10:30', subject: 'Biology – Cell Structure', location: 'Lab Room 302' },
  { time: '11:00 — 12:30', subject: 'Science – Motion and Force', location: 'Main Auditorium' },
  { time: '14:00 — 15:30', subject: 'Chemistry – Acids and Bases', location: 'Lab Room 104' },
];

export const MOCK_UPDATES: UpdateItem[] = [
  { id: '1', title: 'New Report Card Available', description: 'The Mid-term science evaluation is now ready for review.', timestamp: '2 hours ago', type: 'REPORT' },
  { id: '2', title: 'Upcoming Field Trip', description: 'Consent form required for the Science Museum trip on May 12th.', timestamp: 'Yesterday', type: 'EVENT' },
];

export const MOCK_ASSIGNMENTS: Assignment[] = [
  { id: '1', title: 'Biology – Plant Cell Observation', description: 'Submit your drawings and labels of the onion cell observed in the lab.', dueDate: 'Oct 24, 2023', priority: 'High', icon: 'microscope' },
  { id: '2', title: 'Mathematics – Algebra Equations', description: 'Complete the practice problems on solving linear equations from Chapter 3.', dueDate: 'Oct 27, 2023', priority: 'Normal', icon: 'sigma' },
  { id: '3', title: 'History – The Industrial Age', description: 'Write a short essay on how the steam engine changed transportation.', dueDate: 'Nov 02, 2023', priority: 'Optional', icon: 'scroll-text' },
];

export const MOCK_NOTES: Note[] = [
  { id: '1', title: 'Physics – Laws of Motion', content: "A review of Newton's three laws of motion with real-world examples.", subject: 'Science', createdAt: '2024-03-15T10:00:00Z', teacherId: 'admin', image: 'https://picsum.photos/seed/physics/400/300' },
  { id: '2', title: 'Mathematics – Geometry Basics', content: 'Introduction to calculating the area and perimeter of different polygons.', subject: 'Mathematics', createdAt: '2024-03-12T10:00:00Z', teacherId: 'admin', image: 'https://picsum.photos/seed/math/400/300' },
  { id: '3', title: 'English – Short Story Analysis', content: 'Analyzing the themes and character development in the assigned short stories.', subject: 'English', createdAt: '2024-03-10T10:00:00Z', teacherId: 'admin', image: 'https://picsum.photos/seed/literature/400/300' },
  { id: '4', title: 'Biology – Photosynthesis Basics', content: 'Understanding how plants convert sunlight into energy through photosynthesis.', subject: 'Science', createdAt: '2024-03-08T10:00:00Z', teacherId: 'admin', image: 'https://picsum.photos/seed/biology/400/300' },
];

export const VALID_CLASSES = [
  "Nursery",
  "LKG",
  "UKG",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8"
];
