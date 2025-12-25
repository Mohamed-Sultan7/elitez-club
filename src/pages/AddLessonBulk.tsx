import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { listLessons, listModules, createLesson } from '@/db/courses';
import MainLayout from '@/components/MainLayout';
import GlassmorphicCard from '@/components/GlassmorphicCard';
import GoldButton from '@/components/GoldButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Save, Plus, Trash, Loader2, Upload, FileText } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

// Lesson interface for bulk operations
interface BulkLesson {
  title: string;
  videoUrl: string;
  description: string;
}

const AddLessonBulk = () => {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>();
  const [moduleName, setModuleName] = useState('');
  const [lessons, setLessons] = useState<BulkLesson[]>([{ title: '', videoUrl: '', description: '' }]);
  const [loading, setLoading] = useState(false);
  const [startingOrder, setStartingOrder] = useState<number>(1);
  const [csvUploading, setCsvUploading] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // List of admin emails that can access this page
  const adminEmails = ['ichrakchraibi5@gmail.com', 'mohamed.sultan.7744@gmail.com', 'elitez.club7@gmail.com
'];
  
  // Protect the admin page - only accessible by admins
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    } else if (!adminEmails.includes(user.email)) {
      navigate('/home', { replace: true });
      toast({
        title: "Unauthorized",
        description: "You do not have permission to access this page",
        variant: "destructive",
      });
    }
  }, [user, navigate, toast]);

  // Fetch module info and current number of lessons
  useEffect(() => {
    const fetchModuleAndLessonsCount = async () => {
      if (!courseId || !moduleId) return;
      
      try {
        const modules = await listModules(courseId);
        const currentModule = modules.find(m => m.moduleId === moduleId);
        if (currentModule) setModuleName(currentModule.title || '');
        const lessons = await listLessons(courseId, moduleId);
        const nextNumber = lessons.length + 1;
        
        setStartingOrder(nextNumber);
      } catch (error) {
        console.error('Error fetching module info or lessons count:', error);
      }
    };

    fetchModuleAndLessonsCount();
  }, [courseId, moduleId]);

  // Convert Google Drive link to preview format
  const convertGoogleDriveLink = (url: string): string => {
    if (!url) return url;
    
    // Check if it's a Google Drive link
    const driveRegex = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(driveRegex);
    
    if (match) {
      const fileId = match[1];
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    
    return url;
  };

  // Parse CSV file and convert to lessons
  const parseCsvFile = useCallback((file: File) => {
    setCsvUploading(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsedLessons: BulkLesson[] = [];
          
          results.data.forEach((row: any, index: number) => {
            // Check for required columns (case-insensitive)
            const title = row.title || row.Title || row.TITLE || '';
            const link = row.link || row.Link || row.LINK || row.url || row.URL || row.videoUrl || '';
            const description = row.description || row.Description || row.DESCRIPTION || row.desc || row.Desc || '';
            
            // Skip rows without title or link
            if (title.trim() && link.trim()) {
              parsedLessons.push({
                title: title.trim(),
                videoUrl: convertGoogleDriveLink(link.trim()),
                description: description.trim()
              });
            }
          });
          
          if (parsedLessons.length === 0) {
            toast({
              title: "Empty File",
              description: "No valid lessons found in the file. Ensure 'title' and 'link' columns exist",
              variant: "destructive",
            });
          } else {
            setLessons(parsedLessons);
            toast({
              title: "File Uploaded",
              description: `${parsedLessons.length} lessons loaded from CSV file`,
              variant: "default",
            });
          }
        } catch (error) {
          console.error('Error parsing CSV:', error);
          toast({
            title: "Parsing Error",
            description: "An error occurred while parsing the CSV file",
            variant: "destructive",
          });
        } finally {
          setCsvUploading(false);
        }
      },
      error: (error) => {
        console.error('Papa Parse error:', error);
        toast({
          title: "File Read Error",
          description: "Could not read CSV file. Ensure valid file format",
          variant: "destructive",
        });
        setCsvUploading(false);
      }
    });
  }, [toast]);

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      parseCsvFile(file);
    }
  }, [parseCsvFile]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1,
    multiple: false
  });

  // Add a new row
  const handleAddRow = () => {
    setLessons([...lessons, { title: '', videoUrl: '', description: '' }]);
  };

  // Remove a row
  const handleRemoveRow = (index: number) => {
    if (lessons.length > 1) {
      const updatedLessons = lessons.filter((_, i) => i !== index);
      setLessons(updatedLessons);
    }
  };

  // Update lesson data
  const handleLessonChange = (index: number, field: keyof BulkLesson, value: string) => {
    const updatedLessons = [...lessons];
    
    // Auto-convert Google Drive links for videoUrl field
    if (field === 'videoUrl') {
      value = convertGoogleDriveLink(value);
    }
    
    updatedLessons[index][field] = value;
    setLessons(updatedLessons);
  };

  // Submit all lessons
  const handleSubmitAll = async () => {
    if (!courseId || !moduleId) return;
    
    // Filter out empty lessons (must have title and videoUrl)
    const validLessons = lessons.filter(lesson => 
      lesson.title.trim() !== '' && lesson.videoUrl.trim() !== ''
    );
    
    if (validLessons.length === 0) {
      toast({
        title: "Error",
        description: "You must add at least one lesson with a title and video link",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Add each lesson to Supabase
      for (let i = 0; i < validLessons.length; i++) {
        const lesson = validLessons[i];
        const lessonOrder = startingOrder + i;
        const lessonId = lessonOrder.toString();
        
        await createLesson(courseId, moduleId, {
          lessonId,
          title: lesson.title,
          description: lesson.description || '',
          type: 'video',
          videoUrl: lesson.videoUrl,
          audioUrl: '',
          textContent: '',
          duration: null,
          locked: false,
          completed: false,
          transcript: '',
          notes: [],
          resources: [],
          order: lessonOrder,
          createdAt: null,
          updatedAt: null,
        } as any);
      }
      
      // Show success message
      toast({
        title: "Lessons Added",
        description: `${validLessons.length} lessons added successfully`,
        variant: "default",
      });
      
      // Navigate back to edit module page
      navigate(`/admin/course/${courseId}/module/${moduleId}/edit`);
      
    } catch (error) {
      console.error('Error adding lessons:', error);
      toast({
        title: "Error",
        description: "An error occurred while adding lessons",
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
          <Link to={`/admin/course/${courseId}/module/${moduleId}/edit`} className="flex items-center text-white/60 hover:text-gold transition-colors">
            <ChevronLeft className="w-5 h-5 ml-2" />
            <span>Back to Edit Module</span>
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold mb-8">Add Multiple Lessons</h1>
        {moduleName && <h2 className="text-xl text-gold mb-6">Module: {moduleName}</h2>}
        
        <GlassmorphicCard>
          <div className="p-6">
            {/* CSV Upload Dropzone */}
            <div className="mb-8">
              <div
                {...getRootProps()}
                className={`
                  relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300
                  ${isDragActive && !isDragReject ? 'border-gold bg-gold/10' : ''}
                  ${isDragReject ? 'border-red-500 bg-red-500/10' : ''}
                  ${!isDragActive && !isDragReject ? 'border-white/20 bg-black/20 hover:border-gold/50 hover:bg-gold/5' : ''}
                `}
              >
                <input {...getInputProps()} />
                
                {csvUploading ? (
                  <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="w-12 h-12 text-gold animate-spin" />
                    <p className="text-white/80 text-lg">Parsing CSV file...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="flex items-center justify-center w-16 h-16 bg-gold/20 rounded-full">
                      {isDragActive ? (
                        <Upload className="w-8 h-8 text-gold" />
                      ) : (
                        <FileText className="w-8 h-8 text-gold" />
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-xl font-semibold text-white">
                        {isDragActive ? '📥 Drop file here' : '📥 Drag & Drop CSV file here or click to upload'}
                      </p>
                      <p className="text-white/60 text-sm">
                        File must contain columns: title, link, description
                      </p>
                      {isDragReject && (
                        <p className="text-red-400 text-sm font-medium">
                          ⚠️ CSV files only
                        </p>
                      )}
                    </div>
                    
                    <div className="text-xs text-white/40 bg-black/30 px-3 py-1 rounded">
                      CSV files only • Max 1 file
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-white/80 mb-4">
                💡 Add multiple video lessons at once. Lessons will be numbered automatically starting from {startingOrder}
              </p>
              <p className="text-white/60 text-sm">
                🔗 When pasting a Google Drive link, it will be automatically converted to preview format
              </p>
            </div>

            {/* Table Header */}
            <div className="mb-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-black/20 rounded-lg border border-white/10">
                <div className="md:col-span-1 text-center">
                  <Label className="text-gold font-semibold">#</Label>
                </div>
                <div className="md:col-span-4">
                  <Label className="text-gold font-semibold">Lesson Title *</Label>
                </div>
                <div className="md:col-span-4">
                  <Label className="text-gold font-semibold">Video URL *</Label>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-gold font-semibold">Description</Label>
                </div>
                <div className="md:col-span-1 text-center">
                  <Label className="text-gold font-semibold">Remove</Label>
                </div>
              </div>
            </div>

            {/* Lessons Rows */}
            <div className="space-y-3 mb-6">
              {lessons.map((lesson, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-black/10 rounded-lg border border-white/5 hover:border-white/20 transition-colors">
                  {/* Order Number */}
                  <div className="md:col-span-1 flex items-center justify-center">
                    <span className="text-gold font-semibold text-lg">
                      {startingOrder + index}
                    </span>
                  </div>
                  
                  {/* Title */}
                  <div className="md:col-span-4">
                    <Input
                      value={lesson.title}
                      onChange={(e) => handleLessonChange(index, 'title', e.target.value)}
                      placeholder="Lesson Title"
                      className="border-white/10 bg-black/40 focus:border-gold text-white text-left"
                    />
                  </div>
                  
                  {/* Video URL */}
                  <div className="md:col-span-4">
                    <Input
                      value={lesson.videoUrl}
                      onChange={(e) => handleLessonChange(index, 'videoUrl', e.target.value)}
                      placeholder="Video URL (Google Drive, YouTube, etc.)"
                      className="border-white/10 bg-black/40 focus:border-gold text-white text-left"
                    />
                  </div>
                  
                  {/* Description */}
                  <div className="md:col-span-2">
                    <Textarea
                      value={lesson.description}
                      onChange={(e) => handleLessonChange(index, 'description', e.target.value)}
                      placeholder="Short description"
                      className="min-h-[40px] border-white/10 bg-black/40 focus:border-gold text-white text-left resize-none"
                      rows={1}
                    />
                  </div>
                  
                  {/* Delete Button */}
                  <div className="md:col-span-1 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      disabled={lessons.length === 1}
                      className="p-2 text-white/60 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-4 border-t border-white/10">
              <GoldButton 
                type="button" 
                variant="outline" 
                onClick={handleAddRow}
                className="w-full sm:w-auto"
              >
                <Plus className="ml-2" size={16} /> 
                Add New Row
              </GoldButton>
              
              <GoldButton 
                type="button" 
                onClick={handleSubmitAll}
                disabled={loading}
                className="w-full sm:w-auto bg-gradient-to-r from-gold to-yellow-600 hover:from-yellow-600 hover:to-gold"
              >
                {loading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Add All Lessons
                  </>
                )}
              </GoldButton>
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-black/20 rounded-lg border border-white/10">
              <div className="text-center text-white/80">
                <p className="text-sm">
                  📊 Total Lessons: <span className="text-gold font-semibold">{lessons.length}</span>
                </p>
                <p className="text-sm mt-1">
                  ✅ Valid lessons to add: <span className="text-green-400 font-semibold">
                    {lessons.filter(l => l.title.trim() && l.videoUrl.trim()).length}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </GlassmorphicCard>
      </div>
    </MainLayout>
  );
};

export default AddLessonBulk;
