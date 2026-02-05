// src/components/unity/UnityWebGL.tsx
import { useEffect, useRef, useState, useCallback } from "react";

interface UnityConfig {
  archetype?: string;
  level?: number;
  xp?: number;
  avatarUrl?: string;
  stem1Set1Completed?: string[];
}

interface UnityWebGLProps {
  basePath: string;
  buildName?: string;
  config?: UnityConfig;
  onInstanceReady?: (instance: any) => void;
  onRestartRequest?: () => void;
}

declare global {
  interface Window {
    createUnityInstance?: (
      canvas: HTMLCanvasElement,
      config: {
        dataUrl: string;
        frameworkUrl: string;
        codeUrl: string;
        streamingAssetsUrl: string;
        companyName?: string;
        productName?: string;
        productVersion?: string;
      },
      onProgress?: (progress: number) => void,
    ) => Promise<any>;
  }
}

// Detect touch device (suppress focus overlay on mobile)
const isTouchDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    navigator.maxTouchPoints > 0
  );
};

// Keys used by the game that browsers may steal (scroll, back navigation, etc.)
const GAMEPLAY_KEYS = new Set([
  "Space",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyR",
  "ControlLeft",
  "ControlRight",
]);

export default function UnityWebGL({
  basePath,
  buildName = "spacewar",
  config,
  onInstanceReady,
  onRestartRequest,
}: UnityWebGLProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [isTouch] = useState(isTouchDevice);

  // Block browser-default handling of gameplay keys when canvas is focused
  const handleKeyCapture = useCallback(
    (e: KeyboardEvent) => {
      if (focused && GAMEPLAY_KEYS.has(e.code)) {
        e.preventDefault();

        // Handle "R" key for restart (only for spacewar, not other games)
        if (e.type === "keydown" && e.code === "KeyR" && !e.repeat && buildName === "spacewar") {
          // Don't restart if user is typing in an input field
          const target = e.target as HTMLElement;
          if (
            target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable
          ) {
            return;
          }

          // Trigger restart via callback or direct SendMessage
          if (onRestartRequest) {
            onRestartRequest();
          } else if (instanceRef.current) {
            try {
              instanceRef.current.SendMessage("WebBridge", "RestartGame");
            } catch (err) {
              console.warn("Failed to restart game:", err);
            }
          }
        }
      }
    },
    [focused, onRestartRequest, buildName],
  );

  useEffect(() => {
    // Capture phase listeners to intercept before browser defaults
    window.addEventListener("keydown", handleKeyCapture, { capture: true });
    window.addEventListener("keyup", handleKeyCapture, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyCapture, {
        capture: true,
      });
      window.removeEventListener("keyup", handleKeyCapture, { capture: true });
    };
  }, [handleKeyCapture]);

  useEffect(() => {
    let mounted = true;
    let script: HTMLScriptElement | null = null;

    const loadUnity = async () => {
      if (!canvasRef.current) return;

      // Load the Unity loader script
      const loaderUrl = `${basePath}/Build/${buildName}.loader.js`;

      try {
        // Load the Unity loader script directly - rely on script.onerror
        // to detect missing files (HEAD requests may return 405 on some servers)
        script = document.createElement("script");
        script.src = loaderUrl;
        script.async = true;

        await new Promise<void>((resolve, reject) => {
          script!.onload = () => resolve();
          script!.onerror = () =>
            reject(new Error("Failed to load Unity loader"));
          document.body.appendChild(script!);
        });

        if (!mounted || !window.createUnityInstance) {
          throw new Error("Unity loader not available");
        }

        const unityConfig = {
          dataUrl: `${basePath}/Build/${buildName}.data`,
          frameworkUrl: `${basePath}/Build/${buildName}.framework.js`,
          codeUrl: `${basePath}/Build/${buildName}.wasm`,
          streamingAssetsUrl: `${basePath}/StreamingAssets`,
          companyName: "BrightBoost",
          productName: buildName,
          productVersion: "1.0",
        };

        const instance = await window.createUnityInstance(
          canvasRef.current!,
          unityConfig,
          (p: number) => {
            if (mounted) setProgress(Math.round(p * 100));
          },
        );

        if (mounted) {
          instanceRef.current = instance;
          setLoading(false);

          // Notify parent that instance is ready
          if (onInstanceReady) {
            onInstanceReady(instance);
          }

          // Send config to Unity via WebBridge
          if (config) {
            try {
              instance.SendMessage(
                "WebBridge",
                "SetPlayerConfig",
                JSON.stringify(config),
              );
            } catch (err) {
              console.warn("Failed to send player config to Unity:", err);
            }
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load game");
          setLoading(false);
        }
      }
    };

    loadUnity();

    return () => {
      mounted = false;
      // Cleanup Unity instance
      if (instanceRef.current) {
        try {
          instanceRef.current.Quit?.();
        } catch {
          // Ignore cleanup errors
        }
        instanceRef.current = null;
      }
      // Remove loader script
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [basePath, buildName, config, onInstanceReady]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-900 rounded-xl p-8 text-center">
        <div className="text-6xl mb-4">🎮</div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Game Not Available
        </h2>
        <p className="text-slate-400 mb-4">Game build is not available yet.</p>
        <div className="bg-slate-800 rounded-lg p-4 text-sm text-slate-500">
          <p>
            Expected files at:{" "}
            <code className="text-slate-400">
              {basePath}/Build/{buildName}.*
            </code>
          </p>
        </div>
      </div>
    );
  }

  const handleFocus = () => {
    setFocused(true);
  };

  const handleBlur = () => {
    setFocused(false);
  };

  const handleContainerClick = () => {
    canvasRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black rounded-xl overflow-hidden"
      onClick={handleContainerClick}
    >
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10">
          <div className="text-4xl mb-4">🎮</div>
          <h2 className="text-xl font-bold text-white mb-4">Loading game...</h2>
          <div className="w-64 h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-slate-400 mt-2">{progress}%</p>
        </div>
      )}
      {/* Focus hint overlay - shown when game loaded but canvas not focused (desktop only) */}
      {!loading && !focused && !isTouch && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 cursor-pointer"
          onClick={handleContainerClick}
        >
          <div className="text-center text-white">
            <p className="text-lg font-semibold">Click to play</p>
            <p className="text-sm text-slate-300 mt-1">
              Focus the game to enable controls
            </p>
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        id="unity-canvas"
        tabIndex={0}
        className="w-full h-full outline-none"
        style={{ display: loading ? "none" : "block" }}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </div>
  );
}
