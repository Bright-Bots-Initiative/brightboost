import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import InstructionReadAloud, { localVoice } from "../InstructionReadAloud";
import { enTranslate } from "@/test/i18nMock";

const lang = vi.hoisted(() => ({ current: "en" }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: enTranslate, i18n: { language: lang.current } }),
}));
const voice = (lang: string, localService = true) =>
  ({ lang, localService, name: lang }) as SpeechSynthesisVoice;
class Utterance {
  constructor(public text: string) {}
  voice?: SpeechSynthesisVoice;
  onend?: () => void;
  onboundary?: (e: { charIndex: number }) => void;
}
const synth = Object.assign(new EventTarget(), {
  getVoices: vi.fn(),
  speak: vi.fn<(u: Utterance) => void>(),
  cancel: vi.fn(),
});
const last = () => synth.speak.mock.calls[synth.speak.mock.calls.length - 1][0];
beforeEach(() => {
  lang.current = "en";
  vi.clearAllMocks();
  synth.getVoices.mockReturnValue([voice("en-US"), voice("es-MX")]);
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
});
afterEach(() => vi.unstubAllGlobals());
it("only speaks on request, pauses, resumes, repeats, and stops without resetting content", () => {
  const view = render(
    <InstructionReadAloud text="Choose a move." language="en" />,
  );
  expect(synth.speak).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("Listen"));
  expect(last().text).toBe("Choose a move.");
  act(() => last().onboundary?.({ charIndex: 7 }));
  fireEvent.click(screen.getByText("Pause"));
  fireEvent.click(screen.getByText("Resume"));
  expect(last().text).toBe("a move.");
  fireEvent.click(screen.getByText("Repeat from the start"));
  expect(last().text).toBe("Choose a move.");
  fireEvent.click(screen.getByText("Stop"));
  expect(screen.getByText("Listen")).toBeVisible();
  view.unmount();
});
it("keeps playing through equivalent voice updates and offers replay when finished", () => {
  render(<InstructionReadAloud text="Try again." language="en" />);
  fireEvent.click(screen.getByText("Listen"));
  synth.getVoices.mockReturnValue([voice("en-US")]);
  act(() => synth.dispatchEvent(new Event("voiceschanged")));
  expect(synth.cancel).not.toHaveBeenCalled();
  act(() => last().onend?.());
  fireEvent.click(screen.getByText("Repeat from the start"));
  expect(last().text).toBe("Try again.");
  expect(synth.speak).toHaveBeenCalledTimes(2);
});
it("cancels the previous speaker, ignores late events and stops on step, language and unmount", () => {
  const panel = (text: string) => (
    <>
      <InstructionReadAloud text="First." language="en" />
      <InstructionReadAloud text={text} language="en" />
    </>
  );
  const v = render(panel("Second."));
  const groups = screen.getAllByRole("group");
  fireEvent.click(within(groups[0]).getByText("Listen"));
  const first = last();
  fireEvent.click(within(groups[1]).getByText("Listen"));
  act(() => first.onend?.());
  expect(within(groups[0]).getByText("Listen")).toBeVisible();
  expect(within(groups[1]).getByText("Pause")).toBeVisible();
  v.rerender(panel("New step."));
  expect(synth.cancel).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getAllByText("Listen")[1]);
  lang.current = "es";
  v.rerender(panel("New step."));
  expect(synth.cancel).toHaveBeenCalledTimes(3);
  expect(screen.queryByRole("button")).toBeNull();
  lang.current = "en";
  v.rerender(panel("New step."));
  fireEvent.click(screen.getAllByText("Listen")[0]);
  v.unmount();
  expect(synth.cancel).toHaveBeenCalledTimes(4);
});
it("never substitutes a remote or wrong-language voice; responds when a local voice arrives", () => {
  lang.current = "es";
  synth.getVoices.mockReturnValue([voice("en-US"), voice("es-ES", false)]);
  render(<InstructionReadAloud text="Elige." language="es" />);
  expect(screen.getByText(/audio is unavailable/i)).toBeVisible();
  expect(screen.queryByRole("button")).toBeNull();
  const spanish = voice("es-MX");
  synth.getVoices.mockReturnValue([spanish]);
  act(() => synth.dispatchEvent(new Event("voiceschanged")));
  fireEvent.click(screen.getByText("Listen"));
  expect(last().voice).toBe(spanish);
  expect(localVoice([voice("zh-TW")], "zh-CN")).toBeUndefined();
  expect(localVoice([voice("vi-VN")], "vi")?.lang).toBe("vi-VN");
});
