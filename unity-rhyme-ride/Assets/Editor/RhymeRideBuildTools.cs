using UnityEngine;
using UnityEditor;
using UnityEditor.Build.Reporting;
using System.IO;

namespace BrightBoost
{
    /// <summary>
    /// One-click build tools for Rhyme & Ride WebGL.
    /// Outputs directly to BrightBoost public folder with correct filenames.
    /// </summary>
    public static class RhymeRideBuildTools
    {
        private const string BUILD_NAME = "rhyme_ride";
        private const string SCENE_PATH = "Assets/Scenes/RhymeRideMain.unity";

        /// <summary>
        /// Build WebGL only (assumes scene already exists).
        /// Menu: Tools/BrightBoost/Rhyme & Ride/Build WebGL (One Click)
        /// </summary>
        [MenuItem("Tools/BrightBoost/Rhyme & Ride/Build WebGL (One Click)")]
        public static void BuildWebGL()
        {
            // Verify scene exists
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
        /// Menu: Tools/BrightBoost/Rhyme & Ride/Generate + Build WebGL (One Click)
        /// </summary>
        [MenuItem("Tools/BrightBoost/Rhyme & Ride/Generate + Build WebGL (One Click)")]
        public static void GenerateAndBuildWebGL()
        {
            // Generate scene first
            RhymeRideSceneBuilder.GenerateScene();

            // Then build
            DoBuildWebGL();
        }

        /// <summary>
        /// Batchmode entry point for CI builds.
        /// Usage: Unity -batchmode -quit -projectPath unity-rhyme-ride -executeMethod BrightBoost.RhymeRideBuildTools.BuildWebGL_CI
        /// </summary>
        public static void BuildWebGL_CI()
        {
            Debug.Log("[RhymeRideBuildTools] Starting CI build...");

            // Generate scene if it doesn't exist
            if (!File.Exists(Path.Combine(Application.dataPath, "..", SCENE_PATH)))
            {
                Debug.Log("[RhymeRideBuildTools] Scene not found, generating...");
                RhymeRideSceneBuilder.GenerateScene();
            }

            bool success = DoBuildWebGL();

            if (!success)
            {
                Debug.LogError("[RhymeRideBuildTools] CI build failed!");
                EditorApplication.Exit(1);
            }
            else
            {
                Debug.Log("[RhymeRideBuildTools] CI build completed successfully!");
            }
        }

        /// <summary>
        /// Clean Build folder (preserves .gitkeep).
        /// Menu: Tools/BrightBoost/Rhyme & Ride/Clean Build Folder
        /// </summary>
        [MenuItem("Tools/BrightBoost/Rhyme & Ride/Clean Build Folder")]
        public static void CleanBuildFolder()
        {
            string repoRoot = Path.GetFullPath(Path.Combine(Application.dataPath, "../.."));
            string buildPath = Path.Combine(repoRoot, "public/games/rhyme-ride/Build");

            if (Directory.Exists(buildPath))
            {
                CleanBuildDirectory(buildPath);
                Debug.Log("[RhymeRideBuildTools] Build folder cleaned (preserved .gitkeep)");

                if (!Application.isBatchMode)
                {
                    EditorUtility.DisplayDialog("Clean Complete",
                        "Build folder cleaned.\n\n.gitkeep preserved.", "OK");
                }
            }
            else
            {
                Debug.Log("[RhymeRideBuildTools] Build folder does not exist, nothing to clean");
            }
        }

        private static bool DoBuildWebGL()
        {
            // Determine output path (BrightBoost repo root)
            // Unity project is at <repo>/unity-rhyme-ride
            // So repo root is Application.dataPath/../..
            string repoRoot = Path.GetFullPath(Path.Combine(Application.dataPath, "../.."));
            string outputPath = Path.Combine(repoRoot, "public/games/rhyme-ride");
            string buildPath = Path.Combine(outputPath, "Build");

            Debug.Log($"[RhymeRideBuildTools] Repo root: {repoRoot}");
            Debug.Log($"[RhymeRideBuildTools] Output path: {outputPath}");

            // Create output directories if they don't exist
            if (!Directory.Exists(buildPath))
            {
                Directory.CreateDirectory(buildPath);
                Debug.Log($"[RhymeRideBuildTools] Created directory: {buildPath}");
            }
            else
            {
                // Clean old build outputs (preserve .gitkeep)
                CleanBuildDirectory(buildPath);
                Debug.Log("[RhymeRideBuildTools] Cleaned old build outputs");
            }

            // Configure player settings for correct output naming
            string originalProductName = PlayerSettings.productName;
            PlayerSettings.productName = BUILD_NAME;

            // Set WebGL-specific settings
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
            PlayerSettings.WebGL.decompressionFallback = false;

            try
            {
                // Build options
                BuildPlayerOptions buildOptions = new BuildPlayerOptions
                {
                    scenes = new[] { SCENE_PATH },
                    locationPathName = outputPath,
                    target = BuildTarget.WebGL,
                    options = BuildOptions.None
                };

                Debug.Log("[RhymeRideBuildTools] Starting WebGL build...");
                BuildReport report = BuildPipeline.BuildPlayer(buildOptions);
                BuildSummary summary = report.summary;

                if (summary.result == BuildResult.Succeeded)
                {
                    Debug.Log($"[RhymeRideBuildTools] Build succeeded: {summary.totalSize} bytes");

                    // Verify and rename files if needed
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
                    Debug.LogError($"[RhymeRideBuildTools] Build failed: {summary.result}");

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
                // Restore original product name
                PlayerSettings.productName = originalProductName;
            }
        }

        /// <summary>
        /// Ensure output files have correct names (rhyme_ride.*).
        /// Unity may emit different prefixes depending on settings.
        /// </summary>
        private static void EnsureCorrectFilenames(string buildPath)
        {
            string[] extensions = { ".loader.js", ".data", ".framework.js", ".wasm" };

            foreach (string ext in extensions)
            {
                string expectedFile = Path.Combine(buildPath, BUILD_NAME + ext);

                if (File.Exists(expectedFile))
                {
                    Debug.Log($"[RhymeRideBuildTools] Found expected file: {BUILD_NAME}{ext}");
                    continue;
                }

                // Look for any file with this extension
                string[] files = Directory.GetFiles(buildPath, "*" + ext);
                if (files.Length > 0)
                {
                    string sourceFile = files[0];
                    Debug.Log($"[RhymeRideBuildTools] Renaming {Path.GetFileName(sourceFile)} -> {BUILD_NAME}{ext}");

                    // Delete existing if present
                    if (File.Exists(expectedFile))
                    {
                        File.Delete(expectedFile);
                    }

                    File.Move(sourceFile, expectedFile);
                }
                else
                {
                    Debug.LogWarning($"[RhymeRideBuildTools] Missing expected file: {BUILD_NAME}{ext}");
                }
            }

            // Clean up any extra files Unity may have created
            CleanupExtraFiles(buildPath);
        }

        /// <summary>
        /// Remove extra files that Unity sometimes creates.
        /// </summary>
        private static void CleanupExtraFiles(string buildPath)
        {
            // Remove index.html (we don't need it)
            string indexHtml = Path.Combine(buildPath, "..", "index.html");
            if (File.Exists(indexHtml))
            {
                File.Delete(indexHtml);
                Debug.Log("[RhymeRideBuildTools] Removed index.html");
            }

            // Remove TemplateData folder if present
            string templateData = Path.Combine(buildPath, "..", "TemplateData");
            if (Directory.Exists(templateData))
            {
                Directory.Delete(templateData, true);
                Debug.Log("[RhymeRideBuildTools] Removed TemplateData folder");
            }
        }

        /// <summary>
        /// Clean build directory, preserving .gitkeep.
        /// </summary>
        private static void CleanBuildDirectory(string buildPath)
        {
            if (!Directory.Exists(buildPath)) return;

            // Delete all files except .gitkeep
            foreach (string file in Directory.GetFiles(buildPath))
            {
                if (Path.GetFileName(file) != ".gitkeep")
                {
                    try
                    {
                        File.Delete(file);
                        Debug.Log($"[RhymeRideBuildTools] Deleted: {Path.GetFileName(file)}");
                    }
                    catch (System.Exception e)
                    {
                        Debug.LogWarning($"[RhymeRideBuildTools] Failed to delete {file}: {e.Message}");
                    }
                }
            }

            // Delete subdirectories
            foreach (string dir in Directory.GetDirectories(buildPath))
            {
                try
                {
                    Directory.Delete(dir, true);
                    Debug.Log($"[RhymeRideBuildTools] Deleted directory: {Path.GetFileName(dir)}");
                }
                catch (System.Exception e)
                {
                    Debug.LogWarning($"[RhymeRideBuildTools] Failed to delete {dir}: {e.Message}");
                }
            }

            // Ensure .gitkeep exists
            string gitkeep = Path.Combine(buildPath, ".gitkeep");
            if (!File.Exists(gitkeep))
            {
                File.WriteAllText(gitkeep, "");
                Debug.Log("[RhymeRideBuildTools] Created .gitkeep");
            }
        }
    }
}
