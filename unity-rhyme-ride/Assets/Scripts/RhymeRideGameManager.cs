using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using System.Collections.Generic;

/// <summary>
/// RhymeRideGameManager - Main game logic for Rhyme & Ride minigame.
/// Handles round spawning, scoring, and game completion.
/// </summary>
public class RhymeRideGameManager : MonoBehaviour
{
    public static RhymeRideGameManager Instance { get; private set; }

    [Header("Game Settings")]
    [SerializeField] private float targetSpawnInterval = 2f;
    [SerializeField] private float targetSpeed = 2f;
    [SerializeField] private int maxMisses = 3;

    [Header("Lane Positions")]
    [SerializeField] private float[] laneXPositions = { -3f, 0f, 3f };
    [SerializeField] private float spawnY = 6f;
    [SerializeField] private float destroyY = -6f;

    [Header("Prefabs")]
    [SerializeField] private GameObject targetPrefab;

    [Header("UI References")]
    [SerializeField] private Text scoreText;
    [SerializeField] private Text promptText;
    [SerializeField] private Text livesText;
    [SerializeField] private GameObject gameOverPanel;
    [SerializeField] private Text gameOverText;

    // Game state
    private string sessionId;
    private WebBridge.RoundData[] rounds;
    private int currentRoundIndex = 0;
    private int score = 0;
    private int misses = 0;
    private int totalShots = 0;
    private int totalHits = 0;
    private bool gameActive = false;

    private List<RhymeRideTarget> activeTargets = new List<RhymeRideTarget>();

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
        if (gameOverPanel != null)
        {
            gameOverPanel.SetActive(false);
        }
    }

    /// <summary>
    /// Initialize the game with config from JavaScript.
    /// </summary>
    public void Initialize(WebBridge.RhymeRideConfig config)
    {
        sessionId = config.sessionId;
        rounds = config.rounds;
        currentRoundIndex = 0;
        score = 0;
        misses = 0;
        totalShots = 0;
        totalHits = 0;

        UpdateUI();

        if (gameOverPanel != null)
        {
            gameOverPanel.SetActive(false);
        }

        StartGame();
    }

    private void StartGame()
    {
        gameActive = true;
        StartCoroutine(SpawnRoundsCoroutine());
    }

    private IEnumerator SpawnRoundsCoroutine()
    {
        while (gameActive && currentRoundIndex < rounds.Length)
        {
            SpawnRound(rounds[currentRoundIndex]);
            currentRoundIndex++;

            yield return new WaitForSeconds(targetSpawnInterval);
        }

        // Wait for remaining targets to clear
        yield return new WaitUntil(() => activeTargets.Count == 0 || !gameActive);

        if (gameActive)
        {
            EndGame(true);
        }
    }

    private void SpawnRound(WebBridge.RoundData round)
    {
        if (targetPrefab == null)
        {
            Debug.LogError("[RhymeRideGameManager] Target prefab not assigned!");
            return;
        }

        // Update prompt display
        if (promptText != null)
        {
            promptText.text = $"Find the rhyme for: {round.promptWord}";
        }

        // Determine which lanes to use (3 lanes total)
        List<int> availableLanes = new List<int> { 0, 1, 2 };
        ShuffleList(availableLanes);

        // Spawn correct answer in one lane
        int correctLane = round.lane >= 0 && round.lane < 3 ? round.lane : availableLanes[0];
        SpawnTarget(round.correctWord, correctLane, true, round.promptWord);

        // Spawn distractors in other lanes
        int distractorIndex = 0;
        for (int i = 0; i < laneXPositions.Length && distractorIndex < round.distractors.Length; i++)
        {
            if (i != correctLane)
            {
                SpawnTarget(round.distractors[distractorIndex], i, false, round.promptWord);
                distractorIndex++;
            }
        }
    }

    private void SpawnTarget(string word, int lane, bool isCorrect, string promptWord)
    {
        if (lane < 0 || lane >= laneXPositions.Length) return;

        Vector3 spawnPos = new Vector3(laneXPositions[lane], spawnY, 0);
        GameObject targetObj = Instantiate(targetPrefab, spawnPos, Quaternion.identity);

        RhymeRideTarget target = targetObj.GetComponent<RhymeRideTarget>();
        if (target != null)
        {
            target.Initialize(word, isCorrect, promptWord, targetSpeed, destroyY);
            target.OnTargetHit += HandleTargetHit;
            target.OnTargetMissed += HandleTargetMissed;
            activeTargets.Add(target);
        }
    }

    private void HandleTargetHit(RhymeRideTarget target, bool wasCorrect)
    {
        totalShots++;

        if (wasCorrect)
        {
            score++;
            totalHits++;
            // Play positive feedback
            Debug.Log($"[RhymeRideGameManager] Correct! Score: {score}");
        }
        else
        {
            misses++;
            // Play negative feedback
            Debug.Log($"[RhymeRideGameManager] Wrong! Misses: {misses}");

            if (misses >= maxMisses)
            {
                EndGame(false);
            }
        }

        RemoveTarget(target);
        UpdateUI();
    }

    private void HandleTargetMissed(RhymeRideTarget target)
    {
        if (target.IsCorrect)
        {
            // Missed a correct answer
            misses++;
            Debug.Log($"[RhymeRideGameManager] Missed correct answer! Misses: {misses}");

            if (misses >= maxMisses)
            {
                EndGame(false);
            }
        }

        RemoveTarget(target);
        UpdateUI();
    }

    private void RemoveTarget(RhymeRideTarget target)
    {
        if (activeTargets.Contains(target))
        {
            activeTargets.Remove(target);
        }
        target.OnTargetHit -= HandleTargetHit;
        target.OnTargetMissed -= HandleTargetMissed;
        Destroy(target.gameObject);
    }

    private void EndGame(bool completed)
    {
        gameActive = false;

        // Clear remaining targets
        foreach (var target in activeTargets.ToArray())
        {
            Destroy(target.gameObject);
        }
        activeTargets.Clear();

        // Calculate accuracy
        float accuracy = totalShots > 0 ? (float)totalHits / totalShots : 0f;

        // Show game over UI
        if (gameOverPanel != null)
        {
            gameOverPanel.SetActive(true);
            if (gameOverText != null)
            {
                gameOverText.text = completed
                    ? $"Great job!\nScore: {score}\nAccuracy: {Mathf.RoundToInt(accuracy * 100)}%"
                    : $"Game Over\nScore: {score}\nAccuracy: {Mathf.RoundToInt(accuracy * 100)}%";
            }
        }

        // Notify JavaScript
        if (WebBridge.Instance != null)
        {
            WebBridge.Instance.NotifyGameComplete(sessionId, score, accuracy);
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
            int lives = maxMisses - misses;
            livesText.text = $"Lives: {lives}";
        }
    }

    /// <summary>
    /// Called when player taps/clicks on a lane.
    /// </summary>
    public void OnLaneTap(int lane)
    {
        if (!gameActive) return;

        // Find the lowest target in this lane
        RhymeRideTarget lowestTarget = null;
        float lowestY = float.MaxValue;

        foreach (var target in activeTargets)
        {
            if (target.Lane == lane && target.transform.position.y < lowestY)
            {
                lowestY = target.transform.position.y;
                lowestTarget = target;
            }
        }

        if (lowestTarget != null)
        {
            lowestTarget.Hit();
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
