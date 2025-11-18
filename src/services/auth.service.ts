import { invoke } from '@tauri-apps/api/core';
import type {
  UserSession,
  RegisterRequest,
  LoginRequest,
} from '../types/auth';

export class AuthService {
  // Authentication
  static async register(request: RegisterRequest): Promise<UserSession> {
    return invoke('register_user', { request });
  }

  static async login(request: LoginRequest): Promise<UserSession> {
    return invoke('login_user', { request });
  }

  static async getUserById(userId: string): Promise<UserSession> {
    return invoke('get_user_by_id', { userId });
  }

  static async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<string> {
    return invoke('change_password', { userId, oldPassword, newPassword });
  }
}
