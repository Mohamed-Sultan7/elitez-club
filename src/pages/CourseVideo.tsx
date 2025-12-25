
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import GlassmorphicCard from '@/components/GlassmorphicCard';
import GoldButton from '@/components/GoldButton';
import { ChevronLeft, Play, CheckCircle, LockIcon, FileText, MessageCircle, Loader2, Edit, Trash, X, Save, Headphones } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCourse, listModules, getLesson, listLessons } from '@/db/courses';
import { listComments, addComment, deleteComment, updateComment } from '@/db/comments';
import { upsertLastWatched } from '@/db/progress';
import { useAuth } from '@/context/AuthContext';
import { useToast } from "@/components/ui/use-toast";
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { format, formatDistanceToNow } from 'date-fns';
import { User } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

// Type definitions
interface Resource {
  title: string;
  url: string;
}

interface Comment {
  id: string;
  user: string;
  avatar: string;
  date: Date;
  content: string;
  userId: string;
}

type LessonType = 'video' | 'audio' | 'text';

interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: string;
  completed: boolean;
  locked: boolean;
  type?: LessonType;
  videoUrl?: string;
  audioUrl?: string;
  textContent?: string;
  transcript?: string;
  notes: string[];
  resources?: Resource[];
  comments?: any[];
  order: number;
}

interface Module {
  id: string;
  title: string;
}

interface Course {
  id: string;
  title: string;
}

