import requests
import tarfile
import io
import os

def install_cli():
    url = "https://github.com/supabase/cli/releases/download/v2.67.1/supabase_windows_amd64.tar.gz"
    print(f"Downloading {url}...")
    try:
        response = requests.get(url, stream=True, verify=False)
        response.raise_for_status()

        print("Extracting...")
        with tarfile.open(fileobj=io.BytesIO(response.content), mode="r:gz") as tar:
            tar.extractall(path=".")

        print("✅ Supabase CLI installed successfully!")

        # Verify check
        if os.path.exists("supabase.exe"):
             print("Found supabase.exe in root.")
        elif os.path.exists("supabase_windows_amd64/supabase.exe"):
             print("Found supabase.exe in subdir.")
             # Move to root
             os.rename("supabase_windows_amd64/supabase.exe", "supabase.exe")
             print("Moved to root.")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    install_cli()
