import serial, sys, time
s = serial.Serial("/dev/cu.usbmodem113401", 115200, timeout=0.5)
end = time.time() + float(sys.argv[1])
with open(sys.argv[2], "wb") as f:
    while time.time() < end:
        f.write(s.read(4096)); f.flush()
