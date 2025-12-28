import { supabase } from '@/lib/supabaseClient'

type CourseRow = {
  id: string
  title: string
  description: string | null
  thumbnail: string | null
  instructor: string | null
  order: number
  locked: boolean
  created_at: string | null
  updated_at: string | null
}

type ModuleRow = {
  course_id: string
  module_id: string
  title: string
  description: string | null
  icon_url: string | null
  order: number
  locked: boolean
  completed: boolean | null
  created_at: string | null
  updated_at: string | null
}

type LessonRow = {
  course_id: string
  module_id: string
  lesson_id: string
  title: string
  description: string | null
  type: string | null
  video_url: string | null
  audio_url: string | null
  duration: number | null
  locked: boolean
  completed: boolean | null
  transcript: string | null
  text_content: string | null
  resources: any[] | null
  notes: any[] | null
  order: number
  created_at: string | null
  updated_at: string | null
}

export type Course = {
  id: string
  title: string
  description: string | null
  thumbnail: string | null
  instructor: string | null
  order: number
  locked: boolean
  createdAt: string | null
  updatedAt: string | null
}

export type Module = {
  courseId: string
  moduleId: string
  title: string
  description: string | null
  iconUrl: string | null
  order: number
  locked: boolean
  completed: boolean | null
  createdAt: string | null
  updatedAt: string | null
}

export type Lesson = {
  courseId: string
  moduleId: string
  lessonId: string
  title: string
  description: string | null
  type: string | null
  videoUrl: string | null
  audioUrl: string | null
  duration: number | null
  locked: boolean
  completed: boolean | null
  transcript: string | null
  textContent: string | null
  resources: any[]
  notes: any[]
  order: number
  createdAt: string | null
  updatedAt: string | null
}

