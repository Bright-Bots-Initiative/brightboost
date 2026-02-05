using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using System.Collections.Generic;

namespace BrightBoost
{
    /// <summary>
    /// Editor script to auto-generate the Rhyme & Ride scene and prefabs.
    /// Menu: Tools/BrightBoost/Rhyme & Ride/Generate Scene
    /// </summary>
    public class RhymeRideSceneBuilder : EditorWindow
    {
        [MenuItem("Tools/BrightBoost/Rhyme & Ride/Generate Scene")]
        public static void GenerateScene()
        {
            // Create folders if needed
            if (!AssetDatabase.IsValidFolder("Assets/Prefabs"))
            {
                AssetDatabase.CreateFolder("Assets", "Prefabs");
            }
            if (!AssetDatabase.IsValidFolder("Assets/Scenes"))
            {
                AssetDatabase.CreateFolder("Assets", "Scenes");
            }

            // Create a new scene
            var newScene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // Create Main Camera
            var cameraObj = new GameObject("Main Camera");
            var camera = cameraObj.AddComponent<Camera>();
            camera.orthographic = true;
            camera.orthographicSize = 5;
            camera.backgroundColor = new Color(0.1f, 0.15f, 0.25f);
            camera.clearFlags = CameraClearFlags.SolidColor;
            cameraObj.AddComponent<AudioListener>();
            cameraObj.transform.position = new Vector3(0, 0, -10);
            cameraObj.tag = "MainCamera";

            // Create WebBridge
            var webBridgeObj = new GameObject("WebBridge");
            webBridgeObj.AddComponent<WebBridge>();

            // Create GameManager
            var gameManagerObj = new GameObject("GameManager");
            var gameManager = gameManagerObj.AddComponent<RhymeRideGameManager>();

            // Create Canvas for UI
            var canvasObj = new GameObject("Canvas");
            var canvas = canvasObj.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasObj.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(960, 600);
            canvasObj.AddComponent<GraphicRaycaster>();

            // EventSystem (required for UI button clicks in WebGL)
            var eventSystemObj = new GameObject("EventSystem");
            eventSystemObj.AddComponent<EventSystem>();
            eventSystemObj.AddComponent<StandaloneInputModule>();

            // HUD Panel (top)
            var hudPanel = CreateUIPanel(canvasObj.transform, "HUDPanel",
                new Vector2(0, 1), new Vector2(1, 1), new Vector2(0.5f, 1),
                new Vector2(0, -10), new Vector2(-20, 80));

            // Prompt Text (center top)
            var promptObj = new GameObject("PromptText");
            promptObj.transform.SetParent(hudPanel.transform, false);
            var promptText = promptObj.AddComponent<Text>();
            promptText.text = "Tap the rhyme for: ???";
            promptText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            promptText.fontSize = 28;
            promptText.fontStyle = FontStyle.Bold;
            promptText.color = Color.yellow;
            promptText.alignment = TextAnchor.MiddleCenter;
            var promptRect = promptObj.GetComponent<RectTransform>();
            promptRect.anchorMin = new Vector2(0.2f, 0);
            promptRect.anchorMax = new Vector2(0.8f, 1);
            promptRect.offsetMin = Vector2.zero;
            promptRect.offsetMax = Vector2.zero;
            // Add Outline for better visibility
            var promptOutline = promptObj.AddComponent<Outline>();
            promptOutline.effectColor = new Color(0, 0, 0, 0.8f);
            promptOutline.effectDistance = new Vector2(2f, -2f);
            var promptShadow = promptObj.AddComponent<Shadow>();
            promptShadow.effectColor = new Color(0, 0, 0, 0.6f);
            promptShadow.effectDistance = new Vector2(3, -3);

            // Score Text (left)
            var scoreObj = new GameObject("ScoreText");
            scoreObj.transform.SetParent(hudPanel.transform, false);
            var scoreText = scoreObj.AddComponent<Text>();
            scoreText.text = "Score: 0";
            scoreText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            scoreText.fontSize = 24;
            scoreText.fontStyle = FontStyle.Bold;
            scoreText.color = Color.white;
            scoreText.alignment = TextAnchor.MiddleLeft;
            var scoreRect = scoreObj.GetComponent<RectTransform>();
            scoreRect.anchorMin = new Vector2(0, 0);
            scoreRect.anchorMax = new Vector2(0.2f, 1);
            scoreRect.offsetMin = new Vector2(10, 0);
            scoreRect.offsetMax = Vector2.zero;
            var scoreOutline = scoreObj.AddComponent<Outline>();
            scoreOutline.effectColor = new Color(0, 0, 0, 0.8f);
            scoreOutline.effectDistance = new Vector2(1, -1);

            // Lives Text (right)
            var livesObj = new GameObject("LivesText");
            livesObj.transform.SetParent(hudPanel.transform, false);
            var livesText = livesObj.AddComponent<Text>();
            livesText.text = "Lives: 3";
            livesText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            livesText.fontSize = 24;
            livesText.fontStyle = FontStyle.Bold;
            livesText.color = new Color(1f, 0.4f, 0.4f);
            livesText.alignment = TextAnchor.MiddleRight;
            var livesRect = livesObj.GetComponent<RectTransform>();
            livesRect.anchorMin = new Vector2(0.8f, 0);
            livesRect.anchorMax = new Vector2(1, 1);
            livesRect.offsetMin = Vector2.zero;
            livesRect.offsetMax = new Vector2(-10, 0);
            var livesOutline = livesObj.AddComponent<Outline>();
            livesOutline.effectColor = new Color(0, 0, 0, 0.8f);
            livesOutline.effectDistance = new Vector2(1, -1);

            // Timer Text (below prompt)
            var timerObj = new GameObject("TimerText");
            timerObj.transform.SetParent(canvasObj.transform, false);
            var timerText = timerObj.AddComponent<Text>();
            timerText.text = "";
            timerText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            timerText.fontSize = 20;
            timerText.fontStyle = FontStyle.Bold;
            timerText.color = Color.cyan;
            timerText.alignment = TextAnchor.UpperCenter;
            var timerRect = timerObj.GetComponent<RectTransform>();
            timerRect.anchorMin = new Vector2(0.5f, 1);
            timerRect.anchorMax = new Vector2(0.5f, 1);
            timerRect.pivot = new Vector2(0.5f, 1);
            timerRect.anchoredPosition = new Vector2(0, -100);
            timerRect.sizeDelta = new Vector2(200, 40);
            var timerOutline = timerObj.AddComponent<Outline>();
            timerOutline.effectColor = new Color(0, 0, 0, 0.8f);
            timerOutline.effectDistance = new Vector2(1, -1);

            // Hint Text (persistent during play, bottom center)
            var hintObj = new GameObject("HintText");
            hintObj.transform.SetParent(canvasObj.transform, false);
            var hintText = hintObj.AddComponent<Text>();
            hintText.text = "Tap the rhyming word!";
            hintText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            hintText.fontSize = 16;
            hintText.color = new Color(0.7f, 0.8f, 0.9f, 0.8f);
            hintText.alignment = TextAnchor.LowerCenter;
            var hintRect = hintObj.GetComponent<RectTransform>();
            hintRect.anchorMin = new Vector2(0.5f, 0);
            hintRect.anchorMax = new Vector2(0.5f, 0);
            hintRect.pivot = new Vector2(0.5f, 0);
            hintRect.anchoredPosition = new Vector2(0, 20);
            hintRect.sizeDelta = new Vector2(300, 30);
            hintObj.SetActive(false);

            // Game Over Panel
            var gameOverPanel = new GameObject("GameOverPanel");
            gameOverPanel.transform.SetParent(canvasObj.transform, false);
            var panelImage = gameOverPanel.AddComponent<Image>();
            panelImage.color = new Color(0, 0, 0, 0.85f);
            var panelRect = gameOverPanel.GetComponent<RectTransform>();
            panelRect.anchorMin = Vector2.zero;
            panelRect.anchorMax = Vector2.one;
            panelRect.offsetMin = Vector2.zero;
            panelRect.offsetMax = Vector2.zero;
            gameOverPanel.SetActive(false);

            var gameOverTextObj = new GameObject("GameOverText");
            gameOverTextObj.transform.SetParent(gameOverPanel.transform, false);
            var gameOverText = gameOverTextObj.AddComponent<Text>();
            gameOverText.text = "Game Over";
            gameOverText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            gameOverText.fontSize = 42;
            gameOverText.color = Color.white;
            gameOverText.alignment = TextAnchor.MiddleCenter;
            var gameOverRect = gameOverTextObj.GetComponent<RectTransform>();
            gameOverRect.anchorMin = Vector2.zero;
            gameOverRect.anchorMax = Vector2.one;
            gameOverRect.offsetMin = Vector2.zero;
            gameOverRect.offsetMax = Vector2.zero;

            // Intro Panel (shown before game starts)
            var introPanel = new GameObject("IntroPanel");
            introPanel.transform.SetParent(canvasObj.transform, false);
            var introPanelImage = introPanel.AddComponent<Image>();
            introPanelImage.color = new Color(0.05f, 0.1f, 0.2f, 0.95f);
            var introPanelRect = introPanel.GetComponent<RectTransform>();
            introPanelRect.anchorMin = Vector2.zero;
            introPanelRect.anchorMax = Vector2.one;
            introPanelRect.offsetMin = Vector2.zero;
            introPanelRect.offsetMax = Vector2.zero;

            // Intro Title
            var introTitleObj = new GameObject("IntroTitle");
            introTitleObj.transform.SetParent(introPanel.transform, false);
            var introTitle = introTitleObj.AddComponent<Text>();
            introTitle.text = "Rhyme & Ride";
            introTitle.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            introTitle.fontSize = 48;
            introTitle.fontStyle = FontStyle.Bold;
            introTitle.color = Color.yellow;
            introTitle.alignment = TextAnchor.MiddleCenter;
            var introTitleRect = introTitleObj.GetComponent<RectTransform>();
            introTitleRect.anchorMin = new Vector2(0, 0.65f);
            introTitleRect.anchorMax = new Vector2(1, 0.85f);
            introTitleRect.offsetMin = Vector2.zero;
            introTitleRect.offsetMax = Vector2.zero;
            var titleOutline = introTitleObj.AddComponent<Outline>();
            titleOutline.effectColor = new Color(0.1f, 0.1f, 0.3f, 1f);
            titleOutline.effectDistance = new Vector2(3, -3);
            var titleShadow = introTitleObj.AddComponent<Shadow>();
            titleShadow.effectColor = new Color(0, 0, 0, 0.6f);
            titleShadow.effectDistance = new Vector2(4, -4);

            // Intro Instructions
            var introInstrObj = new GameObject("IntroInstructions");
            introInstrObj.transform.SetParent(introPanel.transform, false);
            var introInstr = introInstrObj.AddComponent<Text>();
            introInstr.text = "Tap the word that RHYMES\nwith the prompt word!\n\nAvoid wrong words - they cost a life!";
            introInstr.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            introInstr.fontSize = 24;
            introInstr.color = Color.white;
            introInstr.alignment = TextAnchor.MiddleCenter;
            var introInstrRect = introInstrObj.GetComponent<RectTransform>();
            introInstrRect.anchorMin = new Vector2(0.1f, 0.35f);
            introInstrRect.anchorMax = new Vector2(0.9f, 0.6f);
            introInstrRect.offsetMin = Vector2.zero;
            introInstrRect.offsetMax = Vector2.zero;

            // Start Button
            var startBtnObj = new GameObject("StartButton");
            startBtnObj.transform.SetParent(introPanel.transform, false);
            var startBtn = startBtnObj.AddComponent<Button>();
            var startBtnImage = startBtnObj.AddComponent<Image>();
            startBtnImage.color = new Color(0.2f, 0.7f, 0.3f);
            var startBtnRect = startBtnObj.GetComponent<RectTransform>();
            startBtnRect.anchorMin = new Vector2(0.3f, 0.15f);
            startBtnRect.anchorMax = new Vector2(0.7f, 0.28f);
            startBtnRect.offsetMin = Vector2.zero;
            startBtnRect.offsetMax = Vector2.zero;

            // Start Button Text
            var startBtnTextObj = new GameObject("Text");
            startBtnTextObj.transform.SetParent(startBtnObj.transform, false);
            var startBtnText = startBtnTextObj.AddComponent<Text>();
            startBtnText.text = "START";
            startBtnText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            startBtnText.fontSize = 32;
            startBtnText.fontStyle = FontStyle.Bold;
            startBtnText.color = Color.white;
            startBtnText.alignment = TextAnchor.MiddleCenter;
            var startBtnTextRect = startBtnTextObj.GetComponent<RectTransform>();
            startBtnTextRect.anchorMin = Vector2.zero;
            startBtnTextRect.anchorMax = Vector2.one;
            startBtnTextRect.offsetMin = Vector2.zero;
            startBtnTextRect.offsetMax = Vector2.zero;

            introPanel.SetActive(false);

            // Create Target Prefab
            var targetPrefab = CreateTargetPrefab();

            // Create lane backgrounds (visual guides)
            CreateLaneBackgrounds();

            // Wire up GameManager references via SerializedObject
            var so = new SerializedObject(gameManager);
            so.FindProperty("scoreText").objectReferenceValue = scoreText;
            so.FindProperty("promptText").objectReferenceValue = promptText;
            so.FindProperty("livesText").objectReferenceValue = livesText;
            so.FindProperty("timerText").objectReferenceValue = timerText;
            so.FindProperty("gameOverPanel").objectReferenceValue = gameOverPanel;
            so.FindProperty("gameOverText").objectReferenceValue = gameOverText;
            so.FindProperty("targetPrefab").objectReferenceValue = targetPrefab;
            so.FindProperty("introPanel").objectReferenceValue = introPanel;
            so.FindProperty("startButton").objectReferenceValue = startBtn;
            so.FindProperty("hintText").objectReferenceValue = hintText;
            so.ApplyModifiedProperties();

            // Save scene
            var scenePath = "Assets/Scenes/RhymeRideMain.unity";
            EditorSceneManager.SaveScene(newScene, scenePath);

            // Add scene to Build Settings
            AddSceneToBuildSettings(scenePath);

            Debug.Log("[RhymeRideSceneBuilder] Scene built successfully at " + scenePath);
            EditorUtility.DisplayDialog("Scene Generated",
                "Rhyme & Ride scene created at:\n" + scenePath +
                "\n\nScene has been added to Build Settings.", "OK");
        }

