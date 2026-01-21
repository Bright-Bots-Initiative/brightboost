/*
 * HOW TO USE:
 * 1. Open the Unity project (unity-spacewar)
 * 2. Go to menu: Tools → Spacewar → Generate Main Scene
 * 3. If scene/prefab already exist, confirm overwrite dialog
 * 4. Open Assets/Scenes/SpacewarMain.unity
 * 5. Press Play - two ships spawn, gravity well works, UI displays scores
 *
 * This script creates:
 * - Assets/Prefabs/Projectile.prefab
 * - Assets/Scenes/SpacewarMain.unity (fully wired scene)
 */

using UnityEngine;
using UnityEngine.UI;
using UnityEditor;
using UnityEditor.SceneManagement;
using System.IO;

public class SpacewarSceneBuilder : Editor
{
    private const string SCENE_PATH = "Assets/Scenes/SpacewarMain.unity";
    private const string PREFAB_PATH = "Assets/Prefabs/Projectile.prefab";
    private const string SCENES_FOLDER = "Assets/Scenes";
    private const string PREFABS_FOLDER = "Assets/Prefabs";

    [MenuItem("Tools/Spacewar/Generate Main Scene")]
    public static void GenerateMainScene()
    {
        // Check for existing files and prompt
        bool sceneExists = File.Exists(SCENE_PATH);
        bool prefabExists = File.Exists(PREFAB_PATH);

        if (sceneExists || prefabExists)
        {
            string existingFiles = "";
            if (sceneExists) existingFiles += "- " + SCENE_PATH + "\n";
            if (prefabExists) existingFiles += "- " + PREFAB_PATH + "\n";

            bool overwrite = EditorUtility.DisplayDialog(
                "Overwrite?",
                "The following files already exist:\n" + existingFiles + "\nOverwrite them?",
                "OK",
                "Cancel"
            );

            if (!overwrite)
            {
                Debug.Log("[SpacewarSceneBuilder] Generation cancelled by user.");
                return;
            }
        }

        // Ensure folders exist
        EnsureFolderExists(SCENES_FOLDER);
        EnsureFolderExists(PREFABS_FOLDER);

        // Create prefab first (needed for scene)
        GameObject projectilePrefab = CreateProjectilePrefab();

        // Create scene
        CreateMainScene(projectilePrefab);

        Debug.Log("[SpacewarSceneBuilder] Scene and prefab generated successfully!");
        Debug.Log("[SpacewarSceneBuilder] Open " + SCENE_PATH + " and press Play to test.");
    }

    private static void EnsureFolderExists(string folderPath)
    {
        if (!AssetDatabase.IsValidFolder(folderPath))
        {
            string[] parts = folderPath.Split('/');
            string currentPath = parts[0]; // "Assets"

            for (int i = 1; i < parts.Length; i++)
            {
                string newPath = currentPath + "/" + parts[i];
                if (!AssetDatabase.IsValidFolder(newPath))
                {
                    AssetDatabase.CreateFolder(currentPath, parts[i]);
                }
                currentPath = newPath;
            }
        }
    }

    private static GameObject CreateProjectilePrefab()
    {
        // Create temporary GameObject
        GameObject projectile = new GameObject("Projectile");

        // SpriteRenderer - white circle
        SpriteRenderer sr = projectile.AddComponent<SpriteRenderer>();
        sr.sprite = CreateCircleSprite(8, Color.white);
        sr.sortingOrder = 5;
        projectile.transform.localScale = new Vector3(0.15f, 0.15f, 1f);

        // Rigidbody2D
        Rigidbody2D rb = projectile.AddComponent<Rigidbody2D>();
        rb.gravityScale = 0f;
        rb.collisionDetectionMode = CollisionDetectionMode2D.Continuous;

        // CircleCollider2D
        CircleCollider2D col = projectile.AddComponent<CircleCollider2D>();
        col.isTrigger = true;
        col.radius = 0.5f;

        // TrailRenderer
        TrailRenderer trail = projectile.AddComponent<TrailRenderer>();
        trail.time = 0.3f;
        trail.startWidth = 0.1f;
        trail.endWidth = 0f;
        trail.material = new Material(Shader.Find("Sprites/Default"));
        trail.startColor = Color.white;
        trail.endColor = new Color(1f, 1f, 1f, 0f);
        trail.sortingOrder = 4;

        // Scripts
        projectile.AddComponent<Projectile>();
        projectile.AddComponent<ScreenWrap>();

        // Save prefab
        if (File.Exists(PREFAB_PATH))
        {
            AssetDatabase.DeleteAsset(PREFAB_PATH);
        }

        GameObject prefab = PrefabUtility.SaveAsPrefabAsset(projectile, PREFAB_PATH);

        // Destroy temporary object
        DestroyImmediate(projectile);

        return prefab;
    }

