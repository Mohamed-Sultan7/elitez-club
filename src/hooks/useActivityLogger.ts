import { useAuth } from '@/context/AuthContext';
import { logActivity as supaLogActivity } from '@/db/activity';
import type { ActivityLog } from '@/lib/activityLogger';

// Hook for manual activity logging only
export const useActivityLogger = () => {
  const { user } = useAuth();

  // Function to manually log activities
  const logActivity = (
    type: ActivityLog['type'],
    details?: ActivityLog['details']
  ) => {
    if (user) {
      supaLogActivity(type, details);
    }
  };

  return { logActivity };
};
