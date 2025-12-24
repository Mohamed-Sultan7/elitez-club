import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import MainLayout from '@/components/MainLayout';
import { useToast } from "@/components/ui/use-toast";
import GlassmorphicCard from '@/components/GlassmorphicCard';
import GoldButton from '@/components/GoldButton';
import { ArrowLeft, DollarSign, Save, Calendar, CreditCard, User, FileText, Upload, UploadCloud, Trash2 } from 'lucide-react';
import { addProfit } from '@/db/profit';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AddProfit = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    membershipType: '',
    paymentMethod: '',
    date: new Date().toISOString().split('T')[0], // Today's date
    customerName: ''
  });

  // Image upload states
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const maxImages = 5; // Maximum number of images allowed

  // List of admin emails that can access this page
  const adminEmails = ['ichrakchraibi5@gmail.com', 'mohamed.sultan.7744@gmail.com', 'toparabg@gmail.com'];

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
    
    // Check if adding these files would exceed the maximum
    if (imageFiles.length + fileArray.length > maxImages) {
      toast({
        title: "Too many images",
        description: `You can add a maximum of ${maxImages} images`,
        variant: "destructive",
      });
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    fileArray.forEach(file => {
      if (file.size > 300 * 1024) { // 300KB limit
        toast({
          title: "File too large",
          description: `File ${file.name} must be less than 300KB`,
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

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeAllImages = () => {
    setImageFiles([]);
    setImagePreviews([]);
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
    
    // Validation
    if (!formData.amount || !formData.description || !formData.membershipType || !formData.paymentMethod) {
      toast({
        title: "Data error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Amount error",
        description: "Please enter a valid amount greater than zero",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Convert images to Base64 if present
      let imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        imageUrls = await Promise.all(
          imageFiles.map(file => convertImageToBase64(file))
        );
      }

      await addProfit({
        amount,
        currency: 'USD',
        description: formData.description.trim(),
        metadata: {
          membershipType: formData.membershipType,
          paymentMethod: formData.paymentMethod,
          date: formData.date,
          customerName: formData.customerName.trim() || 'Undefined',
          addedBy: user?.email || 'unknown',
          images: imageUrls,
        }
      });

      toast({
        title: "Saved Successfully",
        description: "New income added successfully",
        variant: "default",
      });

      // Reset form
      setFormData({
        amount: '',
        description: '',
        membershipType: '',
        paymentMethod: '',
        date: new Date().toISOString().split('T')[0],
        customerName: ''
      });

      // Reset image states
      setImageFiles([]);
      setImagePreviews([]);

      // Navigate back to dashboard
      navigate('/admin/profit-dashboard');

    } catch (error) {
      console.error('Error adding profit entry:', error);
      toast({
        title: "Error",
        description: "An error occurred while saving profit",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || !adminEmails.includes(user.email)) {
    return null;
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/admin/profit-dashboard" 
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Profit Dashboard
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-8 h-8 text-gold" />
            <h1 className="text-3xl font-bold text-white">Add New Income</h1>
          </div>
          <p className="text-white/60">Add a new income transaction to the system</p>
        </div>

        {/* Form */}
        <GlassmorphicCard className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Amount */}
            <div>
              <label className="block text-white font-medium mb-2">
                <DollarSign className="w-4 h-4 inline mr-2" />
                Amount (USD) *
              </label>
              <Input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="Enter amount"
                min="0"
                step="0.01"
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
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
                placeholder="Enter transaction description (e.g. Monthly Subscription, Annual Subscription, etc.)"
                required
                rows={3}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-white font-medium mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Customer Name (Optional)
              </label>
              <Input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleInputChange}
                placeholder="Enter customer name"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>

            {/* Membership Type */}
            <div>
              <label className="block text-white font-medium mb-2">
                Membership Type *
              </label>
              <Select
                value={formData.membershipType}
                onValueChange={(value) => handleSelectChange('membershipType', value)}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select Membership Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Free Trial">Free Trial</SelectItem>
                  <SelectItem value="TOP G - Monthly">Elitez Club - Monthly</SelectItem>
                  <SelectItem value="TOP G - Annually">Elitez Club - Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-white font-medium mb-2">
                <CreditCard className="w-4 h-4 inline mr-2" />
                Payment Method *
              </label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => handleSelectChange('paymentMethod', value)}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select Payment Method" />
                </SelectTrigger>
                <SelectContent>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Crypto">Crypto</SelectItem>
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
                required
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            {/* Transaction Images Upload */}
            <div>
              <label className="block text-white font-medium mb-2">
                <Upload className="w-4 h-4 inline mr-2" />
                Transaction Images (Optional) - Max {maxImages} images
              </label>
              <div className="space-y-4">
                {/* Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragOver
                      ? 'border-gold bg-gold/10'
                      : 'border-white/30 hover:border-white/50'
                  } ${
                    imageFiles.length >= maxImages ? 'opacity-50 pointer-events-none' : ''
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
                    disabled={imageFiles.length >= maxImages}
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <UploadCloud className="w-12 h-12 text-white/60 mx-auto mb-4" />
                    <p className="text-white/80 mb-2">
                      {imageFiles.length >= maxImages 
                        ? `Max limit reached (${maxImages} images)`
                        : 'Drag & Drop images here or click to select'
                      }
                    </p>
                    <p className="text-white/60 text-sm">
                      Max: 300KB per image • PNG, JPG, JPEG
                    </p>
                    {imageFiles.length > 0 && (
                      <p className="text-gold text-sm mt-2">
                        {imageFiles.length} of {maxImages} images uploaded
                      </p>
                    )}
                  </label>
                </div>

                {/* Images Preview Grid */}
                {imagePreviews.length > 0 && (
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-white font-medium">
                        Image Preview ({imagePreviews.length}):
                      </span>
                      <button
                        type="button"
                        onClick={removeAllImages}
                        className="text-red-400 hover:text-red-300 transition-colors text-sm"
                      >
                        Remove All
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <GoldButton
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 flex-1"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Income'}
              </GoldButton>
              
              <Link to="/admin/profit-dashboard" className="flex-1">
                <button
                  type="button"
                  className="w-full px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
              </Link>
            </div>
          </form>
        </GlassmorphicCard>

        {/* Info Card */}
        <GlassmorphicCard className="p-6 mt-6">
          <h3 className="text-lg font-bold text-white mb-3">Important Notes:</h3>
          <ul className="text-white/80 space-y-2 text-sm">
            <li>• Ensure amount is entered in USD</li>
            <li>• Write a clear description for easy tracking</li>
            <li>• Select the appropriate membership type</li>
            <li>• Customer name can be left blank if not available</li>
            <li>• Transaction will be recorded under the current user</li>
          </ul>
        </GlassmorphicCard>
      </div>
    </MainLayout>
  );
};

export default AddProfit;
