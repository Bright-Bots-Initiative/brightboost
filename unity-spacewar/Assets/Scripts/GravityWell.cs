using UnityEngine;

/// <summary>
/// GravityWell - Central star/sun that pulls ships and projectiles toward it
/// </summary>
public class GravityWell : MonoBehaviour
{
    public static GravityWell Instance { get; private set; }

    [Header("Gravity Settings")]
    [SerializeField] private float gravityStrength = 50f;
    [SerializeField] private float minDistance = 0.5f;  // Prevent infinite force at center
    [SerializeField] private float maxDistance = 20f;   // Beyond this, no gravity
    [SerializeField] private float killRadius = 0.8f;   // Ships destroyed if they enter this radius

    [Header("Visuals")]
    [SerializeField] private SpriteRenderer spriteRenderer;
    [SerializeField] private ParticleSystem coronaEffect;
    [SerializeField] private float pulseSpeed = 1f;
    [SerializeField] private float pulseAmount = 0.1f;

    private Vector3 baseScale;
    private Vector3 originalScale; // Store original for scale multiplier calculations

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

        originalScale = transform.localScale;
        baseScale = originalScale;
    }

    private void Update()
    {
        // Visual pulsing effect
        float pulse = 1f + Mathf.Sin(Time.time * pulseSpeed) * pulseAmount;
        transform.localScale = baseScale * pulse;
    }

    /// <summary>
    /// Calculate gravitational force on an object at a given position
    /// </summary>
    public Vector2 CalculateGravityForce(Vector2 objectPosition)
    {
        Vector2 direction = (Vector2)transform.position - objectPosition;
        float distance = direction.magnitude;

        // No gravity beyond max distance
        if (distance > maxDistance) return Vector2.zero;

        // Clamp minimum distance to prevent extreme forces
        distance = Mathf.Max(distance, minDistance);

        // Inverse square law: F = G * m / r^2
        // Simplified since we're not tracking mass
        float forceMagnitude = gravityStrength / (distance * distance);

        return direction.normalized * forceMagnitude;
    }

    /// <summary>
    /// Check if a position is within the kill radius
    /// </summary>
    public bool IsInKillZone(Vector2 position)
    {
        float distance = Vector2.Distance(transform.position, position);
        return distance < killRadius;
    }

    /// <summary>
    /// Handle ships entering the gravity well (destruction)
    /// </summary>
    private void OnTriggerEnter2D(Collider2D other)
    {
        // Destroy ships that fall into the sun
        ShipController ship = other.GetComponent<ShipController>();
        if (ship != null)
        {
            ship.Die(null); // Self-destruct, no attacker credit
        }

        // Destroy projectiles
        Projectile projectile = other.GetComponent<Projectile>();
        if (projectile != null)
        {
            projectile.DestroyProjectile();
        }
    }

    /// <summary>
    /// Visualize gravity range in editor
    /// </summary>
    private void OnDrawGizmosSelected()
    {
        // Kill radius
        Gizmos.color = Color.red;
        Gizmos.DrawWireSphere(transform.position, killRadius);

        // Minimum distance
        Gizmos.color = Color.yellow;
        Gizmos.DrawWireSphere(transform.position, minDistance);

        // Max gravity range
        Gizmos.color = Color.cyan;
        Gizmos.DrawWireSphere(transform.position, maxDistance);
    }

    /// <summary>
    /// Set gravity tuning at runtime (called by GameManager for balance)
    /// </summary>
    public void SetGravityTuning(float strength, float minDist, float maxDist)
    {
        gravityStrength = strength;
        minDistance = minDist;
        maxDistance = maxDist;
        Debug.Log($"[GravityWell] Tuning applied: strength={strength}, minDist={minDist}, maxDist={maxDist}");
    }

    /// <summary>
    /// Set sun visual scale at runtime (called by GameManager for balance).
    /// Scales transform and adjusts kill radius proportionally.
    /// </summary>
    public void SetSunScale(float scaleMultiplier)
    {
        // Apply multiplier to original scale - pulsing effect will use new baseScale
        baseScale = originalScale * scaleMultiplier;
        transform.localScale = baseScale;

        // Note: CircleCollider2D scales automatically with transform
        Debug.Log($"[GravityWell] Scale set to: {scaleMultiplier} (baseScale: {baseScale})");
    }

    /// <summary>
    /// Get the kill radius (for balance metrics)
    /// </summary>
    public float KillRadius => killRadius;
}
