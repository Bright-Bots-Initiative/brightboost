using UnityEngine;
using System.Runtime.InteropServices;

/// <summary>
/// WebBridge - Handles communication between Unity WebGL and JavaScript
/// </summary>
public class WebBridge : MonoBehaviour
{
    public static WebBridge Instance { get; private set; }

    // JavaScript functions to call from Unity (WebGL only)
#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")]
    private static extern void OnUnityMatchOver(string json);

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
        // Notify JavaScript that Unity is ready
        NotifyUnityReady();
    }

    /// <summary>
    /// Called from JavaScript to initialize the game with player config
    /// Expected JSON format:
    /// {
    ///   "player1": { "archetype": "AI", "level": 5, "xp": 1200, "avatarUrl": "..." },
    ///   "player2": { "archetype": "QUANTUM", "level": 3, "xp": 800, "avatarUrl": "..." }
    /// }
    /// </summary>
    public void InitFromJson(string json)
    {
        Debug.Log($"[WebBridge] InitFromJson: {json}");

        try
        {
            PlayerConfig config = JsonUtility.FromJson<PlayerConfig>(json);

            if (config != null && GameManager.Instance != null)
            {
                string p1Archetype = config.player1?.archetype ?? "AI";
                string p2Archetype = config.player2?.archetype ?? "QUANTUM";

                GameManager.Instance.ConfigurePlayers(
                    p1Archetype,
                    p2Archetype,
                    config.player1?.level,
                    config.player2?.level
                );

                Debug.Log($"[WebBridge] Configured: P1={p1Archetype}, P2={p2Archetype}");
            }
        }
        catch (System.Exception e)
        {
            Debug.LogError($"[WebBridge] Failed to parse config: {e.Message}");
        }
    }

    /// <summary>
    /// Called from JavaScript to set player config (alternative single-player method)
    /// Expected JSON format:
    /// {
    ///   "archetype": "AI",
    ///   "level": 5,
    ///   "xp": 1200,
    ///   "avatarUrl": "..."
    /// }
    /// </summary>
    public void SetPlayerConfig(string json)
    {
        Debug.Log($"[WebBridge] SetPlayerConfig: {json}");

        try
        {
            SinglePlayerConfig config = JsonUtility.FromJson<SinglePlayerConfig>(json);

            if (config != null && GameManager.Instance != null)
            {
                // Set player 1 to the provided config, player 2 gets a default
                GameManager.Instance.ConfigurePlayers(
                    config.archetype ?? "AI",
                    GetOpponentArchetype(config.archetype),
                    config.level,
                    null
                );
            }
        }
        catch (System.Exception e)
        {
            Debug.LogError($"[WebBridge] Failed to parse player config: {e.Message}");
        }
    }

    /// <summary>
    /// Get a different archetype for the opponent
    /// </summary>
    private string GetOpponentArchetype(string playerArchetype)
    {
        switch (playerArchetype?.ToUpper())
        {
            case "AI":
                return "QUANTUM";
            case "QUANTUM":
                return "BIOTECH";
            case "BIOTECH":
                return "AI";
            default:
                return "QUANTUM";
        }
    }

    /// <summary>
    /// Notify JavaScript that a match has ended
    /// </summary>
    public void NotifyMatchOver(int winner, int player1Score, int player2Score)
    {
        MatchResult result = new MatchResult
        {
            winner = winner,
            player1Score = player1Score,
            player2Score = player2Score,
            timestamp = System.DateTime.UtcNow.ToString("o")
        };

        string json = JsonUtility.ToJson(result);
        Debug.Log($"[WebBridge] Match Over: {json}");

#if UNITY_WEBGL && !UNITY_EDITOR
        OnUnityMatchOver(json);
#endif
    }

    /// <summary>
    /// Notify JavaScript that Unity is ready
    /// </summary>
    private void NotifyUnityReady()
    {
        Debug.Log("[WebBridge] Unity Ready");

#if UNITY_WEBGL && !UNITY_EDITOR
        OnUnityReady();
#endif
    }

    /// <summary>
    /// Called from JavaScript to restart the game
    /// </summary>
    public void RestartGame()
    {
        Debug.Log("[WebBridge] Restart requested");

        if (GameManager.Instance != null)
        {
            GameManager.Instance.RestartGame();
        }
    }

    /// <summary>
    /// Called from JavaScript to pause the game
    /// </summary>
    public void PauseGame()
    {
        Debug.Log("[WebBridge] Pause requested");
        Time.timeScale = 0f;
    }

    /// <summary>
    /// Called from JavaScript to resume the game
    /// </summary>
    public void ResumeGame()
    {
        Debug.Log("[WebBridge] Resume requested");
        Time.timeScale = 1f;
    }

    /// <summary>
    /// Called from JavaScript to set opponent mode
    /// </summary>
    /// <param name="mode">"cpu" for CPU opponent, "pvp" for local PvP</param>
    public void SetOpponentMode(string mode)
    {
        Debug.Log($"[WebBridge] SetOpponentMode: {mode}");

        if (GameManager.Instance != null)
        {
            bool cpuEnabled = mode?.ToLower() == "cpu";
            GameManager.Instance.SetCpuEnabled(cpuEnabled);
        }
    }

    /// <summary>
    /// Called from JavaScript to set CPU difficulty
    /// </summary>
    /// <param name="difficulty">"easy", "normal", or "hard"</param>
    public void SetCpuDifficulty(string difficulty)
    {
        Debug.Log($"[WebBridge] SetCpuDifficulty: {difficulty}");

        if (GameManager.Instance != null)
        {
            GameManager.Instance.SetCpuDifficulty(difficulty);
        }
    }

    /// <summary>
    /// Called from JavaScript to set runtime config (combined method)
    /// Expected JSON format:
    /// {
    ///   "opponentMode": "cpu",
    ///   "difficulty": "normal"
    /// }
    /// </summary>
    public void SetRuntimeConfig(string json)
    {
        Debug.Log($"[WebBridge] SetRuntimeConfig: {json}");

        try
        {
            RuntimeConfig config = JsonUtility.FromJson<RuntimeConfig>(json);

            if (config != null && GameManager.Instance != null)
            {
                if (!string.IsNullOrEmpty(config.opponentMode))
                {
                    bool cpuEnabled = config.opponentMode.ToLower() == "cpu";
                    GameManager.Instance.SetCpuEnabled(cpuEnabled);
                }

                if (!string.IsNullOrEmpty(config.difficulty))
                {
                    GameManager.Instance.SetCpuDifficulty(config.difficulty);
                }
            }
        }
        catch (System.Exception e)
        {
            Debug.LogError($"[WebBridge] Failed to parse runtime config: {e.Message}");
        }
    }

    /// <summary>
    /// Called from JavaScript to set Player 1 input (for touch controls).
    /// Expected JSON format:
    /// {
    ///   "rotate": 0.0,     // -1 to 1 (negative = right, positive = left)
    ///   "thrust": false,
    ///   "fire": false,
    ///   "hyperspace": false
    /// }
    /// </summary>
    public void SetPlayer1Input(string json)
    {
        if (GameManager.Instance != null)
        {
            GameManager.Instance.ApplyPlayer1ExternalInput(json);
        }
    }

    /// <summary>
    /// Called from JavaScript to enable/disable touch controls for Player 1.
    /// </summary>
    /// <param name="enabled">"true" or "false"</param>
    public void EnableTouchControls(string enabled)
    {
        Debug.Log($"[WebBridge] EnableTouchControls: {enabled}");

        if (GameManager.Instance != null)
        {
            GameManager.Instance.SetPlayer1ExternalControl(enabled);
        }
    }

    // Data classes for JSON serialization
    [System.Serializable]
    private class PlayerConfig
    {
        public PlayerData player1;
        public PlayerData player2;
    }

    [System.Serializable]
    private class PlayerData
    {
        public string archetype;
        public int? level;
        public int? xp;
        public string avatarUrl;
    }

    [System.Serializable]
    private class SinglePlayerConfig
    {
        public string archetype;
        public int? level;
        public int? xp;
        public string avatarUrl;
    }

    [System.Serializable]
    private class MatchResult
    {
        public int winner;
        public int player1Score;
        public int player2Score;
        public string timestamp;
    }

    [System.Serializable]
    private class RuntimeConfig
    {
        public string opponentMode;
        public string difficulty;
    }

    [System.Serializable]
    public class TouchInputData
    {
        public float rotate;
        public bool thrust;
        public bool fire;
        public bool hyperspace;
    }
}
