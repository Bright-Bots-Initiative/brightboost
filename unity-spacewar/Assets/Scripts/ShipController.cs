using UnityEngine;
using System.Collections;

/// <summary>
/// ShipController - Handles ship movement, rotation, firing, and hyperspace
/// </summary>
public class ShipController : MonoBehaviour
{
    [Header("Player Settings")]
    [SerializeField] private int playerNumber = 1; // 1 or 2
    [SerializeField] private string archetype = "AI";

    [Header("Movement")]
    [SerializeField] private float rotationSpeed = 180f;
    [SerializeField] private float thrustForce = 5f;
    [SerializeField] private float maxSpeed = 8f;
    [SerializeField] private float drag = 0.5f;

    [Header("Weapons")]
    [SerializeField] private GameObject projectilePrefab;
    [SerializeField] private Transform firePoint;
    [SerializeField] private float fireRate = 0.3f;
    [SerializeField] private int maxActiveProjectiles = 4;
    [SerializeField] private float projectileSpeed = 12f;

    [Header("Hyperspace")]
    [SerializeField] private float hyperspaceCooldown = 5f;
    [SerializeField] private float hyperspaceRiskChance = 0.15f; // 15% chance to explode

    [Header("Visuals")]
    [SerializeField] private SpriteRenderer shipSprite;
    [SerializeField] private TrailRenderer thrustTrail;
    [SerializeField] private ParticleSystem thrustParticles;
    [SerializeField] private ParticleSystem explosionPrefab;

    [Header("Audio")]
    [SerializeField] private AudioClip thrustSound;
    [SerializeField] private AudioClip fireSound;
    [SerializeField] private AudioClip hyperspaceSound;
    [SerializeField] private AudioClip explosionSound;

    // Archetype colors
    private readonly Color aiColor = new Color(0.2f, 0.6f, 1f);        // Blue
    private readonly Color quantumColor = new Color(0.8f, 0.2f, 1f);   // Purple
    private readonly Color biotechColor = new Color(0.2f, 1f, 0.4f);   // Green

    // State
    private Rigidbody2D rb;
    private AudioSource audioSource;
    private bool controlsEnabled = false;
    private float lastFireTime = 0f;
    private float lastHyperspaceTime = -10f;
    private int activeProjectileCount = 0;
    private bool isThrusting = false;
    private bool isAlive = true;

    // External control (for CPU/AI)
    private bool externalControlEnabled = false;
    private float externalRotateInput = 0f;
    private bool externalThrust = false;
    private bool externalFire = false;
    private bool externalHyperspace = false;

    // Input keys based on player number
    private KeyCode rotateLeftKey;
    private KeyCode rotateRightKey;
    private KeyCode thrustKey;
    private KeyCode fireKey;
    private KeyCode hyperspaceKey;

    private void Awake()
    {
        rb = GetComponent<Rigidbody2D>();
        audioSource = GetComponent<AudioSource>();

        if (audioSource == null)
        {
            audioSource = gameObject.AddComponent<AudioSource>();
        }

        SetupInputKeys();
    }

    private void Start()
    {
        SetArchetype(archetype);
    }

    /// <summary>
    /// Setup input keys based on player number
    /// </summary>
    private void SetupInputKeys()
    {
        if (playerNumber == 1)
        {
            // P1: A/D rotate, W thrust, Space fire, S hyperspace
            rotateLeftKey = KeyCode.A;
            rotateRightKey = KeyCode.D;
            thrustKey = KeyCode.W;
            fireKey = KeyCode.Space;
            hyperspaceKey = KeyCode.S;
        }
        else
        {
            // P2: Left/Right rotate, Up thrust, RightCtrl fire, Down hyperspace
            rotateLeftKey = KeyCode.LeftArrow;
            rotateRightKey = KeyCode.RightArrow;
            thrustKey = KeyCode.UpArrow;
            fireKey = KeyCode.RightControl;
            hyperspaceKey = KeyCode.DownArrow;
        }
    }

