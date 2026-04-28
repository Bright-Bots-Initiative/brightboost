import { Link } from "react-router-dom";
import GameBackground from "@/components/GameBackground";

interface AudiencePlaceholderProps {
  audience: string;
}

const AudiencePlaceholder = ({ audience }: AudiencePlaceholderProps) => {
  return (
    <GameBackground>
      <main className="min-h-screen flex items-center justify-center px-4 py-16">
        <section className="max-w-xl rounded-2xl bg-white/90 p-8 shadow-lg border border-white/80">
          <h1 className="text-3xl font-extrabold text-brightboost-navy">{audience} at Bright Boost</h1>
          <p className="mt-3 text-brightboost-navy/85 font-semibold">
            This page is a safe placeholder route so homepage audience links stay live. Content can be expanded in a follow-up pass.
          </p>
          <Link to="/" className="inline-block mt-5 text-brightboost-blue font-bold underline">
            Return to homepage
          </Link>
        </section>
      </main>
    </GameBackground>
  );
};

export default AudiencePlaceholder;
