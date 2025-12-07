-- Add section field to board_members table
-- Run this in Supabase SQL Editor

ALTER TABLE public.board_members
ADD COLUMN IF NOT EXISTS section text DEFAULT 'scrolling';

-- Update existing members to have default section
UPDATE public.board_members
SET section = 'scrolling'
WHERE section IS NULL;

-- Add comment to document the field
COMMENT ON COLUMN public.board_members.section IS 'Section assignment: fixed (top 3), layer1, layer2, layer3, or scrolling (auto-assign)';

