import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, Eye, EyeOff, Lock, User as UserIcon, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('ANALYST');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const isPasswordLongEnough = password.length >= 8;
  const doPasswordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (!isPasswordLongEnough) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!doPasswordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await register(username.trim(), password, role);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError(`Username '${username}' is already taken. Please choose another.`);
      } else {
        setError(err.response?.data?.message || 'Failed to create account.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-background selection:bg-primary/20">
      <div className="w-full max-w-[400px] bg-surface border border-border rounded-xl p-8 shadow-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3 rounded-2xl bg-primary text-white shadow-md shadow-primary/25 mb-3">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Create Account</h1>
          <p className="text-xs text-muted mt-1">Set up access to FraudGuard risk dashboard</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text mb-1.5" htmlFor="reg-username">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                id="reg-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="analyst_jane"
                required
                className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text mb-1.5" htmlFor="reg-password">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-10 py-2 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-text"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text mb-1.5" htmlFor="reg-confirm">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="reg-confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-10 py-2 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Live checkmarks */}
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-border text-[11px] space-y-1">
            <div className={`flex items-center gap-1.5 ${isPasswordLongEnough ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted'}`}>
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${isPasswordLongEnough ? 'bg-emerald-500/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
                <Check className="w-2.5 h-2.5" />
              </div>
              <span>At least 8 characters</span>
            </div>
            <div className={`flex items-center gap-1.5 ${doPasswordsMatch ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted'}`}>
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${doPasswordsMatch ? 'bg-emerald-500/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
                <Check className="w-2.5 h-2.5" />
              </div>
              <span>Passwords match</span>
            </div>
          </div>

          {/* Role selector (segmented control) */}
          <div>
            <label className="block text-xs font-medium text-text mb-1.5">
              Assigned Role
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-background border border-border rounded-lg">
              <button
                type="button"
                onClick={() => setRole('ANALYST')}
                className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                  role === 'ANALYST'
                    ? 'bg-surface text-primary shadow-sm font-semibold'
                    : 'text-muted hover:text-text'
                }`}
              >
                Analyst
              </button>
              <button
                type="button"
                onClick={() => setRole('ADMIN')}
                className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                  role === 'ADMIN'
                    ? 'bg-surface text-primary shadow-sm font-semibold'
                    : 'text-muted hover:text-text'
                }`}
              >
                Admin
              </button>
            </div>
            <p className="text-[11px] text-muted mt-1">
              {role === 'ADMIN'
                ? 'Full access including ML retraining & model lifecycle management'
                : 'Scoring, fraud investigation & drift monitoring'}
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || !isPasswordLongEnough || !doPasswordsMatch}
            className="w-full mt-2 py-2.5 px-4 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
          >
            {isLoading ? 'Creating account...' : 'Complete Registration'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-border text-center">
          <p className="text-xs text-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
