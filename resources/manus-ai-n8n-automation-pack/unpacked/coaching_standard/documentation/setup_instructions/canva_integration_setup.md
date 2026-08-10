# Canva API Integration Setup Guide

This guide will walk you through the process of setting up Canva API integration for use with your n8n workflows. The Canva integration is used in several workflows to create visual content for social media posts, particularly for LinkedIn and Instagram.

## Prerequisites

- A Canva account (Pro account recommended for API access)
- Developer access enabled on your Canva account
- n8n instance up and running

## Step 1: Create a Canva Account

If you don't already have a Canva account:

1. Go to [https://www.canva.com/signup](https://www.canva.com/signup)
2. Sign up with your email, Google, or other supported account
3. Verify your email address
4. Consider upgrading to Canva Pro for full API functionality

## Step 2: Apply for Canva Developer Access

Canva's API requires developer access:

1. Go to [https://www.canva.com/developers/](https://www.canva.com/developers/)
2. Click "Apply for API Access"
3. Fill out the application form:
   - Provide your business details
   - Describe your use case (creating visual content for coaching business social media)
   - Specify which API features you need (Design creation, Brand Kit access)
4. Submit your application
5. Wait for approval (this may take several business days)

## Step 3: Create a Canva App

Once approved for developer access:

1. Log in to the Canva Developer Portal
2. Click "Create a new app"
3. Fill in the required details:
   - App name: "Coaching Content Automation"
   - Description: "Automation for creating coaching-related visual content"
   - App website: Your website URL
   - Redirect URLs: Add your n8n webhook URL (e.g., `https://your-n8n-instance.com/webhook/canva`)
4. Select the required scopes:
   - designs:read
   - designs:write
   - brands:read
   - templates:read
5. Save your app configuration

## Step 4: Get API Credentials

1. In your Canva Developer Portal, navigate to your app
2. Find and copy your:
   - Client ID
   - Client Secret
3. Store these securely - you'll need them for n8n configuration

## Step 5: Configure Canva Credentials in n8n

1. Open your n8n instance
2. Click on "Settings" in the left sidebar
3. Select "Credentials"
4. Click "Add Credential"
5. Search for and select "Canva OAuth2 API"
6. Fill in the following details:
   - **Credential Name**: Give it a descriptive name like "Canva Coaching Visuals"
   - **Client ID**: Paste your Canva Client ID
   - **Client Secret**: Paste your Canva Client Secret
   - **Scope**: Enter the scopes you selected (designs:read designs:write brands:read templates:read)
   - **Authorization URL**: https://www.canva.com/oauth/authorize
   - **Token URL**: https://api.canva.com/oauth/token
7. Click "Connect" to authorize n8n with your Canva account
8. Follow the OAuth flow to grant access
9. Click "Save" to store your credentials

## Step 6: Prepare Templates in Canva

For optimal workflow performance:

1. Log in to your Canva account
2. Create templates for each type of visual content:
   - LinkedIn thought leadership post image (1200 x 627 pixels)
   - Instagram quote image (1080 x 1080 pixels)
   - Other social media visuals as needed
3. Add your branding elements (logo, colors, fonts)
4. Save these as templates in your Canva account
5. Note the template IDs for use in your workflows

## Step 7: Test Your Canva Integration

1. Create a new workflow in n8n
2. Add a "Canva" node
3. In the node settings, select your newly created credentials
4. Configure a simple test operation (e.g., list templates)
5. Execute the node to verify the credentials are working correctly

## Usage Considerations

- **Template Management**: Create and maintain a library of templates for different content types
- **Brand Consistency**: Set up a Brand Kit in Canva to ensure consistent visuals
- **Rate Limits**: Be aware of Canva's API rate limits, especially if running workflows frequently
- **Image Storage**: Consider where the generated images will be stored (local, cloud storage, etc.)

## Troubleshooting

- **Authentication Error**: Verify your Client ID and Secret are correct
- **Access Denied**: Ensure you've granted all necessary permissions during OAuth
- **Template Not Found**: Verify template IDs are correct and templates are accessible
- **Rate Limit Exceeded**: Add delays between API calls or reduce workflow frequency

## Security Best Practices

- Never share your Canva Client Secret
- Regularly review app permissions
- Use dedicated Canva account for automation if possible
- Consider using environment variables for storing credentials in production environments

By following this guide, you'll have successfully set up Canva API integration for use in your n8n coaching workflows. This integration will enable automated creation of visual content for your social media posts, enhancing your coaching business's online presence.
