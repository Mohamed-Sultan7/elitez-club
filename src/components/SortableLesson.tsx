import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import GlassmorphicCard from './GlassmorphicCard';
import GoldButton from './GoldButton';
import { CheckCircle, Clock, Edit, LockIcon, Trash2, Video, Headphones, FileText, Menu } from 'lucide-react';

type LessonType = 'video' | 'audio' | 'text';

interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: string;
  type?: LessonType;
  videoUrl?: string;
  audioUrl?: string;
  textContent?: string;
  completed: boolean;
  locked: boolean;
  order: number;
}

interface SortableLessonProps {
  lesson: Lesson;
  index: number;
  courseId: string;
  moduleId: string;
  onDelete: (lesson: Lesson) => void;
  isDragging: boolean;
}

const SortableLesson: React.FC<SortableLessonProps> = ({ 
  lesson, 
  index, 
  courseId, 
  moduleId, 
  onDelete,
  isDragging
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isItemDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isItemDragging ? 0.5 : 1,
    zIndex: isItemDragging ? 1 : 0,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <GlassmorphicCard hover={!isDragging} className={isItemDragging ? 'border-gold' : ''}>
        <div className="flex flex-col md:flex-row justify-between items-center p-4">
          {/* Drag Handle */}
          <div className='flex items-center'>
          <div 
            className="cursor-grab active:cursor-grabbing p-2 mr-2 text-white/60 hover:text-gold transition-colors"
            {...listeners}
          >
            <Menu className="w-6 h-6" />
          </div>
          
          <div className="flex items-center w-full md:w-auto mb-4 md:mb-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 mr-4">
              {lesson.completed ? (
                <CheckCircle className="w-5 h-5 text-gold" />
              ) : lesson.locked ? (
                <LockIcon className="w-5 h-5 text-white/60" />
              ) : (
                <span className="text-white/80">{index + 1}</span>
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                {/* Lesson Type Icon */}
                <h3 className="text-lg font-medium">{lesson.title}</h3>
                <div className="flex items-center gap-1">
                  {(!lesson.type || lesson.type === 'video') && (
                    <Video className="w-6 h-6 text-gold" />
                  )}
                  {lesson.type === 'audio' && (
                    <Headphones className="w-6 h-6 text-gold" />
                  )}
                  {lesson.type === 'text' && (
                    <FileText className="w-6 h-6 text-gold" />
                  )}
                </div>
              </div>
              <p className="text-white/60 text-sm mt-1 max-w-[800px]">{lesson.description}</p>
            </div>
          </div>
          </div>

          
          <div className="flex items-center self-center md:self-auto w-full md:w-auto">
            {lesson.duration && lesson.duration.trim() !== '' && (
              <div className="flex items-center text-white/60 mr-4">
                <Clock className="w-4 h-4 mr-1" />
                <span className="text-sm">{lesson.duration}</span>
              </div>
            )}
            
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Link to={`/admin/course/${courseId}/module/${moduleId}/lesson/${lesson.id}/edit`}>
                <GoldButton variant="outline" size="sm">
                  <Edit className="ml-2" size={16} /> Edit
                </GoldButton>
              </Link>
              <GoldButton 
                variant="destructive" 
                size="sm"
                onClick={() => onDelete(lesson)}
              >
                <Trash2 className="w-4 h-4" />
              </GoldButton>
            </div>
          </div>
        </div>
      </GlassmorphicCard>
    </div>
  );
};

export default SortableLesson;