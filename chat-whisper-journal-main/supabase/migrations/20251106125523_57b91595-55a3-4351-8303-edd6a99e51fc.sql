-- Create table for diary entries
CREATE TABLE public.diary_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_diary_entries_session_id ON public.diary_entries(session_id);
CREATE INDEX idx_diary_entries_created_at ON public.diary_entries(created_at DESC);

-- No RLS policies needed since this is a zero-auth app