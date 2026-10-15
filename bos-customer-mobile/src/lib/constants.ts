import { Platform } from 'react-native';
import { CityLocation } from '../types';

export const APP_NAME = 'BOS Customer';

// Base API URL: points to production BOS or dev host
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'https://bos.fieseros.com'
).replace(/\/$/, '');

export const COLORS = {
  primary: '#059669', // Emerald 600
  primaryDark: '#047857', // Emerald 700
  primaryLight: '#D1FAE5', // Emerald 100
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  accent: '#F59E0B', // Amber for ratings/stars
  red: '#EF4444',
  chipBg: '#F1F5F9',
};

export const CATEGORIES = [
  { id: 'ALL', name: 'All', icon: 'grid', color: '#059669', bg: '#D1FAE5' },
  { id: 'Grocery', name: 'Grocery', icon: 'shopping-bag', color: '#EA580C', bg: '#FFEDD5' },
  { id: 'Food', name: 'Food', icon: 'utensils', color: '#D97706', bg: '#FEF3C7' },
  { id: 'Salon', name: 'Salon', icon: 'scissors', color: '#9333EA', bg: '#F3E8FF' },
  { id: 'Pharmacy', name: 'Pharmacy', icon: 'pill', color: '#0284C7', bg: '#E0F2FE' },
] as const;

export const DEFAULT_CITIES: CityLocation[] = [
  { city: 'Patna', state: 'Bihar', displayName: 'Patna, Bihar' },
  { city: 'Delhi', state: 'Delhi', displayName: 'New Delhi, Delhi' },
  { city: 'Mumbai', state: 'Maharashtra', displayName: 'Mumbai, Maharashtra' },
  { city: 'Bangalore', state: 'Karnataka', displayName: 'Bangalore, Karnataka' },
  { city: 'Kolkata', state: 'West Bengal', displayName: 'Kolkata, West Bengal' },
  { city: 'Hyderabad', state: 'Telangana', displayName: 'Hyderabad, Telangana' },
  { city: 'Pune', state: 'Maharashtra', displayName: 'Pune, Maharashtra' },
  { city: 'Jaipur', state: 'Rajasthan', displayName: 'Jaipur, Rajasthan' },
  { city: 'Lucknow', state: 'Uttar Pradesh', displayName: 'Lucknow, Uttar Pradesh' },
  { city: 'Noida', state: 'Uttar Pradesh', displayName: 'Noida, Uttar Pradesh' },
  { city: 'Ahmedabad', state: 'Gujarat', displayName: 'Ahmedabad, Gujarat' },
  { city: 'Chandigarh', state: 'Punjab', displayName: 'Chandigarh' },
  { city: 'ALL', state: '', displayName: 'All Stores (Across India)' },
];

export const STORAGE_KEYS = {
  FAVORITES: 'bos_customer_favorites',
  RECENT_STORES: 'bos_customer_recent_stores',
  ACTIVE_SCANNED_STORE: 'bos_customer_scanned_store',
  SAVED_LOCATION: 'bos_customer_location',
  CUSTOMER_PROFILE: 'bos_customer_profile',
  ORDERS: 'bos_customer_orders',
  CART: 'bos_customer_cart',
  LANGUAGE: 'bos_customer_language',
};
