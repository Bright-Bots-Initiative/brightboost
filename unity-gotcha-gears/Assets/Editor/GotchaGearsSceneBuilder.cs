using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using System.Collections.Generic;

namespace BrightBoost
{
    /// <summary>
    /// Editor script to auto-generate the Gotcha Gears scene and prefabs.
    /// Menu: Tools/BrightBoost/Gotcha Gears/Generate Scene
    /// </summary>
    public class GotchaGearsSceneBuilder : EditorWindow
    {
        private static readonly float[] LANE_Y_POSITIONS = { 2f, 0f, -2f };
        private static readonly Color LANE_COLORS = new Color(0.2f, 0.3f, 0.4f, 0.3f);

        [MenuItem("Tools/BrightBoost/Gotcha Gears/Generate Scene")]
        public static void GenerateScene()
        {
            // Create folders if needed
            EnsureFolder("Assets/Prefabs");
            EnsureFolder("Assets/Scenes");
            EnsureFolder("Assets/Materials");

            // Create a new scene
            var newScene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // Create Main Camera
            var cameraObj = new GameObject("Main Camera");
            var camera = cameraObj.AddComponent<Camera>();
            camera.orthographic = true;
            camera.orthographicSize = 5;
            camera.backgroundColor = new Color(0.15f, 0.2f, 0.25f);
            camera.clearFlags = CameraClearFlags.SolidColor;
            cameraObj.AddComponent<AudioListener>();
            cameraObj.transform.position = new Vector3(0, 0, -10);
            cameraObj.tag = "MainCamera";

            // Create WebBridge
            var webBridgeObj = new GameObject("WebBridge");
            webBridgeObj.AddComponent<WebBridge>();

            // Create GameManager
            var gameManagerObj = new GameObject("GameManager");
            var gameManager = gameManagerObj.AddComponent<GotchaGearsGameManager>();

            // Create Canvas for UI
            var canvasObj = new GameObject("Canvas");
            var canvas = canvasObj.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasObj.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(960, 600);
            canvasObj.AddComponent<GraphicRaycaster>();

            // EventSystem (required for WebGL UI)
            var eventSystemObj = new GameObject("EventSystem");
            eventSystemObj.AddComponent<EventSystem>();
            eventSystemObj.AddComponent<StandaloneInputModule>();

            // Create lanes
            CreateLanes();

            // Create catcher
            var catcher = CreateCatcher();

            // Create catch zone visual
            var catchZone = CreateCatchZoneVisual();

            // Create prefab
            var gearPrefab = CreateGearTargetPrefab();

            // Create UI elements
            var clueText = CreateClueText(canvasObj.transform);
            var scoreText = CreateScoreText(canvasObj.transform);
            var livesText = CreateLivesText(canvasObj.transform);
            var timerText = CreateTimerText(canvasObj.transform);
            var feedbackText = CreateFeedbackText(canvasObj.transform);
            var phaseText = CreatePhaseText(canvasObj.transform);
            var gameOverPanel = CreateGameOverPanel(canvasObj.transform);
            var introPanel = CreateIntroPanel(canvasObj.transform);
            var catchButton = CreateCatchButton(canvasObj.transform);

            // Wire up GameManager references
            var so = new SerializedObject(gameManager);
            so.FindProperty("gearTargetPrefab").objectReferenceValue = gearPrefab;
            so.FindProperty("catcher").objectReferenceValue = catcher;
            so.FindProperty("clueText").objectReferenceValue = clueText;
            so.FindProperty("scoreText").objectReferenceValue = scoreText;
            so.FindProperty("livesText").objectReferenceValue = livesText;
            so.FindProperty("timerText").objectReferenceValue = timerText;
            so.FindProperty("feedbackText").objectReferenceValue = feedbackText;
            so.FindProperty("phaseText").objectReferenceValue = phaseText;
            so.FindProperty("gameOverPanel").objectReferenceValue = gameOverPanel.gameObject;
            so.FindProperty("gameOverText").objectReferenceValue = gameOverPanel.GetComponentInChildren<Text>();
            so.FindProperty("introPanel").objectReferenceValue = introPanel.gameObject;
            so.FindProperty("startButton").objectReferenceValue = introPanel.GetComponentInChildren<Button>();
            so.FindProperty("catchButton").objectReferenceValue = catchButton;
            so.FindProperty("catchZoneVisual").objectReferenceValue = catchZone;

            // Set lane positions array
            var laneYProp = so.FindProperty("laneYPositions");
            laneYProp.arraySize = 3;
            for (int i = 0; i < 3; i++)
            {
                laneYProp.GetArrayElementAtIndex(i).floatValue = LANE_Y_POSITIONS[i];
            }

            so.ApplyModifiedProperties();

            // Save scene
            var scenePath = "Assets/Scenes/GotchaGearsMain.unity";
            EditorSceneManager.SaveScene(newScene, scenePath);

            // Add scene to Build Settings
            AddSceneToBuildSettings(scenePath);

            Debug.Log("[GotchaGearsSceneBuilder] Scene built successfully at " + scenePath);
            EditorUtility.DisplayDialog("Scene Generated",
                "Gotcha Gears scene created at:\n" + scenePath +
                "\n\nScene has been added to Build Settings.", "OK");
        }

