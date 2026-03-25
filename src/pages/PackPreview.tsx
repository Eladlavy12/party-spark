import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Info, MessageSquare, CheckSquare, 
  Star, Pencil, Trophy, Type, SlidersHorizontal, Bell, Users, Monitor, 
  LayoutDashboard, Play, RefreshCw, UserCircle2, Settings, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CountdownTimer } from '@/components/CountdownTimer';
import { useCountdown } from '@/hooks/use-countdown';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { SlideContent, AnswerVisibility } from '@/lib/slide-templates';
import { MediaPlayer } from '@/components/MediaPlayer';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

type Slide = Database['public']['Tables']['slides']['Row'];
type ContentPack = Database['public']['Tables']['content_packs']['Row'];

interface FakePlayer {
  id: string;
  nickname: string;
  avatar_color: string;
}

interface FakeSubmission {
  id: string;
  player_id: string;
  answer_data: any;
  created_at: string;
}

export default function PackPreview() {
  const { packId } = useParams<{ packId: string }>();
  const navigate = useNavigate();
  const [pack, setPack] = useState<ContentPack | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Simulation State
  const [viewMode, setViewMode] = useState<'projector' | 'host'>('projector');
  const [playerCount, setPlayerCount] = useState(8);
  const [fakePlayers, setFakePlayers] = useState<FakePlayer[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<Record<string, FakeSubmission[]>>({});
  const [showSimPanel, setShowSimPanel] = useState(true);

  useEffect(() => {
    if (packId) loadContent();
    generateFakePlayers(playerCount);
  }, [packId]);

  function generateFakePlayers(count: number) {
    const nicknames = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Casey', 'Riley', 'Jamie', 'Morgan', 'Peyton', 'Skyler', 'Quinn', 'Sage', 'Rowan', 'Charlie', 'Avery', 'Parker', 'Emerson', 'Finley', 'River', 'Dakota'];
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB', '#E67E22', '#2ECC71'];
    
    const players: FakePlayer[] = Array.from({ length: count }).map((_, i) => ({
      id: `fake-player-${i}`,
      nickname: nicknames[i % nicknames.length] + (i >= nicknames.length ? ` ${Math.floor(i / nicknames.length) + 1}` : ''),
      avatar_color: colors[i % colors.length]
    }));
    setFakePlayers(players);
  }

  const currentSlide = slides[currentIndex] ?? null;
  const content = currentSlide ? (currentSlide.content as unknown as SlideContent) : null;
  const timeLimit = currentSlide?.time_limit;

  const submissions = allSubmissions[currentSlide?.id || ''] || [];

  async function loadContent() {
    setLoading(true);
    const [packRes, slidesRes] = await Promise.all([
      supabase.from('content_packs').select('*').eq('id', packId!).single(),
      supabase.from('slides').select('*').eq('pack_id', packId!).order('order_index'),
    ]);
    if (packRes.data) setPack(packRes.data);
    if (slidesRes.data) setSlides(slidesRes.data);
    setLoading(false);
  }

  function handleSimulateAnswers() {
    if (!currentSlide || !content) return;
    
    const newSubmissions: FakeSubmission[] = fakePlayers.map((player, i) => {
      let answer_data: any = {};
      
      switch (content.template) {
        case 'open-text':
          const responses = ['Awesome!', 'I love it', 'Not sure...', 'Maybe next time', 'Totally!', 'Wow!'];
          answer_data = { text: responses[Math.floor(Math.random() * responses.length)] };
          break;
        case 'multiple-choice':
          answer_data = { selectedIndex: Math.floor(Math.random() * (content.options?.length || 4)) };
          break;
        case 'rating':
          answer_data = { rating: Math.floor(Math.random() * 10) + 1 };
          break;
        case 'slider':
          const min = content.sliderMin ?? 0;
          const max = content.sliderMax ?? 100;
          answer_data = { sliderValue: Math.floor(Math.random() * (max - min + 1)) + min };
          break;
        case 'drawing':
          answer_data = { status: 'completed' };
          break;
        default:
          answer_data = { status: 'done' };
      }

      // Random delay up to 10 seconds for variety
      const randomDelay = Math.random() * 10000;
      return {
        id: `sub-${currentSlide.id}-${player.id}`,
        player_id: player.id,
        answer_data,
        created_at: new Date(Date.now() + randomDelay).toISOString()
      };
    });

    setAllSubmissions(prev => ({
      ...prev,
      [currentSlide.id]: newSubmissions
    }));
  }

  const sortedSubmissions = [...submissions].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const { remaining, progress } = useCountdown({
    duration: timeLimit && timeLimit > 0 ? timeLimit : null,
    active: !!content && content.template !== 'information' && content.template !== 'end-game',
    resetKey: currentSlide?.id ?? '',
  });

  // Auto-advance slide when timer reaches zero
  useEffect(() => {
    if (remaining === 0 && timeLimit && timeLimit > 0) {
      nextSlide();
    }
  }, [remaining, timeLimit]);

  const nextSlide = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevSlide = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!pack || slides.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">No content to preview</h2>
        <Button onClick={() => navigate('/studio')}>Back to Studio</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 z-10 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-foreground leading-tight">{pack.title}</h1>
            <p className="text-xs text-muted-foreground">Preview Mode • {currentIndex + 1} of {slides.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex bg-muted rounded-lg p-1 mr-4">
              <Button 
                variant={viewMode === 'projector' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-7 px-3 text-xs gap-1.5"
                onClick={() => setViewMode('projector')}
              >
                <Monitor className="w-3.5 h-3.5" /> Projector
              </Button>
              <Button 
                variant={viewMode === 'host' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-7 px-3 text-xs gap-1.5"
                onClick={() => setViewMode('host')}
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> Host Room
              </Button>
            </div>
            <Button 
              variant={showSimPanel ? 'secondary' : 'outline'} 
              size="sm" 
              className="h-8 gap-1.5"
              onClick={() => setShowSimPanel(!showSimPanel)}
            >
              <Users className="w-4 h-4" /> Lab
            </Button>
            <Button 
                variant="hero" 
                size="sm" 
                className="h-8 gap-1.5 px-4"
                onClick={nextSlide}
                disabled={currentIndex === slides.length - 1}
            >
                Next <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/studio/${pack.id}`)}>Edit Pack</Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Preview Area */}
        <main className={`flex-1 relative flex flex-col items-center justify-center p-8 bg-black/5 dark:bg-white/5 overflow-y-auto transition-all ${viewMode === 'host' ? 'bg-card/30' : ''}`}>
          
          {/* Host Mode Submissions View */}
          {viewMode === 'host' && (
             <div className="w-full max-w-5xl mb-8 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1 space-y-4">
                   <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Users className="w-3 h-3" /> Players ({fakePlayers.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                         {fakePlayers.map(p => (
                            <div key={p.id} className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm" style={{ backgroundColor: p.avatar_color, color: '#1a1a2e' }}>
                               {p.nickname.charAt(0)}
                            </div>
                         ))}
                      </div>
                   </div>
                   <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-2">
                        <Play className="w-3 h-3" /> Status
                      </h4>
                      <p className="text-sm font-medium">Slide {currentIndex + 1} of {slides.length}</p>
                   </div>
                </div>

                <div className="md:col-span-3 space-y-6">
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm min-h-[400px]">
                       <div className="flex items-center justify-between mb-6">
                          <h3 className="font-bold flex items-center gap-2">
                             <MessageSquare className="w-4 h-4 text-primary" /> Submissions ({submissions.length})
                          </h3>
                          <Badge variant="outline">{submissions.length} / {fakePlayers.length} responded</Badge>
                       </div>
                       
                       {submissions.length === 0 ? (
                         <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <RefreshCw className="w-10 h-10 mb-2 opacity-20 animate-spin-slow" />
                            <p className="text-sm">Wait for players to submit or use 'Simulate'</p>
                         </div>
                       ) : (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {sortedSubmissions.map((sub, idx) => {
                               const player = fakePlayers.find(p => p.id === sub.player_id);
                               const isFirst = idx === 0;
                               const timeDiff = (new Date(sub.created_at).getTime() - new Date(sortedSubmissions[0].created_at).getTime()) / 1000;
                               
                               return (
                                 <div key={sub.id} className={`flex items-start gap-3 bg-muted/40 rounded-xl p-3 border ${isFirst && content.buzzerEnabled ? 'border-primary/50 bg-primary/5' : 'border-border/50'}`}>
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm relative" style={{ backgroundColor: player?.avatar_color, color: '#1a1a2e' }}>
                                       {player?.nickname.charAt(0)}
                                       {isFirst && content.buzzerEnabled && (
                                         <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                                            <Trophy className="w-2 h-2" />
                                         </div>
                                       )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <div className="flex items-center justify-between mb-1">
                                          <p className="text-[10px] font-bold text-muted-foreground leading-none uppercase tracking-wider">{player?.nickname}</p>
                                          {content.buzzerEnabled && (
                                             <Badge variant={isFirst ? "default" : "outline"} className="text-[9px] py-0 h-4 px-1.5 font-mono">
                                                {isFirst ? 'FASTEST' : `+${timeDiff.toFixed(2)}s`}
                                             </Badge>
                                          )}
                                       </div>
                                       <p className="text-sm text-foreground">
                                          {sub.answer_data.text && sub.answer_data.text}
                                          {sub.answer_data.selectedIndex !== undefined && `Option ${String.fromCharCode(65 + sub.answer_data.selectedIndex)}`}
                                          {sub.answer_data.rating !== undefined && `${sub.answer_data.rating}/10 Stars`}
                                          {sub.answer_data.sliderValue !== undefined && `Value: ${sub.answer_data.sliderValue}`}
                                          {sub.answer_data.status && sub.answer_data.status}
                                       </p>
                                    </div>
                                 </div>
                               );
                            })}
                         </div>
                       )}
                    </div>
                </div>
             </div>
          )}

          <AnimatePresence mode="wait">
            {content && (
              <motion.div
                key={currentSlide!.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.3 }}
                className={`${viewMode === 'host' ? 'w-full max-w-5xl opacity-40 scale-90 pointer-events-none' : 'w-full max-w-4xl text-center'} flex flex-col items-center justify-center p-8 bg-card rounded-[2.5rem] border-2 border-primary/10 shadow-2xl relative overflow-hidden`}
              >
              <div className="absolute top-0 inset-x-0 h-2 bg-primary/20" />
              
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

              <h2 className="text-4xl font-extrabold text-foreground mb-6 tracking-tight leading-tight">{content.title || 'Untitled Slide'}</h2>

              {content.body && (
                <div 
                  className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto prose prose-invert" 
                  dir="auto"
                  dangerouslySetInnerHTML={{ __html: content.body }} 
                />
              )}

              {content.mediaUrl && (
                <div className="mb-8 rounded-2xl overflow-hidden border border-border bg-black/20 w-full max-w-2xl aspect-video relative">
                  <MediaPlayer url={content.mediaUrl} className="w-full h-full" />
                </div>
              )}

              {content.template === 'multiple-choice' && content.options && (
                <div className="grid grid-cols-2 gap-4 max-w-2xl w-full mt-4">
                  {content.options.map((opt, i) => (
                    <div
                      key={i}
                      className="rounded-xl px-5 py-4 text-left flex items-center gap-3 border bg-muted/30 border-border"
                    >
                      <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0 font-mono">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="text-lg font-bold">{opt || `Option ${String.fromCharCode(65 + i)}`}</span>
                    </div>
                  ))}
                </div>
              )}

              {content.template === 'slider' && (
                <div className="max-w-xl w-full mt-6 p-8 bg-muted/20 rounded-3xl border border-border shadow-inner">
                   <div className="flex justify-between text-muted-foreground font-bold mb-4 uppercase tracking-widest text-[10px]">
                     <span>Min: {content.sliderMin ?? 0}</span>
                     <span>Max: {content.sliderMax ?? 100}</span>
                   </div>
                   <div className="h-3 bg-muted rounded-full relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-primary/20 w-1/2" />
                   </div>
                </div>
              )}

              {/* Countdown Timer */}
              {content.template !== 'end-game' && content.template !== 'information' && timeLimit && timeLimit > 0 && (
                <div className="mt-8">
                  <CountdownTimer remaining={remaining} progress={progress} size="lg" />
                </div>
              )}

              {/* Slide meta (Points, Buzzer) */}
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Overlays */}
        <div className="absolute inset-y-0 left-0 w-24 flex items-center justify-center">
            <Button
                variant="ghost"
                size="icon"
                className="w-16 h-16 rounded-full bg-card/40 backdrop-blur-md opacity-40 hover:opacity-100 transition-opacity disabled:opacity-0"
                onClick={prevSlide}
                disabled={currentIndex === 0}
            >
                <ChevronLeft className="w-10 h-10" />
            </Button>
        </div>

        <div className="absolute inset-y-0 right-0 w-24 flex items-center justify-center">
            <Button
                variant="ghost"
                size="icon"
                className="w-16 h-16 rounded-full bg-card/40 backdrop-blur-md opacity-40 hover:opacity-100 transition-opacity disabled:opacity-0"
                onClick={nextSlide}
                disabled={currentIndex === slides.length - 1}
            >
                <ChevronRight className="w-10 h-10" />
            </Button>
        </div>
      </main>

      {/* Simulation Sidebar */}
      <AnimatePresence>
        {showSimPanel && (
          <motion.aside
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            exit={{ x: 300 }}
            className="w-72 border-l border-border bg-card shrink-0 flex flex-col z-20"
          >
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
               <h3 className="font-bold text-sm flex items-center gap-2 uppercase tracking-tighter">
                  <Settings className="w-4 h-4 text-primary" /> Simulation Lab
               </h3>
               <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowSimPanel(false)}>
                  <ChevronRight className="w-4 h-4" />
               </Button>
            </div>
            
            <div className="p-6 space-y-8 flex-1 overflow-y-auto">
               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <label className="text-xs font-bold text-muted-foreground uppercase">Player Count</label>
                     <Badge variant="secondary">{playerCount}</Badge>
                  </div>
                  <Slider 
                    value={[playerCount]} 
                    min={1} 
                    max={20} 
                    step={1} 
                    onValueChange={([v]) => {
                      setPlayerCount(v);
                      generateFakePlayers(v);
                    }} 
                  />
                  <p className="text-[10px] text-muted-foreground">Adjust how many fake users are in the lobby.</p>
               </div>

               <div className="space-y-4">
                  <label className="text-xs font-bold text-muted-foreground uppercase block">Actions</label>
                  <Button 
                    className="w-full justify-start gap-2 h-11 rounded-xl shadow-lg shadow-primary/10" 
                    variant="hero"
                    onClick={handleSimulateAnswers}
                    disabled={content?.template === 'information' || content?.template === 'end-game'}
                  >
                     <RefreshCw className="w-4 h-4" /> Generate Participation
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 rounded-xl"
                    onClick={() => setAllSubmissions({})}
                  >
                     <Trash2 className="w-4 h-4" /> Clear All Submissions
                  </Button>
               </div>

               <div className="pt-6 border-t border-border">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-4">Lobby Preview</h4>
                  <div className="grid grid-cols-4 gap-2">
                     {fakePlayers.map(p => (
                        <div key={p.id} className="aspect-square rounded-lg flex items-center justify-center animate-in fade-in zoom-in duration-300" style={{ backgroundColor: p.avatar_color }}>
                           <UserCircle2 className="w-6 h-6 text-white/40" />
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            <div className="p-4 bg-muted/50 border-t border-border text-[10px] text-muted-foreground text-center">
               Preview Simulator v1.0 • Local Only
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>

      {/* Progress Footer */}
      <footer className="h-4 bg-muted/20 shrink-0">
          <div 
            className="h-full bg-primary transition-all duration-300" 
            style={{ width: `${((currentIndex + 1) / slides.length) * 100}%` }}
          />
      </footer>
    </div>
  );
}
