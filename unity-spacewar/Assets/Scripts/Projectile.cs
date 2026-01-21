using UnityEngine;

/// <summary>
/// Projectile - Handles missile behavior including movement, gravity influence, and lifetime
/// </summary>
public class Projectile : MonoBehaviour
{
    [Header("Settings")]
    [SerializeField] private float lifetime = 3f;
    [SerializeField] private float gravityMultiplier = 1f;

    [Header("Visuals")]
    [SerializeField] private SpriteRenderer spriteRenderer;
    [SerializeField] private TrailRenderer trail;

    // State
    private ShipController owner;
    private Rigidbody2D rb;
    private float speed;
    private float spawnTime;

    public ShipController Owner => owner;

    private void Awake()
    {
        rb = GetComponent<Rigidbody2D>();

        if (spriteRenderer == null)
        {
            spriteRenderer = GetComponent<SpriteRenderer>();
        }
    }

    /// <summary>
    /// Initialize the projectile with owner and speed
    /// </summary>
    public void Initialize(ShipController ownerShip, float projectileSpeed, Color color)
    {
        owner = ownerShip;
        speed = projectileSpeed;
        spawnTime = Time.time;

        // Set velocity in the forward direction
        if (rb != null)
        {
            rb.velocity = transform.up * speed;
        }

        // Set color
        if (spriteRenderer != null)
        {
            spriteRenderer.color = color;
        }

        if (trail != null)
        {
            trail.startColor = color;
            trail.endColor = new Color(color.r, color.g, color.b, 0);
        }
    }

    private void Update()
    {
        // Check lifetime
        if (Time.time - spawnTime > lifetime)
        {
            DestroyProjectile();
        }
    }

    private void FixedUpdate()
    {
        // Apply gravity from GravityWell
        if (GravityWell.Instance != null)
        {
            Vector2 gravityForce = GravityWell.Instance.CalculateGravityForce(transform.position);
            rb.AddForce(gravityForce * gravityMultiplier);
        }
    }

    /// <summary>
    /// Destroy the projectile and notify owner
    /// </summary>
    public void DestroyProjectile()
    {
        if (owner != null)
        {
            owner.OnProjectileDestroyed();
        }

        Destroy(gameObject);
    }

    /// <summary>
    /// Handle collision with gravity well or other obstacles
    /// </summary>
    private void OnTriggerEnter2D(Collider2D other)
    {
        // Destroy on hitting gravity well
        if (other.CompareTag("GravityWell"))
        {
            DestroyProjectile();
        }
    }
}
