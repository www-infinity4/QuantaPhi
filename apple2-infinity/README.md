# Apple II Infinity — software machine (prototype)

A zero-hardware, dependency-free, offline-capable software workbench. Not an Apple product, not a complete Apple IIe emulator, and not an FPGA bitstream.

## Components

| Physical concept | Software implementation | Boundary |
|---|---|---|
| Apple IIe 6502 | `Virtual6502` | Implements all 151 documented NMOS 6502 opcodes at instruction level; actual `BRK` vectors through IRQ, with an explicitly optional demo-only stop mode |
| 5V slot backplane | `VirtualAppleBus` | Memory map and simulated 1.023 MHz cycle counter; no physical TTL |
| Apple RAM / ROM | `Uint8Array` | 64 KiB address space; high ROM region reads as blank until an authorized ROM image is provided via `loadROM`; no ROM distributed |
| Text/video/speaker | `VirtualVideo` | 40 x 24 interleaved text addresses, text/graphics switches, speaker edge counter |
| ECP5 FPGA | `VirtualFPGA` | 16 slot-7 registers, reconfigurable gates, IRQ status, DMA model, 64 MiB sparse SDRAM |
| Pi CM5 | `VirtualCM5` | 8 GiB logically addressable sparse RAM, add/multiply/ADC jobs, offline network outbox |
| ADC / DAC | `VirtualSensors` | 10-bit analog reading and 8-bit digital-to-analog output |
| DMA arbiter | `VirtualFPGA.dma` | Bounded synchronous 4 KiB RAM copy with address validation; NOT electrical arbitration |

## Registers

`$C0F0` command (`1`=add, `2`=multiply, `3`=ADC sample); `$C0F1` status (`1` busy, `2` done, `4` error); `$C0F2` DAC; `$C0F3` IRQ enable bit 0; `$C0F4–$C0F7` arguments (two little-endian unsigned 16-bit operands, or ADC channel in F4); `$C0F8–$C0FB` result (unsigned little-endian 32-bit). Writes to `$C0F1` acknowledge done/error. This is a proposed virtual register interface, not an official Apple standard.

## Run

From repository root: `node --test test/apple2-infinity.test.mjs` (20 focused tests in this follow-up).

Static site path: `/apple2-infinity/` (HTML + native JavaScript modules; no npm or backend). The browser workbench accepts up to 4,096 hex bytes at `$0800`, lets you step instructions or run at most 2,000 per click, and shows CPU registers and 40-column virtual text output. Only this demo workbench treats `BRK` as a convenient stop; `Virtual6502.step()` implements the real vector path by default.

## Validation reference

Opcode coverage and base-cycle expectations were checked against the published 151-opcode table at https://github.com/PurpBatBoi/6502-skills-ext/blob/main/6502-instruction-set/references/opcodes.md and the 6502 instruction reference at https://www.nesdev.org/obelisk-6502-guide/reference.html. The implementation is original and was not copied from either source.

## Limitations / next engineering stages

1. Validate timing and edge-case flag behavior against independent NMOS 6502 conformance suites, especially undocumented opcodes (rejected here), invalid BCD input values, interrupt sampling/dummy reads, and true cycle-level I/O. The 151 official opcodes, vectors, basic decimal arithmetic, IRQ/NMI/BRK, indexed addressing, and page-crossing cycle estimates are now implemented but are not hardware-cycle-certified.
2. Implement actual Apple IIe MMU, ROM images from licensed sources, bank switching, HIRES/LORES graphics, disk controller and NTSC video timing.
3. Replace the simplified DMA copy with phase-correct virtual bus arbitration and test simultaneous peripheral interactions.
4. Move the CM5 model to a pluggable Web Worker / WASM compute engine; integrate a permission-gated Bubbles adapter separately.
5. Verify responsive UI and accessibility on a physical Android device, exact-head CI, independent review, merge and production publication.

Do not represent this prototype as a full Apple IIe ROM emulator, a physical computer, gigahertz-accurate simulation or actual connected sensor/network hardware.