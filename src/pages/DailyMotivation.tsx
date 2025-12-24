import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import GlassmorphicCard from '@/components/GlassmorphicCard';
import GoldButton from '@/components/GoldButton';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Edit, Trash2, Calendar, Plus, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { listDailyDrops, deleteDailyDrop, updateDailyDrop, DailyDrop } from '@/db/dailyDrops';

const DailyMotivation = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();
  const hasLoggedActivity = useRef(false);
  
  const [dailyDrops, setDailyDrops] = useState<DailyDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllDrops, setShowAllDrops] = useState(false);
  
  const [selectedDropId, setSelectedDropId] = useState<string | null>(null);
  
  // Admin edit/delete states for daily drops
  const [editingDropId, setEditingDropId] = useState<string | null>(null);
  const [editDropText, setEditDropText] = useState('');
  const [editDropImage, setEditDropImage] = useState('');
  const [editDropDate, setEditDropDate] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUpdatingDrop, setIsUpdatingDrop] = useState(false);
  const [deleteDropId, setDeleteDropId] = useState<string | null>(null);
  const [isDeletingDrop, setIsDeletingDrop] = useState(false);
  
  // List of admin emails that can access admin features
  const adminEmails = ['ichrakchraibi5@gmail.com', 'mohamed.sultan.7744@gmail.com', 'toparabg@gmail.com'];
  
  // Check if current user is an admin
  const isAdmin = user && adminEmails.includes(user.email);

  // Fetch daily drops
  const fetchDailyDrops = async () => {
    try {
      const drops = await listDailyDrops();
      setDailyDrops(drops);
      
      // Set the first drop as selected by default
      if (drops.length > 0 && !selectedDropId) {
        setSelectedDropId(drops[0].id);
      }
    } catch (err) {
      console.error('Error fetching daily drops:', err);
      setError('An error occurred while loading content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyDrops();
  }, []);

  // Log daily motivation view activity (only once)
  useEffect(() => {
    if (user && !hasLoggedActivity.current) {
      logActivity('DAILY_MOTIVATION_VIEW');
      hasLoggedActivity.current = true;
    }
  }, [user, logActivity]);


  // Function to edit daily drop
  const handleEditDrop = (drop: DailyDrop) => {
    setEditingDropId(drop.id);
    setEditDropText(drop.text);
    setEditDropImage(drop.image || '');
    setImagePreview(drop.image || null);
    
    // Set the date from customDate if available, otherwise use createdAt
    const dateToUse = drop.customDate || drop.createdAt;
    try {
      setEditDropDate(format(new Date(dateToUse), 'yyyy-MM-dd'));
    } catch (e) {
      setEditDropDate(format(new Date(), 'yyyy-MM-dd'));
    }
  };

  // Handle image upload and convert to base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File size error",
        description: "Image size must be less than 2MB",
        variant: "destructive",
      });
      return;
    }
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      setEditDropImage(base64String);
      setImagePreview(base64String);
    };
    reader.readAsDataURL(file);
  };
  
  // Clear image preview and reset image state
  const handleClearImage = () => {
    setEditDropImage('');
    setImagePreview(null);
  };

  // Function to update daily drop
  const handleUpdateDrop = async (dropId: string) => {
    if (!editDropText.trim() || !editDropDate.trim()) return;
    
    setIsUpdatingDrop(true);
    
    try {
      const customDate = new Date(editDropDate);
      
      await updateDailyDrop(dropId, {
        text: editDropText.trim(),
        image: editDropImage || null,
        customDate: customDate
      });
      
      // Reset states
      setEditingDropId(null);
      setEditDropText('');
      setEditDropImage('');
      setEditDropDate('');
      setImagePreview(null);
      
      // Refresh drops
      await fetchDailyDrops();
      
      toast({
        title: "Content Updated",
        description: "Daily motivation content updated successfully",
        variant: "default",
      });
    } catch (err) {
      console.error('Error updating daily drop:', err);
      toast({
        title: "Error",
        description: "An error occurred while updating content",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingDrop(false);
    }
  };

  // Function to confirm delete drop
  const handleConfirmDeleteDrop = (dropId: string) => {
    setDeleteDropId(dropId);
  };

  // Function to cancel delete drop
  const handleCancelDeleteDrop = () => {
    setDeleteDropId(null);
  };

  // Function to delete daily drop
  const handleDeleteDrop = async () => {
    if (!deleteDropId) return;
    
    setIsDeletingDrop(true);
    
    try {
      await deleteDailyDrop(deleteDropId);
      
      // Reset state
      setDeleteDropId(null);
      
      // Refresh drops
      await fetchDailyDrops();
      
      toast({
        title: "Content Deleted",
        description: "Daily motivation content deleted successfully",
        variant: "default",
      });
    } catch (err) {
      console.error('Error deleting daily drop:', err);
      toast({
        title: "Error",
        description: "An error occurred while deleting content",
        variant: "destructive",
      });
    } finally {
      setIsDeletingDrop(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string, customDateString?: string) => {
    // Use customDate if available, otherwise use timestamp
    const dateToUse = customDateString || dateString;
    
    if (!dateToUse) {
      return 'Unknown Date';
    }
    try {
      return format(new Date(dateToUse), 'dd MMMM yyyy');
    } catch {
      return 'Unknown Date';
    }
  };
  
  // Format date for stylish display at the top of cards
  const formatStylishDate = (dateString: string, customDateString?: string) => {
    // Use customDate if available, otherwise use timestamp
    const dateToUse = customDateString || dateString;
    
    if (!dateToUse) {
      return 'Unknown Date';
    }
    try {
      return format(new Date(dateToUse), 'MMMM dd, yyyy');
    } catch {
      return 'Unknown Date';
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <p className="text-red-500">{error}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold">Daily Motivation</h1>
          {isAdmin && (
            <Link to="/admin/add-daily-motivation" className="bg-gold hover:bg-gold/80 text-black font-medium py-2 px-4 rounded-md flex items-center">
              <Plus className="mr-2" size={18} />
              <span>Add New Content</span>
            </Link>
          )}
        </div>
        
        {/* Delete Drop Confirmation Dialog */}
        {deleteDropId && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gold/30 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4 text-white">Confirm Deletion</h3>
              <p className="text-white/80 mb-6">Are you sure you want to delete this content? This action cannot be undone.</p>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={handleCancelDeleteDrop}
                  className="border-white/10 text-white hover:bg-white/5 mr-2"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteDrop}
                  disabled={isDeletingDrop}
                >
                  {isDeletingDrop ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>Delete</>  
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        
        {dailyDrops.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/60">No content available at the moment</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto grid grid-cols-1 gap-8">
            {/* Show only first 3 drops if showAllDrops is false, otherwise show all */}
            {(showAllDrops ? dailyDrops : dailyDrops.slice(0, 2)).map((drop) => (
              <GlassmorphicCard key={drop.id} className="overflow-visible relative">
                {/* Stylish date at the top center */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 px-6 py-2 rounded-full border border-gold/30">
                  <p className="text-gold font-medium text-sm">{formatStylishDate(drop.createdAt, drop.customDate)}</p>
                </div>
                
                <div className="p-6 pt-8 no-side-padding-mobile">
                  {/* Admin edit/delete buttons - positioned top-right for LTR */}
                  {isAdmin && (
                    <div className="absolute items-center space-x-2 rtl:space-x-reverse top-4 right-4 flex">
                        
                      <GoldButton variant="outline" size="sm" onClick={() => handleEditDrop(drop)} title="Edit Content">
                        <Edit className="mr-2" size={16} /> Edit
                      </GoldButton>

                      <GoldButton variant="destructive" size="sm" onClick={() => handleConfirmDeleteDrop(drop.id)} title="Delete Content">
                        <Trash2 className="w-4 h-4" />
                      </GoldButton>
                    </div>
                  )}
                  
                  <div className="flex items-center mb-6">
                    <Avatar className="h-10 w-10 border border-gold/50">
                      <AvatarImage src={'/favicon.png'} alt='Elitez Club' ></AvatarImage>
                      <AvatarFallback>{drop.createdByName?.charAt(0) || 'A'}</AvatarFallback>
                    </Avatar>
                    <div className="ml-3">
                      <p className="font-semibold text-white">{'Elitez Club'}</p>
                      <div className="flex items-center text-white/60 text-sm">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>{formatDate(drop.createdAt, drop.customDate)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {editingDropId === drop.id ? (
                    <div className="space-y-4">
                      <Textarea
                        value={editDropText}
                        onChange={(e) => setEditDropText(e.target.value)}
                        className="min-h-32 border-white/10 bg-black/40 focus:border-gold text-white"
                      />
                      
                      <div className="space-y-2">
                        <Label htmlFor="edit-date" className="flex items-center text-sm font-medium text-white">
                          <Calendar className="h-4 w-4 mr-2" />
                          Date *
                        </Label>
                        <Input
                          id="edit-date"
                          type="date"
                          value={editDropDate}
                          onChange={(e) => setEditDropDate(e.target.value)}
                          className="border-white/10 bg-black/40 focus:border-gold text-white"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white">Image (Optional)</label>
                        
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
                                  title: "Unsupported file type",
                                  description: "Please select an image file only",
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              // Check file size (max 2MB)
                              if (file.size > 2 * 1024 * 1024) {
                                toast({
                                  title: "File size error",
                                  description: "Image size must be less than 2MB",
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              // Convert to base64
                              const reader = new FileReader();
                              reader.onload = () => {
                                const base64String = reader.result as string;
                                setEditDropImage(base64String);
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
                              <p className="text-white font-medium mb-1">Drag and drop image here</p>
                              <p className="text-white/50 text-sm">Or click to select an image</p>
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
                                aria-label="Remove Image"
                              >
                                <X size={16} />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setEditingDropId(null);
                            setEditDropText('');
                            setEditDropImage('');
                            setImagePreview(null);
                          }}
                          className="border-white/10 text-white hover:bg-white/5 mr-2"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => handleUpdateDrop(drop.id)} 
                          disabled={isUpdatingDrop}
                          className="bg-gold hover:bg-gold/80 text-black"
                        >
                          {isUpdatingDrop ? (
                            <>
                              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>Save Changes</>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>

                    {drop.image && (
                        <div className="mb-6">
                          <img 
                            src={drop.image} 
                            alt="Motivational Image" 
                            className="h-auto rounded-md object-cover max-h-[400px]" 
                          />
                        </div>
                      )}

                      <div className="mb-6">
                        <p className="text-white whitespace-pre-line">{drop.text}</p>
                      </div>
                      
                    </>
                  )}
                </div>
              </GlassmorphicCard>
            ))}
            
            {/* Show More button - only visible if there are more than 3 drops */}
            {dailyDrops.length > 2 && (
              <div className="flex justify-center mt-4">
                <Button
                  onClick={() => setShowAllDrops(!showAllDrops)}
                  variant="outline"
                  className="border-gold/30 text-gold transition-all duration-300 group"
                >
                  <div className="flex items-center">
                    {showAllDrops ? (
                      <>
                        <span>Show Less</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="ml-2 h-4 w-4 transition-transform duration-300 transform rotate-180 group-hover:-translate-y-1"
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </>
                    ) : (
                      <>
                        <span>Show More Content</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-y-1"
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </>
                    )}
                  </div>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default DailyMotivation;
