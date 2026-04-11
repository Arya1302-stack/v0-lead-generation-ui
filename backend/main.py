import asyncio

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from deep_scraper import extract_contact_info
from maps_scraper import read_maps_results_csv, run_maps_scraper

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScrapeRequest(BaseModel):
    keyword: str
    city: str
    radius: float = Field(..., description="Search radius (e.g. miles or km depending on product)")


class LeadData(BaseModel):
    company_name: str
    phone: str
    email: str
    pic_name: str | None = None
    website: str


class ScrapeResponse(BaseModel):
    leads: list[LeadData]


def _valid_website(url: str) -> bool:
    u = (url or "").strip()
    if not u or u.lower() in {"n/a", "none", "-", "null"}:
        return False
    if u.startswith(("http://", "https://")):
        return len(u) > len("https://")
    return "." in u and " " not in u


async def _enrich_lead(row: dict[str, str]) -> LeadData:
    company = (row.get("Company Name") or "").strip()
    phone = (row.get("Phone") or "").strip()
    website = (row.get("Website") or "").strip()
    email = ""
    pic_name: str | None = None

    if _valid_website(website):
        try:
            info = await extract_contact_info(website)
            raw_email = info.get("email")
            if raw_email:
                email = str(raw_email).strip()
            pic_name = info.get("pic_name")
            if pic_name is not None:
                pic_name = str(pic_name).strip() or None
        except Exception:
            pass

    return LeadData(
        company_name=company,
        phone=phone,
        email=email,
        pic_name=pic_name,
        website=website,
    )


@app.post("/api/scrape", response_model=ScrapeResponse)
async def scrape(req: ScrapeRequest) -> ScrapeResponse:
    rows: list[dict[str, str]] = []
    try:
        _stdout, _stderr, _code, csv_path = await run_maps_scraper(
            req.keyword,
            req.city,
            int(req.radius),
        )
        try:
            rows = read_maps_results_csv(csv_path)
        except Exception:
            rows = []
    except Exception:
        rows = []

    if not rows:
        return ScrapeResponse(leads=[])

    enriched = await asyncio.gather(
        *(_enrich_lead(r) for r in rows),
        return_exceptions=True,
    )
    leads: list[LeadData] = []
    for row, item in zip(rows, enriched, strict=True):
        if isinstance(item, LeadData):
            leads.append(item)
            continue
        leads.append(
            LeadData(
                company_name=(row.get("Company Name") or "").strip(),
                phone=(row.get("Phone") or "").strip(),
                email="",
                pic_name=None,
                website=(row.get("Website") or "").strip(),
            )
        )

    return ScrapeResponse(leads=leads)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
