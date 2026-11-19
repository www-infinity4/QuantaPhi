# Apple II Infinity — software machine (prototype)

A zero-hardware, dependency-free, offline-capable software workbench. Not an Apple product, not a complete Apple IIe emulator, and not an FPGA bitstream.

## Components

| Physical concept | Software implementation | Boundary |
|---|---|---|
| Apple IIe 6502 | `Virtual6502` | Implements a documented subset of opcodes; `BRK` is a demo stop sentinel |
| 5V slot backplane | `VirtualAppleBus` | Memory map and simulated 1.023 MHz cycle counter; no physical TTL |
| Apple RAM / ROM | `Uint8Array` | 64 KiB address space; high ROM region reads as blank until real ROM loading is designed |
| Text/video/speaker | `VirtualVideo` | 40 x 24 interleaved text addresses, text/graphics switches, speaker edge counter |
| ECP5 FPGA | `VirtualFPGA` | 16 slot-7 registers, reconfigurable gates, IRQ status, DMA model, 64 MiB sparse SDRAM |
| Pi CM5 | `VirtualCM5` | 8 GiB logically addressable sparse RAM, add/multiply/ADC jobs, offline network outbox |
| ADC / DAC | `VirtualSensors` | 10-bit analog reading and 8-bit digital-to-analog output |
| DMA arbiter | `VirtualFPGA.dma` | Bounded synchronous 4 KiB RAM copy with address validation; NOT electrical arbitration |

## Registers

`$C0F0` command (`1`=add, `2`=multiply, `3`=ADC sample); `$C0F1` status (`1` busy, `2` done, `4` error); `$C0F2` DAC; `$C0F3` IRQ enable bit 0; `$C0F4–$C0F7` arguments (two little-endian unsigned 16-bit operands, or ADC channel in F4); `$C0F8–$C0FB` result (unsigned little-endian 32-bit). Writes to `$C0F1` acknowledge done/error. This is a proposed virtual register interface, not an official Apple standard.

## Run

From repository root: `node --test test/apple2-infinity.test.mjs`.

Static site path: `/apple2-infinity/` (HTML + native JavaScript modules; no npm or backend).

## Limitations / next engineering stages

1. Extend the instruction interpreter into a full tested NMOS 6502 including vectors, decimal mode, illegal-opcode policy, interrupts, page crossing and real 6502 `BRK` behavior.
2. Implement actual Apple IIe MMU, ROM images from licensed sources, bank switching, HIRES/LORES graphics, disk controller and NTSC video timing.
3. Replace the simplified DMA copy with phase-correct virtual bus arbitration and test simultaneous peripheral interactions.
4. Move the CM5 model to a pluggable Web Worker / WASM compute engine; integrate a permission-gated Bubbles adapter separately.
5. Verify responsive UI and accessibility on a physical Android device, exact-head CI, independent review, merge and production publication.

Do not represent this prototype as a full Apple IIe ROM emulator, a physical computer, gigahertz-accurate simulation or actual connected sensor/network hardware.
