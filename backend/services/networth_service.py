import requests
from services.local_store import get_tokens_by_user
from services.plaid_service import get_accounts
from decimal import Decimal, ROUND_HALF_UP

def get_currency_decimal_places(currency):
    # Map of currencies to their standard decimal places
    decimal_places = {
        'JPY': 0,  # Japanese Yen
        'KRW': 0,  # Korean Won
        'BIF': 0,  # Burundian Franc
        'CLP': 0,  # Chilean Peso
        'DJF': 0,  # Djiboutian Franc
        'GNF': 0,  # Guinean Franc
        'ISK': 0,  # Icelandic Króna
        'KMF': 0,  # Comorian Franc
        'PYG': 0,  # Paraguayan Guaraní
        'RWF': 0,  # Rwandan Franc
        'UGX': 0,  # Ugandan Shilling
        'VND': 0,  # Vietnamese Dong
        'VUV': 0,  # Vanuatu Vatu
        'XAF': 0,  # Central African CFA Franc
        'XOF': 0,  # West African CFA Franc
        'XPF': 0,  # CFP Franc
    }
    return decimal_places.get(currency, 2)  # Default to 2 decimal places

def round_currency(amount, currency):
    decimal_places = get_currency_decimal_places(currency)
    return Decimal(str(amount)).quantize(
        Decimal('0.' + '0' * decimal_places),
        rounding=ROUND_HALF_UP
    )

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
    net_worth = {cur: Decimal('0') for cur in currency_list}
    by_currency = {cur: {} for cur in currency_list}
    for cur in currency_list:
        for group in all_accounts:
            for acc in group.get("accounts", []):
                bal = acc.get("balances", {}).get("current")
                acc_cur = acc.get("balances", {}).get("iso_currency_code")
                if bal is not None and acc_cur:
                    if acc_cur == cur:
                        converted = Decimal(str(bal))
                    else:
                        rate = exchange_rates[acc_cur].get(cur)
                        if rate:
                            converted = Decimal(str(bal)) * Decimal(str(rate))
                        else:
                            continue
                    # Round the converted amount according to the target currency's decimal places
                    converted = round_currency(converted, cur)
                    net_worth[cur] += converted
                    typ = acc.get("subtype") or acc.get("type") or "other"
                    by_currency[cur][typ] = by_currency[cur].get(typ, Decimal('0')) + converted
    # Convert Decimal objects to float for JSON serialization
    return {
        "net_worth": {k: float(v) for k, v in net_worth.items()},
        "by_currency": {k: {kk: float(vv) for kk, vv in v.items()} for k, v in by_currency.items()},
        "exchange_rates": exchange_rates,
        "accounts": all_accounts
    } 