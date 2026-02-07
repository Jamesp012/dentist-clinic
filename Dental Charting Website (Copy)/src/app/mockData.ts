import { v4 as uuidv4 } from 'uuid';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  lastVisit: string;
  nextVisit: string;
  status: 'Active' | 'Archived';
  avatar: string;
  email: string;
  phone: string;
}

export const MOCK_PATIENTS: Patient[] = [
  {
    id: '1',
    firstName: 'Sarah',
    lastName: 'Connor',
    dob: '1985-04-12',
    lastVisit: '2023-11-15',
    nextVisit: '2024-05-20',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1684607633024-f1a2179118fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZW50YWwlMjBwYXRpZW50JTIwc21pbGluZ3xlbnwxfHx8fDE3Njk4MDU0MzZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    email: 'sarah.connor@example.com',
    phone: '(555) 123-4567'
  },
  {
    id: '2',
    firstName: 'John',
    lastName: 'Doe',
    dob: '1990-08-23',
    lastVisit: '2024-01-10',
    nextVisit: '2024-07-15',
    status: 'Active',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    email: 'john.doe@example.com',
    phone: '(555) 987-6543'
  },
  {
    id: '3',
    firstName: 'Emily',
    lastName: 'Blunt',
    dob: '1983-02-23',
    lastVisit: '2023-12-05',
    nextVisit: '2024-06-10',
    status: 'Active',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    email: 'emily.b@example.com',
    phone: '(555) 456-7890'
  },
  {
    id: '4',
    firstName: 'Michael',
    lastName: 'Scott',
    dob: '1975-03-15',
    lastVisit: '2023-10-30',
    nextVisit: 'Pending',
    status: 'Active',
    avatar: 'https://randomuser.me/api/portraits/men/85.jpg',
    email: 'm.scott@dunder.com',
    phone: '(555) 999-0000'
  }
];

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  time: string;
  date: string;
  type: 'Checkup' | 'Cleaning' | 'Root Canal' | 'Consultation';
  status: 'Scheduled' | 'Completed' | 'Cancelled';
}

export const MOCK_APPOINTMENTS: Appointment[] = [
  { id: '101', patientId: '1', patientName: 'Sarah Connor', time: '09:00 AM', date: 'Today', type: 'Checkup', status: 'Scheduled' },
  { id: '102', patientId: '2', patientName: 'John Doe', time: '10:30 AM', date: 'Today', type: 'Cleaning', status: 'Scheduled' },
  { id: '103', patientId: '3', patientName: 'Emily Blunt', time: '02:00 PM', date: 'Today', type: 'Root Canal', status: 'Scheduled' },
];
