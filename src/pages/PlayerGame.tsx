import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useRoom, usePlayers } from '@/hooks/use-realtime';
import { useBuzzes } from '@/hooks/use-buzzer';
import { useCountdown } from '@/hooks/use-countdown';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Bell, Send, Star, Pencil, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { CountdownTimer } from '@/components/CountdownTimer';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { SlideContent } from '@/lib/slide-templates';

type Slide = Database['public']['Tables']['slides']['Row'];

interface PlayerGameProps {
  playerId: string;
  playerName: string;
}

const PlayerGame = ({ playerId, playerName }: PlayerGameProps) => {
  const { code } = useParams<{ code: string }>();
  const { room } = useRoom(code ?? null);
  const slideIndex = room?.current_slide_index ?? 0;
  const { buzzes, sendBuzz } = useBuzzes(room?.id ?? null, slideIndex);

  const [slides, setSlides] = useState<Slide[]>([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [ratingValue, setRatingValue] = useState([5]);
  const [submitted, setSubmitted] = useState(false);
  const [buzzed, setBuzzed] = useState(false);

  // Load slides
  useEffect(() => {
    if (!room?.current_pack_id) return;
    supabase
      .from('slides')
      .select('*')
      .eq('pack_id', room.current_pack_id)
      .order('order_index')
      .then(({ data }) => { if (data) setSlides(data); });
  }, [room?.current_pack_id]);

  // Reset state on slide change
  useEffect(() => {
    setTextAnswer('');
    setRatingValue([5]);
    setSubmitted(false);
    setBuzzed(false);
  }, [slideIndex]);

  // Check if already buzzed this slide
  useEffect(() => {
    if (buzzes.some((b) => b.player_id === playerId)) setBuzzed(true);
  }, [buzzes, playerId]);

  const currentSlide = slides[slideIndex] ?? null;
  const content = currentSlide ? (currentSlide.content as unknown as SlideContent) : null;
  const hasPoints = currentSlide?.points_possible != null && currentSlide.points_possible > 0;

  // Countdown
  const timeLimit = currentSlide?.time_limit;
  const { remaining, progress } = useCountdown({
    duration: timeLimit && timeLimit > 0 ? timeLimit : null,
    active: !submitted && !!content && content.template !== 'information',
  });

  const handleSubmit = async (answerData: Record<string, unknown>) => {
    if (!room || !currentSlide) return;
    await supabase.from('submissions').insert({
      room_id: room.id,
      player_id: playerId,
      slide_id: currentSlide.id,
      answer_data: answerData as Database['public']['Tables']['submissions']['Insert']['answer_data'],
    });
    setSubmitted(true);
  };

  const handleBuzz = async () => {
    if (!buzzed) {
      await sendBuzz(playerId);
      setBuzzed(true);
    }
  };

  if (room?.status === 'ended') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          <span className="text-6xl mb-4 block">🎉</span>
          <h2 className="text-3xl font-bold text-foreground mb-2">Game Over!</h2>
          <p className="text-muted-foreground">Thanks for playing, {playerName}!</p>
        </motion.div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <Gamepad2 className="w-10 h-10 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background p-4">
      {/* Slide indicator + timer */}
      <div className="flex items-center justify-between mb-4 px-2">
        <span className="text-xs text-muted-foreground">
          Slide {slideIndex + 1} / {slides.length}
        </span>
        {timeLimit && timeLimit > 0 && !submitted && content?.template !== 'information' && (
          <CountdownTimer remaining={remaining} progress={progress} size="sm" />
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={slideIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm"
          >
            {submitted ? (
              <div className="text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                  <Send className="w-12 h-12 text-accent mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-foreground">Answer Submitted!</h3>
                  <p className="text-muted-foreground text-sm mt-1">Waiting for the next slide…</p>
                </motion.div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Title */}
                <h3 className="text-xl font-bold text-foreground text-center">{content.title || 'Get Ready!'}</h3>

                {/* Information template */}
                {content.template === 'information' && (
                  <div className="text-center space-y-3">
                    <Info className="w-12 h-12 text-primary mx-auto" />
                    {content.body && <div className="text-muted-foreground prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: content.body }} />}
                    <p className="text-sm text-muted-foreground">Look at the host screen!</p>
                  </div>
                )}

                {/* Open text */}
                {content.template === 'open-text' && (
                  <div className="space-y-3">
                    {content.body && <div className="text-muted-foreground text-center text-sm prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: content.body }} />}
                    <Input
                      placeholder="Type your answer…"
                      value={textAnswer}
                      onChange={(e) => setTextAnswer(e.target.value)}
                      className="bg-muted border-border rounded-xl h-12 text-lg"
                    />
                    <Button
                      variant="hero"
                      size="lg"
                      className="w-full rounded-xl"
                      disabled={!textAnswer.trim()}
                      onClick={() => handleSubmit({ text: textAnswer.trim() })}
                    >
                      <Send className="w-4 h-4 mr-2" /> Submit
                    </Button>
                  </div>
                )}

                {/* Multiple choice */}
                {content.template === 'multiple-choice' && (
                  <div className="space-y-2">
                    {(content.options || []).map((opt, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        className="w-full rounded-xl py-4 text-left justify-start gap-3 h-auto"
                        onClick={() => handleSubmit({ selectedIndex: i, selectedOption: opt })}
                      >
                        <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="text-foreground font-medium">{opt || `Option ${String.fromCharCode(65 + i)}`}</span>
                      </Button>
                    ))}
                  </div>
                )}

                {/* Rating */}
                {content.template === 'rating' && (
                  <div className="space-y-4">
                    {content.body && <div className="text-muted-foreground text-center text-sm prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: content.body }} />}
                    <div className="flex justify-center gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <Star
                          key={n}
                          className={`w-7 h-7 cursor-pointer transition-colors ${
                            n <= ratingValue[0] ? 'text-accent fill-accent' : 'text-muted-foreground'
                          }`}
                          onClick={() => setRatingValue([n])}
                        />
                      ))}
                    </div>
                    <p className="text-center text-2xl font-bold text-foreground">{ratingValue[0]}/10</p>
                    <Slider value={ratingValue} onValueChange={setRatingValue} min={1} max={10} step={1} />
                    <Button
                      variant="hero"
                      size="lg"
                      className="w-full rounded-xl"
                      onClick={() => handleSubmit({ rating: ratingValue[0] })}
                    >
                      <Send className="w-4 h-4 mr-2" /> Submit
                    </Button>
                  </div>
                )}

                {/* Drawing */}
                {content.template === 'drawing' && (
                  <div className="space-y-3 text-center">
                    {content.body && <div className="text-muted-foreground text-sm prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: content.body }} />}
                    <div className="bg-muted rounded-2xl aspect-square w-full border border-dashed border-border flex items-center justify-center">
                      <Pencil className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                    <p className="text-xs text-muted-foreground">Drawing canvas coming soon</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Buzzer */}
      {content.buzzerEnabled && !submitted && (
        <div className="flex justify-center pb-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleBuzz}
            disabled={buzzed}
            className={`w-24 h-24 rounded-full flex flex-col items-center justify-center gap-1 shadow-lg transition-colors ${
              buzzed
                ? 'bg-muted text-muted-foreground cursor-default'
                : 'bg-destructive text-destructive-foreground active:bg-destructive/80'
            }`}
          >
            <Bell className="w-8 h-8" />
            <span className="text-xs font-bold">{buzzed ? 'Buzzed!' : 'BUZZ!'}</span>
          </motion.button>
        </div>
      )}
    </div>
  );
};

export default PlayerGame;
