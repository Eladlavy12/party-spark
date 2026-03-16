
CREATE TABLE public.buzzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  slide_index integer NOT NULL DEFAULT 0,
  buzzed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.buzzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view buzzes" ON public.buzzes FOR SELECT USING (true);
CREATE POLICY "Anyone can create buzzes" ON public.buzzes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete buzzes" ON public.buzzes FOR DELETE USING (true);

-- Enable realtime for buzzes
ALTER PUBLICATION supabase_realtime ADD TABLE public.buzzes;
