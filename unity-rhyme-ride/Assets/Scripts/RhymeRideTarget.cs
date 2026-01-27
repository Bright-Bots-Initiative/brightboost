using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// RhymeRideTarget - Represents a word target moving down a lane.
/// </summary>
public class RhymeRideTarget : MonoBehaviour
{
    [Header("Visual References")]
    [SerializeField] private Text wordText;
    [SerializeField] private SpriteRenderer backgroundSprite;
    [SerializeField] private Color correctColor = new Color(0.4f, 0.8f, 0.4f);
    [SerializeField] private Color incorrectColor = new Color(0.8f, 0.4f, 0.4f);

    public event System.Action<RhymeRideTarget, bool> OnTargetHit;
    public event System.Action<RhymeRideTarget> OnTargetMissed;

    public string Word { get; private set; }
    public bool IsCorrect { get; private set; }
    public string PromptWord { get; private set; }
    public int Lane { get; private set; }

    private float speed;
    private float destroyY;
    private bool isActive = true;

    public void Initialize(string word, bool isCorrect, string promptWord, float moveSpeed, float destroyAtY)
    {
        Word = word;
        IsCorrect = isCorrect;
        PromptWord = promptWord;
        speed = moveSpeed;
        destroyY = destroyAtY;

        // Determine lane from X position
        float x = transform.position.x;
        if (x < -1.5f) Lane = 0;
        else if (x > 1.5f) Lane = 2;
        else Lane = 1;

        // Set visual
        if (wordText != null)
        {
            wordText.text = word;
        }

        // Optional: tint based on correct/incorrect (for debugging)
        // In production, all targets should look the same
#if UNITY_EDITOR
        if (backgroundSprite != null)
        {
            backgroundSprite.color = isCorrect ? correctColor : incorrectColor;
        }
#endif
    }

    private void Update()
    {
        if (!isActive) return;

        // Move down
        transform.Translate(Vector3.down * speed * Time.deltaTime);

        // Check if past destroy line
        if (transform.position.y < destroyY)
        {
            isActive = false;
            OnTargetMissed?.Invoke(this);
        }
    }

    /// <summary>
    /// Called when the player hits this target.
    /// </summary>
    public void Hit()
    {
        if (!isActive) return;

        isActive = false;
        OnTargetHit?.Invoke(this, IsCorrect);
    }

    private void OnMouseDown()
    {
        // Allow clicking directly on target
        Hit();
    }
}
