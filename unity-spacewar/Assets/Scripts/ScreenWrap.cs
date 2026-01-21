using UnityEngine;

/// <summary>
/// ScreenWrap - Wraps objects around screen edges (toroidal topology)
/// Attach to any object that should wrap around the screen (ships, projectiles)
/// </summary>
public class ScreenWrap : MonoBehaviour
{
    [Header("Settings")]
    [SerializeField] private float buffer = 0.5f;  // Extra buffer beyond screen edge
    [SerializeField] private bool wrapHorizontal = true;
    [SerializeField] private bool wrapVertical = true;

    private Camera mainCamera;
    private float screenHalfWidth;
    private float screenHalfHeight;

    private void Start()
    {
        mainCamera = Camera.main;
        UpdateScreenBounds();
    }

    private void LateUpdate()
    {
        if (mainCamera == null)
        {
            mainCamera = Camera.main;
            if (mainCamera == null) return;
        }

        // Update bounds in case camera size changes
        UpdateScreenBounds();

        // Wrap position
        WrapPosition();
    }

    /// <summary>
    /// Update screen boundaries based on camera
    /// </summary>
    private void UpdateScreenBounds()
    {
        if (mainCamera == null) return;

        screenHalfHeight = mainCamera.orthographicSize + buffer;
        screenHalfWidth = screenHalfHeight * mainCamera.aspect;
    }

    /// <summary>
    /// Wrap the object's position if it goes off screen
    /// </summary>
    private void WrapPosition()
    {
        Vector3 pos = transform.position;
        bool wrapped = false;

        // Horizontal wrapping
        if (wrapHorizontal)
        {
            if (pos.x > screenHalfWidth)
            {
                pos.x = -screenHalfWidth;
                wrapped = true;
            }
            else if (pos.x < -screenHalfWidth)
            {
                pos.x = screenHalfWidth;
                wrapped = true;
            }
        }

        // Vertical wrapping
        if (wrapVertical)
        {
            if (pos.y > screenHalfHeight)
            {
                pos.y = -screenHalfHeight;
                wrapped = true;
            }
            else if (pos.y < -screenHalfHeight)
            {
                pos.y = screenHalfHeight;
                wrapped = true;
            }
        }

        if (wrapped)
        {
            transform.position = pos;

            // Reset trail if present (to avoid lines across screen)
            TrailRenderer trail = GetComponent<TrailRenderer>();
            if (trail != null)
            {
                trail.Clear();
            }
        }
    }

    /// <summary>
    /// Check if a position is within screen bounds
    /// </summary>
    public bool IsOnScreen(Vector3 position)
    {
        return Mathf.Abs(position.x) <= screenHalfWidth &&
               Mathf.Abs(position.y) <= screenHalfHeight;
    }

    /// <summary>
    /// Get screen bounds
    /// </summary>
    public (float halfWidth, float halfHeight) GetScreenBounds()
    {
        return (screenHalfWidth, screenHalfHeight);
    }

    /// <summary>
    /// Visualize screen bounds in editor
    /// </summary>
    private void OnDrawGizmosSelected()
    {
        if (mainCamera == null)
        {
            mainCamera = Camera.main;
            if (mainCamera == null) return;
        }

        UpdateScreenBounds();

        Gizmos.color = Color.green;
        Vector3 topLeft = new Vector3(-screenHalfWidth, screenHalfHeight, 0);
        Vector3 topRight = new Vector3(screenHalfWidth, screenHalfHeight, 0);
        Vector3 bottomLeft = new Vector3(-screenHalfWidth, -screenHalfHeight, 0);
        Vector3 bottomRight = new Vector3(screenHalfWidth, -screenHalfHeight, 0);

        Gizmos.DrawLine(topLeft, topRight);
        Gizmos.DrawLine(topRight, bottomRight);
        Gizmos.DrawLine(bottomRight, bottomLeft);
        Gizmos.DrawLine(bottomLeft, topLeft);
    }
}
