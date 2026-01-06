import requests
import json

VERCEL_TOKEN = "eBHFHqWoM7RAl05EOS3mlKul"
GITHUB_REPO = "noviso123/Inovar-Refrigeracao"
GITHUB_BRANCH = "main"
RENDER_BACKEND_URL = "https://inovar-refrigeracao.onrender.com"

headers = {
    "Authorization": f"Bearer {VERCEL_TOKEN}",
    "Content-Type": "application/json"
}

# 1. List existing projects
print("📋 Checking existing Vercel projects...")
r = requests.get("https://api.vercel.com/v9/projects", headers=headers, verify=False)
if r.status_code == 200:
    projects = r.json().get("projects", [])
    for p in projects:
        print(f"   - {p['name']}: {p.get('link', {}).get('productionBranch', 'N/A')}")
else:
    print(f"Error listing projects: {r.status_code} - {r.text}")

# 2. Create project if needed
print("\n🚀 Creating/Updating Vercel project for frontend...")

project_data = {
    "name": "inovar-refrigeracao-frontend",
    "framework": "vite",
    "gitRepository": {
        "repo": GITHUB_REPO,
        "type": "github"
    },
    "rootDirectory": "frontend",
    "buildCommand": "npm run build",
    "outputDirectory": "dist",
    "environmentVariables": [
        {
            "key": "VITE_API_URL",
            "value": f"{RENDER_BACKEND_URL}/api",
            "target": ["production", "preview"]
        }
    ]
}

r = requests.post("https://api.vercel.com/v10/projects", headers=headers, json=project_data, verify=False)
if r.status_code in [200, 201]:
    project = r.json()
    print(f"✅ Project created/exists: {project.get('name')}")
    print(f"   ID: {project.get('id')}")
elif r.status_code == 409:
    print("ℹ️ Project already exists, checking deployments...")
else:
    print(f"❌ Error: {r.status_code} - {r.text}")

# 3. Trigger deployment
print("\n🔄 Triggering deployment...")
deploy_data = {
    "name": "inovar-refrigeracao-frontend",
    "gitSource": {
        "type": "github",
        "repoId": GITHUB_REPO,
        "ref": GITHUB_BRANCH
    }
}
r = requests.post("https://api.vercel.com/v13/deployments", headers=headers, json=deploy_data, verify=False)
if r.status_code in [200, 201]:
    deploy = r.json()
    print(f"✅ Deployment triggered!")
    print(f"   URL: {deploy.get('url')}")
else:
    print(f"Note: {r.status_code} - Direct deploy may need GitHub integration")
    print("   Please connect the repo manually in Vercel dashboard")
