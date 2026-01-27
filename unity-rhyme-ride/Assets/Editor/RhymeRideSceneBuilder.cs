using UnityEngine;
using UnityEditor;
using UnityEngine.UI;

/// <summary>
/// Editor script to auto-generate the Rhyme & Ride scene and prefabs.
/// Menu: BrightBoost > Build Rhyme & Ride Scene
/// </summary>
public class RhymeRideSceneBuilder : EditorWindow
{
    [MenuItem("BrightBoost/Build Rhyme & Ride Scene")]
    public static void BuildScene()
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

        // Clear existing scene objects
        foreach (var go in Object.FindObjectsOfType<GameObject>())
        {
            if (go.transform.parent == null)
            {
                Object.DestroyImmediate(go);
            }
        }

        // Create Main Camera
        var cameraObj = new GameObject("Main Camera");
        var camera = cameraObj.AddComponent<Camera>();
        camera.orthographic = true;
        camera.orthographicSize = 7;
        camera.backgroundColor = new Color(0.1f, 0.1f, 0.2f);
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
        canvasObj.AddComponent<CanvasScaler>();
        canvasObj.AddComponent<GraphicRaycaster>();

        // Score Text
        var scoreObj = new GameObject("ScoreText");
        scoreObj.transform.SetParent(canvasObj.transform, false);
        var scoreText = scoreObj.AddComponent<Text>();
        scoreText.text = "Score: 0";
        scoreText.fontSize = 36;
        scoreText.color = Color.white;
        scoreText.alignment = TextAnchor.UpperLeft;
        var scoreRect = scoreObj.GetComponent<RectTransform>();
        scoreRect.anchorMin = new Vector2(0, 1);
        scoreRect.anchorMax = new Vector2(0, 1);
        scoreRect.pivot = new Vector2(0, 1);
        scoreRect.anchoredPosition = new Vector2(20, -20);
        scoreRect.sizeDelta = new Vector2(200, 50);

        // Prompt Text
        var promptObj = new GameObject("PromptText");
        promptObj.transform.SetParent(canvasObj.transform, false);
        var promptText = promptObj.AddComponent<Text>();
        promptText.text = "Find the rhyme for: ???";
        promptText.fontSize = 32;
        promptText.color = Color.yellow;
        promptText.alignment = TextAnchor.UpperCenter;
        var promptRect = promptObj.GetComponent<RectTransform>();
        promptRect.anchorMin = new Vector2(0.5f, 1);
        promptRect.anchorMax = new Vector2(0.5f, 1);
        promptRect.pivot = new Vector2(0.5f, 1);
        promptRect.anchoredPosition = new Vector2(0, -20);
        promptRect.sizeDelta = new Vector2(400, 50);

        // Lives Text
        var livesObj = new GameObject("LivesText");
        livesObj.transform.SetParent(canvasObj.transform, false);
        var livesText = livesObj.AddComponent<Text>();
        livesText.text = "Lives: 3";
        livesText.fontSize = 36;
        livesText.color = Color.red;
        livesText.alignment = TextAnchor.UpperRight;
        var livesRect = livesObj.GetComponent<RectTransform>();
        livesRect.anchorMin = new Vector2(1, 1);
        livesRect.anchorMax = new Vector2(1, 1);
        livesRect.pivot = new Vector2(1, 1);
        livesRect.anchoredPosition = new Vector2(-20, -20);
        livesRect.sizeDelta = new Vector2(200, 50);

        // Game Over Panel
        var gameOverPanel = new GameObject("GameOverPanel");
        gameOverPanel.transform.SetParent(canvasObj.transform, false);
        var panelImage = gameOverPanel.AddComponent<Image>();
        panelImage.color = new Color(0, 0, 0, 0.8f);
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
        gameOverText.fontSize = 48;
        gameOverText.color = Color.white;
        gameOverText.alignment = TextAnchor.MiddleCenter;
        var gameOverRect = gameOverTextObj.GetComponent<RectTransform>();
        gameOverRect.anchorMin = Vector2.zero;
        gameOverRect.anchorMax = Vector2.one;
        gameOverRect.offsetMin = Vector2.zero;
        gameOverRect.offsetMax = Vector2.zero;

