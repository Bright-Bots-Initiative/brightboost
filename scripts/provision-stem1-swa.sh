#!/bin/bash
set -e

echo "🚀 Provisioning Azure Static Web App for STEM-1-MVP..."

if ! az account show &> /dev/null; then
  echo "❌ Not logged in to Azure. Run 'az login' first."
  exit 1
fi

echo "Creating Static Web App: brightboost-stem1-mvp"
az staticwebapp create \
  --name brightboost-stem1-mvp \
  --resource-group bb-dev-rg \
  --source https://github.com/Bright-Bots-Initiative/brightboost \
  --branch stem-1-mvp \
  --app-location "/" \
  --output-location "dist" \
  --login-with-github

echo "Retrieving deployment token..."
DEPLOYMENT_TOKEN=$(az staticwebapp secrets list --name brightboost-stem1-mvp --resource-group bb-dev-rg --query "properties.apiKey" --output tsv)

echo "Adding STEM1_MVP_SWA_TOKEN secret to GitHub repository..."
gh secret set STEM1_MVP_SWA_TOKEN --body "$DEPLOYMENT_TOKEN" --repo Bright-Bots-Initiative/brightboost

echo "✅ Azure Static Web App provisioned successfully!"
echo "🔗 Check deployment status at: https://portal.azure.com/#@brightbotsint.com/resource/subscriptions/f9a55b60-d978-4b8b-819e-cb0246dc92bb/resourceGroups/bb-dev-rg/providers/Microsoft.Web/staticSites/brightboost-stem1-mvp"
