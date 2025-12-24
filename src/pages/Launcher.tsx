
import React from 'react';
import { Link } from 'react-router-dom';
import GoldButton from '@/components/GoldButton';
import ParticleBackground from '@/components/ParticleBackground';
import { ArrowRight, LogIn } from 'lucide-react';

const Launcher = () => {
  return (
<div className="min-h-screen flex flex-col items-center justify-center relative p-4 bg-background">
    <ParticleBackground />

    <div className="w-full max-w-md z-10 animate-fade-in">
        <div className="mb-8 text-center">
            <img src="/logo.png" alt="Elitez Club" className="h-32 mx-auto mb-6 animate-pulse-slow" />
            <p className="text-xl text-gold">Elitez Club Academy • For The Elite Only</p>
        </div>

        <div className="glass rounded-lg p-8 border border-white/10 animate-fade-in space-y-8">
            <p className="text-center text-white/80 mb-4">
                This is the place for the elite — if you are ready to start the journey
            </p>

            <div className="space-y-8 grid">
                <Link to="/signup">
                    <GoldButton type="button" className="w-full text-lg py-6 flex justify-center">
                        Join Academy Now
                        <ArrowRight className="mr-2" />
                    </GoldButton>
                </Link>

                <Link to="/login" className='margin-top-1rem'>
                <GoldButton type="button" variant="outline" className="w-full text-lg py-6 flex justify-center">
                  Login
                  <LogIn className="mr-2" />
                  </GoldButton>
                </Link>
            </div>
        </div>

        <div className="text-center mt-8 text-white/50">
            © 2025 Elitez Club Academy. All rights reserved.
        </div>
    </div>
</div>

  );
};

export default Launcher;