    private void Update()
    {
        if (!controlsEnabled || !isAlive) return;

        if (externalControlEnabled)
        {
            // Use external inputs (from CPU/AI)
            HandleExternalRotation();
            HandleExternalThrust();
            HandleExternalFiring();
            HandleExternalHyperspace();
        }
        else
        {
            // Use keyboard inputs
            HandleRotation();
            HandleThrust();
            HandleFiring();
            HandleHyperspace();
        }
    }

    private void FixedUpdate()
    {
        if (!isAlive) return;

        // Apply drag
        rb.linearVelocity *= (1f - drag * Time.fixedDeltaTime);

        // Clamp max speed
        if (rb.linearVelocity.magnitude > maxSpeed)
        {
            rb.linearVelocity = rb.linearVelocity.normalized * maxSpeed;
        }
    }

    /// <summary>
    /// Handle ship rotation (keyboard input)
    /// </summary>
    private void HandleRotation()
    {
        float rotationInput = 0f;

        if (Input.GetKey(rotateLeftKey))
        {
            rotationInput = 1f;
        }
        else if (Input.GetKey(rotateRightKey))
        {
            rotationInput = -1f;
        }

        transform.Rotate(0, 0, rotationInput * rotationSpeed * Time.deltaTime);
    }

    /// <summary>
    /// Handle ship rotation (external input)
    /// </summary>
    private void HandleExternalRotation()
    {
        transform.Rotate(0, 0, externalRotateInput * rotationSpeed * Time.deltaTime);
    }

    /// <summary>
    /// Handle ship thrust (keyboard input)
    /// </summary>
    private void HandleThrust()
    {
        bool wasThrusting = isThrusting;
        isThrusting = Input.GetKey(thrustKey);
        ApplyThrust(wasThrusting);
    }

    /// <summary>
    /// Handle ship thrust (external input)
    /// </summary>
    private void HandleExternalThrust()
    {
        bool wasThrusting = isThrusting;
        isThrusting = externalThrust;
        ApplyThrust(wasThrusting);
    }

    /// <summary>
    /// Apply thrust logic (shared between keyboard and external)
    /// </summary>
    private void ApplyThrust(bool wasThrusting)
    {
        if (isThrusting)
        {
            rb.AddForce(transform.up * thrustForce);

            // Enable thrust visuals
            if (thrustTrail != null)
            {
                thrustTrail.emitting = true;
            }
            if (thrustParticles != null && !thrustParticles.isPlaying)
            {
                thrustParticles.Play();
            }

            // Play thrust sound
            if (!wasThrusting && audioSource != null && thrustSound != null)
            {
                audioSource.clip = thrustSound;
                audioSource.loop = true;
                audioSource.Play();
            }
        }
        else
        {
            // Disable thrust visuals
            if (thrustTrail != null)
            {
                thrustTrail.emitting = false;
            }
            if (thrustParticles != null && thrustParticles.isPlaying)
            {
                thrustParticles.Stop();
            }

            // Stop thrust sound
            if (wasThrusting && audioSource != null && audioSource.clip == thrustSound)
            {
                audioSource.Stop();
            }
        }
    }

    /// <summary>
    /// Handle firing projectiles (keyboard input)
    /// </summary>
    private void HandleFiring()
    {
        // P2 accepts both LeftControl and RightControl as fire (WebGL browser compat)
        bool firePressed = Input.GetKeyDown(fireKey);
        if (!firePressed && playerNumber == 2)
        {
            firePressed = Input.GetKeyDown(KeyCode.LeftControl) || Input.GetKeyDown(KeyCode.RightControl);
        }

        if (firePressed)
        {
            TryFire();
        }
    }

    /// <summary>
    /// Handle firing projectiles (external input)
    /// </summary>
    private void HandleExternalFiring()
    {
        if (externalFire)
        {
            TryFire();
        }
    }

