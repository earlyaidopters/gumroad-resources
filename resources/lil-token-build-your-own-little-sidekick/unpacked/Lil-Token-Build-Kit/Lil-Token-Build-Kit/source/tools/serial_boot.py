import serial, sys, time
s = serial.Serial("/dev/cu.usbmodem113401", 115200, timeout=0.3)
s.dtr = False; s.rts = True; time.sleep(0.2); s.rts = False  # hard reset via RTS
end = time.time() + float(sys.argv[1])
with open(sys.argv[2], "wb") as f:
    while time.time() < end:
        f.write(s.read(4096)); f.flush()
