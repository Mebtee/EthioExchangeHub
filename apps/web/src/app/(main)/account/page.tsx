'use client';

import { useAuth } from '@/lib/auth-context';
import { useQuery } from '@tanstack/react-query';
import { User, Mail, Shield, Calendar, Phone, CheckCircle, XCircle, Key, LogOut } from 'lucide-react';
import { LoadingPage } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { cn, formatDateTime } from '@/lib/utils';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1';

async function fetchProfile() {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/users/me`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

export default function AccountPage() {
  const { user, logout, isAuthenticated } = useAuth();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    enabled: isAuthenticated,
  });

  const profile = data?.data ?? data ?? user;

  if (!isAuthenticated) {
    return (
      <div className="card flex flex-col items-center justify-center p-12">
        <User className="h-12 w-12 text-gray-300 dark:text-gray-600" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Sign in required
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Please sign in to view your account
        </p>
      </div>
    );
  }

  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Account
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your profile and preferences
        </p>
      </div>

      {/* Profile card */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-white">
              {profile?.fullName?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{profile?.fullName ?? 'User'}</h2>
              <p className="text-sm text-white/80">{profile?.email}</p>
            </div>
          </div>
        </div>

        <div className="card-body">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Profile Information
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {profile?.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {profile?.phoneNumber ?? 'Not set'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Member Since</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {profile?.createdAt ? formatDateTime(profile.createdAt) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Account Status
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Role</p>
                    <span
                      className={cn(
                        'badge text-xs',
                        profile?.role === 'ADMIN' ? 'badge-purple' : 'badge-blue',
                      )}
                    >
                      {profile?.role}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {profile?.isVerified ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Verified</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {profile?.isVerified ? 'Verified' : 'Not verified'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Last Login</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {profile?.lastLoginAt ? formatDateTime(profile.lastLoginAt) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Security</h3>
        </div>
        <div className="card-body space-y-4">
          <button className="btn-secondary w-full justify-start text-sm sm:w-auto">
            <Key className="h-4 w-4" />
            Change Password
          </button>
          <button
            onClick={logout}
            className="btn-secondary w-full justify-start text-sm text-red-600 hover:bg-red-50 sm:w-auto dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
