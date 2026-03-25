import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoom, usePlayers } from '@/hooks/use-realtime';
import { useSubmissions } from '@/hooks/use-submissions';
import { useCountdown } from '@/hooks/use-countdown';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2, Info, MessageSquare, CheckSquare, Star, Pencil, Trophy, Bell, Type, SlidersHorizontal
} from 'lucide-react';
import { CountdownTimer } from '@/components/CountdownTimer';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { SlideContent, PackSettings, AnswerVisibility } from '@/lib/slide-templates';
import { Scoreboard } from '@/components/Scoreboard';
import { MediaPlayer } from '@/components/MediaPlayer';

import { QRCodeSVG } from 'qrcode.react';

type Slide = Database['public']['Tables']['slides']['Row'];
type Player = Database['public']['Tables']['players']['Row'];
type Submission = Database['public']['Tables']['submissions']['Row'];

function formatAnswer(sub: Submission): string {
  const data = sub.answer_data as Record<string, unknown> | null;
  if (!data) return '—';
  if (data.text) return String(data.text);
  if (data.selectedOption) return String(data.selectedOption);
  if (data.rating !== undefined) return `${data.rating}/10`;
  if (data.sliderValue !== undefined) return String(data.sliderValue);
  return JSON.stringify(data);
}

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

