
export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  role: 'admin' | 'user' | 'super_admin';
  hotel_name?: string;
  status: 'active' | 'paused' | 'deleted';
  created_at: string;
  updated_at: string;
}
