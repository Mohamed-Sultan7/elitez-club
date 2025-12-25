import React, { useState, useEffect, ChangeEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import GlassmorphicCard from '@/components/GlassmorphicCard';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import GoldButton from '@/components/GoldButton';
import { ChevronLeft, Loader2, Save, Upload, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { addDailyDrop } from '@/db/dailyDrops';

const AddDailyMotivation = () => {
  const [text, setText] = useState('');
  const [image, setImage] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // List of admin emails that can access this page
  const adminEmails = ['ichrakchraibi5@gmail.com', 'mohamed.sultan.7744@gmail.com', 'elitez.club7@gmail.com'];
  
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
    
    if (!text.trim()) errors.text = "Content text is required";
    if (!date.trim()) errors.date = "Date is required";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle image upload and convert to base64
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Size Error",
        description: "Image size must be less than 2MB",
        variant: "destructive",
      });
      return;
    }
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      setImage(base64String);
      setImagePreview(base64String);
    };
    reader.readAsDataURL(file);
  };
  
  // Clear image preview and reset image state
  const handleClearImage = () => {
    setImage('');
    setImagePreview(null);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Prepare daily motivation data
      const customDate = new Date(date);
      
      // Add document to Supabase
      await addDailyDrop({
        text,
        image: image || null,
        customDate
      });
      
      // Show success message
      toast({
        title: "Content Added",
        description: "Daily motivation content added successfully",
        variant: "default",
      });
      
      // Reset form
      setText('');
      setImage('');
      setImagePreview(null);
      
      // Navigate to daily motivation page
      navigate('/daily-motivation');
      
    } catch (error) {
      console.error('Error adding daily motivation:', error);
      toast({
        title: "Error",
        description: "An error occurred while adding content",
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
          <Link to="/daily-motivation" className="flex items-center text-white/60 hover:text-gold transition-colors">
            <ChevronLeft className="w-5 h-5 ml-2" />
            <span>Back to Daily Motivation</span>
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold mb-8">Add New Daily Motivation</h1>
        
        <GlassmorphicCard>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="text">Text Content *</Label>
                <Textarea
                  id="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter daily motivation content here..."
                  className={`min-h-32 border-white/10 bg-black/40 focus:border-gold text-white text-left ${formErrors.text ? 'border-red-500' : ''}`}
                />
                {formErrors.text && <p className="text-red-500 text-sm">{formErrors.text}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Date *
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`border-white/10 bg-black/40 focus:border-gold text-white ${formErrors.date ? 'border-red-500' : ''}`}
                />
                {formErrors.date && <p className="text-red-500 text-sm">{formErrors.date}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="image">Add Image (Optional)</Label>
                
                {/* Drag and drop upload area */}
                <div 
                  className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 ease-in-out
                    ${imagePreview ? 'border-gold/50 bg-black/30' : 'border-white/20 bg-black/20 hover:border-gold/30 hover:bg-black/25'}
                    flex flex-col items-center justify-center text-center`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const target = e.target as HTMLDivElement;
                    target.classList.add('border-gold');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const target = e.target as HTMLDivElement;
                    target.classList.remove('border-gold');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const target = e.target as HTMLDivElement;
                    target.classList.remove('border-gold');
                    
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const file = e.dataTransfer.files[0];
                      
                      // Check if it's an image
                      if (!file.type.match('image.*')) {
                        toast({
                          title: "Unsupported File Type",
                          description: "Please select an image file only",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      // Check file size (max 2MB)
                      if (file.size > 2 * 1024 * 1024) {
                        toast({
                          title: "File Size Error",
                          description: "Image size must be less than 2MB",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      // Convert to base64
                      const reader = new FileReader();
                      reader.onload = () => {
                        const base64String = reader.result as string;
                        setImage(base64String);
                        setImagePreview(base64String);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                >
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  
                  {!imagePreview ? (
                    <label htmlFor="image-upload" className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                      <Upload className="h-10 w-10 text-white/50 mb-2" />
                      <p className="text-white font-medium mb-1">Drag & drop image here</p>
                      <p className="text-white/50 text-sm">or click to select image</p>
                      <p className="text-white/40 text-xs mt-2">(Max size: 2MB)</p>
                    </label>
                  ) : (
                    <div className="relative w-full">
                      <img 
                        src={imagePreview} 
                        alt="Image Preview" 
                        className="w-full h-auto max-h-[300px] object-contain rounded-md"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={handleClearImage}
                        className="absolute top-2 left-2 h-8 w-8 rounded-full shadow-md"
                        aria-label="Delete Image"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
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
                      Save Content
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

export default AddDailyMotivation;
