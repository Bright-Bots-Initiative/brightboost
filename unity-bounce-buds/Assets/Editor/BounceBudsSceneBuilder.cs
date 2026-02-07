using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using System.Collections.Generic;

namespace BrightBoost
{
    /// <summary>
    /// Editor script to auto-generate the Bounce & Buds scene and prefabs.
    /// Menu: Tools/BrightBoost/Bounce & Buds/Generate Scene
    /// </summary>
    public class BounceBudsSceneBuilder : EditorWindow
    {
        [MenuItem("Tools/BrightBoost/Bounce & Buds/Generate Scene")]
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
            if (!AssetDatabase.IsValidFolder("Assets/Materials"))
            {
                AssetDatabase.CreateFolder("Assets", "Materials");
            }

            // Create a new scene
            var newScene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // Create bouncy physics material
            var bouncyMat = CreateBouncyMaterial();

            // Create Main Camera
            var cameraObj = new GameObject("Main Camera");
            var camera = cameraObj.AddComponent<Camera>();
            camera.orthographic = true;
            camera.orthographicSize = 6;
            camera.backgroundColor = new Color(0.1f, 0.2f, 0.15f);
            camera.clearFlags = CameraClearFlags.SolidColor;
            cameraObj.AddComponent<AudioListener>();
            cameraObj.transform.position = new Vector3(0, 0, -10);
            cameraObj.tag = "MainCamera";

            // Create WebBridge
            var webBridgeObj = new GameObject("WebBridge");
            webBridgeObj.AddComponent<WebBridge>();

            // Create GameManager
            var gameManagerObj = new GameObject("GameManager");
            var gameManager = gameManagerObj.AddComponent<BounceBudsGameManager>();

            // Create Canvas for UI
            var canvasObj = new GameObject("Canvas");
            var canvas = canvasObj.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasObj.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(960, 600);
            canvasObj.AddComponent<GraphicRaycaster>();

            // EventSystem
            var eventSystemObj = new GameObject("EventSystem");
            eventSystemObj.AddComponent<EventSystem>();
            eventSystemObj.AddComponent<StandaloneInputModule>();

            // Create walls
            CreateWalls();

            // Create out of bounds zone
            CreateOutOfBoundsZone();

            // Create prefabs
            var ballPrefab = CreateBuddyBallPrefab(bouncyMat);
            var paddlePrefab = CreatePaddlePrefab(bouncyMat);
            var gatePrefab = CreateBudGatePrefab();
            var obstaclePrefab = CreateObstaclePrefab(bouncyMat);

            // Create UI elements
            var clueText = CreateClueText(canvasObj.transform);
            var hintText = CreateHintText(canvasObj.transform);
            var scoreText = CreateScoreText(canvasObj.transform);
            var livesText = CreateLivesText(canvasObj.transform);
            var timerText = CreateTimerText(canvasObj.transform);
            var gameOverPanel = CreateGameOverPanel(canvasObj.transform);
            var introPanel = CreateIntroPanel(canvasObj.transform);
            var launchButton = CreateLaunchButton(canvasObj.transform);

            // Wire up GameManager references
            var so = new SerializedObject(gameManager);
            so.FindProperty("buddyBallPrefab").objectReferenceValue = ballPrefab;
            so.FindProperty("paddlePrefab").objectReferenceValue = paddlePrefab;
            so.FindProperty("budGatePrefab").objectReferenceValue = gatePrefab;
            so.FindProperty("obstaclePrefab").objectReferenceValue = obstaclePrefab;
            so.FindProperty("clueText").objectReferenceValue = clueText;
            so.FindProperty("hintText").objectReferenceValue = hintText;
            so.FindProperty("scoreText").objectReferenceValue = scoreText;
            so.FindProperty("livesText").objectReferenceValue = livesText;
            so.FindProperty("timerText").objectReferenceValue = timerText;
            so.FindProperty("gameOverPanel").objectReferenceValue = gameOverPanel.gameObject;
            so.FindProperty("gameOverText").objectReferenceValue = gameOverPanel.GetComponentInChildren<Text>();
            so.FindProperty("introPanel").objectReferenceValue = introPanel.gameObject;
            so.FindProperty("startButton").objectReferenceValue = introPanel.GetComponentInChildren<Button>();
            so.FindProperty("launchButton").objectReferenceValue = launchButton;
            so.ApplyModifiedProperties();

            // Save scene
            var scenePath = "Assets/Scenes/BounceBudsMain.unity";
            EditorSceneManager.SaveScene(newScene, scenePath);

