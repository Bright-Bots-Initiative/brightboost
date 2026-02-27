// src/pages/PrivacyPolicy.tsx
import React from "react";
import { Link } from "react-router-dom";
import GameBackground from "../components/GameBackground";

const PrivacyPolicy: React.FC = () => {
  return (
    <GameBackground>
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="game-card p-8 w-full max-w-2xl text-left">
          <h1 className="text-3xl font-bold text-brightboost-navy mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-brightboost-navy/60 mb-6">
            Last updated: February 2026
          </p>

          <div className="space-y-6 text-sm leading-relaxed text-brightboost-navy">
            <section>
              <h2 className="text-lg font-semibold mb-2">
                What Data We Collect
              </h2>
              <p>
                We collect the following information when you use Bright Boost:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Name and email address (provided during registration)</li>
                <li>Learning progress and activity scores</li>
                <li>Classroom and enrollment information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">
                How We Use Your Data
              </h2>
              <p>
                Your data is used exclusively for educational progress tracking.
                We do not use your data for advertising, marketing, or any
                purpose unrelated to your learning experience on this platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">Data Retention</h2>
              <p>
                Data collected during the pilot program will be deleted at the
                conclusion of the pilot unless you provide explicit consent to
                continue using the platform and retain your data.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">COPPA Compliance</h2>
              <p>
                Bright Boost is committed to complying with the Children's
                Online Privacy Protection Act (COPPA). For users under the age
                of 13, parental or guardian consent is required before
                collecting any personal information.
              </p>
              <p className="mt-2">
                Under the COPPA school exception, schools may act as the agent
                of the parent to provide consent for the collection of student
                information for educational purposes. Teachers who register
                students confirm they have obtained appropriate authorization.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or how your data
                is handled, please contact us:
              </p>
              <p className="mt-2 font-medium">
                Bright Bots Initiative
                <br />
                Email: privacy@brightboost.example.com
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

export default PrivacyPolicy;
