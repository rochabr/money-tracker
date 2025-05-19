# Money Tracker

A Python FastAPI backend to aggregate your financial data from multiple banks and investment accounts using Plaid. Supports multi-currency net worth calculation and is ready for OpenAI integration.

## Features
- Connect multiple banks and investment accounts via Plaid
- Fetch account balances, credit card balances, and investment holdings
- Aggregate net worth in all available currencies (with real-time exchange rates)
- Local token storage (easy to swap for a real database)
- Modular, production-ready code structure

## Setup

1. **Clone the repo and install dependencies:**
   ```bash
   git clone <your-repo-url>
   cd money-tracker
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Configure Plaid credentials:**
   - Create a `.env` file in the project root:
     ```
     PLAID_CLIENT_ID=your_client_id
     PLAID_SECRET=your_secret
     PLAID_ENV=sandbox
     ```

3. **Run the FastAPI server:**
   ```bash
   uvicorn main:app --reload
   ```

4. **Open the API docs:**
   - Visit [http://localhost:8000/docs](http://localhost:8000/docs)

5. **Test the Plaid Link frontend:**
   - Open `plaid-link.html` in your browser and follow the flow.

## Key Endpoints

- `POST /plaid/create_link_token?user_id=...` — Get a Plaid Link token
- `POST /plaid/exchange_token?user_id=...` — Exchange public_token for access_token (and save it)
- `GET /plaid/user/accounts?user_id=...` — Get all accounts for a user
- `GET /plaid/user/networth?user_id=...` — Get net worth in all currencies
- `GET /plaid/user/holdings?user_id=...` — Get investment holdings

## Project Structure
```
.
├── main.py
├── requirements.txt
├── .env
├── .gitignore
├── README.md
├── plaid-link.html
├── routers/
│   └── plaid.py
├── services/
│   ├── plaid_service.py
│   ├── networth_service.py
│   ├── local_store.py
├── models/
│   └── plaid_models.py
└── plaid_client.py
```

## Notes
- All tokens are stored locally in `plaid_tokens.json` for development. Swap this for a real database in production.
- Exchange rates are fetched from [exchangerate.host](https://exchangerate.host/).
- Sandbox credentials and test banks are supported for development.

## License
MIT 