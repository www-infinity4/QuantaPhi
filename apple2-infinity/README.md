# Apple II Infinity — software machine (prototype)

A zero-hardware, dependency-free, offline-capable software workbench. Not an Apple product, not a complete Apple IIe emulator, and not an FPGA bitstream.

## Components

| Physical concept | Software implementation | Boundary |
|---|---|---|
| Apple IIe 6502 | `Virtual6502` | Implements all 151 documented NMOS 6502 opcodes at instruction level; actual `BRK` vectors through IRQ, with an explicitly optional demo-only stop mode |
| 5V slot backplane | `VirtualAppleBus` | Memory map and simulated 1.023 MHz cycle counter; no physical TTL |
| Apple main/aux RAM and ROM | `Uint8Array` banks | 64 KiB main, 64 KiB auxiliary; separate RAMRD/RAMWRT and ALTZP routing; ROM is blank until authorized `loadROM`, no ROM distributed |
| Text/video/speaker | `VirtualVideo` | 40/80 columns × 24 rows; aux/main video scanout, 80STORE/PAGE2 bank override, HIRES switch, speaker edge counter (no raster graphics yet) |
| ECP5 FPGA | `VirtualFPGA` | 16 slot-7 registers, reconfigurable gates, IRQ status, DMA model, 64 MiB sparse SDRAM |
| Pi CM5 | `VirtualCM5` | 8 GiB logically addressable sparse RAM, add/multiply/ADC jobs, offline network outbox |
| Language Card overlay | VirtualAppleBus language-card banks | 4 KiB bank 1 + bank 2 at $D000, shared upper 8 KiB at $E000, separate main/aux arrays; two-read software write unlock |
| Disk II controller (slot 6) | VirtualDisk2 in disk2.mjs | Two virtual drives; C0E0-C0EF phase/motor/Q6/Q7 soft switches; user-owned NIB files; optional user-supplied 256-byte slot ROM |
| ADC / DAC | `VirtualSensors` | 10-bit analog reading and 8-bit digital-to-analog output |
| DMA arbiter | `VirtualFPGA.dma` | Bounded synchronous 4 KiB RAM copy with address validation; NOT electrical arbitration |

## Registers

`$C0F0` command (`1`=add, `2`=multiply, `3`=ADC sample); `$C0F1` status (`1` busy, `2` done, `4` error); `$C0F2` DAC; `$C0F3` IRQ enable bit 0; `$C0F4–$C0F7` arguments (two little-endian unsigned 16-bit operands, or ADC channel in F4); `$C0F8–$C0FB` result (unsigned little-endian 32-bit). Writes to `$C0F1` acknowledge done/error. This is a proposed virtual register interface, not an official Apple standard.

## Run

From repository root: `node --test test/apple2-infinity.test.mjs` (58 focused tests (48 previous + 10 disk sector image tests)).

Static site path: `/apple2-infinity/` (HTML + native JavaScript modules; no npm or backend). The browser workbench accepts up to 4,096 hex bytes at `$0800`, lets you step instructions or run at most 2,000 per click, and shows CPU registers, 40/80-column virtual text output, auxiliary memory and language-card selectors plus the Disk II controller panel. Only this demo workbench treats `BRK` as a convenient stop; `Virtual6502.step()` implements the real vector path by default.

## Apple IIe auxiliary-memory and video soft switches (software model)

- Write `$C002/$C003` toggles RAMRD (main/aux *reads*) at `$0200–$BFFF`.
- Write `$C004/$C005` toggles RAMWRT (main/aux *writes*) at `$0200–$BFFF`.
- Write `$C008/$C009` toggles ALTZP for the zero page and stack (`$0000–$01FF`).
- Write `$C000/$C001` toggles 80STORE. With 80STORE enabled, `$C054/$C055` (PAGE2 off/on) selects main/aux physical `$0400–$07FF` text page 1, overriding RAMRD/RAMWRT. It also selects main/aux `$2000–$3FFF` only when HIRES (`$C057`) is on.
- Write `$C00C/$C00D` toggles 40/80-column rendering; 80-column text alternates auxiliary/main bytes on even/odd columns. `$C013/$C014/$C016/$C018/$C01A–$C01F` report the high-bit switch state only; low bits from the historical floating video bus are not modeled.
- C00X **reads** return the keyboard latch and do not toggle these soft switches. C05X reads or writes toggle the corresponding display switch. Disk/language-card bank switching, HIRES/LORES raster output, video-cycle timing, extended character glyphs and system/slot ROM decoding are not yet implemented.

Technical references (for behavior, not copied code):
- https://github.com/frozen-signal/Apple_IIe_MMU_IOU/blob/master/Documentation/Understanding_IOU_MMU/mmu-soft-switches.md
- https://github-wiki-see.page/m/mikedaley/web-a2e/wiki/Memory-System

## Language Card (software model)

