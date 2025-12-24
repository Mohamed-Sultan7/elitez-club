
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GoldButton from '@/components/GoldButton';
import ParticleBackground from '@/components/ParticleBackground';
import { LogIn, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, user, isMembershipExpired } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (isMembershipExpired) {
        navigate('/jail', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    }
  }, [user, isMembershipExpired, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      document.body.classList.add('success-login');
      setTimeout(() => {
        // Check if membership is expired and redirect accordingly
        if (isMembershipExpired) {
          navigate('/jail');
        } else {
          navigate('/home');
        }
      }, 1000);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative p-4 bg-background">
      <ParticleBackground />
      
      <div className="w-full max-w-md z-10 animate-fade-in">
      <div className="mb-8 text-center">
        <img src="/logo.png" alt="Elitez Club" className="h-20 mx-auto mb-4 animate-pulse-slow" />
        <h1 className="font-size-2rem font-bold text-white mb-1rem">Elitez Club Academy</h1>
        <p className="text-muted-foreground">Educational platform for the elite ready for the next level</p>
      </div>


        <div className="glass rounded-lg p-8 border border-white/10 animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-white/10 bg-black/40 focus:border-gold text-white text-left"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-white/10 bg-black/40 focus:border-gold text-white text-left pl-2"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-gold transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <GoldButton
                type="submit"
                className="w-full text-lg py-6"
                loading={loading}
              >
                <LogIn className="mr-2" />
                Login to Academy
              </GoldButton>
            </div>
            <Link to="/signup" className='mt-1rem block'>
               <p className="text-center text-gold"> Don't have an account? Sign Up</p>
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
