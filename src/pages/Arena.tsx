// src/pages/Arena.tsx
import { useEffect, useState, useRef } from "react";
import { api } from "../services/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Zap, Swords } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Arena() {
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [turnResult, setTurnResult] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const [myId, setMyId] = useState<string>("");
  const [isFetchingQuestion, setIsFetchingQuestion] = useState(false);
  const [pendingAbilityId, setPendingAbilityId] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<any>(null);

  // Poll match state
  const pollMatch = async (matchId: string) => {
    try {
      const m = await api.getMatch(matchId);
      setMatch(m);
    } catch (e) {
      console.error("Poll failed", e);
    }
  };

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

  useEffect(() => {
    api
      .getAvatar()
      .then((av) => setMyId(av.studentId))
      .catch((err) => console.error("Failed to load avatar", err));
  }, []);

  // Adaptive polling
  useEffect(() => {
    if (!match || match.status === "COMPLETED" || match.status === "FORFEIT")
      return;

    const isMyTurn =
      (match.turns.length % 2 === 0 && match.player1Id === myId) ||
      (match.turns.length % 2 !== 0 && match.player2Id === myId);

    // Fast poll if waiting (1.2s), slow if my turn (3.5s)
    // If waiting for opponent, we want to know ASAP when they act.
    // If it's my turn, I will trigger update via action, so background poll can be slow.
    const delay = isMyTurn ? 3500 : 1200;

    const timer = setTimeout(async () => {
      try {
        const m = await api.getMatch(match.id);
        setMatch(m);
      } catch (e) {
        console.error("Poll failed", e);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [match, myId]);

  const handleAct = async (
    abilityId: string,
    quiz?: { questionId: string; answerIndex: number },
  ) => {
    if (!match) return;
    try {
      const res = await api.submitTurn(match.id, abilityId, quiz);

      // Feedback handling
      const feedback = "Big Hit!";
      // We can check if knowledge bonus was applied by checking the response or inferring
      // Ideally backend returns the action result. Assuming it returns { p1Hp, p2Hp... } for now.
      // If we passed a quiz and didn't fail, we assume it helped.
      if (quiz) {
        // This is a heuristic since we don't have the exact action result in the response immediately
        // without re-parsing the log. We'll trust the turn processed.
      }

      setTurnResult(feedback);
      setTimeout(() => setTurnResult(null), 1500);

      if (res.matchOver) {
        toast({
          title: "Match Over!",
          description: res.winnerId ? "We have a winner!" : "It's a draw!",
        });
      }

      const m = await api.getMatch(match.id);
      setMatch(m);
    } catch (e) {
      toast({ title: "Error", description: "Failed to act" });
    }
  };

  const onAbilityClick = async (abilityId: string) => {
    if (!match || isFetchingQuestion) return;
    setIsFetchingQuestion(true);
    // Try to get a question
    try {
      const q = await api.getMatchQuestion(match.id);
      if (q && q.id) {
        setPendingAbilityId(abilityId);
        setActiveQuestion(q);
      } else {
        // Fallback: just act
        handleAct(abilityId);
      }
    } catch (e) {
      // If fetch fails, just act
      handleAct(abilityId);
    } finally {
      setIsFetchingQuestion(false);
    }
  };

  const handleAnswer = (index: number) => {
    if (!pendingAbilityId || !activeQuestion) return;
    handleAct(pendingAbilityId, {
      questionId: activeQuestion.id,
      answerIndex: index,
    });
    setActiveQuestion(null);
    setPendingAbilityId(null);
  };

  // Scroll log to bottom on update
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [match?.computed?.log]);

  // Update Turn Result based on Last Event from backend
  useEffect(() => {
    if (!match?.computed?.lastEvent) return;
    const le = match.computed.lastEvent;

    // Only show if it's recent (last few seconds) - logic simplified for MVP
    // If the log length changed, show it.
    // For now, let's just show it briefly if we have a lastEvent.
    // Ideally we'd compare lastEvent timestamps or IDs.
    // We'll rely on the parent causing a re-render or explicit turn submission trigger for now,
    // but we can deduce text from the event type.

    let text = "";
    if (le.damageDealt > 15) text = "CRITICAL HIT!";
    else if (le.damageDealt > 0) text = `HIT -${le.damageDealt}!`;
    else if (le.healAmount > 0) text = `HEAL +${le.healAmount}!`;

    if (text) {
      setTurnResult(text);
      const timer = setTimeout(() => setTurnResult(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [match?.computed?.lastEvent]);

  // Turn Timer Logic
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const isP1 = match ? match.player1Id === myId : false;
  const isMyTurn = match
    ? (match.turns.length % 2 === 0 && isP1) ||
      (match.turns.length % 2 !== 0 && !isP1)
    : false;

  useEffect(() => {
    if (!match || match.status !== "ACTIVE") {
      setTimeLeft(null);
      return;
    }

    const lastTurn =
      match.turns.length > 0 ? match.turns[match.turns.length - 1] : null;
    const lastTime = lastTurn
      ? new Date(lastTurn.createdAt).getTime()
      : new Date(match.updatedAt).getTime();
    const deadline = lastTime + 30000; // 30s turn

    const tick = () => {
      const now = Date.now();
      const remaining = Math.ceil((deadline - now) / 1000);

      if (remaining <= 0) {
        setTimeLeft(0);
        // If it's 0 and NOT my turn (opponent's turn), claim timeout
        if (!isMyTurn && match.status === "ACTIVE") {
          api
            .claimTimeout(match.id)
            .then((res) => {
              if (res.matchOver) {
                setMatch((prev: any) => ({
                  ...prev,
                  status: res.status,
                  winnerId: res.winnerId,
                }));
                toast({
                  title: "Timeout!",
                  description: "Opponent took too long. You win!",
                });
              }
            })
            .catch(() => {}); // Ignore 409s if polling raced
        }
      } else {
        setTimeLeft(remaining);
      }
    };

    tick(); // Initial
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [
    match?.turns,
    match?.status,
    isMyTurn,
    match?.id,
    match?.updatedAt,
    match,
    toast,
  ]);

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] space-y-8">
        <div className="bg-blue-100 p-8 rounded-full">
          <Swords size={64} className="text-blue-600" />
        </div>
        <h1 className="text-4xl font-black text-slate-800">Battle Arena</h1>
        <Button
          size="lg"
          onClick={handleQueue}
          disabled={loading}
          className="text-xl px-12 py-8 rounded-2xl shadow-xl hover:scale-105 transition"
        >
          {loading ? "Finding Opponent..." : "Find Match"}
        </Button>
      </div>
    );
  }

  const me = isP1 ? match.Player1 : match.Player2;
  const opponent = isP1 ? match.Player2 : match.Player1;

  // Computed Data
  const computed = match.computed || {
    p1Hp: 100,
    p2Hp: 100,
    log: [],
    lastEvent: null,
  };
  const myHp = isP1 ? computed.p1Hp : computed.p2Hp;
  const oppHp = isP1 ? computed.p2Hp : computed.p1Hp;
  const myMax = me?.hp || 100;
  const oppMax = opponent?.hp || 100;

  const myHpPct = Math.max(0, (myHp / myMax) * 100);
  const oppHpPct = Math.max(0, (oppHp / oppMax) * 100);

  return (
    <div className="flex flex-col h-[85vh] relative max-w-lg mx-auto w-full">
      {/* Top Bar: Opponent */}
      <div className="flex flex-col pt-4 pb-2 px-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-red-100 rounded-full border-2 border-red-200 flex items-center justify-center">
              <span className="text-xl">🤖</span>
            </div>
            <span className="font-bold text-slate-700">Opponent</span>
          </div>
          <div className="text-sm font-bold text-red-600">
            {oppHp}/{oppMax} HP
          </div>
        </div>
        {/* Opponent HP Bar */}
        <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden border border-slate-300">
          <motion.div
            className="h-full bg-red-500"
            initial={{ width: "100%" }}
            animate={{ width: `${oppHpPct}%` }}
            transition={{ type: "spring", stiffness: 100 }}
          />
        </div>
      </div>

      {/* Center: Battle Area & Log */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Floating Feedback */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <AnimatePresence>
            {turnResult && (
              <motion.div
                initial={{ scale: 0, opacity: 0, y: 20 }}
                animate={{ scale: 1.2, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: -20 }}
                className="bg-yellow-400 border-4 border-white text-yellow-900 px-6 py-3 rounded-xl font-black text-2xl shadow-xl whitespace-nowrap"
              >
                {turnResult}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Question Modal Overlay */}
        <AnimatePresence>
          {activeQuestion && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border-4 border-blue-500"
              >
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-bold text-slate-800">
                    Quick Check! 🧠
                  </h3>
                  <p className="text-lg font-medium text-slate-600">
                    {activeQuestion.prompt}
                  </p>
                  <div className="grid gap-2">
                    {activeQuestion.options.map((opt: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => handleAnswer(i)}
                        className="w-full p-3 rounded-xl bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 text-blue-700 font-bold transition-all active:scale-95"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Battle Log (Scrollable) */}
        <div className="flex-1 px-4 py-2 overflow-y-auto space-y-2 z-10">
          <div
            ref={logRef}
            className="bg-white/50 backdrop-blur-sm rounded-xl p-4 h-full overflow-y-auto border border-slate-200 shadow-inner"
          >
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">
              Battle Log
            </h3>
            {computed.log.length === 0 && (
              <p className="text-slate-400 text-sm italic">
                Battle starting...
              </p>
            )}
            {computed.log.map((entry: any, i: number) => {
              const isMe = entry.actorId === myId;
              return (
                <div
                  key={i}
                  className={`text-sm mb-1 ${isMe ? "text-blue-600 text-right" : "text-red-600 text-left"}`}
                >
                  <span className="font-bold">{isMe ? "You" : "Opponent"}</span>{" "}
                  used{" "}
                  <span className="font-mono bg-slate-100 px-1 rounded">
                    {entry.abilityId || "Action"}
                  </span>
                  {entry.damageDealt > 0 && (
                    <span> for {entry.damageDealt} DMG</span>
                  )}
                  {entry.healAmount > 0 && (
                    <span> to HEAL {entry.healAmount}</span>
                  )}
                  {entry.knowledge?.correct && (
                    <span className="ml-1 text-xs bg-yellow-100 text-yellow-700 px-1 rounded border border-yellow-200">
                      🧠 +25%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center py-2">
          <div className="text-2xl font-black text-slate-800 drop-shadow-sm">
            {match.status === "COMPLETED" || match.status === "FORFEIT"
              ? match.winnerId === myId
                ? "VICTORY! 🎉"
                : "DEFEAT 💀"
              : isMyTurn
                ? "YOUR TURN!"
                : "OPPONENT'S TURN..."}
          </div>
          {match.status === "ACTIVE" && timeLeft !== null && (
            <div
              className={`text-sm font-bold ${timeLeft < 10 ? "text-red-600 animate-pulse" : "text-slate-500"}`}
            >
              {timeLeft > 0
                ? `Time left: ${timeLeft}s`
                : "Calculating timeout..."}
            </div>
          )}
        </div>
      </div>

      {/* Bottom: My Stats & Abilities */}
      <div className="bg-white border-t border-slate-200 p-4 pb-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="flex flex-col space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-blue-100 rounded-full border-2 border-blue-200 flex items-center justify-center">
                <span className="text-xl">😎</span>
              </div>
              <span className="font-bold text-slate-700">You</span>
            </div>
            <div className="text-sm font-bold text-blue-600">
              {myHp}/{myMax} HP
            </div>
          </div>
          {/* My HP Bar */}
          <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden border border-slate-300">
            <motion.div
              className="h-full bg-green-500"
              initial={{ width: "100%" }}
              animate={{ width: `${myHpPct}%` }}
              transition={{ type: "spring", stiffness: 100 }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {me?.unlockedAbilities?.map((ua: any) => (
            <button
              key={ua.id}
              disabled={
                !isMyTurn || match.status !== "ACTIVE" || isFetchingQuestion
              }
              onClick={() => onAbilityClick(ua.abilityId)}
              className={`
                        flex items-center gap-3 p-3 rounded-xl border-b-4 transition-all active:scale-95 text-left
                        ${isMyTurn && !isFetchingQuestion ? "bg-blue-50 border-blue-200 hover:bg-blue-100" : "bg-gray-50 border-gray-100 opacity-60 grayscale"}
                     `}
            >
              <div
                className={`p-2 rounded-full ${isMyTurn ? "bg-white shadow-sm" : "bg-gray-200"}`}
              >
                {isFetchingQuestion && pendingAbilityId === ua.abilityId ? (
                  <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Zap
                    className={`w-5 h-5 ${isMyTurn ? "text-orange-500" : "text-gray-400"}`}
                  />
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-700 text-sm">
                  {ua.Ability.name}
                </span>
                <span className="text-xs text-slate-500">
                  {ua.Ability.config?.type === "attack"
                    ? `DMG ${ua.Ability.config.value}`
                    : "HEAL"}
                </span>
              </div>
            </button>
          ))}
          {/* Fallback if no abilities */}
          {(!me?.unlockedAbilities || me?.unlockedAbilities.length === 0) && (
            <div className="col-span-2 text-center text-gray-400 py-2 bg-gray-50 rounded-lg">
              No abilities unlocked!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
