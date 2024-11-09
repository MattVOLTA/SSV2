import React, { useState } from 'react';
import { Phone, KeyRound, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function PhoneAuth() {
  const [phone, setPhone] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signInWithPhone, verifyOTP } = useAuth();

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithPhone(phone);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await verifyOTP(phone, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg dark:bg-gray-800">
      <div className="text-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          <img 
            src="https://kkwcqninksetzodeayir.supabase.co/storage/v1/object/public/assets/logo.png?t=2024-11-09T19%3A28%3A55.368Z"
            alt="Spend Simple Logo"
            className="h-12 w-12"
          />
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Spend Simple
          </h2>
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {step === 'phone' ? 'Sign in with your phone number' : 'Enter the code sent to your phone'}
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/50 dark:text-red-200">
          {error}
        </div>
      )}

      {step === 'phone' ? (
        <form onSubmit={handlePhoneSubmit} className="mt-8 space-y-6">
          <div className="relative">
            <label htmlFor="phone" className="sr-only">
              Phone number
            </label>
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1234567890"
              className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-4 pl-12 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              'Send Code'
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleOTPSubmit} className="mt-8 space-y-6">
          <div className="relative">
            <label htmlFor="token" className="sr-only">
              Verification code
            </label>
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              id="token"
              name="token"
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter verification code"
              className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-4 pl-12 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              ) : (
                'Verify'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}