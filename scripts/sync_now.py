#!/usr/bin/env python3
"""Quick sync script to populate stage_context from analyzer-v2."""
import json
import httpx

V2_URL = "https://analyzer-v2.onrender.com"

def main():
    # Fetch all engines
    print("Fetching engines list from analyzer-v2...")
    resp = httpx.get(f"{V2_URL}/v1/engines", timeout=60)
    data = resp.json()
    engines_list = data.get("items", data) if isinstance(data, dict) else data
    print(f"Found {len(engines_list)} engines")
    
    # Fetch full details for ALL engines and check for stage_context
    sql_statements = []
    count_with_ctx = 0
    
    for i, e in enumerate(engines_list):
        key = e["engine_key"]
        try:
            detail = httpx.get(f"{V2_URL}/v1/engines/{key}", timeout=30).json()
            if detail.get("stage_context"):
                count_with_ctx += 1
                ctx_json = json.dumps(detail["stage_context"]).replace("'", "''")
                sql = f"UPDATE engines SET stage_context = '{ctx_json}' WHERE engine_key = '{key}';"
                sql_statements.append(sql)
        except Exception as ex:
            print(f"  Error fetching {key}: {ex}")
        
        if (i + 1) % 20 == 0:
            print(f"  Processed {i+1}/{len(engines_list)} ({count_with_ctx} with stage_context)")
    
    # Write SQL file
    with open("scripts/stage_context_updates.sql", "w") as f:
        f.write("-- Stage context updates from analyzer-v2\n")
        f.write(f"-- Generated for {len(sql_statements)} engines\n\n")
        for sql in sql_statements:
            f.write(sql + "\n")
    
    print(f"\nGenerated {len(sql_statements)} UPDATE statements")
    print("SQL file: scripts/stage_context_updates.sql")

if __name__ == "__main__":
    main()
