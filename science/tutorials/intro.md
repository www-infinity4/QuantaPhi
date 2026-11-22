# Introductory Tutorial – Reproducing a Simple Sensor Experiment

**Goal**: Collect temperature data from a Boron‑based robot and visualise it.

## Prerequisites

- A Boron development board with the safe‑wallet firmware installed.
- A temperature sensor (e.g., DS18B20) wired to the Boron.
- Node.js (v18+) installed on your workstation.
- Git clone of this repository.

## Steps

1. **Hardware Setup**
   - Connect the sensor's data line to the Boron’s `D0` pin.
   - Power the board via USB.
2. **Firmware Flash**
   ```bash
   particle flash --usb src/firmware/boron-temp.bin
   ```
3. **Run the Data Collector**
   ```bash
   cd science
   node collect-temp.js
   ```
   The script will log temperature readings to `data/temp.csv` for 60 seconds.
4. **Generate the Graph**
   ```bash
   npm install csv-parser d3-node
   node generate-graph.js data/temp.csv > graphs/graph1.svg
   ```
   The generated SVG replaces the placeholder `graph1.svg`.
5. **View the Result**
   Open `index.html` in a browser. The new graph should appear under **Key Graphs**.

## What You Learned

- How to interface a sensor with Boron.
- Basic data logging and CSV handling in Node.
- Using D3 to create SVG visualisations.

Feel free to modify the collection duration or sensor type and observe the changes in the graph.
