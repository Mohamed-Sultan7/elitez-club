import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { createCourse } from '@/db/courses';
import MainLayout from '@/components/MainLayout';
import GlassmorphicCard from '@/components/GlassmorphicCard';
import GoldButton from '@/components/GoldButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Save, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const AddCourse = () => {
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructor, setInstructor] = useState('Andrew Tate');
  const [thumbnail, setThumbnail] = useState('');
  const [moduleCount, setModuleCount] = useState<number | ''>('');
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showAdditionalFields, setShowAdditionalFields] = useState(false);
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

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!courseId.trim()) errors.courseId = "Course ID is required";
    if (!title.trim()) errors.title = "Course title is required";
    if (!description.trim()) errors.description = "Course description is required";
    if (!thumbnail.trim()) errors.thumbnail = "Thumbnail URL is required";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Prepare course data
      await createCourse({
        id: courseId,
        title,
        description,
        instructor,
        thumbnail: thumbnail || "/thumbnails/default.jpg",
        locked,
        order: typeof order === 'string' ? parseInt(order) || 0 : (order || 0),
        createdAt: null,
        updatedAt: null,
      } as any);
      
      console.log('Course added with ID:', courseId);
      
      // Show success message
      toast({
        title: "Course Added",
        description: "Course added successfully",
        variant: "default",
      });
      
      // Reset form
      setCourseId('');
      setTitle('');
      setDescription('');
      setInstructor('');
      setThumbnail('');
      setModuleCount('');
      
      // Navigate back to manage content page
      navigate('/admin/manage-content');
      
    } catch (error) {
      console.error('Error adding course:', error);
      toast({
        title: "Error",
        description: "An error occurred while adding the course",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // If user is not loaded yet or not admin, show nothing
  if (!user || !adminEmails.includes(user.email)) {
    return null;
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
        
        <h1 className="text-3xl font-bold mb-8">Add New Course</h1>
        
        <GlassmorphicCard>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="courseId">Course ID *</Label>
                <Input
                  id="courseId"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  placeholder="Enter Course ID (e.g., 1, content-ai)"
                  className={`border-white/10 bg-black/40 focus:border-gold text-white ${formErrors.courseId ? 'border-red-500' : ''}`}
                />
                {formErrors.courseId && <p className="text-red-500 text-sm">{formErrors.courseId}</p>}
              </div>
              
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
                  className={`min-h-32 border-white/10 bg-black/40 focus:border-gold text-white text-left ${formErrors.description ? 'border-red-500' : ''}`}
                />
                {formErrors.description && <p className="text-red-500 text-sm">{formErrors.description}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="thumbnail">Thumbnail URL *</Label>
                <Input
                  id="thumbnail"
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                  placeholder="Enter course thumbnail URL"
                  className={`border-white/10 bg-black/40 focus:border-gold text-white ${formErrors.thumbnail ? 'border-red-500' : ''}`}
                />
                {formErrors.thumbnail && <p className="text-red-500 text-sm">{formErrors.thumbnail}</p>}
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

              {/* Toggle button for additional fields */}
              <button 
                type="button" 
                onClick={() => setShowAdditionalFields(!showAdditionalFields)}
                className="flex items-center justify-center w-full py-2 text-gold hover:text-white transition-colors duration-200 focus:outline-none"
              >
                {showAdditionalFields ? (
                  <>
                    <span>Hide Additional Info</span>
                    <ChevronUp className="mr-2" size={18} />
                  </>
                ) : (
                  <>
                    <span>Add Additional Info</span>
                    <ChevronDown className="mr-2" size={18} />
                  </>
                )}
              </button>

              {/* Additional fields - conditionally visible */}
              {showAdditionalFields && (
                <div className="space-y-4 animate-fade-in border-t border-white/10 pt-4">
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
                    <Label htmlFor="order">Course Order</Label>
                    <Input
                    id="order"
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                    placeholder="Add course order"
                    className={`border-white/10 bg-black/40 focus:border-gold text-white text-left ${formErrors.order ? 'border-red-500' : ''}`}
                    />
                    {formErrors.order && <p className="text-red-500 text-sm">{formErrors.order}</p>}
                  </div>                                    
                  <div className="space-y-2">
                    <Label htmlFor="moduleCount">Number of Modules</Label>
                    <Input
                      id="moduleCount"
                      type="number"
                      min="0"
                      value={moduleCount}
                      onChange={(e) => setModuleCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                      placeholder="Enter expected number of modules"
                      className="border-white/10 bg-black/40 focus:border-gold text-white"
                    />
                    <p className="text-white/50 text-sm">Optional: You can add modules later</p>
                  </div>
                </div>
              )}
              
              <div className="pt-4">
                <GoldButton type="submit" disabled={loading} className="w-full md:w-auto">
                  {loading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="ml-2" size={18} />
                      Save Course
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

export default AddCourse;
