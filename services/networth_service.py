import requests
from services.local_store import get_tokens_by_user
from services.plaid_service import get_accounts

def get_exchange_rates(base_currency, symbols):
    url = f"https://api.exchangerate.host/latest?base={base_currency}&symbols={','.join(symbols)}"
    response = requests.get(url)
    data = response.json()
    return data.get("rates", {})


def calculate_user_networth(user_id: str):
    tokens = get_tokens_by_user(user_id)
    if not tokens:
        return {"net_worth": {}, "accounts": []}
    all_accounts = []
    currency_set = set()
    for token in tokens:
        try:
            accounts = get_accounts(token["access_token"])
            for acc in accounts:
                if acc.get("balances", {}).get("iso_currency_code"):
                    currency_set.add(acc["balances"]["iso_currency_code"])
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
    currency_list = list(currency_set)
    exchange_rates = {}
    for base in currency_list:
        exchange_rates[base] = get_exchange_rates(base, currency_list)
    net_worth = {cur: 0.0 for cur in currency_list}
    by_currency = {cur: {} for cur in currency_list}
    for cur in currency_list:
        for group in all_accounts:
            for acc in group.get("accounts", []):
                bal = acc.get("balances", {}).get("current")
                acc_cur = acc.get("balances", {}).get("iso_currency_code")
                if bal is not None and acc_cur:
                    if acc_cur == cur:
                        converted = bal
                    else:
                        rate = exchange_rates[acc_cur].get(cur)
                        if rate:
                            converted = bal * rate
                        else:
                            continue
                    net_worth[cur] += converted
                    typ = acc.get("subtype") or acc.get("type") or "other"
                    by_currency[cur][typ] = by_currency[cur].get(typ, 0.0) + converted
    return {
        "net_worth": net_worth,
        "by_currency": by_currency,
        "exchange_rates": exchange_rates,
        "accounts": all_accounts
    } 