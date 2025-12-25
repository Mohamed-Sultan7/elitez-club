import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getLesson, listModules, updateLesson as updateLessonDb, deleteLesson as deleteLessonDb } from '@/db/courses';
import MainLayout from '@/components/MainLayout';
import GlassmorphicCard from '@/components/GlassmorphicCard';
import GoldButton from '@/components/GoldButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Save, Plus, Trash, Loader2, ChevronDown, ChevronUp, Video, Headphones, FileText } from 'lucide-react';
import RichTextEditor from '@/components/RichTextEditor';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';



// Lesson type definitions
type LessonType = 'video' | 'audio' | 'text';

const lessonTypes = [
  { value: 'video', label: 'Video Lesson', icon: Video},
  { value: 'audio', label: 'Audio Lesson', icon: Headphones},
  { value: 'text', label: 'Text Lesson', icon: FileText}
] as const;

// Type definitions
interface Resource {
  title: string;
  url: string;
}

interface Module {
  id: string;
  title: string;
  description: string;
  duration: string;
  completed: boolean;
  locked: boolean;
  isFree?: boolean;
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

const EditLesson = () => {
  const { courseId, moduleId, lessonId } = useParams<{ courseId: string; moduleId: string; lessonId: string }>();
  const [moduleName, setModuleName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lessonType, setLessonType] = useState<LessonType>('video');
  
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
  const [videoUrl, setVideoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [duration, setDuration] = useState('');
  const [locked, setLocked] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [isFree, setIsFree] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [notes, setNotes] = useState<string[]>(['']);
  const [resources, setResources] = useState<Resource[]>([{ title: '', url: '' }]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showAdditionalFields, setShowAdditionalFields] = useState(false);
  const [order, setOrder] = useState<number>(0);
  
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

  // Fetch lesson data
  useEffect(() => {
    const fetchLessonData = async () => {
      if (!courseId || !moduleId || !lessonId) {
        toast({
          title: "Error",
          description: "Course, module, or lesson ID is missing",
          variant: "destructive",
        });
        navigate('/admin/manage-content');
        return;
      }

      try {
        const modules = await listModules(courseId);
        const currentModule = modules.find(m => m.moduleId === moduleId);
        if (currentModule) {
          setModuleName(currentModule.title || '');
        }
        const lessonRow = await getLesson(courseId, moduleId, lessonId);
        if (!lessonRow) {
          toast({
            title: "Error",
            description: "Lesson not found",
            variant: "destructive",
          });
          navigate(`/admin/course/${courseId}/module/${moduleId}/edit`);
          return;
        }
        const lessonData = {
          title: lessonRow.title,
          description: lessonRow.description || '',
          type: lessonRow.type as LessonType,
          videoUrl: lessonRow.videoUrl || '',
          audioUrl: lessonRow.audioUrl || '',
          textContent: lessonRow.textContent || '',
          duration: lessonRow.duration ? String(lessonRow.duration) : '',
          locked: !!lessonRow.locked,
          completed: !!lessonRow.completed,
          isFree: false,
          transcript: lessonRow.transcript || '',
          notes: lessonRow.notes || [],
          resources: (lessonRow.resources || []) as Resource[],
          order: lessonRow.order || 0,
        } as Module;
        
        // Set form values
        setTitle(lessonData.title || '');
        setDescription(lessonData.description || '');
        setLessonType(lessonData.type || 'video');
        setVideoUrl(lessonData.videoUrl || '');
        setAudioUrl(lessonData.audioUrl || '');
        setTextContent(lessonData.textContent || '');
        setDuration(lessonData.duration || '');
        setLocked(lessonData.locked || false);
        setCompleted(lessonData.completed || false);
        setIsFree(lessonData.isFree || false);
        setTranscript(lessonData.transcript || '');
        setNotes(lessonData.notes?.length ? lessonData.notes : ['']);
        setResources(lessonData.resources?.length ? lessonData.resources : [{ title: '', url: '' }]);
        setOrder(lessonData.order || 0);
      } catch (err) {
        console.error('Error fetching lesson data:', err);
        toast({
          title: "Error",
          description: "An error occurred while loading lesson data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLessonData();
  }, [courseId, lessonId, navigate, toast]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!title.trim()) errors.title = "Lesson title is required";
    if (!description.trim()) errors.description = "Lesson description is required";
    
    if (lessonType === 'video' && !videoUrl.trim()) {
      errors.videoUrl = "Video URL is required";
    }
    
    if (lessonType === 'audio' && !audioUrl.trim()) {
      errors.audioUrl = "Audio URL is required";
    }
    
    if (lessonType === 'text' && !textContent.trim()) {
      errors.textContent = "Text content is required";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddNote = () => {
    setNotes([...notes, '']);
  };

  const handleRemoveNote = (index: number) => {
    const updatedNotes = [...notes];
    updatedNotes.splice(index, 1);
    setNotes(updatedNotes);
  };

  const handleNoteChange = (index: number, value: string) => {
    const updatedNotes = [...notes];
    updatedNotes[index] = value;
    setNotes(updatedNotes);
  };

  const handleAddResource = () => {
    setResources([...resources, { title: '', url: '' }]);
  };

  const handleRemoveResource = (index: number) => {
    const updatedResources = [...resources];
    updatedResources.splice(index, 1);
    setResources(updatedResources);
  };

  const handleResourceChange = (index: number, field: 'title' | 'url', value: string) => {
    const updatedResources = [...resources];
    
    // Auto-convert Google Drive links for resource URLs
    if (field === 'url') {
      updatedResources[index][field] = convertGoogleDriveLink(value);
    } else {
      updatedResources[index][field] = value;
    }
    
    setResources(updatedResources);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !courseId || !moduleId || !lessonId) return;
    
    setIsSaving(true);
    
    try {
      // Filter out empty notes and resources
      const validNotes = notes.filter(note => note.trim() !== '');
      const validResources = resources.filter(resource => resource.title.trim() !== '' && resource.url.trim() !== '');
      
      await updateLessonDb(courseId, moduleId, lessonId, {
        title,
        description,
        type: lessonType,
        videoUrl,
        audioUrl,
        textContent,
        duration: duration ? parseInt(duration) || null : null,
        locked,
        completed,
        transcript,
        notes: validNotes,
        resources: validResources,
        order,
        updatedAt: null,
      } as any);
      
      // Show success message
      toast({
        title: "Lesson Updated",
        description: "Lesson updated successfully",
        variant: "default",
      });
      
      // Navigate back to edit module page
      navigate(`/admin/course/${courseId}/module/${moduleId}/edit`);
      
    } catch (error) {
      console.error('Error updating lesson:', error);
      toast({
        title: "Error",
        description: "An error occurred while updating the lesson",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLesson = async () => {
    if (!courseId || !moduleId || !lessonId) return;
    
    setIsDeleting(true);
    
    try {
      await deleteLessonDb(courseId, moduleId, lessonId);
      
      toast({
        title: "Deleted Successfully",
        description: "Lesson deleted successfully",
      });
      
      // Navigate back to edit module page
      navigate(`/admin/course/${courseId}/module/${moduleId}/edit`);
    } catch (err) {
      console.error('Error deleting lesson:', err);
      toast({
        title: "Error",
        description: "An error occurred while deleting the lesson",
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
          <h2 className="text-2xl font-bold">Loading lesson data...</h2>
        </div>
      </MainLayout>
    );
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
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Edit Lesson</h1>
          {moduleName && <h2 className="text-xl text-gold">Module: {moduleName}</h2>}
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
              <>Delete Lesson</>
            )}
          </GoldButton>
        </div>
        
        <GlassmorphicCard>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Essential Fields */}
              <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Lesson Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter lesson title"
                  className={`border-white/10 bg-black/40 focus:border-gold text-white text-left ${formErrors.title ? 'border-red-500' : ''}`}
                />
                {formErrors.title && <p className="text-red-500 text-sm">{formErrors.title}</p>}
              </div>
              
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Lesson Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter detailed lesson description"
                    className={`min-h-32 border-white/10 bg-black/40 focus:border-gold text-white ${formErrors.description ? 'border-red-500' : ''}`}
                  />
                {formErrors.description && <p className="text-red-500 text-sm">{formErrors.description}</p>}
              </div>
              
              {/* Order */}
              <div className="space-y-2">
                <Label htmlFor="order">Lesson Order</Label>
                <Input
                  id="order"
                  type="string"
                  value={order}
                  onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                  placeholder="Enter lesson order"
                  className="border-white/10 bg-black/40 focus:border-gold text-white text-left"
                />
              </div>

              {/* Lesson Type */}
              <div className="space-y-2">
                <Label htmlFor="lessonType">Lesson Type</Label>
                <Select value={lessonType} onValueChange={(value: LessonType) => setLessonType(value)}>
                  <SelectTrigger className="border-white/10 bg-black/40 focus:border-gold text-white text-left">
                    <SelectValue placeholder="Select lesson type" />
                  </SelectTrigger>
                  <SelectContent>
                    {lessonTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <span>{type.label}</span>
                          <type.icon className="w-4 h-4" />
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional Content Based on Lesson Type */}
              {lessonType === 'video' && (
                <div className="space-y-2">
                  <Label htmlFor="videoUrl">Video URL *</Label>
                  <Input
                    id="videoUrl"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(convertGoogleDriveLink(e.target.value))}
                    placeholder="Enter video URL (YouTube, Vimeo, Google Drive)"
                    className={`border-white/10 bg-black/40 focus:border-gold text-white text-left ${formErrors.videoUrl ? 'border-red-500' : ''}`}
                  />
                  <p className="text-white/60 text-sm">💡 You can add a Google Drive link directly and it will be converted automatically</p>
                  {formErrors.videoUrl && <p className="text-red-500 text-sm">{formErrors.videoUrl}</p>}
                </div>
              )}

              {lessonType === 'audio' && (
                <div className="space-y-2">
                  <Label htmlFor="audioUrl">Audio URL *</Label>
                  <Input
                    id="audioUrl"
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(convertGoogleDriveLink(e.target.value))}
                    placeholder="Enter audio URL (Google Drive)"
                    className={`border-white/10 bg-black/40 focus:border-gold text-white text-left ${formErrors.audioUrl ? 'border-red-500' : ''}`}
                  />
                  <p className="text-white/60 text-sm">💡 You can add a Google Drive link directly and it will be converted automatically</p>
                  {formErrors.audioUrl && <p className="text-red-500 text-sm">{formErrors.audioUrl}</p>}
                </div>
              )}

              {lessonType === 'text' && (
                <div className="space-y-2">
                  <Label htmlFor="textContent">Text Content *</Label>
                  <RichTextEditor
                    value={textContent}
                    onChange={setTextContent}
                    placeholder="Enter lesson text content"
                  />
                  {formErrors.textContent && <p className="text-red-500 text-sm">{formErrors.textContent}</p>}
                </div>
              )}
              
              </div>

              {/* Additional Fields Toggle */}
              <button
                type="button"
                onClick={() => setShowAdditionalFields(!showAdditionalFields)}
                className="flex items-center justify-between w-full py-2 text-white/80 hover:text-gold transition-colors"
              >
                <span>Additional Information</span>
                {showAdditionalFields ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>

              {/* Additional Fields */}
              {showAdditionalFields && (
                <div className="space-y-6 pt-4 border-t border-white/10">
                  {/* Duration */}
                  <div className="space-y-2">
                <Label htmlFor="duration">Lesson Duration</Label>
                <Input
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Enter duration (e.g. 10:30)"
                  className="border-white/10 bg-black/40 focus:border-gold text-white"
                />
                {formErrors.duration && <p className="text-red-500 text-sm">{formErrors.duration}</p>}
              </div>
              
              {/* Status Checkboxes */}
              <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-6">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="locked" 
                    checked={locked} 
                    onCheckedChange={(checked) => setLocked(checked as boolean)}
                  />
                  <Label htmlFor="locked" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Lesson Locked (Not available to users)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="completed" 
                    checked={completed} 
                    onCheckedChange={(checked) => setCompleted(checked as boolean)}
                  />
                  <Label htmlFor="completed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Lesson Completed
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isFree"
                    checked={isFree}
                    onCheckedChange={(checked) => setIsFree(checked as boolean)}
                    className="border-white/10 data-[state=checked]:bg-gold data-[state=checked]:border-gold"
                  />
                  <Label htmlFor="isFree" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Free Preview
                  </Label>
                </div>
              </div>
              
              {/* Transcript */}
              <div className="space-y-2">
                <Label htmlFor="transcript">Full Lesson Transcript</Label>
                <RichTextEditor
                  value={transcript}
                  onChange={setTranscript}
                  placeholder="Enter full lesson transcript (optional)... You can use advanced formatting"
                />
                <p className="text-white/60 text-sm">💡 You can use headings, lists, and advanced formatting to write the full transcript</p>
              </div>
              
              {/* Notes */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Lesson Notes</Label>
                  <GoldButton type="button" variant="outline" size="sm" onClick={handleAddNote}>
                    <Plus className="ml-2" size={16} /> Add Note
                  </GoldButton>
                </div>
                
                {notes.map((note, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <Input
                      value={note}
                      onChange={(e) => handleNoteChange(index, e.target.value)}
                      placeholder={`Note ${index + 1}`}
                      className="border-white/10 bg-black/40 focus:border-gold text-white text-left"
                    />
                    {notes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveNote(index)}
                        className="p-2 text-white/60 hover:text-red-500 transition-colors"
                      >
                        <Trash size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Resources */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Additional Resources</Label>
                  <GoldButton type="button" variant="outline" size="sm" onClick={handleAddResource}>
                    <Plus className="ml-2" size={16} /> Add Resource
                  </GoldButton>
                </div>
                
                {resources.map((resource, index) => (
                  <div key={index} className="space-y-2 p-4 border border-white/10 rounded-md">
                    <div className="flex justify-between items-center">
                      <Label>Resource {index + 1}</Label>
                      {resources.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveResource(index)}
                          className="p-2 text-white/60 hover:text-red-500 transition-colors"
                        >
                          <Trash size={16} />
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`resource-title-${index}`}>Resource Title</Label>
                      <Input
                        id={`resource-title-${index}`}
                        value={resource.title}
                        onChange={(e) => handleResourceChange(index, 'title', e.target.value)}
                        placeholder="Enter resource title"
                        className="border-white/10 bg-black/40 focus:border-gold text-white text-left"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`resource-url-${index}`}>Resource URL</Label>
                      <Input
                        id={`resource-url-${index}`}
                        value={resource.url}
                        onChange={(e) => handleResourceChange(index, 'url', e.target.value)}
                        placeholder="Enter resource URL (Google Drive)"
                        className="border-white/10 bg-black/40 focus:border-gold text-white text-left"
                      />
                      <p className="text-white/60 text-sm">💡 You can add a Google Drive link directly and it will be converted automatically</p>
                    </div>
                  </div>
                ))}
              </div>
              
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <GoldButton type="submit" disabled={isSaving} className="w-full md:w-auto">
                  {isSaving ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="ml-2" size={18} /> Save Changes
                    </>
                  )}
                </GoldButton>
              </div>
            </form>
          </div>
        </GlassmorphicCard>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              This lesson will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLesson}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600 ml-2"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete Lesson'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default EditLesson;
