
export type UserStatus = 'active' | 'paused' | 'deleted';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  role: 'admin' | 'user' | 'super_admin';
  hotel_name?: string;
  status: UserStatus;
}
