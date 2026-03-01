import json
import urllib.request
import urllib.parse

BASE = "http://127.0.0.1:8000/api/v1"

def post_json(path, data):
    url = f"{BASE}{path}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        return resp.read().decode("utf-8")

def post_form(path, data):
    url = f"{BASE}{path}"
    body = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        return resp.read().decode("utf-8")

def get(path):
    url = f"{BASE}{path}"
    with urllib.request.urlopen(url) as resp:
        return resp.read().decode("utf-8")

if __name__ == "__main__":
    print("Health:", get("/"))
    print("Register:", post_json("/auth/register", {
        "name": "Test User",
        "email": "candidate.auto@example.com",
        "password": "Passw0rd!",
        "role": "candidate"
    }))
    print("Login:", post_form("/auth/login", {
        "username": "candidate.auto@example.com",
        "password": "Passw0rd!"
    }))
    # Admin creates an HR user
    admin_login = json.loads(post_form("/auth/login", {
        "username": "admin@ats.local",
        "password": "Admin@12345"
    }))
    admin_token = admin_login["access_token"]
    url = f"{BASE}/users/"
    req = urllib.request.Request(
        url,
        data=json.dumps({
            "name": "Team Lead Auto",
            "email": "teamlead.auto@example.com",
            "password": "Passw0rd!",
            "role": "team_lead"
        }).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {admin_token}"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        print("Admin created user:", resp.read().decode("utf-8"))
