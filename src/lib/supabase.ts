import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  'https://tymyuafkbuttlvniflbr.supabase.co'

const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5bXl1YWZrYnV0dGx2bmlmbGJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNjMwMDYsImV4cCI6MjA5NjgzOTAwNn0.0sIN1UnMhdXGJC-GhADyD4e8aiOZO_nXIJDAs-LoNnM'

export const supabase =
  createClient(
    supabaseUrl,
    supabaseAnonKey
  )