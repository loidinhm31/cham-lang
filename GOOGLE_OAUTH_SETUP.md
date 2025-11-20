# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for Google Drive sync in your Cham Lang application.

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com)

## Desktop Setup (macOS, Windows, Linux)

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "Cham Lang")
5. Click "Create"

### 2. Enable Google Drive API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google Drive API"
3. Click on it and click "Enable"

### 3. Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in the app name (e.g., "Cham Lang")
   - Add your email as support email
   - Add scopes: `drive.file`, `openid`, `email`, `profile`
   - Add test users (your email)
   - Save and continue
4. For application type, choose **"Web application"**
5. Give it a name (e.g., "Cham Lang Desktop")
6. Under "Authorized redirect URIs", add:
   ```
   http://localhost
   ```
7. Click "Create"
8. Copy the **Client ID** and **Client Secret**

### 4. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```env
   VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   VITE_GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```

### 5. Test Desktop App

```bash
pnpm tauri dev
```

Navigate to Profile page and click "Sign in with Google". A browser window should open for authentication.

---

## Android Setup

### 1. Get SHA-1 Fingerprint

#### For Debug Build:

On macOS/Linux:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

On Windows:
```bash
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

Copy the **SHA-1** fingerprint from the output.

#### For Release Build:

Use your release keystore:
```bash
keytool -list -v -keystore /path/to/your/release.keystore -alias your_alias
```

### 2. Create Android OAuth Credentials
Use the same as Desktop

### 3. Configure Android Build

The Android Client ID is automatically used by the plugin on Android devices. You can optionally set it explicitly in your Tauri configuration if needed.

### 4. Build and Test Android App

Build the APK:
```bash
pnpm tauri android build
```

Or run in dev mode:
```bash
pnpm tauri android dev
```

Install on your device/emulator and test the "Sign in with Google" flow.

---

## Troubleshooting

### Desktop Issues

**Error: "redirect_uri_mismatch"**
- Make sure `http://localhost` is added to authorized redirect URIs in Google Cloud Console
- The URI must be exactly `http://localhost` (no port, no trailing slash)

**Error: "invalid_client"**
- Double-check your Client ID and Client Secret in `.env`
- Make sure there are no extra spaces or quotes

### Android Issues

**Error: "Sign in failed" or "10: Developer Error"**
- Verify the SHA-1 fingerprint is correct
- Make sure the package name matches exactly
- Try cleaning and rebuilding the app
- Check that Google Drive API is enabled

**Error: "Access blocked: This app's request is invalid"**
- Add your Google account as a test user in OAuth consent screen
- Or publish your app (only for production)

### General Issues

**Token expired errors**
- OAuth access tokens expire after 1 hour
- The plugin handles refresh tokens automatically
- If you get persistent auth errors, sign out and sign in again

**No backup found**
- Make sure you've clicked "Backup Now" at least once
- Check your Google Drive for `chamlang_backup.db` file

---

## Security Notes

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Client Secret** should be kept private (for desktop only)
3. **For production apps**, consider using environment variables or secure secret management
4. **Android** doesn't require a client secret (it's secure by design using package name + SHA-1)
5. All data is stored in your own Google Drive account and is not shared

---

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Drive API Documentation](https://developers.google.com/drive/api/guides/about-sdk)
- [Tauri Plugin Google Auth](https://github.com/Choochmeque/tauri-plugin-google-auth)
- [Android Setup Guide](https://github.com/Choochmeque/tauri-plugin-google-auth/blob/main/ANDROID_SETUP.md)
