import InstructionReadAloud from "@/components/activities/InstructionReadAloud";
import "./readAloud.css";
export default function ReadAloud({
  text,
  language,
}: {
  text: string;
  language?: string;
}) {
  return (
    <InstructionReadAloud
      buttonClassName="qubit-read-aloud"
      text={text}
      language={language ?? ""}
    />
  );
}
