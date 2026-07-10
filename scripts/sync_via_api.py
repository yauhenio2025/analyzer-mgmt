#!/usr/bin/env python3
"""Sync stage_context from analyzer-v2 to analyzer-mgmt via API."""
import json
import httpx

V2_URL = "https://analyzer-v2.onrender.com"
MGMT_URL = "https://analyzer-mgmt-api.onrender.com/api"

def main():
    print("Fetching engines from analyzer-v2...")
    resp = httpx.get(f"{V2_URL}/v1/engines", timeout=60)
    v2_engines = resp.json()
    print(f"Found {len(v2_engines)} engines in v2")
    
    # Fetch mgmt engines to build lookup
    print("Fetching engines from analyzer-mgmt...")
    mgmt_resp = httpx.get(f"{MGMT_URL}/engines?limit=200", timeout=60)
    mgmt_data = mgmt_resp.json()
    mgmt_engines = {e["engine_key"]: e for e in mgmt_data.get("engines", [])}
    print(f"Found {len(mgmt_engines)} engines in mgmt")
    
    updated = 0
    skipped = 0
    not_in_mgmt = 0
    errors = 0
    
    for i, e in enumerate(v2_engines):
        key = e["engine_key"]
        
        if key not in mgmt_engines:
            not_in_mgmt += 1
            continue
            
        try:
            # Fetch full detail from v2
            v2_detail = httpx.get(f"{V2_URL}/v1/engines/{key}", timeout=30).json()
            stage_ctx = v2_detail.get("stage_context")
            
            if not stage_ctx:
                skipped += 1
                continue
            
            # Update via mgmt API
            update_resp = httpx.put(
                f"{MGMT_URL}/engines/{key}",
                json={"stage_context": stage_ctx},
                timeout=30
            )
            
            if update_resp.status_code == 200:
                updated += 1
            else:
                print(f"  {key}: HTTP {update_resp.status_code}")
                errors += 1
                
        except Exception as ex:
            print(f"  Error with {key}: {ex}")
            errors += 1
        
        if (i + 1) % 20 == 0:
            print(f"  Processed {i+1}/{len(v2_engines)} (updated: {updated})")
    
    print(f"\nSync complete:")
    print(f"  Updated: {updated}")
    print(f"  Skipped (no ctx): {skipped}")
    print(f"  Not in mgmt: {not_in_mgmt}")
    print(f"  Errors: {errors}")

if __name__ == "__main__":
    main()
