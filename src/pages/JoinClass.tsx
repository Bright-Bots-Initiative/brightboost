import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../services/api";
import { Users, ArrowRight } from "lucide-react";
import PulseSurveyDialog from "@/components/student/PulseSurveyDialog";

const JoinClass: React.FC = () => {
  const api = useApi();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Pulse survey state
  const [pulseOpen, setPulseOpen] = useState(false);
  const [joinedCourseId, setJoinedCourseId] = useState("");
  const [joinedCourseName, setJoinedCourseName] = useState("");

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.post("/student/join-course", {
        joinCode: joinCode.trim().toUpperCase(),
      });
      setSuccess(`Joined "${result.courseName}" successfully!`);
      setJoinedCourseId(result.courseId as string);
      setJoinedCourseName(result.courseName as string);
      setPulseOpen(true);
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("404")
          ? "Invalid join code. Please check with your teacher."
          : err instanceof Error
            ? err.message
            : "Failed to join class",
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePulseDone = () => {
    navigate("/student/dashboard");
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-6">
          <Users className="w-12 h-12 text-brightboost-blue mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-brightboost-navy">
            Join a Class
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Enter the join code your teacher gave you
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label
              htmlFor="joinCode"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Join Code
            </label>
            <input
              id="joinCode"
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-center text-xl font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-brightboost-blue"
              placeholder="ABC123"
              maxLength={10}
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-600 bg-green-50 rounded-md px-3 py-2">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={!joinCode.trim() || loading || !!success}
            className="w-full flex items-center justify-center px-4 py-3 text-white bg-brightboost-blue rounded-md hover:bg-brightboost-navy disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brightboost-blue"
          >
            {loading ? (
              "Joining..."
            ) : (
              <>
                Join Class
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </form>
      </div>

      {joinedCourseId && (
        <PulseSurveyDialog
          open={pulseOpen}
          onOpenChange={(open) => {
            setPulseOpen(open);
            if (!open) handlePulseDone();
          }}
          courseId={joinedCourseId}
          courseName={joinedCourseName}
          kind="PRE"
          onSubmitted={handlePulseDone}
        />
      )}
    </div>
  );
};

export default JoinClass;
