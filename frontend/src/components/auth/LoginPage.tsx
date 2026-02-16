import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

interface LoginPageProps {
  onSuccess: () => void;
  onSwitchToRegister: () => void;
  onContinueAsGuest: () => void;
}

export function LoginPage({ onSuccess, onSwitchToRegister, onContinueAsGuest }: LoginPageProps) {
  const setUser = useAuthStore((state) => state.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await api.login(email.trim(), password);
      setUser(response.user);
      onSuccess();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Sign in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sign in</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Sign in to sync programs across devices.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100"
              required
            />
          </label>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2 font-medium transition-colors"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="space-y-2 text-sm">
          <p className="text-gray-600 dark:text-gray-300">
            Need an account?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Create one
            </button>
          </p>
          <button
            type="button"
            onClick={onContinueAsGuest}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}
