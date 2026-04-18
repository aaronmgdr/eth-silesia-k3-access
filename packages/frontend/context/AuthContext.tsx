'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useDisconnect, useSignMessage } from 'wagmi';
import { useAppKitAccount } from '@reown/appkit/react';
import { Address } from 'viem';
import { createSiweMessage } from 'viem/siwe';
import { publicClient, CONTRACT_ADDRESS, NFT_ABI } from '@/lib/contract';

export interface SiweSession {
  message: string;
  signature: string;
}

interface AuthContextType {
  code: string | null;
  siweSession: SiweSession | null;
  isAuthenticated: boolean;
  hasValidMembership: boolean;
  setCode: (code: string) => void;
  setSiweSession: (session: SiweSession | null) => void;
  setHasValidMembership: (hasValid: boolean) => void;
  checkValidMembership: (address: Address) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAppKitAccount();
  const { signMessageAsync } = useSignMessage();
  const [code, setCode] = useState<string | null>(null);
  const [siweSession, setSiweSession] = useState<SiweSession | null>(null);
  const [hasValidMembership, setHasValidMembership] = useState(false);
  const authAttempted = useRef(false);

  const checkValidMembership = async (addr: Address) => {
    try {
      const hasValid = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: 'hasValidMembership',
        args: [addr],
      });
      setHasValidMembership(hasValid);
    } catch (err) {
      console.error('Error checking membership:', err);
      setHasValidMembership(false);
    }
  };


  // Auto-authenticate when wallet connects
  useEffect(() => {
    if (!isConnected || !address || siweSession || authAttempted.current) return;

    const authenticate = async () => {
      authAttempted.current = true;
      try {
        const nonceRes = await fetch('/api/nonce');
        const { nonce } = await nonceRes.json();

        const message = createSiweMessage({
          domain: window.location.host,
          address: address as Address,
          statement: 'Sign in to Kolektyw3 Access.',
          uri: window.location.origin,
          version: '1',
          chainId: 84532,
          nonce,
        });

        const signature = await signMessageAsync({ message });
        setSiweSession({ message, signature });

        // Check valid membership after auth
        await checkValidMembership(address as Address);
        authAttempted.current = false;
      } catch (err) {
        console.error('SIWE auth failed:', err);
        authAttempted.current = false;
      }
    };

    authenticate();
  }, [isConnected, address, siweSession, signMessageAsync]);

  const logout = () => {
    disconnect();
    setCode(null);
    setSiweSession(null);
    setHasValidMembership(false);
  };

  return (
    <AuthContext.Provider
      value={{
        code,
        siweSession,
        isAuthenticated: !!siweSession,
        hasValidMembership,
        setCode,
        setSiweSession,
        setHasValidMembership,
        checkValidMembership,
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
