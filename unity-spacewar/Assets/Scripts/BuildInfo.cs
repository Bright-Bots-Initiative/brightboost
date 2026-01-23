/// <summary>
/// BuildInfo - Static build/version information for Spacewar balance tracking
/// </summary>
public static class BuildInfo
{
    /// <summary>
    /// Current balance version identifier
    /// </summary>
    public const string BalanceVersion = "balance-v1.3";

    /// <summary>
    /// Build timestamp in UTC (set at implementation time)
    /// </summary>
    public const string BuildTimestampUtc = "2026-01-23T12:00:00Z";

    /// <summary>
    /// Combined stamp for display and logging
    /// </summary>
    public static string Stamp => $"{BalanceVersion} • {BuildTimestampUtc}";
}
