// src/components/unity/UnityWebGL.tsx
import { useEffect, useRef, useState } from "react";

interface UnityConfig {
  archetype?: string;
  level?: number;
  xp?: number;
  avatarUrl?: string;
}

interface UnityWebGLProps {
  basePath: string;
  config?: UnityConfig;
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
      onProgress?: (progress: number) => void
    ) => Promise<any>;
  }
}

export default function UnityWebGL({ basePath, config }: UnityWebGLProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let script: HTMLScriptElement | null = null;

    const loadUnity = async () => {
      if (!canvasRef.current) return;

      // Load the Unity loader script
      const loaderUrl = `${basePath}/Build/spacewar.loader.js`;

      try {
        // Check if loader exists first
        const loaderCheck = await fetch(loaderUrl, { method: "HEAD" });
        if (!loaderCheck.ok) {
          throw new Error("Unity build files not found");
        }

        script = document.createElement("script");
        script.src = loaderUrl;
        script.async = true;

        await new Promise<void>((resolve, reject) => {
          script!.onload = () => resolve();
          script!.onerror = () => reject(new Error("Failed to load Unity loader"));
          document.body.appendChild(script!);
        });

        if (!mounted || !window.createUnityInstance) {
          throw new Error("Unity loader not available");
        }

        const unityConfig = {
          dataUrl: `${basePath}/Build/spacewar.data`,
          frameworkUrl: `${basePath}/Build/spacewar.framework.js`,
          codeUrl: `${basePath}/Build/spacewar.wasm`,
          streamingAssetsUrl: `${basePath}/StreamingAssets`,
          companyName: "BrightBoost",
          productName: "Spacewar",
          productVersion: "1.0",
        };

        const instance = await window.createUnityInstance(
          canvasRef.current!,
          unityConfig,
          (p: number) => {
            if (mounted) setProgress(Math.round(p * 100));
          }
        );

        if (mounted) {
          instanceRef.current = instance;
          setLoading(false);

          // Send config to Unity if provided
          if (config) {
            instance.SendMessage(
              "GameManager",
              "SetPlayerConfig",
              JSON.stringify(config)
            );
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
  }, [basePath, config]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-900 rounded-xl p-8 text-center">
        <div className="text-6xl mb-4">🚀</div>
        <h2 className="text-2xl font-bold text-white mb-2">Spacewar PvP</h2>
        <p className="text-slate-400 mb-4">
          Game build is not available yet.
        </p>
        <div className="bg-slate-800 rounded-lg p-4 text-sm text-slate-500">
          <p>Expected files at: <code className="text-slate-400">{basePath}/Build/</code></p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10">
          <div className="text-4xl mb-4">🚀</div>
          <h2 className="text-xl font-bold text-white mb-4">Loading Spacewar...</h2>
          <div className="w-64 h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-slate-400 mt-2">{progress}%</p>
        </div>
      )}
      <canvas
        ref={canvasRef}
        id="unity-canvas"
        className="w-full h-full"
        style={{ display: loading ? "none" : "block" }}
      />
    </div>
  );
}
