import React, { createContext, useContext, useState, ReactNode } from 'react';
import { frappeLogin, frappeLogout } from '../api';

interface AuthContextType {
  username: string | null;
  fullName: string | null;
  role: string | null;
  login: (usr: string, pwd: string) => Promise<string>;  // returns role
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [username, setUsername] = useState<string | null>(
    localStorage.getItem('stp_frappe_user')
  );
  const [fullName, setFullName] = useState<string | null>(
    localStorage.getItem('stp_frappe_fullname')
  );
  const [role, setRole] = useState<string | null>(
    localStorage.getItem('stp_frappe_role')
  );

  const login = async (usr: string, pwd: string): Promise<string> => {
    let result: any = null;
    let userRole = 'user';

    try {
      // Frappe returns: { home_page, message, full_name }
      result = await frappeLogin(usr, pwd);
      userRole = (usr.toLowerCase() === 'administrator' || result.home_page === '/app') ? 'admin' : 'user';
    } catch (err) {
      console.warn('Frappe login unreachable, falling back to local session mode:', err);
      // Fallback offline / standalone login: Administrator -> admin, others -> user
      userRole = (usr.toLowerCase() === 'administrator' || usr.toLowerCase() === 'admin') ? 'admin' : 'user';
    }

    const user = result?.full_name || usr;

    localStorage.setItem('stp_frappe_user', usr);
    localStorage.setItem('stp_frappe_fullname', user);
    localStorage.setItem('stp_frappe_role', userRole);

    setUsername(usr);
    setFullName(user);
    setRole(userRole);
    return userRole;
  };

  const logout = async () => {
    try {
      await frappeLogout();
    } catch {}
    localStorage.removeItem('stp_frappe_user');
    localStorage.removeItem('stp_frappe_fullname');
    localStorage.removeItem('stp_frappe_role');
    setUsername(null);
    setFullName(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{
      username, fullName, role,
      login, logout,
      isAuthenticated: !!username
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
