import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  ArrowLeft, Plus, Trash2, GripVertical, Save, Clock, Award,
  Info, MessageSquare, CheckSquare, Star, Pencil, Smartphone, Loader2,
  Bell, BellOff, Globe, GlobeLock, Copy, Eye, EyeOff, ListOrdered, UserRound,
  Settings, Palette, Edit3, Check, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import type { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useAutosave } from '@/hooks/use-autosave';
import type { SlideTemplate, SlideContent, AnswerVisibility, PackSettings, PackTheme } from '@/lib/slide-templates';
import { SLIDE_TEMPLATES, getDefaultContent } from '@/lib/slide-templates';

type Slide = Database['public']['Tables']['slides']['Row'];
type ContentPack = Database['public']['Tables']['content_packs']['Row'];

const TEMPLATE_ICONS: Record<SlideTemplate, React.ElementType> = {
  information: Info,
  'open-text': MessageSquare,
  'multiple-choice': CheckSquare,
  rating: Star,
  drawing: Pencil,
};

export default function PackEditor() {
  const { packId } = useParams<{ packId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [pack, setPack] = useState<ContentPack | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPackSettings, setShowPackSettings] = useState(false);
  const [packSettings, setPackSettings] = useState<PackSettings>({});
  const [renamingSlideId, setRenamingSlideId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const selectedSlide = slides.find((s) => s.id === selectedSlideId) || null;
  const slideContent = selectedSlide ? (selectedSlide.content as unknown as SlideContent) : null;

  useEffect(() => {
    if (packId) loadPack();
  }, [packId]);

  async function loadPack() {
    setLoading(true);
    const [packRes, slidesRes] = await Promise.all([
      supabase.from('content_packs').select('*').eq('id', packId!).single(),
      supabase.from('slides').select('*').eq('pack_id', packId!).order('order_index'),
    ]);
    if (packRes.data) {
      setPack(packRes.data);
      const ps = (packRes.data as any).settings as PackSettings | null;
      if (ps) setPackSettings(ps);
    }
    if (slidesRes.data) {
      setSlides(slidesRes.data);
      if (slidesRes.data.length > 0 && !selectedSlideId) {
        setSelectedSlideId(slidesRes.data[0].id);
      }
    }
    setLoading(false);
  }

  // Autosave selected slide
  const saveSlide = useCallback(async (slide: Slide) => {
    await supabase.from('slides').update({
      content: slide.content,
      time_limit: slide.time_limit,
      points_possible: slide.points_possible,
      order_index: slide.order_index,
    }).eq('id', slide.id);
  }, []);

  const { saving } = useAutosave(selectedSlide, async (slide) => {
    if (slide) await saveSlide(slide);
  });

  function updateSlide(id: string, updates: Partial<Slide>) {
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }

  function updateSlideContent(id: string, contentUpdates: Partial<SlideContent>) {
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const current = s.content as unknown as SlideContent;
        return { ...s, content: { ...current, ...contentUpdates } as unknown as Slide['content'] };
      })
    );
  }

  async function addSlide() {
    if (!packId) return;
    const newIndex = slides.length;
    const content = getDefaultContent('information');
    const insertData = {
      pack_id: packId,
      order_index: newIndex,
      content: JSON.parse(JSON.stringify(content)),
      time_limit: 30,
      points_possible: 100,
    };
    const { data } = await supabase
      .from('slides')
      .insert([insertData])
      .select()
      .single();
    if (data) {
      setSlides((prev) => [...prev, data]);
      setSelectedSlideId(data.id);
    }
  }

  async function deleteSlide(id: string) {
    await supabase.from('slides').delete().eq('id', id);
    setSlides((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      if (selectedSlideId === id) {
        setSelectedSlideId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  }

  async function duplicateSlide(id: string) {
    const source = slides.find((s) => s.id === id);
    if (!source || !packId) return;
    const newIndex = slides.length;
    const insertData = {
      pack_id: packId,
      order_index: newIndex,
      content: source.content,
      time_limit: source.time_limit,
      points_possible: source.points_possible,
    };
    const { data } = await supabase.from('slides').insert([insertData]).select().single();
    if (data) {
      setSlides((prev) => [...prev, data]);
      setSelectedSlideId(data.id);
      toast({ title: 'Slide duplicated' });
    }
  }

  async function handleReorder(reordered: Slide[]) {
    const updated = reordered.map((s, i) => ({ ...s, order_index: i }));
    setSlides(updated);
    // Batch update order
    await Promise.all(updated.map((s) => supabase.from('slides').update({ order_index: s.order_index }).eq('id', s.id)));
  }

  async function savePackSettings(ps: PackSettings) {
    if (!pack) return;
    setPackSettings(ps);
    await supabase.from('content_packs').update({ settings: ps as any }).eq('id', pack.id);
  }

  function startRename(slideId: string, currentName: string) {
    setRenamingSlideId(slideId);
    setRenameValue(currentName);
  }

  function confirmRename(slideId: string) {
    updateSlideContent(slideId, { slideName: renameValue.trim() || undefined });
    setRenamingSlideId(null);
  }

  async function togglePublish() {
    if (!pack) return;
    const newVal = !pack.is_published;
    const { error } = await supabase
      .from('content_packs')
      .update({ is_published: newVal })
      .eq('id', pack.id);
    if (!error) {
      setPack({ ...pack, is_published: newVal });
      toast({ title: newVal ? 'Pack published!' : 'Pack unpublished' });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Pack not found</p>
        <Button variant="outline" onClick={() => navigate('/studio')}>Back to Studio</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20 shrink-0">
        <div className="px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate('/studio')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground truncate">{pack.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {saving ? (
              <Badge variant="outline" className="text-muted-foreground border-border gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving…
              </Badge>
            ) : (
              <Badge variant="outline" className="text-accent border-accent/30 gap-1">
                <Save className="w-3 h-3" /> Saved
              </Badge>
            )}
            <Button
              variant={showPackSettings ? 'default' : 'ghost'}
              size="sm"
              onClick={() => { setShowPackSettings(!showPackSettings); setSelectedSlideId(showPackSettings ? (slides[0]?.id ?? null) : null); }}
              className="gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" /> Settings
            </Button>
            <Button
              variant={pack.is_published ? 'outline' : 'hero'}
              size="sm"
              onClick={togglePublish}
              className="gap-1.5"
            >
              {pack.is_published ? <GlobeLock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
              {pack.is_published ? 'Unpublish' : 'Publish'}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Slide Sidebar */}
        <aside className="w-56 border-r border-border bg-card/30 flex flex-col shrink-0">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Slides ({slides.length})</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={addSlide}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <Reorder.Group axis="y" values={slides} onReorder={handleReorder} className="space-y-1">
              {slides.map((slide, i) => {
                const content = slide.content as unknown as SlideContent;
                const Icon = TEMPLATE_ICONS[content?.template || 'information'];
                const isSelected = slide.id === selectedSlideId;
                return (
                  <Reorder.Item key={slide.id} value={slide} className="list-none">
                    <div className="flex items-center group">
                      {renamingSlideId === slide.id ? (
                        <div className="flex-1 flex items-center gap-1 px-1.5 py-1">
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') confirmRename(slide.id); if (e.key === 'Escape') setRenamingSlideId(null); }}
                            className="h-7 text-xs bg-muted border-border"
                            autoFocus
                          />
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => confirmRename(slide.id)}>
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setRenamingSlideId(null)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => { setSelectedSlideId(slide.id); setShowPackSettings(false); }}
                            className={`flex-1 flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm transition-colors ${
                              isSelected && !showPackSettings ? 'bg-primary/15 text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                            }`}
                          >
                            <GripVertical className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-50 cursor-grab" />
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate flex-1">{content?.slideName || content?.title || `Slide ${i + 1}`}</span>
                            <span className="text-xs opacity-50">{i + 1}</span>
                          </button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); startRename(slide.id, content?.slideName || content?.title || `Slide ${i + 1}`); }}
                            title="Rename slide"
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); duplicateSlide(slide.id); }}
                            title="Duplicate slide"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
            {slides.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <p>No slides yet</p>
                <Button variant="ghost" size="sm" className="mt-2" onClick={addSlide}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Slide
                </Button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Editor */}
        <main className="flex-1 overflow-y-auto">
          {selectedSlide && slideContent ? (
            <div className="flex h-full">
              {/* Editor Form */}
              <div className="flex-1 p-6 max-w-2xl space-y-6">
                {/* Template Selector */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Player Input Type</label>
                  <Select
                    value={slideContent.template}
                    onValueChange={(v) => {
                      const newContent = getDefaultContent(v as SlideTemplate);
                      newContent.title = slideContent.title;
                      updateSlide(selectedSlide.id, { content: newContent as unknown as Slide['content'] });
                    }}
                  >
                    <SelectTrigger className="bg-muted border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {SLIDE_TEMPLATES.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="flex items-center gap-2">
                            {t.label}
                            <span className="text-xs text-muted-foreground">— {t.description}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Slide Title</label>
                  <Input
                    value={slideContent.title}
                    onChange={(e) => updateSlideContent(selectedSlide.id, { title: e.target.value })}
                    placeholder="Enter slide title…"
                    className="bg-muted border-border text-lg"
                  />
                </div>

                {/* Body / Prompt (for information & open-text) */}
                {(slideContent.template === 'information' || slideContent.template === 'open-text' || slideContent.template === 'rating' || slideContent.template === 'drawing') && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      {slideContent.template === 'information' ? 'Body Text' : 'Prompt'}
                    </label>
                    <RichTextEditor
                      content={slideContent.body || ''}
                      onChange={(html) => updateSlideContent(selectedSlide.id, { body: html })}
                      placeholder={slideContent.template === 'information' ? 'Describe what players should know…' : 'What should players answer/draw?'}
                    />
                  </div>
                )}

                {/* Multiple Choice Options */}
                {slideContent.template === 'multiple-choice' && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Answer Options</label>
                    <div className="space-y-2">
                      {(slideContent.options || ['', '', '', '']).map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                            slideContent.correctOptionIndex === idx
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...(slideContent.options || ['', '', '', ''])];
                              newOpts[idx] = e.target.value;
                              updateSlideContent(selectedSlide.id, { options: newOpts });
                            }}
                            placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                            className="bg-muted border-border"
                          />
                          <Button
                            variant={slideContent.correctOptionIndex === idx ? 'default' : 'ghost'}
                            size="sm"
                            className="shrink-0 text-xs"
                            onClick={() => updateSlideContent(selectedSlide.id, { correctOptionIndex: idx })}
                          >
                            ✓
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Media URL */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Media URL (optional)</label>
                  <Input
                    value={slideContent.mediaUrl || ''}
                    onChange={(e) => updateSlideContent(selectedSlide.id, { mediaUrl: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    className="bg-muted border-border"
                  />
                </div>

                {/* Time & Points */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Time Limit
                      </label>
                      <Switch
                        checked={selectedSlide.time_limit !== null && selectedSlide.time_limit > 0}
                        onCheckedChange={(v) => updateSlide(selectedSlide.id, { time_limit: v ? 30 : null })}
                      />
                    </div>
                    {selectedSlide.time_limit !== null && selectedSlide.time_limit > 0 && (
                      <div className="flex items-center gap-3">
                        <Slider
                          value={[selectedSlide.time_limit]}
                          onValueChange={([v]) => updateSlide(selectedSlide.id, { time_limit: v })}
                          min={5}
                          max={120}
                          step={5}
                          className="flex-1"
                        />
                        <span className="text-sm font-mono text-muted-foreground w-10 text-right">{selectedSlide.time_limit}s</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-muted-foreground" /> Points
                      </label>
                      <Switch
                        checked={selectedSlide.points_possible !== null && selectedSlide.points_possible > 0}
                        onCheckedChange={(v) => updateSlide(selectedSlide.id, { points_possible: v ? 100 : null })}
                      />
                    </div>
                    {selectedSlide.points_possible !== null && selectedSlide.points_possible > 0 && (
                      <div className="flex items-center gap-3">
                        <Slider
                          value={[selectedSlide.points_possible]}
                          onValueChange={([v]) => updateSlide(selectedSlide.id, { points_possible: v })}
                          min={0}
                          max={500}
                          step={50}
                          className="flex-1"
                        />
                        <span className="text-sm font-mono text-muted-foreground w-10 text-right">{selectedSlide.points_possible}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Buzzer Settings */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-muted-foreground" /> Buzzer
                    </label>
                    <Switch
                      checked={slideContent.buzzerEnabled ?? false}
                      onCheckedChange={(v) => updateSlideContent(selectedSlide.id, { buzzerEnabled: v })}
                    />
                  </div>
                  {slideContent.buzzerEnabled && (
                    <div>
                      <label className="text-sm text-muted-foreground mb-1.5 block">Buzzer Mode</label>
                      <Select
                        value={slideContent.buzzerMode || 'first'}
                        onValueChange={(v) => updateSlideContent(selectedSlide.id, { buzzerMode: v as 'first' | 'all' })}
                      >
                        <SelectTrigger className="bg-muted border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="first">First Buzz Wins</SelectItem>
                          <SelectItem value="all">Everyone Can Buzz</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(slideContent.buzzerMode || 'first') === 'first'
                          ? 'Only the first player to buzz gets to answer'
                          : 'All players can buzz — host sees order'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Delete & Duplicate */}
                <div className="pt-4 border-t border-border flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => duplicateSlide(selectedSlide.id)}>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Duplicate
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteSlide(selectedSlide.id)}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Slide
                  </Button>
                </div>
              </div>

              {/* Mobile Preview */}
              <div className="w-72 border-l border-border bg-card/20 p-6 flex flex-col items-center shrink-0">
                <div className="flex items-center gap-1.5 mb-4 text-muted-foreground">
                  <Smartphone className="w-4 h-4" />
                  <span className="text-xs font-medium">Player Preview</span>
                </div>
                <MobilePreview slide={selectedSlide} content={slideContent} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <p className="mb-4">Select a slide or create one to start editing</p>
                <Button variant="outline" onClick={addSlide}>
                  <Plus className="w-4 h-4 mr-2" /> Add First Slide
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const VISIBILITY_OPTIONS: { mode: AnswerVisibility['mode']; label: string; icon: React.ElementType; description: string }[] = [
  { mode: 'host-only', label: 'Host Only', icon: EyeOff, description: 'Only host sees answers' },
  { mode: 'fastest', label: 'Fastest Responses', icon: ListOrdered, description: 'Show top N fastest answers' },
  { mode: 'all-anonymous', label: 'All (Anonymous)', icon: Eye, description: 'Show all answers without names' },
  { mode: 'all-named', label: 'All (With Names)', icon: UserRound, description: 'Show all answers with player names' },
];

function AnswerVisibilityPicker({
  value,
  onChange,
}: {
  value: AnswerVisibility;
  onChange: (v: AnswerVisibility) => void;
}) {
  const [fastestCount, setFastestCount] = useState(value.mode === 'fastest' ? value.count : 3);
  const current = VISIBILITY_OPTIONS.find((o) => o.mode === value.mode) || VISIBILITY_OPTIONS[0];

  return (
    <div className="space-y-2">
      <Select
        value={value.mode}
        onValueChange={(m) => {
          const mode = m as AnswerVisibility['mode'];
          if (mode === 'fastest') {
            onChange({ mode: 'fastest', count: fastestCount });
          } else {
            onChange({ mode } as AnswerVisibility);
          }
        }}
      >
        <SelectTrigger className="bg-muted border-border">
          <SelectValue>{current.label}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          {VISIBILITY_OPTIONS.map((opt) => (
            <SelectItem key={opt.mode} value={opt.mode}>
              <span className="flex items-center gap-2">
                {opt.label}
                <span className="text-xs text-muted-foreground">— {opt.description}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value.mode === 'fastest' && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Show top</label>
          <Input
            type="number"
            min={1}
            max={50}
            value={fastestCount}
            onChange={(e) => {
              const n = Math.max(1, parseInt(e.target.value) || 1);
              setFastestCount(n);
              onChange({ mode: 'fastest', count: n });
            }}
            className="bg-muted border-border w-20 h-8 text-sm"
          />
          <label className="text-xs text-muted-foreground">answers</label>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{current.description}</p>
    </div>
  );
}

function MobilePreview({ slide, content }: { slide: Slide; content: SlideContent }) {
  return (
    <div className="w-48 h-80 bg-background rounded-3xl border-2 border-border overflow-hidden flex flex-col shadow-lg">
      {/* Status bar */}
      <div className="h-6 bg-card flex items-center justify-center">
        <div className="w-12 h-1.5 rounded-full bg-muted" />
      </div>

      {/* Content */}
      <div className="flex-1 p-3 flex flex-col">
        {content.title && (
          <p className="text-[10px] font-bold text-foreground mb-2 text-center leading-tight">{content.title}</p>
        )}

        <div className="flex-1 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={content.template}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full"
            >
              {content.template === 'information' && (
                <div className="text-center space-y-2">
                  <Info className="w-8 h-8 text-primary mx-auto" />
                  <p className="text-[8px] text-muted-foreground">Get Ready!</p>
                  {content.body && <p className="text-[7px] text-muted-foreground/70 line-clamp-3">{content.body}</p>}
                </div>
              )}

              {content.template === 'open-text' && (
                <div className="space-y-2">
                  {content.body && <p className="text-[8px] text-muted-foreground text-center line-clamp-2">{content.body}</p>}
                  <div className="bg-muted rounded-lg p-2">
                    <div className="h-8 border border-border rounded bg-background" />
                  </div>
                  <div className="bg-primary rounded-lg py-1.5 text-center">
                    <span className="text-[8px] font-bold text-primary-foreground">Submit</span>
                  </div>
                </div>
              )}

              {content.template === 'multiple-choice' && (
                <div className="space-y-1.5">
                  {(content.options || ['A', 'B', 'C', 'D']).map((opt, i) => (
                    <div key={i} className="bg-muted rounded-lg py-1.5 px-2 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded bg-primary/20 text-[7px] font-bold text-primary flex items-center justify-center shrink-0">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="text-[7px] text-foreground truncate">{opt || `Option ${String.fromCharCode(65 + i)}`}</span>
                    </div>
                  ))}
                </div>
              )}

              {content.template === 'rating' && (
                <div className="space-y-2 text-center">
                  {content.body && <p className="text-[8px] text-muted-foreground line-clamp-2">{content.body}</p>}
                  <div className="flex justify-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className="w-4 h-4 text-neon-yellow" fill={n <= 3 ? 'currentColor' : 'none'} />
                    ))}
                  </div>
                </div>
              )}

              {content.template === 'drawing' && (
                <div className="space-y-2 text-center">
                  {content.body && <p className="text-[8px] text-muted-foreground line-clamp-2">{content.body}</p>}
                  <div className="bg-muted rounded-lg aspect-square w-full border border-dashed border-border flex items-center justify-center">
                    <Pencil className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Buzzer button in preview */}
      {content.buzzerEnabled && (
        <div className="px-2 pb-1">
          <div className="bg-destructive rounded-lg py-1.5 text-center flex items-center justify-center gap-1">
            <Bell className="w-2.5 h-2.5 text-destructive-foreground" />
            <span className="text-[8px] font-bold text-destructive-foreground">BUZZ!</span>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="h-5 bg-card flex items-center justify-center gap-3">
        {slide.time_limit != null && slide.time_limit > 0 && (
          <div className="flex items-center gap-0.5 text-muted-foreground">
            <Clock className="w-2.5 h-2.5" />
            <span className="text-[7px]">{slide.time_limit}s</span>
          </div>
        )}
        {slide.points_possible != null && slide.points_possible > 0 && (
          <div className="flex items-center gap-0.5 text-muted-foreground">
            <Award className="w-2.5 h-2.5" />
            <span className="text-[7px]">{slide.points_possible}pt</span>
          </div>
        )}
        {content.buzzerEnabled && (
          <div className="flex items-center gap-0.5 text-destructive">
            <Bell className="w-2.5 h-2.5" />
            <span className="text-[7px]">{content.buzzerMode === 'all' ? 'all' : '1st'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
