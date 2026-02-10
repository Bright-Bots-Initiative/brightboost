using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using System.Collections.Generic;

/// <summary>
/// GotchaGearsGameManager - Main game logic for Gotcha Gears minigame.
/// Plan → Catch gameplay: observe gears, select lane, catch at the right moment.
/// </summary>
public class GotchaGearsGameManager : MonoBehaviour
{
    public static GotchaGearsGameManager Instance { get; private set; }

    [Header("Prefabs")]
    [SerializeField] private GameObject gearTargetPrefab;

    [Header("Catcher")]
    [SerializeField] private GearCatcherController catcher;

    [Header("UI References")]
    [SerializeField] private Text clueText;
    [SerializeField] private Text scoreText;
    [SerializeField] private Text livesText;
    [SerializeField] private Text timerText;
    [SerializeField] private Text feedbackText;
    [SerializeField] private Text phaseText;
    [SerializeField] private GameObject gameOverPanel;
    [SerializeField] private Text gameOverText;
    [SerializeField] private GameObject introPanel;
    [SerializeField] private Button startButton;
    [SerializeField] private Button catchButton;
    [SerializeField] private GameObject catchZoneVisual;

    [Header("Spawn Settings")]
    [SerializeField] private float spawnX = -8f;
    [SerializeField] private float destroyX = 10f;
    [SerializeField] private float catchZoneX = 6f;
    [SerializeField] private float[] laneYPositions = { 2f, 0f, -2f };

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
    private float planningTimer = 0f;
    private bool gameActive = false;
    private bool roundActive = false;
    private bool inPlanningPhase = false;
    private bool completionNotified = false;
    private bool waitingForStart = false;
    private bool hasInitializedFromConfig = false;
    private bool catchEnabled = false;

    // Current round data
    private WebBridge.RoundData currentRoundData;
    private List<GearTarget> currentGears = new List<GearTarget>();

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
        if (catchButton != null) catchButton.gameObject.SetActive(false);
        if (catchZoneVisual != null) catchZoneVisual.SetActive(false);
        if (feedbackText != null) feedbackText.gameObject.SetActive(false);
        if (phaseText != null) phaseText.gameObject.SetActive(false);

        if (!hasInitializedFromConfig)
        {
            if (introPanel != null) introPanel.SetActive(false);
        }

        // Set up catch button
        if (catchButton != null)
        {
            catchButton.onClick.AddListener(OnCatchPressed);
        }