        private static void EnsureFolder(string path)
        {
            if (!AssetDatabase.IsValidFolder(path))
            {
                var parts = path.Split('/');
                var current = parts[0];
                for (int i = 1; i < parts.Length; i++)
                {
                    var next = current + "/" + parts[i];
                    if (!AssetDatabase.IsValidFolder(next))
                    {
                        AssetDatabase.CreateFolder(current, parts[i]);
                    }
                    current = next;
                }
            }
        }

        private static void CreateLanes()
        {
            var lanesParent = new GameObject("Lanes");

            for (int i = 0; i < 3; i++)
            {
                var lane = new GameObject($"Lane{i}");
                lane.transform.SetParent(lanesParent.transform);
                lane.transform.position = new Vector3(0, LANE_Y_POSITIONS[i], 1);
                lane.transform.localScale = new Vector3(20f, 1.2f, 1f);

                // Sprite for visual
                var sr = lane.AddComponent<SpriteRenderer>();
                sr.sprite = CreateSquareSprite();
                sr.color = new Color(0.2f + i * 0.05f, 0.3f, 0.4f, 0.4f);
                sr.sortingOrder = -10;

                // Collider for clicks
                var col = lane.AddComponent<BoxCollider2D>();
                col.size = new Vector2(1f, 1f);

                // Touch handler
                var handler = lane.AddComponent<LaneTouchHandler>();
                var soHandler = new SerializedObject(handler);
                soHandler.FindProperty("laneIndex").intValue = i;
                soHandler.ApplyModifiedProperties();
            }
        }

        private static GearCatcherController CreateCatcher()
        {
            var catcherObj = new GameObject("Catcher");
            catcherObj.transform.position = new Vector3(6f, 0f, 0);
            catcherObj.transform.localScale = new Vector3(1.5f, 1.5f, 1f);

            var sr = catcherObj.AddComponent<SpriteRenderer>();
            sr.sprite = CreateSquareSprite();
            sr.color = new Color(0.8f, 0.6f, 0.2f, 0.8f);
            sr.sortingOrder = 5;

            var controller = catcherObj.AddComponent<GearCatcherController>();

            // Wire the sprite renderer
            var so = new SerializedObject(controller);
            so.FindProperty("backgroundSprite").objectReferenceValue = sr;
            so.ApplyModifiedProperties();

            return controller;
        }

        private static GameObject CreateCatchZoneVisual()
        {
            var zoneObj = new GameObject("CatchZoneVisual");
            zoneObj.transform.position = new Vector3(6f, 0, 0.5f);
            zoneObj.transform.localScale = new Vector3(2f, 8f, 1f);

            var sr = zoneObj.AddComponent<SpriteRenderer>();
            sr.sprite = CreateSquareSprite();
            sr.color = new Color(0.2f, 0.8f, 0.3f, 0.2f);
            sr.sortingOrder = -5;

            zoneObj.SetActive(false);
            return zoneObj;
        }

