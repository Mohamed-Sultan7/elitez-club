import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getCourse, listLessons, listModules, updateModule as updateModuleDb, deleteModule as deleteModuleDb, deleteLesson as deleteLessonDb } from '@/db/courses';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import MainLayout from '@/components/MainLayout';
import GlassmorphicCard from '@/components/GlassmorphicCard';
import GoldButton from '@/components/GoldButton';
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Edit, Plus, Clock, CheckCircle, LockIcon, Loader2, Save, Trash2, Video, Headphones, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableLesson from '@/components/SortableLesson';

// Type definitions
type LessonType = 'video' | 'audio' | 'text';

interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: string;
  type?: LessonType;
  videoUrl?: string;
  audioUrl?: string;
  textContent?: string;
  completed: boolean;
  locked: boolean;
  order: number;
}

interface Module {
  id: string;
  title: string;
  description: string;
  order: number;
  completed: boolean;
  locked: boolean;
  iconUrl?: string;
}

interface Course {
  id: string;
  title: string;
}

const EditModule = () => {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [module, setModule] = useState<Module | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
  // Lesson deletion states
  const [isLessonDeleteDialogOpen, setIsLessonDeleteDialogOpen] = useState<boolean>(false);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [isDeletingLesson, setIsDeletingLesson] = useState<boolean>(false);
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isOrderChanged, setIsOrderChanged] = useState<boolean>(false);
  const [isSavingOrder, setIsSavingOrder] = useState<boolean>(false);
  
  // Form states
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [order, setOrder] = useState<number | string>('');
  const [locked, setLocked] = useState<boolean>(false);
  const [iconUrl, setIconUrl] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Save the new lesson order to Firestore
  const saveNewLessonOrder = async () => {
    // Functionality removed as part of Firebase cleanup
    console.warn("Saving lesson order is temporarily disabled during migration.");
  };

  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setIsDragging(false);
    
    if (over && active.id !== over.id) {
      setLessons((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        const newArray = arrayMove(items, oldIndex, newIndex);
        setIsOrderChanged(true);
        return newArray;
      });
    }
  };
  
  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance required before activating
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // List of admin emails that can access this page
  const adminEmails = ['ichrakchraibi5@gmail.com', 'mohamed.sultan.7744@gmail.com', 'toparabg@gmail.com'];
  
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
    const fetchModuleAndLessons = async () => {
      if (!courseId || !moduleId) {
        setError("Course or module ID is missing");
        setLoading(false);
        return;
      }

      try {
        // Fetch course data (just for the title)
        const courseRow = await getCourse(courseId);
        if (!courseRow) {
          setError("Course not found");
          setLoading(false);
          return;
        }

        const courseData = {
          id: courseId,
          title: courseRow.title || ''
        } as Course;
        
        setCourse(courseData);
        
        // Fetch module data
        const supaModules = await listModules(courseId);
        const moduleSnapshotData = supaModules.find(m => m.moduleId === moduleId);
        if (!moduleSnapshotData) {
          toast({
            title: "Error",
            description: "Module not found",
            variant: "destructive",
          });
          navigate(`/admin/course/${courseId}/edit`);
          return;
        }

        const moduleData = {
          title: moduleSnapshotData.title,
          description: moduleSnapshotData.description,
          order: moduleSnapshotData.order,
          completed: moduleSnapshotData.completed,
          locked: moduleSnapshotData.locked,
          iconUrl: moduleSnapshotData.iconUrl,
        };
        
        if (!moduleData) {
          toast({
            title: "Error",
            description: "Module data not found",
            variant: "destructive",
          });
          return;
        }

        const formattedModuleData = {
          id: moduleId,
          title: moduleData.title || '',
          description: moduleData.description || '',
          order: moduleData.order || 0,
          completed: moduleData.completed || false,
          locked: moduleData.locked || false,
          iconUrl: moduleData.iconUrl || ''
        };
        
        setModule(formattedModuleData);
        
        // Set form values
        if (moduleData) {
          setTitle(moduleData.title || '');
          setDescription(moduleData.description || '');
          setOrder(moduleData.order !== undefined ? moduleData.order : '');
          setLocked(moduleData.locked || false);
          setIconUrl(moduleData.iconUrl || '');
        }
        
        // Fetch all lessons in this module
        const supaLessons = await listLessons(courseId, moduleId);
        const lessonsList: Lesson[] = supaLessons.map(l => ({
          id: l.lessonId,
          title: l.title,
          description: l.description || '',
          duration: l.duration ? String(l.duration) : '',
          type: (l.type as LessonType) || undefined,
          videoUrl: l.videoUrl || undefined,
          audioUrl: l.audioUrl || undefined,
          textContent: l.textContent || undefined,
          completed: !!l.completed,
          locked: !!l.locked,
          order: l.order,
        }));

        setLessons(lessonsList);
      } catch (err) {
        console.error('Error fetching module data:', err);
        console.log('Course ID:', courseId);
        console.log('Module ID:', moduleId);
        console.log('Module path:', `courses/${courseId}/modules/${moduleId}`);
        setError("An error occurred while loading module data");
      } finally {
        setLoading(false);
      }
    };

    fetchModuleAndLessons();
  }, [courseId, moduleId]);

  // Validate form fields
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!title.trim()) errors.title = "Module title is required";
    if (!description.trim()) errors.description = "Module description is required";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Function to update module information
  const updateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !courseId || !moduleId) return;
    
    setIsSaving(true);
    
    try {
      // Prepare updated module data
      await updateModuleDb(courseId, moduleId, {
        title,
        description,
        order: typeof order === 'string' ? parseInt(order) || 0 : (order as number),
        locked,
        iconUrl,
        updatedAt: null,
      } as any);
      
      // Update local state
      const updatedModuleData = {
        title,
        description,
        order: typeof order === 'string' ? parseInt(order) || 0 : (order as number),
        locked,
        iconUrl,
      };
      setModule(prev => prev ? { ...prev, ...updatedModuleData } : null);
      
      // Show success message
      toast({
        title: "Module Updated",
        description: "Module information updated successfully",
        variant: "default",
      });
      
      // Exit edit mode
      setIsEditing(false);
      
    } catch (error) {
      console.error('Error updating module:', error);
      toast({
        title: "Error",
        description: "An error occurred while updating the module",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Function to delete module and all its lessons
  const deleteModule = async () => {
    if (!courseId || !moduleId) return;
    
    try {
      setIsDeleting(true);
      
      // Create a batch to perform multiple delete operations
      await deleteModuleDb(courseId, moduleId);
      
      toast({
        title: "Deleted Successfully",
        description: "Module and all its lessons deleted successfully",
      });
      
      // Redirect to course edit page
      navigate(`/admin/course/${courseId}/edit`);
    } catch (err) {
      console.error('Error deleting module:', err);
      toast({
        title: "Error",
        description: "An error occurred while deleting the module",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };
  
  // Function to delete a lesson
  const deleteLesson = async (lessonId: string) => {
    if (!courseId || !moduleId) return;
    
    try {
      // Delete the lesson document
      await deleteLessonDb(courseId, moduleId, lessonId);
      
      // Update local state
      setLessons(lessons.filter(lesson => lesson.id !== lessonId));
      
      toast({
        title: "Deleted Successfully",
        description: "Lesson deleted successfully",
      });
    } catch (err) {
      console.error('Error deleting lesson:', err);
      toast({
        title: "Error",
        description: "An error occurred while deleting the lesson",
        variant: "destructive",
      });
    } finally {
      setIsDeletingLesson(false);
      setLessonToDelete(null);
    }
  };
  
  // If user is not loaded yet or not admin, show nothing
  if (!user || !adminEmails.includes(user.email)) {
    return null;
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Loading module data...</h2>
        </div>
      </MainLayout>
    );
  }
  
  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold">{error}</h2>
          <p className="text-white/60 mt-2">An error occurred while loading module data. Please try again.</p>
          <Link to={`/admin/course/${courseId}/edit`} className="mt-4 inline-block">
            <GoldButton>Back to Course</GoldButton>
          </Link>
        </div>
      </MainLayout>
    );
  }
  
  if (!course || !module) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold">Module not found</h2>
          <p className="text-white/60 mt-2">Required module data was not found.</p>
          <Link to={`/admin/course/${courseId}/edit`} className="mt-4 inline-block">
            <GoldButton>Back to Course</GoldButton>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to={`/admin/course/${courseId}/edit`} className="flex items-center text-white/60 hover:text-gold transition-colors">
            <ChevronLeft className="w-5 h-5 ml-2" />
            <span>Back to Course</span>
          </Link>
        </div>
        
        {/* Course and Module Info */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
          <h2 className="text-xl text-gold">{module.title}</h2>
        </div>
        
        {/* Module Edit Form */}
        <GlassmorphicCard className="mb-8">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Module Information</h2>
              <div className="flex space-x-2">
                {isEditing ? (
                  <>
                    <GoldButton 
                      onClick={() => setIsEditing(false)}
                      variant="outline"
                      disabled={isSaving}
                    >
                      Cancel
                    </GoldButton>
                    <GoldButton 
                      onClick={updateModule}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="ml-2" size={18} />
                          Save Changes
                        </>
                      )}
                    </GoldButton>
                  </>
                ) : (
                  <>
                    <GoldButton 
                      variant="outline" 
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="ml-2" size={16} /> Edit Information
                    </GoldButton>
                    <GoldButton 
                      variant="destructive" 
                      onClick={() => setIsDeleteDialogOpen(true)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>Delete Module</>
                      )}
                    </GoldButton>
                  </>
                )}
              </div>
            </div>
            
            {isEditing ? (
              <form className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Module Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter module title"
                    className={`border-white/10 bg-black/40 focus:border-gold text-white text-left ${formErrors.title ? 'border-red-500' : ''}`}
                  />
                  {formErrors.title && <p className="text-red-500 text-sm">{formErrors.title}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Module Description *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter a detailed module description"
                    className={`min-h-32 border-white/10 bg-black/40 focus:border-gold text-white text-left ${formErrors.description ? 'border-red-500' : ''}`}
                  />
                  {formErrors.description && <p className="text-red-500 text-sm">{formErrors.description}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="order">Module Order</Label>
                  <Input
                    id="order"
                    type="number"
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                    placeholder="Enter module order number"
                    className="border-white/10 bg-black/40 focus:border-gold text-white text-left"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iconUrl">Icon URL (SVG)</Label>
                  <Input
                    id="iconUrl"
                    type="text"
                    value={iconUrl}
                    onChange={(e) => setIconUrl(e.target.value)}
                    placeholder="Enter icon URL (SVG)"
                    className="border-white/10 bg-black/40 focus:border-gold text-white"
                  />
                  {iconUrl && (
                    <div className="mt-2">
                      <Label>Icon Preview</Label>
                      <div className="w-12 h-12 mt-1 border border-white/10 rounded-lg p-2 bg-black/40">
                        <img src={iconUrl} alt="Module icon" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <Checkbox
                    id="locked"
                    checked={locked}
                    onCheckedChange={(checked) => setLocked(checked as boolean)}
                    className="border-white/10 data-[state=checked]:bg-gold data-[state=checked]:border-gold"
                  />
                  <Label htmlFor="locked" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Lock Module
                  </Label>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                {module.iconUrl && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Module Icon</h3>
                    <div className="w-16 h-16 border border-white/10 rounded-lg p-2 bg-black/40">
                      <img src={module.iconUrl} alt="Module icon" className="w-full h-full object-contain" />
                    </div>
                  </div>
                )}
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Module Title</h3>
                  <p className="text-white/90">{module.title}</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Module Description</h3>
                  <p className="text-white/90">{module.description}</p>
                </div>
                
                <div className="flex flex-wrap gap-4">
                  <div className="bg-white/10 px-4 py-2 rounded-md">
                    <span className="text-white/60">Order:</span> {module.order}
                  </div>
                  <div className="bg-white/10 px-4 py-2 rounded-md">
                    <span className="text-white/60">Lessons count:</span> {lessons.length}
                  </div>
                  <div className="bg-white/10 px-4 py-2 rounded-md">
                    <span className="text-white/60">Lock status:</span> {module.locked ? "Locked" : "Unlocked"}
                  </div>
                </div>
              </div>
            )}
          </div>
        </GlassmorphicCard>
        
        {/* Add Lesson Button */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Module Lessons</h2>
          <Link to={`/admin/course/${courseId}/module/${moduleId}/add-lesson`}>
            <GoldButton>
              <Plus className="ml-2" size={18} /> Add New Lesson
            </GoldButton>
          </Link>
        </div>
        
        {/* Add Lesson Bulk Button */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold mb-6"></h2>
          <Link to={`/admin/course/${courseId}/module/${moduleId}/add-lesson-bulk`}>
            <GoldButton>
              <Plus className="ml-2" size={18} /> Add Multiple Lessons
            </GoldButton>
          </Link>
        </div>        

        {/* Save Order Button - Removed due to Firebase migration */}
        {isOrderChanged && (
          <div className="mb-4">
             <p className="text-white/60 text-sm mt-2">Lesson order changed. Saving is temporarily disabled.</p>
          </div>
        )}

        {/* Lessons List */}
        <div className="mb-12">      
          {lessons.length === 0 ? (
            <GlassmorphicCard>
              <div className="p-6 text-center">
                <p className="text-xl">No lessons in this module</p>
                <p className="text-white/60 mt-2">Add a new lesson to get started</p>
              </div>
            </GlassmorphicCard>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={handleDragEnd}
              onDragCancel={() => setIsDragging(false)}
            >
              <SortableContext items={lessons.map(lesson => lesson.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {lessons.map((lesson, index) => (
                    <SortableLesson 
                      key={lesson.id} 
                      lesson={lesson} 
                      index={index} 
                      courseId={courseId || ''} 
                      moduleId={moduleId || ''} 
                      onDelete={(lesson) => {
                        setLessonToDelete(lesson);
                        setIsLessonDeleteDialogOpen(true);
                      }}
                      isDragging={isDragging}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
      
      {/* Module Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this module?</AlertDialogTitle>
            <AlertDialogDescription>
              The module and all its lessons will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteModule}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600 ml-2"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete Module'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lesson Delete Confirmation Dialog */}
      <AlertDialog open={isLessonDeleteDialogOpen} onOpenChange={setIsLessonDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              The lesson "{lessonToDelete?.title}" will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (lessonToDelete) {
                  setIsDeletingLesson(true);
                  deleteLesson(lessonToDelete.id)
                    .finally(() => {
                      setIsDeletingLesson(false);
                      setIsLessonDeleteDialogOpen(false);
                      setLessonToDelete(null);
                    });
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600 ml-2"
              disabled={isDeletingLesson}
            >
              {isDeletingLesson ? 'Deleting...' : 'Yes, Delete Lesson'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default EditModule;
