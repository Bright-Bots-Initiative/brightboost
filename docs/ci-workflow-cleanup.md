# CI Workflow Cleanup Summary

## Decision: Keep Black Sand as Canonical SWA Workflow

**Chosen:** `azure-static-web-apps.yml` (canonical production workflow)

**Rationale:**
- Referenced as canonical production URL in README (https://black-sand-053455d1e.6.azurestaticapps.net)
- Has proper API location configuration for backend integration
- Uses correct output_location="dist" matching build process
- Most recently updated with working configuration

**Actions Taken:**
- Moved 3 duplicate/template workflows to `.github/workflows/archived/`
- Added `skip_app_build: true` for dry-run mode during PR validation
- Configured `deployment_environment: "preview"` for proper PR preview deployments
- Updated backend integration to use AWS Lambda instead of Azure Functions
- Retained all functionality while eliminating deployment conflicts

**Archived Workflows:**
- `azure-static-web-apps-gray-ocean-02030a010.yml` (frontend-only variant)
- `azure-static-web-apps.yml` (basic template)
- `azure-static-web-app-template.yml` (template with comments)

This consolidation resolves the multiple SWA deployment conflicts identified in the repository analysis while preserving the most complete and production-ready workflow configuration.

**Note:** This document reflects the historical cleanup. The current canonical production SWA is https://black-sand-053455d1e.6.azurestaticapps.net deployed via the main `azure-static-web-apps.yml` workflow.
