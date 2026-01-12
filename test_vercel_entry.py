import os
import sys

# Simulate Vercel environment
root_dir = os.path.dirname(os.path.abspath(__file__))
# api/index.py logic
# Add root to sys.path
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

# Add backend_python to sys.path
backend_dir = os.path.join(root_dir, "backend_python")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

print(f"Changing CWD to {backend_dir}")
os.chdir(backend_dir)

print("Attempting to import app from main...")
try:
    from main import app
    print("Successfully imported app!")
except Exception as e:
    print(f"Failed to import app: {e}")
    import traceback
    traceback.print_exc()
