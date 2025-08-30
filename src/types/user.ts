
export type UserStatus = 'active' | 'paused' | 'deleted';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  role: 'admin' | 'user';
  hotel_name?: string;
  status: UserStatus;
}

export interface UserProfile extends Profile {
  created_at: string;
  updated_at: string;
}
