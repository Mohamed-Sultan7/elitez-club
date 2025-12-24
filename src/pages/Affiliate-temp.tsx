
import React from 'react';
import MainLayout from '@/components/MainLayout';
import GlassmorphicCard from '@/components/GlassmorphicCard';
import GoldButton from '@/components/GoldButton';
import { Copy, TrendingUp, Award, Crown, DollarSign, Users, Link } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';

const topAffiliates = [
  { id: 1, name: "Queen Ishraq", referrals: 28, earnings: "$5,600" },
  { id: 2, name: "Pretty Ishraq", referrals: 24, earnings: "$4,800" },
  { id: 3, name: "Smart Ishraq", referrals: 19, earnings: "$3,800" },
  { id: 4, name: "Sweet Ishraq", referrals: 15, earnings: "$3,000" },
  { id: 5, name: "Chouchou Ishraq", referrals: 12, earnings: "$2,400" },
];

const Affiliate = () => {
  const { toast } = useToast();
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://app.elitez.club/signup?ref=ahmed-k");
    toast({
      title: "Link Copied",
      description: "Your affiliate link has been copied to clipboard.",
    });
  };
  
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <section className="mb-16 text-center">
  <h1 className="text-4xl md:text-5xl font-bold mb-6">
    <span className="text-gold">Earn</span> Like the Elites
  </h1>
  <p className="text-xl text-white/80 max-w-2xl mx-auto mb-8">
    Spread the impact, share the opportunity.  
    Get 20% commission for every new member you introduce to the Elitez Club world.
  </p>
</section>

        
        {/* Stats Overview */}
        <section className="mb-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassmorphicCard className="animate-fade-in">
            <div className="flex items-center">
              <div className="h-12 w-12 rounded-full bg-gold/20 flex items-center justify-center mr-4">
                <DollarSign className="h-6 w-6 text-gold" />
              </div>
              <div>
                <p className="text-white/60">Total Earnings</p>
                <h3 className="text-2xl font-bold">$2,340.00</h3>
              </div>
            </div>
          </GlassmorphicCard>
          
          <GlassmorphicCard className="animate-fade-in delay-100">
            <div className="flex items-center">
              <div className="h-12 w-12 rounded-full bg-gold/20 flex items-center justify-center mr-4">
                <Users className="h-6 w-6 text-gold" />
              </div>
              <div>
                <p className="text-white/60">Total Referrals</p>
                <h3 className="text-2xl font-bold">12</h3>
              </div>
            </div>
          </GlassmorphicCard>
          
          <GlassmorphicCard className="animate-fade-in delay-200">
            <div className="flex items-center">
              <div className="h-12 w-12 rounded-full bg-gold/20 flex items-center justify-center mr-4">
                <TrendingUp className="h-6 w-6 text-gold" />
              </div>
              <div>
                <p className="text-white/60">Conversion Rate</p>
                <h3 className="text-2xl font-bold">32%</h3>
              </div>
            </div>
          </GlassmorphicCard>
        </section>
        
        {/* Referral Link */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Your Affiliate Link</h2>
          
          <GlassmorphicCard className="animate-fade-in">
            <div className="flex flex-col md:flex-row items-center">
              <div className="mb-4 md:mb-0 md:ml-4 flex-grow w-full">
                <div className="relative">
                  <Link className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60" />
                  <input 
                    type="text" 
                    value="https://app.elitez.club/signup?ref=id" 
                    readOnly
                    className="w-full pl-4 pr-4 py-3 bg-black/40 border border-white/10 rounded-md text-white/80 text-left"
                  />
                </div>
              </div>
              
              <div className="flex space-x-4">
                <GoldButton onClick={handleCopyLink}>
                  Copy Link
                  <Copy className="mr-0 mr-2 h-4 w-4" />
                </GoldButton>
              </div>
            </div>
          </GlassmorphicCard>
        </section>
        
        {/* Monthly Performance */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Monthly Performance</h2>
          
          <GlassmorphicCard className="animate-fade-in">
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-2">April 2025</h3>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <p className="text-white/60 mb-1">Monthly Goal</p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold">10 Referrals</span>
                    <span className="text-gold">3 / 10</span>
                  </div>
                  <Progress value={30} className="bg-white/10 h-2" />
                </div>
                
                <div className="flex-1">
                  <p className="text-white/60 mb-1">Earnings Goal</p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold">$2,000</span>
                    <span className="text-gold">$600 / $2,000</span>
                  </div>
                  <Progress value={30} className="bg-white/10 h-2" />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/60 text-sm">Today</p>
                <p className="font-bold">$120</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/60 text-sm">This Week</p>
                <p className="font-bold">$460</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/60 text-sm">This Month</p>
                <p className="font-bold">$600</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/60 text-sm">Last Month</p>
                <p className="font-bold">$1,740</p>
              </div>
            </div>
          </GlassmorphicCard>
        </section>
        
        {/* Leaderboard */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Top Affiliates</h2>
          
          <GlassmorphicCard className="animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left pb-4 pr-4">Rank</th>
                    <th className="text-left pb-4">Name</th>
                    <th className="text-left pb-4">Referrals</th>
                    <th className="text-left pb-4 pl-4">Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {topAffiliates.map((affiliate, index) => (
                    <tr key={affiliate.id} className="border-b border-white/5">
                      <td className="py-4 pr-4">
                        {index < 3 ? (
                          <div className="h-8 w-8 rounded-full bg-gold/20 flex items-center justify-center">
                            <Crown className={`h-4 w-4 ${index === 0 ? 'text-gold' : 'text-white/60'}`} />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                            <span className="text-white/80">{index + 1}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 font-medium">{affiliate.name}</td>
                      <td className="py-4 text-left">{affiliate.referrals}</td>
                      <td className="py-4 text-left pl-4 font-medium">{affiliate.earnings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-white/60 mb-2">Your Current Rank: #8</p>
              <p className="text-sm">You need 4 more referrals to reach Rank #5</p>
            </div>
          </GlassmorphicCard>
        </section>
      </div>
    </MainLayout>
  );
};

export default Affiliate;
