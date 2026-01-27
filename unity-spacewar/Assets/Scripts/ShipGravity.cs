using UnityEngine;

/// <summary>
/// ShipGravity - Applies gravitational pull from the central gravity well to ships
/// Attach to ships alongside ShipController
/// </summary>
[RequireComponent(typeof(Rigidbody2D))]
public class ShipGravity : MonoBehaviour
{
    [Header("Settings")]
    [SerializeField] private float gravityMultiplier = 1f;

    private Rigidbody2D rb;

    private void Awake()
    {
        rb = GetComponent<Rigidbody2D>();
    }

    private void FixedUpdate()
    {
        if (GravityWell.Instance == null) return;

        // Calculate and apply gravity force
        Vector2 gravityForce = GravityWell.Instance.CalculateGravityForce(transform.position);
        rb.AddForce(gravityForce * gravityMultiplier);
    }

    /// <summary>
    /// Set gravity multiplier at runtime (called by GameManager for balance)
    /// </summary>
    public void SetMultiplier(float multiplier)
    {
        gravityMultiplier = multiplier;
        Debug.Log($"[ShipGravity] Multiplier set to: {multiplier}");
    }

    /// <summary>
    /// Get current gravity multiplier (for perk calculations)
    /// </summary>
    public float Multiplier => gravityMultiplier;
}
