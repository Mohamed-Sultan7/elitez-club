import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { logActivity } from '@/db/activity';

// Hook specifically for automatic page visit tracking
// Should only be used once in the main App component
export const usePageTracker = () => {
  const { user } = useAuth();
  const location = useLocation();
  const previousPath = useRef<string>('');

  // Auto-track page visits
  useEffect(() => {
    if (user && location.pathname !== previousPath.current) {
      const currentPath = location.pathname;
      
      // Don't log admin pages, login/logout pages, or pages with specific activity logging
      const excludedPaths = ['/admin', '/login', '/', '/subscription', '/affiliate', '/daily-motivation', '/home', '/courses', '/settings', '/support'];
      const shouldExclude = excludedPaths.some(path => 
        currentPath === path || currentPath.includes('/admin')
      ) || currentPath.startsWith('/course/');
      
      if (!shouldExclude) {
        const details: any = {
          page: currentPath
        };
        
        // Only add previousPage if it exists and is not empty
        if (previousPath.current && previousPath.current.trim() !== '') {
          details.previousPage = previousPath.current;
        }
        
        logActivity('PAGE_VISIT', details);
      }
      
      previousPath.current = currentPath;
    }
  }, [location.pathname, user]);
};