const toCourse = (r: CourseRow): Course => ({
  id: r.id,
  title: r.title,
  description: r.description,
  thumbnail: r.thumbnail,
  instructor: r.instructor,
  order: r.order,
  locked: r.locked,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const toModule = (r: ModuleRow): Module => ({
  courseId: r.course_id,
  moduleId: r.module_id,
  title: r.title,
  description: r.description,
  iconUrl: r.icon_url,
  order: r.order,
  locked: r.locked,
  completed: r.completed ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const toLesson = (r: LessonRow): Lesson => ({
  courseId: r.course_id,
  moduleId: r.module_id,
  lessonId: r.lesson_id,
  title: r.title,
  description: r.description,
  type: r.type,
  videoUrl: r.video_url,
  audioUrl: r.audio_url,
  duration: r.duration ?? null,
  locked: r.locked,
  completed: r.completed ?? null,
  transcript: r.transcript,
  textContent: r.text_content,
  resources: r.resources ?? [],
  notes: r.notes ?? [],
  order: r.order,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

export async function listCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map(toCourse)
}

export async function getCourse(courseId: string): Promise<Course | null> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? toCourse(data as CourseRow) : null
}

export async function listModules(courseId: string): Promise<Module[]> {
  const { data, error } = await supabase
    .from('course_modules')
    .select('*')
    .eq('course_id', courseId)
    .order('order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map(toModule)
}

export async function listLessons(courseId: string, moduleId: string): Promise<Lesson[]> {
  const { data, error } = await supabase
    .from('course_lessons')
    .select('*')
    .eq('course_id', courseId)
    .eq('module_id', moduleId)
    .order('order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map(toLesson)
}

export async function getLesson(courseId: string, moduleId: string, lessonId: string): Promise<Lesson | null> {
  const { data, error } = await supabase
    .from('course_lessons')
    .select('*')
    .eq('course_id', courseId)
    .eq('module_id', moduleId)
    .eq('lesson_id', lessonId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? toLesson(data as LessonRow) : null
}

export async function createCourse(row: Course): Promise<void> {
  const payload: CourseRow = {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    thumbnail: row.thumbnail ?? null,
    instructor: row.instructor ?? null,
    order: row.order,
    locked: row.locked,
    created_at: row.createdAt ?? null,
    updated_at: row.updatedAt ?? null,
  }
  const { error } = await supabase.from('courses').upsert(payload, { onConflict: 'id' })
  if (error) throw new Error(error.message)
}

export async function updateCourse(courseId: string, data: Partial<Course>): Promise<void> {
  const payload: Partial<CourseRow> = {}
  if (data.title !== undefined) payload.title = data.title
  if (data.description !== undefined) payload.description = data.description ?? null
  if (data.thumbnail !== undefined) payload.thumbnail = data.thumbnail ?? null
  if (data.instructor !== undefined) payload.instructor = data.instructor ?? null
  if (data.order !== undefined) payload.order = data.order
  if (data.locked !== undefined) payload.locked = data.locked
  if (data.updatedAt !== undefined) payload.updated_at = data.updatedAt ?? null
  const { error } = await supabase.from('courses').update(payload).eq('id', courseId)
  if (error) throw new Error(error.message)
}

export async function deleteCourse(courseId: string): Promise<void> {
  const { error } = await supabase.from('courses').delete().eq('id', courseId)
  if (error) throw new Error(error.message)
}

export async function createModule(courseId: string, row: Omit<Module, 'courseId'>): Promise<void> {
  const payload: ModuleRow = {
    course_id: courseId,
    module_id: row.moduleId,
    title: row.title,
    description: row.description ?? null,
    icon_url: row.iconUrl ?? null,
    order: row.order,
    locked: row.locked,
    completed: row.completed ?? null,
    created_at: row.createdAt ?? null,
    updated_at: row.updatedAt ?? null,
  }
  const { error } = await supabase.from('course_modules').upsert(payload, { onConflict: 'course_id,module_id' })
  if (error) throw new Error(error.message)
}

export async function updateModule(courseId: string, moduleId: string, data: Partial<Module>): Promise<void> {
  const payload: Partial<ModuleRow> = {
    title: data.title,
    description: data.description ?? null,
    icon_url: data.iconUrl ?? null,
    order: data.order,
    locked: typeof data.locked === 'boolean' ? data.locked : undefined,
    completed: data.completed ?? null,
    updated_at: data.updatedAt ?? null,
  }
  const { error } = await supabase
    .from('course_modules')
    .update(payload)
    .eq('course_id', courseId)
    .eq('module_id', moduleId)
  if (error) throw new Error(error.message)
}

export async function deleteModule(courseId: string, moduleId: string): Promise<void> {
  const { error } = await supabase
    .from('course_modules')
    .delete()
    .eq('course_id', courseId)
    .eq('module_id', moduleId)
  if (error) throw new Error(error.message)
}

export async function createLesson(courseId: string, moduleId: string, row: Omit<Lesson, 'courseId' | 'moduleId'>): Promise<void> {
  const payload: LessonRow = {
    course_id: courseId,
    module_id: moduleId,
    lesson_id: row.lessonId,
    title: row.title,
    description: row.description ?? null,
    type: row.type ?? null,
    video_url: row.videoUrl ?? null,
    audio_url: row.audioUrl ?? null,
    duration: row.duration ?? null,
    locked: row.locked,
    completed: row.completed ?? null,
    transcript: row.transcript ?? null,
    text_content: row.textContent ?? null,
    resources: row.resources ?? [],
    notes: row.notes ?? [],
    order: row.order,
    created_at: row.createdAt ?? null,
    updated_at: row.updatedAt ?? null,
  }
  const { error } = await supabase.from('course_lessons').upsert(payload, { onConflict: 'course_id,module_id,lesson_id' })
  if (error) throw new Error(error.message)
}

export async function updateLesson(courseId: string, moduleId: string, lessonId: string, data: Partial<Lesson>): Promise<void> {
  const payload: Partial<LessonRow> = {}
  if (data.title !== undefined) payload.title = data.title
  if (data.description !== undefined) payload.description = data.description
  if (data.type !== undefined) payload.type = data.type
  if (data.videoUrl !== undefined) payload.video_url = data.videoUrl
  if (data.audioUrl !== undefined) payload.audio_url = data.audioUrl
  if (data.duration !== undefined) payload.duration = data.duration as number | null
  if (typeof data.locked === 'boolean') payload.locked = data.locked
  if (data.completed !== undefined) payload.completed = data.completed
  if (data.transcript !== undefined) payload.transcript = data.transcript
  if (data.textContent !== undefined) payload.text_content = data.textContent
  if (data.resources !== undefined) payload.resources = data.resources
  if (data.notes !== undefined) payload.notes = data.notes
  if (data.order !== undefined) payload.order = data.order
  if (data.updatedAt !== undefined) payload.updated_at = data.updatedAt
  const { error } = await supabase
    .from('course_lessons')
    .update(payload)
    .eq('course_id', courseId)
    .eq('module_id', moduleId)
    .eq('lesson_id', lessonId)
  if (error) throw new Error(error.message)
}

export async function deleteLesson(courseId: string, moduleId: string, lessonId: string): Promise<void> {
  const { error } = await supabase
    .from('course_lessons')
    .delete()
    .eq('course_id', courseId)
    .eq('module_id', moduleId)
    .eq('lesson_id', lessonId)
  if (error) throw new Error(error.message)
}

export async function getFirstLessonForCourse(courseId: string): Promise<{ moduleId: string; lessonId: string } | null> {
  // 1. Get the first module
  const { data: moduleData, error: moduleError } = await supabase
    .from('course_modules')
    .select('module_id')
    .eq('course_id', courseId)
    .order('order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (moduleError) throw new Error(moduleError.message)
  if (!moduleData) return null

  // 2. Get the first lesson in that module
  const { data: lessonData, error: lessonError } = await supabase
    .from('course_lessons')
    .select('lesson_id')
    .eq('course_id', courseId)
    .eq('module_id', moduleData.module_id)
    .order('order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (lessonError) throw new Error(lessonError.message)
  if (!lessonData) return null

  return {
    moduleId: moduleData.module_id,
    lessonId: lessonData.lesson_id,
  }
}