            // Add scene to Build Settings
            AddSceneToBuildSettings(scenePath);

            Debug.Log("[BounceBudsSceneBuilder] Scene built successfully at " + scenePath);
            EditorUtility.DisplayDialog("Scene Generated",
                "Bounce & Buds scene created at:\n" + scenePath +
                "\n\nScene has been added to Build Settings.", "OK");
        }

        private static PhysicsMaterial2D CreateBouncyMaterial()
        {
            var mat = new PhysicsMaterial2D("BouncyMaterial");
            mat.bounciness = 1f;
            mat.friction = 0f;
            AssetDatabase.CreateAsset(mat, "Assets/Materials/BouncyMaterial.asset");
            return mat;
        }

        private static void CreateWalls()
        {
            var wallsParent = new GameObject("Walls");

            // Left wall
            var leftWall = new GameObject("LeftWall");
            leftWall.transform.SetParent(wallsParent.transform);
            leftWall.transform.position = new Vector3(-7f, 0, 0);
            var leftCollider = leftWall.AddComponent<BoxCollider2D>();
            leftCollider.size = new Vector2(1f, 14f);

            // Right wall
            var rightWall = new GameObject("RightWall");
            rightWall.transform.SetParent(wallsParent.transform);
            rightWall.transform.position = new Vector3(7f, 0, 0);
            var rightCollider = rightWall.AddComponent<BoxCollider2D>();
            rightCollider.size = new Vector2(1f, 14f);

            // Top wall
            var topWall = new GameObject("TopWall");
            topWall.transform.SetParent(wallsParent.transform);
            topWall.transform.position = new Vector3(0, 6f, 0);
            var topCollider = topWall.AddComponent<BoxCollider2D>();
            topCollider.size = new Vector2(14f, 1f);
        }

        private static void CreateOutOfBoundsZone()
        {
            var zone = new GameObject("OutOfBoundsZone");
            zone.transform.position = new Vector3(0, -6.5f, 0);
            var collider = zone.AddComponent<BoxCollider2D>();
            collider.size = new Vector2(16f, 1f);
            collider.isTrigger = true;
            zone.AddComponent<OutOfBoundsZone>();
        }

        private static GameObject CreateBuddyBallPrefab(PhysicsMaterial2D bouncyMat)
        {
            var ball = new GameObject("BuddyBall");

            // Sprite
            var sprite = ball.AddComponent<SpriteRenderer>();
            sprite.color = new Color(0.4f, 0.8f, 0.5f);
            var texture = CreateCircleTexture(64, Color.white);
            sprite.sprite = Sprite.Create(texture, new Rect(0, 0, 64, 64), new Vector2(0.5f, 0.5f), 64);
            ball.transform.localScale = new Vector3(0.6f, 0.6f, 1f);

            // Rigidbody2D
            var rb = ball.AddComponent<Rigidbody2D>();
            rb.gravityScale = 0;
            rb.linearDamping = 0;
            rb.angularDamping = 0;
            rb.collisionDetectionMode = CollisionDetectionMode2D.Continuous;

            // Collider
            var collider = ball.AddComponent<CircleCollider2D>();
            collider.radius = 0.5f;
            collider.sharedMaterial = bouncyMat;

            // Script
            ball.AddComponent<BuddyBall>();

            // Save prefab
            var prefab = PrefabUtility.SaveAsPrefabAsset(ball, "Assets/Prefabs/BuddyBall.prefab");
            Object.DestroyImmediate(ball);
            return prefab;
        }

        private static GameObject CreatePaddlePrefab(PhysicsMaterial2D bouncyMat)
        {
            var paddle = new GameObject("Paddle");

            // Sprite
            var sprite = paddle.AddComponent<SpriteRenderer>();
            sprite.color = new Color(0.3f, 0.5f, 0.8f);
            var texture = CreateSquareTexture(64, Color.white);
            sprite.sprite = Sprite.Create(texture, new Rect(0, 0, 64, 64), new Vector2(0.5f, 0.5f), 64);
            paddle.transform.localScale = new Vector3(2.5f, 0.4f, 1f);

            // Rigidbody2D (Kinematic)
            var rb = paddle.AddComponent<Rigidbody2D>();
            rb.bodyType = RigidbodyType2D.Kinematic;

            // Collider
            var collider = paddle.AddComponent<BoxCollider2D>();
            collider.size = new Vector2(1f, 1f);
            collider.sharedMaterial = bouncyMat;

            // Script
            paddle.AddComponent<PaddleController>();

            // Save prefab
            var prefab = PrefabUtility.SaveAsPrefabAsset(paddle, "Assets/Prefabs/Paddle.prefab");
            Object.DestroyImmediate(paddle);
            return prefab;
        }

