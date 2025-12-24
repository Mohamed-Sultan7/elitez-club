import { supabase } from '@/lib/supabaseClient'

type CommentRow = {
  id: string
  course_id: string
  module_id: string
  lesson_id: string
  user_id: string
  body: string
  created_at: string
}

export type Comment = {
  id: string
  courseId: string
  moduleId: string
  lessonId: string
  userId: string
  body: string
  createdAt: string
  userName: string | null
  userAvatar: string | null
}

const toComment = (r: CommentRow, profile?: { name: string | null; avatar_url: string | null }): Comment => ({
  id: r.id,
  courseId: r.course_id,
  moduleId: r.module_id,
  lessonId: r.lesson_id,
  userId: r.user_id,
  body: r.body,
  createdAt: r.created_at,
  userName: profile?.name ?? null,
  userAvatar: profile?.avatar_url ?? null,
})

export async function listComments(courseId: string, moduleId: string, lessonId: string): Promise<Comment[]> {
  const { data: comments, error } = await supabase
    .from('lesson_comments')
    .select('*')
    .eq('course_id', courseId)
    .eq('module_id', moduleId)
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: false })
  
  if (error) throw new Error(error.message)
  
  if (!comments || comments.length === 0) return []

  // Fetch profiles manually
  const userIds = Array.from(new Set(comments.map((c: CommentRow) => c.user_id)))
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .in('id', userIds)

  const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? [])

  return comments.map(r => toComment(r, profileMap.get(r.user_id)))
}

export async function addComment(courseId: string, moduleId: string, lessonId: string, body: string): Promise<Comment> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('lesson_comments')
    .insert({
      course_id: courseId,
      module_id: moduleId,
      lesson_id: lessonId,
      user_id: uid,
      body,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  
  // Fetch the user's profile to return complete comment data
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, avatar_url')
    .eq('id', uid)
    .single()
    
  return toComment(data as CommentRow, profile)
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('lesson_comments')
    .delete()
    .eq('id', commentId)
  if (error) throw new Error(error.message)
}

export async function updateComment(commentId: string, body: string): Promise<void> {
  const { error } = await supabase
    .from('lesson_comments')
    .update({ body })
    .eq('id', commentId)
  if (error) throw new Error(error.message)
}

export type AdminComment = {
  id: string
  body: string
  createdAt: string
  courseId: string
  moduleId: string
  lessonId: string
  userId: string
  userName: string | null
  userAvatar: string | null
}

type AdminCommentRow = {
  id: string
  body: string
  created_at: string
  course_id: string
  module_id: string
  lesson_id: string
  user_id: string
}

export async function listAllComments(params: { limit?: number; search?: string } = {}): Promise<AdminComment[]> {
  const limit = params.limit ?? 200
  let query = supabase
    .from('lesson_comments')
    .select(`
      id,
      body,
      created_at,
      course_id,
      module_id,
      lesson_id,
      user_id
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (params.search && params.search.trim() !== '') {
    query = query.ilike('body', `%${params.search.trim()}%`)
  }

  const { data: comments, error } = await query
  if (error) throw new Error(error.message)

  if (!comments || comments.length === 0) return []

  // Fetch profiles manually to avoid JOIN 400 errors
  const userIds = Array.from(new Set(comments.map((c: AdminCommentRow) => c.user_id)))
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, email')
    .in('id', userIds)

  const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? [])

  return comments.map((r: AdminCommentRow) => {
    const profile = profileMap.get(r.user_id)
    return {
      id: r.id,
      body: r.body,
      createdAt: r.created_at,
      courseId: r.course_id,
      moduleId: r.module_id,
      lessonId: r.lesson_id,
      userId: r.user_id,
      userName: profile?.name ?? null,
      userAvatar: profile?.avatar_url ?? null,
    }
  })
}
