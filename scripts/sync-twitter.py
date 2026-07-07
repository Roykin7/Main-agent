#!/usr/bin/env python3
"""
Fetches Phaneroo tweets via twscrape (no API key needed), embeds them
with Voyage AI, and upserts into knowledge_chunks in Supabase.

First-time setup — run this once locally to authenticate the scraper account:
  python scripts/sync-twitter.py --setup

Daily sync (also what GitHub Actions runs):
  python scripts/sync-twitter.py
"""
import asyncio
import argparse
import os
import re
import time
import sys

import requests
from dotenv import load_dotenv
load_dotenv('.env.local')

from twscrape import API, gather
from supabase import create_client

# ── Config ───────────────────────────────────────────────────────────────────

PHANEROO_USERNAME    = os.environ.get('TWITTER_PHANEROO_USERNAME', 'Phanerookampala')
SCRAPER_USERNAME     = os.environ.get('TWITTER_SCRAPER_USERNAME', '')
SCRAPER_PASSWORD     = os.environ.get('TWITTER_SCRAPER_PASSWORD', '')
SCRAPER_EMAIL        = os.environ.get('TWITTER_SCRAPER_EMAIL', '')
SCRAPER_EMAIL_PASS   = os.environ.get('TWITTER_SCRAPER_EMAIL_PASSWORD', '')

SUPABASE_URL         = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY         = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
VOYAGE_KEY           = os.environ.get('VOYAGE_API_KEY', '')

MAX_TWEETS = 100

# ── Clients ──────────────────────────────────────────────────────────────────

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Helpers ──────────────────────────────────────────────────────────────────

def clean(text: str) -> str:
    text = re.sub(r'https?://t\.co/\S+', '', text)   # strip t.co shortlinks
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def is_useful(text: str) -> bool:
    if text.startswith('RT @'):  # skip retweets
        return False
    if len(text) < 30:           # skip near-empty posts
        return False
    return True

def embed(text: str) -> list:
    res = requests.post(
        'https://api.voyageai.com/v1/embeddings',
        headers={'Authorization': f'Bearer {VOYAGE_KEY}', 'Content-Type': 'application/json'},
        json={'input': [text], 'model': 'voyage-3'},
        timeout=30,
    )
    res.raise_for_status()
    return res.json()['data'][0]['embedding']

def already_stored(post_id: str) -> bool:
    res = (
        supabase.from_('knowledge_chunks')
        .select('id')
        .eq('source', 'twitter')
        .eq('source_id', post_id)
        .maybe_single()
        .execute()
    )
    return res.data is not None

# ── Main ─────────────────────────────────────────────────────────────────────

async def setup():
    """Add and log in the scraper account. Run once locally."""
    if not all([SCRAPER_USERNAME, SCRAPER_PASSWORD, SCRAPER_EMAIL]):
        print('ERROR: TWITTER_SCRAPER_USERNAME, _PASSWORD, and _EMAIL must be set in .env.local')
        sys.exit(1)

    api = API()
    await api.pool.add_account(
        SCRAPER_USERNAME, SCRAPER_PASSWORD,
        SCRAPER_EMAIL,    SCRAPER_EMAIL_PASS,
    )
    print('Logging in (this may open an email verification step)...')
    await api.pool.login_all()

    accounts = await api.pool.get_all()
    active = [a for a in accounts if a.active]
    if active:
        print(f'Setup complete. {len(active)} active account(s) in accounts.db.')
    else:
        print('WARNING: No active accounts after login — check credentials or email verification.')


async def sync():
    """Fetch new Phaneroo tweets, embed, and store in knowledge_chunks."""
    api = API()

    accounts = await api.pool.get_all()
    if not accounts:
        print('ERROR: No accounts in accounts.db — run --setup first.')
        sys.exit(1)

    active = [a for a in accounts if a.active]
    print(f'Using {len(active)}/{len(accounts)} active scraper account(s)')

    user = await api.user_by_login(PHANEROO_USERNAME)
    if not user:
        print(f'ERROR: Could not find Twitter user @{PHANEROO_USERNAME}')
        sys.exit(1)

    print(f'Fetching up to {MAX_TWEETS} tweets for @{PHANEROO_USERNAME} (ID {user.id})...')
    tweets = await gather(api.user_tweets(user.id, limit=MAX_TWEETS))
    print(f'  API returned {len(tweets)} tweets')

    inserted = 0
    skipped  = 0
    errors   = 0

    for tweet in tweets:
        content = clean(tweet.rawContent)
        if not is_useful(content):
            skipped += 1
            continue

        post_id = str(tweet.id)

        if already_stored(post_id):
            skipped += 1
            continue

        try:
            embedding = embed(content)
            title = content[:80] + ('...' if len(content) > 80 else '')
            supabase.from_('knowledge_chunks').insert({
                'topic':     'phaneroo',
                'title':     title,
                'content':   content,
                'embedding': embedding,
                'source':    'twitter',
                'source_id': post_id,
            }).execute()
            inserted += 1
            print(f'  [{inserted}] {title}')
        except Exception as e:
            print(f'  ERROR on tweet {post_id}: {e}')
            errors += 1

        time.sleep(0.2)

    print(f'\nDone. Inserted: {inserted}  Skipped: {skipped}  Errors: {errors}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Sync Phaneroo Twitter posts into ZOE knowledge base')
    parser.add_argument('--setup', action='store_true', help='Add + login scraper account (run once locally)')
    args = parser.parse_args()

    if args.setup:
        asyncio.run(setup())
    else:
        asyncio.run(sync())
