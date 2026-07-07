#!/usr/bin/env python3
"""
Syncs Phaneroo YouTube sermons into ZOE's knowledge base.

Two levels of ingestion:
  1. All videos  — title + date + URL stored as a knowledge chunk (breadth)
  2. Latest N    — full auto-generated transcript, chunked and embedded (depth)

Usage:
  python scripts/sync-youtube.py               # all titles + last 5 transcripts
  python scripts/sync-youtube.py --transcripts 10  # last 10 transcripts
  python scripts/sync-youtube.py --titles-only     # skip transcripts
"""
import argparse
import os
import re
import sys
import tempfile
import time

import requests
import yt_dlp
from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client

# ── Config ────────────────────────────────────────────────────────────────────

CHANNEL_URL   = 'https://www.youtube.com/channel/UCrEG2rXLpLVSZJntGuHV8fw/videos'
VOYAGE_KEY    = os.environ.get('VOYAGE_API_KEY', '')
SUPABASE_URL  = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY  = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
TRANSCRIPT_N  = 5   # default number of recent videos to transcribe
CHUNK_WORDS   = 350 # words per transcript chunk

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Embedding ─────────────────────────────────────────────────────────────────

def embed(text: str) -> list:
    res = requests.post(
        'https://api.voyageai.com/v1/embeddings',
        headers={'Authorization': f'Bearer {VOYAGE_KEY}', 'Content-Type': 'application/json'},
        json={'input': [text], 'model': 'voyage-3-lite'},
        timeout=30,
    )
    res.raise_for_status()
    return res.json()['data'][0]['embedding']

# ── Dedup helpers ─────────────────────────────────────────────────────────────

def already_stored(source: str, source_id: str) -> bool:
    res = (
        supabase.from_('knowledge_chunks')
        .select('id')
        .eq('source', source)
        .eq('source_id', source_id)
        .limit(1)
        .execute()
    )
    return len(res.data) > 0

# ── Transcript helpers ────────────────────────────────────────────────────────

def parse_vtt(vtt_text: str) -> str:
    """Extract plain text from a VTT subtitle file."""
    lines = []
    for line in vtt_text.splitlines():
        line = line.strip()
        if not line or line.startswith('WEBVTT') or '-->' in line or re.match(r'^\d+$', line):
            continue
        clean = re.sub(r'<[^>]+>', '', line)
        if clean:
            lines.append(clean)
    # Remove consecutive duplicate lines (VTT often repeats lines)
    deduped = []
    prev = None
    for ln in lines:
        if ln != prev:
            deduped.append(ln)
            prev = ln
    return ' '.join(deduped)

def chunk_text(text: str, chunk_words: int = CHUNK_WORDS) -> list[str]:
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_words):
        chunk = ' '.join(words[i:i + chunk_words])
        if len(chunk) > 80:
            chunks.append(chunk)
    return chunks

def download_transcript(video_id: str) -> str | None:
    """Download auto-generated English transcript via yt-dlp. Returns plain text or None."""
    with tempfile.TemporaryDirectory() as tmpdir:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en'],
            'subtitlesformat': 'vtt',
            'skip_download': True,
            'outtmpl': os.path.join(tmpdir, '%(id)s.%(ext)s'),
        }
        url = f'https://www.youtube.com/watch?v={video_id}'
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
        except Exception as e:
            print(f'    yt-dlp error: {e}')
            return None

        vtt_path = os.path.join(tmpdir, f'{video_id}.en.vtt')
        if not os.path.exists(vtt_path):
            # Try alternate filename
            for f in os.listdir(tmpdir):
                if f.endswith('.vtt'):
                    vtt_path = os.path.join(tmpdir, f)
                    break
            else:
                return None

        with open(vtt_path, encoding='utf-8') as f:
            return parse_vtt(f.read())

# ── Main ──────────────────────────────────────────────────────────────────────

