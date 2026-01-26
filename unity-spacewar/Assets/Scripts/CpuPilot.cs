using UnityEngine;

/// <summary>
/// CpuPilot - AI controller for CPU opponent in Spacewar
/// Drives a ShipController through its external control API
/// </summary>
public class CpuPilot : MonoBehaviour
{
    public enum Difficulty
    {
        Easy,
        Normal,
        Hard
    }

    [Header("References")]
    [SerializeField] private ShipController targetShip;  // Player 1 ship to track
    [SerializeField] private ShipController selfShip;    // The ship this AI controls
    [SerializeField] private Transform gravityWellTransform;

    [Header("Difficulty Settings")]
    [SerializeField] private Difficulty difficulty = Difficulty.Normal;

    // Difficulty parameters
    private float aimToleranceDegrees = 15f;
    private float fireCooldown = 0.5f;
    private float thrustAggressiveness = 0.6f;
    private float reactionTime = 0.15f;
    private float sunAvoidRadius = 3f;
    private float panicHyperspaceChance = 0f;
    private float leadAimFactor = 0f; // 0 = no lead, >0 = lead aiming enabled

    // State
    private float lastFireTime = 0f;
    private float lastDecisionTime = 0f;
    private float currentRotateInput = 0f;
    private bool currentThrust = false;
    private bool currentFire = false;
    private bool currentHyperspace = false;

    private void Start()
    {
        ApplyDifficultySettings();

        // Auto-find references if not set
        if (selfShip == null)
        {
            selfShip = GetComponent<ShipController>();
        }

        if (targetShip == null)
        {
            // Find player 1 ship
            ShipController[] ships = FindObjectsByType<ShipController>(FindObjectsSortMode.None);
            foreach (var ship in ships)
            {
                if (ship.PlayerNumber == 1)
                {
                    targetShip = ship;
                    break;
                }
            }
        }

        if (gravityWellTransform == null && GravityWell.Instance != null)
        {
            gravityWellTransform = GravityWell.Instance.transform;
        }
    }

    /// <summary>
    /// Apply difficulty-based parameters
    /// Rebalanced: Easy=slower/safer, Normal=challenging (old Hard), Hard=smarter+faster
    /// </summary>
    private void ApplyDifficultySettings()
    {
        switch (difficulty)
        {
            case Difficulty.Easy:
                // Slower, less aggressive, but good sun avoidance (won't suicide)
                aimToleranceDegrees = 28f;
                fireCooldown = 0.9f;
                thrustAggressiveness = 0.28f;
                reactionTime = 0.32f;
                sunAvoidRadius = 5.5f;
                panicHyperspaceChance = 0f;
                leadAimFactor = 0f; // No lead aiming
                break;

            case Difficulty.Normal:
                // Feels like old Hard: survives reliably, provides challenge
                aimToleranceDegrees = 12f;
                fireCooldown = 0.40f;
                thrustAggressiveness = 0.72f;
                reactionTime = 0.09f;
                sunAvoidRadius = 6.3f;
                panicHyperspaceChance = 0.03f;
                leadAimFactor = 0.45f; // Moderate lead aiming
                break;

            case Difficulty.Hard:
                // Smarter + faster: lead aiming, better sun avoidance, faster reactions
                aimToleranceDegrees = 8f;
                fireCooldown = 0.30f;
                thrustAggressiveness = 0.85f;
                reactionTime = 0.05f;
                sunAvoidRadius = 7.0f;
                panicHyperspaceChance = 0.07f;
                leadAimFactor = 0.70f; // Strong lead aiming
                break;
        }
    }

    /// <summary>
    /// Set difficulty at runtime
    /// </summary>
    public void SetDifficulty(Difficulty newDifficulty)
    {
        difficulty = newDifficulty;
        ApplyDifficultySettings();
        Debug.Log($"[CpuPilot] Difficulty set to: {difficulty}");
    }

