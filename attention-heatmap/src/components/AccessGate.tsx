'use client';

import { useState } from 'react';

interface AccessGateProps {
  onAuthenticated: (code: string) => void;
}

export default function AccessGate({ onAuthenticated }: AccessGateProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setChecking(true);
    setError('');

    try {
      // Validate the code against the server
      const res = await fetch('/api/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': code.trim(),
        },
      });

      if (res.ok) {
        onAuthenticated(code.trim());
      } else {
        setError('Invalid access code');
      }
    } catch {
      setError('Could not verify code. Try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <div className="w-full max-w-sm mx-auto px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500 flex items-center justify-center mb-4">
            <span className="text-lg font-bold">H</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Attention Heatmap</h1>
          <p className="text-sm text-zinc-500 mt-1">Enter your access code to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Access code"
            autoFocus
            disabled={checking}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-center tracking-widest"
          />
          <button
            type="submit"
            disabled={checking || !code.trim()}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {checking ? 'Verifying…' : 'Enter'}
          </button>
          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}
        </form>

        <p className="text-xs text-zinc-600 text-center mt-6">
          This tool is access-restricted.
          <br />
          Contact your administrator for a code.
        </p>
      </div>
    </main>
  );
}
