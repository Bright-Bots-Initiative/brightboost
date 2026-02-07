using UnityEngine;

/// <summary>
/// AimIndicator - Visual arrow showing launch direction.
/// Player drags to adjust angle before launching the ball.
/// </summary>
public class AimIndicator : MonoBehaviour
{
    private LineRenderer lineRenderer;
    private float arrowLength = 1.5f;
    private float currentAngle = 90f; // Straight up

    private void Awake()
    {
        // Create LineRenderer if not present
        lineRenderer = GetComponent<LineRenderer>();
        if (lineRenderer == null)
        {
            lineRenderer = gameObject.AddComponent<LineRenderer>();
        }

        // Configure line appearance
        lineRenderer.positionCount = 2;
        lineRenderer.startWidth = 0.15f;
        lineRenderer.endWidth = 0.05f;
        lineRenderer.useWorldSpace = true;
        lineRenderer.sortingOrder = 10;

        // Create a simple material with color
        lineRenderer.material = new Material(Shader.Find("Sprites/Default"));
        lineRenderer.startColor = new Color(1f, 0.9f, 0.3f, 0.9f); // Bright yellow
        lineRenderer.endColor = new Color(1f, 0.7f, 0.2f, 0.7f);

        // Start hidden
        SetVisible(false);
    }

    /// <summary>
    /// Set the aim angle in degrees (0 = right, 90 = up, 180 = left).
    /// </summary>
    public void SetAngle(float degrees)
    {
        currentAngle = degrees;
        UpdateVisual();
    }

    /// <summary>
    /// Get the current aim angle in degrees.
    /// </summary>
    public float GetAngle()
    {
        return currentAngle;
    }

    /// <summary>
    /// Get the direction vector for the current angle.
    /// </summary>
    public Vector2 GetDirection()
    {
        float rad = currentAngle * Mathf.Deg2Rad;
        return new Vector2(Mathf.Cos(rad), Mathf.Sin(rad));
    }

    /// <summary>
    /// Show or hide the aim indicator.
    /// </summary>
    public void SetVisible(bool visible)
    {
        if (lineRenderer != null)
        {
            lineRenderer.enabled = visible;
        }
    }

    private void UpdateVisual()
    {
        if (lineRenderer == null) return;

        Vector3 start = transform.position;
        Vector2 dir = GetDirection();
        Vector3 end = start + new Vector3(dir.x, dir.y, 0) * arrowLength;

        lineRenderer.SetPosition(0, start);
        lineRenderer.SetPosition(1, end);
    }

    private void LateUpdate()
    {
        // Keep visual updated with position
        if (lineRenderer != null && lineRenderer.enabled)
        {
            UpdateVisual();
        }
    }
}
