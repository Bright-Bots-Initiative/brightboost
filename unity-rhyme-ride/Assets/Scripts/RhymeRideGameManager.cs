using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using System.Collections.Generic;

/// <summary>
/// RhymeRideGameManager - Main game logic for Rhyme & Ride minigame.
/// Gotcha-style gameplay: targets move horizontally across lanes.
/// </summary>
public class RhymeRideGameManager : MonoBehaviour
{
    public static RhymeRideGameManager Instance { get; private set; }

    [Header("Lane Positions (Y coordinates for 3 horizontal lanes)")]
    [SerializeField] private float[] laneYPositions = { 2f, 0f, -2f };
    [SerializeField] private float spawnX = -10f;
    [SerializeField] private float destroyX = 10f;

    [Header("Prefabs")]
    [SerializeField] private GameObject targetPrefab;

    [Header("UI References")]
    [SerializeField] private Text scoreText;
    [SerializeField] private Text promptText;
    [SerializeField] private Text livesText;
    [SerializeField] private Text timerText;
    [SerializeField] private GameObject gameOverPanel;
    [SerializeField] private Text gameOverText;
    [SerializeField] private GameObject introPanel;
    [SerializeField] private Button startButton;
    [SerializeField] private Text hintText;

    // Config from JavaScript
    private string sessionId;
    private WebBridge.GameSettings settings;
    private WebBridge.RoundData[] rounds;

    // Game state
    private int currentRoundIndex = 0;
    private int score = 0;
    private int lives = 3;
    private int totalRounds = 0;
    private int currentStreak = 0;
    private int maxStreak = 0;
    private float roundTimer = 0f;
    private bool gameActive = false;
    private bool roundActive = false;
    private bool completionNotified = false;
    private bool waitingForStart = false;
    private bool hasInitializedFromConfig = false;

