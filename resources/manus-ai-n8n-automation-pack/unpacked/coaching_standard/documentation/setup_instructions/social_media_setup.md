# Social Media Platforms Integration Setup Guide

This guide will walk you through the process of setting up social media platform integrations (LinkedIn, Instagram, Twitter/X, Facebook) for use with your n8n workflows. These integrations enable automated posting to your coaching business social media accounts.

## LinkedIn Integration Setup

### Prerequisites
- A LinkedIn personal account
- A LinkedIn Page for your coaching business
- Admin access to the LinkedIn Page

### Step 1: Create a LinkedIn Developer App
1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Click "Create app"
3. Fill in the required information:
   - App name: "Coaching Content Automation"
   - LinkedIn Page: Select your coaching business page
   - App logo: Upload your coaching logo
   - Legal Agreement: Accept the terms
4. Click "Create app"

### Step 2: Configure App Permissions
1. In your app dashboard, go to the "Auth" tab
2. Under "OAuth 2.0 settings", add the following redirect URL:
   - `https://your-n8n-instance.com/oauth2/callback`
3. Under "Products", request access to:
   - Share on LinkedIn
   - Sign In with LinkedIn
4. Under "OAuth 2.0 scopes", select:
   - `r_liteprofile`
   - `r_organization_admin`
   - `w_member_social`
   - `w_organization_social`

### Step 3: Get API Credentials
1. In your app dashboard, go to the "Auth" tab
2. Note your Client ID and Client Secret
3. Store these securely for use in n8n

### Step 4: Configure LinkedIn Credentials in n8n
1. Open your n8n instance
2. Go to "Settings" > "Credentials"
3. Click "Add Credential"
4. Search for and select "LinkedIn OAuth2 API"
5. Fill in the following details:
   - **Credential Name**: "LinkedIn Coaching Content"
   - **Client ID**: Paste your LinkedIn Client ID
   - **Client Secret**: Paste your LinkedIn Client Secret
   - **Scopes**: `r_liteprofile r_organization_admin w_member_social w_organization_social`
6. Click "Connect" to authorize n8n with your LinkedIn account
7. Follow the OAuth flow to grant access
8. Click "Save" to store your credentials

## Instagram Integration Setup

### Prerequisites
- A Facebook account
- An Instagram Business or Creator account
- The accounts must be linked to a Facebook Page