    private static void CreateMainScene(GameObject projectilePrefab)
    {
        // Create new scene
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

        // === Main Camera ===
        GameObject cameraObj = new GameObject("Main Camera");
        cameraObj.tag = "MainCamera";
        Camera cam = cameraObj.AddComponent<Camera>();
        cam.orthographic = true;
        cam.orthographicSize = 6f;
        cam.backgroundColor = new Color(0.05f, 0.05f, 0.1f);
        cam.clearFlags = CameraClearFlags.SolidColor;
        cameraObj.AddComponent<AudioListener>();
        cameraObj.transform.position = new Vector3(0, 0, -10);

        // === GameManager ===
        GameObject gameManagerObj = new GameObject("GameManager");
        GameManager gameManager = gameManagerObj.AddComponent<GameManager>();
        gameManagerObj.AddComponent<AudioSource>();

        // === WebBridge ===
        GameObject webBridgeObj = new GameObject("WebBridge");
        webBridgeObj.AddComponent<WebBridge>();

        // === GravityWell ===
        GameObject gravityWellObj = new GameObject("GravityWell");
        gravityWellObj.tag = "GravityWell";
        gravityWellObj.transform.position = Vector3.zero;

        SpriteRenderer gwSprite = gravityWellObj.AddComponent<SpriteRenderer>();
        gwSprite.sprite = CreateCircleSprite(32, new Color(1f, 0.8f, 0.2f));
        gwSprite.sortingOrder = 0;
        gravityWellObj.transform.localScale = new Vector3(1.5f, 1.5f, 1f);

        CircleCollider2D gwCollider = gravityWellObj.AddComponent<CircleCollider2D>();
        gwCollider.isTrigger = true;
        gwCollider.radius = 0.5f; // Will be scaled by transform

        gravityWellObj.AddComponent<GravityWell>();

        // === Spawn Points ===
        GameObject spawnPoint1 = new GameObject("SpawnPoint1");
        spawnPoint1.transform.position = new Vector3(-4f, 0f, 0f);
        spawnPoint1.transform.rotation = Quaternion.Euler(0, 0, -90f);

        GameObject spawnPoint2 = new GameObject("SpawnPoint2");
        spawnPoint2.transform.position = new Vector3(4f, 0f, 0f);
        spawnPoint2.transform.rotation = Quaternion.Euler(0, 0, 90f);

        // === Player Ships ===
        GameObject player1Ship = CreateShip("Player1Ship", 1, "AI", new Color(0.2f, 0.6f, 1f), projectilePrefab);
        player1Ship.transform.position = spawnPoint1.transform.position;
        player1Ship.transform.rotation = spawnPoint1.transform.rotation;

        GameObject player2Ship = CreateShip("Player2Ship", 2, "QUANTUM", new Color(0.8f, 0.2f, 1f), projectilePrefab);
        player2Ship.transform.position = spawnPoint2.transform.position;
        player2Ship.transform.rotation = spawnPoint2.transform.rotation;

        // === UI Canvas ===
        GameObject canvasObj = new GameObject("Canvas");
        Canvas canvas = canvasObj.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;

        CanvasScaler scaler = canvasObj.AddComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1920, 1080);

        canvasObj.AddComponent<GraphicRaycaster>();

        // UI Texts
        Text p1ScoreText = CreateUIText(canvasObj.transform, "P1ScoreText", "0",
            new Vector2(100, -50), new Vector2(100, 60), TextAnchor.UpperLeft, 48);
        p1ScoreText.color = new Color(0.2f, 0.6f, 1f);

        Text p2ScoreText = CreateUIText(canvasObj.transform, "P2ScoreText", "0",
            new Vector2(-100, -50), new Vector2(100, 60), TextAnchor.UpperRight, 48);
        p2ScoreText.color = new Color(0.8f, 0.2f, 1f);

        Text p1ArchetypeText = CreateUIText(canvasObj.transform, "P1ArchetypeText", "AI",
            new Vector2(100, -100), new Vector2(150, 30), TextAnchor.UpperLeft, 24);
        p1ArchetypeText.color = new Color(0.2f, 0.6f, 1f);

        Text p2ArchetypeText = CreateUIText(canvasObj.transform, "P2ArchetypeText", "QUANTUM",
            new Vector2(-100, -100), new Vector2(150, 30), TextAnchor.UpperRight, 24);
        p2ArchetypeText.color = new Color(0.8f, 0.2f, 1f);

        Text messageText = CreateUIText(canvasObj.transform, "MessageText", "",
            new Vector2(0, 0), new Vector2(400, 100), TextAnchor.MiddleCenter, 56);
        messageText.color = Color.white;