const CourseVideo = () => {
  const { courseId, moduleId, lessonId } = useParams<{ courseId: string; moduleId: string; lessonId: string }>();
  const [activeTab, setActiveTab] = useState("Notes");
  const [course, setCourse] = useState<Course | null>(null);
  const [module, setModule] = useState<Module | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [prevLesson, setPrevLesson] = useState<Lesson | null>(null);
  const [nextLesson, setNextLesson] = useState<Lesson | null>(null);
  const [nextModuleId, setNextModuleId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<string>('');
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState<string>('');
  const [isUpdatingComment, setIsUpdatingComment] = useState<boolean>(false);
  const [isDeletingComment, setIsDeletingComment] = useState<boolean>(false);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();
  
  // List of admin emails
  const adminEmails = ['ichrakchraibi5@gmail.com', 'mohamed.sultan.7744@gmail.com', 'elitez.club7@gmail.com
'];

  // Function to check if user can modify a comment
  const canModifyComment = (comment: Comment) => {
    if (!user) return false;
    return comment.userId === user.uid || adminEmails.includes(user.email);
  };

  // Function to handle edit comment
  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.content);
  };

  // Function to cancel edit
  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditCommentText('');
  };

  // Function to update comment
  const handleUpdateComment = async (commentId: string) => {
    if (!courseId || !moduleId || !lessonId || !editCommentText.trim()) return;
    
    // Find the original comment to get the old content
    const originalComment = comments.find(comment => comment.id === commentId);
    const oldContent = originalComment?.content || '';
    
    setIsUpdatingComment(true);
    
    try {
      await updateComment(commentId, editCommentText.trim());
      
      // Log comment edit activity
      const currentLesson = lessons.find(l => l.id === lessonId);
      logActivity('EDIT_COMMENT', {
        oldComment: oldContent,
        newComment: editCommentText.trim(),
        courseId,
        moduleId,
        lessonId,
        courseName: course?.title,
        moduleName: module?.title,
        lessonName: lesson?.title,
        lessonOrder: currentLesson?.order || 1
      });
      
      // Reset states
      setEditingCommentId(null);
      setEditCommentText('');
      
      // Refresh comments
      fetchComments(courseId, moduleId, lessonId);
      
      toast({
        title: "Comment Updated",
        description: "Comment updated successfully",
        variant: "default",
      });
    } catch (err) {
      console.error('Error updating comment:', err);
      toast({
        title: "Error",
        description: "An error occurred while updating the comment",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingComment(false);
    }
  };

  // Function to confirm delete
  const handleConfirmDelete = (commentId: string) => {
    setDeleteCommentId(commentId);
  };

  // Function to cancel delete
  const handleCancelDelete = () => {
    setDeleteCommentId(null);
  };

  // Function to delete comment
  const handleDeleteComment = async () => {
    if (!courseId || !moduleId || !lessonId || !deleteCommentId) return;
    
    setIsDeletingComment(true);
    
    try {
      const commentData = comments.find(c => c.id === deleteCommentId);
      await deleteComment(deleteCommentId);
      
      // Log delete comment activity
      if (user && commentData) {
        const currentLesson = lessons.find(l => l.id === lessonId);
        logActivity('DELETE_COMMENT', {
          courseId,
          moduleId,
          lessonId,
          content: commentData.content,
          courseName: course?.title,
          moduleName: module?.title,
          lessonName: lesson?.title,
          lessonOrder: currentLesson?.order || lesson?.order
        });
      }
      
      // Reset state
      setDeleteCommentId(null);
      
      // Refresh comments
      fetchComments(courseId, moduleId, lessonId);
      
      toast({
        title: "Comment Deleted",
        description: "Comment deleted successfully",
        variant: "default",
      });
    } catch (err) {
      console.error('Error deleting comment:', err);
      toast({
        title: "Error",
        description: "Error deleting comment",
        variant: "destructive",
      });
    } finally {
      setIsDeletingComment(false);
    }
  };
  
  useEffect(() => {
    const fetchData = async () => {
      if (!courseId || !moduleId || !lessonId) {
        setError("Course, Module, or Lesson ID not found");
        setLoading(false);
        return;
      }

      try {
        // Check if user is on free trial and trying to access a lesson in a locked module
        if (user?.membershipType === 'Free Trial') {
          const supaModules = await listModules(courseId);
          const modules = supaModules.map(m => ({ id: m.moduleId, order: m.order }));
          const moduleIndex = modules.findIndex(m => m.id === moduleId);
          
          // If this is not the first module (index > 0), block access
          if (moduleIndex > 0) {
            setError("This lesson is in a locked module for Free Trial. Upgrade membership to access all lessons.");
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
        const moduleData = supaModules.find(m => m.moduleId === moduleId);
        if (!moduleData) {
          setError("Module not found");
          setLoading(false);
          return;
        }
        
        const lessonData = await getLesson(courseId, moduleId, lessonId);
        if (!lessonData) {
          setError("Lesson not found");
          setLoading(false);
          return;
        }
        
        // Fetch all lessons to determine navigation (prev/next)
        const lessons = (await listLessons(courseId, moduleId)).map(l => ({
          id: l.lessonId,
          title: l.title,
          description: l.description || '',
          duration: l.duration ? String(l.duration) : '',
          completed: !!l.completed,
          locked: !!l.locked,
          type: (l.type as LessonType) || undefined,
          videoUrl: l.videoUrl || undefined,
          audioUrl: l.audioUrl || undefined,
          textContent: l.textContent || undefined,
          transcript: l.transcript || undefined,
          notes: l.notes || [],
          resources: (l.resources || []).map((r: any) => ({ title: r.title, url: r.url })),
          order: l.order,
        }));

        // Set lessons state
        setLessons(lessons);
        
        // Find next and previous lessons
        const lessonIndex = lessons.findIndex(l => l.id === lessonId);
        const prevLessonData = lessonIndex > 0 ? lessons[lessonIndex - 1] : null;
        const nextLessonData = lessonIndex < lessons.length - 1 ? lessons[lessonIndex + 1] : null;
        
        // If this is the last lesson in the module, fetch the next module
        if (lessonIndex === lessons.length - 1) {
          const modules = (await listModules(courseId)).map(m => ({ id: m.moduleId, order: m.order }));
          const moduleIndex = modules.findIndex(m => m.id === moduleId);
          
          // If there's a next module, set its ID
          if (moduleIndex < modules.length - 1) {
            setNextModuleId(modules[moduleIndex + 1].id);
          }
        }

        // Set states
        setCourse({
          id: courseId,
          title: courseData.title || ""
        });
        
        setModule({
          id: moduleId,
          title: moduleData.title || ""
        });
        
        setLesson({
          id: lessonId,
          title: lessonData.title,
          description: lessonData.description || '',
          duration: lessonData.duration ? String(lessonData.duration) : '',
          completed: !!lessonData.completed,
          locked: !!lessonData.locked,
          type: (lessonData.type as LessonType) || undefined,
          videoUrl: lessonData.videoUrl || undefined,
          audioUrl: lessonData.audioUrl || undefined,
          textContent: lessonData.textContent || undefined,
          transcript: lessonData.transcript || undefined,
          notes: lessonData.notes || [],
          resources: (lessonData.resources || []).map((r: any) => ({ title: r.title, url: r.url })),
          order: lessonData.order,
        });
        
        setPrevLesson(prevLessonData);
        setNextLesson(nextLessonData);

        // Update last watched progress
        if (user) {
          const isAdmin = adminEmails.includes(user.email);
          if (!isAdmin) {
            try {
              await upsertLastWatched(courseId, moduleId, lessonId, lessonData.order);
            } catch (err) {
              console.error('Error updating last watched:', err);
            }
          }
        }
        
        // Fetch comments for this lesson
        fetchComments(courseId, moduleId, lessonId);
        
        // Log lesson watching activity
        if (user) {
          const currentLesson = lessons.find(l => l.id === lessonId);
          
          // Check if user is admin - don't log for admins
          const isAdmin = adminEmails.includes(user.email);
          
          if (!isAdmin) {
            // Log to the existing activity system
            logActivity('WATCH_LESSON', {
              courseId,
              moduleId,
              lessonId,
              courseName: courseData.title,
              moduleName: moduleData.title,
              lessonName: lessonData.title,
              lessonOrder: currentLesson?.order || lessonIndex + 1
            });
          } else {
            console.log('Admin user detected - skipping lesson tracking');
          }
        }
      } catch (err) {
        console.error('Error fetching lesson data:', err);
        setError("Error loading lesson data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, moduleId, lessonId]);
  
  // Function to fetch comments
  const fetchComments = async (courseId: string, moduleId: string, lessonId: string) => {
    try {
      const list = await listComments(courseId, moduleId, lessonId);
      const commentsData: Comment[] = list.map(c => ({
        id: c.id,
        user: c.userName || 'Unknown User',
        avatar: c.userAvatar || '',
        date: new Date(c.createdAt),
        content: c.body,
        userId: c.userId,
      }));
      setComments(commentsData);
    } catch (err) {
      console.error('Error fetching comments:', err);
      toast({
        title: "Error",
        description: "Error loading comments",
        variant: "destructive",
      });
    }
  };
  
  // Function to submit a new comment
  const handleSubmitComment = async () => {
    if (!user || !commentText.trim() || !courseId || !moduleId || !lessonId) return;
    
    setSubmittingComment(true);
    
    try {
      await addComment(courseId, moduleId, lessonId, commentText.trim());
      
      // Clear comment text
      setCommentText('');
      
      // Refresh comments
      fetchComments(courseId, moduleId, lessonId);
      
      // Log comment activity
      const currentLesson = lessons.find(l => l.id === lessonId);
      logActivity('ADD_COMMENT', {
        courseId,
        moduleId,
        lessonId,
        content: commentText.trim(),
        courseName: course?.title,
        moduleName: module?.title,
        lessonName: lesson?.title,
        lessonOrder: currentLesson?.order || 1
      });
      
      toast({
        title: "Comment Added",
        description: "Your comment has been added successfully",
        variant: "default",
      });
    } catch (err) {
      console.error('Error submitting comment:', err);
      toast({
        title: "Error",
        description: "Error sending comment",
        variant: "destructive",
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
        <div className="container mx-auto px-4 py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Loading lesson...</h2>
        </div>
    );
  }
  
  if (error || !course || !module || !lesson) {
    const isFreeTrial = user?.membershipType === 'Free Trial';
    const isAccessDenied = error?.includes("locked module");
    
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="max-w-md mx-auto">
            {isAccessDenied && (
              <div className="mb-6">
                <LockIcon className="w-16 h-16 text-gold mx-auto mb-4" />
              </div>
            )}
            <h2 className="text-2xl font-bold mb-4">{error || "Lesson not found"}</h2>
            
            <div className="space-y-3">
              <Link to={`/course/${courseId}/module/${moduleId}`} className="block">
                <GoldButton variant="outline" className="w-full">Back to Lessons</GoldButton>
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
      <div className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <Link to={`/course/${courseId}/module/${moduleId}`} className="flex items-center text-white/60 hover:text-gold transition-colors">
            <ChevronLeft className="w-5 h-5 mr-2" />
            <span>Back to Lessons</span>
          </Link>
        </div>

        {/* Content Player */}
        <div className='small-video-player'>
          <div className="mb-8 small-inside-video">
            {/* Video Player */}
            {(!lesson.type || lesson.type === 'video') && lesson.videoUrl && (
              <div className="relative pt-[56.25%] w-full bg-black rounded-lg overflow-hidden">
                <iframe
                  src={lesson.videoUrl}
                  className="absolute top-0 left-0 w-full h-full"
                  frameBorder="0"
                  allow="autoplay; fullscreen;"
                  title={lesson.title}
                ></iframe>
                {/* BLOCK the pop-out */}
                <div className="pop-out-overlay">
                  <img src="/favicon.png" alt="Overlay" className="pointer-events-none"/>
                </div>
              </div>
            )}
            
            {/* Audio Player */}
            {lesson.type === 'audio' && lesson.audioUrl && (
              <div className="w-full bg-gradient-to-br from-black/60 to-black/40 rounded-xl p-8 border border-gold/20 backdrop-blur-sm">
                {/* Audio Player Header */}
                <div className="flex items-center justify-center mb-8">
                  <div className="relative">
                    <div className="w-24 h-24 bg-gradient-to-br from-gold/30 to-gold/10 rounded-full flex items-center justify-center border-2 border-gold/30 shadow-lg">
                      <Headphones className="w-10 h-10 text-gold" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-gold rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-black rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
                
                {/* Custom Audio Player */}
                <div className="space-y-6">
                  <audio 
                    id="custom-audio-player"
                    className="hidden"
                    controlsList="nodownload"
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <source src={lesson.audioUrl} type="audio/mpeg" />
                    <source src={lesson.audioUrl} type="audio/wav" />
                    <source src={lesson.audioUrl} type="audio/ogg" />
                    Your browser does not support audio playback.
                  </audio>
                  
                  {/* Custom Controls */}
                  <div className="bg-black/30 rounded-lg p-6 border border-white/10">
                    {/* Progress Bar */}
                    <div className="mb-6">
                      <div className="flex justify-between text-sm text-white/60 mb-2">
                        <span id="current-time">00:00</span>
                        <span id="total-time">00:00</span>
                      </div>
                      <div className="relative h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer" id="progress-container">
                        <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-gold to-yellow-400 rounded-full transition-all duration-300" id="progress-bar" style={{width: '0%'}}></div>
                        <div className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-gold rounded-full shadow-lg transition-all duration-300" id="progress-thumb" style={{left: '0%', marginLeft: '-8px'}}></div>
                      </div>
                    </div>
                    
                    {/* Control Buttons */}
                    <div className="flex items-center justify-center space-x-6">
                      {/* Rewind Button */}
                      <button 
                        id="rewind-btn"
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-200 hover:scale-110"
                        title="Rewind 10s"
                      >
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414L2.586 8l3.707-3.707a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {/* Play/Pause Button */}
                      <button 
                        id="play-pause-btn"
                        className="p-4 bg-gradient-to-r from-gold to-yellow-400 hover:from-gold/90 hover:to-yellow-400/90 rounded-full transition-all duration-200 hover:scale-110 shadow-lg"
                        title="Play/Pause"
                      >
                        <svg id="play-icon" className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        <svg id="pause-icon" className="w-6 h-6 text-black hidden" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {/* Forward Button */}
                      <button 
                        id="forward-btn"
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-200 hover:scale-110"
                        title="Forward 10s"
                      >
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12.293 3.293a1 1 0 011.414 0L17.414 7l-3.707 3.707a1 1 0 01-1.414-1.414L14.586 7H9a5 5 0 00-5 5v2a1 1 0 11-2 0v-2a7 7 0 017-7h5.586L12.293 4.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Volume Control */}
                    <div className="flex items-center justify-center mt-6 space-x-3">
                      <svg className="w-5 h-5 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.824L4.5 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.5l3.883-3.824a1 1 0 011.617.824zM12 8a1 1 0 012 0v4a1 1 0 11-2 0V8z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1 max-w-24">
                        <input 
                          type="range" 
                          id="volume-slider"
                          min="0" 
                          max="100" 
                          defaultValue="70"
                          className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                        />
                      </div>
                      <span id="volume-display" className="text-sm text-white/60 min-w-[3ch]">70%</span>
                    </div>
                  </div>
                  
                  {/* Audio Info */}
                  <div className="text-center">
                    <p className="text-white/80 font-medium mb-1">Audio Lesson</p>
                    <p className="text-white/60 text-sm">{lesson.title}</p>
                  </div>
                </div>
                
                {/* Audio Player JavaScript */}
                <script dangerouslySetInnerHTML={{
                  __html: `
                    (function() {
                      const audio = document.getElementById('custom-audio-player');
                      const playPauseBtn = document.getElementById('play-pause-btn');
                      const playIcon = document.getElementById('play-icon');
                      const pauseIcon = document.getElementById('pause-icon');
                      const progressContainer = document.getElementById('progress-container');
                      const progressBar = document.getElementById('progress-bar');
                      const progressThumb = document.getElementById('progress-thumb');
                      const currentTimeEl = document.getElementById('current-time');
                      const totalTimeEl = document.getElementById('total-time');
                      const rewindBtn = document.getElementById('rewind-btn');
                      const forwardBtn = document.getElementById('forward-btn');
                      const volumeSlider = document.getElementById('volume-slider');
                      const volumeDisplay = document.getElementById('volume-display');
                      
                      if (!audio) return;
                      
                      // Set initial volume
                      audio.volume = 0.7;
                      
                      // Format time
                      function formatTime(seconds) {
                        const mins = Math.floor(seconds / 60);
                        const secs = Math.floor(seconds % 60);
                        return mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
                      }
                      
                      // Update progress
                      function updateProgress() {
                        if (audio.duration) {
                          const progress = (audio.currentTime / audio.duration) * 100;
                          progressBar.style.width = progress + '%';
                          progressThumb.style.left = progress + '%';
                          currentTimeEl.textContent = formatTime(audio.currentTime);
                        }
                      }
                      
                      // Play/Pause toggle
                      playPauseBtn?.addEventListener('click', () => {
                        if (audio.paused) {
                          audio.play();
                          playIcon.classList.add('hidden');
                          pauseIcon.classList.remove('hidden');
                        } else {
                          audio.pause();
                          playIcon.classList.remove('hidden');
                          pauseIcon.classList.add('hidden');
                        }
                      });
                      
                      // Progress bar click
                      progressContainer?.addEventListener('click', (e) => {
                        const rect = progressContainer.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const width = rect.width;
                        const newTime = (clickX / width) * audio.duration;
                        audio.currentTime = newTime;
                      });
                      
                      // Rewind/Forward
                      rewindBtn?.addEventListener('click', () => {
                        audio.currentTime = Math.max(0, audio.currentTime - 10);
                      });
                      
                      forwardBtn?.addEventListener('click', () => {
                        audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
                      });
                      
                      // Volume control
                      volumeSlider?.addEventListener('input', (e) => {
                        const volume = e.target.value / 100;
                        audio.volume = volume;
                        volumeDisplay.textContent = e.target.value + '%';
                      });
                      
                      // Audio events
                      audio.addEventListener('loadedmetadata', () => {
                        totalTimeEl.textContent = formatTime(audio.duration);
                      });
                      
                      audio.addEventListener('timeupdate', updateProgress);
                      
                      audio.addEventListener('ended', () => {
                        playIcon.classList.remove('hidden');
                        pauseIcon.classList.add('hidden');
                        progressBar.style.width = '0%';
                        progressThumb.style.left = '0%';
                        audio.currentTime = 0;
                      });
                    })();
                  `
                }} />
              </div>
            )}
            
            {/* Text Content */}
            {lesson.type === 'text' && lesson.textContent && (
              <div className="w-full bg-black/40 rounded-lg p-8 border border-white/10">
                <div className="flex items-center justify-center mb-6">
                  <div className="w-16 h-16 bg-gold/20 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gold" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div 
                  className="prose prose-invert prose-gold max-w-none text-left leading-relaxed"
                  style={{ 
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                    WebkitTouchCallout: 'none',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                  dangerouslySetInnerHTML={{ __html: lesson.textContent }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Lesson Title and Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold">{lesson.title}</h1>
            </div>
            <p className="text-white/70">{lesson.description}</p>
          </div>
          
          <div className="flex mt-4 md:mt-0 space-x-3">
            {prevLesson && (
              <a href={`/course/${courseId}/module/${moduleId}/lesson/${prevLesson.id}`}>
                <GoldButton variant="outline" size="sm">
                  Previous
                </GoldButton>
              </a>
            )}
            
            {nextLesson && (
              <a href={`/course/${courseId}/module/${moduleId}/lesson/${nextLesson.id}`}>
                <GoldButton size="sm">
                  Next
                </GoldButton>
              </a>
            )}
            
            {!nextLesson && nextModuleId && (
              <a href={`/course/${courseId}/module/${nextModuleId}`}>
                <GoldButton size="sm">
                  Next Module
                </GoldButton>
              </a>
            )}
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="Notes" className="w-full">
          <TabsList className="w-full justify-start text-left mb-6 bg-transparent border-b border-white/10">
            <TabsTrigger value="Notes" onClick={() => setActiveTab("Notes")}>Notes</TabsTrigger>
            <TabsTrigger value="Transcript" onClick={() => setActiveTab("Transcript")}>Transcript</TabsTrigger>
            <TabsTrigger value="Comments" onClick={() => setActiveTab("Comments")}>Comments</TabsTrigger>
            <TabsTrigger value="Resources" onClick={() => setActiveTab("Resources")}>Resources</TabsTrigger>
          </TabsList>
          
          <TabsContent value="Notes">
            <GlassmorphicCard>
              <div className="p-2">
                <h3 className="text-xl font-bold mb-4">Lesson Notes</h3>
                {lesson.notes && lesson.notes.length > 0 ? (
                  <ul className="space-y-2 ml-6 list-disc text-left">
                    {lesson.notes.map((note, idx) => (
                      <li key={idx} className="text-white/80">{note}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-white/60">No notes available for this lesson</p>
                )}
              </div>
            </GlassmorphicCard>
          </TabsContent>
          
          <TabsContent value="Transcript">
            <GlassmorphicCard>
              <div className="p-2">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">Full Lesson Transcript</h3>
                  <FileText className="w-5 h-5 mr-2 text-gold" />
                </div>
              <div 
                  className="prose prose-invert prose-gold max-w-none text-left leading-relaxed ltr"
                  style={{ 
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                    WebkitTouchCallout: 'none',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                  dangerouslySetInnerHTML={{ __html: lesson.transcript || "Full transcript not available for this lesson" }}
                />
              </div>
            </GlassmorphicCard>
          </TabsContent>
          
          <TabsContent value="Resources">
            <GlassmorphicCard>
              <div className="p-2">
                <h3 className="text-xl font-bold mb-4">Additional Resources</h3>
                {lesson.resources && lesson.resources.length > 0 ? (
                  <ul className="space-y-4">
                    {lesson.resources.map((resource, idx) => (
                      <li key={idx}>
                        <a 
                          href={resource.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex justify-between items-center p-3 bg-white/5 hover:bg-white/10 transition-colors rounded-md border border-white/10"
                        >
                          <span>{resource.title}</span>
                          <FileText className="w-5 h-5 mr-3 text-gold" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-white/60">No additional resources for this lesson</p>
                )}
              </div>
            </GlassmorphicCard>
          </TabsContent>

          <TabsContent value="Comments">
            <GlassmorphicCard>
              <div className="p-2">
                <h3 className="text-xl font-bold mb-6">Member Comments</h3>
                
                <div className="mb-8">
                  <textarea 
                    placeholder="Add your comment or question here..." 
                    className="w-full h-24 p-4 bg-black/40 border border-white/10 rounded-md resize-none focus:outline-none focus:border-gold text-left"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    disabled={!user || submittingComment}
                  ></textarea>
                  <div className="mt-2 flex justify-end">
                    <GoldButton 
                      onClick={handleSubmitComment} 
                      disabled={!user || submittingComment || !commentText.trim()}
                    >
                      {submittingComment ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Posting...
                        </>
                      ) : (
                        "Post Comment"
                      )}
                    </GoldButton>
                  </div>
                  {!user && (
                    <p className="text-white/60 text-sm mt-2 text-left">You must be logged in to post a comment</p>
                  )}
                </div>
                
                <div className="space-y-6">
                  {comments && comments.length > 0 ? (
                    comments.map(comment => (
                      <div key={comment.id} className="border-b border-white/10 pb-6">
                        <div className="flex justify-start">
                          {(!comment.avatar || comment.avatar === '') ? (
                            <div className="w-10 h-10 rounded-full mr-4 bg-white/10 flex items-center justify-center flex-shrink-0">
                              <User className="h-6 w-6 text-gold/60" />
                            </div>
                          ) : (
                            <img 
                              src={comment.avatar}
                              alt={comment.user} 
                              loading="lazy"
                              className="w-10 h-10 rounded-full mr-4 flex-shrink-0"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "/default-avatar.png";
                              }}
                            />
                          )}
                          
                          <div className="w-full">
                            <div className="flex items-center justify-start">
                              <span className="font-medium text-white">{comment.user}</span>
                              <span className="text-white/40 text-sm ml-3" title={format(comment.date, 'PPpp')}>
                                {formatDistanceToNow(comment.date, { addSuffix: true })}
                              </span>
                            </div>
                            
                            {editingCommentId === comment.id ? (
                              <div className="mt-2">
                                <textarea 
                                  value={editCommentText}
                                  onChange={(e) => setEditCommentText(e.target.value)}
                                  className="w-full h-24 p-4 bg-black/40 border border-white/10 rounded-md resize-none focus:outline-none focus:border-gold text-left"
                                  disabled={isUpdatingComment}
                                />
                                <div className="mt-2 flex justify-end gap-2">
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleUpdateComment(comment.id)}
                                    disabled={isUpdatingComment}
                                    className="bg-gold hover:bg-gold/90"
                                  >
                                    {isUpdatingComment ? (
                                      <>
                                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                        Updating...
                                      </>
                                    ) : (
                                      <>
                                        <Save className="w-4 h-4 mr-1" />
                                        Save
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancelEdit}
                                    disabled={isUpdatingComment}
                                    className="hover:bg-white/10 hover:text-white transition-all"
                                    >
                                      <X className="w-4 h-4 mr-1" />
                                      Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="mt-2 text-white/80 text-left">{comment.content}</p>
                                {canModifyComment(comment) && (
                                  <div className="mt-2 flex justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="rounded hover:bg-red-500/10 text-white/60 hover:text-red-500 transition-all"
                                      onClick={() => handleConfirmDelete(comment.id)}
                                      title="Delete Comment"
                                    >
                                      <Trash className="w-4 h-4 mr-1" />
                                      Delete
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="rounded hover:bg-white/10 text-white/60 hover:text-gold transition-all"
                                      onClick={() => handleEditComment(comment)}
                                      title="Edit Comment"
                                    >
                                      <Edit className="w-4 h-4 mr-1" />
                                      Edit
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-white/60">No comments yet. Be the first to comment</p>
                  )}
                </div>
                
                {/* Delete Comment Confirmation Dialog */}
                <AlertDialog open={deleteCommentId !== null} onOpenChange={handleCancelDelete}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                      <AlertDialogDescription className="text-white/70">
                        Are you sure you want to delete this comment? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel 
                        onClick={handleCancelDelete} 
                        disabled={isDeletingComment}
                        className="hover:bg-white/10 hover:text-white transition-all"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteComment}
                        disabled={isDeletingComment}
                        className="bg-red-600 hover:bg-red-700 text-white border-red-600 ml-2"
                      >
                        {isDeletingComment ? (
                          <>
                            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash className="w-4 h-4 mr-1" />
                            Delete
                          </>
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </GlassmorphicCard>
          </TabsContent>
        </Tabs>
      </div>

    </MainLayout>
  );
};

export default CourseVideo;
