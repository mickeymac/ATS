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
      const result = await login(email, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Invalid email or password. Please try again.');
        setPassword(''); // Clear password on error
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
      setPassword('');
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

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-divider/70 bg-content1/80 backdrop-blur-xl lg:grid-cols-2">
        <div className="hidden border-r border-divider/60 p-10 lg:flex lg:flex-col lg:justify-between">
          <Logo size={42} showText textClassName="text-3xl" />
          <div>
            <h2 className="text-4xl font-bold tracking-tight text-default-900">Welcome back to your hiring command center</h2>
            <p className="mt-4 text-default-600">Track applications, review talent quickly, and collaborate with your team from one place.</p>
          </div>
          <div className="rounded-2xl border border-divider/70 bg-content2/70 p-4 text-sm text-default-600">
            Secure sign-in and role-based permissions keep your pipeline protected.
          </div>
        </div>

        <Card className="h-full rounded-none border-0 bg-transparent shadow-none">
          <CardHeader className="flex flex-col items-center gap-2 pb-0 pt-10">
            <Logo size={44} showText className="mb-2 lg:hidden" textClassName="text-2xl" />
            <h1 className="text-2xl font-bold text-default-900">Sign in</h1>
            <p className="text-sm text-default-500">Access your dashboard and continue your workflow</p>
          </CardHeader>
          <CardBody className="px-8 py-8">
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}
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
            <Input
              label="Password"
              placeholder="Enter your password"
              type="password"
              startContent={<Lock className="text-default-400" size={18} />}
              value={password}
              onValueChange={setPassword}
              isRequired
              isInvalid={!!error}
              classNames={{
                inputWrapper: 'bg-content2/70 border border-divider/60',
              }}
            />
            <div className="flex justify-between items-center text-xs">
              <Link href="#" size="sm" className="text-default-500">Forgot password?</Link>
            </div>
            
            <Button 
              color="primary" 
              type="submit" 
              className="w-full font-semibold shadow-sm"
              isLoading={isLoading}
            >
              {error ? 'Retry' : 'Sign In'}
            </Button>
            
            <p className="text-center text-sm text-default-500">
              New to the platform? Contact your administrator for access.
            </p>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
