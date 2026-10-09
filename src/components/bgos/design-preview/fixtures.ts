export type Stage = 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Won';
export type Lead = {
  id: string;
  name: string;
  company: string;
  initials: string;
  email: string;
  phone: string;
  source: string;
  stage: Stage;
  value: number;
  owner: string;
  next: string;
  notes: string[];
};
export const STAGES: Stage[] = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won'];
export const INITIAL_LEADS: Lead[] = [
  { id: 'sample-1', name: 'Priya Singh', company: 'Bloom Events', initials: 'PS', email: 'priya@example.test', phone: '', source: 'WhatsApp', stage: 'New', value: 18000, owner: 'Rohit', next: 'Today, 11:30 AM', notes: ['Interested in festive gift boxes for a team of 60.'] },
  { id: 'sample-2', name: 'Vikram Sharma', company: 'Studio North', initials: 'VS', email: 'vikram@example.test', phone: '', source: 'Google', stage: 'New', value: 12500, owner: 'Meera', next: 'Today, 2:00 PM', notes: ['Requested a callback about office celebrations.'] },
  { id: 'sample-3', name: 'Amit Kumar', company: 'Evergreen Co.', initials: 'AK', email: 'amit@example.test', phone: '', source: 'Website', stage: 'Contacted', value: 24000, owner: 'Rohit', next: 'Tomorrow, 10:00 AM', notes: ['Shared the corporate gifting brochure.'] },
  { id: 'sample-4', name: 'Sunita Desai', company: 'The Weekend Club', initials: 'SD', email: 'sunita@example.test', phone: '', source: 'Form', stage: 'Contacted', value: 8500, owner: 'Meera', next: 'Tomorrow, 3:00 PM', notes: ['Looking for snacks for a community gathering.'] },
  { id: 'sample-5', name: 'Rahul Mehta', company: 'Orbit Design', initials: 'RM', email: 'rahul@example.test', phone: '', source: 'Referral', stage: 'Qualified', value: 32000, owner: 'Rohit', next: 'Oct 12, 11:00 AM', notes: ['Budget confirmed. Discuss delivery requirements.'] },
  { id: 'sample-6', name: 'Neha Kapoor', company: 'Maple Works', initials: 'NK', email: 'neha@example.test', phone: '', source: 'Google', stage: 'Proposal', value: 45000, owner: 'Meera', next: 'Oct 13, 12:00 PM', notes: ['Proposal shared. Waiting for team approval.'] },
  { id: 'sample-7', name: 'Arjun Rao', company: 'Gather House', initials: 'AR', email: 'arjun@example.test', phone: '', source: 'WhatsApp', stage: 'Won', value: 22000, owner: 'Rohit', next: 'Oct 14, 4:00 PM', notes: ['Confirmed the engagement. Schedule a welcome call.'] },
];
export const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
export const INITIAL_POSTS = [
  { id: 1, title: 'A little sweetness for every celebration', channel: 'Instagram', date: 'Oct 12 · 10:30 AM', status: 'Scheduled', kind: 'Festive collection', hue: 'peach' },
  { id: 2, title: 'Made fresh. Shared with love.', channel: 'Google', date: 'Oct 10 · 9:00 AM', status: 'Published', kind: 'Behind the scenes', hue: 'mint' },
  { id: 3, title: 'Your neighbourhood favourites', channel: 'Facebook', date: 'Oct 11 · 2:00 PM', status: 'Draft', kind: 'Weekend special', hue: 'lilac' },
];
export const CHANNELS = ['Google', 'Instagram', 'Facebook', 'WhatsApp'];
