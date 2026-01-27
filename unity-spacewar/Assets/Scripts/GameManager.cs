using UnityEngine;
using UnityEngine.UI;
using System.Collections;

/// <summary>
/// Physics preset for Spacewar gameplay feel
/// </summary>
public enum PhysicsPreset
{
    /// <summary>
    /// Classic 1962-inspired physics: Newtonian inertia, no artificial drag, orbitable sun
    /// </summary>
    Classic1962,

    /// <summary>
    /// Arcade physics: artificial drag, speed clamp, more forgiving
    /// </summary>
    Arcade
}

/// <summary>
/// GameManager - Controls game state, scoring, and round management for Spacewar
/// </summary>
public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    [Header("Game Settings")]
    [SerializeField] private int scoreToWin = 5;
    [SerializeField] private float roundStartDelay = 2f;
    [SerializeField] private float respawnDelay = 1.5f;

    [Header("Player References")]
    [SerializeField] private ShipController player1Ship;
    [SerializeField] private ShipController player2Ship;
    [SerializeField] private Transform player1SpawnPoint;
    [SerializeField] private Transform player2SpawnPoint;

    [Header("UI References")]
    [SerializeField] private Text player1ScoreText;
    [SerializeField] private Text player2ScoreText;
    [SerializeField] private Text player1ArchetypeText;
    [SerializeField] private Text player2ArchetypeText;
    [SerializeField] private Text messageText;
    [SerializeField] private GameObject gameOverPanel;

    [Header("Audio")]
    [SerializeField] private AudioClip roundStartSound;
    [SerializeField] private AudioClip scoreSound;
    [SerializeField] private AudioClip gameOverSound;

    [Header("CPU Opponent")]
    [SerializeField] private bool cpuOpponentEnabled = true;
    [SerializeField] private CpuPilot.Difficulty cpuDifficulty = CpuPilot.Difficulty.Normal;

    [Header("Physics Preset")]
    [Tooltip("Classic1962: Newtonian inertia, orbitable sun, no artificial drag. Arcade: drag + speed clamp.")]
    [SerializeField] private PhysicsPreset physicsPreset = PhysicsPreset.Classic1962;

    [Header("Classic1962 Tuning (balance-v1.3.2)")]
    [Tooltip("Sun gravity strength (v1.3.2: 12, slightly increased for tension)")]
    [SerializeField] private float classicSunGravity = 12f;
    [Tooltip("Minimum distance for gravity calc (v1.3: 1.8, reduces near-center spike)")]
    [SerializeField] private float classicSunMinDistance = 1.8f;
    [Tooltip("Maximum distance for gravity effect")]
    [SerializeField] private float classicSunMaxDistance = 20f;
    [Tooltip("Ship thrust force (v1.3.2: 16, slightly reduced)")]
    [SerializeField] private float classicShipThrust = 16f;
    [Tooltip("Sun visual scale multiplier (v1.3: 0.67, 33% smaller)")]
    [SerializeField] private float classicSunScale = 0.67f;
    [Tooltip("Distance from center for ship spawns (v1.3: 8.0, farther spawns)")]
    [SerializeField] private float classicSpawnDistance = 8.0f;
    [Tooltip("Spawn Y jitter range (v1.3: 1.5)")]
    [SerializeField] private float classicSpawnYJitter = 1.5f;
    [Tooltip("Ship max speed (v1.3: 50, effectively no clamp)")]
    [SerializeField] private float classicShipMaxSpeed = 50f;
    [Tooltip("Ship drag (v1.3: 0.02, near-zero inertia bleed)")]
    [SerializeField] private float classicShipDrag = 0.02f;
    [Tooltip("Gravity multiplier on ships (v1.3.2: 0.65, slight increase)")]
    [SerializeField] private float classicGravityMultiplier = 0.65f;
    [Tooltip("Enable arcade-style clamp and manual drag (v1.3: false for classic feel)")]
    [SerializeField] private bool classicClampAndManualDrag = false;

    [Header("Arcade Tuning (optional)")]
    [Tooltip("Sun gravity strength for arcade mode")]
    [SerializeField] private float arcadeSunGravity = 25f;
    [Tooltip("Minimum distance for gravity calc")]
    [SerializeField] private float arcadeSunMinDistance = 0.6f;
    [Tooltip("Maximum distance for gravity effect")]
    [SerializeField] private float arcadeSunMaxDistance = 20f;
    [Tooltip("Ship thrust force")]
    [SerializeField] private float arcadeShipThrust = 8f;
    [Tooltip("Ship max speed clamp")]
    [SerializeField] private float arcadeShipMaxSpeed = 11f;
    [Tooltip("Ship drag/friction")]
    [SerializeField] private float arcadeShipDrag = 0.45f;
    [Tooltip("Gravity multiplier on ships")]
    [SerializeField] private float arcadeGravityMultiplier = 1.0f;
    [Tooltip("Sun visual scale multiplier")]
    [SerializeField] private float arcadeSunScale = 1.0f;
    [Tooltip("Distance from center for ship spawns")]
    [SerializeField] private float arcadeSpawnDistance = 4.5f;
    [Tooltip("Spawn Y jitter range")]
    [SerializeField] private float arcadeSpawnYJitter = 0.5f;
    [Tooltip("Enable arcade-style clamp and manual drag")]
    [SerializeField] private bool arcadeClampAndManualDrag = true;

    // Balance metrics tracking (editor/dev builds only)