### Step 1: Create a Facebook Developer App
1. Go to [Facebook for Developers](https://developers.facebook.com/)
2. Click "My Apps" > "Create App"
3. Select "Business" as the app type
4. Fill in your app name and contact email
5. Click "Create App"

### Step 2: Add Instagram Graph API
1. In your app dashboard, click "Add Products to Your App"
2. Find "Instagram Graph API" and click "Set Up"
3. Follow the setup instructions

### Step 3: Configure App Settings
1. Go to "App Settings" > "Basic"
2. Fill in all required fields (Privacy Policy URL, Terms of Service URL)
3. Add a platform: Select "Website" and enter your website URL
4. Save changes

### Step 4: Generate Access Tokens
1. Go to "Tools" > "Graph API Explorer"
2. Select your app from the dropdown
3. Select "Get User Access Token"
4. Select the following permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`
   - `pages_manage_posts`
5. Click "Generate Access Token"
6. Follow the authorization flow
7. Convert this short-lived token to a long-lived token using the Access Token Debugger

### Step 5: Configure Instagram Credentials in n8n
1. Open your n8n instance
2. Go to "Settings" > "Credentials"
3. Click "Add Credential"
4. Search for and select "Instagram OAuth2 API"
5. Fill in the following details:
   - **Credential Name**: "Instagram Coaching Content"
   - **Access Token**: Paste your long-lived access token
   - **Business Account ID**: Your Instagram Business account ID
6. Click "Save" to store your credentials

## Twitter (X) Integration Setup

### Prerequisites
- A Twitter/X account for your coaching business
- Phone number verified on your Twitter account

### Step 1: Apply for Twitter Developer Access
1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Click "Apply for access" or "Sign up"
3. Select "Academic" or "Professional" depending on your use case
4. Complete the application form:
   - Explain how you'll use the Twitter API (automated content posting for coaching business)
   - Provide details about your use case
5. Submit your application and wait for approval

### Step 2: Create a Twitter App
1. Once approved, go to the Developer Portal
2. Click "Projects & Apps" > "Create Project"
3. Name your project "Coaching Content Automation"
4. Select the use case that best matches your needs
5. Click "Create"
6. Create an app within your project
7. Set up app permissions to "Read and Write"

### Step 3: Generate API Keys and Tokens
1. In your app settings, go to the "Keys and tokens" tab
2. Generate "Consumer Keys" (API Key and Secret)
3. Generate "Access Token and Secret"
4. Store all four credentials securely

### Step 4: Configure Twitter Credentials in n8n
1. Open your n8n instance
2. Go to "Settings" > "Credentials"
3. Click "Add Credential"
4. Search for and select "Twitter OAuth1a API"
5. Fill in the following details:
   - **Credential Name**: "Twitter Coaching Content"
   - **Consumer Key**: Your API Key
   - **Consumer Secret**: Your API Secret
   - **Access Token**: Your Access Token
   - **Access Token Secret**: Your Access Token Secret
6. Click "Save" to store your credentials

## Facebook Integration Setup

### Prerequisites
- A Facebook account
- A Facebook Page for your coaching business
- Admin access to the Facebook Page

### Step 1: Use Your Existing Facebook Developer App
1. Use the same Facebook Developer App created for Instagram
2. If you haven't created one yet, follow the Instagram setup steps 1-3

### Step 2: Add Facebook Graph API
1. In your app dashboard, click "Add Products to Your App"
2. Find "Facebook Login" and click "Set Up"
3. Configure settings and add the OAuth redirect URL:
   - `https://your-n8n-instance.com/oauth2/callback`
4. Go to "App Review" and make your app public

### Step 3: Generate Page Access Token
1. Go to "Tools" > "Graph API Explorer"
2. Select your app from the dropdown
3. Select "Get Page Access Token"
4. Select your coaching business page
5. Select the following permissions:
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `pages_show_list`
6. Click "Generate Access Token"
7. Follow the authorization flow
8. Convert this to a long-lived token using the Access Token Debugger

### Step 4: Configure Facebook Credentials in n8n
1. Open your n8n instance
2. Go to "Settings" > "Credentials"
3. Click "Add Credential"
4. Search for and select "Facebook Graph API"
5. Fill in the following details:
   - **Credential Name**: "Facebook Coaching Content"
   - **Access Token**: Paste your long-lived page access token
   - **Page ID**: Your Facebook Page ID
6. Click "Save" to store your credentials

## Testing Your Social Media Integrations

For each platform, create a simple test workflow:

1. Create a new workflow in n8n
2. Add a "Manual trigger" node
3. Add the respective social media node (LinkedIn, Instagram, Twitter, or Facebook)
4. Configure a simple test post
5. Execute the workflow to verify the credentials are working correctly
6. Check your social media accounts to confirm the test post was published
7. Delete the test post after confirmation

## Usage Considerations

- **Rate Limits**: All platforms have API rate limits - schedule posts with appropriate delays
- **Content Guidelines**: Ensure automated content complies with each platform's guidelines
- **Token Expiration**: Some platforms require token renewal - monitor authentication status
- **Media Requirements**: Each platform has different image size and format requirements
- **Character Limits**: Respect character limits, especially for Twitter

## Troubleshooting

- **Authentication Errors**: Verify your credentials and check token expiration
- **Permission Issues**: Ensure you've requested all necessary permissions
- **Content Rejection**: If posts are rejected, review platform guidelines
- **API Changes**: Social media APIs change frequently - keep your integrations updated

## Security Best Practices

- Never share your API keys or access tokens
- Regularly review app permissions
- Consider using dedicated social media accounts for testing
- Use environment variables for storing credentials in production environments
- Implement proper error handling in workflows to prevent sensitive information leakage

By following this guide, you'll have successfully set up integrations with all major social media platforms for your n8n coaching workflows. These integrations enable automated content posting, helping you maintain a consistent social media presence with minimal manual effort.
