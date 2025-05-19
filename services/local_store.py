import json
import os
from datetime import datetime

STORE_FILE = "plaid_tokens.json"

def _load_store():
    if not os.path.exists(STORE_FILE):
        return []
    with open(STORE_FILE, "r") as f:
        return json.load(f)

def _save_store(data):
    with open(STORE_FILE, "w") as f:
        json.dump(data, f, indent=2)

def save_token(user_id, item_id, access_token, institution=None, institution_id=None):
    data = _load_store()
    entry = {
        "user_id": user_id,
        "item_id": item_id,
        "access_token": access_token,
        "institution": institution,
        "institution_id": institution_id,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    data.append(entry)
    _save_store(data)


def get_tokens_by_user(user_id):
    data = _load_store()
    return [entry for entry in data if entry["user_id"] == user_id] 