#if UNITY_EDITOR || DEVELOPMENT_BUILD
    private float roundStartTime = 0f;
#endif

    // Player data
    private int player1Score = 0;
    private int player2Score = 0;
    private string player1Archetype = "AI";
    private string player2Archetype = "QUANTUM";

    // CPU pilot reference
    private CpuPilot cpuPilot;

    // Game state
    private bool isGameActive = false;
    private bool isRoundActive = false;
    private AudioSource audioSource;
    private bool buildStampLogged = false;

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

        audioSource = GetComponent<AudioSource>();
        if (audioSource == null)
        {
            audioSource = gameObject.AddComponent<AudioSource>();
        }
    }

    private void Start()
    {
        // Log build stamp once
        if (!buildStampLogged)
        {
            Debug.Log($"[Spacewar] {BuildInfo.Stamp}");
            buildStampLogged = true;
        }

        ApplyPhysicsPreset();

        // Show build stamp briefly on game start
        ShowMessage($"Spacewar {BuildInfo.Stamp}\nFirst to {scoreToWin}. Avoid the Sun.");

        InitializeGame();
    }

    /// <summary>
    /// Apply physics preset tuning to GravityWell, ships, and ShipGravity components
    /// This allows tuning without editing scene serialized values
    /// </summary>
    private void ApplyPhysicsPreset()
    {
        bool isClassic = physicsPreset == PhysicsPreset.Classic1962;

        // Select tuning values based on preset
        float sunGravity = isClassic ? classicSunGravity : arcadeSunGravity;
        float sunMinDist = isClassic ? classicSunMinDistance : arcadeSunMinDistance;
        float sunMaxDist = isClassic ? classicSunMaxDistance : arcadeSunMaxDistance;
        float shipThrust = isClassic ? classicShipThrust : arcadeShipThrust;
        float shipMaxSpd = isClassic ? classicShipMaxSpeed : arcadeShipMaxSpeed;
        float shipDrg = isClassic ? classicShipDrag : arcadeShipDrag;
        float gravMult = isClassic ? classicGravityMultiplier : arcadeGravityMultiplier;
        float sunScale = isClassic ? classicSunScale : arcadeSunScale;
        float spawnDist = isClassic ? classicSpawnDistance : arcadeSpawnDistance;
        float spawnYJit = isClassic ? classicSpawnYJitter : arcadeSpawnYJitter;
        bool useClampDrag = isClassic ? classicClampAndManualDrag : arcadeClampAndManualDrag;

        // Apply gravity well tuning and sun scale
        if (GravityWell.Instance != null)
        {
            GravityWell.Instance.SetGravityTuning(sunGravity, sunMinDist, sunMaxDist);
            GravityWell.Instance.SetSunScaleFactor(sunScale);
        }
        else
        {
            Debug.LogWarning("[GameManager] GravityWell.Instance not found, cannot apply gravity tuning");
        }

        // Apply ship movement tuning (pass useClampDrag instead of !isClassic)
        ApplyShipTuning(player1Ship, shipThrust, shipMaxSpd, shipDrg, gravMult, useClampDrag);

        // Apply CPU ship scaling based on difficulty (only affects player2Ship when CPU enabled)
        float cpuThrustScale = 1f;
        float cpuMaxSpeedScale = 1f;
        if (cpuOpponentEnabled)
        {
            GetCpuSpeedScaling(out cpuThrustScale, out cpuMaxSpeedScale);
        }
        ApplyShipTuning(player2Ship, shipThrust * cpuThrustScale, shipMaxSpd * cpuMaxSpeedScale, shipDrg, gravMult, useClampDrag);

        // Reposition spawn points based on distance setting
        RepositionSpawnPoints(spawnDist, spawnYJit);

        Debug.Log($"[GameManager] Physics preset applied: {physicsPreset} - Gravity={sunGravity}, MinDist={sunMinDist}, Thrust={shipThrust}, SunScale={sunScale}, SpawnDist={spawnDist}, GravMult={gravMult}");
    }

    /// <summary>
    /// Apply tuning to a single ship
    /// </summary>
    private void ApplyShipTuning(ShipController ship, float thrust, float maxSpd, float drg, float gravMult, bool arcadeMode)
    {
        if (ship == null) return;

        // Apply movement tuning with physics mode
        ship.SetMovementTuning(thrust, maxSpd, drg, arcadeMode);

        // Apply gravity multiplier if ShipGravity component exists
        ShipGravity shipGravity = ship.GetComponent<ShipGravity>();
        if (shipGravity != null)
        {
            shipGravity.SetMultiplier(gravMult);
        }
    }

    /// <summary>
    /// Get CPU ship speed scaling factors based on difficulty.
    /// Easy = slower, Normal = baseline, Hard = faster
    /// </summary>
    private void GetCpuSpeedScaling(out float thrustScale, out float maxSpeedScale)
    {
        switch (cpuDifficulty)
        {
            case CpuPilot.Difficulty.Easy:
                thrustScale = 0.75f;
                maxSpeedScale = 0.85f;
                break;
            case CpuPilot.Difficulty.Hard:
                thrustScale = 1.15f;
                maxSpeedScale = 1.10f;
                break;
            default: // Normal
                thrustScale = 1.00f;
                maxSpeedScale = 1.00f;
                break;
        }
    }

    /// <summary>
    /// Reposition spawn points at runtime based on distance from center.
    /// Player 1 spawns on the left, Player 2 on the right, with Y jitter.
    /// Clamps X to stay within camera bounds.
    /// </summary>
    private void RepositionSpawnPoints(float distanceFromCenter, float yJitterRange = 1.5f)
    {
        Vector3 center = GravityWell.Instance != null ? GravityWell.Instance.transform.position : Vector3.zero;

        // Clamp spawn distance to camera bounds if camera exists
        float desiredX = distanceFromCenter;
        Camera cam = Camera.main;
        if (cam != null)
        {
            float halfH = cam.orthographicSize * 0.9f;
            float halfW = halfH * cam.aspect;
            desiredX = Mathf.Min(desiredX, halfW * 0.8f);
        }

        // Y jitter for variety
        float yJitter1 = Random.Range(-yJitterRange, yJitterRange);
        float yJitter2 = Random.Range(-yJitterRange, yJitterRange);

        // Player 1 spawns on the left, facing right
        if (player1SpawnPoint != null)
        {
            player1SpawnPoint.position = center + new Vector3(-desiredX, yJitter1, 0f);
            player1SpawnPoint.rotation = Quaternion.Euler(0f, 0f, -90f); // Face right
        }

        // Player 2 spawns on the right, facing left
        if (player2SpawnPoint != null)
        {
            player2SpawnPoint.position = center + new Vector3(desiredX, yJitter2, 0f);
            player2SpawnPoint.rotation = Quaternion.Euler(0f, 0f, 90f); // Face left
        }

        Debug.Log($"[GameManager] Spawn points repositioned: desiredX={desiredX:F1}, yJitter={yJitterRange}, P1=({-desiredX:F1},{yJitter1:F1}), P2=({desiredX:F1},{yJitter2:F1})");
    }

    /// <summary>
    /// Initialize or reset the game state
    /// </summary>
    public void InitializeGame()
    {
        player1Score = 0;
        player2Score = 0;
        isGameActive = true;

        UpdateUI();

        if (gameOverPanel != null)
        {
            gameOverPanel.SetActive(false);
        }

        // Setup CPU opponent
        SetupCpuOpponent();

        StartCoroutine(StartRound());
    }

    /// <summary>
    /// Setup CPU opponent for player 2
    /// </summary>
    private void SetupCpuOpponent()
    {
        if (player2Ship == null)
        {
            Debug.LogWarning("[GameManager] Player 2 ship not assigned, cannot setup CPU");
            return;
        }

        if (cpuOpponentEnabled)
        {
            // Ensure CpuPilot exists on player 2
            cpuPilot = player2Ship.GetComponent<CpuPilot>();
            if (cpuPilot == null)
            {
                cpuPilot = player2Ship.gameObject.AddComponent<CpuPilot>();
            }

            // Configure the pilot
            cpuPilot.SetTarget(player1Ship);
            cpuPilot.SetSelf(player2Ship);
            cpuPilot.SetDifficulty(cpuDifficulty);
            cpuPilot.ResetState();

            // Enable external control on player 2's ship
            player2Ship.ExternalControlEnabled = true;

            Debug.Log($"[GameManager] CPU opponent enabled (difficulty: {cpuDifficulty})");
        }
        else
        {
            // Disable external control for local PvP mode
            player2Ship.ExternalControlEnabled = false;

            // Disable CPU pilot if it exists
            if (cpuPilot != null)
            {
                cpuPilot.enabled = false;
            }

            Debug.Log("[GameManager] CPU opponent disabled (local PvP mode)");
        }
    }

    /// <summary>
    /// Configure players from external JSON (called from WebBridge)
    /// </summary>
    public void ConfigurePlayers(string p1Archetype, string p2Archetype, int? p1Level = null, int? p2Level = null)
    {
        player1Archetype = p1Archetype ?? "AI";
        player2Archetype = p2Archetype ?? "QUANTUM";

        if (player1Ship != null)
        {
            player1Ship.SetArchetype(player1Archetype);
        }
        if (player2Ship != null)
        {
            player2Ship.SetArchetype(player2Archetype);
        }

        UpdateUI();
    }

    /// <summary>
    /// Start a new round
    /// </summary>
    private IEnumerator StartRound()
    {
        isRoundActive = false;

        // Disable controls and gravity during countdown to prevent drift into sun
        EnableShipControls(false);
        SetShipGravityEnabled(false);

        // Reset ship positions (zeroes velocity)
        ResetShips();

        // Show round start message
        ShowMessage("Get Ready!");

        // Wait for delay
        yield return new WaitForSeconds(roundStartDelay);

        // Re-zero velocity just before starting (safety)
        ResetShips();

        // Re-enable gravity
        SetShipGravityEnabled(true);

        // Clear message and start round
        ShowMessage("");
        isRoundActive = true;

#if UNITY_EDITOR || DEVELOPMENT_BUILD
        // Track round start time for balance metrics
        roundStartTime = Time.time;
#endif

        if (audioSource != null && roundStartSound != null)
        {
            audioSource.PlayOneShot(roundStartSound);
        }

        // Enable ship controls
        EnableShipControls(true);
    }

    /// <summary>
    /// Reset ships to spawn positions
    /// </summary>
    private void ResetShips()
    {
        if (player1Ship != null && player1SpawnPoint != null)
        {
            player1Ship.ResetShip(player1SpawnPoint.position, player1SpawnPoint.rotation);
        }
        if (player2Ship != null && player2SpawnPoint != null)
        {
            player2Ship.ResetShip(player2SpawnPoint.position, player2SpawnPoint.rotation);
        }
    }

    /// <summary>
    /// Enable or disable ship controls
    /// </summary>
    private void EnableShipControls(bool enabled)
    {
        if (player1Ship != null) player1Ship.SetControlsEnabled(enabled);
        if (player2Ship != null) player2Ship.SetControlsEnabled(enabled);
    }

    /// <summary>
    /// Enable or disable gravity on ships (used during countdown to prevent drift)
    /// </summary>
    private void SetShipGravityEnabled(bool enabled)
    {
        if (player1Ship != null)
        {
            var g = player1Ship.GetComponent<ShipGravity>();
            if (g != null) g.enabled = enabled;
        }
        if (player2Ship != null)
        {
            var g = player2Ship.GetComponent<ShipGravity>();
            if (g != null) g.enabled = enabled;
        }
    }

    /// <summary>
    /// Called when a ship is destroyed
    /// </summary>
    public void OnShipDestroyed(ShipController destroyedShip, ShipController attacker)
    {
        if (!isRoundActive || !isGameActive) return;

        isRoundActive = false;
        EnableShipControls(false);

#if UNITY_EDITOR || DEVELOPMENT_BUILD
        // Log balance metrics for sun deaths (self-destruct with no attacker)
        if (attacker == null && roundStartTime > 0f)
        {
            float timeToDeath = Time.time - roundStartTime;
            Vector3 spawnPos = destroyedShip == player1Ship && player1SpawnPoint != null
                ? player1SpawnPoint.position
                : (player2SpawnPoint != null ? player2SpawnPoint.position : Vector3.zero);
            Debug.Log($"[{physicsPreset}] time_to_sun_death_seconds={timeToDeath:F2} spawn={spawnPos} ship=P{destroyedShip?.PlayerNumber}");
        }
#endif

        // Award point to the attacker (or other player if self-destruct)
        if (attacker != null)
        {
            if (attacker == player1Ship)
            {
                player1Score++;
            }
            else if (attacker == player2Ship)
            {
                player2Score++;
            }
        }
        else
        {
            // Self-destruct - award point to opponent
            if (destroyedShip == player1Ship)
            {
                player2Score++;
            }
            else
            {
                player1Score++;
            }
        }

        if (audioSource != null && scoreSound != null)
        {
            audioSource.PlayOneShot(scoreSound);
        }

        UpdateUI();

        // Check for game over
        if (player1Score >= scoreToWin || player2Score >= scoreToWin)
        {
            StartCoroutine(EndGame());
        }
        else
        {
            StartCoroutine(RespawnAndStartNewRound());
        }
    }

    /// <summary>
    /// Respawn ships and start a new round
    /// </summary>
    private IEnumerator RespawnAndStartNewRound()
    {
        yield return new WaitForSeconds(respawnDelay);
        StartCoroutine(StartRound());
    }

    /// <summary>
    /// End the game
    /// </summary>
    private IEnumerator EndGame()
    {
        isGameActive = false;

        string winner = player1Score >= scoreToWin ? "Player 1" : "Player 2";
        string winnerArchetype = player1Score >= scoreToWin ? player1Archetype : player2Archetype;

        ShowMessage($"{winner} ({winnerArchetype}) Wins!");

        if (audioSource != null && gameOverSound != null)
        {
            audioSource.PlayOneShot(gameOverSound);
        }

        if (gameOverPanel != null)
        {
            gameOverPanel.SetActive(true);
        }

        // Notify WebBridge
        WebBridge.Instance?.NotifyMatchOver(
            player1Score >= scoreToWin ? 1 : 2,
            player1Score,
            player2Score
        );

        yield return new WaitForSeconds(3f);
    }

    /// <summary>
    /// Update UI elements
    /// </summary>
    private void UpdateUI()
    {
        if (player1ScoreText != null)
        {
            player1ScoreText.text = player1Score.ToString();
        }
        if (player2ScoreText != null)
        {
            player2ScoreText.text = player2Score.ToString();
        }
        if (player1ArchetypeText != null)
        {
            player1ArchetypeText.text = player1Archetype;
        }
        if (player2ArchetypeText != null)
        {
            player2ArchetypeText.text = player2Archetype;
        }
    }

    /// <summary>
    /// Show a message on screen
    /// </summary>
    private void ShowMessage(string message)
    {
        if (messageText != null)
        {
            messageText.text = message;
        }
    }

    /// <summary>
    /// Restart the game (called from UI button)
    /// </summary>
    public void RestartGame()
    {
        InitializeGame();
    }

    /// <summary>
    /// Check if the round is currently active
    /// </summary>
    public bool IsRoundActive()
    {
        return isRoundActive && isGameActive;
    }

    /// <summary>
    /// Get current scores
    /// </summary>
    public (int p1Score, int p2Score) GetScores()
    {
        return (player1Score, player2Score);
    }

    /// <summary>
    /// Enable or disable CPU opponent
    /// </summary>
    public void SetCpuEnabled(bool enabled)
    {
        cpuOpponentEnabled = enabled;
        SetupCpuOpponent();
        Debug.Log($"[GameManager] CPU opponent {(enabled ? "enabled" : "disabled")}");
    }

    /// <summary>
    /// Set CPU difficulty from string
    /// </summary>
    public void SetCpuDifficulty(string difficulty)
    {
        switch (difficulty?.ToLower())
        {
            case "easy":
                cpuDifficulty = CpuPilot.Difficulty.Easy;
                break;
            case "hard":
                cpuDifficulty = CpuPilot.Difficulty.Hard;
                break;
            default:
                cpuDifficulty = CpuPilot.Difficulty.Normal;
                break;
        }

        // Update existing pilot if present
        if (cpuPilot != null)
        {
            cpuPilot.SetDifficulty(cpuDifficulty);
        }

        // Re-apply physics preset to update CPU ship speed scaling
        ApplyPhysicsPreset();

        Debug.Log($"[GameManager] CPU difficulty set to: {cpuDifficulty}");
    }

    /// <summary>
    /// Check if CPU opponent is enabled
    /// </summary>
    public bool IsCpuOpponentEnabled => cpuOpponentEnabled;

    /// <summary>
    /// Set physics preset at runtime
    /// </summary>
    public void SetPhysicsPreset(PhysicsPreset preset)
    {
        physicsPreset = preset;
        ApplyPhysicsPreset();
        Debug.Log($"[GameManager] Physics preset changed to: {preset}");
    }

    /// <summary>
    /// Set physics preset from string (for WebBridge)
    /// </summary>
    public void SetPhysicsPresetFromString(string presetName)
    {
        switch (presetName?.ToLower())
        {
            case "arcade":
                SetPhysicsPreset(PhysicsPreset.Arcade);
                break;
            case "classic":
            case "classic1962":
            default:
                SetPhysicsPreset(PhysicsPreset.Classic1962);
                break;
        }
    }

    /// <summary>
    /// Get current physics preset
    /// </summary>
    public PhysicsPreset CurrentPhysicsPreset => physicsPreset;

    /// <summary>
    /// Apply external input to Player 1 (for touch controls).
    /// Called from WebBridge.SetPlayer1Input.
    /// </summary>
    /// <param name="json">JSON with rotate, thrust, fire, hyperspace fields</param>
    public void ApplyPlayer1ExternalInput(string json)
    {
        if (player1Ship == null)
        {
            Debug.LogWarning("[GameManager] ApplyPlayer1ExternalInput: player1Ship is null");
            return;
        }

        try
        {
            WebBridge.TouchInputData input = JsonUtility.FromJson<WebBridge.TouchInputData>(json);

            if (input != null)
            {
                // Ensure external control is enabled
                if (!player1Ship.ExternalControlEnabled)
                {
                    player1Ship.ExternalControlEnabled = true;
                }

                player1Ship.SetExternalInput(input.rotate, input.thrust, input.fire, input.hyperspace);
            }
        }
        catch (System.Exception e)
        {
            Debug.LogError($"[GameManager] Failed to parse touch input: {e.Message}");
        }
    }

    /// <summary>
    /// Enable or disable external control for Player 1 (for touch controls).
    /// Called from WebBridge.EnableTouchControls.
    /// </summary>
    /// <param name="enabled">"true" or "false"</param>
    public void SetPlayer1ExternalControl(string enabled)
    {
        if (player1Ship == null)
        {
            Debug.LogWarning("[GameManager] SetPlayer1ExternalControl: player1Ship is null");
            return;
        }

        bool isEnabled = enabled?.ToLower() == "true";
        player1Ship.ExternalControlEnabled = isEnabled;

        Debug.Log($"[GameManager] Player 1 external control: {(isEnabled ? "enabled" : "disabled")}");
    }
}
