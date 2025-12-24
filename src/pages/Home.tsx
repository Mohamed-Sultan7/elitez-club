
import React, { useEffect, useState, useRef } from 'react';
import MainLayout from '@/components/MainLayout';
import GoldButton from '@/components/GoldButton';
import GlassmorphicCard from '@/components/GlassmorphicCard';
import { Play, ArrowRight, Crown, Star, CreditCard, User, MessageCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ParticleBackground from '@/components/ParticleBackground';
import { format } from 'date-fns';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { useAuth } from '@/context/AuthContext';
import { listDailyDrops, DailyDrop } from '@/db/dailyDrops';
import { getContinueLearningCard, ContinueLearningCard } from '@/db/progress';

const testimonials = [
  {
    name: "زياد ن",
    role: "مؤسس وكالة تسويق",
    content: "كنت أبحث عن منصة تصقل مهاراتي وتفتح لي أبواب جديدة... طوب عرب جي قدّمت لي أكثر مما توقعت. أول شهر فقط، دخلت سوقًا جديدة وحققت أول 10,000 دولار.",
    image: "https://randomuser.me/api/portraits/men/31.jpg"
  },
  {
    name: "سيف ت",
    role: "رائد أعمال رقمي",
    content: "لا يوجد مكان يعلّمك كيف تبني دخلًا حقيقيًا بهذه السرعة وبهذا الوضوح. كل درس كنت أطبقه مباشرة، وكل أداة ساعدتني أرفع من دخلي وتوسّع مشروعي.",
    image: "https://randomuser.me/api/portraits/men/32.jpg"
  },
  {
    name: "آدم س",
    role: "مستشار استثماري",
    content: "طوب عرب جي ليست مجرد أكاديمية، إنها نظام كامل لإعادة بناء الذات. من العقلية، للمال، للعلاقات — التجربة أعادت ضبط حياتي بالكامل.",
    image: "https://randomuser.me/api/portraits/men/47.jpg"
  }
];

// Interface for daily motivation drop
// Removed local interface definition in favor of imported type

const Home = () => {
  const [todaysDrop, setTodaysDrop] = useState<DailyDrop | null>(null);
  const [loadingDrop, setLoadingDrop] = useState(true);
  const [continueLearning, setContinueLearning] = useState<ContinueLearningCard | null>(null);
  const [loadingContinue, setLoadingContinue] = useState(true);
  const { user } = useAuth();
  const { logActivity } = useActivityLogger();
  const hasLoggedActivity = useRef(false);

  // Log activity when user visits the home page
  useEffect(() => {
    if (user && !hasLoggedActivity.current) {
      logActivity('HOME_VIEW');
      hasLoggedActivity.current = true;
    }
  }, [user]);

  // Fetch continue learning card
  useEffect(() => {
    const fetchContinueLearning = async () => {
      if (!user) {
        setLoadingContinue(false);
        return;
      }
      try {
        const card = await getContinueLearningCard();
        setContinueLearning(card);
      } catch (error) {
        console.error('Error fetching continue learning:', error);
      } finally {
        setLoadingContinue(false);
      }
    };
    fetchContinueLearning();
  }, [user]);

  // Fetch the latest daily drop
  useEffect(() => {
    const fetchLatestDrop = async () => {
      try {
        const drops = await listDailyDrops();
        
        if (drops.length > 0) {
          setTodaysDrop(drops[0]);
        }
      } catch (error) {
        console.error('Error fetching daily drop:', error);
      } finally {
        setLoadingDrop(false);
      }
    };
    
    fetchLatestDrop();
  }, []);

  useEffect(() => {
    // Animate elements as they appear
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in');
          }
        });
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
      }
    );

    document.querySelectorAll('.reveal').forEach((el) => {
      observer.observe(el);
    });

    return () => {
      document.querySelectorAll('.reveal').forEach((el) => {
        observer.unobserve(el);
      });
    };
  }, []);

  return (
    <MainLayout>
      <ParticleBackground />
      
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center py-20 px-4">
        <div className="container mx-auto text-center z-10">
          <div className="inline-block mb-6">
            <Crown className="h-16 w-16 text-gold mx-auto animate-pulse-slow" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
            Your journey from inside the Matrix
            <br></br>
            <span className="text-gold"> to controlling it</span>
          </h1>

          <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-10 animate-fade-in delay-100">
            We give you the tools, knowledge, and practical steps to build your income, enhance your power, and control your future. Learn. Evolve. Dominate.
          </p>
          
          <div className="flex flex-col items-center gap-6 animate-fade-in delay-200">
            <Link to="/courses">
               <GoldButton size="lg" className="text-xl px-10 py-6 animate-glow">
                 Browse Courses <ArrowRight className="mr-2" />
               </GoldButton>
            </Link>

            {/* Continue Learning Card - Only show if available */}
            {!loadingContinue && continueLearning && (
              <div className="w-full max-w-md mt-4 animate-fade-in">
                <Link to={`/course/${continueLearning.courseId}/module/${continueLearning.moduleId}/lesson/${continueLearning.lessonId}`}>
                  <GlassmorphicCard className="hover:border-gold/50 transition-all group cursor-pointer">
                    <div className="flex items-center p-4">
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 mr-4 border border-white/10">
                        {continueLearning.courseThumbnail ? (
                          <img 
                            src={continueLearning.courseThumbnail} 
                            alt={continueLearning.courseTitle} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gold/20 flex items-center justify-center">
                            <Crown className="w-8 h-8 text-gold" />
                          </div>
                        )}
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-gold text-xs font-bold uppercase tracking-wider mb-1">Continue Learning</p>
                        <h3 className="text-white font-bold truncate group-hover:text-gold transition-colors">
                          {continueLearning.lessonTitle}
                        </h3>
                        <p className="text-white/60 text-sm truncate">
                          {continueLearning.courseTitle} • {continueLearning.moduleTitle}
                        </p>
                      </div>
                      <div className="ml-2 bg-gold/10 p-2 rounded-full group-hover:bg-gold group-hover:text-black transition-all">
                        <Play className="w-4 h-4 fill-current" />
                      </div>
                    </div>
                  </GlassmorphicCard>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Today's Advice Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-16 text-center reveal opacity-0">
            Tip of the <span className="text-gold">Day</span>
          </h2>
          
          <div className="max-w-3xl mx-auto reveal opacity-0">
            <GlassmorphicCard className="h-full">
              {loadingDrop ? (
                <div className="flex flex-col items-center justify-center p-10 h-48">
                  <Loader2 className="h-10 w-10 text-gold animate-spin" />
                  <p className="mt-4 text-white/70">Loading today's tip...</p>
                </div>
              ) : todaysDrop ? (
                <div className="p-6 no-side-padding-mobile">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center mr-4">
                      <img src="/favicon.png" alt="Elitez Club" className="h-10 w-auto" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Message from Elitez Club</h3>
                      <p className="text-white/60 text-sm">
                        {todaysDrop.customDate 
                          ? format(new Date(todaysDrop.customDate), 'dd MMMM yyyy')
                          : format(new Date(todaysDrop.createdAt), 'dd MMMM yyyy')}
                      </p>
                    </div>
                  </div>
                  
                  {todaysDrop.image && (
                    <div className="mb-6 rounded-lg overflow-hidden">
                      <img 
                        src={todaysDrop.image} 
                        alt="Motivational Image" 
                        className="w-full h-auto object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  
                  <div className="mb-6">
                    <p className="text-white/90 text-lg leading-relaxed">{todaysDrop.text}</p>
                  </div>
                  
                  <div className="flex justify-end">
                    <Link to="/daily-motivation">
                      <GoldButton variant="outline" size="sm">
                        View More Tips <ArrowRight className="mr-2 h-4 w-4" />
                      </GoldButton>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-10 h-48">
                  <p className="text-white/70">No tips available currently</p>
                </div>
              )}
            </GlassmorphicCard>
          </div>
        </div>
      </section>
      
      {/* Three Pillars Section */}
      <section className="py-20 px-4 relative">
         <div className="container mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-16 text-center reveal opacity-0">
      <span className="text-gold">The Three Pillars</span> of Elitez Club Success
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Pillar 1 */}
      <div className="reveal opacity-0">
        <GlassmorphicCard className="h-full">
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mb-6">
              <Crown className="w-8 h-8 text-gold" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Mindset</h3>
            <p className="text-white/70 mb-4">
              Develop an exceptional thinking style. Get rid of failure patterns, and adopt a results-oriented leadership mindset.
            </p>
            <ul className="text-left text-white/60 space-y-2 mb-6 w-full">
              <li className="flex items-center">
                <Star className="w-4 h-4 text-gold mr-2" />
                Mental Toughness Training
              </li>
              <li className="flex items-center">
                <Star className="w-4 h-4 text-gold mr-2" />
                Emotional Control Under Pressure
              </li>
              <li className="flex items-center">
                <Star className="w-4 h-4 text-gold mr-2" />
                Critical Thinking and Smart Decision Making
              </li>
            </ul>
          </div>
        </GlassmorphicCard>
      </div>

      {/* Pillar 2 */}
      <div className="reveal opacity-0" style={{ animationDelay: '150ms' }}>
        <GlassmorphicCard className="h-full">
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mb-6">
              <CreditCard className="w-8 h-8 text-gold" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Money</h3>
            <p className="text-white/70 mb-4">
              Discover wealth-building secrets in the digital age. Clear strategies, tangible results.
            </p>
            <ul className="text-left text-white/60 space-y-2 mb-6 w-full">
              <li className="flex items-center">
                <Star className="w-4 h-4 text-gold mr-2" />
                Smart Low-Risk Investments
              </li>
              <li className="flex items-center">
                <Star className="w-4 h-4 text-gold mr-2" />
                Business Models Ready for Rapid Growth
              </li>
              <li className="flex items-center">
                <Star className="w-4 h-4 text-gold mr-2" />
                Building Sustainable Passive Income
              </li>
            </ul>
          </div>
        </GlassmorphicCard>
      </div>

      {/* Pillar 3 */}
      <div className="reveal opacity-0" style={{ animationDelay: '300ms' }}>
        <GlassmorphicCard className="h-full">
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mb-6">
              <User className="w-8 h-8 text-gold" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Environment</h3>
            <p className="text-white/70 mb-4">
              Be part of an elite network that pushes you forward, opening doors to high-value opportunities and relationships.
            </p>
            <ul className="text-left text-white/60 space-y-2 mb-6 w-full">
              <li className="flex items-center">
                <Star className="w-4 h-4 text-gold mr-2" />
                Special Meetings and Events
              </li>
              <li className="flex items-center">
                <Star className="w-4 h-4 text-gold mr-2" />
                Business Opportunities and Direct Collaboration
              </li>
              <li className="flex items-center">
                <Star className="w-4 h-4 text-gold mr-2" />
                Daily Support and Motivation Network
              </li>
            </ul>
          </div>
        </GlassmorphicCard>
      </div>
            </div>
         </div>
      </section>
      
      {/* Testimonials Section */}
      {/*<section className="py-20 px-4 relative overflow-hidden">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-16 text-center reveal opacity-0">
            Success <span className="text-gold">Stories</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="reveal opacity-0" style={{ animationDelay: `${index * 150}ms` }}>
                <GlassmorphicCard className="h-full">
                  <div className="flex flex-col h-full">
                    <div className="mb-6">
                      <div className="flex mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-5 h-5 text-gold" fill="#D4AF37" />
                        ))}
                      </div>
                      <p className="text-white/80 italic mb-6">"{testimonial.content}"</p>
                    </div>
                    <div className="flex items-center mt-auto">
                      <div className="w-12 h-12 rounded-full mr-4 overflow-hidden">
                        <img 
                          src={testimonial.image} 
                          alt={testimonial.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="font-bold">{testimonial.name}</h4>
                        <p className="text-white/60 text-sm">{testimonial.role}</p>
                      </div>
                    </div>
                  </div>
                </GlassmorphicCard>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-16 reveal opacity-0">
            <Link to="/courses">
            <GoldButton size="lg">
              Start Now and Begin the Change <ArrowRight className="mr-2" />
            </GoldButton>

            </Link>
          </div>
        </div>
      </section>*/}
    </MainLayout>
  );
};

export default Home;
