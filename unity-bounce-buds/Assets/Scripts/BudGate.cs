using UnityEngine;

/// <summary>
/// BudGate - Answer gate that Buddy must enter.
/// </summary>
public class BudGate : MonoBehaviour
{
    public event System.Action<bool> OnHit;

    [SerializeField] private TextMesh labelText;
    [SerializeField] private SpriteRenderer backgroundSprite;

    private bool isCorrect = false;
    private bool hasBeenHit = false;

    public void Configure(string label, bool correct)
    {
        isCorrect = correct;
        hasBeenHit = false;

        if (labelText != null)
        {
            ApplyGateLabel(label.ToUpper());
        }

        if (backgroundSprite != null)
        {
            // Ensure gate background has a visible sprite (fallback if not assigned)
            if (backgroundSprite.sprite == null)
            {
                backgroundSprite.sprite = RuntimeSprites.Square;
                Debug.Log("[BudGate] Assigned fallback square sprite to background");
            }
            // All gates look the same initially
            backgroundSprite.color = new Color(0.3f, 0.6f, 0.4f);
        }
    }

    /// <summary>
    /// Apply label text with auto-sizing to prevent overlap.
    /// Shrinks font and wraps long words to fit within gate.
    /// </summary>
    private void ApplyGateLabel(string text)
    {
        if (labelText == null) return;

        int len = text.Length;
        string displayText = text;

        // Auto-size based on text length
        if (len <= 6)
        {
            // Short words: full size
            labelText.characterSize = 0.10f;
            labelText.fontSize = 48;
        }
        else if (len <= 9)
        {
            // Medium words: slightly smaller
            labelText.characterSize = 0.085f;
            labelText.fontSize = 44;
        }
        else if (len <= 12)
        {
            // Long words: smaller + wrap
            labelText.characterSize = 0.075f;
            labelText.fontSize = 40;
            displayText = WrapText(text);
        }
        else
        {
            // Very long words: smallest + wrap
            labelText.characterSize = 0.065f;
            labelText.fontSize = 36;
            displayText = WrapText(text);
        }

        labelText.text = displayText;
    }

    /// <summary>
    /// Wrap text by inserting a newline near the middle.
    /// </summary>
    private string WrapText(string text)
    {
        if (text.Length <= 8) return text;

        int mid = text.Length / 2;
        // Try to find a good break point near the middle
        int breakPoint = mid;

        // Look for a natural break (space, hyphen) within 3 chars of middle
        for (int i = 0; i <= 3; i++)
        {
            if (mid + i < text.Length && (text[mid + i] == ' ' || text[mid + i] == '-'))
            {
                breakPoint = mid + i + 1;
                break;
            }
            if (mid - i >= 0 && (text[mid - i] == ' ' || text[mid - i] == '-'))
            {
                breakPoint = mid - i + 1;
                break;
            }
        }

        // If no natural break, just split at middle
        if (breakPoint == mid)
        {
            breakPoint = mid;
        }

        return text.Substring(0, breakPoint).Trim() + "\n" + text.Substring(breakPoint).Trim();
    }

    private void OnTriggerEnter2D(Collider2D other)
    {
        if (hasBeenHit) return;

        // Don't register hits before ball is launched
        if (BounceBudsGameManager.Instance != null && BounceBudsGameManager.Instance.IsAwaitingLaunch)
        {
            return;
        }

        // Check if it's the buddy ball
        var ball = other.GetComponent<BuddyBall>();
        if (ball != null)
        {
            // Also check if ball is launched
            if (!ball.IsLaunched) return;
            hasBeenHit = true;

            // Show feedback color
            if (backgroundSprite != null)
            {
                backgroundSprite.color = isCorrect
                    ? new Color(0.2f, 0.8f, 0.3f)  // Green for correct
                    : new Color(0.8f, 0.2f, 0.2f); // Red for wrong
            }

            OnHit?.Invoke(isCorrect);
        }
    }
}
