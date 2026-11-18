# Avatar AI ↔ ESP32 local BLE observation bridge

**Status:** source prototype / pairing requires physical acceptance. This complements the existing hardware/infinity-phone/README.md and Avatar AI ticket #1923. It is not an on-device AI model, neural reader, free Internet access, or a public personal-history service.

## Buildable first slice

- Hardware: **original ESP32 DevKit/WROOM** board with Bluetooth LE; a momentary pushbutton connects GPIO27 to GND using INPUT_PULLUP. Other ESP32 boards may use different GPIOs and Arduino BLE libraries.
- Install the supported ESP32 board package in Arduino IDE, choose the correct ESP32 board/serial port, and flash avatar-ble-button.ino through your own authorized development interface. No secret or account is required by this demonstration firmware.
- Firmware advertises Avatar-ESP32 and the custom service UUID in avatar-esp32-core.mjs; it sends bounded JSON button events via GATT notification. It does **not** capture audio, EEG, private data, location, or website pages.
- On a supported **HTTPS Android Chrome** Avatar AI page, expand **ESP32 · local hardware branch**, tap **Pair ESP32**, select your device, press the physical button, and see local tree leaves. Tap **Add selected leaf to prompt** to deliberately copy an observation into the existing Avatar AI focus field; a separate copy/paste/send action is still required.
- **Disconnect** stops this page's active device connection. No localStorage, cloud upload, service worker, autonomous collection, or background phone listening was added.

## Wire protocol v1

Service UUID: b3d70001-62ce-49b9-a52b-0e1923000001.
Notify characteristic UUID: b3d70002-62ce-49b9-a52b-0e1923000001.

Button example: {"v":1,"kind":"button","id":"button","value":1,"seq":1}. The receiving page permits button 0/1 and allowlisted future sensor readings (light 0–100; temperature_c −20–85). The bundled firmware implements **button only**. No arbitrary text, command, person identity, voice transcript, or AI intention is accepted. Packet cap: 180 bytes; last eight recent leaves; duplicate sequences ignored within a connection.

## Limits and security

- This demonstration has **no sensitive sensor data**. Default advertising and notifications are not evidence of encrypted or authenticated BLE sessions. Do not transmit EEG, private conversation data, credentials, medical data, or identity through this prototype. Authenticated encrypted pairing, hardware trust, and per-device replay protections need independent design and acceptance before sensitive expansion.
- Web Bluetooth needs a secure context, explicit user gesture and a compatible browser. Android WebView and the existing Bubbles APK are **not yet verified** for Web Bluetooth. A native GATT adapter, Android runtime permissions, real device tests, foreground/background policy and user revocation are future APK work.
- BLE and local Wi-Fi do not create carrier-authorized cellular service or worldwide free Internet. This code does not request tower/SIM access.
- No physical firmware compilation, flash, BLE pairing or APK deployment has been completed by drafting these files. Run node --test test/avatar-esp32.test.mjs for the source protocol, then independently test ESP32 hardware and Android Chrome.
