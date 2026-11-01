#!/usr/bin/env python3
"""Incremental nationwide Overture Places -> isolated Cloudflare D1 directory.
Intentionally never touches wallet, identity, sponsorship, or checkout.
Public metadata only. Requires existing scoped GitHub Cloudflare API secret.
"""
import json
import os
import re
import subprocess
import sys
import tempfile
import unicodedata
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ACCOUNT = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN", "")
DB = "51bfedfd-15e0-4695-ab80-0416ff2ea133"
SOURCE = "Overture Maps Places"
LICENSE = "CDLA Permissive 2.0 / Apache 2.0"
SOURCE_URL = "https://docs.overturemaps.org/guides/places/"
MAX_PER_RUN = 400
# Public directory never imports restricted-age venues or unverifiable source licenses.
RESTRICTED = re.compile(r"cannabis|marijuana|dispensar|\bthc\b|hemp|vape|nicotine|tobacco|adult.?store|erotic|porn|sex.?shop|firearm|gun.?shop|weapon|liquor|smoke.?shop", re.I)
FOOD_MISMATCH = re.compile(r"\b(?:rent.to.own|rental.center|equipment.rental|car.rental)\b", re.I)
PERMITTED_LICENSES = {"CDLA-Permissive-2.0", "Apache-2.0", "CC0-1.0"}
LICENSE_ALIASES = {"CDLA Permissive 2.0": "CDLA-Permissive-2.0", "CC0": "CC0-1.0"}

def feature_licenses(sources):
    """Require explicit per-feature upstream licenses, never invent a blanket grant."""
    if not isinstance(sources, list) or not sources:
        return None
    found = set()
    for item in sources:
        if not isinstance(item, dict):
            return None
        license_name = LICENSE_ALIASES.get(item.get("license"), item.get("license"))
        if not isinstance(license_name, str) or license_name not in PERMITTED_LICENSES:
            return None
        found.add(license_name)
    return "; ".join(sorted(found))

STATES = dict(zip(
 "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(),
 "Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming".split("|")
))

def normalize(value):
    return re.sub(r"[^a-z0-9]+", "", unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode().lower())

def https_url(value):
    if isinstance(value, dict):
        value = value.get("value") or value.get("url") or ""
    if not isinstance(value, str):
        return ""
    parsed = urllib.parse.urlsplit(value.strip())
    return value.strip()[:500] if parsed.scheme == "https" and parsed.netloc and not parsed.username and not parsed.password else ""

def first_website(value):
    if isinstance(value, str):
        return https_url(value)
    if isinstance(value, list):
        for item in value:
            url = https_url(item)
            if url:
                return url
    return ""