    /// <summary>
    /// Attempt to fire a projectile
    /// </summary>
    private void TryFire()
    {
        // Check cooldown
        if (Time.time - lastFireTime < fireRate) return;

        // Check max active projectiles
        if (activeProjectileCount >= maxActiveProjectiles) return;

        // Fire
        lastFireTime = Time.time;
        activeProjectileCount++;

        if (projectilePrefab != null && firePoint != null)
        {
            GameObject proj = Instantiate(projectilePrefab, firePoint.position, firePoint.rotation);
            Projectile projectile = proj.GetComponent<Projectile>();

            if (projectile != null)
            {
                projectile.Initialize(this, projectileSpeed, GetArchetypeColor());
            }
        }

        // Play fire sound
        if (audioSource != null && fireSound != null)
        {
            audioSource.PlayOneShot(fireSound);
        }
    }

    /// <summary>
    /// Handle hyperspace jump (keyboard input)
    /// </summary>
    private void HandleHyperspace()
    {
        if (Input.GetKeyDown(hyperspaceKey))
        {
            TryHyperspace();
        }
    }

    /// <summary>
    /// Handle hyperspace jump (external input)
    /// </summary>
    private void HandleExternalHyperspace()
    {
        if (externalHyperspace)
        {
            TryHyperspace();
        }
    }

    /// <summary>
    /// Attempt hyperspace jump
    /// </summary>
    private void TryHyperspace()
    {
        // Check cooldown
        if (Time.time - lastHyperspaceTime < hyperspaceCooldown) return;

        lastHyperspaceTime = Time.time;

        // Play hyperspace sound
        if (audioSource != null && hyperspaceSound != null)
        {
            audioSource.PlayOneShot(hyperspaceSound);
        }

        // Risk of explosion
        if (Random.value < hyperspaceRiskChance)
        {
            Die(null); // Self-destruct
            return;
        }

        // Teleport to random position
        StartCoroutine(HyperspaceJump());
    }

    /// <summary>
    /// Perform hyperspace jump
    /// </summary>
    private IEnumerator HyperspaceJump()
    {
        // Brief invisibility
        if (shipSprite != null)
        {
            shipSprite.enabled = false;
        }

        // Random position within screen bounds
        Camera cam = Camera.main;
        if (cam != null)
        {
            float halfHeight = cam.orthographicSize * 0.8f;
            float halfWidth = halfHeight * cam.aspect * 0.8f;

            Vector3 newPos = new Vector3(
                Random.Range(-halfWidth, halfWidth),
                Random.Range(-halfHeight, halfHeight),
                0
            );

            transform.position = newPos;
        }

        // Random rotation
        transform.rotation = Quaternion.Euler(0, 0, Random.Range(0f, 360f));

        // Reset velocity
        rb.linearVelocity = Vector2.zero;

        yield return new WaitForSeconds(0.2f);

        if (shipSprite != null)
        {
            shipSprite.enabled = true;
        }
    }

    /// <summary>
    /// Set the ship's archetype and update visuals
    /// </summary>
    public void SetArchetype(string newArchetype)
    {
        archetype = newArchetype.ToUpper();
        UpdateVisuals();
    }

    /// <summary>
    /// Get color for current archetype
    /// </summary>
    private Color GetArchetypeColor()
    {
        switch (archetype)
        {
            case "AI":
                return aiColor;
            case "QUANTUM":
                return quantumColor;
            case "BIOTECH":
                return biotechColor;
            default:
                return Color.white;
        }
    }

    /// <summary>
    /// Update ship visuals based on archetype
    /// </summary>
    private void UpdateVisuals()
    {
        Color color = GetArchetypeColor();

        if (shipSprite != null)
        {
            shipSprite.color = color;
        }

        if (thrustTrail != null)
        {
            thrustTrail.startColor = color;
            thrustTrail.endColor = new Color(color.r, color.g, color.b, 0);
        }

        if (thrustParticles != null)
        {
            var main = thrustParticles.main;
            main.startColor = color;
        }
    }

