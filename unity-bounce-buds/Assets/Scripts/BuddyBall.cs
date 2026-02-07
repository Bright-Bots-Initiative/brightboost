using UnityEngine;

/// <summary>
/// BuddyBall - The ball that players bounce through gates.
/// Supports "serve" mode: ball sits on paddle until launched.
/// </summary>
public class BuddyBall : MonoBehaviour
{
    public event System.Action OnFellOut;

    private Rigidbody2D rb;
    private float targetSpeed = 7f;
    private bool isActive = true;

    // Serve/launch state
    private Transform followPaddle;
    private float followYOffset = 0.8f;
    public bool IsLaunched { get; private set; } = false;

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
        // Don't auto-launch - wait for AttachToPaddle + LaunchUp
        // If not attached to paddle, stay still
        if (!IsLaunched && followPaddle == null && rb != null)
        {
            rb.linearVelocity = Vector2.zero;
            rb.simulated = false;
        }
    }

    /// <summary>
    /// Attach ball to paddle for serve mode.
    /// Ball follows paddle until LaunchUp() is called.
    /// </summary>
    public void AttachToPaddle(Transform paddle, float yOffset = 0.8f)
    {
        followPaddle = paddle;
        followYOffset = yOffset;
        IsLaunched = false;
        isActive = true;

        if (rb != null)
        {
            rb.simulated = false;
            rb.linearVelocity = Vector2.zero;
            rb.angularVelocity = 0;
        }

        // Snap to paddle position
        if (followPaddle != null)
        {
            transform.position = new Vector3(followPaddle.position.x, followPaddle.position.y + followYOffset, 0);
        }

        Debug.Log("[BuddyBall] Attached to paddle, awaiting launch");
    }

    /// <summary>
    /// Launch ball straight up from current position.
    /// </summary>
    public void LaunchUp()
    {
        Launch(Vector2.up);
    }

    /// <summary>
    /// Launch ball in a specific direction.
    /// </summary>
    public void Launch(Vector2 direction)
    {
        if (IsLaunched) return;

        IsLaunched = true;
        followPaddle = null;

        if (rb != null)
        {
            rb.simulated = true;
            rb.linearVelocity = direction.normalized * targetSpeed;
        }

        Debug.Log($"[BuddyBall] Launched with direction: {direction.normalized}");
    }

    private void Update()
    {
        // Follow paddle while not launched
        if (!IsLaunched && followPaddle != null)
        {
            transform.position = new Vector3(followPaddle.position.x, followPaddle.position.y + followYOffset, 0);
        }
    }

    private void FixedUpdate()
    {
        if (!isActive || rb == null || !IsLaunched) return;

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
        // Only process if launched
        if (!IsLaunched) return;

        // Check for out of bounds zone
        if (other.GetComponent<OutOfBoundsZone>() != null)
        {
            isActive = false;
            OnFellOut?.Invoke();
        }
    }

    private void OnCollisionEnter2D(Collision2D collision)
    {
        if (!IsLaunched) return;

        // Ensure bouncing maintains speed
        if (rb != null)
        {
            rb.linearVelocity = rb.linearVelocity.normalized * targetSpeed;
        }

        // Add slight angle variation when hitting paddle for more control
        var paddle = collision.gameObject.GetComponent<PaddleController>();
        if (paddle != null && rb != null)
        {
            // Calculate hit position on paddle (-1 to 1)
            float hitPoint = (transform.position.x - collision.transform.position.x) / 1.25f;
            hitPoint = Mathf.Clamp(hitPoint, -1f, 1f);

            // Adjust angle based on hit position
            Vector2 dir = new Vector2(hitPoint * 0.6f, 1f).normalized;
            rb.linearVelocity = dir * targetSpeed;
        }
    }
}
