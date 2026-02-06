using UnityEngine;

/// <summary>
/// RuntimeSprites - Generates simple sprites at runtime for fallback rendering.
/// Used when prefabs don't have sprites assigned.
/// </summary>
public static class RuntimeSprites
{
    private static Sprite _square;
    private static Sprite _circle;

    public static Sprite Square
    {
        get
        {
            if (_square == null) _square = CreateSquareSprite(64);
            return _square;
        }
    }

    public static Sprite Circle
    {
        get
        {
            if (_circle == null) _circle = CreateCircleSprite(64);
            return _circle;
        }
    }

    private static Sprite CreateSquareSprite(int size)
    {
        var tex = new Texture2D(size, size, TextureFormat.RGBA32, false);
        tex.filterMode = FilterMode.Bilinear;
        var pixels = new Color[size * size];
        for (int i = 0; i < pixels.Length; i++) pixels[i] = Color.white;
        tex.SetPixels(pixels);
        tex.Apply();
        tex.wrapMode = TextureWrapMode.Clamp;
        tex.hideFlags = HideFlags.HideAndDontSave;
        return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size);
    }

    private static Sprite CreateCircleSprite(int size)
    {
        var tex = new Texture2D(size, size, TextureFormat.RGBA32, false);
        tex.filterMode = FilterMode.Bilinear;

        float r = (size - 1) / 2f;
        var c = new Vector2(r, r);

        var pixels = new Color[size * size];
        for (int y = 0; y < size; y++)
        {
            for (int x = 0; x < size; x++)
            {
                float dist = Vector2.Distance(new Vector2(x, y), c);
                pixels[y * size + x] = dist <= r ? Color.white : new Color(1, 1, 1, 0);
            }
        }

        tex.SetPixels(pixels);
        tex.Apply();
        tex.wrapMode = TextureWrapMode.Clamp;
        tex.hideFlags = HideFlags.HideAndDontSave;
        return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size);
    }
}
