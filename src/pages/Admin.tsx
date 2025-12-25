import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import MainLayout from '@/components/MainLayout';
import { useToast } from "@/components/ui/use-toast";
import GlassmorphicCard from '@/components/GlassmorphicCard';
import { Users, BookOpen, Eye, MessageCircle, Headphones, DollarSign } from 'lucide-react';
import { supportService } from '@/services/supportService';

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [unreadCount, setUnreadCount] = useState(0);

  // List of admin emails that can access this page
  const adminEmails = ['ichrakchraibi5@gmail.com', 'mohamed.sultan.7744@gmail.com', 'elitez.club7@gmail.com'];
  
  // Protect the admin page - only accessible by admins
  useEffect(() => {
    if (!user) {
      // If not logged in, redirect to login
      navigate('/login', { replace: true });
    } else if (!adminEmails.includes(user.email)) {
      // If logged in but not admin, redirect to home
      navigate('/home', { replace: true });
      toast({
        title: "Unauthorized",
        description: "You do not have permission to access this page",
        variant: "destructive",
      });
    }
  }, [user, navigate, toast]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = supportService.subscribeToGlobalUnread(user.uid, true, (count) => setUnreadCount(count));
    return () => {
      unsubscribe();
    };
  }, [user]);

  // If user is not loaded yet or not admin, show nothing
  if (!user || !adminEmails.includes(user.email)) {
    return null;
  }

  const adminOptions = [
    {
      title: "Student Management",
      description: "Add, edit, and manage student accounts and subscriptions",
      icon: <Users className="w-12 h-12 text-gold" />,
      path: "/admin/manage-students"
    },
    {
      title: "Content Management",
      description: "Add and edit courses, modules, and lessons",
      icon: <BookOpen className="w-12 h-12 text-gold" />,
      path: "/admin/manage-content"
    },
    {
      title: "Student Monitoring",
      description: "View and monitor student activities and platform interaction logs",
      icon: <Eye className="w-12 h-12 text-gold" />,
      path: "/admin/monitor-students"
    },
    {
      title: "Comments Management",
      description: "View and manage all comments on the platform from all courses and modules",
      icon: <MessageCircle className="w-12 h-12 text-gold" />,
      path: "/admin/all-comments"
    },
    {
      title: "Profit Tracking",
      description: "View and track platform profits and revenue, and add new transactions",
      icon: <DollarSign className="w-12 h-12 text-gold" />,
      path: "/admin/profit-dashboard"
    },
    {
      title: "Technical Support",
      description: "Manage support tickets and conversations with students",
      icon: <Headphones className="w-12 h-12 text-gold" />,
      path: "/customer-support",
      badge: unreadCount > 0 ? unreadCount : undefined
    },
  ];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-white/60">Welcome to the Elitez Club Academy Admin Panel</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {adminOptions.map((option, index) => (
            <Link to={option.path} key={index} className="relative group">
              <GlassmorphicCard className="h-full transition-transform group-hover:scale-105 group-hover:border-gold/50 relative overflow-visible">
                {(option as any).badge && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-lg z-10 border border-white/10">
                    {(option as any).badge} New
                  </div>
                )}
                <div className="flex flex-col items-center md:items-start md:flex-row gap-4 p-6">
                  <div className="flex-shrink-0">
                    {option.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2 text-center md:text-left">{option.title}</h2>
                    <p className="text-white/60 text-center md:text-left">{option.description}</p>
                  </div>
                </div>
              </GlassmorphicCard>
            </Link>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Admin;
