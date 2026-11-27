#!/bin/bash
# Build Dreamlight.app from the installed Electron runtime and install it to /Applications.
# (@electron/packager exits silently on Node 26, so this assembles the bundle directly.)
set -e; INSTALL="$1"
cd "$(dirname "$0")"; D="$(cd .. && pwd)"; OUT="$D/dist/Dreamlight.app"
rm -rf "$D/dist"; mkdir -p "$D/dist"
# Newer Electron versions download their runtime on first run; fetch it now if npm start has not run yet.
[ -d node_modules/electron/dist/Electron.app ] || node node_modules/electron/install.js
cp -R node_modules/electron/dist/Electron.app "$OUT"
R="$OUT/Contents/Resources"; rm -f "$R/default_app.asar" "$R/electron.icns"; mkdir -p "$R/app/assets"
cp main.js menubar.js composio.js meeting-autoplay.js player-preload.js tray-preload.js tray.html "$R/app/"
cp assets/trayTemplate.png assets/trayTemplate@2x.png assets/icon-1024.png "$R/app/assets/"
printf '{"name":"dreamlight","productName":"Dreamlight","version":"1.0.0","main":"main.js"}' > "$R/app/package.json"
rsync -a "$D/web/" "$R/web/"
cp assets/icon.icns "$R/Dreamlight.icns"
P="$OUT/Contents/Info.plist"
for kv in "CFBundleName Dreamlight" "CFBundleDisplayName Dreamlight" "CFBundleIdentifier app.dreamlight.focus" "CFBundleIconFile Dreamlight.icns" "CFBundleShortVersionString 1.0.0" "CFBundleVersion 1.0.0" "LSApplicationCategoryType public.app-category.music"; do
  set -- $kv; /usr/libexec/PlistBuddy -c "Set :$1 $2" "$P" 2>/dev/null || /usr/libexec/PlistBuddy -c "Add :$1 string $2" "$P"; done
/usr/libexec/PlistBuddy -c "Delete :ElectronAsarIntegrity" "$P" 2>/dev/null || true
mv "$OUT/Contents/MacOS/Electron" "$OUT/Contents/MacOS/Dreamlight"; /usr/libexec/PlistBuddy -c "Set :CFBundleExecutable Dreamlight" "$P"
codesign --force --deep --sign - "$OUT"
if [ "$INSTALL" = "--install" ]; then pkill -f "/Applications/Dreamlight.app/Contents/MacOS/Dreamlight" || true; rm -rf /Applications/Dreamlight.app; ditto "$OUT" /Applications/Dreamlight.app; rm -rf "$D/dist"; echo "Installed /Applications/Dreamlight.app"; fi