def business_from_feature(feature, fallback_city, state):
    if not isinstance(feature, dict) or feature.get("type") != "Feature":
        return None
    p = feature.get("properties") or {}
    if p.get("operating_status") in ("permanently_closed", "closed_permanently"):
        return None
    source_id = str(p.get("id") or feature.get("id") or "").strip()
    names = p.get("names") or {}
    name = names.get("primary") if isinstance(names, dict) else ""
    if not source_id or not isinstance(name, str) or len(name.strip()) < 2:
        return None
    category_raw = str(p.get("basic_category") or "Business")
    if RESTRICTED.search(name + " " + category_raw):
        return None
    if ("restaurant" in category_raw.lower() or "food" in category_raw.lower()) and FOOD_MISMATCH.search(name):
        return None
    licenses = feature_licenses(p.get("sources"))
    if licenses is None:
        return None
    geometry = feature.get("geometry") or {}
    coords = geometry.get("coordinates") if geometry.get("type") == "Point" else None
    if not isinstance(coords, list) or len(coords) < 2:
        return None
    try:
        longitude, latitude = float(coords[0]), float(coords[1])
    except (ValueError, TypeError):
        return None
    if not (-180 <= longitude <= 180 and -90 <= latitude <= 90):
        return None
    addresses = p.get("addresses") or []
    address_data = addresses[0] if isinstance(addresses, list) and addresses and isinstance(addresses[0], dict) else {}
    city = str(address_data.get("locality") or fallback_city).strip()[:80]
    address = str(address_data.get("freeform") or "").strip()
    if not address:
        street = " ".join(str(address_data.get(key) or "").strip() for key in ("house_number", "street"))
        postcode = str(address_data.get("postcode") or "").strip()
        address = ", ".join(x for x in (street.strip(), city + ", " + state, postcode) if x and (x != ", "))
    category = str(p.get("basic_category") or "Business").replace("_", " ").strip()[:80].title()
    confidence = p.get("confidence")
    try:
        confidence = str(float(confidence)) if confidence is not None else ""
    except (ValueError, TypeError):
        confidence = ""
    return {
        "id": "overture:" + source_id, "source_id": source_id, "name": name.strip()[:180],
        "city": city or fallback_city, "state": state, "category": category or "Business",
        "address": address[:250], "latitude": str(latitude), "longitude": str(longitude),
        "website": first_website(p.get("websites")), "source_url": SOURCE_URL,
        "source_name": SOURCE, "source_license": licenses, "confidence": confidence,
        "attribution": "Overture Maps Foundation; provider licenses: https://docs.overturemaps.org/attribution/",
        "last_seen": datetime.now(timezone.utc).strftime("%Y-%m-%d")
    }

def parse_features(path):
    with open(path, encoding="utf-8") as stream:
        for line in stream:
            line = line.lstrip("\x1e").strip()
            if not line:
                continue
            obj = json.loads(line)
            if obj.get("type") == "FeatureCollection":
                yield from obj.get("features", [])
            else:
                yield obj

def api_query(sql, params=None, batch=None):
    if not (re.fullmatch(r"[a-f0-9]{32}", ACCOUNT) and len(TOKEN) >= 20):
        raise RuntimeError("Cloudflare API token/account not configured; no writes attempted")
    payload = {"batch": batch} if batch is not None else {"sql": sql, "params": [str(p) for p in (params or [])]}
    endpoint = "https://api.cloudflare.com/client/v4/accounts/" + ACCOUNT + "/d1/database/" + DB + "/query"
    request = urllib.request.Request(endpoint, json.dumps(payload).encode(), headers={
        "Authorization": "Bearer " + TOKEN, "Content-Type": "application/json",
        "User-Agent": "QuantaPhi-Directory-Continuity/1.0"
    }, method="POST")
    with urllib.request.urlopen(request, timeout=35) as response:
        out = json.load(response)
    if not out.get("success") or any(x.get("success") is False for x in out.get("result", [])):
        raise RuntimeError("Cloudflare D1 rejected a directory batch")
    return out.get("result", [])

def geocode(city, state):
    # Coordinates are verified against the expected US state before creating a small metro tile.
    query = urllib.parse.urlencode({"name": city, "count": 20, "countryCode": "US"})
    url = "https://geocoding-api.open-meteo.com/v1/search?" + query
    with urllib.request.urlopen(url, timeout=20) as response:
        rows = json.load(response).get("results") or []
    match = next((r for r in rows if normalize(r.get("name")) == normalize(city)
                  and normalize(r.get("admin1")) == normalize(STATES.get(state))), None)
    if not match:
        raise RuntimeError("No geocoder match for city/state; refusing to guess a location")
    lat, lon = float(match["latitude"]), float(match["longitude"])
    return f"{lon-0.09:.5f},{lat-0.07:.5f},{lon+0.09:.5f},{lat+0.07:.5f}"

