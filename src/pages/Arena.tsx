// src/pages/Arena.tsx
import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Heart, Shield, Zap, Swords } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Arena() {
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [turnResult, setTurnResult] = useState<string | null>(null);

  const handleQueue = async () => {
    setLoading(true);
    try {
        const m = await api.queueMatch("K2");
        setMatch(m);
        pollMatch(m.id);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const pollMatch = (id: string) => {
      const interval = setInterval(async () => {
          const m = await api.getMatch(id);
          setMatch(m);
          if (m.status === "COMPLETED") clearInterval(interval);
      }, 2000);
      return () => clearInterval(interval);
  };

  const handleAct = async (abilityId: string) => {
      if (!match) return;
      try {
          const res = await api.submitTurn(match.id, abilityId);

          // Determine simplified feedback
          let feedback = "Action Taken!";
          // We'd ideally analyze the diff, but for MVP simple is okay.
          // Let's assume generic "Big Hit" for now if HP dropped significantly.
          setTurnResult("Big Hit!");
          setTimeout(() => setTurnResult(null), 1500);

          if (res.matchOver) {
              toast({ title: "Match Over!", description: res.winnerId ? "We have a winner!" : "It's a draw!" });
          }

          const m = await api.getMatch(match.id);
          setMatch(m);
      } catch (e) {
          toast({ title: "Error", description: "Failed to act" });
      }
  };

  const [myId, setMyId] = useState<string>("");
  useEffect(() => {
      api.getAvatar().then(av => setMyId(av.studentId));
  }, []);

  if (!match) {
      return (
          <div className="flex flex-col items-center justify-center h-[80vh] space-y-8">
              <div className="bg-blue-100 p-8 rounded-full">
                  <Swords size={64} className="text-blue-600" />
              </div>
              <h1 className="text-4xl font-black text-slate-800">Battle Arena</h1>
              <Button size="lg" onClick={handleQueue} disabled={loading} className="text-xl px-12 py-8 rounded-2xl shadow-xl hover:scale-105 transition">
                  {loading ? "Finding Opponent..." : "Find Match"}
              </Button>
          </div>
      );
  }

  const isP1 = match.player1Id === myId;
  const me = isP1 ? match.Player1 : match.Player2;
  const opponent = isP1 ? match.Player2 : match.Player1;
  const currentTurn = match.turns?.length || 0;
  const round = Math.floor(currentTurn / 2) + 1;
  const isMyTurn = (currentTurn % 2 === 0 && isP1) || (currentTurn % 2 !== 0 && !isP1);

  // Computed HP (rough approximation from stored turns for MVP display)
  // In real app, backend sends current HP. We'll use the one from state if available, or static max for now.
  // The backend `resolveTurn` updates persistent HP on avatar?
  // No, the previous `resolveTurn` returned `p1Hp`, `p2Hp`. But `getMatch` fetches Avatar.
  // We need current HP in match response.
  // Assuming backend returns unmodified Avatar for now, let's just show hearts.

  return (
    <div className="flex flex-col h-[85vh] relative">
        {/* Top Bar: Opponent */}
        <div className="flex justify-center pt-4 pb-2">
            <div className="flex flex-col items-center">
                 <div className="w-16 h-16 bg-red-100 rounded-full border-4 border-red-200 flex items-center justify-center mb-1">
                     <span className="text-2xl">🤖</span>
                 </div>
                 <div className="flex gap-1">
                     <Heart className="fill-red-500 text-red-500 w-4 h-4" />
                     <Heart className="fill-red-500 text-red-500 w-4 h-4" />
                     <Heart className="fill-red-500 text-red-500 w-4 h-4" />
                 </div>
            </div>
        </div>

        {/* Center: Status */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="bg-slate-100 px-4 py-1 rounded-full text-slate-500 font-bold text-sm">
                ROUND {Math.min(round, 3)}/3
            </div>

            <AnimatePresence>
                {turnResult && (
                    <motion.div
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1.5, rotate: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute z-10 bg-yellow-400 border-4 border-white text-yellow-900 px-6 py-3 rounded-xl font-black text-2xl shadow-lg transform -translate-y-12"
                    >
                        {turnResult}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="text-2xl font-black text-slate-800">
                {match.status === "COMPLETED" ? (
                   match.winnerId === myId ? "YOU WIN! 🎉" : "Draw / Loss"
                ) : (
                   isMyTurn ? "YOUR TURN!" : "Waiting..."
                )}
            </div>

            {/* My Portrait */}
            <div className="flex flex-col items-center mt-4">
                 <div className="w-20 h-20 bg-blue-100 rounded-full border-4 border-blue-300 flex items-center justify-center mb-2">
                     <span className="text-4xl">😎</span>
                 </div>
                 <div className="flex gap-1">
                     <Heart className="fill-green-500 text-green-500 w-5 h-5" />
                     <Heart className="fill-green-500 text-green-500 w-5 h-5" />
                     <Heart className="fill-green-500 text-green-500 w-5 h-5" />
                 </div>
            </div>
        </div>

        {/* Bottom: Abilities */}
        <div className="grid grid-cols-2 gap-4 pb-4">
             {me?.unlockedAbilities?.map((ua: any) => (
                 <button
                     key={ua.id}
                     disabled={!isMyTurn || match.status !== "ACTIVE"}
                     onClick={() => handleAct(ua.abilityId)}
                     className={`
                        flex flex-col items-center justify-center p-4 rounded-2xl border-b-4 transition-all active:scale-95
                        ${isMyTurn ? "bg-white border-blue-200 shadow-lg" : "bg-gray-100 border-gray-200 opacity-50"}
                     `}
                 >
                     <div className="bg-orange-100 p-3 rounded-full mb-2">
                         <Zap className="text-orange-500 w-6 h-6" />
                     </div>
                     <span className="font-bold text-slate-700">{ua.Ability.name}</span>
                     {/* Advantage Badge Logic can go here if we know opponent archetype */}
                 </button>
             ))}
             {/* Fallback if no abilities */}
             {(!me?.unlockedAbilities || me?.unlockedAbilities.length === 0) && (
                 <div className="col-span-2 text-center text-gray-400">No abilities unlocked!</div>
             )}
        </div>
    </div>
  );
}
