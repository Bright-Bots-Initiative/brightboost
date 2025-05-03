# Cloudflare Pages Setup Guide

This document provides instructions for setting up the Cloudflare Pages environment for the BrightBoost application.

## Environment Variables Configuration

The BrightBoost application requires the following environment variables to be configured in Cloudflare Pages:

### Public Variables (configured in wrangler.toml)

These variables are already configured in the `wrangler.toml` file in the repository:

```toml
[vars]
NEXT_PUBLIC_SUPABASE_URL = "https://ycldhifnaycqmqnxzgxr.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljbGRoaWZuYXljcW1xbnh6Z3hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyODYyODAsImV4cCI6MjA2MTg2MjI4MH0.a61hAL5ktzOofvH2eU_B8k2vJmJyVH6W5XU4QsJC3Zc"
```

### Secret Variables (must be configured via Cloudflare Dashboard or Wrangler CLI)

The following secret must be added to Cloudflare Pages:

- `SUPABASE_SERVICE_ROLE`: The service role key for Supabase (for production use only)

## Adding Secrets to Cloudflare Pages

### Option 1: Using the Cloudflare Dashboard

1. Go to the Cloudflare Pages dashboard: https://dash.cloudflare.com/
2. Select your project: `brightboost`
3. Navigate to the "Settings" tab
4. Scroll down to the "Environment variables" section
5. Click "Add variable"
6. Enter the name: `SUPABASE_SERVICE_ROLE`
7. Enter the value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljbGRoaWZuYXljcW1xbnh6Z3hyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjI4NjI4MCwiZXhwIjoyMDYxODYyMjgwfQ.RJ0aHMRuBeqFOPvn1-Q5xUEftIniUCeA_L-_vRctt94`
8. Make sure to check the "Encrypt" option to store it as a secret
9. Click "Save"

### Option 2: Using the Wrangler CLI

If you have the Wrangler CLI installed, you can add the secret using the following command:

```bash
wrangler secret put SUPABASE_SERVICE_ROLE --name brightboost-app
```

When prompted, enter the service role key:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljbGRoaWZuYXljcW1xbnh6Z3hyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjI4NjI4MCwiZXhwIjoyMDYxODYyMjgwfQ.RJ0aHMRuBeqFOPvn1-Q5xUEftIniUCeA_L-_vRctt94
```

## Verifying Configuration

After adding the secret, you should:

1. Trigger a new deployment in Cloudflare Pages
2. Check the deployment logs to ensure there are no environment variable-related errors
3. Verify that the application can connect to Supabase successfully

## Troubleshooting

If you encounter issues with the Cloudflare Pages deployment:

1. Check that all environment variables are correctly configured
2. Verify that the wrangler.toml file is in the root of the repository
3. Ensure that the secret is properly encrypted in the Cloudflare dashboard
4. Check the deployment logs for any specific error messages
