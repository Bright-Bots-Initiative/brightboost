using UnityEngine;
using System.Runtime.InteropServices;
using System.Collections;

/// <summary>
/// WebBridge - Handles communication between Unity WebGL and JavaScript.
/// Receives config from React, sends completion events back.
/// </summary>
public class WebBridge : MonoBehaviour
{
    public static WebBridge Instance { get; private set; }

    private bool hasInitialized = false;

#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")]
    private static extern void OnGotchaGearsReady();

    [DllImport("__Internal")]
    private static extern void OnGotchaGearsComplete(string json);
#endif

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
        public float speed = 2.6f;
        public float speedRamp = 0.15f;
        public float maxSpeed = 6f;
        public float planningTimeS = 1.8f;
        public bool kidModeWrongNoLife = true;
        public bool kidModeWhiffNoLife = true;
        public float catchWindowX = 1.0f;
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

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
        }
        else
        {
            Destroy(gameObject);
        }
    }

    private void Start()
    {
        NotifyReady();

#if UNITY_EDITOR
        // In Editor, auto-init with default config if no JS config arrives
        StartCoroutine(EditorAutoInitCoroutine());
#endif
    }

#if UNITY_EDITOR
    private IEnumerator EditorAutoInitCoroutine()
    {
        // Wait a short time for JS config to arrive
        yield return new WaitForSeconds(0.5f);

        if (!hasInitialized)
        {
            Debug.Log("[WebBridge] Editor: No config received, using default config");
            UseDefaultConfig();
        }
    }
#endif

    private void NotifyReady()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        OnGotchaGearsReady();
#endif
        Debug.Log("[WebBridge] Gotcha Gears Ready event dispatched");
    }

    /// <summary>
    /// Called from JavaScript via SendMessage to initialize the game.
    /// </summary>
    public void InitFromJson(string json)
    {
        Debug.Log("[WebBridge] InitFromJson received: " + (json?.Length > 100 ? json.Substring(0, 100) + "..." : json));

        if (string.IsNullOrEmpty(json))
        {
            Debug.LogWarning("[WebBridge] Empty config received, using defaults");
            UseDefaultConfig();
            return;
        }

        try
        {
            var config = JsonUtility.FromJson<GameConfig>(json);
            if (config == null || config.rounds == null || config.rounds.Length == 0)
            {
                Debug.LogWarning("[WebBridge] Invalid config (null or no rounds), using defaults");
                UseDefaultConfig();
                return;
            }

            if (GotchaGearsGameManager.Instance != null)
            {
                hasInitialized = true;
                GotchaGearsGameManager.Instance.Initialize(config);
            }
            else
            {
                Debug.LogError("[WebBridge] GameManager not found!");
            }
        }
        catch (System.Exception e)
        {
            Debug.LogError("[WebBridge] JSON parse error: " + e.Message);
            UseDefaultConfig();
        }
    }

    /// <summary>
    /// Fallback config with AI/strategy themed rounds.
    /// </summary>
    public void UseDefaultConfig()
    {
        var config = new GameConfig
        {
            sessionId = "default-session",
            settings = new GameSettings(),
            rounds = new RoundData[]
            {
                new RoundData
                {
                    clueText = "The robot keeps making mistakes. What should it do?",
                    correctLabel = "debug",
                    distractors = new string[] { "guess", "ignore" },
                    hint = "Debug means fix the mistake."
                },
                new RoundData
                {
                    clueText = "We want the robot to learn. What helps most?",
                    correctLabel = "practice",
                    distractors = new string[] { "sleep", "skip" },
                    hint = "Practice means try again."
                },
                new RoundData
                {
                    clueText = "We need to sort things. What do we pick first?",
                    correctLabel = "rule",
                    distractors = new string[] { "random", "noise" },
                    hint = "A rule tells us how to sort."
                },
                new RoundData
                {
                    clueText = "The robot needs steps to follow. What is that?",
                    correctLabel = "plan",
                    distractors = new string[] { "mess", "rush" },
                    hint = "A plan is a list of steps."
                },
                new RoundData
                {
                    clueText = "We look for patterns. What do we do?",
                    correctLabel = "compare",
                    distractors = new string[] { "forget", "hide" },
                    hint = "Compare means look at both."
                },
                new RoundData
                {
                    clueText = "If a step is wrong, what do we do?",
                    correctLabel = "change",
                    distractors = new string[] { "repeat", "stop" },
                    hint = "Change means try a new way."
                },
                new RoundData
                {
                    clueText = "To solve a puzzle, we think and then...",
                    correctLabel = "try",
                    distractors = new string[] { "cry", "fly" },
                    hint = "Try means do your best."
                }
            }
        };

        Debug.Log("[WebBridge] Using default config with " + config.rounds.Length + " rounds");

        if (GotchaGearsGameManager.Instance != null)
        {
            hasInitialized = true;
            GotchaGearsGameManager.Instance.Initialize(config);
        }
    }

    /// <summary>
    /// Called from JavaScript to restart the game.
    /// </summary>
    public void RestartGame()
    {
        if (GotchaGearsGameManager.Instance != null)
        {
            GotchaGearsGameManager.Instance.RestartGame();
        }
    }

    /// <summary>
    /// Send completion results to JavaScript.
    /// </summary>
    public void NotifyComplete(string sessionId, int score, int total, int streakMax, int roundsCompleted)
    {
        var result = new CompletionResult
        {
            sessionId = sessionId,
            score = score,
            total = total,
            streakMax = streakMax,
            roundsCompleted = roundsCompleted
        };

        string json = JsonUtility.ToJson(result);
        Debug.Log("[WebBridge] Completion: " + json);

#if UNITY_WEBGL && !UNITY_EDITOR
        OnGotchaGearsComplete(json);
#endif
    }
}
