from fastapi import APIRouter, Query, HTTPException
from services.plaid_service import create_link_token, exchange_token, get_accounts, get_holdings
from models.plaid_models import CreateLinkTokenResponse, TokenExchangeRequest, TokenExchangeResponse, AccessTokenRequest
from services.local_store import get_tokens_by_user
from services.local_data_service import load_accounts_data, load_holdings_data, save_accounts_data, save_holdings_data
import requests
from services.networth_service import calculate_user_networth
from typing import Optional, Dict, Any

router = APIRouter(prefix="/plaid", tags=["Plaid"])

@router.post("/create_link_token", response_model=CreateLinkTokenResponse)
def create_link_token_endpoint(user_id: str = Query(...)):
    link_token = create_link_token(user_id)
    return CreateLinkTokenResponse(link_token=link_token)

@router.post("/exchange_token", response_model=TokenExchangeResponse)
def exchange_token_endpoint(request: TokenExchangeRequest, user_id: str = Query(...)):
    try:
        result = exchange_token(request.public_token, user_id, request.institution, request.institution_id)
        return TokenExchangeResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/accounts")
def get_accounts_endpoint(request: AccessTokenRequest):
    try:
        accounts = get_accounts(request.access_token)
        return accounts
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/user/accounts")
def get_user_accounts(user_id: str = Query(...)):
    tokens = get_tokens_by_user(user_id)
    if not tokens:
        return {"accounts": []}
    all_accounts = []
    for token in tokens:
        try:
            accounts = get_accounts(token["access_token"])
            all_accounts.append({
                "institution": token["institution"],
                "institution_id": token.get("institution_id"),
                "accounts": accounts
            })
        except Exception as e:
            all_accounts.append({
                "institution": token["institution"],
                "institution_id": token.get("institution_id"),
                "error": str(e)
            })
    return {"accounts": all_accounts}

def get_exchange_rates(base_currency, symbols):
    # Using exchangerate.host (free, no API key required)
    url = f"https://api.exchangerate.host/latest?base={base_currency}&symbols={','.join(symbols)}"
    response = requests.get(url)
    data = response.json()
    return data.get("rates", {})

@router.get("/user/networth")
def get_user_networth(user_id: str = Query(...)):
    try:
        net_worth_data = calculate_user_networth(user_id)
        
        # Save accounts data locally
        if net_worth_data.get("accounts"):
            save_accounts_data(user_id, net_worth_data["accounts"])
        
        return net_worth_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/holdings")
def get_user_holdings(user_id: str = Query(...)):
    tokens = get_tokens_by_user(user_id)
    if not tokens:
        return {"holdings": []}
    all_holdings = []
    for token in tokens:
        try:
            holdings = get_holdings(token["access_token"])
            all_holdings.append({
                "institution": token["institution"],
                "institution_id": token.get("institution_id"),
                "holdings": holdings
            })
        except Exception as e:
            all_holdings.append({
                "institution": token["institution"],
                "institution_id": token.get("institution_id"),
                "error": str(e)
            })
    
    # Save holdings data locally
    if all_holdings:
        save_holdings_data(user_id, {"holdings": all_holdings})
    
    return {"holdings": all_holdings}

@router.get("/check_access_token")
def check_access_token(user_id: str = Query(...)):
    tokens = get_tokens_by_user(user_id)
    if not tokens:
        return {
            "has_access_token": False,
            "institution_name": None
        }
    
    # Return the first institution's name since we're showing a single login status
    return {
        "has_access_token": True,
        "institution_name": tokens[0]["institution"]
    }

@router.get("/user/saved-data")
def get_saved_data(user_id: str = Query(...)):
    """Get saved accounts and holdings data for a user"""
    try:
        # Load saved accounts data
        accounts_data = load_accounts_data(user_id)
        
        # Load saved holdings data
        holdings_data = load_holdings_data(user_id)
        
        # Return empty data if no saved data exists
        if not accounts_data and not holdings_data:
            return {
                'accounts': None,
                'holdings': None,
                'last_updated': None
            }
        
        return {
            'accounts': accounts_data.get('accounts') if accounts_data else None,
            'holdings': holdings_data.get('holdings') if holdings_data else None,
            'last_updated': accounts_data.get('last_updated') if accounts_data else holdings_data.get('last_updated')
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 