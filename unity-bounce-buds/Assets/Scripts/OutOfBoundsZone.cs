using UnityEngine;

/// <summary>
/// OutOfBoundsZone - Marker component for the bottom boundary.
/// When the ball enters this zone, it counts as falling out.
/// </summary>
public class OutOfBoundsZone : MonoBehaviour
{
    // This is just a marker component.
    // BuddyBall checks for this component in OnTriggerEnter2D.
}
