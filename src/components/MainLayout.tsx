
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Home, BookOpen, CreditCard, Settings, Monitor, LogOut, Menu, X, Users, Sun, Headphones } from 'lucide-react';
import GoldButton from './GoldButton';
import SupportReportButton from './SupportReportButton';
import { supportService } from '@/services/supportService';
import { useState, useEffect } from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // List of admin emails that can access admin features
  const adminEmails = ['ichrakchraibi5@gmail.com', 'mohamed.sultan.7744@gmail.com', 'elitez.club7@gmail.com'];
  
  // Check if current user is an admin
  const isAdmin = user && adminEmails.includes(user.email || '');

  useEffect(() => {
    if (!user) return;

    const unsubscribe = supportService.subscribeToGlobalUnread(
      user.uid, 
      !!isAdmin, 
      (count) => setUnreadCount(count)
    );

    return () => {
      unsubscribe();
    };
  }, [user, isAdmin]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Home', path: '/home', icon: <Home className="w-5 h-5" /> },
    { name: 'Courses', path: '/courses', icon: <BookOpen className="w-5 h-5" /> },
    { name: 'Motivation', path: '/daily-motivation', icon: <Sun className="w-5 h-5" /> },
    { name: 'Subscription', path: '/subscription', icon: <CreditCard className="w-5 h-5" /> },
    { name: 'Affiliate', path: '/affiliate', icon: <Users className="w-5 h-5" /> },
    // Support link - Visible to all, path depends on role
    // Support link - only visible to non-admin users
    ...(!isAdmin ? [
          { 
            name: 'Support', 
            path: '/support', 
            icon: <Headphones className="w-5 h-5" />,
            badge: unreadCount > 0 ? unreadCount : undefined
          }
        ] : []),

    { name: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5" /> },
    // Admin links - only visible to admins
    ...(isAdmin ? [
      { 
        name: 'Management', 
        path: '/admin', 
        icon: <Monitor className="w-5 h-5"/>,
        badge: unreadCount > 0 ? unreadCount : undefined 
      }
    ] : [])
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="glass border-b border-white/10 sticky top-0 z-40">
        <div className="container mx-auto flex justify-between items-center px-4 py-4">
          <Link to="/home" className="flex items-center space-x-2 rtl:space-x-reverse">
            <img src="/favicon.png" alt="Elitez Club" className="h-10 w-auto" />
            <span className="text-xl font-bold text-gold">Elitez Club</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8 rtl:space-x-reverse">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="text-white/80 hover:text-gold transition-colors duration-200 flex items-center space-x-1 rtl:space-x-reverse relative"
              >
                {item.icon}
                <span>{item.name}</span>
                {(item as any).badge && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                    {(item as any).badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
          
          {/* User Menu & Mobile Toggle */}
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            {user && (
              <div className="hidden md:flex items-center">
                <span className="text-sm text-white/80 mr-4">Welcome, {user.name}</span>
                <GoldButton variant="outline" size="sm" onClick={handleLogout}>
                  Logout
                  <LogOut className="w-4 h-4 mr-2" />
                </GoldButton>
              </div>
            )}
            
            {/* Mobile Menu Button */}
            <button 
              className="md:hidden text-white focus:outline-none" 
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {menuOpen && (
          <div className="md:hidden glass border-t border-white/10">
            <div className="container mx-auto py-4 px-4 space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center space-x-2 rtl:space-x-reverse text-white/80 hover:text-gold py-2 relative"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.icon}
                  <span>{item.name}</span>
                  {(item as any).badge && (
                    <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {(item as any).badge}
                    </span>
                  )}
                </Link>
              ))}
              <div className="pt-4 border-t border-white/10">
                <GoldButton variant="outline" size="sm" onClick={handleLogout} className="w-full">
                  Logout
                  <LogOut className="w-4 h-4 mr-2" />
                </GoldButton>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Global Support Button */}
      <SupportReportButton />

      {/* Footer */}
      <footer className="glass border-t border-white/10 py-6 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-white/60 text-sm">© 2026 Elitez Club Academy. All rights reserved.</p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <span className="text-white/60 text-sm">Privacy Policy</span>
              <span className="text-white/60 text-sm">Terms & Conditions</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