        // Create Target Prefab
        var targetPrefab = CreateTargetPrefab();

        // Wire up GameManager references via SerializedObject
        var so = new SerializedObject(gameManager);
        so.FindProperty("scoreText").objectReferenceValue = scoreText;
        so.FindProperty("promptText").objectReferenceValue = promptText;
        so.FindProperty("livesText").objectReferenceValue = livesText;
        so.FindProperty("gameOverPanel").objectReferenceValue = gameOverPanel;
        so.FindProperty("gameOverText").objectReferenceValue = gameOverText;
        so.FindProperty("targetPrefab").objectReferenceValue = targetPrefab;
        so.ApplyModifiedProperties();

        // Create Lane Touch Zones
        CreateLaneTouchZones();

        // Save scene
        var scenePath = "Assets/Scenes/RhymeRideScene.unity";
        UnityEditor.SceneManagement.EditorSceneManager.SaveScene(
            UnityEditor.SceneManagement.EditorSceneManager.GetActiveScene(),
            scenePath
        );

        Debug.Log("[RhymeRideSceneBuilder] Scene built successfully at " + scenePath);
        EditorUtility.DisplayDialog("Scene Built", "Rhyme & Ride scene created at:\n" + scenePath, "OK");
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
        // Create a simple white square sprite
        var texture = new Texture2D(64, 64);
        var colors = new Color[64 * 64];
        for (int i = 0; i < colors.Length; i++) colors[i] = Color.white;
        texture.SetPixels(colors);
        texture.Apply();
        bgSprite.sprite = Sprite.Create(texture, new Rect(0, 0, 64, 64), new Vector2(0.5f, 0.5f), 64);
        bgObj.transform.localScale = new Vector3(2f, 1f, 1f);

        // Add collider for clicking
        var collider = targetObj.AddComponent<BoxCollider2D>();
        collider.size = new Vector2(2f, 1f);

        // Word text (using TextMesh for world space)
        var textObj = new GameObject("WordText");
        textObj.transform.SetParent(targetObj.transform, false);
        var textMesh = textObj.AddComponent<TextMesh>();
        textMesh.text = "WORD";
        textMesh.fontSize = 48;
        textMesh.characterSize = 0.1f;
        textMesh.anchor = TextAnchor.MiddleCenter;
        textMesh.alignment = TextAlignment.Center;
        textMesh.color = Color.white;
        textObj.transform.localPosition = new Vector3(0, 0, -0.1f);

        // Add Target script
        var target = targetObj.AddComponent<RhymeRideTarget>();

        // Wire up references
        var so = new SerializedObject(target);
        so.FindProperty("backgroundSprite").objectReferenceValue = bgSprite;
        so.ApplyModifiedProperties();

        // Save as prefab
        var prefabPath = "Assets/Prefabs/Target.prefab";
        var prefab = PrefabUtility.SaveAsPrefabAsset(targetObj, prefabPath);

        // Destroy the scene instance
        Object.DestroyImmediate(targetObj);

        Debug.Log("[RhymeRideSceneBuilder] Target prefab created at " + prefabPath);
        return prefab;
    }

    private static void CreateLaneTouchZones()
    {
        float[] laneX = { -3f, 0f, 3f };

        for (int i = 0; i < 3; i++)
        {
            var zoneObj = new GameObject($"LaneTouchZone_{i}");
            zoneObj.transform.position = new Vector3(laneX[i], 0, 0);

            var collider = zoneObj.AddComponent<BoxCollider2D>();
            collider.size = new Vector2(2.8f, 14f);
            collider.isTrigger = true;

            var handler = zoneObj.AddComponent<LaneTouchHandler>();
            var so = new SerializedObject(handler);
            so.FindProperty("laneIndex").intValue = i;
            so.ApplyModifiedProperties();
        }
    }
}

/// <summary>
/// Simple component to handle lane touches.
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
