#!/usr/bin/env bash
# Real Android emulator smoke, not a mock WebView or mocked Java source.
# This cannot confer owner identity, microphone consent on a physical phone,
# verify audio playback quality, or certify shared wallet/history sync.
set -euo pipefail
mkdir -p /tmp/bubbles-emulator
gradle --no-daemon -p android/bubbles-overlay -PbubblesEmulatorSmoke=true assembleDebug
APK=android/bubbles-overlay/app/build/outputs/apk/debug/app-debug.apk
test -s "$APK"
adb install -r "$APK"
PKG=org.quantaphi.bubbles.preview5
adb shell pm path "$PKG" | tee /tmp/bubbles-emulator/installed.txt
adb shell pm grant "$PKG" android.permission.RECORD_AUDIO
adb shell pm grant "$PKG" android.permission.POST_NOTIFICATIONS
adb shell appops set "$PKG" SYSTEM_ALERT_WINDOW allow
adb logcat -c
adb shell am start -W -n "$PKG/org.quantaphi.bubbles.MainActivity" | tee /tmp/bubbles-emulator/launch.txt
sleep 5
adb shell uiautomator dump /sdcard/bubbles-initial.xml
adb pull /sdcard/bubbles-initial.xml /tmp/bubbles-emulator/initial.xml
python3 - <<'PY'
from xml.etree import ElementTree as ET
import re,subprocess
root=ET.parse('/tmp/bubbles-emulator/initial.xml').getroot()
controls=[node.attrib for node in root.iter('node')]
if not any('Bubbles AI' in row.get('text','') for row in controls):
    raise SystemExit('Android Bubbles launch screen not rendered')
button=next((row for row in controls if 'Start or resume Bubbles voice' in row.get('text','')),None)
if not button:
    raise SystemExit('Android voice-launch button not rendered')
coords=list(map(int,re.findall(r'\d+',button.get('bounds',''))))
if len(coords)!=4:
    raise SystemExit('Android voice-launch button has no bounds')
x=(coords[0]+coords[2])//2
y=(coords[1]+coords[3])//2
subprocess.run(['adb','shell','input','tap',str(x),str(y)],check=True)
PY
sleep 16
adb shell dumpsys activity services > /tmp/bubbles-emulator/services.txt
adb shell uiautomator dump /sdcard/bubbles-after-start.xml || true
adb pull /sdcard/bubbles-after-start.xml /tmp/bubbles-emulator/after-start.xml || true
adb shell screencap -p /sdcard/bubbles-smoke.png
adb pull /sdcard/bubbles-smoke.png /tmp/bubbles-emulator/bubbles-smoke.png
adb logcat -d -v threadtime > /tmp/bubbles-emulator/logcat.txt
python3 - <<'PY'
from pathlib import Path
services=Path('/tmp/bubbles-emulator/services.txt').read_text(errors='replace')
if 'BubblesService' not in services:
    raise SystemExit('Bubbles foreground voice service did not start in emulator')
log=Path('/tmp/bubbles-emulator/logcat.txt').read_text(errors='replace')
chunks=log.split('FATAL EXCEPTION:')
for chunk in chunks[1:]:
    head='\n'.join(chunk.splitlines()[:18])
    if 'Process: org.quantaphi.bubbles.preview5' in head:
        raise SystemExit('Bubbles crashed: '+head[:700])
print('Emulator confirmed: APK installed, activity rendered, voice service started, no Bubbles FATAL EXCEPTION.')
print('Not confirmed: live account sync, website weather receipt, on-device audio, recording consent, or Moto G runtime.')
PY
