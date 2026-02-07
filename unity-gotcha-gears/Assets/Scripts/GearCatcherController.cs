using UnityEngine;

/// <summary>
/// GearCatcherController - Controls the catcher that moves between lanes.
/// </summary>
public class GearCatcherController : MonoBehaviour
{
    [SerializeField] private float smoothTime = 0.1f;
    [SerializeField] private SpriteRenderer backgroundSprite;

    private int selectedLane = 1; // 0=top, 1=middle, 2=bottom
    private float[] laneYPositions = { 2f, 0f, -2f };
    private float targetY;
    private float velocityY;
    private bool isEnabled = true;

    public int SelectedLane => selectedLane;

    private void Start()
    {
        targetY = laneYPositions[selectedLane];
        transform.position = new Vector3(transform.position.x, targetY, transform.position.z);
    }

    public void SetLanePositions(float[] positions)
    {
        laneYPositions = positions;
        if (selectedLane < laneYPositions.Length)
        {
            targetY = laneYPositions[selectedLane];
        }
    }

    public void SetEnabled(bool enabled)
    {
        isEnabled = enabled;
    }

    public void SelectLane(int lane)
    {
        if (!isEnabled) return;
        if (lane < 0 || lane >= laneYPositions.Length) return;

        selectedLane = lane;
        targetY = laneYPositions[selectedLane];
    }

    public void MoveUp()
    {
        if (!isEnabled) return;
        if (selectedLane > 0)
        {
            selectedLane--;
            targetY = laneYPositions[selectedLane];
        }
    }

    public void MoveDown()
    {
        if (!isEnabled) return;
        if (selectedLane < laneYPositions.Length - 1)
        {
            selectedLane++;
            targetY = laneYPositions[selectedLane];
        }
    }

    private void Update()
    {
        // Keyboard input
        if (isEnabled)
        {
            if (Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.W))
            {
                MoveUp();
            }
            if (Input.GetKeyDown(KeyCode.DownArrow) || Input.GetKeyDown(KeyCode.S))
            {
                MoveDown();
            }
        }

        // Smooth movement to target lane
        float newY = Mathf.SmoothDamp(transform.position.y, targetY, ref velocityY, smoothTime);
        transform.position = new Vector3(transform.position.x, newY, transform.position.z);
    }

    public void HighlightLane(bool highlight)
    {
        if (backgroundSprite != null)
        {
            backgroundSprite.color = highlight
                ? new Color(1f, 0.8f, 0.2f, 0.8f) // Bright yellow when highlighted
                : new Color(0.6f, 0.6f, 0.6f, 0.6f); // Dim when not
        }
    }
}
