
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
  // Additional user profile fields if needed
}
