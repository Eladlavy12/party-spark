
-- Create enum for room status
CREATE TYPE public.room_status AS ENUM ('lobby', 'playing', 'ended');

-- Create enum for game types
CREATE TYPE public.game_type AS ENUM ('trivia', 'open-ended', 'drawing', 'truth-or-dare', 'improvisation');

-- Create rooms table
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status room_status NOT NULL DEFAULT 'lobby',
  current_game_type game_type,
  current_slide_index INTEGER DEFAULT 0,
  current_pack_id UUID,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create players table (anonymous, no auth required)
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  nickname TEXT NOT NULL,
  avatar_color TEXT DEFAULT '#FF6B6B',
  score INTEGER DEFAULT 0,
  is_ready BOOLEAN DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create content_packs table
CREATE TABLE public.content_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  game_type game_type NOT NULL,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create slides table
CREATE TABLE public.slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id UUID REFERENCES public.content_packs(id) ON DELETE CASCADE NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  time_limit INTEGER DEFAULT 30,
  points_possible INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create submissions table
CREATE TABLE public.submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  slide_id UUID REFERENCES public.slides(id) ON DELETE CASCADE NOT NULL,
  answer_data JSONB DEFAULT '{}',
  points_awarded INTEGER DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key for current_pack_id
ALTER TABLE public.rooms ADD CONSTRAINT rooms_current_pack_fk FOREIGN KEY (current_pack_id) REFERENCES public.content_packs(id) ON DELETE SET NULL;

-- Enable RLS on all tables
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Rooms policies: anyone can read (to join), hosts can manage
CREATE POLICY "Anyone can view rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create rooms" ON public.rooms FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update their rooms" ON public.rooms FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Hosts can delete their rooms" ON public.rooms FOR DELETE USING (auth.uid() = host_id);

-- Players policies: anyone can read/join (anonymous players)
CREATE POLICY "Anyone can view players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Anyone can join as player" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update players" ON public.players FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete players" ON public.players FOR DELETE USING (true);

-- Content packs: public packs readable, creators manage
CREATE POLICY "Anyone can view published packs" ON public.content_packs FOR SELECT USING (is_published = true OR auth.uid() = creator_id);
CREATE POLICY "Creators can create packs" ON public.content_packs FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update packs" ON public.content_packs FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete packs" ON public.content_packs FOR DELETE USING (auth.uid() = creator_id);

-- Slides: readable if pack is accessible
CREATE POLICY "Anyone can view slides" ON public.slides FOR SELECT USING (true);
CREATE POLICY "Pack creators can manage slides" ON public.slides FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.content_packs WHERE id = pack_id AND creator_id = auth.uid())
);
CREATE POLICY "Pack creators can update slides" ON public.slides FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.content_packs WHERE id = pack_id AND creator_id = auth.uid())
);
CREATE POLICY "Pack creators can delete slides" ON public.slides FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.content_packs WHERE id = pack_id AND creator_id = auth.uid())
);

-- Submissions: anyone can create/view in their room
CREATE POLICY "Anyone can view submissions" ON public.submissions FOR SELECT USING (true);
CREATE POLICY "Anyone can create submissions" ON public.submissions FOR INSERT WITH CHECK (true);

-- Enable realtime for rooms and players
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_content_packs_updated_at BEFORE UPDATE ON public.content_packs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
