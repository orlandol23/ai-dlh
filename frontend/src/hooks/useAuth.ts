import { useState } from 'react';
import { ethers } from 'ethers';
import { toast } from '../components/molecules/Toaster';
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
      toast.error('MetaMask não detectado', {
        description: 'Instale a extensão MetaMask em metamask.io para continuar.',
      });
      return;
    }

    setIsConnecting(true);

    try {
      // Request account access
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      // Create message to sign
      const message = `AI-DLH Authentication\n\nSign this message to authenticate with AI-DLH.\n\nAddress: ${address}\nTimestamp: ${Date.now()}\n\nThis will not cost any gas.`;

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
        toast('Conexão cancelada', { description: 'Você rejeitou a assinatura no MetaMask.' });
      } else if (error.code === -32002) {
        toast.warning('Solicitação pendente', {
          description: 'Já existe uma conexão pendente no MetaMask — abra a extensão.',
        });
      } else {
        toast.error('Erro ao conectar carteira', {
          description: error.message || 'Erro desconhecido',
        });
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
