#!/bin/sh
# Capture the native authentication UI from an already running Android emulator.
set -eu
PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
SDK_DIR=${ANDROID_HOME:-"$HOME/Library/Android/sdk"}
ADB="$SDK_DIR/platform-tools/adb"
DEVICE=${1:-emulator-5554}
SCREEN=${2:-sign-in}
case "$SCREEN" in
  sign-in) ROUTE="" ;;
  sign-up) ROUTE="/--/sign-up" ;;
  *) echo 'Screen must be sign-in or sign-up.' >&2; exit 1 ;;
esac
"$ADB" -s "$DEVICE" reverse tcp:8081 tcp:8081
"$ADB" -s "$DEVICE" shell am start -W -a android.intent.action.VIEW -d "exp://127.0.0.1:8081$ROUTE"
echo 'After the screen has finished rendering, press Enter to capture.'
read -r READY
mkdir -p "$PROJECT_DIR/design/verification"
"$ADB" -s "$DEVICE" exec-out screencap -p > "$PROJECT_DIR/design/verification/$SCREEN.png"
echo "Saved design/verification/$SCREEN.png"
