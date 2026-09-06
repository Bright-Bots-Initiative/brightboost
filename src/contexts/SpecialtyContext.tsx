import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { api } from "@/services/api";
import {
  SPECIALTY_UPDATED,
  type Specialty,
  type SpecialtyStatus,
} from "@/lib/specialty";

type State = {
  status: "loading" | "ready" | "error";
  data: SpecialtyStatus | null;
};
type Value = State & {
  refresh: () => void;
  choose: (specialty: Specialty) => Promise<void>;
};
const SpecialtyContext = createContext<Value>({
  status: "loading",
  data: null,
  refresh: () => {},
  choose: async () => {
    throw new Error("Specialty provider missing");
  },
});
export function SpecialtyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State & { userId?: string }>({
    status: "loading",
    data: null,
  });
  const choosing = useRef(false);
  const refresh = useCallback(() => setAttempt((n) => n + 1), []);
  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", data: null, userId });
    if (!userId) return;
    api
      .getSpecialtyStatus()
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data, userId });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", data: null, userId });
      });
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);
  useEffect(() => {
    window.addEventListener(SPECIALTY_UPDATED, refresh);
    return () => window.removeEventListener(SPECIALTY_UPDATED, refresh);
  }, [refresh]);
  const choose = async (specialty: Specialty) => {
    if (
      choosing.current ||
      state.userId !== userId ||
      !state.data?.unlocked ||
      state.data.specialty
    )
      throw new Error("Choice unavailable");
    choosing.current = true;
    try {
      await api.selectArchetype(specialty);
      refresh();
    } finally {
      choosing.current = false;
    }
  };
  const current: State =
    state.userId === userId ? state : { status: "loading", data: null };
  return (
    <SpecialtyContext.Provider value={{ ...current, refresh, choose }}>
      {children}
    </SpecialtyContext.Provider>
  );
}
export const useSpecialty = () => useContext(SpecialtyContext);