- $C080-$C08F control the upper-memory overlay. Bit 3 chooses $D000 bank 1 or bank 2; the lower bits choose RAM-read protected, ROM-read with possible write-through, ROM-read protected, or RAM-read with possible writing.
- Odd-address reads must occur twice without an intervening reset switch access to enable writing; even accesses and writes to the switch area reset that prewrite state.
- D000-DFFF has two independent 4 KiB RAM banks; E000-FFFF is one shared 8 KiB RAM bank, with separate main and auxiliary banks selected using ALTZP.
- Status reads C011 and C012 report bank 2 selection and RAM-read visibility in bit 7 respectively. Other floating-bus bits and exact electrical timing are not simulated.
- ROM remains unchanged when the overlay is write-enabled. No Apple ROM data is bundled. A user's authorized image can still be loaded through the existing loadROM method.
- UI exposes bank and read/write selectors, with switch accesses emitted through the virtual I/O bus.

Hardware mapping references: https://github-wiki-see.page/m/mikedaley/web-a2e/wiki/Memory-System and https://github.com/cmosher01/Epple-II/blob/main/docs/usermanual.md#language . No external source code was copied.

## Limitations

Language-card transitions are virtual instruction-level events; low-level bus timings, video DMA, ROM/slot ownership and disk boot are still unimplemented.
## Validation reference

Opcode coverage and base-cycle expectations were checked against the published 151-opcode table at https://github.com/PurpBatBoi/6502-skills-ext/blob/main/6502-instruction-set/references/opcodes.md and the 6502 instruction reference at https://www.nesdev.org/obelisk-6502-guide/reference.html. The implementation is original and was not copied from either source.

## Limitations / next engineering stages

1. Validate timing and edge-case flag behavior against independent NMOS 6502 conformance suites, especially undocumented opcodes (rejected here), invalid BCD input values, interrupt sampling/dummy reads, and true cycle-level I/O. The 151 official opcodes, vectors, basic decimal arithmetic, IRQ/NMI/BRK, indexed addressing, and page-crossing cycle estimates are now implemented but are not hardware-cycle-certified.
2. Expand the partially implemented Apple IIe MMU to include slot/firmware ROM mapping and physical bus-cycle timing for language-card prewrite edges. Only add licensed ROMs supplied by users; implement HIRES/LORES graphics, disk controller and NTSC video timing as separate tested modules.
3. Replace the simplified DMA copy with phase-correct virtual bus arbitration and test simultaneous peripheral interactions.
4. Move the CM5 model to a pluggable Web Worker / WASM compute engine; integrate a permission-gated Bubbles adapter separately.
5. Verify responsive UI and accessibility on a physical Android device, exact-head CI, independent review, merge and production publication.

Do not represent this prototype as a full Apple IIe ROM emulator, a physical computer, gigahertz-accurate simulation or actual connected sensor/network hardware.
## Virtual Disk II — slot 6 nibble prototype

- Local, user-authorized .nib files only: exactly 232,960 bytes (35 tracks x 6656 nibbles). DSK, PO, WOZ and other disk formats are intentionally not yet decoded.
- Two virtual drives, motor and selected-drive signals, stepper-head phase switches, Q6/Q7 status, read-only by default, optional explicit byte-level nibble writes, and disk image export without changing the input file.
- The optional slot-6 boot ROM is loaded from a separate user-provided 256-byte file at C600-C6FF. No firmware or Apple software is shipped or downloaded.
- This is not a flux/timing-accurate Disk II logic state sequencer. One nibble is read per C0EC software access and write timing is simplified. Real DOS boot compatibility is not established.
- Files remain in local browser memory; there are no network requests, paid APIs, or system filesystem scans.
- Original implementation informed by https://github-wiki-see.page/m/mikedaley/web-a2e/wiki/Disk-System-Internals and https://github-wiki-see.page/m/mikedaley/web-a2e/wiki/Expansion-Slots ; reference code was not copied.

## User-supplied 140 KB DOS/ProDOS sector images (Session 6)

- The browser accepts local \`.dsk\` / \`.do\` as DOS 3.3 order, or \`.po\` as ProDOS order; all three are strictly 143,360 bytes (35 tracks × 16 sectors × 256 bytes). Ambiguous \`.dsk\` defaults to DOS order, so explicit source labeling matters.
- \`sector-image.mjs\` GCR-encodes each logical sector into 343 disk nibbles, with 4-and-4 address headers and DOS/ProDOS sector interleaving, to produce the 232,960-byte NIB stream consumed by the existing Disk II controller. The module also includes strict checksum-validated NIB-to-sector conversion for tests.
- The 10 new regression tests include both complete 560-sector round trips, invalid GCR/address/size rejection, and slot-6 read-through. The original 48 tests remain in CI, for 58 focused tests total.
- All imports operate locally; mount copies data into virtual memory. The browser exports an independent \`.nib\` copy for all supported import types, never overwriting the original \`.dsk\`, \`.do\`, or \`.po\`.
- Supported: standard 16-sector DOS 3.3/ProDOS image ordering. Not supported: 13-sector disks, copy-protected layouts, bit-accurate flux or P6 timing, guaranteed DOS/ProDOS boot, bundled Apple ROMs or network-based image retrieval.
- Algorithm reference: https://github-wiki-see.page/m/mikedaley/web-a2e/wiki/Disk-System-Internals . Original implementation, no reference source copied.
