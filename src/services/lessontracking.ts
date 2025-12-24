// This file is deprecated as part of the migration to Supabase.
// It was previously used for tracking lesson progress in Firestore.
// The functionality has been moved or removed.

export const logLessonWatch = async () => {
  console.warn("logLessonWatch is deprecated.");
};

export const getLastWatchedLesson = async () => {
  return null;
};

export const getCourseProgress = async () => {
  return [];
};

export const hasWatchedLessons = async () => {
  return false;
};

export const getCourseLastWatchedLesson = async () => {
  return null;
};
