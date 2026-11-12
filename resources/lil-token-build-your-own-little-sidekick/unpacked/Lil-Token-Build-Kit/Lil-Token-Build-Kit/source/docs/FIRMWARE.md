# Firmware and recovery

The public patch is pinned to the upstream revision in `fork/UPSTREAM_BASE`. Reconstruct it with `bash tools/bootstrap-src.sh` before building. The full changed files are also under `fork/files/firmware/` for reading.

## Before flashing

1. Confirm that your device matches the StackChan ESP32-S3 target and its flash capacity.
2. Identify the exact USB serial device. Avoid wildcards when more than one device is connected.
3. Read a full backup of your device with the appropriate `esptool` version and verify its checksum. Keep it privately.
4. Record the installed firmware and partition layout. Review the upstream recovery procedure.

## Build from the pinned source

The original build used ESP-IDF 5.5.2. From `src/firmware`:

```bash
docker run --rm --cpus=6 --ulimit nofile=65536:65536 \
  -v "$PWD":/project -w /project espressif/idf:v5.5.2 \
  python ./scripts/release.py stackchan
```

Review the generated flashing instructions and manifest in the build output. Use the exact filenames and offsets from that build. A changed partition layout requires a coordinated update of the partition table, application and assets. Preserve NVS when the chosen upgrade procedure allows it because it contains local configuration.

`fork/files/firmware/partitions/v2/16m_liltoken.csv` is the build’s partition layout. `fork/local/` supplies generated compiled-in faces. These files are source inputs, not a universal flashing recipe for other hardware.

## Device setup

Configure the device for your private Wi-Fi network, set the WebSocket gateway to your Mac’s LAN address on port 8765 and use your own `STACKCHAN_TOKEN`. Start the gateway before checking the robot’s connection.

Opening a serial port can reset the board. Keep USB and Wi-Fi logs separate while diagnosing reconnects. Revisit the upstream instructions if your device asks for activation or has a different configuration screen.

## Recovery

Stop both local processes. Use the manufacturer or upstream recovery process with your private backup and the correct hardware target. Do not publish your backup or someone else’s firmware image containing NVS.

## Source and licensing

This release distributes source and a reproducible patch. The combined firmware includes the upstream servo component under GPL-3.0. Preserve the notices and corresponding-source obligations when distributing a firmware binary. The relevant license texts are in `LICENSES/`.