        private static GameObject CreateUIPanel(Transform parent, string name,
            Vector2 anchorMin, Vector2 anchorMax, Vector2 pivot,
            Vector2 offsetMin, Vector2 offsetMax)
        {
            var panel = new GameObject(name);
            panel.transform.SetParent(parent, false);
            var rect = panel.AddComponent<RectTransform>();
            rect.anchorMin = anchorMin;
            rect.anchorMax = anchorMax;
            rect.pivot = pivot;
            rect.offsetMin = offsetMin;
            rect.offsetMax = offsetMax;
            return panel;
        }

        private static GameObject CreateTargetPrefab()
        {
            // Create target prefab
            var targetObj = new GameObject("Target");

            // Background sprite
            var bgObj = new GameObject("Background");
            bgObj.transform.SetParent(targetObj.transform, false);
            var bgSprite = bgObj.AddComponent<SpriteRenderer>();
            bgSprite.color = new Color(0.3f, 0.5f, 0.8f);
            bgSprite.sortingOrder = 0;

            // Create a simple white square sprite
            var texture = new Texture2D(64, 64);
            var colors = new Color[64 * 64];
            for (int i = 0; i < colors.Length; i++) colors[i] = Color.white;
            texture.SetPixels(colors);
            texture.Apply();
            bgSprite.sprite = Sprite.Create(texture, new Rect(0, 0, 64, 64), new Vector2(0.5f, 0.5f), 64);
            bgObj.transform.localScale = new Vector3(2.5f, 1.2f, 1f);

            // Add collider for clicking
            var collider = targetObj.AddComponent<BoxCollider2D>();
            collider.size = new Vector2(2.5f, 1.2f);

            // Shadow text (behind main text for depth effect)
            var shadowTextObj = new GameObject("ShadowText");
            shadowTextObj.transform.SetParent(targetObj.transform, false);
            var shadowTextMesh = shadowTextObj.AddComponent<TextMesh>();
            shadowTextMesh.text = "WORD";
            shadowTextMesh.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            shadowTextMesh.fontSize = 56;
            shadowTextMesh.fontStyle = FontStyle.Bold;
            shadowTextMesh.characterSize = 0.08f;
            shadowTextMesh.anchor = TextAnchor.MiddleCenter;
            shadowTextMesh.alignment = TextAlignment.Center;
            shadowTextMesh.color = new Color(0, 0, 0, 0.6f);
            shadowTextObj.transform.localPosition = new Vector3(0.06f, -0.06f, 0f);

            // Word text (using TextMesh for world space)
            var textObj = new GameObject("WordText");
            textObj.transform.SetParent(targetObj.transform, false);
            var textMesh = textObj.AddComponent<TextMesh>();
            textMesh.text = "WORD";
            textMesh.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            textMesh.fontSize = 56;
            textMesh.fontStyle = FontStyle.Bold;
            textMesh.characterSize = 0.08f;
            textMesh.anchor = TextAnchor.MiddleCenter;
            textMesh.alignment = TextAlignment.Center;
            textMesh.color = Color.white;
            textObj.transform.localPosition = new Vector3(0, 0, -0.1f);

            // Add Target script
            var target = targetObj.AddComponent<RhymeRideTarget>();

            // Wire up references
            var so = new SerializedObject(target);
            so.FindProperty("backgroundSprite").objectReferenceValue = bgSprite;
            so.FindProperty("wordText").objectReferenceValue = textMesh;
            so.FindProperty("shadowText").objectReferenceValue = shadowTextMesh;
            so.ApplyModifiedProperties();

            // Save as prefab
            var prefabPath = "Assets/Prefabs/Target.prefab";
            var prefab = PrefabUtility.SaveAsPrefabAsset(targetObj, prefabPath);

            // Destroy the scene instance
            Object.DestroyImmediate(targetObj);

            Debug.Log("[RhymeRideSceneBuilder] Target prefab created at " + prefabPath);
            return prefab;
        }

