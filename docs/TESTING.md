# Testing Guide

## Overview

BrightBoost uses a comprehensive testing strategy with multiple testing frameworks:

- **Unit Tests**: Vitest for component and utility testing
- **E2E Tests**: Cypress for end-to-end user workflows
- **Linting**: ESLint for code quality

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### E2E Tests
```bash
npm run test:e2e
```

### Linting
```bash
npm run lint
```

## Test Environment Configuration

### Cypress Environment Variables

For E2E tests, Cypress uses environment variables to determine test behavior:

- `IS_PREVIEW=true`: Runs tests in preview mode, expecting "API not available" messages
- `IS_PREVIEW=false`: Runs tests against live API endpoints

### Preview Mode Testing

When `IS_PREVIEW=true`, tests verify that:
- Dashboard components show appropriate preview messages
- No actual API calls are made to non-existent endpoints
- Error handling displays user-friendly messages

## Test Structure

### Unit Tests (`src/**/*.test.ts`)
- Component rendering and behavior
- Custom hook functionality
- Utility function validation
- Mock API responses

### E2E Tests (`cypress/e2e/`)
- Complete user workflows
- Authentication flows
- Dashboard interactions
- Cross-browser compatibility

## Debugging Tests

### Local Test Debugging
```bash
# Run specific test file
npm run test:unit -- src/components/TeacherDashboard.test.tsx

# Run tests in watch mode
npm run test:unit -- --watch

# Run Cypress in interactive mode
npx cypress open
```

### CI Test Debugging
- Check GitHub Actions logs for detailed error messages
- Verify environment variables are set correctly
- Ensure all dependencies are installed properly

## Test Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Descriptive Names**: Test names should clearly describe what is being tested
3. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification phases
4. **Mock External Dependencies**: Use mocks for API calls and external services
5. **Test User Behavior**: Focus on testing what users actually do, not implementation details

## Common Issues

### "document is not defined" Errors
- Ensure `environment: 'jsdom'` is set in `vitest.config.ts`
- Check that React component tests use proper test environment

### Cypress Timeout Errors
- Increase timeout values for slow-loading elements
- Verify that preview mode detection is working correctly
- Check that API intercepts are properly configured

### Environment Variable Issues
- Verify `.env` file is properly configured
- Check that environment variables are available in test environment
- Ensure Cypress environment variables are passed correctly
