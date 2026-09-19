import time
import random
import uuid
import datetime
import requests
import argparse

BACKEND_URL = "http://localhost:8080/api"

def login(username="analyst1", password="StrongPass123!"):
    url = f"{BACKEND_URL}/auth/login"
    payload = {"username": username, "password": password}
    try:
        resp = requests.post(url, json=payload, timeout=5)
        if resp.status_code == 200:
            token = resp.json().get("token")
            print(f"[AUTH] Logged in as {username}. Token acquired.")
            return token
        else:
            print(f"[AUTH] Login failed: {resp.status_code} - {resp.text}")
            return None
    except Exception as e:
        print(f"[AUTH] Error connecting to backend: {e}")
        return None

def generate_transaction(is_fraud=False):
    tx_ref = f"TXN-{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"
    account_id = f"ACC-{random.randint(100, 150):05d}"
    
    categories = ["electronics", "grocery", "apparel", "dining", "travel", "entertainment", "utility"]
    category = random.choice(categories)

    if is_fraud:
        # High amount, anomalous PCA vectors
        amount = round(random.uniform(1200.0, 5000.0), 2)
        raw_features = {
            "v1": round(random.uniform(-4.5, -2.0), 4),
            "v2": round(random.uniform(2.5, 5.0), 4),
            "v3": round(random.uniform(-3.0, -1.5), 4),
            "v4": round(random.uniform(2.0, 4.0), 4),
            "v11": round(random.uniform(2.0, 3.8), 4),
            "v14": round(random.uniform(-5.0, -2.5), 4)
        }
    else:
        # Normal amount
        amount = round(random.uniform(8.50, 250.0), 2)
        raw_features = {
            "v1": round(random.gauss(0.0, 1.0), 4),
            "v2": round(random.gauss(0.0, 1.0), 4),
            "v3": round(random.gauss(0.0, 1.0), 4),
            "v4": round(random.gauss(0.0, 1.0), 4),
            "v11": round(random.gauss(0.0, 1.0), 4),
            "v14": round(random.gauss(0.0, 1.0), 4)
        }

    return {
        "transactionRef": tx_ref,
        "accountId": account_id,
        "amount": amount,
        "merchantCategory": category,
        "transactionTime": datetime.datetime.utcnow().isoformat() + "Z",
        "rawFeatures": raw_features
    }

def simulate(n_tx=20, delay_sec=1.0, fraud_ratio=0.15):
    token = login()
    if not token:
        print("[ERROR] Cannot run simulation without valid auth token.")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    print(f"[SIMULATOR] Starting stream of {n_tx} transactions (fraud ratio: {fraud_ratio*100}%)...")
    for i in range(1, n_tx + 1):
        is_fraud = (random.random() < fraud_ratio)
        payload = generate_transaction(is_fraud=is_fraud)
        
        try:
            resp = requests.post(f"{BACKEND_URL}/transactions", json=payload, headers=headers, timeout=5)
            if resp.status_code == 201:
                res = resp.json()
                print(f"[{i}/{n_tx}] Ref: {res['transactionRef']} | Amt: ${payload['amount']} | Prob: {res['fraudProbability']:.4f} | Tier: {res['riskTier']}")
            else:
                print(f"[{i}/{n_tx}] Error {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"[{i}/{n_tx}] Request failed: {e}")

        if delay_sec > 0:
            time.sleep(delay_sec)

    print("[SIMULATOR] Simulation completed.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Transaction Stream Simulator")
    parser.add_argument("--count", type=int, default=20, help="Number of transactions to generate")
    parser.add_argument("--delay", type=float, default=0.5, help="Delay between transactions in seconds")
    parser.add_argument("--fraud-ratio", type=float, default=0.15, help="Fraction of transactions that are fraudulent")
    args = parser.parse_args()

    simulate(n_tx=args.count, delay_sec=args.delay, fraud_ratio=args.fraud_ratio)
