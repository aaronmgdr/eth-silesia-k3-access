'use client';

import React, { createContext, useContext, useState } from 'react';
import { useDisconnect } from 'wagmi';

export interface SiweSession {
  message: string;
  signature: string;
}

interface AuthContextType {
  code: string | null;
  siweSession: SiweSession | null;
  isAuthenticated: boolean;
  setCode: (code: string) => void;
  setSiweSession: (session: SiweSession | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { disconnect } = useDisconnect();
  const [code, setCode] = useState<string | null>(null);
  const [siweSession, setSiweSession] = useState<SiweSession | null>(null);

  const logout = () => {
    disconnect();
    setCode(null);
    setSiweSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        code,
        siweSession,
        isAuthenticated: !!siweSession,
        setCode,
        setSiweSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
