# Advanced Tutorial – Building a Custom Robot Arm with Live Telemetry

**Goal**: Design, fabricate, and program a 3‑DOF robot arm that streams joint angles to the QuantaPhi dashboard.

## Prerequisites

- Access to a 3‑D printer or CNC mill.
- Boron board with the safe‑wallet firmware.
- Servo motors (e.g., MG996R) and a power supply.
- Node.js (v18+) and `npm`.
- This repository cloned locally.

## Workflow

### 1. Mechanical Design

- Use **FreeCAD** (or any CAD tool) to model three links and joints.
- Export each part as `STL` files: `base.stl`, `link1.stl`, `link2.stl`, `end-effector.stl`.
- Print or mill the parts.

### 2. Assembly

- Mount the servos on the printed joints.
- Connect servo signal wires to Boron pins `D0`, `D1`, `D2`.
- Power the servos with a 5 V supply (do **not** power them from the Boron USB).

### 3. Firmware Development

Create `src/firmware/robot-arm.ino` (or `.cpp`) with the following logic:

```cpp
#include "Particle.h"

Servo servoBase, servoElbow, servoWrist;

void setup() {
  Particle.function("setAngles", setAngles);
  servoBase.attach(D0);
  servoElbow.attach(D1);
  servoWrist.attach(D2);
}

int setAngles(String args) {
  // args format: base,elbow,wrist (0‑180)
  int commas[2];
  int idx = 0;
  for (int i = 0; i < args.length(); ++i) {
    if (args.charAt(i) == ',') commas[idx++] = i;
  }
  int base = args.substring(0, commas[0]).toInt();
  int elbow = args.substring(commas[0]+1, commas[1]).toInt();
  int wrist = args.substring(commas[1]+1).toInt();
  servoBase.write(base);
  servoElbow.write(elbow);
  servoWrist.write(wrist);
  return 1;
}
```

Flash the firmware:
```bash
particle flash --usb src/firmware/robot-arm.bin
```

### 4. Telemetry Server (Node)

Create `src/server/telemetry.js`:

```js
const Particle = require('particle-api-js');
const particle = new Particle();
const token = process.env.PARTICLE_TOKEN; // set in .env (never commit)

async function sendAngles(base, elbow, wrist) {
  await particle.callFunction({
    deviceId: process.env.DEVICE_ID,
    name: 'setAngles',
    argument: `${base},${elbow},${wrist}`,
    auth: token,
  });
}

module.exports = { sendAngles };
```

### 5. Live Dashboard Integration

Update `science/index.html` to include a simple control panel (already styled). Add the following script tag before `</body>`:

```html
<script type="module">
  import { sendAngles } from '../src/server/telemetry.js';
  const baseInput = document.getElementById('base');
  const elbowInput = document.getElementById('elbow');
  const wristInput = document.getElementById('wrist');
  const btn = document.getElementById('sendBtn');
  btn.addEventListener('click', async () => {
    await sendAngles(baseInput.value, elbowInput.value, wristInput.value);
    alert('Angles sent!');
  });
</script>
```

Add the corresponding HTML controls inside the **Tutorials** section of `index.html` (you can copy‑paste from the template below).

### 6. Test the System

1. Open `index.html` on a desktop browser.
2. Adjust the sliders and press **Send Angles**.
3. Observe the robot arm moving in real time.
4. Record a short video and embed it in `graphs/graph2.svg` as a placeholder.

## What You Learned

- End‑to‑end hardware‑software integration.
- Remote function calls via Particle Cloud.
- Building a minimal telemetry dashboard with vanilla JavaScript.
- Applying the Oracle Octaves design system to interactive UI.

Enjoy building more sophisticated robots and sharing your data with the QuantaPhi community!
