# -----------------------------------------------------------------------------
# Stage 1: build gosom/google-maps-scraper (requires recent Go; go.mod uses 1.26+)
# Debian’s apt golang is too old for this upstream project.
# -----------------------------------------------------------------------------
FROM golang:bookworm AS maps_builder

RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
ARG GMS_REPO=https://github.com/gosom/google-maps-scraper.git
ARG GMS_REF=main
RUN git clone --depth 1 --branch "${GMS_REF}" "${GMS_REPO}" . \
    && go mod download \
    && go build -o /usr/local/bin/google-maps-scraper .

# -----------------------------------------------------------------------------
# Stage 2: Python API + runtime deps (Chromium for Playwright/Go scraper, curl_cffi)
# -----------------------------------------------------------------------------
FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    GOOGLE_MAPS_SCRAPER_BIN=/usr/local/bin/google-maps-scraper \
    CHROME_BIN=/usr/bin/chromium \
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

# golang-go via apt (requested): useful for ad-hoc tooling; scraper binary is copied from stage 1.
# System libraries: Chromium stack for google-maps-scraper (playwright-go) + common Scrapling/curl_cffi needs.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        golang-go \
        wget \
        # Chromium and typical headless dependencies
        chromium \
        fonts-liberation \
        fonts-unifont \
        libasound2 \
        libatk-bridge2.0-0 \
        libatk1.0-0 \
        libcairo2 \
        libcups2 \
        libdbus-1-3 \
        libdrm2 \
        libgbm1 \
        libglib2.0-0 \
        libnspr4 \
        libnss3 \
        libpango-1.0-0 \
        libx11-6 \
        libxcb1 \
        libxcomposite1 \
        libxdamage1 \
        libxext6 \
        libxfixes3 \
        libxkbcommon0 \
        libxrandr2 \
        # lxml wheels occasionally need build fallback
        libxml2 \
        libxslt1.1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=maps_builder /usr/local/bin/google-maps-scraper /usr/local/bin/google-maps-scraper
RUN chmod +x /usr/local/bin/google-maps-scraper

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# Optional: Python Playwright browser for Scrapling paths that need Chromium (skip if you only use Fetcher).
RUN playwright install chromium \
    && playwright install-deps chromium \
    || true

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