    /// <summary>
    /// Set difficulty from string (for WebBridge)
    /// </summary>
    public void SetDifficultyFromString(string difficultyStr)
    {
        switch (difficultyStr?.ToLower())
        {
            case "easy":
                SetDifficulty(Difficulty.Easy);
                break;
            case "hard":
                SetDifficulty(Difficulty.Hard);
                break;
            default:
                SetDifficulty(Difficulty.Normal);
                break;
        }
    }

    /// <summary>
    /// Set target ship reference
    /// </summary>
    public void SetTarget(ShipController target)
    {
        targetShip = target;
    }

    /// <summary>
    /// Set self ship reference
    /// </summary>
    public void SetSelf(ShipController self)
    {
        selfShip = self;
    }

    /// <summary>
    /// Reset AI state (called on round restart)
    /// </summary>
    public void ResetState()
    {
        lastFireTime = 0f;
        lastDecisionTime = 0f;
        currentRotateInput = 0f;
        currentThrust = false;
        currentFire = false;
        currentHyperspace = false;
    }

    private void Update()
    {
        if (selfShip == null || targetShip == null) return;
        if (!selfShip.ExternalControlEnabled) return;

        // Throttle decision-making for more natural behavior
        if (Time.time - lastDecisionTime >= reactionTime)
        {
            lastDecisionTime = Time.time;
            MakeDecisions();
        }

        // Apply current inputs
        selfShip.SetExternalInput(currentRotateInput, currentThrust, currentFire, currentHyperspace);

        // Reset fire after one frame
        if (currentFire)
        {
            currentFire = false;
        }

        // Reset hyperspace after one frame
        if (currentHyperspace)
        {
            currentHyperspace = false;
        }
    }

    /// <summary>
    /// Main AI decision-making logic
    /// </summary>
    private void MakeDecisions()
    {
        Vector2 myPos = transform.position;
        Vector2 targetPos = targetShip.transform.position;
        Vector2 toTarget = targetPos - myPos;
        float distanceToTarget = toTarget.magnitude;

        // Check for sun danger first
        bool sunDanger = CheckSunDanger(out Vector2 sunAvoidDirection);

        if (sunDanger)
        {
            // Priority 1: Avoid the sun
            HandleSunAvoidance(sunAvoidDirection);
        }
        else
        {
            // Normal combat behavior
            HandleCombat(toTarget, distanceToTarget);
        }
    }

    /// <summary>
    /// Check if we're in danger of falling into the sun
    /// </summary>
    private bool CheckSunDanger(out Vector2 avoidDirection)
    {
        avoidDirection = Vector2.zero;

        if (gravityWellTransform == null)
        {
            return false;
        }

        Vector2 myPos = transform.position;
        Vector2 sunPos = gravityWellTransform.position;
        Vector2 toSun = sunPos - myPos;
        float distanceToSun = toSun.magnitude;

        if (distanceToSun < sunAvoidRadius)
        {
            // Calculate direction away from sun
            avoidDirection = -toSun.normalized;
            return true;
        }

        // Also check if we're heading toward the sun
        Rigidbody2D rb = selfShip.GetComponent<Rigidbody2D>();
        if (rb != null && rb.linearVelocity.magnitude > 1f)
        {
            Vector2 futurePos = myPos + rb.linearVelocity * 0.5f;
            float futureDistToSun = Vector2.Distance(futurePos, sunPos);

            if (futureDistToSun < sunAvoidRadius * 0.8f && distanceToSun < sunAvoidRadius * 1.5f)
            {
                avoidDirection = -toSun.normalized;
                return true;
            }
        }

        return false;
    }

