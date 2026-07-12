import os

import firebase_admin
from firebase_admin import credentials, firestore

_SERVICE_ACCOUNT_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "./serviceAccountKey.json")

if not firebase_admin._apps:
    cred = credentials.Certificate(_SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)

db = firestore.client()
