
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, Hotel, Clock } from 'lucide-react';
import { checkRateLimit, clearRateLimit, isValidEmail, sanitizeInput, logSecurityEvent } from '@/utils/securityUtils';

const Auth = () => {
  const { user, profile, signIn, signUp, signOut, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'user',
    hotelName: ''
  });

  // Show loading while authentication is being initialized
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <CardTitle className="text-xl font-bold">Loading...</CardTitle>
            <CardDescription>
              Checking authentication status...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // If user is logged in and profile is active, redirect to main page
  if (user && profile?.status === 'active') {
    return <Navigate to="/" replace />;
  }

  // If user is logged in but account is paused
  if (user && profile?.status === 'paused') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Clock className="w-16 h-16 mx-auto mb-4 text-orange-500" />
            <CardTitle className="text-2xl font-bold">Account Pending Approval</CardTitle>
            <CardDescription className="text-center">
              Your admin account is awaiting approval from the super admin. Please wait for activation or contact support.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Account Details:</strong>
                </p>
                <p className="text-sm">Name: {profile?.name}</p>
                <p className="text-sm">Role: {profile?.role}</p>
                {profile?.hotel_name && <p className="text-sm">Hotel: {profile?.hotel_name}</p>}
                <p className="text-sm">Status: <span className="text-orange-600 font-medium">Pending Approval</span></p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={signOut}
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user is logged in but account is deleted
  if (user && profile?.status === 'deleted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <CardTitle className="text-2xl font-bold text-red-600">Account Deactivated</CardTitle>
            <CardDescription className="text-center">
              Your account has been deactivated by the administrator. Please contact support for assistance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={signOut}
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user is logged in but profile is not loaded yet, show loading
  if (user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <CardTitle className="text-xl font-bold">Setting up your account...</CardTitle>
            <CardDescription>
              Please wait while we prepare your dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for a password reset link.",
      });
      setIsForgotPassword(false);
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting check - prevent brute force attacks
    if (!checkRateLimit('login_attempt', 5, 60000)) {
      logSecurityEvent('LOGIN_RATE_LIMITED', { email: formData.email });
      toast({
        title: "Too Many Attempts",
        description: "Please wait 1 minute before trying again.",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    if (!isValidEmail(formData.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          logSecurityEvent('LOGIN_FAILED', { email: formData.email, reason: error.message });
          if (error.message?.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password. Please check your credentials and try again.');
          }
          throw error;
        }

        // Clear rate limit on successful login
        clearRateLimit('login_attempt');
        toast({
          title: "Welcome back!",
          description: "Successfully signed in.",
        });
      } else {
        if (formData.role === 'admin' && !formData.hotelName.trim()) {
          throw new Error('Hotel name is required for admin accounts');
        }

        const { error } = await signUp(
          formData.email,
          formData.password,
          formData.name,
          formData.role,
          formData.hotelName
        );

        if (error) {
          if (error.message?.includes('User already registered')) {
            throw new Error('An account with this email already exists. Please sign in instead or use a different email address.');
          }
          throw error;
        }

        if (formData.role === 'admin') {
          toast({
            title: "Registration Successful!",
            description: "Your admin account is pending approval. You'll be notified once activated.",
          });
        } else {
          toast({
            title: "Account Created!",
            description: "Successfully created your account.",
          });
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: "Error",
        description: error.message || "An error occurred during authentication.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Hotel className="w-16 h-16 mx-auto mb-4 text-primary" />
          <CardTitle className="text-2xl font-bold">
            {isForgotPassword ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Create Account')}
          </CardTitle>
          <CardDescription>
            {isForgotPassword
              ? 'Enter your email to receive a password reset link'
              : (isLogin
                ? 'Sign in to access your POS system'
                : 'Register for Hotel ZEN POS Management'
              )
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} className="space-y-4">
            {!isLogin && !isForgotPassword && (
              <>
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <Label htmlFor="role">Account Type</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Staff Member</SelectItem>
                      <SelectItem value="admin">Hotel Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.role === 'admin' && (
                  <div>
                    <Label htmlFor="hotelName">Hotel Name</Label>
                    <Input
                      id="hotelName"
                      type="text"
                      value={formData.hotelName}
                      onChange={(e) => setFormData(prev => ({ ...prev, hotelName: e.target.value }))}
                      required
                      placeholder="Enter your hotel name"
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
                placeholder="Enter your email"
              />
            </div>

            {!isForgotPassword && (
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    placeholder="Enter your password"
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : (isForgotPassword ? 'Send Reset Link' : (isLogin ? 'Sign In' : 'Create Account'))}
            </Button>

            {isLogin && !isForgotPassword && (
              <Button
                type="button"
                variant="link"
                onClick={() => setIsForgotPassword(true)}
                className="w-full text-sm"
              >
                Forgot password?
              </Button>
            )}
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => {
                if (isForgotPassword) {
                  setIsForgotPassword(false);
                } else {
                  setIsLogin(!isLogin);
                  setFormData({ email: '', password: '', name: '', role: 'user', hotelName: '' });
                }
              }}
              className="text-sm"
            >
              {isForgotPassword
                ? 'Back to sign in'
                : (isLogin
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'
                )
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
