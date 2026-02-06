using UnityEngine;
using UnityEditor;
using UnityEditor.Build.Reporting;
using System.IO;

namespace BrightBoost
{
    /// <summary>
    /// One-click build tools for Bounce & Buds WebGL.
    /// Outputs directly to BrightBoost public folder with correct filenames.
    /// </summary>
    public static class BounceBudsBuildTools
    {
        private const string BUILD_NAME = "bounce_buds";
        private const string SCENE_PATH = "Assets/Scenes/BounceBudsMain.unity";

        /// <summary>
        /// Build WebGL only (assumes scene already exists).
        /// Menu: Tools/BrightBoost/Bounce & Buds/Build WebGL (One Click)
        /// </summary>
        [MenuItem("Tools/BrightBoost/Bounce & Buds/Build WebGL (One Click)")]
        public static void BuildWebGL()
        {
            if (!File.Exists(Path.Combine(Application.dataPath, "..", SCENE_PATH)))
            {
                EditorUtility.DisplayDialog("Error",
                    "Scene not found at: " + SCENE_PATH +
                    "\n\nPlease run 'Generate Scene' first.",
                    "OK");
                return;
            }

            DoBuildWebGL();
        }

        /// <summary>
        /// Generate scene and build WebGL in one step.
        /// Menu: Tools/BrightBoost/Bounce & Buds/Generate + Build WebGL (One Click)
        /// </summary>
        [MenuItem("Tools/BrightBoost/Bounce & Buds/Generate + Build WebGL (One Click)")]
        public static void GenerateAndBuildWebGL()
        {
            BounceBudsSceneBuilder.GenerateScene();
            DoBuildWebGL();
        }

        /// <summary>
        /// Batchmode entry point for CI builds.
        /// </summary>
        public static void BuildWebGL_CI()
        {
            Debug.Log("[BounceBudsBuildTools] Starting CI build...");

            if (!File.Exists(Path.Combine(Application.dataPath, "..", SCENE_PATH)))
            {
                Debug.Log("[BounceBudsBuildTools] Scene not found, generating...");
                BounceBudsSceneBuilder.GenerateScene();
            }

            bool success = DoBuildWebGL();

            if (!success)
            {
                Debug.LogError("[BounceBudsBuildTools] CI build failed!");
                EditorApplication.Exit(1);
            }
            else
            {
                Debug.Log("[BounceBudsBuildTools] CI build completed successfully!");
            }
        }

        /// <summary>
        /// Clean Build folder (preserves .gitkeep).
        /// Menu: Tools/BrightBoost/Bounce & Buds/Clean Build Folder
        /// </summary>
        [MenuItem("Tools/BrightBoost/Bounce & Buds/Clean Build Folder")]
        public static void CleanBuildFolder()
        {
            string repoRoot = Path.GetFullPath(Path.Combine(Application.dataPath, "../.."));
            string buildPath = Path.Combine(repoRoot, "public/games/bounce-buds/Build");

            if (Directory.Exists(buildPath))
            {
                CleanBuildDirectory(buildPath);
                Debug.Log("[BounceBudsBuildTools] Build folder cleaned (preserved .gitkeep)");

                if (!Application.isBatchMode)
                {
                    EditorUtility.DisplayDialog("Clean Complete",
                        "Build folder cleaned.\n\n.gitkeep preserved.", "OK");
                }
            }
            else
            {
                Debug.Log("[BounceBudsBuildTools] Build folder does not exist, nothing to clean");
            }
        }

