using UnityEngine;

/// <summary>
/// ObstacleBumper - Static obstacle that bounces the ball.
/// </summary>
public class ObstacleBumper : MonoBehaviour
{
    // This component is primarily a marker.
    // The actual bouncing is handled by the 2D physics collider.
    // PhysicsMaterial2D with bounciness=1, friction=0 should be applied.

    private void Awake()
    {
        // Ensure obstacle has a visible sprite (fallback if not assigned)
        var sr = GetComponent<SpriteRenderer>();
        if (sr != null && sr.sprite == null)
        {
            sr.sprite = RuntimeSprites.Circle;
            Debug.Log("[ObstacleBumper] Assigned fallback circle sprite");
        }
    }
}
