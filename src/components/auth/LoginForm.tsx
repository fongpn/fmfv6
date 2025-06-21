import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Clock, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { useAuthStore } from '../../store/authStore';

const loginSchema = z.object({
  email: z.string()
    .nonempty('Email is required')
    .email('Please enter a valid email address'),
  password: z.string()
    .nonempty('Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const { signIn, pendingApprovalRequestId, clearPendingRequest } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    console.log('Form data received:', data);
    console.log('Email value:', data.email);
    console.log('Password value:', data.password);
    
    setIsLoading(true);
    setError(null);
    setIsPendingApproval(false);

    try {
      const { error, status } = await signIn(data.email, data.password);
      
      if (error) {
        if (status === 'PENDING_APPROVAL') {
          setIsPendingApproval(true);
          setError(null);
        } else {
          setError(error.message || 'Failed to sign in');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryLogin = () => {
    setIsPendingApproval(false);
    setError(null);
    clearPendingRequest();
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            FMF Gym Management
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>

        {/* Pending Approval Message */}
        {(isPendingApproval || pendingApprovalRequestId) && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-6">
              <div className="flex items-start">
                <Clock className="h-6 w-6 text-orange-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-orange-800 mb-2">
                    Access Request Pending
                  </h3>
                  <p className="text-sm text-orange-700 mb-3">
                    Your access request is pending administrator approval. You are attempting to log in from a new location that requires verification.
                  </p>
                  {pendingApprovalRequestId && (
                    <p className="text-xs text-orange-600 mb-4 font-mono bg-orange-100 p-2 rounded">
                      Request ID: {pendingApprovalRequestId}
                    </p>
                  )}
                  <div className="flex space-x-3">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleRetryLogin}
                      className="border-orange-300 text-orange-700 hover:bg-orange-100"
                    >
                      Try Again
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => window.location.reload()}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      Refresh Page
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Sign In</h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm flex items-start">
                  <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Input
                label="Email Address"
                type="email"
                autoComplete="email"
                disabled={isPendingApproval || !!pendingApprovalRequestId}
                {...register('email')}
                error={errors.email?.message}
              />

              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                disabled={isPendingApproval || !!pendingApprovalRequestId}
                {...register('password')}
                error={errors.password?.message}
              />

              <Button
                type="submit"
                className="w-full"
                loading={isLoading}
                disabled={isLoading || isPendingApproval || !!pendingApprovalRequestId}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {!isPendingApproval && !pendingApprovalRequestId && (
          <div className="text-center text-sm text-gray-600">
            <p className="mb-2 font-medium">Demo Credentials:</p>
            <div className="bg-gray-100 p-3 rounded-md space-y-1">
              <p><strong>Admin:</strong> admin@fmf.com / password123</p>
              <p><strong>CS:</strong> cs@fmf.com / password123</p>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Note: Demo users must be created manually in Supabase Dashboard first.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}