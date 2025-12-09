-- Enable Row Level Security
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert diary entries (they'll use session IDs from localStorage)
CREATE POLICY "Anyone can insert diary entries"
ON public.diary_entries
FOR INSERT
WITH CHECK (true);

-- Allow anyone to view diary entries (they'll filter by their session ID on the client)
CREATE POLICY "Anyone can view diary entries"
ON public.diary_entries
FOR SELECT
USING (true);