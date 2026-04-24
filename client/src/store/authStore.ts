import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  address: string;
  lat?: number;
  lng?: number;
  role: 'customer' | 'admin';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (userData: User) => void;
  logout: () => void;
  isLoginModalOpen: boolean;
  authModalMode: 'login' | 'register';
  setLoginModalOpen: (isOpen: boolean, mode?: 'login' | 'register') => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (userData) => set({ user: userData, isAuthenticated: true }),
      logout: () => {
        localStorage.removeItem('pasabuy_token');
        set({ user: null, isAuthenticated: false });
      },
      isLoginModalOpen: false,
      authModalMode: 'login',
      setLoginModalOpen: (isOpen, mode = 'login') => set({ isLoginModalOpen: isOpen, authModalMode: mode }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
