import { useState } from 'react';
import { ethers } from 'ethers';
import { trpc } from '../lib/trpc';
import { useAuthStore } from '../store/authStore';

declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * Hook for Web3 authentication
 */
export const useAuth = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const { user, setUser, setToken, logout } = useAuthStore();
  const loginMutation = trpc.auth.login.useMutation();

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('MetaMask não detectado! Por favor, instale a extensão MetaMask.\n\nhttps://metamask.io');
      return;
    }

    setIsConnecting(true);

    try {
      // Request account access
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      // Build the exact grammar the backend parses. A fresh random nonce
      // makes each login message unique; the backend records it to block
      // replay. Domain binding prevents a signature captured on another
      // site from being accepted here.
      const nonceBytes = new Uint8Array(24);
      crypto.getRandomValues(nonceBytes);
      const nonce = btoa(String.fromCharCode(...nonceBytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const message =
        `AI-DLH Authentication\n` +
        `Domain: ${window.location.host}\n` +
        `Address: ${address}\n` +
        `Timestamp: ${Date.now()}\n` +
        `Nonce: ${nonce}`;

      // Request signature
      const signature = await signer.signMessage(message);

      // Authenticate with backend
      const result = await loginMutation.mutateAsync({
        walletAddress: address,
        signature,
        message,
      });

      // Save to store
      setToken(result.token);
      setUser(result.user);

      return result;

    } catch (error: any) {
      console.error('Connection error:', error);

      if (error.code === 4001) {
        alert('Conexão cancelada pelo usuário');
      } else if (error.code === -32002) {
        alert('Já existe uma solicitação de conexão pendente no MetaMask');
      } else {
        alert('Erro ao conectar carteira: ' + (error.message || 'Erro desconhecido'));
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    logout();
  };

  return {
    user,
    isConnecting,
    isAuthenticated: !!user,
    connectWallet,
    disconnectWallet,
    logout: disconnectWallet,
  };
};
