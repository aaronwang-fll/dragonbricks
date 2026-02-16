import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

interface RegisterPageProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

export function RegisterPage({ onSuccess, onSwitchToLogin }: RegisterPageProps) {
  const setUser = useAuthStore((state) => state.setUser);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await api.register(email.trim(), username.trim(), password);
      setUser(response.user);
      onSuccess();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create account</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Create an account to back up and sync your programs.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Username</span>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100"
              required
            />
          </label>

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
            {isSubmitting ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="text-sm text-gray-600 dark:text-gray-300">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
