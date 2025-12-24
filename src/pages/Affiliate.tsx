import React, { useEffect, useRef } from 'react';
import MainLayout from '@/components/MainLayout';
import GlassmorphicCard from '@/components/GlassmorphicCard';
import GoldButton from '@/components/GoldButton';
import { ArrowRight } from 'lucide-react';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { useAuth } from '@/context/AuthContext';

const Affiliate = () => {
  const { user } = useAuth();
  const { logActivity } = useActivityLogger();
  const hasLoggedActivity = useRef(false);

  // Log affiliate view activity (only once)
  useEffect(() => {
    if (user && !hasLoggedActivity.current) {
      logActivity('AFFILIATE_VIEW');
      hasLoggedActivity.current = true;
    }
  }, [user, logActivity]);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-20 min-h-[80vh] flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <GlassmorphicCard className="text-center animate-fade-in">
            <div className="py-10 px-6 md:px-12">
              <h1 className="text-3xl md:text-4xl font-bold mb-6">
                <span className="text-gold">Affiliate Program</span> Coming Soon
              </h1>
              
              <p className="text-xl text-white/80 mb-8 leading-relaxed">
              We are currently developing a new and exclusive affiliate program.
              If you are interested in inviting your friends and earning a commission, or would like to start collaborating with us before the official launch, please contact us directly.
              </p>
              
              <a 
                href="https://t.me/elitez_club" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block"
              >
                <GoldButton size="lg" className="text-lg px-8 py-6 animate-pulse-slow">
                  Contact Us <ArrowRight className="mr-2" />
                </GoldButton>
              </a>
            </div>
          </GlassmorphicCard>
        </div>
      </div>
    </MainLayout>
  );
};

export default Affiliate;