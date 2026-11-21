# Bubbles Termux Helper

**What it is** – A tiny Python script that wraps the standard Android `adb` commands and Termux‑API utilities so the *Bubbles* assistant can automate screen taps, swipes, key events, file browsing and toast notifications directly from a Termux environment.

---

## 1️⃣ Prerequisites – Set up Termux

```bash
# Update package lists and upgrade existing packages
pkg update && pkg upgrade -y

# Install the core tools we need
pkg install python termux-api android-tools -y

# Give Termux permission to read/write the shared storage area
termux-setup-storage
```

> **Note** – `android-tools` provides the `adb` binary that the helper script uses. No additional Python ADB library is required because we call `adb` directly.

---

## 2️⃣ (Optional) Install Python libraries

The helper itself only uses the Python standard library, but you may want the following for more advanced Bubbles scripts:

```bash
pip install pure-python-adb requests beautifulsoup4 rich
```

---

## 3️⃣ How to run the helper script

Assuming the repository is cloned inside Termux (`~/QuantaPhi`), the script lives at:
```
~/QuantaPhi/android/bubbles-one/scripts/bubbles_termux_helper.py
```
Make it executable (optional) and invoke it with Python:

```bash
python ~/QuantaPhi/android/bubbles-one/scripts/bubbles_termux_helper.py tap 500 1000
```
The command above tells the device to tap the screen at **X = 500**, **Y = 1000**.

---

## 4️⃣ Available commands

| Command | Description | Example |
|---------|-------------|---------|
| `tap X Y` | Simulate a single tap at the given coordinates. | `... tap 300 800` |
| `swipe X1 Y1 X2 Y2 [--duration ms]` | Swipe from one point to another. Default duration is 300 ms. | `... swipe 100 500 400 500 --duration 600` |
| `keyevent KEYCODE` | Send an Android key event (e.g., `HOME`, `BACK`). | `... keyevent HOME` |
| `list [path]` | List files in *path* (defaults to current directory). Output is JSON. | `... list /sdcard/Download` |
| `open PATH_OR_URL` | Open a file or URL with the default Android app (`termux-open`). | `... open https://example.com` |
| `toast MSG` | Show a short toast notification. | `... toast "Hello from Bubbles!"` |

---

## 5️⃣ Using the helper from **Bubbles**

Bubbles can invoke the script through its conversation bridge. A typical call looks like:

```text
run python /data/data/com.termux/files/home/QuantaPhi/android/bubbles-one/scripts/bubbles_termux_helper.py tap 500 1000
```
Replace the absolute path with the actual location of the cloned repository on the device.

---

## 6️⃣ Troubleshooting

* **`adb: command not found`** – Ensure `android-tools` is installed and that the `adb` binary is in your `$PATH` (Termux does this automatically).
* **Permission errors** – Run `termux-setup-storage` again and grant the requested permissions.
* **No response from the device** – Verify that USB debugging is enabled and that the device is authorized for ADB connections (`adb devices`).

---

## 7️⃣ Contributing

If you add new capabilities, extend the script and update this README. Pull requests are welcome – the project follows the standard GitHub workflow with CI checks.
