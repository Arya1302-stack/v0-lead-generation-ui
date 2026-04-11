import asyncio

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

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
    pic_name: str
    website: str


class ScrapeResponse(BaseModel):
    leads: list[LeadData]


@app.post("/api/scrape", response_model=ScrapeResponse)
async def scrape(req: ScrapeRequest) -> ScrapeResponse:
    await asyncio.sleep(3)
    dummy = [
        LeadData(
            company_name="Acme Plumbing Co.",
            phone="+1-555-0101",
            email="contact@acmeplumbing.example",
            pic_name="Jane Smith",
            website="https://acmeplumbing.example",
        ),
        LeadData(
            company_name="City Drain Services",
            phone="+1-555-0102",
            email="hello@citydrain.example",
            pic_name="Robert Chen",
            website="https://citydrain.example",
        ),
        LeadData(
            company_name="Metro HVAC & Water",
            phone="+1-555-0103",
            email="sales@metrohvac.example",
            pic_name="Maria Garcia",
            website="https://metrohvac.example",
        ),
    ]
    return ScrapeResponse(leads=dummy)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
