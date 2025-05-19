import os
from plaid.api import plaid_api
from plaid.model import country_code, products
from plaid import Configuration, ApiClient
from dotenv import load_dotenv

load_dotenv()

PLAID_CLIENT_ID = os.getenv("PLAID_CLIENT_ID")
PLAID_SECRET = os.getenv("PLAID_SECRET")
PLAID_ENV = os.getenv("PLAID_ENV", "sandbox")


def get_plaid_client():
    configuration = Configuration(
        host=f"https://{PLAID_ENV}.plaid.com",
        api_key={
            'clientId': PLAID_CLIENT_ID,
            'secret': PLAID_SECRET
        }
    )
    api_client = ApiClient(configuration)
    return plaid_api.PlaidApi(api_client) 