        private static GameObject CreateBudGatePrefab()
        {
            var gate = new GameObject("BudGate");

            // Background sprite
            var bgSprite = gate.AddComponent<SpriteRenderer>();
            bgSprite.color = new Color(0.3f, 0.6f, 0.4f);
            var texture = CreateSquareTexture(64, Color.white);
            bgSprite.sprite = Sprite.Create(texture, new Rect(0, 0, 64, 64), new Vector2(0.5f, 0.5f), 64);
            gate.transform.localScale = new Vector3(2f, 1.2f, 1f);

            // Label text
            var textObj = new GameObject("Label");
            textObj.transform.SetParent(gate.transform, false);
            var textMesh = textObj.AddComponent<TextMesh>();
            textMesh.text = "ANSWER";
            textMesh.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            textMesh.fontSize = 48;
            textMesh.fontStyle = FontStyle.Bold;
            textMesh.characterSize = 0.1f;
            textMesh.anchor = TextAnchor.MiddleCenter;
            textMesh.alignment = TextAlignment.Center;
            textMesh.color = Color.white;
            textObj.transform.localPosition = new Vector3(0, 0, -0.1f);

            // Trigger collider
            var collider = gate.AddComponent<BoxCollider2D>();
            collider.size = new Vector2(1f, 1f);
            collider.isTrigger = true;

            // Script
            var gateScript = gate.AddComponent<BudGate>();
            var so = new SerializedObject(gateScript);
            so.FindProperty("labelText").objectReferenceValue = textMesh;
            so.FindProperty("backgroundSprite").objectReferenceValue = bgSprite;
            so.ApplyModifiedProperties();

            // Save prefab
            var prefab = PrefabUtility.SaveAsPrefabAsset(gate, "Assets/Prefabs/BudGate.prefab");
            Object.DestroyImmediate(gate);
            return prefab;
        }

        private static GameObject CreateObstaclePrefab(PhysicsMaterial2D bouncyMat)
        {
            var obstacle = new GameObject("Obstacle");

            // Sprite
            var sprite = obstacle.AddComponent<SpriteRenderer>();
            sprite.color = new Color(0.5f, 0.4f, 0.3f);
            var texture = CreateCircleTexture(64, Color.white);
            sprite.sprite = Sprite.Create(texture, new Rect(0, 0, 64, 64), new Vector2(0.5f, 0.5f), 64);
            obstacle.transform.localScale = new Vector3(0.8f, 0.8f, 1f);

            // Collider
            var collider = obstacle.AddComponent<CircleCollider2D>();
            collider.radius = 0.5f;
            collider.sharedMaterial = bouncyMat;

            // Script
            obstacle.AddComponent<ObstacleBumper>();

            // Save prefab
            var prefab = PrefabUtility.SaveAsPrefabAsset(obstacle, "Assets/Prefabs/Obstacle.prefab");
            Object.DestroyImmediate(obstacle);
            return prefab;
        }