        private static GameObject CreateGearTargetPrefab()
        {
            var gear = new GameObject("GearTarget");

            // Background (gear shape approximated by square for now)
            var bgSprite = gear.AddComponent<SpriteRenderer>();
            bgSprite.sprite = CreateGearSprite();
            bgSprite.color = new Color(0.4f, 0.6f, 0.8f);
            bgSprite.sortingOrder = 1;
            gear.transform.localScale = new Vector3(1.2f, 1.2f, 1f);

            // Shadow text
            var shadowObj = new GameObject("ShadowText");
            shadowObj.transform.SetParent(gear.transform, false);
            shadowObj.transform.localPosition = new Vector3(0.03f, -0.03f, 0.1f);
            var shadowText = shadowObj.AddComponent<TextMesh>();
            shadowText.text = "GEAR";
            shadowText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            shadowText.fontSize = 36;
            shadowText.fontStyle = FontStyle.Bold;
            shadowText.characterSize = 0.08f;
            shadowText.anchor = TextAnchor.MiddleCenter;
            shadowText.alignment = TextAlignment.Center;
            shadowText.color = new Color(0, 0, 0, 0.5f);

            // Label text
            var textObj = new GameObject("LabelText");
            textObj.transform.SetParent(gear.transform, false);
            textObj.transform.localPosition = new Vector3(0, 0, -0.1f);
            var labelText = textObj.AddComponent<TextMesh>();
            labelText.text = "GEAR";
            labelText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            labelText.fontSize = 36;
            labelText.fontStyle = FontStyle.Bold;
            labelText.characterSize = 0.08f;
            labelText.anchor = TextAnchor.MiddleCenter;
            labelText.alignment = TextAlignment.Center;
            labelText.color = Color.white;

            // Collider for click detection
            var col = gear.AddComponent<BoxCollider2D>();
            col.size = new Vector2(0.9f, 0.9f);

            // Script
            var gearScript = gear.AddComponent<GearTarget>();
            var so = new SerializedObject(gearScript);
            so.FindProperty("labelText").objectReferenceValue = labelText;
            so.FindProperty("shadowText").objectReferenceValue = shadowText;
            so.FindProperty("backgroundSprite").objectReferenceValue = bgSprite;
            so.ApplyModifiedProperties();

            // Save prefab
            var prefab = PrefabUtility.SaveAsPrefabAsset(gear, "Assets/Prefabs/GearTarget.prefab");
            Object.DestroyImmediate(gear);
            return prefab;
        }

        private static Text CreateClueText(Transform parent)
        {
            var obj = new GameObject("ClueText");
            obj.transform.SetParent(parent, false);
            var text = obj.AddComponent<Text>();
            text.text = "Read the clue!";
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 26;
            text.fontStyle = FontStyle.Bold;
            text.color = Color.white;
            text.alignment = TextAnchor.UpperCenter;
            var rect = obj.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0.1f, 0.78f);
            rect.anchorMax = new Vector2(0.9f, 0.98f);
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
            var outline = obj.AddComponent<Outline>();
            outline.effectColor = new Color(0, 0, 0, 0.8f);
            outline.effectDistance = new Vector2(2, -2);
            return text;
        }

