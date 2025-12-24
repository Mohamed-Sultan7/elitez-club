
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import MainLayout from '@/components/MainLayout';
import GlassmorphicCard from '@/components/GlassmorphicCard';
import GoldButton from '@/components/GoldButton';
import { Crown, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { getMyProfile } from '@/db/profiles';
import { useActivityLogger } from '@/hooks/useActivityLogger';

const Subscription = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();
  const hasLoggedActivity = useRef(false);
  const [subscriptionData, setSubscriptionData] = useState({
    membershipType: '',
    daysUntilRenewal: 0,
    renewIntervalDays: 30,
    subscriptionDate: '',
    loading: true
  });
  
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      if (!user) {
        setSubscriptionData(prev => ({ ...prev, loading: false }));
        return;
      }
      
      try {
        const profile = await getMyProfile();
        if (profile?.subscriptionDate && profile?.renewIntervalDays) {
          const startDate = new Date(profile.subscriptionDate);
          const endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + (profile.renewIntervalDays || 0));
          const today = new Date();
          const timeDiff = endDate.getTime() - today.getTime();
          const daysLeft = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
          setSubscriptionData({
            membershipType: profile.membershipType || 'TOP G',
            daysUntilRenewal: daysLeft,
            renewIntervalDays: profile.renewIntervalDays || 30,
            subscriptionDate: profile.subscriptionDate || '',
            loading: false
          });
        } else {
          setSubscriptionData({
            membershipType: profile?.membershipType || user.membershipType || 'TOP G',
            daysUntilRenewal: 0,
            renewIntervalDays: 30,
            subscriptionDate: '',
            loading: false
          });
        }
      } catch (error) {
        console.error('Error fetching subscription data:', error);
        toast({
          title: "Error",
          description: "An error occurred while fetching membership data",
          variant: "destructive",
        });
        setSubscriptionData(prev => ({ ...prev, loading: false }));
      }
    };
    
    fetchSubscriptionData();
  }, [user, toast]);

  // Log subscription view activity (only once)
  useEffect(() => {
    if (user && !hasLoggedActivity.current) {
      logActivity('SUBSCRIPTION_VIEW');
      hasLoggedActivity.current = true;
    }
  }, [user, logActivity]);
  
  // Function to get display name for membership type
  const getMembershipDisplayName = (membershipType, renewIntervalDays) => {
    if (membershipType === 'Free Trial') {
      return 'Free Trial';
    }
    
    if (membershipType === 'TOP G - Monthly' || (membershipType === 'TOP G' && renewIntervalDays === 30)) {
      return 'TOP G - Monthly';
    }
    
    if (membershipType === 'TOP G - Annually' || (membershipType === 'TOP G' && renewIntervalDays === 365)) {
      return 'TOP G - Annually';
    }
    
    // Fallback for legacy data
    return membershipType || 'TOP G';
  };

  const progressPercentage = subscriptionData.renewIntervalDays > 0 
    ? (( subscriptionData.daysUntilRenewal) / 30) * 100
    : 0;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">Your Membership</h1>
        {/* Current Subscription Status */}
        <GlassmorphicCard className="mb-8" hover={true}>
          {subscriptionData.loading ? (
            <div className="py-6 text-center">
              <p className="text-white/70">Loading membership data...</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Current Plan: <span className="text-gold">{getMembershipDisplayName(subscriptionData.membershipType, subscriptionData.renewIntervalDays)}</span></h2>
                <p className="text-white/70 mb-4">
                  {subscriptionData.daysUntilRenewal > 0 
                    ? <>Renews in <strong>{subscriptionData.daysUntilRenewal} days</strong></> 
                    : 'No renewal date set'}
                </p>
                <Progress value={progressPercentage} className="w-full max-w-md mb-2" />
              </div>
              <div className="mt-4 md:mt-0">
                <Badge className="bg-gold text-black text-lg py-1 px-4 flex items-center">
                  <Crown className="mr-1 h-5 w-5" /> {getMembershipDisplayName(subscriptionData.membershipType, subscriptionData.renewIntervalDays)} Member
                </Badge>
              </div>
            </div>
          )}
        </GlassmorphicCard>
        
        {/* Upgrade/Renew Assistance */}
        <GlassmorphicCard className="mb-8" hover={true}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div>
              <h2 className="text-xl font-bold mb-2 flex items-center">
                <Crown className="text-gold mr-2 h-5 w-5" /> Upgrade or Renew Membership
              </h2>
              <p className="text-white/70">
                To upgrade or renew your membership, please contact us.
              </p>
            </div>
            <a
              href="https://t.me/elitez_club"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 md:mt-0"
            >
              <GoldButton size="lg">Contact via Telegram</GoldButton>
            </a>
          </div>
        </GlassmorphicCard>
        
        {/* G Points and Payment Methods Sections
        
        <GlassmorphicCard className="mb-12" hover={true}>
          {subscriptionData.loading ? (
            <div className="py-6 text-center">
              <p className="text-white/70">جاري تحميل بيانات النقاط...</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-4 flex items-center"><Star className="text-gold mr-2 h-5 w-5" /> نقاط المكافآت</h2>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <p className="text-white/70">اجمع نقاط مع كل دورة تكملها وكل دعوة ناجحة</p>
                  <p className="text-2xl font-bold text-gold mt-2">1,250 نقطة</p>
                  <p className="text-sm text-white/50">المكافأة التالية عند 2,000 نقطة</p>
                </div>
                <GoldButton className="mt-4 md:mt-0" variant="outline">استبدال النقاط</GoldButton>
              </div>
            </>
          )}
        </GlassmorphicCard>

        <GlassmorphicCard hover={true}>
          {subscriptionData.loading ? (
            <div className="py-6 text-center">
              <p className="text-white/70">جاري تحميل بيانات الدفع...</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-4">طرق الدفع</h2>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-12 h-8 bg-white/10 rounded flex items-center justify-center mr-3">
                    <span className="text-sm font-bold">VISA</span>
                  </div>
                  <div>
                    <p className="font-medium">فيزا تنتهي بـ 4242</p>
                    <p className="text-sm text-white/50">تنتهي في 12/25</p>
                  </div>
                </div>
                <GoldButton variant="outline" size="sm">إدارة</GoldButton>
              </div>
            </>
          )}
        </GlassmorphicCard>
        
        */}
      </div>
    </MainLayout>
  );
};

export default Subscription;
