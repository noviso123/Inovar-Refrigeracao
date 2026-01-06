import requests

url = "https://api-inovar.cloudflareaccess.com/"
headers = {
    "CF-Access-Client-Id": "34c4974ca47c0929b57aaa28300ae42c.access",
    "CF-Access-Client-Secret": "f03f4fc617c8046446144565f521283ecb2db348158250c1aa406f2eb1bc276a"
}

try:
    print(f"Testing connection to {url}...")
    response = requests.get(url, headers=headers, timeout=10)
    print(f"Status Code: {response.status_code}")
    print("Response Body:")
    print(response.text)
except Exception as e:
    print(f"Error: {e}")
