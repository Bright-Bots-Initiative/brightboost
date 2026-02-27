// src/pages/TermsOfService.tsx
import React from "react";
import { Link } from "react-router-dom";
import GameBackground from "../components/GameBackground";

const TermsOfService: React.FC = () => {
  return (
    <GameBackground>
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="game-card p-8 w-full max-w-2xl text-left">
          <h1 className="text-3xl font-bold text-brightboost-navy mb-2">
            Terms of Service
          </h1>
          <p className="text-sm text-brightboost-navy/60 mb-6">
            Last updated: February 2026
          </p>

          <div className="space-y-6 text-sm leading-relaxed text-brightboost-navy">
            <section>
              <h2 className="text-lg font-semibold mb-2">
                Educational Use Only
              </h2>
              <p>
                Bright Boost is an educational platform designed exclusively for
                learning purposes. All features, content, and activities are
                intended to support classroom instruction and student skill
                development.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">
                Account Responsibility
              </h2>
              <p>
                Users are responsible for maintaining the security of their
                account credentials. Teachers are additionally responsible for
                managing their classrooms and the students enrolled in them.
              </p>
              <p className="mt-2">
                You agree not to share your login credentials with others or
                allow unauthorized access to your account.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">Content Ownership</h2>
              <p>
                All platform content, including educational materials,
                activities, and interface elements, is owned by the Bright Bots
                Initiative. User-generated data, such as progress records and
                scores, belongs to the respective user.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">
                Limitation of Liability
              </h2>
              <p>
                Bright Boost is provided &ldquo;as-is&rdquo; for the duration of
                the pilot program. We make no warranties, express or implied,
                regarding the availability, accuracy, or fitness of the platform
                for any particular purpose. Use of the platform is at your own
                risk.
              </p>
            </section>
          </div>

          <div className="mt-8 text-center">
            <Link to="/" className="game-button inline-block">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </GameBackground>
  );
};

export default TermsOfService;