        private static void CreateLaneBackgrounds()
        {
            // Create lane visual guides (3 horizontal lanes)
            float[] laneY = { 2f, 0f, -2f };
            Color[] laneColors = {
                new Color(0.15f, 0.2f, 0.3f, 0.5f),
                new Color(0.12f, 0.18f, 0.28f, 0.5f),
                new Color(0.15f, 0.2f, 0.3f, 0.5f)
            };

            var lanesParent = new GameObject("Lanes");

            for (int i = 0; i < 3; i++)
            {
                var laneObj = new GameObject($"Lane_{i}");
                laneObj.transform.SetParent(lanesParent.transform, false);
                laneObj.transform.position = new Vector3(0, laneY[i], 1);

                var sprite = laneObj.AddComponent<SpriteRenderer>();
                sprite.color = laneColors[i];
                sprite.sortingOrder = -10;

                // Create lane background sprite
                var texture = new Texture2D(1, 1);
                texture.SetPixel(0, 0, Color.white);
                texture.Apply();
                sprite.sprite = Sprite.Create(texture, new Rect(0, 0, 1, 1), new Vector2(0.5f, 0.5f), 1);
                laneObj.transform.localScale = new Vector3(20f, 1.5f, 1f);

                // Add click handler for lane
                var collider = laneObj.AddComponent<BoxCollider2D>();
                collider.size = new Vector2(1f, 1f);
                collider.isTrigger = true;

                var handler = laneObj.AddComponent<LaneTouchHandler>();
                var so = new SerializedObject(handler);
                so.FindProperty("laneIndex").intValue = i;
                so.ApplyModifiedProperties();
            }
        }

        private static void AddSceneToBuildSettings(string scenePath)
        {
            var scenes = new List<EditorBuildSettingsScene>(EditorBuildSettings.scenes);

            // Check if scene already exists
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
            Debug.Log("[RhymeRideSceneBuilder] Added scene to Build Settings: " + scenePath);
        }
    }

    /// <summary>
    /// Simple component to handle lane touches/clicks.
    /// </summary>
    public class LaneTouchHandler : MonoBehaviour
    {
        [SerializeField] private int laneIndex;

        private void OnMouseDown()
        {
            if (RhymeRideGameManager.Instance != null)
            {
                RhymeRideGameManager.Instance.OnLaneTap(laneIndex);
            }
        }
    }
}
