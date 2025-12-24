import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import GlassmorphicCard from '@/components/GlassmorphicCard';
import GoldButton from '@/components/GoldButton';
import { Lock, AlertTriangle, CreditCard, LogOut } from 'lucide-react';
import ParticleBackground from '@/components/ParticleBackground';

const Jail = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative p-4 bg-background">
      <ParticleBackground />
      
      <div className="w-full max-w-2xl z-10 animate-fade-in">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="Elitez Club" className="h-20 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Elitez Club Academy</h1>
          <p className="text-muted-foreground">Educational platform for the elite ready for the next level</p>
        </div>

        <GlassmorphicCard className="mb-6 border-red-500/20">
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
              <Lock className="h-10 w-10 text-red-500" />
            </div>
            
            <h2 className="text-2xl font-bold mb-4 text-red-500">Access Suspended</h2>
            
            <div className="flex items-center justify-center mb-6">
              <AlertTriangle className="h-6 w-6 text-gold mr-2" />
              <p className="text-xl font-semibold text-gold">Your Membership Has Expired</p>
            </div>
            
            <p className="text-white/80 mb-6 text-lg">
              Dear {user?.name}, your subscription to Elitez Club Academy has ended.
              To continue accessing all courses and exclusive content, please renew your subscription.
            </p>
            
            <div className="flex flex-col md:flex-row gap-4 w-full max-w-md">
              <GoldButton 
                className="flex items-center justify-center text-lg py-5 flex-1"
                onClick={() => window.open('https://t.me/elitez_club', '_blank')}
              >
                <CreditCard className="mr-2 h-5 w-5" />
                Renew Subscription
              </GoldButton>
              
              <GoldButton 
                variant="outline" 
                className="flex items-center justify-center text-lg py-5 flex-1"
                onClick={() => window.open('https://t.me/elitez_club', '_blank')}
              >
                Request Help
              </GoldButton>
            </div>
            
            <div className="mt-6">
              <GoldButton 
                variant="outline" 
                className="flex items-center justify-center text-lg py-5 flex-1"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-5 w-5" />
                Logout
              </GoldButton>
            </div>
          </div>
        </GlassmorphicCard>
        
        <GlassmorphicCard>
          <div className="p-4">
            <h3 className="text-xl font-bold mb-4 text-center">Why was your access restricted?</h3>
            <ul className="space-y-3 text-white/80">
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gold/20 text-gold mr-2 flex-shrink-0">1</span>
                <span>Your subscription period has ended and was not automatically renewed.</span>
              </li>
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gold/20 text-gold mr-2 flex-shrink-0">2</span>
                <span>Access is automatically restricted upon subscription expiry to ensure service continuity for active members only.</span>
              </li>
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gold/20 text-gold mr-2 flex-shrink-0">3</span>
                <span>You can renew your subscription at any time to continue accessing all content and exclusive features.</span>
              </li>
            </ul>
          </div>
        </GlassmorphicCard>
      </div>
      
      {/* Footer */}
      <div className="mt-8 text-center text-white/40 text-sm z-10">
        © 2026 Elitez Club Academy. All rights reserved.
      </div>
    </div>
  );
};

export default Jail;