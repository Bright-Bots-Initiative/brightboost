using UnityEngine;

/// <summary>
/// BuddyBall - The ball that players bounce through gates.
/// </summary>
public class BuddyBall : MonoBehaviour
{
    public event System.Action OnFellOut;

    private Rigidbody2D rb;
    private float targetSpeed = 7f;
    private bool isActive = true;

    public void SetSpeed(float speed)
    {
        targetSpeed = speed;
    }

    private void Awake()
    {
        rb = GetComponent<Rigidbody2D>();

        // Ensure ball has a visible sprite (fallback if not assigned)
        var sr = GetComponent<SpriteRenderer>();
        if (sr != null && sr.sprite == null)
        {
            sr.sprite = RuntimeSprites.Circle;
            Debug.Log("[BuddyBall] Assigned fallback circle sprite");
        }
    }

    private void Start()
    {
        // Launch upward with slight random X
        float randomX = Random.Range(-0.3f, 0.3f);
        rb.linearVelocity = new Vector2(randomX, 1f).normalized * targetSpeed;
    }

    private void FixedUpdate()
    {
        if (!isActive || rb == null) return;

        // Maintain velocity magnitude to prevent drift
        float currentSpeed = rb.linearVelocity.magnitude;
        if (currentSpeed < targetSpeed * 0.5f && currentSpeed > 0.1f)
        {
            rb.linearVelocity = rb.linearVelocity.normalized * targetSpeed;
        }
        else if (currentSpeed > targetSpeed * 1.5f)
        {
            rb.linearVelocity = rb.linearVelocity.normalized * targetSpeed;
        }

        // Ensure ball doesn't get stuck moving horizontally
        if (Mathf.Abs(rb.linearVelocity.y) < 0.5f && rb.linearVelocity.magnitude > 1f)
        {
            Vector2 vel = rb.linearVelocity;
            vel.y = Mathf.Sign(vel.y) * 2f;
            if (Mathf.Abs(vel.y) < 0.1f) vel.y = 2f;
            rb.linearVelocity = vel.normalized * targetSpeed;
        }
    }

    private void OnTriggerEnter2D(Collider2D other)
    {
        // Check for out of bounds zone
        if (other.GetComponent<OutOfBoundsZone>() != null)
        {
            isActive = false;
            OnFellOut?.Invoke();
        }
    }

    private void OnCollisionEnter2D(Collision2D collision)
    {
        // Ensure bouncing maintains speed
        if (rb != null)
        {
            rb.linearVelocity = rb.linearVelocity.normalized * targetSpeed;
        }
    }
}
