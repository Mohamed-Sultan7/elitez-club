
import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '@/components/MainLayout';
import GlassmorphicCard from '@/components/GlassmorphicCard';
import { Search, Clock, Lock, BookOpen, Star, Loader2, Play, Eye, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import GoldButton from '@/components/GoldButton';
import { Link, useNavigate } from 'react-router-dom';
import { listCourses, listModules, getFirstLessonForCourse } from '@/db/courses';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { useAuth } from '@/context/AuthContext';
import { getAllLastWatched, LastWatchedRow } from '@/db/progress';

// Course type definition
interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  progress: number;
  locked: boolean;
  lastLesson: string | null;
  totalModules?: number;
  order: number;
  lastWatched?: LastWatchedRow | null;
}

const Courses = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [startingCourseId, setStartingCourseId] = useState<string | null>(null);
  const { user } = useAuth();
  const { logActivity } = useActivityLogger();
  const hasLoggedActivity = useRef(false);
  const navigate = useNavigate();
  
  // Log activity when user visits the courses page
  useEffect(() => {
    if (user && !hasLoggedActivity.current) {
      logActivity('COURSES_VIEW');
      hasLoggedActivity.current = true;
    }
  }, [user]);
  
  // List of admin emails
  const adminEmails = ['ichrakchraibi5@gmail.com', 'mohamed.sultan.7744@gmail.com', 'toparabg@gmail.com'];

  // Fetch courses from Supabase
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const supaCourses = await listCourses();
        
        // Get last watched lessons for all courses (only for non-admin users)
        let lastWatchedMap: Record<string, LastWatchedRow> = {};
        if (user) {
          const isAdmin = adminEmails.includes(user.email);
          if (!isAdmin) {
            try {
              const allWatched = await getAllLastWatched();
              allWatched.forEach(row => {
                if (!lastWatchedMap[row.course_id] || new Date(row.watched_at) > new Date(lastWatchedMap[row.course_id].watched_at)) {
                  lastWatchedMap[row.course_id] = row;
                }
              });
            } catch (error) {
              console.error('Error fetching last watched history:', error);
            }
          }
        }

        const coursesList = await Promise.all(supaCourses.map(async c => {
          const modules = await listModules(c.id);
          return {
            id: c.id,
            title: c.title,
            description: c.description || '',
            thumbnail: c.thumbnail || '',
            locked: c.locked || false,
            totalModules: modules.length,
            order: c.order || 0,
            lastWatched: lastWatchedMap[c.id] || null
          } as Course;
        }));
        
        // Sort courses by order field
        coursesList.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        setCourses(coursesList);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('An error occurred while fetching courses');
      } finally {
        setLoading(false);
      }     
    };
    
    fetchCourses();
  }, [user]);
  
  const handleStartCourse = async (courseId: string) => {
    setStartingCourseId(courseId);
    try {
      const firstLesson = await getFirstLessonForCourse(courseId);
      if (firstLesson) {
        navigate(`/course/${courseId}/module/${firstLesson.moduleId}/lesson/${firstLesson.lessonId}`);
      } else {
        // Fallback to modules page if no lesson found
        navigate(`/course/${courseId}`);
      }
    } catch (error) {
      console.error('Error finding first lesson:', error);
      navigate(`/course/${courseId}`);
    } finally {
      setStartingCourseId(null);
    }
  };

  const filteredCourses = courses.filter(course => 
    course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const isAdmin = user && adminEmails.includes(user.email);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        
        {/* Courses Content */}
            {/* Search & Filter */}
            <section className="mb-12" id="courses">          
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">All Courses</h2>
              </div>
              <div className="relative mb-8">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                <Input
                  type="text"
                  placeholder="Search courses..."
                  className="pl-10 bg-black/40 border-white/10 focus:border-gold text-left"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </section>
        
            {/* Loading State */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p className="text-white/70">Loading courses...</p>
              </div>
            ) : error ? (
              <GlassmorphicCard className="p-6 text-center">
                <p className="text-xl text-red-400 mb-2">{error}</p>
                <p className="text-white/70">Please try again later</p>
              </GlassmorphicCard>
            ) : filteredCourses.length === 0 ? (
              <GlassmorphicCard className="p-6 text-center">
                <p className="text-xl mb-2">No courses available</p>
                <p className="text-white/70">Please check back later for new courses</p>
              </GlassmorphicCard>
            ) : (
              /* Courses Grid */
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredCourses.map((course) => (
                  <div key={course.id} className="animate-fade-in">
                    <GlassmorphicCard className="h-full">
                      <div className="relative">
                        <div className="relative h-48 overflow-hidden rounded-t-lg">
                          <img 
                            src={course.thumbnail || "/thumbnails/default.jpg"} 
                            alt={course.title}
                            loading="lazy"
                            className={`w-full h-full object-cover transition-all duration-300 ${course.locked ? 'blur-sm' : ''}`}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/thumbnails/default.jpg";
                            }}
                          />
                          {course.progress > 0 && (
                            <div className="absolute top-0 right-0 m-3 bg-gold/90 text-black text-xs px-2 py-1 rounded-full">
                              {course.progress}% Completed
                            </div>
                              )}
                          {course.locked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                              <Lock className="w-10 h-10 text-white/80" />
                            </div>
                          )}
                        </div>
                        
                        <div className="p-4">
                          <h3 className="text-lg font-bold mb-2">{course.title}</h3>
                          <p className="text-white/70 mb-4 line-clamp-2">{course.description}</p>
                          
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                              <span className="mr-2 text-white/60 text-sm">5.0</span>
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className="w-4 h-4 text-gold" fill="#D4AF37" />
                              ))}
                            </div>
                            <div className="flex items-center text-white/60">
                            <span className="text-sm">{course.totalModules} Modules</span>
                            <BookOpen className="w-4 h-4 ml-1" />
                            </div>
                          </div>
                          
                          {course.locked ? (
                            <GoldButton 
                              variant="outline"
                              className="w-full"
                            >
                              <Lock className="w-4 h-4 ml-2" />
                              Course Locked
                            </GoldButton>
                          ) : course.lastWatched ? (
                            <div className="flex gap-2">
                              <Link 
                                to={`/course/${course.id}/module/${course.lastWatched.module_id}/lesson/${course.lastWatched.lesson_id}`}
                                className="flex-1"
                              >
                                <GoldButton className="w-full">
                                  <Play className="w-4 h-4 ml-2" />
                                  Continue Course
                                </GoldButton>
                              </Link>
                              <Link to={`/course/${course.id}`} className="flex-1">
                                <GoldButton 
                                  variant="outline" 
                                  className="w-full"
                                >
                                  <Eye className="w-4 h-4 ml-2" />
                                  Browse Course
                                </GoldButton>
                              </Link>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <div className={isAdmin ? "w-full" : "flex-1"}>
                                {isAdmin ? (
                                  <Link to={`/course/${course.id}`} className="block w-full">
                                    <GoldButton className="w-full">
                                      <Play className="w-4 h-4 ml-2" />
                                      Start Course
                                    </GoldButton>
                                  </Link>
                                ) : (
                                  <GoldButton 
                                    className="w-full"
                                    onClick={() => handleStartCourse(course.id)}
                                    disabled={startingCourseId === course.id}
                                  >
                                    {startingCourseId === course.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                                    ) : (
                                      <Play className="w-4 h-4 ml-2" />
                                    )}
                                    Start Course
                                  </GoldButton>
                                )}
                              </div>
                              {!isAdmin && (
                                <Link to={`/course/${course.id}`} className="flex-1">
                                  <GoldButton 
                                    variant="outline" 
                                    className="w-full"
                                  >
                                    <Eye className="w-4 h-4 ml-2" />
                                    Browse Course
                                  </GoldButton>
                                </Link>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </GlassmorphicCard>
                  </div>
                ))}
              </section>
            )}
      </div>
    </MainLayout>
  );
};

export default Courses;
