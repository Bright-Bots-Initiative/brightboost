using UnityEngine;

/// <summary>
/// PaddleController - Player-controlled paddle for bouncing Buddy.
/// Supports keyboard (arrows/A/D) and touch/mouse drag.
/// </summary>
public class PaddleController : MonoBehaviour
{
    private float speed = 12f;
    private float minX = -6f;
    private float maxX = 6f;
    private bool isDragging = false;

    public void SetSpeed(float newSpeed)
    {
        speed = newSpeed;
    }

    private void Awake()
    {
        // Ensure paddle has a visible sprite (fallback if not assigned)
        var sr = GetComponent<SpriteRenderer>();
        if (sr != null && sr.sprite == null)
        {
            sr.sprite = RuntimeSprites.Square;
            Debug.Log("[PaddleController] Assigned fallback square sprite");
        }
    }

    private void Update()
    {
        // Keyboard input
        float horizontal = Input.GetAxis("Horizontal");

        // A/D keys as alternative
        if (Input.GetKey(KeyCode.A)) horizontal = -1f;
        if (Input.GetKey(KeyCode.D)) horizontal = 1f;

        if (Mathf.Abs(horizontal) > 0.01f)
        {
            Vector3 pos = transform.position;
            pos.x += horizontal * speed * Time.deltaTime;
            pos.x = Mathf.Clamp(pos.x, minX, maxX);
            transform.position = pos;
        }

        // Touch/Mouse drag
        if (Input.GetMouseButton(0))
        {
            Vector3 mousePos = Camera.main.ScreenToWorldPoint(Input.mousePosition);
            // Only follow X position, keep Y fixed
            Vector3 pos = transform.position;
            pos.x = Mathf.Lerp(pos.x, mousePos.x, speed * Time.deltaTime * 0.5f);
            pos.x = Mathf.Clamp(pos.x, minX, maxX);
            transform.position = pos;
        }
    }

    private void OnCollisionEnter2D(Collision2D collision)
    {
        // Paddle collision is handled by physics
    }
}