        // GameOverPanel
        GameObject gameOverPanel = new GameObject("GameOverPanel");
        gameOverPanel.transform.SetParent(canvasObj.transform, false);
        RectTransform gopRect = gameOverPanel.AddComponent<RectTransform>();
        gopRect.anchorMin = Vector2.zero;
        gopRect.anchorMax = Vector2.one;
        gopRect.sizeDelta = Vector2.zero;
        gopRect.anchoredPosition = Vector2.zero;

        Image gopImage = gameOverPanel.AddComponent<Image>();
        gopImage.color = new Color(0, 0, 0, 0.7f);
        gameOverPanel.SetActive(false);

        // Add restart button to game over panel
        Text restartText = CreateUIText(gameOverPanel.transform, "RestartText", "Press R to Restart",
            new Vector2(0, -50), new Vector2(400, 50), TextAnchor.MiddleCenter, 32);
        restartText.color = Color.white;

        // === Wire GameManager fields using SerializedObject ===
        SerializedObject gmSO = new SerializedObject(gameManager);

        gmSO.FindProperty("player1Ship").objectReferenceValue = player1Ship.GetComponent<ShipController>();
        gmSO.FindProperty("player2Ship").objectReferenceValue = player2Ship.GetComponent<ShipController>();
        gmSO.FindProperty("player1SpawnPoint").objectReferenceValue = spawnPoint1.transform;
        gmSO.FindProperty("player2SpawnPoint").objectReferenceValue = spawnPoint2.transform;
        gmSO.FindProperty("player1ScoreText").objectReferenceValue = p1ScoreText;
        gmSO.FindProperty("player2ScoreText").objectReferenceValue = p2ScoreText;
        gmSO.FindProperty("player1ArchetypeText").objectReferenceValue = p1ArchetypeText;
        gmSO.FindProperty("player2ArchetypeText").objectReferenceValue = p2ArchetypeText;
        gmSO.FindProperty("messageText").objectReferenceValue = messageText;
        gmSO.FindProperty("gameOverPanel").objectReferenceValue = gameOverPanel;

        gmSO.ApplyModifiedPropertiesWithoutUndo();

        // === Save Scene ===
        EditorSceneManager.SaveScene(scene, SCENE_PATH);

        // === Add to Build Settings ===
        AddSceneToBuildSettings(SCENE_PATH);

