# Repository Guidelines

## Project Structure & Module Organization
This is an Expo React Native app with a small utility layer.

- `App.js`: main UI, state, layout, and sound playback flow.
- `utils/`: pure helper logic (`soundboardUtils.js`) and unit tests (`soundboardUtils.test.js`).
- `assets/`: static media (images, gifs, icons) used by the app.
- `coverage/`: Jest coverage output.
- Config files: `app.json`, `babel.config.js`, `eas.json`, `package.json`.

Keep UI behavior in `App.js` and move reusable logic into `utils/` so it stays testable.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run start`: start Expo dev server.
- `npm run android`: build/run on Android device or emulator.
- `npm run ios`: build/run on iOS simulator/device (macOS toolchain required).
- `npm run web`: run the Expo web target.
- `npm test`: run Jest tests.
- `npm run test:coverage`: run Jest with coverage report.

Set `EXPO_PUBLIC_FREESOUND_API_KEY` in `.env` before loading sounds from Freesound.

## Coding Style & Naming Conventions
- Language: JavaScript (ES modules, React hooks).
- Formatting style in repo: 2-space indentation, semicolons, single quotes.
- Prefer `const`/`let`; avoid `var`.
- Naming: `camelCase` for variables/functions, `UPPER_SNAKE_CASE` for constants, descriptive file names like `soundboardUtils.js`.
- Keep functions in `utils/` pure and side-effect free where possible.

## Testing Guidelines
- Framework: Jest (`npm test`).
- Place tests next to target modules in `utils/` with `*.test.js` naming.
- Current coverage gate (global): 80% for branches, functions, lines, and statements.
- Add/adjust tests whenever utility logic changes, especially grid sizing, label transforms, and array shuffling behavior.

## Commit & Pull Request Guidelines
- Follow Conventional Commit style where possible: `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`.
- Keep commit subjects short and imperative; scope optional.
- PRs should include:
  - What changed and why.
  - Linked issue (if applicable).
  - Test evidence (`npm test` output; coverage for logic changes).
  - Screenshots/video for UI or layout updates (Android/iOS/web when relevant).
