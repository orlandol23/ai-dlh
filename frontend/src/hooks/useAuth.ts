import { useState } from 'react';
import { ethers, type Eip1193Provider } from 'ethers';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/molecules/Toaster';
import { getEipErrorCode, getErrorMessage } from '@/lib/errors';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/authStore';

declare global {
  interface Window {
    // EIP-1193 is the standardized provider interface MetaMask and other
    // injected wallets implement (request/on/removeListener). Using this
    // narrow type instead of `any` catches typos like `window.ethereum.req(...)`
    // at compile time without pulling in MetaMask-specific types we don't need.
    ethereum?: Eip1193Provider;
  }
}

/**
 * Hook for Web3 authentication
 */
export const useAuth = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const { user, setUser, setToken, logout } = useAuthStore();
  const { t } = useTranslation('auth');
  const loginMutation = trpc.auth.login.useMutation();

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error(t('errors.metamaskNotDetected.title'), {
        description: t('errors.metamaskNotDetected.description'),
      });
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

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Connection error:', error);

      // EIP-1193 error codes: 4001 = user rejected, -32002 = request pending.
      const code = getEipErrorCode(error);
      if (code === 4001) {
        toast(t('errors.rejected.title'), { description: t('errors.rejected.description') });
      } else if (code === -32002) {
        toast.warning(t('errors.pendingRequest.title'), {
          description: t('errors.pendingRequest.description'),
        });
      } else {
        toast.error(t('errors.connectError.title'), {
          description: getErrorMessage(error, t('errors.connectError.descriptionFallback')),
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
