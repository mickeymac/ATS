import json
import urllib.request
import urllib.parse
import uuid

BASE = "http://127.0.0.1:8000/api/v1"

def post_json(path, data, headers=None):
    url = f"{BASE}{path}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json", **(headers or {})},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print("HTTPError", e.code, body)
        raise

def post_form(path, data, headers=None):
    url = f"{BASE}{path}"
    body = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded", **(headers or {})},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def get(path, headers=None):
    url = f"{BASE}{path}"
    req = urllib.request.Request(url, headers=headers or {}, method="GET")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

if __name__ == "__main__":
    print("Health:", get("/"))
    # Admin login
    admin_login = post_form("/auth/login", {"username": "admin@ats.local", "password": "Admin@12345"})
    admin_token = admin_login["access_token"]
    print("Admin login OK")
    # Register HR user (unique email)
    suffix = str(uuid.uuid4())[:8]
    hr_email = f"hr.auto.{suffix}@example.com"
    registered = post_json(
        "/auth/register",
        {"name": "HR Auto", "email": hr_email, "password": "Passw0rd!", "role": "hr"},
    )
    print("Registered HR user:", hr_email)
    # HR login
    hr_login = post_form("/auth/login", {"username": hr_email, "password": "Passw0rd!"})
    hr_token = hr_login["access_token"]
    print("HR login OK")
    # Create Job
    job = post_json(
        "/jobs/",
        {
            "title": "Backend Engineer",
            "description": "Build APIs with FastAPI and MongoDB",
            "required_skills": ["FastAPI", "MongoDB", "Python"],
            "experience_required": 3
        },
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    print("Created Job:", job["title"], job["_id"])
    # Admin creates another user
    created_user = post_json(
        "/users/",
        {"name": "HR Auto 2", "email": f"hr.auto2.{suffix}@example.com", "password": "Passw0rd!", "role": "hr"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    print("Admin created user:", created_user["email"])
