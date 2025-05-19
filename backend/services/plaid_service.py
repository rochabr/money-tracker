from plaid_client import get_plaid_client
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.country_code import CountryCode
from plaid.model.products import Products
from plaid.exceptions import ApiException
from services.local_store import save_token
from plaid.model.investments_holdings_get_request import InvestmentsHoldingsGetRequest

def create_link_token(user_id: str):
    client = get_plaid_client()
    try:
        request = LinkTokenCreateRequest(
            user=LinkTokenCreateRequestUser(client_user_id=user_id),
            client_name="Money Tracker",
            products=[Products('auth'), Products('transactions'), Products('investments'), Products('liabilities')],
            country_codes=[CountryCode('US'), CountryCode('CA')],
            language="en"
        )
        response = client.link_token_create(request)
        return response["link_token"]
    except ApiException as e:
        raise Exception(str(e))

def exchange_token(public_token: str, user_id: str, institution: str = None, institution_id: str = None):
    client = get_plaid_client()
    try:
        exchange_request = ItemPublicTokenExchangeRequest(public_token=public_token)
        response = client.item_public_token_exchange(exchange_request)
        data = response.to_dict()
        access_token = data["access_token"]
        item_id = data["item_id"]
        save_token(user_id, item_id, access_token, institution, institution_id)
        return {"access_token": access_token, "item_id": item_id}
    except ApiException as e:
        raise Exception(str(e))

def get_accounts(access_token: str):
    client = get_plaid_client()
    try:
        accounts_request = AccountsGetRequest(access_token=access_token)
        response = client.accounts_get(accounts_request)
        data = response.to_dict()
        return data["accounts"]
    except ApiException as e:
        raise Exception(str(e))

def get_holdings(access_token: str):
    client = get_plaid_client()
    try:
        holdings_request = InvestmentsHoldingsGetRequest(access_token=access_token)
        response = client.investments_holdings_get(holdings_request)
        data = response.to_dict()
        return data
    except ApiException as e:
        raise Exception(str(e)) 