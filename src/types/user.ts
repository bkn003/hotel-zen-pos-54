
export type UserStatus = 'active' | 'paused' | 'deleted';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  role: 'admin' | 'user' | 'super_admin';
  hotel_name?: string;
  status: UserStatus;
}

// Legacy interface for backward compatibility
export interface UserProfile extends Profile {
  created_at: string;
  updated_at?: string;
}

// Item interface to match database schema
export interface Item {
  id: string;
  name: string;
  price: number; // Database has 'price', not 'selling_price'
}

// Payment types
export type PaymentMode = 'cash' | 'upi' | 'card' | 'other';
