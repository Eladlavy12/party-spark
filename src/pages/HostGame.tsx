import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoom, usePlayers } from '@/hooks/use-realtime';
import { useBuzzes } from '@/hooks/use-buzzer';
import { useSubmissions } from '@/hooks/use-submissions';
import { useCountdown } from '@/hooks/use-countdown';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2, Users, ChevronRight, ChevronLeft, Bell, Trash2,
  Trophy, Clock, Info, MessageSquare, CheckSquare, Star, Pencil,
  Eye, EyeOff, ListOrdered, UserRound,
} from 'lucide-react';
import { CountdownTimer } from '@/components/CountdownTimer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { SlideContent, PackSettings, AnswerVisibility } from '@/lib/slide-templates';

type Slide = Database['public']['Tables']['slides']['Row'];
type Player = Database['public']['Tables']['players']['Row'];
type Submission = Database['public']['Tables']['submissions']['Row'];

// Re-export from slide-templates to avoid duplication


/* ─── Answer display helper ─── */
function formatAnswer(sub: Submission): string {
  const data = sub.answer_data as Record<string, unknown> | null;
  if (!data) return '—';
  if (data.text) return String(data.text);
  if (data.selectedOption) return String(data.selectedOption);
  if (data.selectedIndex !== undefined) return `Option ${String.fromCharCode(65 + Number(data.selectedIndex))}`;
  if (data.rating !== undefined) return `${data.rating}/10`;
  return JSON.stringify(data);
}

