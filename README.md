# Super Soundboard (React Native + Expo)

This project is a **React Native app** built with **Expo**.

## Features

- Adaptive candy-style buttons optimized for landscape screens.
- Random sound effects fetched from Freesound (`funny` query).
- Native-first support for iOS and Android, with optional Expo web support.

## Project structure

- `App.js` - Main React Native soundboard UI and interaction logic.
- `app.json` - Expo app configuration (`ios`, `android`, and `web` platforms).
- `babel.config.js` - Babel config for Expo.
- `package.json` - Dependencies and Expo scripts.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Start Expo dev server:

```bash
npm run start
```

3. Run on a specific platform:

```bash
npm run android
npm run ios
npm run web
```

## Notes

- This app uses `expo-av` to play Freesound preview clips.
- Set `EXPO_PUBLIC_FREESOUND_API_KEY` before running the app.
