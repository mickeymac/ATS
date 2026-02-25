import { useState } from 'react';
import { Button, Card, CardBody, CardHeader, Input, Link } from '@nextui-org/react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock } from 'lucide-react';
import { Logo } from '../components/Logo';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Invalid email or password');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-default-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="flex flex-col items-center gap-2 pb-0 pt-8">
          <Logo size={48} showText className="mb-2" textClassName="text-2xl" />
          <h1 className="text-2xl text-default-800 font-bold">Welcome back</h1>
          <p className="text-sm text-default-500">Sign in to your account to continue</p>
        </CardHeader>
        <CardBody className="px-8 py-8">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <Input
              label="Email"
              placeholder="Enter your email"
              type="email"
              startContent={<Mail className="text-default-400" size={18} />}
              value={email}
              onValueChange={setEmail}
              isRequired
              isInvalid={!!error}
            />
            <Input
              label="Password"
              placeholder="Enter your password"
              type="password"
              startContent={<Lock className="text-default-400" size={18} />}
              value={password}
              onValueChange={setPassword}
              isRequired
              isInvalid={!!error}
              errorMessage={error}
            />
            <div className="flex justify-between items-center text-xs">
              <Link href="#" size="sm" className="text-default-500">Forgot password?</Link>
            </div>
            
            <Button 
              color="primary" 
              type="submit" 
              className="w-full font-semibold"
              isLoading={isLoading}
            >
              Sign In
            </Button>
            
            <p className="text-center text-sm text-default-500">
              Don't have an account?{' '}
              <RouterLink to="/register" className="text-primary font-medium hover:underline">
                Sign up
              </RouterLink>
            </p>
            
            <div className="mt-4 rounded-lg bg-default-100 p-3 text-xs text-default-500">
              <p className="font-semibold mb-1">Demo Credentials:</p>
              <p>Email: admin@tecnolegacy.com</p>
              <p>Password: admin</p>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