        private static Text CreateClueText(Transform parent)
        {
            var obj = new GameObject("ClueText");
            obj.transform.SetParent(parent, false);
            var text = obj.AddComponent<Text>();
            text.text = "Read the clue!";
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 28;
            text.fontStyle = FontStyle.Bold;
            text.color = Color.yellow;
            text.alignment = TextAnchor.UpperCenter;
            var rect = obj.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0.1f, 0.85f);
            rect.anchorMax = new Vector2(0.9f, 0.98f);
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
            var outline = obj.AddComponent<Outline>();
            outline.effectColor = new Color(0, 0, 0, 0.8f);
            outline.effectDistance = new Vector2(2, -2);
            return text;
        }

        private static Text CreateHintText(Transform parent)
        {
            var obj = new GameObject("HintText");
            obj.transform.SetParent(parent, false);
            var text = obj.AddComponent<Text>();
            text.text = "Hint: ...";
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 16;
            text.color = new Color(0.7f, 0.9f, 0.8f, 0.9f);
            text.alignment = TextAnchor.LowerCenter;
            var rect = obj.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0.2f, 0.02f);
            rect.anchorMax = new Vector2(0.8f, 0.1f);
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
            obj.SetActive(false);
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
            rect.anchorMin = new Vector2(0.4f, 0.78f);
            rect.anchorMax = new Vector2(0.6f, 0.85f);
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
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
            image.color = new Color(0.05f, 0.15f, 0.1f, 0.95f);
            var rect = panel.GetComponent<RectTransform>();
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;

            // Title
            var titleObj = new GameObject("Title");
            titleObj.transform.SetParent(panel.transform, false);
            var title = titleObj.AddComponent<Text>();
            title.text = "Bounce & Buds";
            title.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            title.fontSize = 48;
            title.fontStyle = FontStyle.Bold;
            title.color = new Color(0.5f, 1f, 0.6f);
            title.alignment = TextAnchor.MiddleCenter;
            var titleRect = titleObj.GetComponent<RectTransform>();
            titleRect.anchorMin = new Vector2(0, 0.65f);
            titleRect.anchorMax = new Vector2(1, 0.85f);
            titleRect.offsetMin = Vector2.zero;
            titleRect.offsetMax = Vector2.zero;
            titleObj.AddComponent<Outline>().effectDistance = new Vector2(3, -3);

            // Instructions
            var instrObj = new GameObject("Instructions");
            instrObj.transform.SetParent(panel.transform, false);
            var instr = instrObj.AddComponent<Text>();
            instr.text = "Bounce Buddy into the correct gate!\n\nRead the clue and find the answer.\nUse arrows/A/D or drag to move paddle.";
            instr.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            instr.fontSize = 22;
            instr.color = Color.white;
            instr.alignment = TextAnchor.MiddleCenter;
            var instrRect = instrObj.GetComponent<RectTransform>();
            instrRect.anchorMin = new Vector2(0.1f, 0.35f);
            instrRect.anchorMax = new Vector2(0.9f, 0.6f);
            instrRect.offsetMin = Vector2.zero;
            instrRect.offsetMax = Vector2.zero;

            // Start Button
            var btnObj = new GameObject("StartButton");
            btnObj.transform.SetParent(panel.transform, false);
            var btn = btnObj.AddComponent<Button>();
            var btnImage = btnObj.AddComponent<Image>();
            btnImage.color = new Color(0.2f, 0.7f, 0.3f);
            var btnRect = btnObj.GetComponent<RectTransform>();
            btnRect.anchorMin = new Vector2(0.3f, 0.15f);
            btnRect.anchorMax = new Vector2(0.7f, 0.28f);
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

        private static Button CreateLaunchButton(Transform parent)
        {
            var btnObj = new GameObject("LaunchButton");
            btnObj.transform.SetParent(parent, false);

            var btn = btnObj.AddComponent<Button>();
            var btnImage = btnObj.AddComponent<Image>();
            btnImage.color = new Color(0.3f, 0.7f, 0.9f); // Bright blue for visibility

            var btnRect = btnObj.GetComponent<RectTransform>();
            // Position at bottom center, above the hint text area
            btnRect.anchorMin = new Vector2(0.35f, 0.12f);
            btnRect.anchorMax = new Vector2(0.65f, 0.22f);
            btnRect.offsetMin = Vector2.zero;
            btnRect.offsetMax = Vector2.zero;

            // Button text
            var textObj = new GameObject("Text");
            textObj.transform.SetParent(btnObj.transform, false);
            var text = textObj.AddComponent<Text>();
            text.text = "LAUNCH!";
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

            // Add outline for visibility
            var outline = textObj.AddComponent<Outline>();
            outline.effectColor = new Color(0, 0, 0, 0.7f);
            outline.effectDistance = new Vector2(2, -2);

            // Start hidden - will be shown during gameplay
            btnObj.SetActive(false);

            return btn;
        }

        private static Texture2D CreateCircleTexture(int size, Color color)
        {
            var tex = new Texture2D(size, size);
            float radius = size / 2f;
            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    float dist = Vector2.Distance(new Vector2(x, y), new Vector2(radius, radius));
                    tex.SetPixel(x, y, dist < radius ? color : Color.clear);
                }
            }
            tex.Apply();
            return tex;
        }

        private static Texture2D CreateSquareTexture(int size, Color color)
        {
            var tex = new Texture2D(size, size);
            var colors = new Color[size * size];
            for (int i = 0; i < colors.Length; i++) colors[i] = color;
            tex.SetPixels(colors);
            tex.Apply();
            return tex;
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
            Debug.Log("[BounceBudsSceneBuilder] Added scene to Build Settings: " + scenePath);
        }
    }
}
