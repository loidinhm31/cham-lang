# Android Signing Guide for Chameleon

This guide explains how to set up Android app signing for both local development and GitHub Actions CI/CD.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [GitHub Actions Setup](#github-actions-setup)
- [Building Signed APKs](#building-signed-apks)

## Prerequisites

- Java Development Kit (JDK) 17 or higher
- Android SDK with NDK installed
- Tauri CLI installed (`pnpm install`)

## Important Notes

**The `build.gradle.kts` has been modified** to make keystore signing optional:
- Debug builds work WITHOUT a keystore (uses Android's default debug signing)
- Release builds require a keystore for production signing
- If you regenerate Android files with `pnpm tauri android init`, you may need to reapply the optional signing configuration

**Do NOT commit** `src-tauri/gen/android/keystore.properties` - it's already in `.gitignore`

## Local Development Setup

### 1. Generate a Keystore

If you don't have a keystore yet, generate one using `keytool`:

```bash
keytool -genkey -v -keystore ./cham-lang-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias cham-lang-key
```

You'll be prompted to enter:
- **Keystore password**: Choose a strong password (remember this!)
- **Key password**: Can be the same as keystore password
- **Your details**: Name, organization, city, state, country

**IMPORTANT**: Keep this keystore file safe and never commit it to version control!

### 2. Create keystore.properties

Create a file `src-tauri/gen/android/keystore.properties`:

```properties
storeFile=/path/to/your/cham-lang-keystore.jks
keyAlias=cham-lang-key
password=YourKeystorePassword
```

Replace:
- `/path/to/your/cham-lang-keystore.jks` with the actual path to your keystore
- `cham-lang-key` with your key alias (if different)
- `YourKeystorePassword` with your actual keystore password

**IMPORTANT**: This file is already in `.gitignore` and should NEVER be committed!

### 3. Build Signed APK Locally

```bash
# Build release APK (signed)
pnpm tauri android build

```

## GitHub Actions Setup

### 1. Convert Keystore to Base64

Convert your keystore to base64 for storage in GitHub Secrets:

```bash
base64 -i ./cham-lang-keystore.jks          # Linux (copy output)
```

### 2. Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

1. **ANDROID_KEYSTORE_BASE64**
   - Value: The base64-encoded keystore from step 1

2. **ANDROID_KEY_ALIAS**
   - Value: Your key alias (e.g., `cham-lang-key`)

3. **ANDROID_KEYSTORE_PASSWORD**
   - Value: Your keystore password

### 3. Trigger Build

The GitHub Actions workflow will automatically:
- Build **debug APKs** for PRs and non-tag pushes
- Build **signed release APKs** only for version tags (e.g., `v1.0.0`)

To create a release:

```bash
# Tag a new version
git tag v1.0.0
git push origin v1.0.0

# Or create via GitHub UI
# Releases → Create a new release → Choose a tag
```

## Building Signed APKs

### Debug Builds (Development)

Debug APKs are automatically signed with a debug key:

```bash
pnpm tauri android build --apk true
```

Use these for:
- Testing on your device
- Internal testing
- Development

### Release Builds (Production)

Release APKs are signed with your production keystore:

```bash
pnpm tauri android build --apk true --release
```

Use these for:
- Google Play Store uploads
- Production distribution
- Public releases

## Android Build Variants

The build produces multiple APK variants:

1. **Universal APK** (`universal/release/`)
   - Works on all architectures (ARM, x86)
   - Larger file size (~20-30 MB)
   - Best for direct distribution

2. **ARM64 APK** (`arm64/release/`)
   - For modern Android devices (most common)
   - Smaller file size (~10-15 MB)
   - Recommended for Play Store

3. **x86_64 APK** (`x86_64/release/`)
   - For emulators and rare x86 devices
   - Smaller file size (~10-15 MB)

## Verifying Signed APKs

To verify an APK is properly signed:

```bash
# Check signing info
jarsigner -verify -verbose -certs app-release.apk

# View detailed certificate info
keytool -printcert -jarfile app-release.apk
```

Expected output should show:
- jar verified. ✓
- Your certificate details (CN, O, etc.)

## Security Best Practices

1. **Never commit keystore files**
   - Keep keystore in secure location
   - Use `.gitignore` to exclude `*.jks`, `*.keystore`

2. **Never commit keystore.properties**
   - Already in `.gitignore`
   - Store securely outside repository

3. **Backup your keystore**
   - Store in password manager
   - Keep offline backup in secure location
   - You CANNOT recover lost keystores!

4. **Use strong passwords**
   - Minimum 16 characters
   - Mix of letters, numbers, symbols
   - Different from other passwords

5. **Rotate keys periodically**
   - Google recommends rotating every 2-3 years
   - Update via Play Console's app signing feature

## Additional Resources

- [Tauri Android Signing Docs](https://v2.tauri.app/distribute/sign/android/)
- [Android Developer: Sign your app](https://developer.android.com/studio/publish/app-signing)
- [Google Play: App signing](https://support.google.com/googleplay/android-developer/answer/9842756)

## Questions or Issues?

If you encounter issues not covered here:
1. Check the [Tauri Discord](https://discord.gg/tauri) #android channel
2. Review [GitHub Actions logs](../../actions) for specific errors
3. See Android build logs: `src-tauri/gen/android/app/build/outputs/logs/`
