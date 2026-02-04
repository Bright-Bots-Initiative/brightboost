using UnityEngine;

/// <summary>
/// RhymeRideTarget - Represents a word target moving horizontally across a lane.
/// Gotcha-style: targets move from left to right.
/// </summary>
public class RhymeRideTarget : MonoBehaviour
{
    [Header("Visual References")]
    [SerializeField] private SpriteRenderer backgroundSprite;
    [SerializeField] private TextMesh wordText;
    [SerializeField] private TextMesh shadowText;

    [Header("Colors")]
    [SerializeField] private Color normalColor = new Color(0.3f, 0.5f, 0.8f);
    [SerializeField] private Color correctHitColor = new Color(0.3f, 0.8f, 0.4f);
    [SerializeField] private Color wrongHitColor = new Color(0.8f, 0.3f, 0.3f);

    public event System.Action<RhymeRideTarget, bool> OnTargetHit;
    public event System.Action<RhymeRideTarget> OnTargetExited;

    public string Word { get; private set; }
    public int Lane { get; private set; }
    public bool IsCorrect { get; private set; }

    private float speed;
    private float destroyX;
    private bool isActive = true;

    public void Initialize(string word, int lane, bool isCorrect, float moveSpeed, float exitX)
    {
        Word = word;
        Lane = lane;
        IsCorrect = isCorrect;
        speed = moveSpeed;
        destroyX = exitX;

        // Set visual
        if (wordText != null)
        {
            wordText.text = word;
        }

        if (shadowText != null)
        {
            shadowText.text = word;
        }

        if (backgroundSprite != null)
        {
            backgroundSprite.color = normalColor;
        }
    }

    private void Update()
    {
        if (!isActive) return;

        // Move right (horizontal movement for Gotcha feel)
        transform.Translate(Vector3.right * speed * Time.deltaTime);

        // Check if past destroy line (right side of screen)
        if (transform.position.x > destroyX)
        {
            isActive = false;
            OnTargetExited?.Invoke(this);
        }
    }

    /// <summary>
    /// Called when the player hits this target.
    /// </summary>
    public void Hit()
    {
        if (!isActive) return;

        isActive = false;

        // Visual feedback
        if (backgroundSprite != null)
        {
            backgroundSprite.color = IsCorrect ? correctHitColor : wrongHitColor;
        }

        OnTargetHit?.Invoke(this, IsCorrect);
    }

    private void OnMouseDown()
    {
        // Allow clicking directly on target
        Hit();
    }
}
