from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.plaid import router as plaid_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev, allow all. In prod, restrict this.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(plaid_router) 