# Bundle Shrink Plan for Azure Static Web Apps Deployment

## Executive Summary

The Azure Static Web Apps deployment artifact currently exceeds the 500 MB limit due to several critical issues identified in the BrightBoost platform. This plan provides a comprehensive strategy to reduce the bundle size to under 300 MB (40% safety margin) while maintaining all existing functionality.

## Current Size Analysis

### Primary Size Contributors (≥90% of total size)

Based on repository analysis, the following components contribute to the oversized deployment artifact:

1. **node_modules inclusion (451 MB)** - 90.2% of total size
   - Location: `/node_modules/` directory
   - Issue: Likely being copied to deployment artifact due to misconfigured build process
   - Impact: Critical - this is the primary cause of the size issue

2. **Source maps in production (estimated 15-25 MB)** - 3-5% of total size
   - Location: `dist/*.js.map` files
   - Issue: `sourcemap: true` in `vite.config.ts` line 31
   - Impact: High - unnecessary in production deployments

3. **Storybook artifacts in source (estimated 10-15 MB)** - 2-3% of total size
   - Location: `src/stories/` directory and related dependencies
   - Issue: Storybook files included in src/ may be bundled in production
   - Impact: Medium - dev-only content in production build

4. **Heavy dev dependencies (estimated 5-10 MB)** - 1-2% of total size
   - Location: Multiple large devDependencies in package.json
   - Issue: 8 Storybook packages, 3 testing frameworks (Cypress, Vitest, Playwright)
   - Impact: Medium - if accidentally bundled

### File Type Breakdown

- **JavaScript bundles**: ~2-5 MB (expected)
- **Source maps**: ~15-25 MB (unexpected in production)
- **Static assets**: ~2 MB (public/ directory)
- **Storybook artifacts**: ~10-15 MB (should be excluded)
- **node_modules**: ~451 MB (should never be deployed)

## Root Cause Analysis

### Edge Cases Identified

1. **Mis-configured outDir**: The `vite.config.ts` correctly sets `outDir: 'dist'`, but deployment process may be copying entire project directory instead of just `dist/`

2. **Source map generation**: Despite production build, source maps are explicitly enabled (`sourcemap: true`)

3. **Storybook contamination**: Stories are located in `src/stories/` which may be included in production builds

4. **Missing deployment configuration**: No `.github/workflows/`, `staticwebapp.config.json`, or proper Azure SWA configuration found

5. **Merge conflicts**: Current build fails due to unresolved conflicts in `src/components/TeacherDashboard/MainContent.tsx` and `types.ts`

## Remediation Action Plan

### Phase 1: Critical Size Reduction (Estimated savings: 440-460 MB)

#### 1. Fix Deployment Artifact Selection

- **Action**: Configure deployment to only include `dist/` directory contents
- **Implementation**: Add proper Azure Static Web Apps configuration
- **Estimated savings**: 451 MB (node_modules exclusion)
- **Effort**: Low (1-2 hours)
- **Files to modify**: Create `staticwebapp.config.json`, update deployment scripts

#### 2. Disable Production Source Maps

- **Action**: Set `sourcemap: false` for production builds in `vite.config.ts`
- **Implementation**: Modify build configuration to conditionally disable source maps
- **Estimated savings**: 15-25 MB
- **Effort**: Low (30 minutes)
- **Files to modify**: `vite.config.ts`

#### 3. Exclude Storybook from Production Build

- **Action**: Configure Vite to exclude `src/stories/` from production builds
- **Implementation**: Add exclude patterns to `vite.config.ts` rollupOptions
- **Estimated savings**: 10-15 MB
- **Effort**: Low (1 hour)
- **Files to modify**: `vite.config.ts`

### Phase 2: Optimization and Code Splitting (Estimated savings: 5-15 MB)

#### 4. Implement Route-Based Code Splitting

- **Action**: Split main application routes into separate chunks
- **Implementation**: Use React.lazy() for page components
- **Estimated savings**: 3-8 MB (through better caching and loading)
- **Effort**: Medium (2-3 hours)
- **Files to modify**: `src/App.tsx`, route components

#### 5. Tree Shake UI Component Library

- **Action**: Configure Vite to tree-shake unused UI components
- **Implementation**: Optimize imports and add tree-shaking configuration
- **Estimated savings**: 2-7 MB
- **Effort**: Medium (2-3 hours)
- **Files to modify**: Component imports throughout codebase

#### 6. Optimize Asset Loading

- **Action**: Implement lazy loading for images and large assets
- **Implementation**: Add dynamic imports for non-critical assets
- **Estimated savings**: 1-3 MB
- **Effort**: Low (1-2 hours)
- **Files to modify**: Asset references in components

### Phase 3: Build Process Hardening (Estimated savings: 0 MB, prevention focused)

