
import { supabase } from '@/integrations/supabase/client';

export const createUserProfile = async (userId: string, userData: any) => {
  try {
    const profileData = {
      user_id: userId,
      name: userData.name || 'User',
      role: userData.role || 'user',
      hotel_name: userData.hotel_name || null,
      status: userData.role === 'admin' ? 'paused' : 'active'
    };

    const { error } = await supabase
      .from('profiles')
      .insert(profileData);

    if (error) {
      console.error('Error creating profile:', error);
      throw error;
    }

    return profileData;
  } catch (error) {
    console.error('Error in createUserProfile:', error);
    throw error;
  }
};
