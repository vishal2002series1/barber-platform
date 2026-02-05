export type UserRole = 'customer' | 'barber' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  avatar_url?: string | null;
  is_onboarded?: boolean;
}