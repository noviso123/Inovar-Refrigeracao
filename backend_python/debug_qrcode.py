import qrcode
import os
import qrcode.image

print(f"qrcode file: {qrcode.__file__}")
print(f"qrcode dir: {os.path.dirname(qrcode.__file__)}")

def list_files(startpath):
    for root, dirs, files in os.walk(startpath):
        level = root.replace(startpath, '').count(os.sep)
        indent = ' ' * 4 * (level)
        print('{}{}/'.format(indent, os.path.basename(root)))
        subindent = ' ' * 4 * (level + 1)
        for f in files:
            print('{}{}'.format(subindent, f))

list_files(os.path.dirname(qrcode.__file__))

try:
    from qrcode.image.styled import StyledPilImage
    print("SUCCESS: Imported StyledPilImage")
except ImportError as e:
    print(f"FAILURE: {e}")
except Exception as e:
    print(f"ERROR: {e}")