        private static bool DoBuildWebGL()
        {
            string repoRoot = Path.GetFullPath(Path.Combine(Application.dataPath, "../.."));
            string outputPath = Path.Combine(repoRoot, "public/games/bounce-buds");
            string buildPath = Path.Combine(outputPath, "Build");

            Debug.Log($"[BounceBudsBuildTools] Repo root: {repoRoot}");
            Debug.Log($"[BounceBudsBuildTools] Output path: {outputPath}");

            if (!Directory.Exists(buildPath))
            {
                Directory.CreateDirectory(buildPath);
                Debug.Log($"[BounceBudsBuildTools] Created directory: {buildPath}");
            }
            else
            {
                CleanBuildDirectory(buildPath);
                Debug.Log("[BounceBudsBuildTools] Cleaned old build outputs");
            }

            string originalProductName = PlayerSettings.productName;
            PlayerSettings.productName = BUILD_NAME;

            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
            PlayerSettings.WebGL.decompressionFallback = false;

            try
            {
                BuildPlayerOptions buildOptions = new BuildPlayerOptions
                {
                    scenes = new[] { SCENE_PATH },
                    locationPathName = outputPath,
                    target = BuildTarget.WebGL,
                    options = BuildOptions.None
                };

                Debug.Log("[BounceBudsBuildTools] Starting WebGL build...");
                BuildReport report = BuildPipeline.BuildPlayer(buildOptions);
                BuildSummary summary = report.summary;

                if (summary.result == BuildResult.Succeeded)
                {
                    Debug.Log($"[BounceBudsBuildTools] Build succeeded: {summary.totalSize} bytes");

                    EnsureCorrectFilenames(buildPath);

                    if (!Application.isBatchMode)
                    {
                        EditorUtility.DisplayDialog("Build Complete",
                            $"WebGL build successful!\n\nOutput: {buildPath}\n\nFiles:\n" +
                            $"- {BUILD_NAME}.loader.js\n" +
                            $"- {BUILD_NAME}.data\n" +
                            $"- {BUILD_NAME}.framework.js\n" +
                            $"- {BUILD_NAME}.wasm",
                            "OK");
                    }

                    return true;
                }
                else
                {
                    Debug.LogError($"[BounceBudsBuildTools] Build failed: {summary.result}");

                    if (!Application.isBatchMode)
                    {
                        EditorUtility.DisplayDialog("Build Failed",
                            $"WebGL build failed!\n\nResult: {summary.result}\n\nCheck console for details.",
                            "OK");
                    }

                    return false;
                }
            }
            finally
            {
                PlayerSettings.productName = originalProductName;
            }
        }

        private static void EnsureCorrectFilenames(string buildPath)
        {
            string[] extensions = { ".loader.js", ".data", ".framework.js", ".wasm" };

            foreach (string ext in extensions)
            {
                string expectedFile = Path.Combine(buildPath, BUILD_NAME + ext);

                if (File.Exists(expectedFile))
                {
                    Debug.Log($"[BounceBudsBuildTools] Found expected file: {BUILD_NAME}{ext}");
                    continue;
                }

                string[] files = Directory.GetFiles(buildPath, "*" + ext);
                if (files.Length > 0)
                {
                    string sourceFile = files[0];
                    Debug.Log($"[BounceBudsBuildTools] Renaming {Path.GetFileName(sourceFile)} -> {BUILD_NAME}{ext}");

                    if (File.Exists(expectedFile))
                    {
                        File.Delete(expectedFile);
                    }

                    File.Move(sourceFile, expectedFile);
                }
                else
                {
                    Debug.LogWarning($"[BounceBudsBuildTools] Missing expected file: {BUILD_NAME}{ext}");
                }
            }

            CleanupExtraFiles(buildPath);
        }

        private static void CleanupExtraFiles(string buildPath)
        {
            string indexHtml = Path.Combine(buildPath, "..", "index.html");
            if (File.Exists(indexHtml))
            {
                File.Delete(indexHtml);
                Debug.Log("[BounceBudsBuildTools] Removed index.html");
            }

            string templateData = Path.Combine(buildPath, "..", "TemplateData");
            if (Directory.Exists(templateData))
            {
                Directory.Delete(templateData, true);
                Debug.Log("[BounceBudsBuildTools] Removed TemplateData folder");
            }
        }

        private static void CleanBuildDirectory(string buildPath)
        {
            if (!Directory.Exists(buildPath)) return;

            foreach (string file in Directory.GetFiles(buildPath))
            {
                if (Path.GetFileName(file) != ".gitkeep")
                {
                    try
                    {
                        File.Delete(file);
                        Debug.Log($"[BounceBudsBuildTools] Deleted: {Path.GetFileName(file)}");
                    }
                    catch (System.Exception e)
                    {
                        Debug.LogWarning($"[BounceBudsBuildTools] Failed to delete {file}: {e.Message}");
                    }
                }
            }

            foreach (string dir in Directory.GetDirectories(buildPath))
            {
                try
                {
                    Directory.Delete(dir, true);
                    Debug.Log($"[BounceBudsBuildTools] Deleted directory: {Path.GetFileName(dir)}");
                }
                catch (System.Exception e)
                {
                    Debug.LogWarning($"[BounceBudsBuildTools] Failed to delete {dir}: {e.Message}");
                }
            }

            string gitkeep = Path.Combine(buildPath, ".gitkeep");
            if (!File.Exists(gitkeep))
            {
                File.WriteAllText(gitkeep, "");
                Debug.Log("[BounceBudsBuildTools] Created .gitkeep");
            }
        }
    }
}
