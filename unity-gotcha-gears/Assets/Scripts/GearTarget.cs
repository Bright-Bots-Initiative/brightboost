using UnityEngine;
using System.Collections;

/// <summary>
/// GearTarget - A gear that moves along a lane and can be caught.
/// </summary>
public class GearTarget : MonoBehaviour
{
    public event System.Action<GearTarget> OnExited;

    [SerializeField] private TextMesh labelText;
    [SerializeField] private TextMesh shadowText;
    [SerializeField] private SpriteRenderer backgroundSprite;

    private string label;
    private bool isCorrect;
    private int lane;
    private float speed;
    private float destroyX = 10f;
    private bool isPaused = true;
    private bool hasExited = false;

    public string Label => label;
    public bool IsCorrect => isCorrect;
    public int Lane => lane;
    public bool IsPaused => isPaused;

    public void Configure(string label, bool correct, int lane, float speed, float destroyX)
    {
        // NULL-SAFE: prevent ToUpper crash on null/empty label
        string safeLabel = string.IsNullOrEmpty(label) ? "???" : label;

        this.label = safeLabel;
        this.isCorrect = correct;
        this.lane = lane;
        this.speed = speed;
        this.destroyX = destroyX;
        this.isPaused = true;
        this.hasExited = false;

        if (labelText != null)
        {
            labelText.text = safeLabel.ToUpper();
        }
        if (shadowText != null)
        {
            shadowText.text = safeLabel.ToUpper();
        }
        if (backgroundSprite != null)
        {
            // Default gear color
            backgroundSprite.color = new Color(0.4f, 0.6f, 0.8f);
        }
    }

    public void SetPaused(bool paused)
    {
        isPaused = paused;
    }

    public void SetSpeed(float newSpeed)
    {
        speed = newSpeed;
    }

    private void Update()
    {
        if (isPaused || hasExited) return;

        // Move right
        transform.position += Vector3.right * speed * Time.deltaTime;

        // Gentle rotation for visual polish
        transform.Rotate(0, 0, -30f * Time.deltaTime);

        // Check if exited screen
        if (transform.position.x > destroyX)
        {
            hasExited = true;
            OnExited?.Invoke(this);
        }
    }

    /// <summary>
    /// Show feedback when caught (correct or wrong).
    /// </summary>
    public void ShowCaughtFeedback(bool wasCorrect)
    {
        isPaused = true;

        if (backgroundSprite != null)
        {
            backgroundSprite.color = wasCorrect
                ? new Color(0.2f, 0.8f, 0.3f)  // Green for correct
                : new Color(0.8f, 0.2f, 0.2f); // Red for wrong
        }

        // Pop effect
        StartCoroutine(PopEffect());
    }

    private IEnumerator PopEffect()
    {
        Vector3 originalScale = transform.localScale;
        Vector3 popScale = originalScale * 1.3f;

        float t = 0;
        while (t < 0.15f)
        {
            t += Time.deltaTime;
            transform.localScale = Vector3.Lerp(originalScale, popScale, t / 0.15f);
            yield return null;
        }

        t = 0;
        while (t < 0.1f)
        {
            t += Time.deltaTime;
            transform.localScale = Vector3.Lerp(popScale, originalScale, t / 0.1f);
            yield return null;
        }

        transform.localScale = originalScale;
    }

    private void OnMouseDown()
    {
        // Optional: clicking a gear could select its lane and attempt catch
        if (GotchaGearsGameManager.Instance != null)
        {
            GotchaGearsGameManager.Instance.OnGearClicked(this);
        }
    }
}
