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
    private static extern void OnRhymeRideComplete(string json);

    [DllImport("__Internal")]
    private static extern void OnUnityReady();
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
        NotifyUnityReady();
    }

    /// <summary>
    /// Called from JavaScript to initialize the game with round config.
    /// Expected JSON format:
    /// {
    ///   "sessionId": "uuid-string",
    ///   "rounds": [
    ///     { "promptWord": "cat", "correctWord": "hat", "distractors": ["dog", "tree"], "lane": 1 },
    ///     ...
    ///   ],
    ///   "targetScore": 5,
    ///   "timeLimit": 0
    /// }
    /// </summary>
    public void InitRhymeRide(string json)
    {
        Debug.Log($"[WebBridge] InitRhymeRide: {json}");

        try
        {
            RhymeRideConfig config = JsonUtility.FromJson<RhymeRideConfig>(json);

            if (config != null && RhymeRideGameManager.Instance != null)
            {
                RhymeRideGameManager.Instance.Initialize(config);
                Debug.Log($"[WebBridge] Initialized with {config.rounds?.Length ?? 0} rounds");
            }
        }
        catch (System.Exception e)
        {
            Debug.LogError($"[WebBridge] Failed to parse config: {e.Message}");
        }
    }

    /// <summary>
    /// Notify JavaScript that the game is complete.
    /// </summary>
    public void NotifyGameComplete(string sessionId, int score, float accuracy)
    {
        CompletionResult result = new CompletionResult
        {
            sessionId = sessionId,
            score = score,
            accuracy = accuracy
        };

        string json = JsonUtility.ToJson(result);
        Debug.Log($"[WebBridge] Game Complete: {json}");

#if UNITY_WEBGL && !UNITY_EDITOR
        OnRhymeRideComplete(json);
#endif
    }

    private void NotifyUnityReady()
    {
        Debug.Log("[WebBridge] Unity Ready");

#if UNITY_WEBGL && !UNITY_EDITOR
        OnUnityReady();
#endif
    }

    // Data classes for JSON serialization
    [System.Serializable]
    public class RhymeRideConfig
    {
        public string sessionId;
        public RoundData[] rounds;
        public int targetScore;
        public int timeLimit;
    }

    [System.Serializable]
    public class RoundData
    {
        public string promptWord;
        public string correctWord;
        public string[] distractors;
        public int lane;
    }

    [System.Serializable]
    private class CompletionResult
    {
        public string sessionId;
        public int score;
        public float accuracy;
    }
}