export default function GameDisplay() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { room } = useRoom(code ?? null);
  const players = usePlayers(room?.id ?? null);
  const slideIndex = room?.current_slide_index ?? 0;
  const joinUrl = `${window.location.origin}/play/${code}`;

  const [slides, setSlides] = useState<Slide[]>([]);
  const [loadingSlides, setLoadingSlides] = useState(true);
  const [packSettings, setPackSettings] = useState<PackSettings>({});
  const [visibility, setVisibility] = useState<AnswerVisibility>({ mode: 'host-only' });
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    if (!room?.current_pack_id) return;
    setLoadingSlides(true);
    Promise.all([
      supabase.from('slides').select('*').eq('pack_id', room.current_pack_id).order('order_index'),
      supabase.from('content_packs').select('*').eq('id', room.current_pack_id).single(),
    ]).then(([slidesRes, packRes]) => {
      if (slidesRes.data) setSlides(slidesRes.data);
      if (packRes.data) {
        const ps = (packRes.data as any).settings as PackSettings | null;
        if (ps) {
          setPackSettings(ps);
          if (ps.answerVisibility) setVisibility(ps.answerVisibility);
        }
      }
      setLoadingSlides(false);
    });
  }, [room?.current_pack_id]);

  const currentSlide = slides[slideIndex] ?? null;
  const content = currentSlide ? (currentSlide.content as unknown as SlideContent) : null;
  const submissions = useSubmissions(room?.id ?? null, currentSlide?.id ?? null);

  const timeLimit = currentSlide?.time_limit;
  const { remaining, progress } = useCountdown({
    duration: timeLimit && timeLimit > 0 ? timeLimit : null,
    active: timerActive,
    resetKey: currentSlide?.id ?? '',
  });

  useEffect(() => {
    if (currentSlide?.time_limit && currentSlide.time_limit > 0) {
      setTimerActive(true);
    } else {
      setTimerActive(false);
    }
  }, [slideIndex, currentSlide?.id]);

  if (!room || (loadingSlides && room.status === 'playing')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <Gamepad2 className="w-12 h-12 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (room.status === 'lobby') {
    return (
      <div className="flex min-h-screen flex-col bg-background overflow-hidden selection:bg-primary/20 p-12">
        <div className="flex-1 flex flex-col items-center justify-center gap-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-black text-primary tracking-tighter uppercase">Party Spark</h1>
            <p className="text-2xl text-muted-foreground">Join the game at <span className="text-foreground font-bold">{window.location.host}</span></p>
          </div>

          <div className="flex items-center gap-16">
            <div className="bg-white rounded-[2rem] p-8 shadow-2xl border-4 border-primary/20">
              <QRCodeSVG value={joinUrl} size={300} bgColor="#FFFFFF" fgColor="#0F0F23" />
            </div>
            <div className="flex flex-col gap-4 text-center">
              <span className="text-xl font-bold uppercase tracking-[0.2em] text-muted-foreground">Room Code</span>
              <span className="text-[10rem] font-black leading-none bg-clip-text text-transparent bg-gradient-to-br from-primary via-accent to-secondary animate-pulse" style={{ letterSpacing: '0.1em' }}>
                {code?.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="w-full max-w-5xl">
            <h3 className="text-center text-muted-foreground text-2xl mb-8 font-medium">
              {players.length === 0 ? 'Watching for players…' : `${players.length} Players joined`}
            </h3>
            <div className="flex flex-wrap justify-center gap-6">
              <AnimatePresence>
                {players.map((player, i) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', delay: i * 0.03 }}
                    className="bg-card/50 backdrop-blur-md border-2 border-border/50 rounded-2xl px-8 py-4 flex items-center gap-4 shadow-lg"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                      style={{ backgroundColor: player.avatar_color ?? '#FF6B6B', color: '#1a1a2e' }}
                    >
                      {player.nickname.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-foreground font-bold text-2xl">{player.nickname}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (room.status === 'playing' && slides.length === 0) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-hidden selection:bg-primary/20">
      <main className="flex-1 flex flex-col items-center justify-center p-8 relative">
        <AnimatePresence mode="wait">
          {content && (
            <motion.div
              key={currentSlide!.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-4xl text-center"
            >
              {/* Template icon */}
              <div className="mb-6">
                {content.template === 'information' && <Info className="w-12 h-12 text-primary mx-auto" />}
                {content.template === 'text-card' && <Type className="w-12 h-12 text-primary mx-auto" />}
                {content.template === 'open-text' && <MessageSquare className="w-12 h-12 text-primary mx-auto" />}
                {content.template === 'multiple-choice' && <CheckSquare className="w-12 h-12 text-primary mx-auto" />}
                {content.template === 'slider' && <SlidersHorizontal className="w-12 h-12 text-primary mx-auto" />}
                {content.template === 'rating' && <Star className="w-12 h-12 text-primary mx-auto" />}
                {content.template === 'drawing' && <Pencil className="w-12 h-12 text-primary mx-auto" />}
                {content.template === 'end-game' && <Trophy className="w-16 h-16 text-yellow-400 mx-auto" />}
              </div>

              <h2 className="text-5xl font-extrabold text-foreground mb-6 tracking-tight">{content.title || 'Untitled Slide'}</h2>

              {content.body && (
                <div className="text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto prose prose-lg dark:prose-invert" dir="auto" dangerouslySetInnerHTML={{ __html: content.body }} />
              )}

              {content.mediaUrl && (
                <div className="mb-8 rounded-3xl overflow-hidden inline-block border-2 border-border shadow-2xl h-[50vh] w-full max-w-4xl max-h-[50vh]">
                  <MediaPlayer url={content.mediaUrl} className="w-full h-full" />
                </div>
              )}

              {content.template === 'multiple-choice' && content.options && (
                <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto mt-6">
                  {content.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`rounded-2xl px-6 py-5 text-left flex items-center gap-4 border-2 transition-all ${content.correctOptionIndex === i
                          ? 'bg-accent/20 border-accent text-foreground'
                          : 'bg-muted/50 border-border text-muted-foreground'
                        }`}
                    >
                      <span className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-lg font-bold text-primary shrink-0">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="text-xl font-bold">{opt || `Option ${String.fromCharCode(65 + i)}`}</span>
                    </div>
                  ))}
                </div>
              )}

              {content.template === 'slider' && (
                <div className="max-w-xl mx-auto mt-6 p-8 bg-card/50 rounded-3xl border-2 border-border shadow-inner">
                   <div className="flex justify-between text-muted-foreground font-bold mb-4 uppercase tracking-widest text-xs">
                     <span>Min: {content.sliderMin ?? 0}</span>
                     <span>Max: {content.sliderMax ?? 100}</span>
                   </div>
                   <div className="h-4 bg-muted rounded-full relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-primary/20 w-full" />
                   </div>
                   <p className="mt-4 text-muted-foreground text-sm italic">Connect your phone to move the slider!</p>
                </div>
              )}

              {/* Presented answers (respecting visibility.mode) */}
              {content.template !== 'end-game' && visibility.mode !== 'host-only' && submissions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 32 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-12 max-w-xl mx-auto"
                >
                  <div className="bg-card/50 backdrop-blur-md border-2 border-primary/20 rounded-3xl p-6 shadow-xl">
                    <h4 className="text-lg font-bold text-foreground mb-4 flex items-center justify-center gap-2">
                      <MessageSquare className="w-6 h-6 text-primary" />
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
              {content.template !== 'end-game' && timerActive && timeLimit && timeLimit > 0 && (
                <div className="mt-10">
                  <CountdownTimer remaining={remaining} progress={progress} size="lg" />
                </div>
              )}

              {/* Slide meta */}
              {content.template !== 'end-game' && (
              <div className="mt-8 flex items-center justify-center gap-8 text-muted-foreground text-lg font-medium opacity-60">
                {currentSlide!.points_possible && currentSlide!.points_possible > 0 && (
                  <span className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" /> {currentSlide!.points_possible} pts
                  </span>
                )}
                {content.buzzerEnabled && (
                  <span className="flex items-center gap-2 text-destructive">
                    <Bell className="w-5 h-5" /> {content.buzzerMode === 'all' ? 'All buzz' : '1st buzz'}
                  </span>
                )}
              </div>
              )}

              {/* Scoreboard for End Game */}
              {content.template === 'end-game' && content.showScoreboard && (
                <motion.div
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ delay: 0.2 }}
                   className="mt-12 w-[100vw] sm:w-[80vw] mx-auto overflow-visible px-4"
                >
                  <Scoreboard
                    roomId={room.id}
                    players={players}
                    sortBy={content.scoreboardSortBy}
                    type={content.scoreboardType}
                    limit={content.scoreboardLimit}
                  />
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Room code footer for easy joining */}
      <footer className="h-16 bg-card/20 backdrop-blur-md border-t border-border/50 px-8 flex items-center justify-between opacity-50">
        <span className="text-sm font-bold tracking-widest text-primary uppercase">Party Spark</span>
        <span className="text-xl font-black text-foreground">ROOM CODE: <span className="text-primary">{code?.toUpperCase()}</span></span>
      </footer>
    </div>
  );
}