    /// <summary>
    /// Called when a projectile from this ship is destroyed
    /// </summary>
    public void OnProjectileDestroyed()
    {
        activeProjectileCount = Mathf.Max(0, activeProjectileCount - 1);
    }

    /// <summary>
    /// Reset the ship to a position
    /// </summary>
    public void ResetShip(Vector3 position, Quaternion rotation)
    {
        transform.position = position;
        transform.rotation = rotation;

        if (rb != null)
        {
            rb.linearVelocity = Vector2.zero;
            rb.angularVelocity = 0f;
        }

        isAlive = true;
        activeProjectileCount = 0;
        lastFireTime = 0f;
        lastHyperspaceTime = -10f;

        if (shipSprite != null)
        {
            shipSprite.enabled = true;
        }

        gameObject.SetActive(true);
    }

    /// <summary>
    /// Enable or disable controls
    /// </summary>
    public void SetControlsEnabled(bool enabled)
    {
        controlsEnabled = enabled;

        if (!enabled)
        {
            isThrusting = false;
            if (thrustTrail != null) thrustTrail.emitting = false;
            if (thrustParticles != null) thrustParticles.Stop();
            if (audioSource != null) audioSource.Stop();
        }
    }

    /// <summary>
    /// Handle ship death
    /// </summary>
    public void Die(ShipController attacker)
    {
        if (!isAlive) return;

        isAlive = false;
        controlsEnabled = false;

        // Play explosion effect
        if (explosionPrefab != null)
        {
            ParticleSystem explosion = Instantiate(explosionPrefab, transform.position, Quaternion.identity);
            var main = explosion.main;
            main.startColor = GetArchetypeColor();
            Destroy(explosion.gameObject, 2f);
        }

        // Play explosion sound
        if (audioSource != null && explosionSound != null)
        {
            AudioSource.PlayClipAtPoint(explosionSound, transform.position);
        }

        // Notify GameManager
        GameManager.Instance?.OnShipDestroyed(this, attacker);

        // Hide ship
        if (shipSprite != null)
        {
            shipSprite.enabled = false;
        }
    }

    /// <summary>
    /// Handle collision with projectile
    /// </summary>
    private void OnTriggerEnter2D(Collider2D other)
    {
        if (!isAlive) return;

        Projectile projectile = other.GetComponent<Projectile>();
        if (projectile != null && projectile.Owner != this)
        {
            Die(projectile.Owner);
            projectile.DestroyProjectile();
        }
    }

    /// <summary>
    /// Get the player number
    /// </summary>
    public int PlayerNumber => playerNumber;

    /// <summary>
    /// Get the archetype
    /// </summary>
    public string Archetype => archetype;

    /// <summary>
    /// Get or set whether external control (CPU/AI) is enabled
    /// When enabled, keyboard input is ignored and external inputs are used
    /// </summary>
    public bool ExternalControlEnabled
    {
        get => externalControlEnabled;
        set
        {
            externalControlEnabled = value;
            if (!value)
            {
                // Reset external inputs when disabling
                externalRotateInput = 0f;
                externalThrust = false;
                externalFire = false;
                externalHyperspace = false;
            }
        }
    }

    /// <summary>
    /// Set external control inputs (called by CpuPilot or other AI)
    /// </summary>
    /// <param name="rotate">Rotation input (-1 to 1, negative = right, positive = left)</param>
    /// <param name="thrust">Whether to thrust</param>
    /// <param name="fire">Whether to fire (consumed after one frame)</param>
    /// <param name="hyperspace">Whether to hyperspace (consumed after one frame)</param>
    public void SetExternalInput(float rotate, bool thrust, bool fire, bool hyperspace)
    {
        externalRotateInput = Mathf.Clamp(rotate, -1f, 1f);
        externalThrust = thrust;
        externalFire = fire;
        externalHyperspace = hyperspace;
    }
}
