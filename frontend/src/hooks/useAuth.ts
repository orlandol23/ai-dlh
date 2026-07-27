import { useState } from 'react';
import { type EIP1193Provider } from 'viem';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/molecules/Toaster';
import { getErrorMessage } from '@/lib/errors';
import { connectAndSign, isRequestPending, isUserRejection } from '@/lib/wallet';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/authStore';

declare global {
  interface Window {
    // EIP-1193 is the standardized provider interface MetaMask and other
    // injected wallets implement (request/on/removeListener). Using this
    // narrow type instead of `any` catches typos like `window.ethereum.req(...)`
    // at compile time without pulling in MetaMask-specific types we don't need.
    ethereum?: EIP1193Provider;
  }
}

/**
 * Hook for Web3 authentication.
 *
 * The wallet mechanics live in `@/lib/wallet` (framework-free and unit
 * tested); this hook only wires them to state, toasts and the tRPC call.
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
      const { address, message, signature } = await connectAndSign(window.ethereum, {
        domain: window.location.host,
      });

      const result = await loginMutation.mutateAsync({
        walletAddress: address,
        signature,
        message,
      });

      setToken(result.token);
      setUser(result.user);

      return result;

    } catch (error) {
      console.error('Connection error:', error);

      if (isUserRejection(error)) {
        toast(t('errors.rejected.title'), { description: t('errors.rejected.description') });
      } else if (isRequestPending(error)) {
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
