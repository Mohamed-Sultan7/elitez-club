
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import GlassmorphicCard from '@/components/GlassmorphicCard';
import GoldButton from '@/components/GoldButton';
import { ChevronLeft, Play, Clock, CheckCircle, LockIcon, Award, Loader2, BookOpen } from 'lucide-react';
import { getCourse, listModules, listLessons } from '@/db/courses';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { useAuth } from '@/context/AuthContext';

// Course type definition
interface Module {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  locked: boolean;
  lessonsCount: number;
  order: number;
  iconUrl?: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  progress: number;
  instructor: string;
  totalModules: number;
  totalHours: number;
  completedModules: number;
  modules: Module[];
}

const CourseModules = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { logActivity } = useActivityLogger();
  const { user } = useAuth();

  useEffect(() => {
    const fetchCourseData = async () => {
      if (!courseId) {
        setError("Course ID not found");
        setLoading(false);
        return;
      }

      try {
        const courseData = await getCourse(courseId);
        if (!courseData) {
          setError("Course not found");
          setLoading(false);
          return;
        }

        const supaModules = await listModules(courseId);
        const modules: Module[] = [];
        for (const m of supaModules) {
          const lessons = await listLessons(courseId, m.moduleId);
          modules.push({
            id: m.moduleId,
            title: m.title,
            description: m.description || '',
            completed: !!m.completed,
            locked: !!m.locked,
            lessonsCount: lessons.length,
            order: m.order,
            iconUrl: m.iconUrl || undefined,
          });
        }

        // Combine course data with modules
        const fullCourseData: Course = {
          id: courseId,
          title: courseData.title,
          description: courseData.description || '',
          thumbnail: courseData.thumbnail || '',
          progress: 0,
          instructor: courseData.instructor || '',
          totalModules: modules.length,
          totalHours: 0,
          completedModules: modules.filter(m => m.completed).length,
          modules: modules
        };

        console.log('Fetched course data:', fullCourseData);
        setCourse(fullCourseData);
        
        // Log course access activity
        logActivity('COURSE_ACCESS', {
          courseId: courseId,
          courseName: fullCourseData.title
        });
      } catch (err) {
        console.error('Error fetching course data:', err);
        setError("Error loading course data");
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [courseId]);

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Loading course...</h2>
        </div>
      </MainLayout>
    );
  }

  if (error || !course) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold">{error || "Course not found"}</h2>
          <Link to="/courses" className="mt-4 inline-block">
            <GoldButton>Back to Courses</GoldButton>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link to="/courses" className="flex items-center text-white/60 hover:text-gold transition-colors mb-6">
            <ChevronLeft className="w-5 h-5 mr-2" />
            <span>Back to Courses</span>
          </Link>
        </div>

        {/* Course Header */}
        <div className="mb-12">
          <div className="relative h-64 md:h-80 w-full rounded-lg overflow-hidden mb-8">
            <img 
              src={course.thumbnail || "/thumbnails/default.jpg"} 
              alt={course.title}
              loading="lazy"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{course.title}</h1>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row mb-8">
            <div className="md:w-2/3">
              <p className="text-white/80 text-lg">{course.description}</p>
              <div className="flex items-center mt-2 text-white/60">
                <span>Instructor: {course.instructor}</span>
              </div>
            </div>
            <div className="md:w-1/3 md:text-left mt-4 md:mt-0">
              <div className="flex items-center justify-start md:justify-start text-white/60">
                <BookOpen className="w-5 h-5 mr-2" />
                <span>{course.modules.length} Modules</span>
              </div>
            </div>
          </div>
        </div>

        {/* Course Content */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Course Content</h2>
          {course.modules && course.modules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {course.modules.map((module, index) => {
                // Check if user is on free trial and this is not the first module
                const isFreeTrial = user?.membershipType === 'Free Trial';
                const isModuleLocked = module.locked || (isFreeTrial && index > 0);
                
                return (
                  <div key={module.id} className="animate-fade-in">
                    <GlassmorphicCard 
                      hover={!isModuleLocked}
                      className={`h-full transition-all duration-300 overflow-hidden hover:shadow-lg ${module.completed ? 'border-gold/20' : ''}`}
                    >
                      <div className="relative">
                        {/* Module Status Indicator */}
                        <div className="relative h-40 flex items-center justify-center bg-white/5 overflow-hidden rounded-t-lg">
                          <div className="absolute top-0 right-0 m-3 bg-white/10 text-white text-xs px-2 py-1 rounded-full">
                            {module.lessonsCount} {module.lessonsCount === 1 ? 'Lesson' : 'Lessons'}
                          </div>
                          
                          {/* Module Icon */}
                          {module.iconUrl ? (
                            <div className="flex items-center justify-center w-20 h-20 shrink-0">
                              <img 
                                src={module.iconUrl} 
                                alt={module.title} 
                                className="w-16 h-16 object-contain"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/10 shrink-0">
                              {module.completed ? (
                                <CheckCircle className="w-8 h-8 text-gold" />
                              ) : isModuleLocked ? (
                                <LockIcon className="w-8 h-8 text-white/60" />
                              ) : (
                                <span className="text-white/80 text-2xl font-semibold">{index + 1}</span>
                              )}
                            </div>
                          )}
                          
                          {/* Lock Overlay for Free Trial Users */}
                          {isModuleLocked && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                              <LockIcon className="w-12 h-12 text-white/90 mb-2" />
                              {isFreeTrial && index > 0 && (
                                <div className="text-center px-4">
                                  <p className="text-white/90 text-sm font-semibold mb-1">Locked for Free Trial</p>
                                  <p className="text-white/70 text-xs">Upgrade to view remaining modules</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="p-4">
                          <h3 className={`text-xl font-bold mb-2 ${module.completed ? 'text-gold' : isModuleLocked ? 'text-white/40' : 'text-white'}`}>
                            {module.title}
                          </h3>
                          {module.description && (
                            <p className="text-white/70 text-sm mb-4 line-clamp-2">{module.description}</p>
                          )}
                          
                          <Link 
                            to={isModuleLocked ? (isFreeTrial && index > 0 ? '/subscription' : '#') : `/course/${course.id}/module/${module.id}`}
                            className="w-full"
                            onClick={(e) => isModuleLocked && !(isFreeTrial && index > 0) && e.preventDefault()}
                          >
                            <GoldButton 
                              variant={isModuleLocked ? "outline" : module.completed ? "outline" : "default"}
                              className={`w-full ${isModuleLocked ? 'opacity-60' : ''}`}
                              disabled={isModuleLocked && !(isFreeTrial && index > 0)}
                            >
                              {module.completed ? "Watch Again" : isModuleLocked ? (isFreeTrial && index > 0 ? "Upgrade Membership" : "Locked") : "View Lessons"}
                            </GoldButton>
                          </Link>
                        </div>
                      </div>
                    </GlassmorphicCard>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-white/60 text-center py-8">No modules available for this course</p>
          )}
        </div>
        
        {/* Course Certificate */}
        <div className="mt-16">
          <GlassmorphicCard className="border-gold/10">
            <div className="flex flex-col md:flex-row items-center p-6">
              <div className="mr-8 margin-bottom-only-mobile">
                <Award className="w-16 h-16 text-gold" />
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-xl font-bold mb-2">Course Completion Certificate</h3>
                <p className="text-white/70 mb-4">Complete 100% of the course to get a certified completion certificate from Elitez Club Academy</p>
                <GoldButton variant="outline" disabled={course.progress < 100}>
                  {course.progress < 100 ? "Complete course to get certificate" : "Download Certificate"}
                </GoldButton>
              </div>
            </div>
          </GlassmorphicCard>
        </div>
      </div>
    </MainLayout>
  );
};

export default CourseModules;