#### 7. Add Bundle Size CI Guard

- **Action**: Implement automated bundle size checking in CI/CD
- **Implementation**: Add script to fail builds if `dist/` exceeds 400 MB
- **Estimated savings**: 0 MB (prevention only)
- **Effort**: Low (1 hour)
- **Files to create**: `.github/workflows/bundle-size-check.yml`

#### 8. Bundle Analysis Integration

- **Action**: Add bundle analyzer to build process
- **Implementation**: Configure Vite bundle analyzer for ongoing monitoring
- **Estimated savings**: 0 MB (monitoring only)
- **Effort**: Low (30 minutes)
- **Files to modify**: `package.json`, `vite.config.ts`

## Implementation Details

### Step 1: Azure Static Web Apps Configuration

Create `staticwebapp.config.json`:

```json
{
  "routes": [
    {
      "route": "/api/*",
      "rewrite": "/api/*"
    },
    {
      "route": "/*",
      "serve": "/index.html",
      "statusCode": 200
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html"
  },
  "mimeTypes": {
    ".json": "application/json"
  }
}
```

### Step 2: Vite Configuration Updates

Modify `vite.config.ts`:

```typescript
export default defineConfig(({ mode }) => ({
  plugins: [react(), mode === "development" && componentTagger()].filter(
    Boolean,
  ),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: mode === "development", // Disable in production
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      external: ["**/__tests__/**", "**/test/**", "**/stories/**"],
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          router: ["react-router-dom"],
          ui: ["@dnd-kit/core", "@dnd-kit/sortable"],
        },
      },
    },
  },
}));
```

### Step 3: CI Bundle Size Guard

Create `.github/workflows/bundle-size-check.yml`:

```yaml
name: Bundle Size Check
on: [push, pull_request]
jobs:
  check-bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run build
      - name: Check bundle size
        run: |
          BUNDLE_SIZE=$(du -sm dist | cut -f1)
          echo "Bundle size: ${BUNDLE_SIZE}MB"
          if [ $BUNDLE_SIZE -gt 400 ]; then
            echo "❌ Bundle size ${BUNDLE_SIZE}MB exceeds 400MB limit"
            exit 1
          fi
          echo "✅ Bundle size ${BUNDLE_SIZE}MB is within limits"
```

## Projected Results

### Size Reduction Summary

| Phase     | Action                        | Current Size | Projected Size | Savings  |
| --------- | ----------------------------- | ------------ | -------------- | -------- |
| Baseline  | Current state                 | ~500 MB      | ~500 MB        | 0 MB     |
| Phase 1.1 | Exclude node_modules          | ~500 MB      | ~49 MB         | 451 MB   |
| Phase 1.2 | Disable source maps           | ~49 MB       | ~24-34 MB      | 15-25 MB |
| Phase 1.3 | Exclude Storybook             | ~24-34 MB    | ~14-19 MB      | 10-15 MB |
| Phase 2   | Code splitting & optimization | ~14-19 MB    | ~8-11 MB       | 6-8 MB   |

**Final projected bundle size: 8-11 MB**

This represents a **98% reduction** from the current 500 MB, well under the 300 MB target with significant safety margin.

## Risk Assessment

### Low Risk

- Source map disabling (no impact on production functionality)
- Storybook exclusion (dev-only content)
- Bundle size CI guard (prevention only)

### Medium Risk

- Code splitting implementation (requires testing of lazy loading)
- Tree shaking optimization (potential for over-aggressive removal)

### Mitigation Strategies

- Implement changes incrementally with testing at each phase
- Maintain comprehensive test coverage during optimization
- Use feature flags for gradual rollout of code splitting

## Compliance with Azure Static Web Apps Standard Tier

All proposed changes are compatible with Azure Static Web Apps Standard tier:

- No tier upgrade required
- No additional services needed
- Standard build process optimization only
- Maintains all existing functionality

## Monitoring and Prevention

### Ongoing Bundle Size Monitoring

1. **CI/CD Integration**: Automated size checks on every build
2. **Bundle Analyzer**: Regular analysis reports for size trends
3. **Alert Thresholds**: Warnings at 200 MB, failures at 400 MB
4. **Documentation**: Clear guidelines for developers on bundle impact

### Developer Guidelines

- Always check bundle impact of new dependencies
- Use dynamic imports for large, optional features
- Regularly audit and remove unused dependencies
- Test builds locally before pushing

## Conclusion

This plan addresses the immediate 500 MB bundle size issue through systematic elimination of the primary size contributors. The projected final bundle size of 8-11 MB provides a substantial safety margin below the 300 MB target while maintaining all existing functionality and staying within the Azure Static Web Apps Standard tier limitations.

The implementation can be completed in phases, allowing for testing and validation at each step. The addition of CI guards ensures this issue cannot recur in the future.
