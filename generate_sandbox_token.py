from plaid_client import get_plaid_client
from plaid.model.sandbox_public_token_create_request import SandboxPublicTokenCreateRequest
from plaid.model.products import Products

client = get_plaid_client()
request = SandboxPublicTokenCreateRequest(
    institution_id="ins_3",  # e.g., 'ins_3' is for 'Chase' in sandbox
    initial_products=[Products('auth'), Products('transactions')]
)
response = client.sandbox_public_token_create(request)
print(response['public_token'])