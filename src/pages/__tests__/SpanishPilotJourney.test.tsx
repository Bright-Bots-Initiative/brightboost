import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import i18n, { changeLanguage } from "@/i18n";
import SkyShieldGame from "@/components/games/SkyShieldGame";
import GotchaGearsGame from "@/components/games/GotchaGearsGame";
import TeacherSignup from "@/pages/TeacherSignup";
import TeacherModulePrep from "@/pages/TeacherModulePrep";
import HomeAccessAccept from "@/pages/HomeAccessAccept";
import { SKY_SHIELD_CONTENT } from "@/components/games/gradeBandContent";
import es from "@/locales/es/common.json";

const login = vi.hoisted(() => vi.fn());
vi.mock("@/contexts/AuthContext", async (original) => ({
  ...(await original<typeof import("@/contexts/AuthContext")>()),
  useAuth: () => ({ login }),
}));
vi.mock("@/services/api", async (original) => ({
  ...(await original<typeof import("@/services/api")>()),
  signupTeacher: vi.fn(async () => ({
    token: "test",
    user: { id: "teacher" },
  })),
}));

afterEach(async () => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  await changeLanguage("en");
});

describe("localized classroom journey with the shipped dictionaries", () => {
  it.each([
    ["en", "How to play"],
    ["es", "Cómo jugar"],
    ["vi", "Cách chơi"],
    ["zh-CN", "怎么玩"],
  ] as const)(
    "renders both shared instruction headings in %s",
    async (lang, heading) => {
      await changeLanguage(lang);
      const { container } = render(<SkyShieldGame />);
      expect(screen.getByRole("heading", { name: heading })).toBeVisible();
      fireEvent.click(
        screen.getByRole("button", {
          name: i18n.t("games.shared.startMission"),
        }),
      );
      expect(container.querySelector("summary")).toHaveTextContent(heading);
    },
  );
  it("starts Sky Shield in Spanish, catches lights and reads the next-lane prompt", async () => {
    vi.useFakeTimers();
    await changeLanguage("es");
    render(<SkyShieldGame config={{ gradeBand: "k2" }} />);
    expect(screen.getByText(/Observa en qué carril cae la luz/)).toBeVisible();
    expect(screen.getByText("Teclado")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Misión" }));
    expect(screen.getByRole("region", { name: /Zona de juego/ })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "¡Vamos!" }));
    for (let n = 0; n < SKY_SHIELD_CONTENT.k2.practiceRounds; n++) {
      fireEvent.click(screen.getByRole("button", { name: "¡Atrapa!" }));
      act(() => vi.advanceTimersByTime(950));
    }
    act(() => vi.advanceTimersByTime(15000));
    expect(
      screen.getByText("¿En qué carril caerá la próxima luz?"),
    ).toBeVisible();
  });
  it("plays a built-in Gotcha Gears round without an English clue or choices", async () => {
    await changeLanguage("es");
    render(<GotchaGearsGame />);
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Misión" }));
    expect(
      screen.getByText(/Ayudo al robot a pensar y aprender/),
    ).toBeVisible();
    const answer = await screen.findByRole("button", { name: /Cerebro de IA/ });
    fireEvent.click(answer);
    expect(screen.queryByText("AI Brain")).not.toBeInTheDocument();
  });
  it("validates and submits teacher signup entirely in Spanish", async () => {
    await changeLanguage("es");
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    render(
      <MemoryRouter>
        <TeacherSignup />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: "Crea tu cuenta de docente" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Volver al inicio" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", { name: "Crear mi cuenta de docente" }),
    );
    expect(
      screen.getByText("Escribe un correo electrónico válido."),
    ).toBeVisible();
    fireEvent.change(screen.getByLabelText("Tu nombre"), {
      target: { value: "Docente" },
    });
    fireEvent.change(screen.getByLabelText("Correo de la escuela"), {
      target: { value: "docente@example.invalid" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña", { exact: true }), {
      target: { value: "ExamplePwd1" },
    });
    fireEvent.change(screen.getByLabelText("Confirma tu contraseña"), {
      target: { value: "ExamplePwd1" },
    });
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: "Crear mi cuenta de docente" }),
      ),
    );
    expect(login).toHaveBeenCalled();
  });
  it("opens teacher preparation in Spanish and reads the discussion prompts", async () => {
    await changeLanguage("es");
    const guide = {
      moduleSlug: "k2-stem-rhyme-ride",
      objectives: ["Reconocer palabras que riman."],
      vocabulary: [],
      prerequisites: [],
      misconceptions: [],
      materials: [],
      discussionBefore: ["¿Qué palabras riman con gato?"],
      discussionAfter: [],
      turnAndTalk: [],
      pacingGuide: [],
      estimatedMinutes: 45,
      checklist: null,
    };
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify(guide), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetcher);
    render(
      <MemoryRouter initialEntries={["/prep/k2-stem-rhyme-ride"]}>
        <Routes>
          <Route path="/prep/:slug" element={<TeacherModulePrep />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText(guide.objectives[0])).toBeVisible();
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("/teacher/prep/k2-stem-rhyme-ride?lang=es"),
      expect.anything(),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: es.teacher.modulePrep.discussionGuide,
      }),
    );
    expect(
      screen.getByText(guide.discussionBefore[0], { exact: false }),
    ).toBeVisible();
  });
  it("lets a family review and accept a home-access invitation in Spanish", async () => {
    await changeLanguage("es");
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          studentFirstName: "Luz",
          adultEmail: "adult@example.invalid",
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetcher);
    render(
      <MemoryRouter initialEntries={["/home-access/accept?token=example"]}>
        <HomeAccessAccept />
      </MemoryRouter>,
    );
    await screen.findByText(/Luz/);
    const copy = es.homeAccess.accept;
    for (const label of [copy.passwordLabel, copy.confirmLabel])
      fireEvent.change(screen.getByLabelText(label, { exact: true }), {
        target: { value: "ExamplePwd1" },
      });
    expect(
      screen.getAllByRole("button", { name: "Mostrar contraseña" }),
    ).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: copy.submit }));
    expect(await screen.findByText(copy.success)).toBeVisible();
  });
});
