import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import HostLobby from "./pages/HostLobby.tsx";
import HostGame from "./pages/HostGame.tsx";
import PlayerJoin from "./pages/PlayerJoin.tsx";
import Studio from "./pages/Studio.tsx";
import PackEditor from "./pages/PackEditor.tsx";
import GameDisplay from "./pages/GameDisplay.tsx";
import PackPreview from "./pages/PackPreview.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/host/:code" element={<HostLobby />} />
          <Route path="/host/:code/game" element={<HostGame />} />
          <Route path="/host/:code/display" element={<GameDisplay />} />
          <Route path="/play/:code" element={<PlayerJoin />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/studio/:packId" element={<PackEditor />} />
          <Route path="/studio/:packId/preview" element={<PackPreview />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
