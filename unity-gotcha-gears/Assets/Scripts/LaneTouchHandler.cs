using UnityEngine;

/// <summary>
/// LaneTouchHandler - Detects clicks/taps on a lane and notifies GameManager.
/// </summary>
public class LaneTouchHandler : MonoBehaviour
{
    [SerializeField] private int laneIndex;

    public void SetLaneIndex(int index)
    {
        laneIndex = index;
    }

    private void OnMouseDown()
    {
        if (GotchaGearsGameManager.Instance != null)
        {
            GotchaGearsGameManager.Instance.OnLaneSelected(laneIndex);
        }
    }
}
