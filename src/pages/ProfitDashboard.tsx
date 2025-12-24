import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import MainLayout from '@/components/MainLayout';
import { useToast } from "@/components/ui/use-toast";
import GlassmorphicCard from '@/components/GlassmorphicCard';
import GoldButton from '@/components/GoldButton';
import { ArrowLeft, DollarSign, TrendingUp, Calendar, Plus, Eye, Filter, Edit, Image, X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { listProfits, type Profit } from '@/db/profit';
import { ChartTooltip } from "@/components/ui/chart";
import { XAxis, YAxis, ResponsiveContainer, LineChart, Line } from 'recharts';

interface ProfitEntry {
  id: string;
  amount: number;
  currency: string;
  description: string;
  date: string;
  imageUrls?: string[];
  membershipType?: string;
  paymentMethod?: string;
  customerName?: string;
  addedBy?: string;
}

const ProfitDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profitEntries, setProfitEntries] = useState<ProfitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'month' | 'week'>('all');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

  // List of admin emails that can access this page
  const adminEmails = ['ichrakchraibi5@gmail.com', 'mohamed.sultan.7744@gmail.com', 'toparabg@gmail.com'];

  // Protect the admin page - only accessible by admins
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    } else if (!adminEmails.includes(user.email)) {
      navigate('/home', { replace: true });
      toast({
        title: "Unauthorized",
        description: "You do not have permission to access this page",
        variant: "destructive",
      });
    }
  }, [user, navigate, toast]);

  // Fetch profit data from Supabase
  useEffect(() => {
    const fetchProfitData = async () => {
      try {
        const profits: Profit[] = await listProfits(200);
        const profitData: ProfitEntry[] = profits.map(p => ({
          id: String(p.id),
          amount: p.amount,
          currency: p.currency,
          description: p.description,
          date: (p.metadata?.date as string) || p.createdAt.split('T')[0],
          imageUrls: Array.isArray(p.metadata?.images) ? p.metadata.images : [],
          membershipType: p.metadata?.membershipType || '',
          paymentMethod: p.metadata?.paymentMethod || '',
          customerName: p.metadata?.customerName || '',
          addedBy: p.metadata?.addedBy || ''
        }));
        setProfitEntries(profitData);
      } catch (error) {
        console.error('Error fetching profit data:', error);
        toast({
          title: "Error",
          description: "An error occurred while fetching profit data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user && adminEmails.includes(user.email)) {
      fetchProfitData();
    }
  }, [user, toast]);

  // Calculate metrics based on filter period
  const getFilteredEntries = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

    switch (filterPeriod) {
      case 'month':
        return profitEntries.filter(entry => new Date(entry.date) >= startOfMonth);
      case 'week':
        return profitEntries.filter(entry => new Date(entry.date) >= startOfWeek);
      default:
        return profitEntries;
    }
  };

  const filteredEntries = getFilteredEntries();
  const totalRevenue = profitEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const periodRevenue = filteredEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const averageTransaction = filteredEntries.length > 0 ? periodRevenue / filteredEntries.length : 0;

  // Handle edit transaction
  const handleEditTransaction = (transactionId: string) => {
    navigate(`/admin/edit-profit/${transactionId}`);
  };

  // Handle view images
  const handleViewImages = (imageUrls: string[]) => {
    if (imageUrls && imageUrls.length > 0) {
      setSelectedImages(imageUrls);
      setCurrentImageIndex(0);
    } else {
      toast({
        title: "No Image",
        description: "No image attached to this transaction",
        variant: "destructive",
      });
    }
  };

  // Close image modal
  const closeImageModal = () => {
    setSelectedImages([]);
    setCurrentImageIndex(0);
  };

  // Navigate to previous image
  const previousImage = () => {
    setCurrentImageIndex((prev) => 
      prev > 0 ? prev - 1 : selectedImages.length - 1
    );
  };

  // Navigate to next image
  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev < selectedImages.length - 1 ? prev + 1 : 0
    );
  };

  // Handle keyboard events for modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (selectedImages.length > 0) {
        if (event.key === 'Escape') {
          closeImageModal();
        } else if (event.key === 'ArrowLeft') {
          previousImage();
        } else if (event.key === 'ArrowRight') {
          nextImage();
        }
      }
    };

    if (selectedImages.length > 0) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [selectedImages]);

  // Get membership type breakdown
  const membershipBreakdown = filteredEntries.reduce((acc, entry) => {
    acc[entry.membershipType] = (acc[entry.membershipType] || 0) + entry.amount;
    return acc;
  }, {} as Record<string, number>);

  // Prepare daily revenue data for line chart with continuous date range
  const generateDateRange = (days: number) => {
    const dates = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date.toISOString().split('T')[0]); // YYYY-MM-DD format
    }
    return dates;
  };

  const dailyRevenue = filteredEntries.reduce((acc, entry) => {
    const date = entry.date;
    acc[date] = (acc[date] || 0) + entry.amount;
    return acc;
  }, {} as Record<string, number>);

  // Generate continuous 30-day chart data
  const dateRange = generateDateRange(30);
  const dailyChartData = dateRange.map(date => {
    const amount = dailyRevenue[date] || 0;
    const displayDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { date: displayDate, amount, fullDate: date };
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!user || !adminEmails.includes(user.email)) {
    return null;
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-pulse text-2xl font-bold text-gold">Loading profit data...</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <Link 
              to="/admin" 
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </Link>
            <Link to="/admin/add-profit">
              <GoldButton className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add New Income
              </GoldButton>
            </Link>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-8 h-8 text-gold" />
            <h1 className="text-3xl font-bold text-white">Profit Dashboard</h1>
          </div>
          <p className="text-white/60">View and track profits and revenue from the platform</p>
        </div>

        {/* Filter Period */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-gold" />
            <span className="text-white font-medium">Display Period:</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setFilterPeriod('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filterPeriod === 'all'
                  ? 'bg-gradient-to-r from-gold to-yellow-600 text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setFilterPeriod('month')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filterPeriod === 'month'
                  ? 'bg-gradient-to-r from-gold to-yellow-600 text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setFilterPeriod('week')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filterPeriod === 'week'
                  ? 'bg-gradient-to-r from-gold to-yellow-600 text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              This Week
            </button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <GlassmorphicCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(totalRevenue)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-gold" />
            </div>
          </GlassmorphicCard>

          <GlassmorphicCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">
                  {filterPeriod === 'week' ? 'Weekly Revenue' : 
                   filterPeriod === 'month' ? 'Monthly Revenue' : 'Total Revenue'}
                </p>
                <p className="text-2xl font-bold text-white">{formatCurrency(periodRevenue)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </GlassmorphicCard>

          <GlassmorphicCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Average Transaction</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(averageTransaction)}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-400" />
            </div>
          </GlassmorphicCard>

          <GlassmorphicCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Transactions Count</p>
                <p className="text-2xl font-bold text-white">{filteredEntries.length}</p>
              </div>
              <Eye className="w-8 h-8 text-purple-400" />
            </div>
          </GlassmorphicCard>
        </div>

        {/* Enhanced Profit Analytics Chart * /}
        {dailyChartData.length > 0 && (
          <GlassmorphicCard className="p-8 mb-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-gold/20 to-yellow-400/20 rounded-xl">
                  <TrendingUp className="w-8 h-8 text-gold" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Advanced Profit Analysis</h3>
                  <p className="text-white/60">Revenue trends and financial performance</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-white/60 text-sm">Period Total</p>
                  <p className="text-2xl font-bold text-gold">{formatCurrency(periodRevenue)}</p>
                </div>
                <div className="text-center">
                  <p className="text-white/60 text-sm">Transactions Count</p>
                  <p className="text-2xl font-bold text-white">{filteredEntries.length}</p>
                </div>
              </div>
            </div>
            
            {/* Enhanced Chart * /}
            <div className="h-96 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFD700" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#ffffff80', fontSize: 14, fontWeight: 500 }}
                    tickMargin={15}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#ffffff80', fontSize: 14 }}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                    tickMargin={15}
                  />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-black/90 backdrop-blur-md border border-gold/30 rounded-xl p-4 shadow-2xl">
                            <p className="text-white font-semibold text-lg mb-2">{label}</p>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-gold rounded-full"></div>
                              <p className="text-gold font-bold text-xl">{formatCurrency(payload[0].value as number)}</p>
                            </div>
                            <p className="text-white/70 text-sm mt-1">Daily Revenue</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="url(#goldGradient)" 
                    strokeWidth={4}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      // Only show dot if there's a transaction (amount > 0)
                      if (payload.amount > 0) {
                        return (
                          <circle 
                            cx={cx} 
                            cy={cy} 
                            r={8} 
                            fill="#FFD700" 
                            stroke="#D4AF37" 
                            strokeWidth={3}
                          />
                        );
                      }
                      return null;
                    }}
                    activeDot={{ r: 12, fill: '#FFD700', stroke: '#D4AF37', strokeWidth: 3 }}
                    fill="url(#goldGradient)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Enhanced Statistics Grid * /}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-gold/10 to-yellow-400/5 rounded-xl p-4 border border-gold/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 bg-gold rounded-full"></div>
                  <p className="text-white/70 text-sm font-medium">Daily Average</p>
                </div>
                <p className="text-2xl font-bold text-gold">
                  {formatCurrency(dailyChartData.reduce((sum, day) => sum + day.amount, 0) / dailyChartData.length || 0)}
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-400/5 rounded-xl p-4 border border-green-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <p className="text-white/70 text-sm font-medium">Highest Day</p>
                </div>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(Math.max(...dailyChartData.map(day => day.amount), 0))}
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-400/5 rounded-xl p-4 border border-blue-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <p className="text-white/70 text-sm font-medium">Lowest Day</p>
                </div>
                <p className="text-2xl font-bold text-blue-400">
                  {formatCurrency(Math.min(...dailyChartData.map(day => day.amount), 0))}
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500/10 to-violet-400/5 rounded-xl p-4 border border-purple-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <p className="text-white/70 text-sm font-medium">Average Transaction</p>
                </div>
                <p className="text-2xl font-bold text-purple-400">
                  {formatCurrency(averageTransaction)}
                </p>
              </div>
            </div>
            
            {/* Performance Indicator * /}
            <div className="mt-6 p-4 bg-gradient-to-r from-gold/5 to-yellow-400/5 rounded-xl border border-gold/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-gold rounded-full animate-pulse"></div>
                  <p className="text-white font-medium">Financial Performance</p>
                </div>
                <div className="flex items-center gap-2">
                  {dailyChartData.length >= 2 && dailyChartData[dailyChartData.length - 1].amount > dailyChartData[dailyChartData.length - 2].amount ? (
                    <>
                      <TrendingUp className="w-5 h-5 text-green-400" />
                      <span className="text-green-400 font-semibold">Uptrend</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-5 h-5 text-red-400 rotate-180" />
                      <span className="text-red-400 font-semibold">Downtrend</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </GlassmorphicCard>
        )}
         {/* Enhanced Profit Analytics Chart */}

        {/* Recent Transactions */}
        <GlassmorphicCard className="p-6">
          <h3 className="text-xl font-bold text-white mb-4">Recent Transactions</h3>
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-16 h-16 text-white/40 mx-auto mb-4" />
              <h4 className="text-lg font-bold text-white mb-2">No transactions</h4>
              <p className="text-white/60">No transactions found in the selected period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-white/60 font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-white/60 font-medium">Customer Name</th>
                    <th className="text-left py-3 px-4 text-white/60 font-medium">Description</th>
                    <th className="text-left py-3 px-4 text-white/60 font-medium">Membership Type</th>
                    <th className="text-left py-3 px-4 text-white/60 font-medium">Payment Method</th>
                    <th className="text-left py-3 px-4 text-white/60 font-medium">Amount</th>
                    <th className="text-center py-3 px-4 text-white/60 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.slice(0, 10).map((entry) => (
                    <tr key={entry.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 text-white">{formatDate(entry.date)}</td>
                      <td className="py-3 px-4 text-white">{entry.customerName || 'Undefined'}</td>
                      <td className="py-3 px-4 text-white">{entry.description}</td>
                      <td className="py-3 px-4 text-white">{entry.membershipType}</td>
                      <td className="py-3 px-4 text-white">{entry.paymentMethod}</td>
                      <td className="py-3 px-4 text-gold font-bold">{formatCurrency(entry.amount)}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewImages(entry.imageUrls || [])}
                            className={`p-2 rounded-lg transition-colors relative ${
                              entry.imageUrls && entry.imageUrls.length > 0
                                ? 'bg-blue-500/20 hover:bg-blue-500/30' 
                                : 'bg-gray-500/20 hover:bg-gray-500/30 opacity-50'
                            }`}
                            title={entry.imageUrls && entry.imageUrls.length > 0 ? `View Images (${entry.imageUrls.length})` : "No Image"}
                          >
                            <Image className={`w-4 h-4 ${
                              entry.imageUrls && entry.imageUrls.length > 0 ? 'text-blue-400' : 'text-gray-400'
                            }`} />
                            {entry.imageUrls && entry.imageUrls.length > 1 && (
                              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                {entry.imageUrls.length}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => handleEditTransaction(entry.id)}
                            className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-lg transition-colors"
                            title="Edit Transaction"
                          >
                            <Edit className="w-4 h-4 text-yellow-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassmorphicCard>
      </div>

      {/* Image Modal Overlay */}
      {selectedImages.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={closeImageModal}
        >
          <div 
            className="relative max-w-6xl max-h-full bg-white/10 backdrop-blur-md rounded-lg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Action Buttons */}
            <div className="absolute -top-2 -right-2 flex gap-2 z-10">
              {/* Download Button */}
              <a
                href={selectedImages[currentImageIndex]}
                download
                className="w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-colors"
                title="Download Image"
              >
                <Download className="w-4 h-4" />
              </a>
              
              {/* Close Button */}
              <button
                onClick={closeImageModal}
                className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Arrows */}
            {selectedImages.length > 1 && (
              <>
                {/* Previous Button */}
                <button
                  onClick={previousImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors z-10"
                  title="Previous Image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                {/* Next Button */}
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors z-10"
                  title="Next Image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Image Counter */}
            {selectedImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm z-10">
                {currentImageIndex + 1} / {selectedImages.length}
              </div>
            )}
            
            {/* Image */}
            <img 
              src={selectedImages[currentImageIndex]} 
              alt={`Transaction Image ${currentImageIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onError={(e) => {
                toast({
                  title: "Image Load Error",
                  description: "Cannot display image",
                  variant: "destructive",
                });
                closeImageModal();
              }}
            />
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default ProfitDashboard;
