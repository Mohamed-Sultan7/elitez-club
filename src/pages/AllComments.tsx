import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import MainLayout from '@/components/MainLayout';
import { useToast } from "@/components/ui/use-toast";
import GlassmorphicCard from '@/components/GlassmorphicCard';
import { Search, ArrowLeft, MessageCircle, Edit, Trash2, Save, X, User, Calendar, BookOpen, Eye, Loader2 } from 'lucide-react';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { listAllComments, deleteComment as deleteCommentDb, updateComment as updateCommentDb } from '@/db/comments';

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  userId: string;
  userName: string | null;
  userAvatar: string | null;
}

const AllComments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();
  const [comments, setComments] = useState<Comment[]>([]);
  const [filteredComments, setFilteredComments] = useState<Comment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState<string>('');
  const [isUpdatingComment, setIsUpdatingComment] = useState<boolean>(false);
  const [isDeletingComment, setIsDeletingComment] = useState<boolean>(false);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);

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

  // Fetch all comments from Supabase
  useEffect(() => {
    const fetchAllComments = async () => {
      try {
        const all = await listAllComments({ limit: 200 });
        setComments(all);
        setFilteredComments(all);
      } catch (error) {
        toast({
          title: "Error",
          description: "An error occurred while fetching comments",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (!user) {
      setLoading(false);
      return;
    }

    if (!adminEmails.includes(user.email)) {
      setLoading(false);
      return;
    }

    fetchAllComments();
  }, [user, toast]);

  // Filter comments based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredComments(comments);
    } else {
      const filtered = comments.filter(comment =>
        comment.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (comment.userName ?? '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredComments(filtered);
    }
  }, [searchTerm, comments]);

  // Function to handle edit comment
  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.body);
  };

  // Function to cancel edit
  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditCommentText('');
  };

  // Function to update comment
  const handleUpdateComment = async (comment: Comment) => {
    if (!editCommentText.trim()) return;
    
    setIsUpdatingComment(true);
    
    try {
      await updateCommentDb(comment.id, editCommentText.trim());
      
      // Update local state
      setComments(prevComments => 
        prevComments.map(c => 
          c.id === comment.id 
            ? { ...c, body: editCommentText.trim() }
            : c
        )
      );
      
      // Also update filtered comments
      setFilteredComments(prevFiltered => 
        prevFiltered.map(c => 
          c.id === comment.id 
            ? { ...c, body: editCommentText.trim() }
            : c
        )
      );
      
      // Reset states
      setEditingCommentId(null);
      setEditCommentText('');
      
      toast({
        title: "Comment Updated",
        description: "Comment updated successfully",
        variant: "default",
      });
    } catch (err) {
      console.error('Error updating comment:', err);
      toast({
        title: "Error",
        description: "An error occurred while updating the comment",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingComment(false);
    }
  };

  // Function to confirm delete
  const handleConfirmDelete = (commentId: string) => {
    setDeleteCommentId(commentId);
  };

  // Function to cancel delete
  const handleCancelDelete = () => {
    setDeleteCommentId(null);
  };

  // Function to delete comment
  const handleDeleteComment = async () => {
    if (!deleteCommentId) return;
    setIsDeletingComment(true);
    
    try {
      await deleteCommentDb(deleteCommentId);
      const refreshed = await listAllComments({ limit: 200, search: searchTerm.trim() || undefined });
      setComments(refreshed);
      setFilteredComments(refreshed);
      
      // Reset state
      setDeleteCommentId(null);
      
      toast({
        title: "Comment Deleted",
        description: "Comment deleted successfully",
        variant: "default",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "An error occurred while deleting the comment",
        variant: "destructive",
      });
    } finally {
      setIsDeletingComment(false);
    }
  };

  // Format date for display
  const formatDate = (isoDate: string): string => {
    try {
      return format(new Date(isoDate), 'dd MMMM yyyy - HH:mm');
    } catch {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-pulse text-2xl font-bold text-gold">Loading comments...</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!user || !adminEmails.includes(user.email)) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="text-6xl mb-4">🔒</div>
              <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
              <p className="text-white/60 mb-6">This page is for admins only</p>
              <Link 
                to="/admin" 
                className="inline-flex items-center gap-2 bg-gradient-to-r from-gold to-yellow-600 hover:from-yellow-600 hover:to-gold text-black font-medium py-2 px-4 rounded-lg transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link 
              to="/admin" 
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <MessageCircle className="w-8 h-8 text-gold" />
            <h1 className="text-3xl font-bold text-white">All Comments</h1>
          </div>
          <p className="text-white/60">View and manage all comments on the platform from all courses, modules, and lessons</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
            <input
              type="text"
              placeholder="Search comments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-10 py-3 text-white placeholder-white/40 focus:outline-none focus:border-gold/50 focus:bg-white/15 transition-all"
            />
          </div>
        </div>

        {/* Comments Count */}
        <div className="mb-6">
          <p className="text-white/60">
            Total Comments: <span className="text-gold font-bold">{filteredComments.length}</span>
            {searchTerm && (
              <span className="mr-2">
                (out of {comments.length} comments)
              </span>
            )}
          </p>
        </div>

        {/* Comments List */}
        {filteredComments.length === 0 ? (
          <GlassmorphicCard className="text-center py-12">
            <MessageCircle className="w-16 h-16 text-white/40 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              {searchTerm ? 'No results found' : 'No comments found'}
            </h3>
            <p className="text-white/60">
              {searchTerm ? 'Try searching with different keywords' : 'No comments found in the system'}
            </p>
          </GlassmorphicCard>
        ) : (
          <div className="space-y-4">
            {filteredComments.map((comment) => (
              <GlassmorphicCard key={comment.id} className="hover:border-gold/50 transition-all">
                <div className="p-6">
                  {/* Comment Header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-yellow-600 flex items-center justify-center">
                        {comment.userAvatar ? (
                          <img 
                            src={comment.userAvatar} 
                            alt={comment.userName ?? 'User'}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{comment.userName ?? 'Unknown User'}</h4>
                        <div className="flex items-center gap-2 text-xs text-white/60">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(comment.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/course/${comment.courseId}/module/${comment.moduleId}/lesson/${comment.lessonId}`}
                        className="p-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 hover:border-blue-500/50 rounded-lg text-blue-400 hover:text-blue-300 transition-all"
                        title="View Lesson"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleEditComment(comment)}
                        className="p-2 bg-gold/20 hover:bg-gold/30 border border-gold/30 hover:border-gold/50 rounded-lg text-gold hover:text-yellow-300 transition-all"
                        title="Edit Comment"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleConfirmDelete(comment.id)}
                        className="p-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 hover:border-red-500/50 rounded-lg text-red-400 hover:text-red-300 transition-all"
                        title="Delete Comment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Comment Content */}
                  {editingCommentId === comment.id ? (
                    <div className="mb-4">
                      <textarea
                        value={editCommentText}
                        onChange={(e) => setEditCommentText(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-white/40 focus:outline-none focus:border-gold/50 focus:bg-white/15 transition-all resize-none"
                        rows={3}
                        placeholder="Write your comment here..."
                      />
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => handleUpdateComment(comment)}
                          disabled={isUpdatingComment || !editCommentText.trim()}
                          className="flex items-center gap-2 bg-gradient-to-r from-gold to-yellow-600 hover:from-yellow-600 hover:to-gold disabled:from-gold/50 disabled:to-yellow-600/50 text-black font-medium py-2 px-4 rounded-lg transition-all disabled:cursor-not-allowed"
                        >
                          {isUpdatingComment ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          {isUpdatingComment ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={isUpdatingComment}
                          className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600/50 text-white font-medium py-2 px-4 rounded-lg transition-all disabled:cursor-not-allowed"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <p className="text-white leading-relaxed">{comment.body}</p>
                    </div>
                  )}

                  {/* Course/Module/Lesson Info */}
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-white/60 mb-2">
                      <BookOpen className="w-4 h-4" />
                      <span>Comment Location:</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex gap-2">
                        <span className="text-white/60 min-w-0 flex-shrink-0">Course:</span>
                        <span className="text-white truncate">{comment.courseId}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-white/60 min-w-0 flex-shrink-0">Module:</span>
                        <span className="text-white truncate">{comment.moduleId}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-white/60 min-w-0 flex-shrink-0">Lesson:</span>
                        <span className="text-white truncate">{comment.lessonId}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassmorphicCard>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteCommentId} onOpenChange={() => setDeleteCommentId(null)}>
          <AlertDialogContent className="bg-gray-900 border border-white/20">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Confirm Comment Deletion</AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                Are you sure you want to delete this comment? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3">
              <AlertDialogCancel 
                onClick={handleCancelDelete}
                className="bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/30 text-white"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteComment}
                disabled={isDeletingComment}
                className="bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700 text-white"
              >
                {isDeletingComment ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default AllComments;
