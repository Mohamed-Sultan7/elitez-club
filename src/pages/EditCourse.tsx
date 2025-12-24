import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getCourse, listModules, updateCourse as updateCourseDb, deleteCourse as deleteCourseDb, listLessons, deleteModule as deleteModuleDb } from '@/db/courses';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import MainLayout from '@/components/MainLayout';
import GlassmorphicCard from '@/components/GlassmorphicCard';
import GoldButton from '@/components/GoldButton';
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Edit, Plus, Clock, CheckCircle, LockIcon, Loader2, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

// Type definitions
interface Module {
  id: string;
  title: string;
  description: string;
  order: number;
  completed: boolean;
  locked: boolean;
  iconUrl?: string;
  lessonsCount?: number;
}

interface Course {
  id: string;
  title: string;
  description: string;
  locked: boolean;
  order: number | string;
  instructor: string;
  thumbnail: string;
  modules?: Module[];
}

const EditCourse = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
  // Module deletion states
  const [isModuleDeleteDialogOpen, setIsModuleDeleteDialogOpen] = useState<boolean>(false);
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);
  const [isDeletingModule, setIsDeletingModule] = useState<boolean>(false);
  
  // Form states
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [instructor, setInstructor] = useState<string>('');
  const [thumbnail, setThumbnail] = useState<string>('');
  const [locked, setLocked] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [order, setOrder] = useState<number | string>('');
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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
    const fetchCourseAndModules = async () => {
      if (!courseId) {
        setError("Course ID not found");
        setLoading(false);
        return;
      }

      try {
        const courseRow = await getCourse(courseId);
        if (!courseRow) {
          setError("Course not found");
          setLoading(false);
          return;
        }

        const courseData: Course = {
          id: courseRow.id,
          title: courseRow.title || '',
          description: courseRow.description || '',
          locked: !!courseRow.locked,
          order: courseRow.order,
          instructor: courseRow.instructor || '',
          thumbnail: courseRow.thumbnail || '',
        };
        
        setCourse(courseData);
        
        // Set form values
        setTitle(courseData.title || '');
        setDescription(courseData.description || '');
        setInstructor(courseData.instructor || '');
        setThumbnail(courseData.thumbnail || '');
        setLocked(courseData.locked || false);
        setOrder(courseData.order || '');
        
        const supaModules = await listModules(courseId);
        const modulesList: Module[] = [];
        for (const m of supaModules) {
          const lessons = await listLessons(courseId, m.moduleId);
          modulesList.push({
            id: m.moduleId,
            title: m.title,
            description: m.description || '',
            order: m.order,
            completed: !!m.completed,
            locked: !!m.locked,
            iconUrl: m.iconUrl || undefined,
            lessonsCount: lessons.length,
          });
        }

        setModules(modulesList);
      } catch (err) {
        console.error('Error fetching course data:', err);
        setError("An error occurred while loading course data");
      } finally {
        setLoading(false);
      }
    };

    fetchCourseAndModules();
  }, [courseId]);

  // Validate form fields
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!title.trim()) errors.title = "Course title is required";
    if (!description.trim()) errors.description = "Course description is required";
    if (!thumbnail.trim()) errors.thumbnail = "Thumbnail URL is required";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Function to update course information
  const updateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !courseId) return;
    
    setIsSaving(true);
    
    try {
      await updateCourseDb(courseId, {
        title,
        description,
        instructor,
        thumbnail,
        locked,
        order: typeof order === 'string' ? parseInt(order) || 0 : (order || 0),
        updatedAt: null,
      } as any);
      
      // Update local state
      setCourse(prev => prev ? {
        ...prev,
        title,
        description,
        instructor,
        thumbnail,
        locked,
        order: typeof order === 'string' ? parseInt(order) || 0 : (order || 0),
      } : null);
      
      // Show success message
      toast({
        title: "Course Updated",
        description: "Course information updated successfully",
        variant: "default",
      });
      
      // Exit edit mode
      setIsEditing(false);
      
    } catch (error) {
      console.error('Error updating course:', error);
      toast({
        title: "Error",
        description: "An error occurred while updating the course",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Function to delete course and all its modules and lessons
  const deleteCourse = async () => {
    if (!courseId) return;
    
    try {
      setIsDeleting(true);
      
      await deleteCourseDb(courseId);
      
      toast({
        title: "Deleted Successfully",
        description: "Course and all its modules and lessons deleted successfully",
      });
      
      // Redirect to manage content page
      navigate('/admin/manage-content');
    } catch (err) {
      console.error('Error deleting course:', err);
      toast({
        title: "Error",
        description: "An error occurred while deleting the course",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
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
          <h2 className="text-2xl font-bold">Loading course data...</h2>
        </div>
      </MainLayout>
    );
  }
  
  if (error || !course) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold">{error || "Course not found"}</h2>
          <Link to="/admin/manage-content" className="mt-4 inline-block">
            <GoldButton>Back to Content Management</GoldButton>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/admin/manage-content" className="flex items-center text-white/60 hover:text-gold transition-colors">
            <ChevronLeft className="w-5 h-5 ml-2" />
            <span>Back to Content Management</span>
          </Link>
        </div>
        
        {/* Course Edit Form */}
        <GlassmorphicCard className="mb-8">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Course Information</h2>
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
                      onClick={updateCourse}
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
                        <>Delete Course</>
                      )}
                    </GoldButton>
                  </>
                )}
              </div>
            </div>
            
            {isEditing ? (
              <form className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Course Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter Course Title"
                    className={`border-white/10 bg-black/40 focus:border-gold text-white ${formErrors.title ? 'border-red-500' : ''}`}
                  />
                  {formErrors.title && <p className="text-red-500 text-sm">{formErrors.title}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Course Description *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter detailed course description"
                    className={`min-h-32 border-white/10 bg-black/40 focus:border-gold text-white ${formErrors.description ? 'border-red-500' : ''}`}
                  />
                  {formErrors.description && <p className="text-red-500 text-sm">{formErrors.description}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="instructor">Instructor</Label>
                  <Input
                    id="instructor"
                    value={instructor}
                    onChange={(e) => setInstructor(e.target.value)}
                    placeholder="Enter instructor name"
                    className={`border-white/10 bg-black/40 focus:border-gold text-white text-left ${formErrors.instructor ? 'border-red-500' : ''}`}
                  />
                  {formErrors.instructor && <p className="text-red-500 text-sm">{formErrors.instructor}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="thumbnail">Thumbnail URL *</Label>
                  <Input
                    id="thumbnail"
                    value={thumbnail}
                    onChange={(e) => setThumbnail(e.target.value)}
                    placeholder="Enter course thumbnail URL"
                    className={`border-white/10 bg-black/40 focus:border-gold text-white text-left ${formErrors.thumbnail ? 'border-red-500' : ''}`}
                  />
                  {formErrors.thumbnail && <p className="text-red-500 text-sm">{formErrors.thumbnail}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order">Course Order</Label>
                  <Input
                    id="order"
                    type="number"
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                    placeholder="Enter course order"
                    className="border-white/10 bg-black/40 focus:border-gold text-white"
                  />
                </div>
                
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <Checkbox
                    id="locked"
                    checked={locked}
                    onCheckedChange={(checked) => setLocked(checked as boolean)}
                    className="border-white/10 data-[state=checked]:bg-gold data-[state=checked]:border-gold"
                  />
                  <Label htmlFor="locked" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Lock Course
                  </Label>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Course Title</h3>
                  <p className="text-white/90">{course.title}</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Course Description</h3>
                  <p className="text-white/90">{course.description}</p>
                </div>
                
                <div className="flex flex-wrap gap-4">
                  <div className="bg-white/10 px-4 py-2 rounded-md">
                    <span className="text-white/60">Instructor:</span> {course.instructor}
                  </div>
                  <div className="bg-white/10 px-4 py-2 rounded-md">
                    <span className="text-white/60">Modules:</span> {modules.length}
                  </div>
                  <div className="bg-white/10 px-4 py-2 rounded-md">
                    <span className="text-white/60">Status:</span> {course.locked ? "Locked" : "Open"}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Thumbnail</h3>
                  <div className="relative h-40 w-full md:w-1/3 rounded overflow-hidden">
                    <img 
                      src={course.thumbnail || "/thumbnails/default.jpg"} 
                      alt={course.title}
                      className="h-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </GlassmorphicCard>
        
        {/* Add Module Button */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold mb-6">Course Modules</h2>
          <Link to={`/admin/course/${courseId}/add-module`}>
            <GoldButton>
              <Plus className="ml-2" size={18} /> Add New Module
            </GoldButton>
          </Link>
        </div>

        {/* Modules List */}
        <div className="mb-12">      
          {modules.length === 0 ? (
            <GlassmorphicCard>
              <div className="p-6 text-center">
                <p className="text-xl">No modules in this course</p>
                <p className="text-white/60 mt-2">Add a new module to start</p>
              </div>
            </GlassmorphicCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map((module, index) => (
                <div key={module.id} className="animate-fade-in">
                  <GlassmorphicCard 
                    hover={true}
                    className={`h-full transition-all duration-300 overflow-hidden hover:shadow-lg ${module.completed ? 'border-gold/20' : ''}`}
                  >
                    <div className="relative">
                      {/* Module Status Indicator */}
                      <div className="relative h-40 flex items-center justify-center bg-white/5 overflow-hidden rounded-t-lg">
                        <div className="absolute top-0 right-0 m-3 bg-white/10 text-white text-xs px-2 py-1 rounded-full">
                          Order: {module.order}
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
                            ) : module.locked ? (
                              <LockIcon className="w-8 h-8 text-white/60" />
                            ) : (
                              <span className="text-white/80 text-2xl font-semibold">{index + 1}</span>
                            )}
                          </div>
                        )}
                        
                        {module.locked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <LockIcon className="w-10 h-10 text-white/80" />
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4">
                        <h3 className={`text-xl font-bold mb-2 ${module.completed ? 'text-gold' : module.locked ? 'text-white/40' : 'text-white'}`}>
                          {module.title}
                        </h3>
                        {module.description && (
                          <p className="text-white/70 text-sm mb-4 line-clamp-2">{module.description}</p>
                        )}
                        
                        <div className="flex space-x-2 rtl:space-x-reverse">
                          <Link to={`/admin/course/${courseId}/module/${module.id}/edit`} className="flex-1">
                            <GoldButton variant="outline" size="sm" className="w-full">
                              <Edit className="ml-2" size={14} /> Edit
                            </GoldButton>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </GlassmorphicCard>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Course Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this course?</AlertDialogTitle>
            <AlertDialogDescription>
              This course and all its lessons will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteCourse}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600 ml-2"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete Course'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Module Delete Confirmation Dialog */}
      <AlertDialog open={isModuleDeleteDialogOpen} onOpenChange={setIsModuleDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this module?</AlertDialogTitle>
            <AlertDialogDescription>
              The module "{moduleToDelete?.title}" and all its lessons will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (moduleToDelete) {
                  // Delete module and its lessons
                  const deleteModule = async () => {
                    try {
                      setIsDeletingModule(true);
                      await deleteModuleDb(courseId, moduleToDelete.id);
                      
                      // Update the UI by removing the deleted module
                      setModules(modules.filter(m => m.id !== moduleToDelete.id));
                      
                      toast({
                        title: "Deleted Successfully",
                        description: "Module and all its lessons have been deleted successfully",
                      });
                    } catch (err) {
                      console.error('Error deleting module:', err);
                      toast({
                        title: "Error",
                        description: "An error occurred while deleting the module",
                        variant: "destructive",
                      });
                    } finally {
                      setIsDeletingModule(false);
                      setIsModuleDeleteDialogOpen(false);
                      setModuleToDelete(null);
                    }
                  };
                  
                  deleteModule();
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600 ml-2"
              disabled={isDeletingModule}
            >
              {isDeletingModule ? 'Deleting...' : 'Yes, Delete Module'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default EditCourse;
