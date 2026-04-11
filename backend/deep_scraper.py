"""
Scrape individual company pages for contact email using Scrapling.

Reference: https://github.com/D4Vinci/Scrapling
"""

from __future__ import annotations

import asyncio
import re
from typing import Any
from urllib.parse import urlparse

from scrapling import AsyncFetcher

# Practical email pattern (not full RFC 5322); used on visible text + raw HTML.
_EMAIL_RE = re.compile(
    r"[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}",
    re.IGNORECASE,
)

_CONTACT_PAGE_RE = re.compile(
    r"contact|about[\s_-]*us|about|reach[\s_-]*us|get[\s_-]*in[\s_-]*touch|our[\s_-]*team|meet[\s_-]*the[\s_-]*team|our[\s_-]*story",
    re.IGNORECASE,
)

_BAD_IMAGE_TLDS = frozenset({"png", "jpg", "jpeg", "gif", "webp", "svg", "css", "js", "ico"})


def _normalize_url(url: str) -> str:
    u = (url or "").strip()
    if not u:
        return u
    if not u.startswith(("http://", "https://")):
        return f"https://{u}"
    return u


def _same_site(base_url: str, target_url: str) -> bool:
    try:
        b, t = urlparse(base_url), urlparse(target_url)
        if not t.netloc:
            return True
        bn = b.netloc.lower().removeprefix("www.")
        tn = t.netloc.lower().removeprefix("www.")
        return bn == tn
    except Exception:
        return False


def _is_plausible_email(addr: str) -> bool:
    if "@" not in addr:
        return False
    local, _, domain = addr.partition("@")
    if len(local) > 64 or len(domain) > 253 or "." not in domain:
        return False
    tld = domain.rsplit(".", 1)[-1].lower()
    if tld in _BAD_IMAGE_TLDS:
        return False
    return True


def _emails_in_text(text: str) -> list[str]:
    if not text:
        return []
    seen: set[str] = set()
    ordered: list[str] = []
    for m in _EMAIL_RE.finditer(text):
        e = m.group(0).strip().rstrip(".,);]>\"'")
        if not _is_plausible_email(e):
            continue
        key = e.lower()
        if key not in seen:
            seen.add(key)
            ordered.append(e)
    return ordered


def _combined_page_text(resp: Any) -> str:
    parts: list[str] = []
    try:
        body = resp.body
        if isinstance(body, bytes):
            enc = getattr(resp, "encoding", None) or "utf-8"
            parts.append(body.decode(enc, errors="ignore"))
        elif body:
            parts.append(str(body))
    except Exception:
        pass
    try:
        parts.append(str(resp.get_all_text()))
    except Exception:
        pass
    return "\n".join(parts)


def _pick_contact_urls(resp: Any, limit: int = 15) -> list[str]:
    urls: list[str] = []
    seen: set[str] = set()
    try:
        base = getattr(resp, "url", "") or ""
        for a in resp.find_all("a"):
            try:
                href = a.attrib.get("href")
                if not href:
                    continue
                low = href.strip().lower()
                if low.startswith(("#", "javascript:", "mailto:", "tel:")):
                    continue
                full = resp.urljoin(href)
                if full in seen:
                    continue
                label = ""
                try:
                    label = str(a.get_all_text())
                except Exception:
                    pass
                if not (_CONTACT_PAGE_RE.search(href) or _CONTACT_PAGE_RE.search(label)):
                    continue
                if not _same_site(base, full):
                    continue
                seen.add(full)
                urls.append(full)
            except Exception:
                continue
            if len(urls) >= limit:
                break
    except Exception:
        pass
    return urls


async def _fetch_page(url: str, *, timeout: float = 20.0) -> Any | None:
    try:
        return await AsyncFetcher.get(url, timeout=timeout, retries=1)
    except Exception:
        return None


def _response_ok(resp: Any) -> bool:
    try:
        status = int(getattr(resp, "status", 0))
        return 200 <= status < 400
    except Exception:
        return False


async def extract_contact_info(url: str) -> dict[str, str | None]:
    """
    Fetch a company URL, extract emails via regex, optionally follow About/Contact links.

    Returns ``{"email": str | None, "pic_name": None}`` (pic_name reserved for future NER).
    """
    result: dict[str, str | None] = {"email": None, "pic_name": None}
    start = _normalize_url(url)
    if not start:
        return result

    first = await _fetch_page(start)
    if first is None:
        return result
    if not _response_ok(first):
        return result

    for candidate in _emails_in_text(_combined_page_text(first)):
        result["email"] = candidate
        return result

    for extra_url in _pick_contact_urls(first):
        page = await _fetch_page(extra_url)
        if isinstance(page, BaseException) or page is None:
            continue
        if not _response_ok(page):
            continue
        for candidate in _emails_in_text(_combined_page_text(page)):
            result["email"] = candidate
            return result

    return result
