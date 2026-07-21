import { AuthUser } from './auth';

export interface UserProfile extends AuthUser {
  createdAt: string;
  phoneNumber?: string;
}
