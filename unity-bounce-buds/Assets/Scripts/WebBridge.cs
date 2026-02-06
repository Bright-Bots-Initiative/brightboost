using UnityEngine;
using System.Runtime.InteropServices;

/// <summary>
/// WebBridge - Handles communication between Unity WebGL and JavaScript
/// for the Bounce & Buds minigame.
/// </summary>
public class WebBridge : MonoBehaviour
{
    public static WebBridge Instance { get; private set; }

    // JavaScript functions to call from Unity (WebGL only)
#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")]
    private static extern void OnBounceBudsReady();

    [DllImport("__Internal")]
    private static extern void OnBounceBudsComplete(string json);
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
    /// </summary>
    public void InitFromJson(string json)
    {
        Debug.Log($"[WebBridge] InitFromJson: {json}");

        try
        {
            GameConfig config = JsonUtility.FromJson<GameConfig>(json);

            if (config != null && BounceBudsGameManager.Instance != null)
            {
                BounceBudsGameManager.Instance.Initialize(config);
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
        if (BounceBudsGameManager.Instance != null)
        {
            GameConfig defaultConfig = new GameConfig
            {
                sessionId = System.Guid.NewGuid().ToString(),
                settings = new GameSettings { lives = 3, roundTimeS = 12, ballSpeed = 7f, paddleSpeed = 12f, obstacleCount = 4 },
                rounds = new RoundData[]
                {
                    new RoundData { clueText = "A baby plant is a ____.", correctLabel = "seed", distractors = new[] { "leaf", "rock" }, hint = "A seed can grow into a plant." },
                    new RoundData { clueText = "This part drinks water.", correctLabel = "root", distractors = new[] { "leaf", "sun" }, hint = "Roots are under the ground." },
                    new RoundData { clueText = "Leaves help plants use ____.", correctLabel = "sunlight", distractors = new[] { "pizza", "shoes" }, hint = "Sunlight helps plants grow." }
                }
            };
            BounceBudsGameManager.Instance.Initialize(defaultConfig);
        }
    }

    /// <summary>
    /// Called from JavaScript to restart the game.
    /// </summary>
    public void RestartGame()
    {
        Debug.Log("[WebBridge] RestartGame requested");

        if (BounceBudsGameManager.Instance != null)
        {
            BounceBudsGameManager.Instance.RestartGame();
        }
    }

    /// <summary>
    /// Notify JavaScript that the game is ready.
    /// </summary>
    private void NotifyReady()
    {
        Debug.Log("[WebBridge] NotifyReady");

#if UNITY_WEBGL && !UNITY_EDITOR
        OnBounceBudsReady();
#endif
    }

    /// <summary>
    /// Notify JavaScript that the game is complete.
    /// </summary>
    public void NotifyComplete(string sessionId, int score, int total, int streakMax, int roundsCompleted)
    {
        CompletionResult result = new CompletionResult
        {
            sessionId = sessionId,
            score = score,
            total = total,
            streakMax = streakMax,
            roundsCompleted = roundsCompleted
        };

        string json = JsonUtility.ToJson(result);
        Debug.Log($"[WebBridge] NotifyComplete: {json}");

#if UNITY_WEBGL && !UNITY_EDITOR
        OnBounceBudsComplete(json);
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
        public float roundTimeS = 12f;
        public float ballSpeed = 7f;
        public float paddleSpeed = 12f;
        public int obstacleCount = 4;
    }

    [System.Serializable]
    public class RoundData
    {
        public string clueText;
        public string correctLabel;
        public string[] distractors;
        public string hint;
    }

    [System.Serializable]
    private class CompletionResult
    {
        public string sessionId;
        public int score;
        public int total;
        public int streakMax;
        public int roundsCompleted;
    }
}
