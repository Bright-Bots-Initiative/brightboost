using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using System.Collections.Generic;

/// <summary>
/// BounceBudsGameManager - Main game logic for Bounce & Buds minigame.
/// Pong-style gameplay: bounce Buddy through gates to answer clues.
/// </summary>
public class BounceBudsGameManager : MonoBehaviour
{
    public static BounceBudsGameManager Instance { get; private set; }

    [Header("Prefabs")]
    [SerializeField] private GameObject buddyBallPrefab;
    [SerializeField] private GameObject paddlePrefab;
    [SerializeField] private GameObject budGatePrefab;
    [SerializeField] private GameObject obstaclePrefab;

    [Header("UI References")]
    [SerializeField] private Text clueText;
    [SerializeField] private Text hintText;
    [SerializeField] private Text scoreText;
    [SerializeField] private Text livesText;
    [SerializeField] private Text timerText;
    [SerializeField] private GameObject gameOverPanel;
    [SerializeField] private Text gameOverText;
    [SerializeField] private GameObject introPanel;
    [SerializeField] private Button startButton;

    [Header("Spawn Points")]
    [SerializeField] private float gateY = 4f;
    [SerializeField] private float paddleY = -4f;
    [SerializeField] private float ballSpawnY = -3f;

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

    // Active game objects
    private GameObject currentBall;
    private GameObject currentPaddle;
    private List<GameObject> currentGates = new List<GameObject>();
    private List<GameObject> currentObstacles = new List<GameObject>();

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
        if (gameOverPanel != null) gameOverPanel.SetActive(false);

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

        // Show first round clue before game starts
        if (rounds.Length > 0 && clueText != null)
        {
            clueText.text = $"Tap START\n{rounds[0].clueText}";
        }

        // Show intro panel and wait for start button
        if (introPanel != null)
        {
            introPanel.SetActive(true);
            waitingForStart = true;

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

    public void RestartGame()
    {
        ClearRound();

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
            Debug.LogError("[BounceBudsGameManager] No rounds configured!");
            return;
        }

        gameActive = true;
        StartCoroutine(GameLoopCoroutine());
    }

    private IEnumerator GameLoopCoroutine()
    {
        yield return new WaitForSeconds(0.5f);

        while (gameActive && currentRoundIndex < rounds.Length && lives > 0)
        {
            SpawnRound(rounds[currentRoundIndex]);
            roundActive = true;
            roundTimer = settings.roundTimeS;

            yield return new WaitUntil(() => !roundActive || !gameActive);

            if (!gameActive) break;

            // Only increment round index if we scored (not on fail/timeout)
            yield return new WaitForSeconds(0.3f);
        }

        if (gameActive)
        {
            EndGame();
        }
    }

    private void SpawnRound(WebBridge.RoundData round)
    {
        ClearRound();

        // Update clue display
        if (clueText != null)
        {
            clueText.text = round.clueText;
        }

        // Show hint if available
        if (hintText != null && !string.IsNullOrEmpty(round.hint))
        {
            hintText.text = round.hint;
            hintText.gameObject.SetActive(true);
        }

        // Spawn paddle
        if (paddlePrefab != null)
        {
            currentPaddle = Instantiate(paddlePrefab, new Vector3(0, paddleY, 0), Quaternion.identity);
            var paddle = currentPaddle.GetComponent<PaddleController>();
            if (paddle != null)
            {
                paddle.SetSpeed(settings.paddleSpeed);
            }
        }

        // Spawn gates (1 correct, 2 distractors)
        List<string> labels = new List<string> { round.correctLabel };
        labels.AddRange(round.distractors);
        ShuffleList(labels);

        float[] gateXPositions = { -4f, 0f, 4f };
        for (int i = 0; i < Mathf.Min(labels.Count, 3); i++)
        {
            if (budGatePrefab != null)
            {
                var gate = Instantiate(budGatePrefab, new Vector3(gateXPositions[i], gateY, 0), Quaternion.identity);
                var gateScript = gate.GetComponent<BudGate>();
                if (gateScript != null)
                {
                    bool isCorrect = labels[i] == round.correctLabel;
                    gateScript.Configure(labels[i], isCorrect);
                    gateScript.OnHit += HandleGateHit;
                }
                currentGates.Add(gate);
            }
        }

        // Spawn obstacles
        SpawnObstacles(settings.obstacleCount);

        // Spawn ball
        if (buddyBallPrefab != null)
        {
            currentBall = Instantiate(buddyBallPrefab, new Vector3(0, ballSpawnY, 0), Quaternion.identity);
            var ball = currentBall.GetComponent<BuddyBall>();
            if (ball != null)
            {
                ball.SetSpeed(settings.ballSpeed);
                ball.OnFellOut += HandleBallFellOut;
            }
        }
    }

    private void SpawnObstacles(int count)
    {
        if (obstaclePrefab == null) return;

        for (int i = 0; i < count; i++)
        {
            float x = Random.Range(-5f, 5f);
            float y = Random.Range(-1f, 2.5f);
            var obstacle = Instantiate(obstaclePrefab, new Vector3(x, y, 0), Quaternion.identity);
            currentObstacles.Add(obstacle);
        }
    }

    private void HandleGateHit(bool wasCorrect)
    {
        if (!roundActive) return;

        if (wasCorrect)
        {
            score++;
            currentStreak++;
            if (currentStreak > maxStreak) maxStreak = currentStreak;

            Debug.Log($"[BounceBudsGameManager] Correct! Score: {score}, Streak: {currentStreak}");

            currentRoundIndex++;
            roundActive = false;
        }
        else
        {
            lives--;
            currentStreak = 0;

            Debug.Log($"[BounceBudsGameManager] Wrong! Lives: {lives}");

            if (lives <= 0)
            {
                gameActive = false;
                EndGame();
            }
            else
            {
                // Retry same round
                roundActive = false;
            }
        }

        UpdateUI();
    }

    private void HandleBallFellOut()
    {
        if (!roundActive) return;

        lives--;
        currentStreak = 0;
        Debug.Log($"[BounceBudsGameManager] Ball fell out! Lives: {lives}");

        if (lives <= 0)
        {
            gameActive = false;
            EndGame();
        }
        else
        {
            // Retry same round
            roundActive = false;
        }

        UpdateUI();
    }

    private void OnRoundTimeout()
    {
        lives--;
        currentStreak = 0;
        Debug.Log($"[BounceBudsGameManager] Timeout! Lives: {lives}");

        roundActive = false;

        if (lives <= 0)
        {
            gameActive = false;
            EndGame();
        }

        UpdateUI();
    }

    private void ClearRound()
    {
        if (currentBall != null)
        {
            var ball = currentBall.GetComponent<BuddyBall>();
            if (ball != null) ball.OnFellOut -= HandleBallFellOut;
            Destroy(currentBall);
            currentBall = null;
        }

        if (currentPaddle != null)
        {
            Destroy(currentPaddle);
            currentPaddle = null;
        }

        foreach (var gate in currentGates)
        {
            if (gate != null)
            {
                var gateScript = gate.GetComponent<BudGate>();
                if (gateScript != null) gateScript.OnHit -= HandleGateHit;
                Destroy(gate);
            }
        }
        currentGates.Clear();

        foreach (var obstacle in currentObstacles)
        {
            if (obstacle != null) Destroy(obstacle);
        }
        currentObstacles.Clear();

        if (hintText != null) hintText.gameObject.SetActive(false);
    }

    private void EndGame()
    {
        gameActive = false;
        roundActive = false;
        ClearRound();

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

        if (!completionNotified && WebBridge.Instance != null)
        {
            completionNotified = true;
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
}
