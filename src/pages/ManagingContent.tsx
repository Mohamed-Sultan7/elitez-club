import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { listCourses, updateCourse } from '@/db/courses';
import MainLayout from '@/components/MainLayout';
import GlassmorphicCard from '@/components/GlassmorphicCard';
import GoldButton from '@/components/GoldButton';
import { useToast } from "@/components/ui/use-toast";
import { Plus, Edit, Trash2, Loader2, Save, Grip } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Course type definition
interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  thumbnail: string;
  order: number;
}

// SortableCourse component
interface SortableCourseProps {
  course: Course;
  isDragging: boolean;
}

const SortableCourse: React.FC<SortableCourseProps> = ({ course, isDragging }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isItemDragging,
  } = useSortable({ id: course.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isItemDragging ? 0.5 : 1,
    zIndex: isItemDragging ? 1 : 0,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <GlassmorphicCard hover={!isDragging} className={isItemDragging ? 'border-gold' : ''}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-2">
            <div 
              className="cursor-grab active:cursor-grabbing p-2 text-white/60 hover:text-gold transition-colors"
              {...listeners}
            >
              <Grip className="w-6 h-6" />
            </div>
          </div>
          <div className="relative h-40 mb-4 rounded overflow-hidden">
            <img 
              src={course.thumbnail || "/thumbnails/default.jpg"} 
              alt={course.title}
              className="w-full h-full object-cover"
            />
          </div>
          <h3 className="text-xl font-bold mb-2">{course.title}</h3>
          <p className="text-white/70 mb-4 line-clamp-2">{course.description}</p>
          <div className="flex justify-between items-center">
            <span className="text-white/60">Instructor: {course.instructor}</span>
            <Link to={`/admin/course/${course.id}/edit`}>
              <GoldButton variant="outline" size="sm">
                <Edit className="ml-2" size={16} /> Edit
              </GoldButton>
            </Link>
          </div>
        </div>
      </GlassmorphicCard>
    </div>
  );
};

const ManagingContent = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isOrderChanged, setIsOrderChanged] = useState<boolean>(false);
  const [isSavingOrder, setIsSavingOrder] = useState<boolean>(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance required before activating
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setIsDragging(false);
    
    if (over && active.id !== over.id) {
      setCourses((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        const newArray = arrayMove(items, oldIndex, newIndex);
        setIsOrderChanged(true);
        return newArray;
      });
    }
  };

  // Save the new course order to Supabase
  const saveNewCourseOrder = async () => {
    if (!user) return;
    
    setIsSavingOrder(true);
    
    try {
      for (let i = 0; i < courses.length; i++) {
        const course = courses[i];
        await updateCourse(course.id, { order: i });
      }
      
      // Reset the order changed flag
      setIsOrderChanged(false);
      toast({
        title: "Order Saved",
        description: "Course order updated successfully",
        variant: "default",
      });
    } catch (error) {
      console.error('Error saving course order:', error);
      toast({
        title: "Error Saving Order",
        description: "An error occurred while saving course order",
        variant: "destructive",
      });
    } finally {
      setIsSavingOrder(false);
    }
  };

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

  // Fetch courses from Supabase
  useEffect(() => {
    const fetchCourses = async () => {
      if (!user || !adminEmails.includes(user.email)) return;
      
      try {
        setLoading(true);
        const supaCourses = await listCourses();
        const coursesList = supaCourses.map(c => ({
          id: c.id,
          title: c.title || '',
          description: c.description || '',
          instructor: c.instructor || '',
          thumbnail: c.thumbnail || '',
          order: c.order || 0,
        })) as Course[];
        
        // Sort courses by order field
        coursesList.sort((a, b) => (a.order || 0) - (b.order || 0));
        setCourses(coursesList);
      } catch (error) {
        console.error('Error fetching courses:', error);
        toast({
          title: "Error",
          description: "An error occurred while fetching courses",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [user, toast]);

  // If user is not loaded yet or not admin, show nothing
  if (!user || !adminEmails.includes(user.email)) {
    return null;
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Manage Content</h1>
          <Link to="/admin/add-course">
            <GoldButton>
              <Plus className="ml-2" size={18} /> Add New Course
            </GoldButton>
          </Link>
        </div>

        {/* Save Order Button - Only show when order has changed */}
        {isOrderChanged && (
          <div className="mb-4">
            <GoldButton onClick={saveNewCourseOrder} disabled={isSavingOrder}>
              {isSavingOrder ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  Saving new order...
                </>
              ) : (
                <>
                  <Save className="ml-2" size={18} />
                  Save Course Order
                </>
              )}
            </GoldButton>
            <p className="text-white/60 text-sm mt-2">Course order has changed. Click the button above to save the new order.</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="mr-2">Loading courses...</span>
          </div>
        ) : courses.length === 0 ? (
          <GlassmorphicCard>
            <div className="p-6 text-center">
              <p className="text-xl">No courses available</p>
              <p className="text-white/60 mt-2">Add a new course to get started</p>
            </div>
          </GlassmorphicCard>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setIsDragging(false)}
          >
            <SortableContext items={courses.map(course => course.id)} strategy={verticalListSortingStrategy}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <SortableCourse 
                    key={course.id} 
                    course={course} 
                    isDragging={isDragging}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </MainLayout>
  );
};

export default ManagingContent;