def ingest_file(path, job, max_items=MAX_PER_RUN):
    seen = int(job.get("cursor") or 0)
    source_rows = api_query("SELECT name,address,city FROM businesses WHERE state=? AND city=? AND status='listed' LIMIT 5000",
                            [job["state"], job["city"]])[0].get("results", [])
    known = {(normalize(r.get("name")), normalize(r.get("address"))) for r in source_rows if r.get("address")}
    accepted, rejected, duplicates, examined = [], 0, 0, 0
    end_of_file = True
    for position, feature in enumerate(parse_features(path)):
        if position < seen:
            continue
        examined += 1
        business = business_from_feature(feature, job["city"], job["state"])
        if business is None:
            rejected += 1
        elif business["address"] and (normalize(business["name"]), normalize(business["address"])) in known:
            duplicates += 1
        else:
            accepted.append(business)
            if business["address"]:
                known.add((normalize(business["name"]), normalize(business["address"])))
        if examined >= max_items:
            end_of_file = False
            break
    # Never lose a successful chunk if the process fails midway; conflict-safe replays are intentional.
    columns = ["id","source_id","name","city","state","category","address","latitude","longitude",
               "website","source_url","source_name","source_license","confidence","attribution","last_seen"]
    placeholders = ",".join("?" for _ in columns)
    insert = ("INSERT INTO businesses (" + ",".join(columns) + ") VALUES (" + placeholders +
              ") ON CONFLICT(id) DO UPDATE SET name=excluded.name,category=excluded.category,"
              "website=excluded.website,source_license=excluded.source_license,"
              "last_seen=excluded.last_seen,updated_at=CURRENT_TIMESTAMP WHERE businesses.claimed=0")
    for i in range(0, len(accepted), 50):
        chunk = accepted[i:i+50]
        api_query("", batch=[{"sql": insert, "params": [str(row[col]) for col in columns]} for row in chunk])
    cursor = seen + examined
    status = "complete" if end_of_file else "queued"
    now = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    receipt_id = job["job_id"] + ":" + now + ":" + str(cursor)
    api_query("INSERT OR IGNORE INTO business_ingest_receipts(receipt_id,source,dataset_version,city,state,inspected,accepted,duplicates,rejected,job_id) VALUES(?,?,?,?,?,?,?,?,?,?)",
              [receipt_id,SOURCE,"STAC latest",job["city"],job["state"],str(examined),str(len(accepted)),
               str(duplicates),str(rejected),job["job_id"]])
    api_query("UPDATE city_import_jobs SET cursor=?,imported=imported+?,status=?,phase=?,source=?,dataset_version=?,updated_at=CURRENT_TIMESTAMP WHERE job_id=?",
              [str(cursor),str(len(accepted)),status,"expand" if end_of_file else "import",SOURCE,"STAC latest",job["job_id"]])
    print(json.dumps({"job_id":job["job_id"],"inspected":examined,"accepted":len(accepted),
                      "duplicates":duplicates,"rejected":rejected,"cursor":cursor,"tile_complete":end_of_file}))
    return len(accepted)

def main():
    rows = api_query("SELECT job_id,city,state,priority,status,bbox,cursor FROM city_import_jobs WHERE status='queued' ORDER BY priority ASC,imported ASC,updated_at ASC LIMIT 1")[0].get("results", [])
    if not rows:
        print("All existing metro tiles have completed their current import pass.")
        return
    job = rows[0]
    bbox = job.get("bbox") or geocode(job["city"], job["state"])
    if not re.fullmatch(r"-?\d{1,3}(?:\.\d+)?,-?\d{1,2}(?:\.\d+)?,-?\d{1,3}(?:\.\d+)?,-?\d{1,2}(?:\.\d+)?",bbox):
        raise RuntimeError("Invalid geographic bounding box")
    if not job.get("bbox"):
        api_query("UPDATE city_import_jobs SET bbox=?,updated_at=CURRENT_TIMESTAMP WHERE job_id=?", [bbox,job["job_id"]])
    with tempfile.TemporaryDirectory() as tmp:
        output = str(Path(tmp)/"places.geojsonseq")
        subprocess.run(["overturemaps","download","--bbox="+bbox,"-f","geojsonseq",
                        "--type=place","-o",output],check=True,timeout=1300)
        ingest_file(output,job)
if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("Business directory ingestion blocked: " + str(e), file=sys.stderr)
        sys.exit(1)
