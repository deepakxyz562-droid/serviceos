export interface Employee {
  id: string;
  name: string;
  phone: string;
  role: string;
  skills: string[];
  status: 'available' | 'busy' | 'offline';
  avatar: string | null;
  whatsappId: string | null;
  rating: number;
  completedJobs: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
}

export interface Job {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: string;
  address: string | null;
  scheduledAt: string | null;
  actualEndTime: string | null;
  notes: string | null;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneePhone: string | null;
  whatsappMessageId: string | null;
  whatsappSessionId: string | null;
  assignmentStatus: string | null;
  assignee?: Employee;
  customer?: Customer;
  createdAt: string;
  updatedAt: string;
}

export type JobStatus = Job['status'];
export type JobPriority = Job['priority'];
