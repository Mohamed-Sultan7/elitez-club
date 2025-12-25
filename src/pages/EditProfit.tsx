import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import MainLayout from '@/components/MainLayout';
import { useToast } from "@/components/ui/use-toast";
import GlassmorphicCard from '@/components/GlassmorphicCard';
import GoldButton from '@/components/GoldButton';
import { ArrowLeft, DollarSign, Save, Calendar, CreditCard, User, FileText, Trash2, Upload, UploadCloud } from 'lucide-react';
import { getProfit, updateProfit, deleteProfit } from '@/db/profit';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const EditProfit = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    membershipType: '',
    paymentMethod: '',
    date: '',
    customerName: ''
  });

  // Image upload states
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const maxImages = 5; // Maximum number of images allowed

  // List of admin emails that can access this page
  const adminEmails = ['ichrakchraibi5@gmail.com', 'mohamed.sultan.7744@gmail.com', 'elitez.club7@gmail.com'];

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

  // Fetch existing profit entry data
  useEffect(() => {
    const fetchProfitEntry = async () => {
      if (!id) {
        navigate('/admin/profit-dashboard');
        return;
      }

      try {
        const profitId = parseInt(id, 10);
        const data = await getProfit(profitId);
        if (data) {
          setFormData({
            amount: data.amount?.toString() || '',
            description: data.description || '',
            membershipType: data.metadata?.membershipType || '',
            paymentMethod: data.metadata?.paymentMethod || '',
            date: (data.metadata?.date as string) || data.createdAt.split('T')[0] || '',
            customerName: data.metadata?.customerName || ''
          });
          
          // Set existing images if available (backward compatibility)
          setExistingImageUrls(Array.isArray(data.metadata?.images) ? data.metadata.images : []);
        } else {
          toast({
            title: "Error",
            description: "Transaction not found",
            variant: "destructive",
          });
          navigate('/admin/profit-dashboard');
        }
      } catch (error) {
        console.error('Error fetching profit entry:', error);
        toast({
          title: "Error",
          description: "An error occurred while fetching transaction details",
          variant: "destructive",
        });
      } finally {
        setFetchLoading(false);
      }
    };

    fetchProfitEntry();
  }, [id, navigate, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Image handling functions
  const handleImageUpload = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const totalImages = existingImageUrls.length + imageFiles.length + fileArray.length;
    
    // Check if adding these files would exceed the maximum
    if (totalImages > maxImages) {
      toast({
        title: "Too many images",
        description: `You can add up to ${maxImages} images`,
        variant: "destructive",
      });
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    fileArray.forEach(file => {
      if (file.size > 300 * 1024) { // 300KB limit
        toast({
          title: "File size too large",
          description: `File ${file.name} must be less than 300 KB`,
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: `File ${file.name} is not a valid image`,
          variant: "destructive",
        });
        return;
      }

      validFiles.push(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        if (newPreviews.length === validFiles.length) {
          setImageFiles(prev => [...prev, ...validFiles]);
          setImagePreviews(prev => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleImageUpload(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleImageUpload(files);
    }
  };

  const removeNewImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const removeAllImages = () => {
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImageUrls([]);
  };

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.description || !formData.membershipType || !formData.paymentMethod || !formData.date) {
      toast({
        title: "Data error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Handle images update
      let finalImageUrls: string[] = [...existingImageUrls];
      if (imageFiles.length > 0) {
        const newImageUrls = await Promise.all(
          imageFiles.map(file => convertImageToBase64(file))
        );
        finalImageUrls = [...finalImageUrls, ...newImageUrls];
      }
      
      await updateProfit(parseInt(id!, 10), {
        amount: parseFloat(formData.amount),
        currency: 'USD',
        description: formData.description.trim(),
        metadata: {
          membershipType: formData.membershipType,
          paymentMethod: formData.paymentMethod,
          date: formData.date,
          customerName: formData.customerName.trim(),
          images: finalImageUrls,
        }
      });

      toast({
        title: "Updated Successfully",
        description: "Transaction data updated successfully",
      });
      
      navigate('/admin/profit-dashboard');
    } catch (error) {
      console.error('Error updating profit entry:', error);
      toast({
        title: "Error",
        description: "An error occurred while updating the transaction",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setLoading(true);
    
    try {
      await deleteProfit(parseInt(id!, 10));

      toast({
        title: "Deleted Successfully",
        description: "Transaction deleted successfully",
      });
      
      navigate('/admin/profit-dashboard');
    } catch (error) {
      console.error('Error deleting profit entry:', error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the transaction",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setDeleteOpen(false);
    }
  };

  if (!user || !adminEmails.includes(user.email)) {
    return null;
  }

  if (fetchLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-pulse text-2xl font-bold text-gold">Loading transaction data...</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              to="/admin/profit-dashboard" 
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Edit Profit Transaction</h1>
              <p className="text-white/60 mt-1">Edit financial transaction data</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteOpen(true)}
              disabled={loading}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete Transaction
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <GlassmorphicCard className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">Transaction Details</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Amount */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    <DollarSign className="w-4 h-4 inline mr-2" />
                    Amount (USD) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className="bg-white/10 border-white/20 text-white placeholder-white/60"
                    placeholder="Enter amount"
                    required
                  />
                </div>

                {/* Customer Name */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Customer Name
                  </label>
                  <Input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleInputChange}
                    className="bg-white/10 border-white/20 text-white placeholder-white/60"
                    placeholder="Enter customer name"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    <FileText className="w-4 h-4 inline mr-2" />
                    Transaction Description *
                  </label>
                  <Textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="bg-white/10 border-white/20 text-white placeholder-white/60 min-h-[100px]"
                    placeholder="Enter transaction description"
                    required
                  />
                </div>

                {/* Membership Type */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    Membership Type *
                  </label>
                  <Select value={formData.membershipType} onValueChange={(value) => handleSelectChange('membershipType', value)}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select membership type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Free Trial">Free Trial</SelectItem>
                      <SelectItem value="TOP G - Monthly">TOP G - Monthly</SelectItem>
                      <SelectItem value="TOP G - Annually">TOP G - Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    <CreditCard className="w-4 h-4 inline mr-2" />
                    Payment Method *
                  </label>
                  <Select value={formData.paymentMethod} onValueChange={(value) => handleSelectChange('paymentMethod', value)}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Crypto">Cryptocurrency (Crypto)</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Transaction Date *
                  </label>
                  <Input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="bg-white/10 border-white/20 text-white"
                    required
                  />
                </div>

                {/* Transaction Images Upload */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    <Upload className="w-4 h-4 inline mr-2" />
                    Transaction Images (up to {maxImages} images)
                  </label>
                  
                  {/* Show existing images if available */}
                  {existingImageUrls.length > 0 && (
                    <div className="mb-4">
                      <div className="text-white/80 text-sm mb-2">Current images:</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {existingImageUrls.map((url, index) => (
                          <div key={index} className="relative">
                            <img 
                              src={url} 
                              alt={`Transaction image ${index + 1}`} 
                              className="w-full h-24 object-cover rounded-lg border border-white/20"
                            />
                            <button
                              type="button"
                              onClick={() => removeExistingImage(index)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* New images preview */}
                  {imagePreviews.length > 0 && (
                    <div className="mb-4">
                      <div className="text-white/80 text-sm mb-2">New images:</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="relative">
                            <img 
                              src={preview} 
                              alt={`Image preview ${index + 1}`} 
                              className="w-full h-24 object-cover rounded-lg border border-white/20"
                            />
                            <button
                              type="button"
                              onClick={() => removeNewImage(index)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      {(existingImageUrls.length + imagePreviews.length) > 1 && (
                        <button
                          type="button"
                          onClick={removeAllImages}
                          className="mt-2 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                        >
                          Delete all images
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Image upload area */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      isDragOver 
                        ? 'border-gold bg-gold/10' 
                        : 'border-white/30 hover:border-white/50'
                    } ${
                      (existingImageUrls.length + imageFiles.length) >= maxImages 
                        ? 'opacity-50 pointer-events-none' 
                        : ''
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileInputChange}
                      className="hidden"
                      id="image-upload"
                      disabled={(existingImageUrls.length + imageFiles.length) >= maxImages}
                    />
                    
                    <div className="space-y-4">
                      <UploadCloud className="w-12 h-12 text-white/60 mx-auto" />
                      <div>
                        <p className="text-white/80 mb-2">
                          {(existingImageUrls.length + imageFiles.length) >= maxImages 
                            ? `Maximum reached (${maxImages} images)`
                            : 'Drag and drop images here or'
                          }
                        </p>
                        {(existingImageUrls.length + imageFiles.length) < maxImages && (
                          <label 
                            htmlFor="image-upload" 
                            className="inline-block px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg cursor-pointer transition-colors"
                          >
                            Choose images
                          </label>
                        )}
                      </div>
                      <p className="text-white/60 text-xs">
                        Maximum: 300 KB per image • Supported types: JPG, PNG, GIF, WebP
                        <br />
                        Selected images: {existingImageUrls.length + imageFiles.length} of {maxImages}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4 pt-4">
                  <GoldButton
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Updating...' : 'Update Transaction'}
                  </GoldButton>
                  
                  <Link
                    to="/admin/profit-dashboard"
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center justify-center"
                  >
                    Cancel
                  </Link>
                </div>
              </form>
            </GlassmorphicCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <GlassmorphicCard className="p-6">
              <h3 className="text-lg font-bold text-white mb-3">Important Notes:</h3>
              <ul className="text-white/80 space-y-2 text-sm">
                <li>• Make sure to enter the amount in USD</li>
                <li>• Write a clear transaction description for easy tracking</li>
                <li>• Choose the appropriate membership type for the transaction</li>
                <li>• Ensure the transaction date is correct</li>
                <li>• You can permanently delete the transaction using the delete button</li>
              </ul>
            </GlassmorphicCard>

            <GlassmorphicCard className="p-6">
              <h3 className="text-lg font-bold text-white mb-3">Quick Actions:</h3>
              <div className="space-y-3">
                <Link
                  to="/admin/profit-dashboard"
                  className="block w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-center"
                >
                  Back to Profit Dashboard
                </Link>
                <Link
                  to="/admin/add-profit"
                  className="block w-full px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors text-center"
                >
                  Add New Transaction
                </Link>
              </div>
            </GlassmorphicCard>
          </div>
        </div>
      </div>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              This action cannot be undone. Do you want to delete this transaction?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              onClick={() => setDeleteOpen(false)}
              disabled={loading}
              className="hover:bg-white/10 hover:text-white transition-all"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600 ml-2"
            >
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default EditProfit;
