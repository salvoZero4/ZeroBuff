# ZeroBuff Mobile

Expo SDK 58 / React Native app for Today, Routines, Workout, Analytics and Profile. Follow `AGENTS.md` and the root project guidelines before making changes.

## Development

Install dependencies with `npm install`. Configure the backend URL in a local `.env` using `EXPO_PUBLIC_API_URL`, including `/v1`; use an address reachable from your device. Do not commit credentials.

`npm start` starts Metro. Use `npm run ios`, `npm run android` or `npm run web` for the target platform. Native rest notifications and Live Activities require a rebuilt native app; Expo Go cannot load that integration.

## Structure

- `index.js`: registers Notifee background handlers before Expo Router.
- `src/app/`: route adapters and navigation layouts.
- `src/features/`: feature-owned UI, APIs, contracts and state.
- `src/features/workout/notifications/`: Notifee adapters, permissions and timer synchronization.
- `src/components/ui/`: shared UI primitives.
- `src/shared/`: API transport, query cache, errors and utilities.
- `modules/rest-timer/`: Swift/Kotlin timer integration discovered by autolinking.
- `plugins/withRestTimer.js`: generates the Live Activity extension and Notifee native configuration.

Do not edit generated `ios/` and `android/` files by hand. Native build details and platform limits are documented in [the rest timer module](modules/rest-timer/README.md).

## Checks

```sh
npx tsc --noEmit
npx expo lint
node --test tests/*.test.cjs
```

The Node suites test the real TypeScript logic with simulated native/network boundaries. They do not certify device behavior. See the repository's `context/` dossier for current verification coverage and remaining work.
