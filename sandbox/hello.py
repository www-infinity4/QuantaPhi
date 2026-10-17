# Bubbles Linux sandbox example (no installation needed)
import os, platform, sys
print("Bubbles Coder sandbox: Python ready")
print("Python:", sys.version.split()[0])
print("Platform:", platform.system(), platform.machine())
print("Commit:", os.environ.get("GITHUB_SHA", "unknown"))