        private static Text CreateScoreText(Transform parent)
        {
            var obj = new GameObject("ScoreText");
            obj.transform.SetParent(parent, false);
            var text = obj.AddComponent<Text>();
            text.text = "Score: 0";
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 22;
            text.fontStyle = FontStyle.Bold;
            text.color = Color.white;
            text.alignment = TextAnchor.UpperLeft;
            var rect = obj.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0, 0.92f);
            rect.anchorMax = new Vector2(0.2f, 1);
            rect.offsetMin = new Vector2(10, 0);
            rect.offsetMax = Vector2.zero;
            obj.AddComponent<Outline>().effectDistance = new Vector2(1, -1);
            return text;
        }

        private static Text CreateLivesText(Transform parent)
        {
            var obj = new GameObject("LivesText");
            obj.transform.SetParent(parent, false);
            var text = obj.AddComponent<Text>();
            text.text = "Lives: 3";
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 22;
            text.fontStyle = FontStyle.Bold;
            text.color = new Color(1f, 0.4f, 0.4f);
            text.alignment = TextAnchor.UpperRight;
            var rect = obj.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0.8f, 0.92f);
            rect.anchorMax = new Vector2(1, 1);
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = new Vector2(-10, 0);
            obj.AddComponent<Outline>().effectDistance = new Vector2(1, -1);
            return text;
        }

        private static Text CreateTimerText(Transform parent)
        {
            var obj = new GameObject("TimerText");
            obj.transform.SetParent(parent, false);
            var text = obj.AddComponent<Text>();
            text.text = "";
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 20;
            text.color = Color.cyan;
            text.alignment = TextAnchor.UpperCenter;
            var rect = obj.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0.4f, 0.72f);
            rect.anchorMax = new Vector2(0.6f, 0.78f);
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
            return text;
        }

        private static Text CreateFeedbackText(Transform parent)
        {
            var obj = new GameObject("FeedbackText");
            obj.transform.SetParent(parent, false);
            var text = obj.AddComponent<Text>();
            text.text = "Great catch!";
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 28;
            text.fontStyle = FontStyle.Bold;
            text.color = new Color(0.2f, 0.8f, 0.3f);
            text.alignment = TextAnchor.MiddleCenter;
            var rect = obj.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0.2f, 0.4f);
            rect.anchorMax = new Vector2(0.8f, 0.5f);
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
            var outline = obj.AddComponent<Outline>();
            outline.effectColor = Color.black;
            outline.effectDistance = new Vector2(2, -2);
            obj.SetActive(false);
            return text;
        }

        private static Text CreatePhaseText(Transform parent)
        {
            var obj = new GameObject("PhaseText");
            obj.transform.SetParent(parent, false);
            var text = obj.AddComponent<Text>();
            text.text = "PLAN: Pick a lane!";
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 24;
            text.fontStyle = FontStyle.Bold;
            text.color = new Color(1f, 0.9f, 0.3f);
            text.alignment = TextAnchor.MiddleCenter;
            var rect = obj.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0.3f, 0.6f);
            rect.anchorMax = new Vector2(0.7f, 0.7f);
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
            var outline = obj.AddComponent<Outline>();
            outline.effectColor = Color.black;
            outline.effectDistance = new Vector2(2, -2);
            obj.SetActive(false);
            return text;
        }

        private static Image CreateGameOverPanel(Transform parent)
        {
            var panel = new GameObject("GameOverPanel");
            panel.transform.SetParent(parent, false);
            var image = panel.AddComponent<Image>();
            image.color = new Color(0, 0, 0, 0.85f);
            var rect = panel.GetComponent<RectTransform>();
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;

            var textObj = new GameObject("Text");
            textObj.transform.SetParent(panel.transform, false);
            var text = textObj.AddComponent<Text>();
            text.text = "Game Over";
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 42;
            text.color = Color.white;
            text.alignment = TextAnchor.MiddleCenter;
            var textRect = textObj.GetComponent<RectTransform>();
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.offsetMin = Vector2.zero;
            textRect.offsetMax = Vector2.zero;

            panel.SetActive(false);
            return image;
        }

        private static Image CreateIntroPanel(Transform parent)
        {
            var panel = new GameObject("IntroPanel");
            panel.transform.SetParent(parent, false);
            var image = panel.AddComponent<Image>();
            image.color = new Color(0.1f, 0.15f, 0.2f, 0.95f);
            var rect = panel.GetComponent<RectTransform>();
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;

            // Title
            var titleObj = new GameObject("Title");
            titleObj.transform.SetParent(panel.transform, false);
            var title = titleObj.AddComponent<Text>();
            title.text = "Gotcha Gears";
            title.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            title.fontSize = 48;
            title.fontStyle = FontStyle.Bold;
            title.color = new Color(0.4f, 0.8f, 1f);
            title.alignment = TextAnchor.MiddleCenter;
            var titleRect = titleObj.GetComponent<RectTransform>();
            titleRect.anchorMin = new Vector2(0, 0.7f);
            titleRect.anchorMax = new Vector2(1, 0.9f);
            titleRect.offsetMin = Vector2.zero;
            titleRect.offsetMax = Vector2.zero;
            titleObj.AddComponent<Outline>().effectDistance = new Vector2(3, -3);

            // Instructions
            var instrObj = new GameObject("Instructions");
            instrObj.transform.SetParent(panel.transform, false);
            var instr = instrObj.AddComponent<Text>();
            instr.text = "Catch the right gear!\n\n" +
                         "• Read the clue at the top\n" +
                         "• Use ↑/↓ or tap a lane to move\n" +
                         "• Press CATCH when the gear enters the green zone";
            instr.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            instr.fontSize = 20;
            instr.color = Color.white;
            instr.alignment = TextAnchor.MiddleCenter;
            var instrRect = instrObj.GetComponent<RectTransform>();
            instrRect.anchorMin = new Vector2(0.1f, 0.35f);
            instrRect.anchorMax = new Vector2(0.9f, 0.65f);
            instrRect.offsetMin = Vector2.zero;
            instrRect.offsetMax = Vector2.zero;

            // Start Button
            var btnObj = new GameObject("StartButton");
            btnObj.transform.SetParent(panel.transform, false);
            var btn = btnObj.AddComponent<Button>();
            var btnImage = btnObj.AddComponent<Image>();
            btnImage.color = new Color(0.2f, 0.7f, 0.3f);
            var btnRect = btnObj.GetComponent<RectTransform>();
            btnRect.anchorMin = new Vector2(0.3f, 0.12f);
            btnRect.anchorMax = new Vector2(0.7f, 0.25f);
            btnRect.offsetMin = Vector2.zero;
            btnRect.offsetMax = Vector2.zero;

            var btnTextObj = new GameObject("Text");
            btnTextObj.transform.SetParent(btnObj.transform, false);
            var btnText = btnTextObj.AddComponent<Text>();
            btnText.text = "START";
            btnText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            btnText.fontSize = 32;
            btnText.fontStyle = FontStyle.Bold;
            btnText.color = Color.white;
            btnText.alignment = TextAnchor.MiddleCenter;
            var btnTextRect = btnTextObj.GetComponent<RectTransform>();
            btnTextRect.anchorMin = Vector2.zero;
            btnTextRect.anchorMax = Vector2.one;
            btnTextRect.offsetMin = Vector2.zero;
            btnTextRect.offsetMax = Vector2.zero;

            panel.SetActive(false);
            return image;
        }

        private static Button CreateCatchButton(Transform parent)
        {
            var btnObj = new GameObject("CatchButton");
            btnObj.transform.SetParent(parent, false);

            var btn = btnObj.AddComponent<Button>();
            var btnImage = btnObj.AddComponent<Image>();
            btnImage.color = new Color(0.9f, 0.3f, 0.3f);

            var btnRect = btnObj.GetComponent<RectTransform>();
            btnRect.anchorMin = new Vector2(0.35f, 0.02f);
            btnRect.anchorMax = new Vector2(0.65f, 0.12f);
            btnRect.offsetMin = Vector2.zero;
            btnRect.offsetMax = Vector2.zero;

            var textObj = new GameObject("Text");
            textObj.transform.SetParent(btnObj.transform, false);
            var text = textObj.AddComponent<Text>();
            text.text = "CATCH!";
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 28;
            text.fontStyle = FontStyle.Bold;
            text.color = Color.white;
            text.alignment = TextAnchor.MiddleCenter;

            var textRect = textObj.GetComponent<RectTransform>();
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.offsetMin = Vector2.zero;
            textRect.offsetMax = Vector2.zero;

            textObj.AddComponent<Outline>().effectDistance = new Vector2(2, -2);

            btnObj.SetActive(false);
            return btn;
        }

        private static Sprite CreateSquareSprite()
        {
            var tex = new Texture2D(4, 4);
            var colors = new Color[16];
            for (int i = 0; i < 16; i++) colors[i] = Color.white;
            tex.SetPixels(colors);
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, 4, 4), new Vector2(0.5f, 0.5f), 4);
        }

        private static Sprite CreateGearSprite()
        {
            // Create a simple gear-like hexagon shape
            int size = 64;
            var tex = new Texture2D(size, size, TextureFormat.RGBA32, false);
            float center = size / 2f;
            float radius = size / 2f - 2;

            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    float dx = x - center;
                    float dy = y - center;
                    float dist = Mathf.Sqrt(dx * dx + dy * dy);
                    float angle = Mathf.Atan2(dy, dx);

                    // Create gear teeth effect
                    float teethRadius = radius * (0.85f + 0.15f * Mathf.Cos(angle * 8));

                    if (dist < teethRadius && dist > radius * 0.3f)
                    {
                        tex.SetPixel(x, y, Color.white);
                    }
                    else if (dist <= radius * 0.3f)
                    {
                        tex.SetPixel(x, y, new Color(0.8f, 0.8f, 0.8f, 1f));
                    }
                    else
                    {
                        tex.SetPixel(x, y, Color.clear);
                    }
                }
            }

            tex.Apply();
            tex.filterMode = FilterMode.Bilinear;
            return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size);
        }

        private static void AddSceneToBuildSettings(string scenePath)
        {
            var scenes = new List<EditorBuildSettingsScene>(EditorBuildSettings.scenes);

            bool exists = false;
            foreach (var scene in scenes)
            {
                if (scene.path == scenePath)
                {
                    exists = true;
                    scene.enabled = true;
                    break;
                }
            }

            if (!exists)
            {
                scenes.Add(new EditorBuildSettingsScene(scenePath, true));
            }

            EditorBuildSettings.scenes = scenes.ToArray();
            Debug.Log("[GotchaGearsSceneBuilder] Added scene to Build Settings: " + scenePath);
        }
    }
}
