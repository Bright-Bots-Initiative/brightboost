using UnityEngine;
using System.Runtime.InteropServices;

/// <summary>
/// WebBridge - Handles communication between Unity WebGL and JavaScript
/// for the Rhyme & Ride minigame.
/// </summary>
public class WebBridge : MonoBehaviour
{
    public static WebBridge Instance { get; private set; }

    // JavaScript functions to call from Unity (WebGL only)
#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")]
    private static extern void OnRhymeRideReady();

    [DllImport("__Internal")]
    private static extern void OnRhymeRideComplete(string json);
#endif

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
            return;
        }
    }

    private void Start()
    {
        NotifyReady();
    }

    /// <summary>
    /// Called from JavaScript to initialize the game with config.
    /// Expected JSON format:
    /// {
    ///   "sessionId": "uuid-string",
    ///   "settings": { "lives": 3, "roundTimeS": 10, "speed": 3 },
    ///   "rounds": [
    ///     { "promptWord": "cat", "correctWord": "hat", "distractors": ["dog", "tree"] },
    ///     ...
    ///   ]
    /// }
    /// </summary>
    public void InitFromJson(string json)
    {
        Debug.Log($"[WebBridge] InitFromJson: {json}");

        try
        {
            GameConfig config = JsonUtility.FromJson<GameConfig>(json);

            if (config != null && RhymeRideGameManager.Instance != null)
            {
                RhymeRideGameManager.Instance.Initialize(config);
                Debug.Log($"[WebBridge] Initialized with {config.rounds?.Length ?? 0} rounds");
            }
            else if (config == null)
            {
                Debug.LogError("[WebBridge] Failed to parse config - using defaults");
                UseDefaultConfig();
            }
        }
        catch (System.Exception e)
        {
            Debug.LogError($"[WebBridge] Failed to parse config: {e.Message}");
            UseDefaultConfig();
        }
    }

    /// <summary>
    /// Fallback to default config if JSON is malformed.
    /// </summary>
    private void UseDefaultConfig()
    {
        if (RhymeRideGameManager.Instance != null)
        {
            GameConfig defaultConfig = new GameConfig
            {
                sessionId = System.Guid.NewGuid().ToString(),
                settings = new GameSettings { lives = 3, roundTimeS = 10, speed = 3 },
                rounds = new RoundData[]
                {
                    new RoundData { promptWord = "cat", correctWord = "hat", distractors = new[] { "dog", "sun" } },
                    new RoundData { promptWord = "sun", correctWord = "run", distractors = new[] { "moon", "star" } },
                    new RoundData { promptWord = "bed", correctWord = "red", distractors = new[] { "blue", "top" } }
                }
            };
            RhymeRideGameManager.Instance.Initialize(defaultConfig);
        }
    }

    /// <summary>
    /// Called from JavaScript to restart the game.
    /// </summary>
    public void RestartGame()
    {
        Debug.Log("[WebBridge] RestartGame requested");

        if (RhymeRideGameManager.Instance != null)
        {
            RhymeRideGameManager.Instance.RestartGame();
        }
    }

    /// <summary>
    /// Notify JavaScript that the game is ready.
    /// </summary>
    private void NotifyReady()
    {
        Debug.Log("[WebBridge] NotifyReady");

#if UNITY_WEBGL && !UNITY_EDITOR
        OnRhymeRideReady();
#endif
    }

    /// <summary>
    /// Notify JavaScript that the game is complete.
    /// Called by GameManager when game ends.
    /// </summary>
    public void NotifyComplete(string sessionId, int score, int total, int streakMax)
    {
        CompletionResult result = new CompletionResult
        {
            sessionId = sessionId,
            score = score,
            total = total,
            streakMax = streakMax
        };

        string json = JsonUtility.ToJson(result);
        Debug.Log($"[WebBridge] NotifyComplete: {json}");

#if UNITY_WEBGL && !UNITY_EDITOR
        OnRhymeRideComplete(json);
#endif
    }

    // Data classes for JSON serialization
    [System.Serializable]
    public class GameConfig
    {
        public string sessionId;
        public GameSettings settings;
        public RoundData[] rounds;
    }

    [System.Serializable]
    public class GameSettings
    {
        public int lives = 3;
        public float roundTimeS = 10f;
        public float speed = 3f;
    }

    [System.Serializable]
    public class RoundData
    {
        public string promptWord;
        public string correctWord;
        public string[] distractors;
    }

    [System.Serializable]
    private class CompletionResult
    {
        public string sessionId;
        public int score;
        public int total;
        public int streakMax;
    }
}