    /// <summary>
    /// Handle sun avoidance behavior
    /// </summary>
    private void HandleSunAvoidance(Vector2 avoidDirection)
    {
        // Turn to face away from sun
        float desiredAngle = Mathf.Atan2(avoidDirection.y, avoidDirection.x) * Mathf.Rad2Deg - 90f;
        float currentAngle = transform.eulerAngles.z;
        float angleDiff = Mathf.DeltaAngle(currentAngle, desiredAngle);

        currentRotateInput = Mathf.Clamp(angleDiff / 30f, -1f, 1f);

        // Thrust if roughly facing away from sun
        currentThrust = Mathf.Abs(angleDiff) < 45f;

        // Emergency hyperspace if very close to sun (Normal/Hard only)
        if (panicHyperspaceChance > 0f && gravityWellTransform != null)
        {
            float distToSun = Vector2.Distance(transform.position, gravityWellTransform.position);
            if (distToSun < sunAvoidRadius * 0.45f && Random.value < panicHyperspaceChance)
            {
                currentHyperspace = true;
            }
        }
    }

    /// <summary>
    /// Handle normal combat behavior
    /// </summary>
    private void HandleCombat(Vector2 toTarget, float distance)
    {
        Vector2 myPos = transform.position;
        Vector2 targetPos = targetShip.transform.position;

        // Lead aiming for Normal/Hard: predict where target will be
        Vector2 aimPoint = targetPos;
        if (leadAimFactor > 0f)
        {
            Rigidbody2D targetRb = targetShip.GetComponent<Rigidbody2D>();
            if (targetRb != null)
            {
                Vector2 targetVel = targetRb.linearVelocity;
                float projectileSpeedEstimate = 12f; // Matches ShipController default
                float leadTime = Mathf.Clamp(distance / projectileSpeedEstimate, 0f, leadAimFactor);
                aimPoint = targetPos + targetVel * leadTime;
            }
        }

        // Calculate desired angle to face aim point
        Vector2 toAimPoint = aimPoint - myPos;
        float desiredAngle = Mathf.Atan2(toAimPoint.y, toAimPoint.x) * Mathf.Rad2Deg - 90f;
        float currentAngle = transform.eulerAngles.z;
        float angleDiff = Mathf.DeltaAngle(currentAngle, desiredAngle);

        // Rotate toward target
        currentRotateInput = Mathf.Clamp(angleDiff / 30f, -1f, 1f);

        // Thrust logic - approach target but not too close
        float idealDistance = 4f;
        float distanceFactor = (distance - idealDistance) / idealDistance;

        // Only thrust if roughly facing target and not too close
        bool facingTarget = Mathf.Abs(angleDiff) < 60f;
        bool tooClose = distance < 2f;
        bool shouldThrust = facingTarget && !tooClose && distanceFactor > -0.3f;

        // Apply thrust aggressiveness
        currentThrust = shouldThrust && Random.value < thrustAggressiveness;

        // Fire logic
        if (Mathf.Abs(angleDiff) < aimToleranceDegrees && Time.time - lastFireTime >= fireCooldown)
        {
            // Check if we have a clear shot (not going to hit the sun)
            if (!WouldHitSun(toAimPoint.normalized))
            {
                currentFire = true;
                lastFireTime = Time.time;
            }
        }
    }

    /// <summary>
    /// Check if firing in a direction would hit the sun
    /// </summary>
    private bool WouldHitSun(Vector2 direction)
    {
        if (gravityWellTransform == null) return false;

        Vector2 myPos = transform.position;
        Vector2 sunPos = gravityWellTransform.position;

        // Simple check: is the sun roughly in the firing direction?
        Vector2 toSun = sunPos - myPos;
        float angle = Vector2.Angle(direction, toSun);
        float distToSun = toSun.magnitude;

        // Hard is more conservative about shooting near the sun
        float safeDistThreshold = difficulty == Difficulty.Hard ? 6f : 5f;
        float safeAngleThreshold = difficulty == Difficulty.Hard ? 25f : 20f;

        // If sun is close and in firing arc, don't fire
        return distToSun < safeDistThreshold && angle < safeAngleThreshold;
    }

    private void OnDrawGizmosSelected()
    {
        if (targetShip != null)
        {
            Gizmos.color = Color.red;
            Gizmos.DrawLine(transform.position, targetShip.transform.position);
        }

        if (gravityWellTransform != null)
        {
            Gizmos.color = Color.yellow;
            Gizmos.DrawWireSphere(transform.position, sunAvoidRadius);
        }
    }
}
