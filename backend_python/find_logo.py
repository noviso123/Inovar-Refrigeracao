import os
import asyncio
from dotenv import load_dotenv
import httpx

async def find_logo():
    url = "https://apntpretjodygczbeozk.supabase.co"
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbnRwcmV0am9keWdjemJlb3prIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY5MjMwNCwiZXhwIjoyMDgzMjY4MzA0fQ.XpjvDK7-FUy4Rw5mmWs781vGvylKg83Nsj69v_KS4uw"
    headers = {"Authorization": f"Bearer {key}", "apikey": key}

    # Try common names in ALL buckets
    buckets = ['arquivos-sistema', 'avatars', 'signatures', 'os-photos', 'public', 'branding']

    async with httpx.AsyncClient(verify=False) as client:
        # First, try to list all WITH recursive (some Supabase CLI versions or direct API calls might need prefixing)
        for b in buckets:
            print(f"Searching in {b}...")
            # Supabase Storage list objects doesn't have recursive, we must crawl
            # But let's try to just find if 'logo.png' exists by hitting it directly
            test_names = ['logo.png', 'logo.jpg', 'logo_inovar.png', 'brand/logo.png', 'public/logo.png']
            for name in test_names:
                url_test = f"{url}/storage/v1/object/public/{b}/{name}"
                resp = await client.head(url_test)
                if resp.status_code == 200:
                    print(f"FOUND LOGO: {url_test}")
                    return

if __name__ == "__main__":
    asyncio.run(find_logo())