        // Set up catcher lane positions
        if (catcher != null)
        {
            catcher.SetLanePositions(laneYPositions);
        }
    }

    private void Update()
    {
        // Planning phase countdown - ALWAYS decrement when in planning phase
        // This ensures we transition even if planningTimer started at 0
        if (inPlanningPhase)
        {
            planningTimer -= Time.deltaTime;
            UpdatePhaseUI();

            if (planningTimer <= 0f)
            {
                StartActionPhase();
            }
        }

        // Round timer (only during action phase)
        if (roundActive && !inPlanningPhase && settings != null && settings.roundTimeS > 0)
        {
            roundTimer -= Time.deltaTime;
            UpdateTimerUI();

            if (roundTimer <= 0)
            {
                OnRoundTimeout();
            }
        }

        // Keyboard catch input
        if (catchEnabled && (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return)))
        {
            OnCatchPressed();
        }
    }

    /// <summary>
    /// Initialize the game with config from JavaScript.
    /// </summary>
    public void Initialize(WebBridge.GameConfig config)
    {
        Debug.Log($"[GotchaGears] Initialize: sessionId={config.sessionId}, rounds={config.rounds?.Length ?? 0}");

        hasInitializedFromConfig = true;
        sessionId = config.sessionId;
        settings = config.settings ?? new WebBridge.GameSettings();
        rounds = config.rounds ?? new WebBridge.RoundData[0];

        Debug.Log($"[GotchaGears] Settings: planningTimeS={settings.planningTimeS}, speed={settings.speed}, roundTimeS={settings.roundTimeS}");

        // Reset state
        currentRoundIndex = 0;
        score = 0;
        lives = settings.lives;
        totalRounds = rounds.Length;
        currentStreak = 0;
        maxStreak = 0;
        completionNotified = false;
        catchEnabled = false;

        UpdateUI();

        if (gameOverPanel != null) gameOverPanel.SetActive(false);
        if (catchButton != null) catchButton.gameObject.SetActive(false);
        if (catchZoneVisual != null) catchZoneVisual.SetActive(false);

        // Show first round clue preview
        if (rounds.Length > 0 && clueText != null)
        {
            clueText.text = "Tap START to begin!\n\n" + rounds[0].clueText;
        }

        // Show intro panel
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

        if (introPanel != null) introPanel.SetActive(false);

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
        catchEnabled = false;

        UpdateUI();

        if (gameOverPanel != null) gameOverPanel.SetActive(false);

        StartGame();
    }

    private void StartGame()
    {
        if (rounds == null || rounds.Length == 0)
        {
            Debug.LogError("[GotchaGearsGameManager] No rounds configured!");
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

            yield return new WaitUntil(() => !roundActive || !gameActive);

            if (!gameActive) break;

            yield return new WaitForSeconds(0.5f);
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

        // Safety check
        if (gearTargetPrefab == null)
        {
            Debug.LogError("[GotchaGears] gearTargetPrefab is NULL. Re-run Tools → BrightBoost → Gotcha Gears → Generate Scene.");
            return;
        }

        // Update clue with fallback
        if (clueText != null)
        {
            clueText.text = string.IsNullOrEmpty(round.clueText)
                ? "Pick the best solution!"
                : round.clueText;
        }
        else
        {
            Debug.LogError("[GotchaGears] clueText is NULL. Re-run Tools → BrightBoost → Gotcha Gears → Generate Scene.");
        }

        // SAFETY: Ensure correctLabel is never null/empty
        string correctLbl = round.correctLabel;
        if (string.IsNullOrEmpty(correctLbl) || string.IsNullOrWhiteSpace(correctLbl))
        {
            // Fallback: use first non-empty distractor, else "debug"
            string fallback = null;
            if (round.distractors != null)
            {
                foreach (var d in round.distractors)
                {
                    if (!string.IsNullOrEmpty(d) && !string.IsNullOrWhiteSpace(d))
                    {
                        fallback = d.Trim();
                        break;
                    }
                }
            }
            correctLbl = !string.IsNullOrEmpty(fallback) ? fallback : "debug";
            Debug.LogError("[GotchaGears] correctLabel missing; using fallback=" + correctLbl);
        }
        else
        {
            correctLbl = correctLbl.Trim();
        }

        // Build labels: 1 correct + distractors (no nulls, no duplicates of correct)
        List<string> labels = new List<string> { correctLbl };
        if (round.distractors != null)
        {
            foreach (var d in round.distractors)
            {
                if (!string.IsNullOrEmpty(d) && !string.IsNullOrWhiteSpace(d))
                {
                    string trimmed = d.Trim();
                    // Skip if matches correctLabel (case-insensitive)
                    if (!trimmed.Equals(correctLbl, System.StringComparison.OrdinalIgnoreCase) && !labels.Contains(trimmed))
                    {
                        labels.Add(trimmed);
                    }
                }
            }
        }

        // Pad to 3 if needed (use words that don't match correctLabel)
        string[] padOptions = { "wait", "look", "think", "help", "try" };
        int padIdx = 0;
        while (labels.Count < 3 && padIdx < padOptions.Length)
        {
            string pad = padOptions[padIdx++];
            if (!pad.Equals(correctLbl, System.StringComparison.OrdinalIgnoreCase) && !labels.Contains(pad))
            {
                labels.Add(pad);
            }
        }

        // Shuffle labels to lanes
        ShuffleList(labels);

        // Calculate speed for this round
        float currentSpeed = settings.speed * (1 + settings.speedRamp * currentRoundIndex);
        currentSpeed = Mathf.Min(currentSpeed, settings.maxSpeed);

        // Spawn gears
        for (int i = 0; i < 3 && i < labels.Count; i++)
        {
            string label = labels[i];
            // Compare against our validated correctLbl (case-insensitive)
            bool isCorrect = label.Equals(correctLbl, System.StringComparison.OrdinalIgnoreCase);
            float y = laneYPositions[i];

            var gearObj = Instantiate(gearTargetPrefab, new Vector3(spawnX, y, 0), Quaternion.identity);
            var gear = gearObj.GetComponent<GearTarget>();
            if (gear != null)
            {
                gear.Configure(label, isCorrect, i, currentSpeed, destroyX);
                gear.OnExited += HandleGearExited;
                currentGears.Add(gear);
            }
        }

        // Start planning phase
        inPlanningPhase = true;
        roundActive = true;
        catchEnabled = false;
        // Clamp planningTimer to minimum 0.25s so phase ALWAYS transitions
        planningTimer = Mathf.Max(0.25f, settings.planningTimeS);
        roundTimer = settings.roundTimeS;

        Debug.Log($"[GotchaGears] SpawnRound: planningTimer={planningTimer}, planningTimeS={settings.planningTimeS}, speed={currentSpeed}");

        if (catchButton != null) catchButton.gameObject.SetActive(false);
        if (catchZoneVisual != null) catchZoneVisual.SetActive(false);

        if (phaseText != null)
        {
            phaseText.text = "PLAN: Pick a lane!";
            phaseText.gameObject.SetActive(true);
        }

        if (feedbackText != null) feedbackText.gameObject.SetActive(false);
        if (timerText != null) timerText.text = "";

        // Enable catcher movement during planning
        if (catcher != null) catcher.SetEnabled(true);

        Debug.Log($"[GotchaGears] Round {currentRoundIndex + 1}: Planning phase started");
    }

    private void StartActionPhase()
    {
        inPlanningPhase = false;
        catchEnabled = true;

        // Start gears moving
        foreach (var gear in currentGears)
        {
            if (gear != null) gear.SetPaused(false);
        }

        if (catchButton != null) catchButton.gameObject.SetActive(true);
        if (catchZoneVisual != null) catchZoneVisual.SetActive(true);

        if (phaseText != null)
        {
            phaseText.text = "CATCH!";
        }

        Debug.Log($"[GotchaGears] Round {currentRoundIndex + 1}: Action phase started");
    }

    public void OnCatchPressed()
    {
        if (!catchEnabled || !roundActive || inPlanningPhase) return;

        catchEnabled = false; // Prevent multiple catches

        // Find gear in selected lane within catch window
        int selectedLane = catcher != null ? catcher.SelectedLane : 1;
        GearTarget targetGear = null;
        float closestDist = float.MaxValue;

        foreach (var gear in currentGears)
        {
            if (gear == null || gear.Lane != selectedLane) continue;

            float dist = Mathf.Abs(gear.transform.position.x - catchZoneX);
            if (dist <= settings.catchWindowX && dist < closestDist)
            {
                closestDist = dist;
                targetGear = gear;
            }
        }

        if (targetGear == null)
        {
            // Whiff - no gear in catch zone
            HandleWhiff();
            return;
        }

        // Evaluate catch
        if (targetGear.IsCorrect)
        {
            HandleCorrectCatch(targetGear);
        }
        else
        {
            HandleWrongCatch(targetGear);
        }
    }

    private void HandleWhiff()
    {
        Debug.Log("[GotchaGears] Whiff - no gear in catch zone");

        if (settings.kidModeWhiffNoLife)
        {
            ShowFeedback("Almost! Wait for the gear.", Color.yellow);
            StartCoroutine(ReenableCatchAfterDelay(0.5f));
        }
        else
        {
            lives--;
            currentStreak = 0;
            UpdateUI();

            if (lives <= 0)
            {
                gameActive = false;
                roundActive = false;
                EndGame();
            }
            else
            {
                ShowFeedback("Missed! Try again.", Color.red);
                StartCoroutine(RetryRoundAfterDelay(1f));
            }
        }
    }

    private void HandleCorrectCatch(GearTarget gear)
    {
        Debug.Log($"[GotchaGears] Correct catch: {gear.Label}");

        gear.ShowCaughtFeedback(true);
        score++;
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;

        ShowFeedback("Great catch!", new Color(0.2f, 0.8f, 0.3f));

        currentRoundIndex++;
        roundActive = false;
        UpdateUI();
    }

    private void HandleWrongCatch(GearTarget gear)
    {
        Debug.Log($"[GotchaGears] Wrong catch: {gear.Label}");

        gear.ShowCaughtFeedback(false);
        currentStreak = 0;

        if (settings.kidModeWrongNoLife)
        {
            string hint = !string.IsNullOrEmpty(currentRoundData?.hint)
                ? currentRoundData.hint
                : "Try again!";
            ShowFeedback(hint, Color.yellow);
            StartCoroutine(RetryRoundAfterDelay(1.5f));
        }
        else
        {
            lives--;
            UpdateUI();

            if (lives <= 0)
            {
                gameActive = false;
                roundActive = false;
                EndGame();
            }
            else
            {
                ShowFeedback("Wrong gear! Try again.", Color.red);
                StartCoroutine(RetryRoundAfterDelay(1.5f));
            }
        }
    }

    private void HandleGearExited(GearTarget gear)
    {
        if (!roundActive) return;

        // If the correct gear exited, it's a miss
        if (gear.IsCorrect)
        {
            Debug.Log("[GotchaGears] Correct gear missed!");

            lives--;
            currentStreak = 0;
            UpdateUI();

            if (lives <= 0)
            {
                gameActive = false;
                roundActive = false;
                EndGame();
            }
            else
            {
                ShowFeedback("Missed! The gear got away.", Color.red);
                catchEnabled = false;
                StartCoroutine(RetryRoundAfterDelay(1.5f));
            }
        }
    }

    private void OnRoundTimeout()
    {
        if (inPlanningPhase) return; // Timer shouldn't run during planning

        Debug.Log("[GotchaGears] Round timeout!");

        lives--;
        currentStreak = 0;
        UpdateUI();

        if (lives <= 0)
        {
            gameActive = false;
            roundActive = false;
            EndGame();
        }
        else
        {
            ShowFeedback("Time's up! Try again.", Color.red);
            catchEnabled = false;
            StartCoroutine(RetryRoundAfterDelay(1.5f));
        }
    }

    private IEnumerator ReenableCatchAfterDelay(float delay)
    {
        yield return new WaitForSeconds(delay);
        if (roundActive && !inPlanningPhase)
        {
            catchEnabled = true;
        }
    }

    private IEnumerator RetryRoundAfterDelay(float delay)
    {
        yield return new WaitForSeconds(delay);
        if (gameActive && lives > 0)
        {
            roundActive = false;
            // Don't increment round index - retry same round
        }
    }

    public void OnLaneSelected(int lane)
    {
        if (catcher != null)
        {
            catcher.SelectLane(lane);
        }
    }

    public void OnGearClicked(GearTarget gear)
    {
        // When a gear is clicked, select its lane and attempt catch
        if (gear != null)
        {
            OnLaneSelected(gear.Lane);
            if (catchEnabled && !inPlanningPhase)
            {
                OnCatchPressed();
            }
        }
    }

    private void ClearRound()
    {
        catchEnabled = false;
        inPlanningPhase = false;

        foreach (var gear in currentGears)
        {
            if (gear != null)
            {
                gear.OnExited -= HandleGearExited;
                Destroy(gear.gameObject);
            }
        }
        currentGears.Clear();

        if (catchButton != null) catchButton.gameObject.SetActive(false);
        if (catchZoneVisual != null) catchZoneVisual.SetActive(false);
        if (phaseText != null) phaseText.gameObject.SetActive(false);
        if (feedbackText != null) feedbackText.gameObject.SetActive(false);
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

    private void ShowFeedback(string message, Color color)
    {
        if (feedbackText != null)
        {
            feedbackText.text = message;
            feedbackText.color = color;
            feedbackText.gameObject.SetActive(true);
        }
    }

    private void UpdateUI()
    {
        if (scoreText != null) scoreText.text = $"Score: {score}";
        if (livesText != null) livesText.text = $"Lives: {lives}";
    }

    private void UpdateTimerUI()
    {
        if (timerText != null)
        {
            if (roundActive && !inPlanningPhase && roundTimer > 0)
            {
                timerText.text = $"{Mathf.CeilToInt(roundTimer)}s";
            }
            else
            {
                timerText.text = "";
            }
        }
    }

    private void UpdatePhaseUI()
    {
        if (phaseText != null && inPlanningPhase)
        {
            phaseText.text = $"PLAN: {Mathf.CeilToInt(planningTimer)}s";
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