    private List<RhymeRideTarget> activeTargets = new List<RhymeRideTarget>();
    private WebBridge.RoundData currentRound;

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
        }
        else
        {
            Destroy(gameObject);
            return;
        }
    }

    private void Start()
    {
        // Always hide game over on boot
        if (gameOverPanel != null) gameOverPanel.SetActive(false);

        // If config already initialized the game, do not override intro panel state here.
        // Initialize() controls introPanel visibility.
        if (!hasInitializedFromConfig)
        {
            if (introPanel != null) introPanel.SetActive(false);
        }

        if (hintText != null) hintText.gameObject.SetActive(false);
    }

    private void Update()
    {
        if (roundActive && settings != null && settings.roundTimeS > 0)
        {
            roundTimer -= Time.deltaTime;
            UpdateTimerUI();

            if (roundTimer <= 0)
            {
                // Time's up for this round - count as miss
                OnRoundTimeout();
            }
        }
    }

    /// <summary>
    /// Initialize the game with config from JavaScript.
    /// </summary>
    public void Initialize(WebBridge.GameConfig config)
    {
        hasInitializedFromConfig = true;
        sessionId = config.sessionId;
        settings = config.settings ?? new WebBridge.GameSettings();
        rounds = config.rounds ?? new WebBridge.RoundData[0];

        // Reset state
        currentRoundIndex = 0;
        score = 0;
        lives = settings.lives;
        totalRounds = rounds.Length;
        currentStreak = 0;
        maxStreak = 0;
        completionNotified = false;

        UpdateUI();

        if (gameOverPanel != null)
        {
            gameOverPanel.SetActive(false);
        }

        // Show first round prompt word before game starts
        if (rounds.Length > 0 && promptText != null)
        {
            promptText.text = $"Tap START \u2014 rhyme for: {rounds[0].promptWord.ToUpper()}";
        }

        // Show intro panel and wait for start button
        if (introPanel != null)
        {
            introPanel.SetActive(true);
            waitingForStart = true;

            // Wire up start button
            if (startButton != null)
            {
                startButton.onClick.RemoveAllListeners();
                startButton.onClick.AddListener(OnStartButtonClicked);
            }
        }
        else
        {
            StartGame();
        }
    }

    /// <summary>
    /// Called when player clicks the Start button on intro panel.
    /// </summary>
    public void OnStartButtonClicked()
    {
        if (!waitingForStart) return;

        waitingForStart = false;

        if (introPanel != null)
        {
            introPanel.SetActive(false);
        }

        StartGame();
    }

    /// <summary>
    /// Restart the game with same config.
    /// </summary>
    public void RestartGame()
    {
        // Clear active targets
        ClearAllTargets();

        // Reset state
        currentRoundIndex = 0;
        score = 0;
        lives = settings?.lives ?? 3;
        currentStreak = 0;
        maxStreak = 0;
        completionNotified = false;

        UpdateUI();

        if (gameOverPanel != null)
        {
            gameOverPanel.SetActive(false);
        }

        StartGame();
    }

    private void StartGame()
    {
        if (rounds == null || rounds.Length == 0)
        {
            Debug.LogError("[RhymeRideGameManager] No rounds configured!");
            return;
        }

        gameActive = true;
        StartCoroutine(GameLoopCoroutine());
    }

    private IEnumerator GameLoopCoroutine()
    {
        // Brief delay before starting
        yield return new WaitForSeconds(0.5f);

        while (gameActive && currentRoundIndex < rounds.Length && lives > 0)
        {
            // Spawn round
            SpawnRound(rounds[currentRoundIndex]);
            roundActive = true;
            roundTimer = settings.roundTimeS;

            // Wait for round to complete (all targets cleared or timeout)
            yield return new WaitUntil(() => !roundActive || !gameActive);

            if (!gameActive) break;

            currentRoundIndex++;

            // Brief pause between rounds
            yield return new WaitForSeconds(0.3f);
        }

        if (gameActive)
        {
            EndGame();
        }
    }

    private void SpawnRound(WebBridge.RoundData round)
    {
        currentRound = round;

        if (targetPrefab == null)
        {
            Debug.LogError("[RhymeRideGameManager] Target prefab not assigned!");
            return;
        }

        // Update prompt display
        if (promptText != null)
        {
            promptText.text = $"Tap the rhyme for: {round.promptWord.ToUpper()}";
        }

        // Shuffle lanes for variety
        List<int> lanes = new List<int> { 0, 1, 2 };
        ShuffleList(lanes);

        // Spawn correct answer
        int correctLane = lanes[0];
        SpawnTarget(round.correctWord, correctLane, true);

        // Spawn distractors in other lanes
        int distractorIndex = 0;
        for (int i = 1; i < lanes.Count && distractorIndex < round.distractors.Length; i++)
        {
            SpawnTarget(round.distractors[distractorIndex], lanes[i], false);
            distractorIndex++;
        }
    }

    private void SpawnTarget(string word, int lane, bool isCorrect)
    {
        if (lane < 0 || lane >= laneYPositions.Length) return;

        // Spawn off-screen to the left, targets move right
        Vector3 spawnPos = new Vector3(spawnX, laneYPositions[lane], 0);
        GameObject targetObj = Instantiate(targetPrefab, spawnPos, Quaternion.identity);

        RhymeRideTarget target = targetObj.GetComponent<RhymeRideTarget>();
        if (target != null)
        {
            target.Initialize(word, lane, isCorrect, GetRoundSpeed(), destroyX);
            target.OnTargetHit += HandleTargetHit;
            target.OnTargetExited += HandleTargetExited;
            activeTargets.Add(target);
        }
    }

    private void HandleTargetHit(RhymeRideTarget target, bool wasCorrect)
    {
        if (wasCorrect)
        {
            // Correct answer!
            score++;
            currentStreak++;
            if (currentStreak > maxStreak) maxStreak = currentStreak;

            Debug.Log($"[RhymeRideGameManager] Correct! Score: {score}, Streak: {currentStreak}");

            // Clear all targets and end round
            ClearAllTargets();
            roundActive = false;
        }
        else
        {
            // Wrong answer
            lives--;
            currentStreak = 0;

            Debug.Log($"[RhymeRideGameManager] Wrong! Lives: {lives}");

            // Remove only the hit target
            RemoveTarget(target);

            if (lives <= 0)
            {
                gameActive = false;
                EndGame();
            }
        }

        UpdateUI();
    }

    private void HandleTargetExited(RhymeRideTarget target)
    {
        // Target left screen without being hit
        bool wasCorrect = target.IsCorrect;
        RemoveTarget(target);

        // If correct answer escaped and round is still active, it's a miss
        if (wasCorrect && roundActive)
        {
            lives--;
            currentStreak = 0;
            Debug.Log($"[RhymeRideGameManager] Missed correct answer! Lives: {lives}");

            ClearAllTargets();
            roundActive = false;

            if (lives <= 0)
            {
                gameActive = false;
                EndGame();
            }

            UpdateUI();
        }
    }

    private void OnRoundTimeout()
    {
        // Time ran out - count as a miss
        lives--;
        currentStreak = 0;
        Debug.Log($"[RhymeRideGameManager] Timeout! Lives: {lives}");

        ClearAllTargets();
        roundActive = false;

        if (lives <= 0)
        {
            gameActive = false;
            EndGame();
        }

        UpdateUI();
    }

    private void RemoveTarget(RhymeRideTarget target)
    {
        if (activeTargets.Contains(target))
        {
            activeTargets.Remove(target);
        }
        target.OnTargetHit -= HandleTargetHit;
        target.OnTargetExited -= HandleTargetExited;
        Destroy(target.gameObject);
    }

    private void ClearAllTargets()
    {
        foreach (var target in activeTargets.ToArray())
        {
            target.OnTargetHit -= HandleTargetHit;
            target.OnTargetExited -= HandleTargetExited;
            Destroy(target.gameObject);
        }
        activeTargets.Clear();
    }

    private void EndGame()
    {
        gameActive = false;
        roundActive = false;
        ClearAllTargets();

        // Show game over UI
        if (gameOverPanel != null)
        {
            gameOverPanel.SetActive(true);
            if (gameOverText != null)
            {
                bool completed = currentRoundIndex >= totalRounds;
                gameOverText.text = completed
                    ? $"Great job!\n\nScore: {score}/{totalRounds}\nBest Streak: {maxStreak}"
                    : $"Game Over\n\nScore: {score}/{totalRounds}\nBest Streak: {maxStreak}";
            }
        }

        // Notify JavaScript (only once)
        if (!completionNotified && WebBridge.Instance != null)
        {
            completionNotified = true;
            // roundsCompleted = currentRoundIndex (0-based, increments after each completed round)
            int roundsCompleted = Mathf.Clamp(currentRoundIndex, 0, totalRounds);
            WebBridge.Instance.NotifyComplete(sessionId, score, totalRounds, maxStreak, roundsCompleted);
        }
    }

    private void UpdateUI()
    {
        if (scoreText != null)
        {
            scoreText.text = $"Score: {score}";
        }
        if (livesText != null)
        {
            livesText.text = $"Lives: {lives}";
        }
        // Show hint text during active gameplay
        if (hintText != null)
        {
            hintText.gameObject.SetActive(gameActive && roundActive);
        }
    }

    private void UpdateTimerUI()
    {
        if (timerText != null)
        {
            if (roundActive && roundTimer > 0)
            {
                timerText.text = $"{Mathf.CeilToInt(roundTimer)}s";
            }
            else
            {
                timerText.text = "";
            }
        }
    }

    /// <summary>
    /// Called when player taps/clicks on a lane.
    /// </summary>
    public void OnLaneTap(int lane)
    {
        if (!gameActive || !roundActive) return;

        // Find the rightmost (closest to exit) target in this lane
        RhymeRideTarget closestTarget = null;
        float maxX = float.MinValue;

        foreach (var target in activeTargets)
        {
            if (target.Lane == lane && target.transform.position.x > maxX)
            {
                maxX = target.transform.position.x;
                closestTarget = target;
            }
        }

        if (closestTarget != null)
        {
            closestTarget.Hit();
        }
    }

    private void ShuffleList<T>(List<T> list)
    {
        for (int i = list.Count - 1; i > 0; i--)
        {
            int j = Random.Range(0, i + 1);
            T temp = list[i];
            list[i] = list[j];
            list[j] = temp;
        }
    }

    /// <summary>
    /// Calculate speed for current round with ramp.
    /// </summary>
    private float GetRoundSpeed()
    {
        float baseSpeed = (settings != null && settings.speed > 0) ? settings.speed : 3.0f;
        float ramp = (settings != null && settings.speedRamp >= 0) ? settings.speedRamp : 0.18f;
        float max = (settings != null && settings.maxSpeed > 0) ? settings.maxSpeed : 6.0f;

        float s = baseSpeed * (1f + (ramp * currentRoundIndex));
        return Mathf.Min(s, max);
    }
}