def fetch_all_videos() -> list[dict]:
    """Return list of {id, title, date, url} for all channel videos, newest first."""
    print('Fetching video list from YouTube...')
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': True,
        'playlistend': None,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(CHANNEL_URL, download=False)

    videos = []
    for entry in (info.get('entries') or []):
        vid_id = entry.get('id')
        title  = entry.get('title', '').strip()
        date   = entry.get('upload_date', '')  # YYYYMMDD
        if vid_id and title:
            fmt_date = f'{date[:4]}-{date[4:6]}-{date[6:]}' if len(date) == 8 else ''
            videos.append({
                'id':    vid_id,
                'title': title,
                'date':  fmt_date,
                'url':   f'https://www.youtube.com/watch?v={vid_id}',
            })
    print(f'Found {len(videos)} videos')
    return videos


def ingest_title(video: dict) -> bool:
    """Store a single video title as a knowledge chunk. Returns True if inserted."""
    if already_stored('youtube', video['id']):
        return False
    content = f"{video['title']} — Phaneroo sermon, {video['date']}. Watch: {video['url']}"
    try:
        embedding = embed(content)
        supabase.from_('knowledge_chunks').insert({
            'topic':     'phaneroo',
            'title':     f"Sermon: {video['title']} ({video['date']})",
            'content':   content,
            'embedding': embedding,
            'source':    'youtube',
            'source_id': video['id'],
        }).execute()
        return True
    except Exception as e:
        print(f"  ERROR storing title {video['id']}: {e}")
        return False


def ingest_transcript(video: dict) -> int:
    """Download transcript, chunk it, store chunks. Returns number of chunks stored."""
    print(f"  Downloading transcript: {video['title'][:60]}...")
    text = download_transcript(video['id'])
    if not text:
        print('    No transcript available.')
        return 0

    chunks = chunk_text(text)
    print(f'    {len(chunks)} chunks from {len(text.split())} words')
    stored = 0

    for i, chunk in enumerate(chunks):
        chunk_id = f"{video['id']}_t{i}"
        if already_stored('youtube_transcript', chunk_id):
            continue
        try:
            embedding = embed(chunk)
            supabase.from_('knowledge_chunks').insert({
                'topic':     'phaneroo',
                'title':     f"Sermon transcript: {video['title']} (part {i+1})",
                'content':   chunk,
                'embedding': embedding,
                'source':    'youtube_transcript',
                'source_id': chunk_id,
            }).execute()
            stored += 1
        except Exception as e:
            print(f'    chunk {i} error: {e}')
        time.sleep(0.15)

    return stored


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--transcripts', type=int, default=TRANSCRIPT_N,
                        help=f'Number of recent videos to transcribe (default {TRANSCRIPT_N})')
    parser.add_argument('--titles-only', action='store_true',
                        help='Skip transcript download entirely')
    args = parser.parse_args()

    videos = fetch_all_videos()
    if not videos:
        print('No videos found.')
        return

    # ── Phase 1: ingest all titles ──────────────────────────────────────────
    print(f'\nPhase 1: storing titles for {len(videos)} videos...')
    title_inserted = 0
    title_skipped  = 0

    for video in videos:
        if ingest_title(video):
            title_inserted += 1
            print(f'  [{title_inserted}] {video["title"][:70]}')
        else:
            title_skipped += 1
        time.sleep(0.1)

    print(f'Titles — inserted: {title_inserted}, already existed: {title_skipped}')

    # ── Phase 2: transcripts for latest N videos ────────────────────────────
    if args.titles_only:
        print('\nSkipping transcripts (--titles-only).')
        return

    n = args.transcripts
    print(f'\nPhase 2: transcripts for {n} most recent videos...')
    total_chunks = 0

    for video in videos[:n]:
        print(f'\n  {video["date"]} — {video["title"][:60]}')
        chunks = ingest_transcript(video)
        total_chunks += chunks
        print(f'    Stored {chunks} chunks')
        time.sleep(1)

    print(f'\nTranscripts done. Total chunks stored: {total_chunks}')
    print('\n═══ Complete ═══')


if __name__ == '__main__':
    main()
