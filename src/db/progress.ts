import { supabase } from '@/lib/supabaseClient'

export type LastWatchedRow = {
  user_id: string
  course_id: string
  module_id: string
  lesson_id: string
  lesson_order: number
  watched_at: string
}

export type ContinueLearningCard = {
  courseId: string
  courseTitle: string
  courseThumbnail: string | null
  moduleId: string
  moduleTitle: string
  lessonId: string
  lessonTitle: string
  watchedAt: string
}

export async function upsertLastWatched(
  courseId: string,
  moduleId: string,
  lessonId: string,
  lessonOrder: number
): Promise<LastWatchedRow> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('last_watched')
    .upsert(
      {
        user_id: uid,
        course_id: courseId,
        module_id: moduleId,
        lesson_id: lessonId,
        lesson_order: lessonOrder,
        watched_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,course_id' }
    )
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as LastWatchedRow
}

export async function getLastWatchedByCourse(courseId: string): Promise<LastWatchedRow | null> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return null

  const { data, error } = await supabase
    .from('last_watched')
    .select('*')
    .eq('user_id', uid)
    .eq('course_id', courseId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as LastWatchedRow | null
}

export async function getAllLastWatched(): Promise<LastWatchedRow[]> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return []

  const { data, error } = await supabase
    .from('last_watched')
    .select('*')
    .eq('user_id', uid)
    .order('watched_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as LastWatchedRow[]
}

export async function getContinueLearningCard(): Promise<ContinueLearningCard | null> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return null

  // Get most recent last_watched item
  const { data: lastWatched, error } = await supabase
    .from('last_watched')
    .select('*')
    .eq('user_id', uid)
    .order('watched_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !lastWatched) return null

  // Fetch details (could be optimized with a join if RPC/view exists, but multiple fetches are safe here)
  const { data: course } = await supabase
    .from('courses')
    .select('title, thumbnail')
    .eq('id', lastWatched.course_id)
    .single()

  const { data: moduleData } = await supabase
    .from('course_modules')
    .select('title')
    .eq('course_id', lastWatched.course_id)
    .eq('module_id', lastWatched.module_id)
    .single()

  const { data: lesson } = await supabase
    .from('course_lessons')
    .select('title')
    .eq('course_id', lastWatched.course_id)
    .eq('module_id', lastWatched.module_id)
    .eq('lesson_id', lastWatched.lesson_id)
    .single()

  if (!course || !moduleData || !lesson) return null

  return {
    courseId: lastWatched.course_id,
    courseTitle: course.title,
    courseThumbnail: course.thumbnail,
    moduleId: lastWatched.module_id,
    moduleTitle: moduleData.title,
    lessonId: lastWatched.lesson_id,
    lessonTitle: lesson.title,
    watchedAt: lastWatched.watched_at,
  }
}