/* ─── Submissions Panel ─── */
function SubmissionsPanel({
  submissions,
  players,
  visibility,
}: {
  submissions: Submission[];
  players: Player[];
  visibility: AnswerVisibility;
}) {
  if (submissions.length === 0) {
    return <p className="text-xs text-muted-foreground">No answers yet…</p>;
  }

  let visibleSubs = submissions;

  if (visibility.mode === 'fastest') {
    visibleSubs = submissions.slice(0, visibility.count);
  }

  const showName = visibility.mode === 'all-named' || visibility.mode === 'fastest';

  return (
    <div className="space-y-1.5">
      {visibleSubs.map((sub, i) => {
        const player = players.find((p) => p.id === sub.player_id);
        return (
          <motion.div
            key={sub.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-start gap-2 bg-muted/50 rounded-lg px-3 py-2"
          >
            {showName && (
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5"
                style={{ backgroundColor: player?.avatar_color ?? '#FF6B6B', color: '#1a1a2e' }}
              >
                {player?.nickname?.charAt(0).toUpperCase() ?? '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {showName && (
                <span className="text-[11px] text-muted-foreground font-medium block truncate">
                  {player?.nickname ?? 'Unknown'}
                </span>
              )}
              <span className="text-foreground text-xs">{formatAnswer(sub)}</span>
            </div>
            {visibility.mode === 'fastest' && (
              <span className="text-[10px] text-muted-foreground font-bold shrink-0">#{i + 1}</span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Visibility Dropdown ─── */
function VisibilityDropdown({
  visibility,
  setVisibility,
}: {
  visibility: AnswerVisibility;
  setVisibility: (v: AnswerVisibility) => void;
}) {
  const [fastestCount, setFastestCount] = useState(
    visibility.mode === 'fastest' ? visibility.count : 3
  );

  const label = {
    'host-only': 'Host only',
    fastest: `Fastest ${visibility.mode === 'fastest' ? visibility.count : fastestCount}`,
    'all-anonymous': 'All (anonymous)',
    'all-named': 'All (with names)',
  }[visibility.mode];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1.5 text-muted-foreground">
          {visibility.mode === 'host-only' ? (
            <EyeOff className="w-3.5 h-3.5" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">Answer Visibility</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setVisibility({ mode: 'host-only' })}
          className={visibility.mode === 'host-only' ? 'bg-accent/50' : ''}
        >
          <EyeOff className="w-4 h-4 mr-2" />
          <div>
            <span className="block text-sm font-medium">Host only</span>
            <span className="block text-[11px] text-muted-foreground">Only you see answers</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            setVisibility({ mode: 'fastest', count: fastestCount });
          }}
          className={`flex-col items-start gap-1.5 ${visibility.mode === 'fastest' ? 'bg-accent/50' : ''}`}
        >
          <div className="flex items-center gap-2 w-full">
            <ListOrdered className="w-4 h-4 shrink-0" />
            <div className="flex-1">
              <span className="block text-sm font-medium">Fastest responses</span>
              <span className="block text-[11px] text-muted-foreground">Show top N answers</span>
            </div>
          </div>
          <div
            className="flex items-center gap-2 pl-6"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs text-muted-foreground">Show top</span>
            <Input
              type="number"
              min={1}
              max={50}
              value={fastestCount}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 1;
                setFastestCount(v);
                if (visibility.mode === 'fastest') {
                  setVisibility({ mode: 'fastest', count: v });
                }
              }}
              className="w-16 h-7 text-xs text-center"
            />
            {visibility.mode !== 'fastest' && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setVisibility({ mode: 'fastest', count: fastestCount })}
              >
                Apply
              </Button>
            )}
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setVisibility({ mode: 'all-anonymous' })}
          className={visibility.mode === 'all-anonymous' ? 'bg-accent/50' : ''}
        >
          <Eye className="w-4 h-4 mr-2" />
          <div>
            <span className="block text-sm font-medium">All (anonymous)</span>
            <span className="block text-[11px] text-muted-foreground">Show answers without names</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setVisibility({ mode: 'all-named' })}
          className={visibility.mode === 'all-named' ? 'bg-accent/50' : ''}
        >
          <UserRound className="w-4 h-4 mr-2" />
          <div>
            <span className="block text-sm font-medium">All (with names)</span>
            <span className="block text-[11px] text-muted-foreground">Show answers + player names</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── Main HostGame ─── */
const HostGame = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { room } = useRoom(code ?? null);
  const players = usePlayers(room?.id ?? null);
  const slideIndex = room?.current_slide_index ?? 0;
  const { buzzes, clearBuzzes } = useBuzzes(room?.id ?? null, slideIndex);

  const [slides, setSlides] = useState<Slide[]>([]);
  const [loadingSlides, setLoadingSlides] = useState(true);
  const [packSettings, setPackSettings] = useState<PackSettings>({});
  const [visibility, setVisibility] = useState<AnswerVisibility>({ mode: 'host-only' });
  const [timerActive, setTimerActive] = useState(false);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    if (!room?.current_pack_id) return;
    setLoadingSlides(true);
    supabase
      .from('slides')
      .select('*')
      .eq('pack_id', room.current_pack_id)
      .order('order_index')
      .then(({ data }) => {
        if (data) setSlides(data);
        setLoadingSlides(false);
      });
  }, [room?.current_pack_id]);

  const currentSlide = slides[slideIndex] ?? null;
  const content = currentSlide ? (currentSlide.content as unknown as SlideContent) : null;
  const isLast = slideIndex >= slides.length - 1;

  const submissions = useSubmissions(room?.id ?? null, currentSlide?.id ?? null);

  // Countdown timer
  const timeLimit = currentSlide?.time_limit;
  const { remaining, progress } = useCountdown({
    duration: timeLimit && timeLimit > 0 ? timeLimit : null,
    active: timerActive,
  });

  // Start timer when slide changes
  useEffect(() => {
    if (currentSlide?.time_limit && currentSlide.time_limit > 0) {
      setTimerActive(true);
    } else {
      setTimerActive(false);
    }
  }, [slideIndex, currentSlide?.id]);

  const goToSlide = async (index: number) => {
    if (!room) return;
    await supabase.from('rooms').update({ current_slide_index: index }).eq('id', room.id);
  };

  const endGame = async () => {
    if (!room) return;
    await supabase.from('rooms').update({ status: 'ended' as const }).eq('id', room.id);
    navigate(`/host/${code}`);
  };

  if (!room || loadingSlides) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <Gamepad2 className="w-12 h-12 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground text-xl">This pack has no slides.</p>
        <Button variant="outline" onClick={endGame}>Back to Lobby</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm shrink-0 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gamepad2 className="w-6 h-6 text-primary" />
          <span className="font-bold text-foreground">
            Slide {slideIndex + 1} <span className="text-muted-foreground font-normal">/ {slides.length}</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <Users className="w-4 h-4" />
            <span>{players.length}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={endGame} className="text-muted-foreground">
            End Game
          </Button>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Main slide display */}
        <main className="flex-1 flex flex-col items-center justify-center p-8 relative">
          <AnimatePresence mode="wait">
            {content && (
              <motion.div
                key={currentSlide!.id}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-3xl text-center"
              >
                {/* Template icon */}
                <div className="mb-4">
                  {content.template === 'information' && <Info className="w-10 h-10 text-primary mx-auto" />}
                  {content.template === 'open-text' && <MessageSquare className="w-10 h-10 text-primary mx-auto" />}
                  {content.template === 'multiple-choice' && <CheckSquare className="w-10 h-10 text-primary mx-auto" />}
                  {content.template === 'rating' && <Star className="w-10 h-10 text-primary mx-auto" />}
                  {content.template === 'drawing' && <Pencil className="w-10 h-10 text-primary mx-auto" />}
                </div>

                <h2 className="text-4xl font-bold text-foreground mb-4">{content.title || 'Untitled Slide'}</h2>

                {content.body && (
                  <div className="text-xl text-muted-foreground mb-6 max-w-xl mx-auto prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: content.body }} />
                )}

                {content.mediaUrl && (
                  <div className="mb-6 rounded-2xl overflow-hidden inline-block border border-border">
                    <img src={content.mediaUrl} alt="" className="max-h-80 object-contain" />
                  </div>
                )}

                {content.template === 'multiple-choice' && content.options && (
                  <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto mt-4">
                    {content.options.map((opt, i) => (
                      <div
                        key={i}
                        className={`rounded-xl px-5 py-4 text-left flex items-center gap-3 border ${
                          content.correctOptionIndex === i
                            ? 'bg-accent/20 border-accent text-foreground'
                            : 'bg-muted/50 border-border text-muted-foreground'
                        }`}
                      >
                        <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="font-medium">{opt || `Option ${String.fromCharCode(65 + i)}`}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Presented answers (non host-only) */}
                {visibility.mode !== 'host-only' && submissions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 max-w-lg mx-auto"
                  >
                    <div className="bg-card border border-border rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        Answers ({submissions.length})
                      </h4>
                      <SubmissionsPanel
                        submissions={submissions}
                        players={players}
                        visibility={visibility}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Countdown Timer */}
                {timerActive && timeLimit && timeLimit > 0 && (
                  <div className="mt-6">
                    <CountdownTimer remaining={remaining} progress={progress} size="lg" />
                  </div>
                )}

                {/* Slide meta */}
                <div className="mt-4 flex items-center justify-center gap-6 text-muted-foreground text-sm">
                  {currentSlide!.points_possible && currentSlide!.points_possible > 0 && (
                    <span className="flex items-center gap-1">
                      <Trophy className="w-4 h-4" /> {currentSlide!.points_possible} pts
                    </span>
                  )}
                  {content.buzzerEnabled && (
                    <span className="flex items-center gap-1 text-destructive">
                      <Bell className="w-4 h-4" /> {content.buzzerMode === 'all' ? 'All buzz' : '1st buzz'}
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <Button
              variant="outline"
              size="lg"
              className="rounded-xl"
              disabled={slideIndex === 0}
              onClick={() => goToSlide(slideIndex - 1)}
            >
              <ChevronLeft className="w-5 h-5 mr-1" /> Previous
            </Button>
            {isLast ? (
              <Button variant="hero" size="lg" className="rounded-xl" onClick={endGame}>
                <Trophy className="w-5 h-5 mr-1" /> End Game
              </Button>
            ) : (
              <Button variant="hero" size="lg" className="rounded-xl" onClick={() => goToSlide(slideIndex + 1)}>
                Next <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            )}
          </div>
        </main>

        {/* Sidebar */}
        <aside className="w-72 border-l border-border bg-card/30 flex flex-col shrink-0 overflow-y-auto">
          {/* Answer visibility + Submissions (host always sees) */}
          {content && content.template !== 'information' && (
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-foreground font-semibold text-sm flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                  Answers ({submissions.length})
                </h3>
                <VisibilityDropdown visibility={visibility} setVisibility={setVisibility} />
              </div>
              <SubmissionsPanel
                submissions={submissions}
                players={players}
                visibility={{ mode: 'all-named' }}
              />
            </div>
          )}

          {/* Buzzes */}
          {content?.buzzerEnabled && (
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-foreground font-semibold text-sm flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-destructive" /> Buzzes
                </h3>
                {buzzes.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearBuzzes} className="text-muted-foreground text-xs h-6 px-2">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
              {buzzes.length === 0 ? (
                <p className="text-xs text-muted-foreground">No buzzes yet…</p>
              ) : (
                <div className="space-y-1.5">
                  {buzzes.map((buzz, i) => {
                    const player = players.find((p) => p.id === buzz.player_id);
                    return (
                      <div key={buzz.id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
                        <span className={`text-xs font-bold ${i === 0 ? 'text-accent' : 'text-muted-foreground'}`}>#{i + 1}</span>
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                          style={{ backgroundColor: player?.avatar_color ?? '#FF6B6B', color: '#1a1a2e' }}
                        >
                          {player?.nickname.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <span className="text-foreground text-xs font-medium truncate">{player?.nickname ?? 'Unknown'}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Players */}
          <div className="p-4">
            <h3 className="text-foreground font-semibold text-sm flex items-center gap-1.5 mb-3">
              <Users className="w-3.5 h-3.5 text-muted-foreground" /> Players ({players.length})
            </h3>
            <div className="space-y-1.5">
              {players.map((player) => (
                <div key={player.id} className="flex items-center gap-2 px-2 py-1.5">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                    style={{ backgroundColor: player.avatar_color ?? '#FF6B6B', color: '#1a1a2e' }}
                  >
                    {player.nickname.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-foreground text-sm font-medium truncate flex-1">{player.nickname}</span>
                  <span className="text-xs text-muted-foreground">{player.score ?? 0} pts</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default HostGame;
