/**
 * Environment variable checker for Azure Functions
 * Validates that required environment variables are present
 */

function checkRequiredEnvVars() {
  const requiredVars = ['POSTGRES_URL', 'JWT_SECRET'];
  const missingVars = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  console.log('All required env vars present.');
  return true;
}

module.exports = { checkRequiredEnvVars };
