# Azure Dashboard and Alerts for BrightBoost

This document outlines how to set up and manage Azure Dashboard and Alerts for monitoring the BrightBoost application.

## Setting Up the Monitoring Dashboard

1. Log in to the [Azure Portal](https://portal.azure.com)
2. Navigate to your Application Insights resource `bb-dev-insights` in the `bb-dev-rg` resource group
3. From the Application Insights overview page, click **Dashboard** in the top navigation bar
4. Click **+ New dashboard**
5. Name the dashboard "BrightBoost Monitoring Dashboard"
6. Add the following tiles to the dashboard by clicking **+ Add tile** and selecting **Application Insights**:

### Required Metrics to Pin

1. **Server Requests**
   - Select the `bb-dev-insights` resource
   - Choose metric: `Server requests (requests/count)`
   - Time range: Last 24 hours
   - Chart type: Line chart

2. **Failed Requests**
   - Select the `bb-dev-insights` resource
   - Choose metric: `Failed requests (requests/failed)`
   - Time range: Last 24 hours
   - Chart type: Line chart

3. **Server Response Time**
   - Select the `bb-dev-insights` resource
   - Choose metric: `Server response time (requests/duration)`
   - Time range: Last 24 hours
   - Chart type: Line chart

4. **Exceptions**
   - Select the `bb-dev-insights` resource
   - Choose metric: `Server exceptions (exceptions/server)`
   - Time range: Last 24 hours
   - Chart type: Line chart

7. Arrange the tiles as desired
8. Click **Save** to save the dashboard

## Sharing the Dashboard

1. After saving the dashboard, click **Share** in the top navigation bar
2. Select **Publish dashboard**
3. Choose the sharing options:
   - **Subscription**: Select your subscription
   - **Resource group**: bb-dev-rg
   - **Region**: Central US (same as your resources)
   - **Share with**: Your organization
4. Click **Publish**
5. After publishing, click **Share** again
6. Click **Get a read-only link**
7. Copy the URL and share it with your team

## Setting Up Server Exception Alerts

An alert rule has been created to notify when server exceptions exceed 5 in a 15-minute period. Here's how to manage it:

1. Navigate to your Application Insights resource `bb-dev-insights` in the `bb-dev-rg` resource group
2. Under **Monitoring**, select **Alerts**
3. You should see the alert rule "BrightBoost-ServerExceptions"
4. To modify the alert:
   - Click on the alert rule
   - Click **Edit** to modify the conditions, actions, or other settings

### Adding Email/Slack Notifications

1. Navigate to the alert rule "BrightBoost-ServerExceptions"
2. Click **Edit**
3. Under **Actions**, click **Add action groups**
4. Click **+ Create action group**
5. Configure the action group:
   - **Subscription**: Select your subscription
   - **Resource group**: bb-dev-rg
   - **Action group name**: BrightBoost-Alerts
   - **Display name**: BrightBoost Alerts
6. Add an email action:
   - **Action type**: Email/SMS/Push/Voice
   - **Name**: Email Alert
   - Check **Email** and enter the recipient email addresses
7. For Slack integration:
   - **Action type**: Webhook
   - **Name**: Slack Alert
   - **URI**: Enter your Slack webhook URL
8. Click **Review + create** and then **Create**
9. Select the newly created action group and click **Save**

## Creating Additional Alerts

To create additional alerts for other metrics:

1. Navigate to your Application Insights resource
2. Under **Monitoring**, select **Alerts**
3. Click **+ Create** and then **Alert rule**
4. Select the resource: `bb-dev-insights`
5. Add a condition:
   - Select the signal type (metric, log, activity log)
   - Configure the alert logic (threshold, operator, etc.)
6. Add the action group created earlier
7. Define alert details (name, description, severity)
8. Click **Create alert rule**
