import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import GlassmorphicCard from '@/components/GlassmorphicCard';
import GoldButton from '@/components/GoldButton';
import { ChevronLeft, Play, Clock, CheckCircle, LockIcon, Loader2, BookOpen } from 'lucide-react';
import { getCourse, listModules, listLessons } from '@/db/courses';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { useAuth } from '@/context/AuthContext';

// Type definitions
interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: string;
  completed: boolean;
  locked: boolean;
  videoUrl?: string;
}

interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
}

const CourseLessons = () => {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { logActivity } = useActivityLogger();

  useEffect(() => {
    const fetchData = async () => {
      if (!courseId || !moduleId) {
        setError("Course or Module ID not found");
        setLoading(false);
        return;
      }

      try {
        // Check if user is on free trial and trying to access a locked module
        if (user?.membershipType === 'Free Trial') {
          const supaModules = await listModules(courseId);
          const modules = supaModules.map(m => ({ id: m.moduleId, order: m.order }));
          const moduleIndex = modules.findIndex(m => m.id === moduleId);
          if (moduleIndex > 0) {
            setError("This module is locked for Free Trial. Upgrade your membership to access all modules.");
            setLoading(false);
            return;
          }
        }

        const courseData = await getCourse(courseId);
        if (!courseData) {
          setError("Course not found");
          setLoading(false);
          return;
        }
        
        const supaModules = await listModules(courseId);
        const currentModule = supaModules.find(m => m.moduleId === moduleId);
        if (!currentModule) {
          setError("Module not found");
          setLoading(false);
          return;
        }
        const supaLessons = await listLessons(courseId, moduleId);
        const lessons: Lesson[] = supaLessons.map(l => ({
          id: l.lessonId,
          title: l.title,
          description: l.description || '',
          duration: l.duration ? String(l.duration) : '',
          completed: !!l.completed,
          locked: !!l.locked,
          videoUrl: l.videoUrl || undefined,
        }));

        // Set course and module data
        setCourse({
          id: courseId,
          title: courseData.title || ""
        });
        
        setModule({
          id: moduleId,
          title: currentModule.title || "",
          description: currentModule.description || "",
          lessons: lessons
        });
        
        // Log module access activity
        logActivity('MODULE_ACCESS', {
          courseId: courseId,
          moduleId: moduleId,
          moduleName: currentModule.title || "",
          courseName: courseData.title || ""
        });
      } catch (err) {
        console.error('Error fetching data:', err);
        setError("Error loading data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, moduleId]);

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Loading lessons...</h2>
        </div>
      </MainLayout>
    );
  }

  if (error || !course || !module) {
    const isFreeTrial = user?.membershipType === 'Free Trial';
    const isAccessDenied = error?.includes("locked for Free Trial");
    
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="max-w-md mx-auto">
            {isAccessDenied && (
              <div className="mb-6">
                <LockIcon className="w-16 h-16 text-gold mx-auto mb-4" />
              </div>
            )}
            <h2 className="text-2xl font-bold mb-4">{error || "Data not found"}</h2>
            
            <div className="space-y-3">
              <Link to={`/course/${courseId}`} className="block">
                <GoldButton variant="outline" className="w-full">Back to Modules</GoldButton>
              </Link>
              
              {isAccessDenied && isFreeTrial && (
                <Link to="/subscription" className="block">
                  <GoldButton className="w-full">Upgrade Membership</GoldButton>
                </Link>
              )}
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link to={`/course/${courseId}`} className="flex items-center text-white/60 hover:text-gold transition-colors mb-6">
            <ChevronLeft className="w-5 h-5 mr-2" />
            <span>Back to Modules</span>
          </Link>
        </div>

        {/* Course and Module Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{course.title}</h1>
          <h2 className="text-xl md:text-2xl font-semibold text-gold mb-6 mt-6">{module.title}</h2>
          <p className="text-white/80 text-lg">{module.description}</p>
        </div>

        {/* Lessons List */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Module Lessons</h2>
          {module.lessons && module.lessons.length > 0 ? (
            <div className="space-y-4">
              {module.lessons.map((lesson, index) => (
                <GlassmorphicCard 
                  key={lesson.id} 
                  hover={!lesson.locked}
                  className={`transition-all duration-300 ${lesson.completed ? 'border-gold/20' : ''}`}
                >
                  <div className="flex flex-col md:flex-row justify-between items-start p-2">
                    <div className="flex grid-mobile items-center w-full md:w-auto mb-4 md:mb-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 mr-4">
                        {lesson.completed ? (
                          <CheckCircle className="w-5 h-5 text-gold" />
                        ) : lesson.locked ? (
                          <LockIcon className="w-5 h-5 text-white/60" />
                        ) : (
                          <span className="text-white/80">{index + 1}</span>
                        )}
                      </div>
                      
                      <div className="flex-grow">
                        <h3 className={`text-lg font-medium ${lesson.completed ? 'text-gold' : lesson.locked ? 'text-white/40' : 'text-white'}`}>
                          {lesson.title}
                        </h3>
                        <p className="text-white/60 text-sm mt-1 max-w-[800px]">{lesson.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex grid-mobile items-center self-center md:self-auto w-full md:w-auto">
                      {lesson.duration && lesson.duration.trim() !== '' && (
                        <div className="flex items-center text-white/60 mr-4">
                          <Clock className="w-4 h-4 mr-1" />
                          <span className="text-sm">{lesson.duration}</span>
                        </div>
                      )}
                      
                      <a 
                        href={lesson.locked ? '#' : `/course/${course.id}/module/${module.id}/lesson/${lesson.id}`}
                        className="w-full md:w-auto"
                        onClick={(e) => lesson.locked && e.preventDefault()}
                      >
                        <GoldButton 
                          variant={lesson.locked ? "outline" : lesson.completed ? "outline" : "default"}
                          size="sm" 
                          className={`w-full md:w-auto ${lesson.locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                          disabled={lesson.locked}
                        >
                          {lesson.completed ? "Watch Again" : lesson.locked ? "Locked" : "Watch Lesson"}
                        </GoldButton>
                      </a>
                    </div>
                  </div>
                </GlassmorphicCard>
              ))}
            </div>
          ) : (
            <p className="text-white/60 text-center py-8">No lessons available for this module</p>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default CourseLessons;
