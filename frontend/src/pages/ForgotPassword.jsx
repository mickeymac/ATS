import { useState } from 'react';
import { Button, Card, CardBody, CardHeader, Input, Link } from '@nextui-org/react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, KeyRound, ArrowLeft } from 'lucide-react';
import { Logo } from '../components/Logo';
import api from '../services/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setMessage(response.data.message || 'OTP sent successfully. Check your email.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const response = await api.post('/auth/verify-otp', { email, otp });
      setMessage(response.data.message || 'OTP verified.');
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const response = await api.post('/auth/reset-password', { email, otp, new_password: newPassword });
      setMessage(response.data.message || 'Password reset successfully.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      // The password validation error might be a Pydantic Validation Error (an array of details)
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((e) => e.msg).join(' '));
      } else {
        setError(detail || 'Failed to reset password. Ensure it meets complexity requirements.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-secondary/15 blur-3xl" />
      </div>

      <div className="relative grid w-full max-w-md overflow-hidden rounded-3xl border border-divider/70 bg-content1/80 backdrop-blur-xl">
        <Card className="h-full rounded-none border-0 bg-transparent shadow-none">
          <CardHeader className="flex flex-col items-center gap-2 pb-0 pt-10">
            <Logo size={44} showText className="mb-2" textClassName="text-2xl" />
            <h1 className="text-2xl font-bold text-default-900">Reset Password</h1>
            <p className="text-sm text-default-500 text-center px-4">
              {step === 1 && "Enter your email to receive a password reset OTP"}
              {step === 2 && "Enter the 6-digit OTP sent to your email"}
              {step === 3 && "Create a new strong password"}
            </p>
          </CardHeader>
          <CardBody className="px-8 py-8">
            {error && (
              <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger whitespace-pre-line">
                {error}
              </div>
            )}
            
            {message && !error && (
              <div className="mb-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                {message}
              </div>
            )}

            {step === 1 && (
              <form onSubmit={handleSendOTP} className="flex flex-col gap-4">
                <Input
                  label="Email"
                  placeholder="Enter your email"
                  type="email"
                  startContent={<Mail className="text-default-400" size={18} />}
                  value={email}
                  onValueChange={setEmail}
                  isRequired
                  isInvalid={!!error}
                  classNames={{
                    inputWrapper: 'bg-content2/70 border border-divider/60',
                  }}
                />
                <Button 
                  color="primary" 
                  type="submit" 
                  className="w-full font-semibold shadow-sm mt-2"
                  isLoading={isLoading}
                >
                  Send OTP
                </Button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyOTP} className="flex flex-col gap-4">
                <Input
                  label="OTP"
                  placeholder="Enter 6-digit OTP"
                  type="text"
                  startContent={<KeyRound className="text-default-400" size={18} />}
                  value={otp}
                  onValueChange={setOtp}
                  isRequired
                  isInvalid={!!error}
                  maxLength={6}
                  classNames={{
                    inputWrapper: 'bg-content2/70 border border-divider/60 tracking-[0.5em] text-center font-mono',
                    input: 'text-center'
                  }}
                />
                <Button 
                  color="primary" 
                  type="submit" 
                  className="w-full font-semibold shadow-sm mt-2"
                  isLoading={isLoading}
                >
                  Verify OTP
                </Button>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                <Input
                  label="New Password"
                  placeholder="Enter intricate password"
                  type="password"
                  startContent={<Lock className="text-default-400" size={18} />}
                  value={newPassword}
                  onValueChange={setNewPassword}
                  isRequired
                  isInvalid={!!error}
                  classNames={{
                    inputWrapper: 'bg-content2/70 border border-divider/60',
                  }}
                />
                
                <p className="text-xs text-default-500">
                  Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character.
                </p>

                <Button 
                  color="primary" 
                  type="submit" 
                  className="w-full font-semibold shadow-sm mt-2"
                  isLoading={isLoading}
                >
                  Reset Password
                </Button>
              </form>
            )}

            <div className="mt-6 flex justify-center">
              <Button
                variant="light"
                color="default"
                size="sm"
                className="text-default-500"
                startContent={<ArrowLeft size={16} />}
                onPress={() => navigate('/login')}
              >
                Back to Login
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
