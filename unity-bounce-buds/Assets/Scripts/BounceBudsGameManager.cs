using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using System.Collections.Generic;

/// <summary>
/// BounceBudsGameManager - Main game logic for Bounce & Buds minigame.
/// Kid-friendly Pong-style gameplay: position paddle, launch ball, bounce through gates.
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
    [SerializeField] private Button launchButton;

    [Header("Spawn Points")]
    [SerializeField] private float gateY = 4f;
    [SerializeField] private float paddleY = -4f;
    [SerializeField] private float ballSpawnY = -3f;

    [Header("Kid Mode")]
    [SerializeField] private bool kidModeWrongGateNoLife = true;

    [Header("Aim System")]
    [SerializeField] private AimIndicator aimIndicator;

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

    // Launch state
    private bool awaitingLaunch = false;
    public bool IsAwaitingLaunch => awaitingLaunch;

    // Aim state
    private float aimAngleDeg = 90f; // Straight up
    private const float AIM_MIN = 35f;  // Leftmost angle (degrees)
    private const float AIM_MAX = 145f; // Rightmost angle (degrees)
    private bool isAiming = false;

    // Current round data for re-serve
    private WebBridge.RoundData currentRoundData;

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
        if (launchButton != null) launchButton.gameObject.SetActive(false);

        if (!hasInitializedFromConfig)
        {
            if (introPanel != null) introPanel.SetActive(false);
        }

        if (hintText != null) hintText.gameObject.SetActive(false);
    }

    private void Update()
    {
        // Only run timer after launch
        if (roundActive && !awaitingLaunch && settings != null && settings.roundTimeS > 0)
        {
            roundTimer -= Time.deltaTime;
            UpdateTimerUI();

            if (roundTimer <= 0)
            {
                OnRoundTimeout();
            }
        }

        // Handle aiming while awaiting launch
        if (awaitingLaunch)
        {
            UpdateAiming();

            // Space bar to launch
            if (Input.GetKeyDown(KeyCode.Space))
            {
                LaunchCurrentBall();
            }
        }
    }

    private void UpdateAiming()
    {
        // Position aim indicator above paddle
        if (aimIndicator != null && currentPaddle != null)
        {
            aimIndicator.transform.position = currentPaddle.transform.position + Vector3.up * 0.6f;
        }

        // Handle mouse/touch input for aiming
        if (Input.GetMouseButton(0))
        {
            if (currentPaddle != null && Camera.main != null)
            {
                Vector3 mouseWorldPos = Camera.main.ScreenToWorldPoint(Input.mousePosition);
                Vector2 paddlePos = currentPaddle.transform.position;
                Vector2 delta = new Vector2(mouseWorldPos.x, mouseWorldPos.y) - paddlePos;

                // Only adjust angle if pointer is above paddle (prevents aiming down)
                if (delta.y > 0.2f)
                {
                    float angle = Mathf.Atan2(delta.y, delta.x) * Mathf.Rad2Deg;
                    aimAngleDeg = Mathf.Clamp(angle, AIM_MIN, AIM_MAX);
                    isAiming = true;
                }
            }
        }
        else
        {
            isAiming = false;
        }

        // Keyboard aim adjustment (arrow keys)
        if (Input.GetKey(KeyCode.LeftArrow))
        {
            aimAngleDeg = Mathf.Clamp(aimAngleDeg + 60f * Time.deltaTime, AIM_MIN, AIM_MAX);
        }
        if (Input.GetKey(KeyCode.RightArrow))
        {
            aimAngleDeg = Mathf.Clamp(aimAngleDeg - 60f * Time.deltaTime, AIM_MIN, AIM_MAX);
        }

        // Update aim indicator visual
        if (aimIndicator != null)
        {
            aimIndicator.SetAngle(aimAngleDeg);
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
        awaitingLaunch = false;

        UpdateUI();

        if (gameOverPanel != null)
        {
            gameOverPanel.SetActive(false);
        }
        if (launchButton != null)
        {
            launchButton.gameObject.SetActive(false);
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
        awaitingLaunch = false;

        UpdateUI();

        if (gameOverPanel != null)
        {
            gameOverPanel.SetActive(false);
        }
        if (launchButton != null)
        {
            launchButton.gameObject.SetActive(false);
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
            // Timer starts after launch, not here

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
        currentRoundData = round;

        // Safety check: ensure all prefabs are wired
        if (paddlePrefab == null) Debug.LogError("[BounceBuds] paddlePrefab is NULL (scene wiring broken). Re-run Tools → BrightBoost → Bounce & Buds → Generate Scene.");
        if (buddyBallPrefab == null) Debug.LogError("[BounceBuds] buddyBallPrefab is NULL (scene wiring broken). Re-run Tools → BrightBoost → Bounce & Buds → Generate Scene.");
        if (budGatePrefab == null) Debug.LogError("[BounceBuds] budGatePrefab is NULL (scene wiring broken). Re-run Tools → BrightBoost → Bounce & Buds → Generate Scene.");
        if (obstaclePrefab == null) Debug.LogError("[BounceBuds] obstaclePrefab is NULL (scene wiring broken). Re-run Tools → BrightBoost → Bounce & Buds → Generate Scene.");

        // If any prefab is null, stop gameplay spawn to avoid "UI-only" state
        if (paddlePrefab == null || buddyBallPrefab == null || budGatePrefab == null || obstaclePrefab == null)
        {
            Debug.LogError("[BounceBuds] Cannot spawn round - missing prefab references. UI will display but gameplay won't work.");
            return;
        }

        // Update clue display
        if (clueText != null)
        {
            clueText.text = round.clueText;
        }

        // Spawn paddle first
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

        // Spawn ball and attach to paddle
        if (buddyBallPrefab != null && currentPaddle != null)
        {
            currentBall = Instantiate(buddyBallPrefab, new Vector3(0, paddleY + 0.8f, 0), Quaternion.identity);
            var ball = currentBall.GetComponent<BuddyBall>();
            if (ball != null)
            {
                ball.SetSpeed(settings.ballSpeed);
                ball.AttachToPaddle(currentPaddle.transform, 0.8f);
                ball.OnFellOut += HandleBallFellOut;
            }
        }

        // Set up launch state
        awaitingLaunch = true;
        roundTimer = settings.roundTimeS;
        aimAngleDeg = 90f; // Reset to straight up

        // Show launch button
        if (launchButton != null)
        {
            launchButton.gameObject.SetActive(true);
            launchButton.onClick.RemoveAllListeners();
            launchButton.onClick.AddListener(LaunchCurrentBall);
        }

        // Show aim indicator
        if (aimIndicator != null)
        {
            aimIndicator.SetAngle(aimAngleDeg);
            aimIndicator.SetVisible(true);
        }

        // Show instruction hint
        if (hintText != null)
        {
            hintText.text = "Drag to aim, then tap LAUNCH!";
            hintText.gameObject.SetActive(true);
        }

        // Clear timer display while waiting
        if (timerText != null)
        {
            timerText.text = "";
        }
    }

    public void LaunchCurrentBall()
    {
        if (!awaitingLaunch) return;
        if (currentBall == null) return;

        var ball = currentBall.GetComponent<BuddyBall>();
        if (ball != null && !ball.IsLaunched)
        {
            // Launch with aimed direction
            float rad = aimAngleDeg * Mathf.Deg2Rad;
            Vector2 launchDir = new Vector2(Mathf.Cos(rad), Mathf.Sin(rad));
            ball.Launch(launchDir);
            awaitingLaunch = false;

            // Hide launch button
            if (launchButton != null)
            {
                launchButton.gameObject.SetActive(false);
            }

            // Hide aim indicator
            if (aimIndicator != null)
            {
                aimIndicator.SetVisible(false);
            }

            // Switch to round hint or hide
            if (hintText != null)
            {
                if (currentRoundData != null && !string.IsNullOrEmpty(currentRoundData.hint))
                {
                    hintText.text = currentRoundData.hint;
                }
                else
                {
                    hintText.gameObject.SetActive(false);
                }
            }

            // Start timer now
            roundTimer = settings.roundTimeS;

            Debug.Log($"[BounceBudsGameManager] Ball launched at angle {aimAngleDeg:F1}°!");
        }
    }

    private void ResetBallToServe(string message)
    {
        // Destroy current ball
        if (currentBall != null)
        {
            var ball = currentBall.GetComponent<BuddyBall>();
            if (ball != null) ball.OnFellOut -= HandleBallFellOut;
            Destroy(currentBall);
            currentBall = null;
        }

        // Create new ball attached to paddle
        if (buddyBallPrefab != null && currentPaddle != null)
        {
            currentBall = Instantiate(buddyBallPrefab, new Vector3(currentPaddle.transform.position.x, paddleY + 0.8f, 0), Quaternion.identity);
            var ball = currentBall.GetComponent<BuddyBall>();
            if (ball != null)
            {
                ball.SetSpeed(settings.ballSpeed);
                ball.AttachToPaddle(currentPaddle.transform, 0.8f);
                ball.OnFellOut += HandleBallFellOut;
            }
        }

        // Set up launch state
        awaitingLaunch = true;
        aimAngleDeg = 90f; // Reset to straight up

        // Show launch button
        if (launchButton != null)
        {
            launchButton.gameObject.SetActive(true);
            launchButton.onClick.RemoveAllListeners();
            launchButton.onClick.AddListener(LaunchCurrentBall);
        }

        // Show aim indicator
        if (aimIndicator != null)
        {
            aimIndicator.SetAngle(aimAngleDeg);
            aimIndicator.SetVisible(true);
        }

        // Show message
        if (hintText != null)
        {
            hintText.text = message;
            hintText.gameObject.SetActive(true);
        }

        // Clear timer
        if (timerText != null)
        {
            timerText.text = "";
        }

        Debug.Log($"[BounceBudsGameManager] Re-serving ball: {message}");
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
        if (awaitingLaunch) return; // Shouldn't happen, but just in case

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
            currentStreak = 0;

            if (kidModeWrongGateNoLife)
            {
                // Kid mode: don't lose life, just re-serve
                Debug.Log("[BounceBudsGameManager] Wrong gate (kid mode) - re-serving");
                ResetBallToServe("Try again! Move to the right answer.");
                // Keep roundActive true, don't advance
            }
            else
            {
                // Regular mode: lose a life
                lives--;
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
        }

        UpdateUI();
    }

    private void HandleBallFellOut()
    {
        if (!roundActive) return;
        if (awaitingLaunch) return;

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
            // Re-serve instead of respawning whole round
            ResetBallToServe("Oops! Try again.");
        }

        UpdateUI();
    }

    private void OnRoundTimeout()
    {
        if (awaitingLaunch) return; // Timer shouldn't run before launch

        lives--;
        currentStreak = 0;
        Debug.Log($"[BounceBudsGameManager] Timeout! Lives: {lives}");

        if (lives <= 0)
        {
            gameActive = false;
            roundActive = false;
            EndGame();
        }
        else
        {
            // Re-serve instead of respawning whole round
            ResetBallToServe("Time's up! Try again.");
        }

        UpdateUI();
    }

    private void ClearRound()
    {
        awaitingLaunch = false;

        if (launchButton != null)
        {
            launchButton.gameObject.SetActive(false);
        }

        if (aimIndicator != null)
        {
            aimIndicator.SetVisible(false);
        }

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
        awaitingLaunch = false;
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
            if (roundActive && !awaitingLaunch && roundTimer > 0)
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
