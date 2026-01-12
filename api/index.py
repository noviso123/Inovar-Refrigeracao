import os
import sys

# Add the root directory to sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

# Add backend_python to sys.path
backend_dir = os.path.join(root_dir, "backend_python")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Change working directory to backend_python to ensure relative imports and file access work
os.chdir(backend_dir)

# Import the app from main.py
try:
    from main import app
except ImportError as e:
    print(f"ImportError: {e}")
    print(f"sys.path: {sys.path}")
    print(f"Current directory: {os.getcwd()}")
    print(f"Directory contents: {os.listdir('.')}")
    raise
