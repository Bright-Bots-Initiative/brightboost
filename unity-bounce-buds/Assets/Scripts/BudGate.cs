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
            labelText.text = label.ToUpper();
        }

        if (backgroundSprite != null)
        {
            // All gates look the same initially
            backgroundSprite.color = new Color(0.3f, 0.6f, 0.4f);
        }
    }

    private void OnTriggerEnter2D(Collider2D other)
    {
        if (hasBeenHit) return;

        // Check if it's the buddy ball
        var ball = other.GetComponent<BuddyBall>();
        if (ball != null)
        {
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
