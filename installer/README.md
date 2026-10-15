# Installer and recovery

FMiniMug1 should follow a recovery-first installation model. Felucca demonstrates a working FM-1 flow: an installable `.fwsc`, a Chrome/Edge Web-MIDI installer, CLI installer, package identity/size checks, and a return-to-official-V15 path.

## Required release behavior

1. Detect the connected FM-1 and read its identity before writing.
2. Reject unsupported/unknown identities by default.
3. Verify the package's declared target and size before erasing flash.
4. Verify SHA-256 of the selected release asset.
5. Keep a return-to-stock option next to the install button.
6. Publish an FM-1-transporter recovery guide for non-booting devices.
7. Never label development builds as safe/stable until verified on real hardware.

## Planned artifacts

- `fminimug1-X.Y.Z.fwsc`
- `fminimug1-X.Y.Z-app.bin`
- `SHA256SUMS`
- source archive with required submodules/vendor-license information

## Development integration

The installer is intentionally not pretending that a firmware package already exists. The current repo contains the application/DSP and browser reference implementation. Once the Felucca-compatible FM-1 target builds successfully, the next installer task is to adapt the existing proven packaging/transport layer with its licence notices and package guards rather than inventing another flasher.

Until then: **do not flash files from this repository to an FM-1.**
