import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { listLessons, createLesson, listModules } from '@/db/courses';
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



// Lesson type definitions
type LessonType = 'video' | 'audio' | 'text';

const lessonTypes = [
  { value: 'video', label: 'Video Lesson', icon: Video},
  { value: 'audio', label: 'Audio Lesson', icon: Headphones},
  { value: 'text', label: 'Text Lesson', icon: FileText}
] as const;

const AddLesson = () => {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>();
  const [lessonId, setLessonId] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lessonType, setLessonType] = useState<LessonType>('video');
  const [videoUrl, setVideoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [duration, setDuration] = useState('');
  const [locked, setLocked] = useState(false);
  const [isFree, setIsFree] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [notes, setNotes] = useState<string[]>(['']);
  const [resources, setResources] = useState<{ title: string; url: string }[]>([{ title: '', url: '' }]);
  const [order, setOrder] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showAdditionalFields, setShowAdditionalFields] = useState(false);

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

  // Fetch module info and current number of lessons and set default values
  useEffect(() => {
    const fetchModuleAndLessonsCount = async () => {
      if (!courseId || !moduleId) return;
      
      try {
        const modules = await listModules(courseId);
        const currentModule = modules.find(m => m.moduleId === moduleId);
        if (currentModule) {
          setModuleName(currentModule.title || '');
        }
        const lessons = await listLessons(courseId, moduleId);
        const nextNumber = lessons.length + 1;
        
        setLessonId(nextNumber.toString());
        setOrder(nextNumber);
      } catch (error) {
        console.error('Error fetching module info or lessons count:', error);
      }
    };

    fetchModuleAndLessonsCount();
  }, [courseId, moduleId]);
  
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
    
    if (!lessonId.trim()) errors.lessonId = "Lesson ID is required";
    if (!title.trim()) errors.title = "Lesson title is required";
    if (!description.trim()) errors.description = "Lesson description is required";
    
    // Validate content based on lesson type
    if (lessonType === 'video' && !videoUrl.trim()) {
      errors.videoUrl = "Video URL is required";
    } else if (lessonType === 'audio' && !audioUrl.trim()) {
      errors.audioUrl = "Audio URL is required";
    } else if (lessonType === 'text' && !textContent.trim()) {
      errors.textContent = "Text lesson content is required";
    }
    
    // Validate notes (remove empty notes)
    const validNotes = notes.filter(note => note.trim() !== '');
    
    // Validate resources (remove empty resources)
    const validResources = resources.filter(resource => resource.title.trim() !== '' && resource.url.trim() !== '');
    
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
    updatedResources[index][field] = value;
    setResources(updatedResources);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !moduleId) return;
    
    setLoading(true);
    
    try {
      // Filter out empty notes and resources
      const validNotes = notes.filter(note => note.trim() !== '');
      const validResources = resources.filter(resource => resource.title.trim() !== '' && resource.url.trim() !== '');
      
      await createLesson(courseId, moduleId, {
        lessonId,
        title,
        description,
        type: lessonType,
        videoUrl,
        audioUrl,
        textContent,
        duration: duration ? parseInt(duration) || null : null,
        locked,
        completed: false,
        transcript,
        notes,
        resources,
        order,
        createdAt: null,
        updatedAt: null,
      } as any);
      
      console.log('Lesson added with ID:', lessonId);
      
      // Show success message
      toast({
        title: "Lesson Added",
        description: "Lesson added successfully",
        variant: "default",
      });
      
      // Navigate back to edit module page
      navigate(`/admin/course/${courseId}/module/${moduleId}/edit`);
      
    } catch (error) {
      console.error('Error adding lesson:', error);
      toast({
        title: "Error",
        description: "An error occurred while adding the lesson",
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
        
        <h1 className="text-3xl font-bold mb-8">Add New Lesson</h1>
        {moduleName && <h2 className="text-xl text-gold mb-6">Module: {moduleName}</h2>}
        
        <GlassmorphicCard>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Essential Fields */}
              <div className="space-y-6">
                                
                {/* Title */}
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

                {/* Lesson Type Selector */}
                <div className="space-y-2">
                  <Label htmlFor="lessonType">Lesson Type *</Label>
                  <Select value={lessonType} onValueChange={(value: LessonType) => setLessonType(value)}>
                    <SelectTrigger className="border-white/10 bg-black/40 focus:border-gold text-white text-left">
                      <SelectValue placeholder="Select lesson type" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-white/10">
                      {lessonTypes.map((type) => {
                        const IconComponent = type.icon;
                        return (
                          <SelectItem key={type.value} value={type.value} className="text-white hover:bg-white/10">
                            <div className="flex items-center gap-2">
                              <span>{type.label}</span>
                              <IconComponent className="w-4 h-4" />
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Conditional Content Fields */}
                {lessonType === 'video' && (
                  <div className="space-y-2">
                    <Label htmlFor="videoUrl">Video URL * 🎥</Label>
                    <Input
                      id="videoUrl"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(convertGoogleDriveLink(e.target.value))}
                      placeholder="Enter video URL (YouTube, Vimeo, Google Drive)"
                      className={`border-white/10 bg-black/40 focus:border-gold text-white ${formErrors.videoUrl ? 'border-red-500' : ''}`}
                    />
                    <p className="text-white/60 text-sm">💡 You can add a Google Drive link directly and it will be converted automatically</p>
                    {formErrors.videoUrl && <p className="text-red-500 text-sm">{formErrors.videoUrl}</p>}
                  </div>
                )}
                
                {lessonType === 'audio' && (
                  <div className="space-y-2">
                    <Label htmlFor="audioUrl">Audio URL * 🎧</Label>
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
                    <Label htmlFor="textContent">Text Content * 📄</Label>
                    <RichTextEditor
                      value={textContent}
                      onChange={setTextContent}
                      placeholder="Write lesson content here... You can use advanced formatting"
                    />
                    {formErrors.textContent && <p className="text-red-500 text-sm">{formErrors.textContent}</p>}
                    <p className="text-white/60 text-sm">💡 You can use headings, lists, and advanced formatting to create a professional text lesson</p>
                  </div>
                )}

              </div>

              {/* Toggle Additional Fields */}
              <button
                type="button"
                onClick={() => setShowAdditionalFields(!showAdditionalFields)}
                className="flex items-center text-gold hover:text-gold/80 transition-colors w-full justify-center py-2"
              >
                {showAdditionalFields ? (
                  <>
                    Hide Additional Information
                    <ChevronUp className="ml-2" size={20} />
                  </>
                ) : (
                  <>
                    Add Additional Information
                    <ChevronDown className="ml-2" size={20} />
                  </>
                )}
              </button>

              {/* Additional Fields */}
              {showAdditionalFields && (
                <div className="space-y-6 border-t border-white/10 pt-6">

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

                {/* Lesson ID */}
                <div className="space-y-2">
                  <Label htmlFor="lessonId">Lesson ID</Label>
                  <Input
                    id="lessonId"
                    value={lessonId}
                    readOnly
                    placeholder="Enter lesson ID"
                    className="border-white/10 bg-black/40 text-white text-left cursor-not-allowed opacity-60"
                  />
                </div>
  

                  {/* Duration */}
                  <div className="space-y-2">
                    <Label htmlFor="duration">Lesson Duration</Label>
                    <Input
                      id="duration"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="Enter lesson duration (e.g. 10:30)"
                      className={`border-white/10 bg-black/40 focus:border-gold text-white text-left ${formErrors.duration ? 'border-red-500' : ''}`}
                    />
                    {formErrors.duration && <p className="text-red-500 text-sm">{formErrors.duration}</p>}
                  </div>
                  
                  {/* Locked Status */}
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

                  {/* Free Preview Status */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isFree"
                      checked={isFree}
                      onCheckedChange={(checked) => setIsFree(checked as boolean)}
                      className="border-white/10 data-[state=checked]:bg-gold data-[state=checked]:border-gold"
                    />
                    <Label htmlFor="isFree" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Free Preview (Available without subscription)
                    </Label>
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
                            placeholder="Enter resource URL"
                            className="border-white/10 bg-black/40 focus:border-gold text-white text-left"
                          />
                        </div>
                      </div>
                    ))}
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
                </div>
              )}
              
              {/* Submit Button */}
              <div className="pt-4">
                <GoldButton type="submit" disabled={loading} className="w-full md:w-auto">
                  {loading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="ml-2" size={18} /> Save Lesson
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

export default AddLesson;