        // Select the scene in project window
        Selection.activeObject = AssetDatabase.LoadAssetAtPath<SceneAsset>(SCENE_PATH);
    }

    private static GameObject CreateShip(string name, int playerNumber, string archetype, Color color, GameObject projectilePrefab)
    {
        GameObject ship = new GameObject(name);

        // SpriteRenderer - triangle shape
        SpriteRenderer sr = ship.AddComponent<SpriteRenderer>();
        sr.sprite = CreateTriangleSprite(32, color);
        sr.sortingOrder = 10;
        ship.transform.localScale = new Vector3(0.5f, 0.5f, 1f);

        // Rigidbody2D
        Rigidbody2D rb = ship.AddComponent<Rigidbody2D>();
        rb.gravityScale = 0f;
        rb.drag = 0.5f;
        rb.angularDrag = 0.5f;
        rb.collisionDetectionMode = CollisionDetectionMode2D.Continuous;

        // CircleCollider2D
        CircleCollider2D col = ship.AddComponent<CircleCollider2D>();
        col.isTrigger = true;
        col.radius = 0.5f;

        // TrailRenderer for thrust
        TrailRenderer trail = ship.AddComponent<TrailRenderer>();
        trail.time = 0.2f;
        trail.startWidth = 0.2f;
        trail.endWidth = 0f;
        trail.material = new Material(Shader.Find("Sprites/Default"));
        trail.startColor = color;
        trail.endColor = new Color(color.r, color.g, color.b, 0f);
        trail.emitting = false;
        trail.sortingOrder = 9;

        // FirePoint child
        GameObject firePoint = new GameObject("FirePoint");
        firePoint.transform.SetParent(ship.transform, false);
        firePoint.transform.localPosition = new Vector3(0f, 0.6f, 0f);

        // Scripts
        ShipController controller = ship.AddComponent<ShipController>();
        ship.AddComponent<ScreenWrap>();
        ship.AddComponent<ShipGravity>();

        // Wire ShipController fields
        SerializedObject scSO = new SerializedObject(controller);
        scSO.FindProperty("playerNumber").intValue = playerNumber;
        scSO.FindProperty("archetype").stringValue = archetype;
        scSO.FindProperty("projectilePrefab").objectReferenceValue = projectilePrefab;
        scSO.FindProperty("firePoint").objectReferenceValue = firePoint.transform;
        scSO.FindProperty("shipSprite").objectReferenceValue = sr;
        scSO.FindProperty("thrustTrail").objectReferenceValue = trail;
        scSO.ApplyModifiedPropertiesWithoutUndo();

        return ship;
    }

    private static Text CreateUIText(Transform parent, string name, string text,
        Vector2 anchoredPos, Vector2 size, TextAnchor alignment, int fontSize)
    {
        GameObject textObj = new GameObject(name);
        textObj.transform.SetParent(parent, false);

        RectTransform rect = textObj.AddComponent<RectTransform>();

        // Set anchors based on alignment
        if (alignment == TextAnchor.UpperLeft)
        {
            rect.anchorMin = new Vector2(0, 1);
            rect.anchorMax = new Vector2(0, 1);
            rect.pivot = new Vector2(0, 1);
        }
        else if (alignment == TextAnchor.UpperRight)
        {
            rect.anchorMin = new Vector2(1, 1);
            rect.anchorMax = new Vector2(1, 1);
            rect.pivot = new Vector2(1, 1);
        }
        else // MiddleCenter
        {
            rect.anchorMin = new Vector2(0.5f, 0.5f);
            rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.pivot = new Vector2(0.5f, 0.5f);
        }

        rect.anchoredPosition = anchoredPos;
        rect.sizeDelta = size;

        Text textComp = textObj.AddComponent<Text>();
        textComp.text = text;
        textComp.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        textComp.fontSize = fontSize;
        textComp.alignment = alignment;
        textComp.horizontalOverflow = HorizontalWrapMode.Overflow;
        textComp.verticalOverflow = VerticalWrapMode.Overflow;

        return textComp;
    }

    private static Sprite CreateCircleSprite(int resolution, Color color)
    {
        int size = resolution;
        Texture2D texture = new Texture2D(size, size, TextureFormat.RGBA32, false);
        texture.filterMode = FilterMode.Bilinear;

        Color[] pixels = new Color[size * size];
        float center = size / 2f;
        float radius = size / 2f - 1;

        for (int y = 0; y < size; y++)
        {
            for (int x = 0; x < size; x++)
            {
                float dist = Vector2.Distance(new Vector2(x, y), new Vector2(center, center));
                if (dist <= radius)
                {
                    pixels[y * size + x] = color;
                }
                else
                {
                    pixels[y * size + x] = Color.clear;
                }
            }
        }

        texture.SetPixels(pixels);
        texture.Apply();

        return Sprite.Create(texture, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size);
    }

    private static Sprite CreateTriangleSprite(int size, Color color)
    {
        Texture2D texture = new Texture2D(size, size, TextureFormat.RGBA32, false);
        texture.filterMode = FilterMode.Bilinear;

        Color[] pixels = new Color[size * size];

        // Fill with transparent
        for (int i = 0; i < pixels.Length; i++)
        {
            pixels[i] = Color.clear;
        }

        // Draw triangle pointing up
        Vector2 top = new Vector2(size / 2f, size - 2);
        Vector2 bottomLeft = new Vector2(2, 2);
        Vector2 bottomRight = new Vector2(size - 2, 2);

        for (int y = 0; y < size; y++)
        {
            for (int x = 0; x < size; x++)
            {
                Vector2 p = new Vector2(x, y);
                if (PointInTriangle(p, top, bottomLeft, bottomRight))
                {
                    pixels[y * size + x] = color;
                }
            }
        }

        texture.SetPixels(pixels);
        texture.Apply();

        return Sprite.Create(texture, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size);
    }

    private static bool PointInTriangle(Vector2 p, Vector2 a, Vector2 b, Vector2 c)
    {
        float d1 = Sign(p, a, b);
        float d2 = Sign(p, b, c);
        float d3 = Sign(p, c, a);

        bool hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
        bool hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);

        return !(hasNeg && hasPos);
    }

    private static float Sign(Vector2 p1, Vector2 p2, Vector2 p3)
    {
        return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    }

    private static void AddSceneToBuildSettings(string scenePath)
    {
        var scenes = new System.Collections.Generic.List<EditorBuildSettingsScene>(EditorBuildSettings.scenes);

        // Check if scene already in build settings
        bool found = false;
        foreach (var s in scenes)
        {
            if (s.path == scenePath)
            {
                found = true;
                break;
            }
        }

        if (!found)
        {
            scenes.Add(new EditorBuildSettingsScene(scenePath, true));
            EditorBuildSettings.scenes = scenes.ToArray();
            Debug.Log("[SpacewarSceneBuilder] Added scene to Build Settings: " + scenePath);
        }
    }
}
