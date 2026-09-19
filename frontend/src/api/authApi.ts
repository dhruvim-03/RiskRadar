import axiosClient from './axiosClient';
import { AuthResponse, User, UserRole } from '../types';

export const authApi = {
  login: async (username: string, password: string):Promise<AuthResponse> => {
    const res = await axiosClient.post<AuthResponse>('/auth/login', { username, password });
    return res.data;
  },

  register: async (username: string, password: string, role: UserRole): Promise<User> => {
    const res = await axiosClient.post<User>('/auth/register', { username, password, role });
    return res.data;
  },
};
