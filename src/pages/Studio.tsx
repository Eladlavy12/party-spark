import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit3, Trash2, Copy, PackageOpen, ArrowLeft, Gamepad2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

type ContentPack = Database['public']['Tables']['content_packs']['Row'];
type GameType = Database['public']['Enums']['game_type'];

const GAME_TYPE_LABELS: Record<GameType, string> = {
  trivia: '🧠 Trivia',
  'open-ended': '💬 Open-Ended',
  drawing: '🎨 Drawing',
  'truth-or-dare': '🔥 Truth or Dare',
  improvisation: '🎭 Improvisation',
  'super-heroes': '🦸 Super Heroes',
};

const GAME_TYPE_COLORS: Record<GameType, string> = {
  trivia: 'bg-neon-blue/20 text-neon-blue',
  'open-ended': 'bg-neon-green/20 text-neon-green',
  drawing: 'bg-neon-yellow/20 text-neon-yellow',
  'truth-or-dare': 'bg-neon-pink/20 text-neon-pink',
  improvisation: 'bg-neon-orange/20 text-neon-orange',
  'super-heroes': 'bg-neon-blue/20 text-neon-blue',
};

export default function Studio() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [packs, setPacks] = useState<ContentPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<GameType>('trivia');

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<ContentPack | null>(null);

  useEffect(() => {
    initAuth();
  }, []);

  async function initAuth() {
    let { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const { data } = await supabase.auth.signInAnonymously();
      session = data.session;
    }
    if (session?.user) {
      setUserId(session.user.id);
      fetchPacks(session.user.id);
    }
  }

  async function fetchPacks(uid: string) {
    setLoading(true);
    const { data } = await supabase
      .from('content_packs')
      .select('*')
      .eq('creator_id', uid)
      .order('updated_at', { ascending: false });
    setPacks(data || []);
    setLoading(false);
  }

  async function handleCreate() {
    if (!userId || !newTitle.trim()) return;
    const { data, error } = await supabase
      .from('content_packs')
      .insert({ title: newTitle.trim(), description: newDesc.trim() || null, game_type: newType, creator_id: userId })
      .select()
      .single();
    if (data && !error) {
      setPacks((prev) => [data, ...prev]);
      setCreateOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewType('trivia');
      toast({ title: 'Pack created!' });
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await supabase.from('slides').delete().eq('pack_id', deleteTarget.id);
    await supabase.from('content_packs').delete().eq('id', deleteTarget.id);
    setPacks((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast({ title: 'Pack deleted' });
  }

  async function handleDuplicate(pack: ContentPack) {
    if (!userId) return;
    const { data: newPack } = await supabase
      .from('content_packs')
      .insert({ title: `${pack.title} (Copy)`, description: pack.description, game_type: pack.game_type, creator_id: userId })
      .select()
      .single();
    if (!newPack) return;

    // Copy slides
    const { data: slides } = await supabase.from('slides').select('*').eq('pack_id', pack.id).order('order_index');
    if (slides && slides.length > 0) {
      await supabase.from('slides').insert(
        slides.map((s) => ({ pack_id: newPack.id, content: s.content, order_index: s.order_index, time_limit: s.time_limit, points_possible: s.points_possible }))
      );
    }

    setPacks((prev) => [newPack, ...prev]);
    toast({ title: 'Pack duplicated!' });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Gamepad2 className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Content Studio</h1>
          </div>
          <Button variant="hero" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Pack
          </Button>
        </div>
      </header>

      {/* Pack Grid */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : packs.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <PackageOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">No Content Packs Yet</h2>
            <p className="text-muted-foreground mb-6">Create your first pack to get started</p>
            <Button variant="hero" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Pack
            </Button>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {packs.map((pack, i) => (
                <motion.div
                  key={pack.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                  className="gradient-card border border-border rounded-2xl p-6 flex flex-col group hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <Badge className={`${GAME_TYPE_COLORS[pack.game_type]} border-0 text-xs`}>
                      {GAME_TYPE_LABELS[pack.game_type]}
                    </Badge>
                    {pack.is_published && (
                      <Badge variant="outline" className="text-accent border-accent/30 text-xs">Live</Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1 line-clamp-1">{pack.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                    {pack.description || 'No description'}
                  </p>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/studio/${pack.id}`)}>
                      <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => handleDuplicate(pack)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(pack)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Create Content Pack</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Title</label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Deep Conversations" className="bg-muted border-border" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="What's this pack about?" className="bg-muted border-border resize-none" rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Game Type</label>
              <Select value={newType} onValueChange={(v) => setNewType(v as GameType)}>
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {(Object.keys(GAME_TYPE_LABELS) as GameType[]).map((gt) => (
                    <SelectItem key={gt} value={gt}>{GAME_TYPE_LABELS[gt]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleCreate} disabled={!newTitle.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the pack and all its slides.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
