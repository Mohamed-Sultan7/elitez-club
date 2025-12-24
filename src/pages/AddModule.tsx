import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getCourse, listModules, createModule } from '@/db/courses';
import MainLayout from '@/components/MainLayout';
import GlassmorphicCard from '@/components/GlassmorphicCard';
import GoldButton from '@/components/GoldButton';
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Loader2, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface Course {
  id: string;
  title: string;
}

const AddModule = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [iconUrl, setIconUrl] = useState<string>('');
  const [order, setOrder] = useState<string>('');
  const [locked, setLocked] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
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

  // Fetch course data
  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) {
        setError("Course ID is missing");
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

        const courseData = {
          id: courseId,
          title: courseRow.title
        } as Course;
        
        setCourse(courseData);
        
        const modules = await listModules(courseId);
        const highestOrder = modules.length ? Math.max(...modules.map(m => m.order || 0)) : 0;
        setOrder(String(highestOrder + 1 || 1));
      } catch (err) {
        console.error('Error fetching course data:', err);
        setError("An error occurred while loading course data");
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  // Validate form fields
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!title.trim()) errors.title = "Module title is required";
    if (!description.trim()) errors.description = "Module description is required";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Function to create a slug from the title
  const createSlug = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/\s+/g, '-')     // Replace spaces with -
      .replace(/[^\w\-]+/g, '') // Remove all non-word chars
      .replace(/\-\-+/g, '-')    // Replace multiple - with single -
      .replace(/^-+/, '')        // Trim - from start of text
      .replace(/-+$/, '');       // Trim - from end of text
  };

  // Function to add a new module
  const addModule = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !courseId) return;
    
    setIsSaving(true);
    
    try {
      // Create a document ID from the module title
      const moduleId = createSlug(title);
      
      await createModule(courseId, {
        moduleId,
        title,
        description,
        iconUrl,
        order: parseInt(order) || 0,
        locked,
        completed: false,
        createdAt: null,
        updatedAt: null,
      } as any);
      
      // Show success message
      toast({
        title: "Added Successfully",
        description: "New module added successfully",
        variant: "default",
      });
      
      // Navigate to edit the new module
      navigate(`/admin/course/${courseId}/module/${moduleId}/edit`);
      
    } catch (error) {
      console.error('Error adding module:', error);
      toast({
        title: "Error",
        description: "An error occurred while adding the module",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
            <GoldButton>Back to Manage Content</GoldButton>
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
            <ChevronLeft className="w-5 h-5 mr-2" />
            <span>Back to Course</span>
          </Link>
        </div>
        
        {/* Course Info */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
          <h2 className="text-xl text-gold">Add New Module</h2>
        </div>
        
        {/* Module Add Form */}
        <GlassmorphicCard className="mb-8">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">New Module Information</h2>
            </div>
            
            <form className="space-y-6" onSubmit={addModule}>
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
                  placeholder="Enter detailed module description"
                  className={`min-h-32 border-white/10 bg-black/40 focus:border-gold text-white text-left ${formErrors.description ? 'border-red-500' : ''}`}
                />
                {formErrors.description && <p className="text-red-500 text-sm">{formErrors.description}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="iconUrl">Icon URL</Label>
                <Input
                  id="iconUrl"
                  value={iconUrl}
                  onChange={(e) => setIconUrl(e.target.value)}
                  placeholder="Enter icon or SVG URL"
                  className="border-white/10 bg-black/40 focus:border-gold text-white"
                />
                <p className="text-white/60 text-sm">Enter a URL for an image or SVG icon to represent this module</p>
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
              
              <div className="flex items-center space-x-2">
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
              
              <div className="flex justify-end space-x-2 pt-4">
                <Link to={`/admin/course/${courseId}/edit`}>
                  <GoldButton variant="outline" type="button">
                    Cancel
                  </GoldButton>
                </Link>
                <GoldButton type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="ml-2" size={18} />
                      Add Module
                    </>
                  )}
                </GoldButton>
              </div>
            </form>
          </div>
        </GlassmorphicCard>
      </div>
    </MainLayout>
  );
};

export default AddModule;
