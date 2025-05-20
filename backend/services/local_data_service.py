import json
import os
from datetime import datetime
from typing import Dict, Optional

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
ACCOUNTS_FILE = os.path.join(DATA_DIR, "accounts.json")
HOLDINGS_FILE = os.path.join(DATA_DIR, "holdings.json")

def ensure_data_dir():
    """Ensure the data directory exists"""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

def save_accounts_data(user_id: str, accounts_data: Dict) -> bool:
    """Save accounts data for a user"""
    try:
        ensure_data_dir()
        
        # Load existing data if any
        if os.path.exists(ACCOUNTS_FILE):
            with open(ACCOUNTS_FILE, 'r') as f:
                all_data = json.load(f)
        else:
            all_data = {}
        
        # Update data for this user
        all_data[user_id] = {
            "accounts": accounts_data,
            "last_updated": datetime.now().isoformat()
        }
        
        # Save back to file
        with open(ACCOUNTS_FILE, 'w') as f:
            json.dump(all_data, f, indent=2)
            
        return True
    except Exception as e:
        print(f"Error saving accounts data: {e}")
        return False

def load_accounts_data(user_id: str) -> Optional[Dict]:
    """Load accounts data for a user"""
    try:
        if not os.path.exists(ACCOUNTS_FILE):
            return None
            
        with open(ACCOUNTS_FILE, 'r') as f:
            all_data = json.load(f)
            
        return all_data.get(user_id)
    except Exception as e:
        print(f"Error loading accounts data: {e}")
        return None

def save_holdings_data(user_id: str, holdings_data: Dict) -> bool:
    """Save holdings data for a user"""
    try:
        ensure_data_dir()
        
        # Load existing data if any
        if os.path.exists(HOLDINGS_FILE):
            with open(HOLDINGS_FILE, 'r') as f:
                all_data = json.load(f)
        else:
            all_data = {}
        
        # Update data for this user
        all_data[user_id] = {
            "holdings": holdings_data,
            "last_updated": datetime.now().isoformat()
        }
        
        # Save back to file
        with open(HOLDINGS_FILE, 'w') as f:
            json.dump(all_data, f, indent=2)
            
        return True
    except Exception as e:
        print(f"Error saving holdings data: {e}")
        return False

def load_holdings_data(user_id: str) -> Optional[Dict]:
    """Load holdings data for a user"""
    try:
        if not os.path.exists(HOLDINGS_FILE):
            return None
            
        with open(HOLDINGS_FILE, 'r') as f:
            all_data = json.load(f)
            
        return all_data.get(user_id)
    except Exception as e:
        print(f"Error loading holdings data: {e}")
        return None 