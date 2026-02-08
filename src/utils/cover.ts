import path from 'path';
import fs from 'fs-extra';
import { PodcastSource } from '../types';
import { getEnvConfig } from './env';

function coversDir(): string {
    return path.join(process.cwd(), '.covers');
}

function guessExtFromUrl(url: string): string {
    const lower = url.toLowerCase().split('?')[0];
    if (lower.endsWith('.png')) return '.png';
    if (lower.endsWith('.webp')) return '.webp';
    if (lower.endsWith('.jpeg')) return '.jpg';
    if (lower.endsWith('.jpg')) return '.jpg';
    return '.jpg';
}

async function isFresh(filePath: string, ttlDays: number): Promise<boolean> {
    try {
        const st = await fs.stat(filePath);
        const ageMs = Date.now() - st.mtimeMs;
        return ageMs >= 0 && ageMs < ttlDays * 24 * 60 * 60 * 1000;
    } catch {
        return false;
    }
}

async function cleanupOldVariants(basePathNoExt: string, keepExt: string): Promise<void> {
    const exts = ['.jpg', '.png', '.webp'];
    for (const ext of exts) {
        if (ext === keepExt) continue;
        const p = `${basePathNoExt}${ext}`;
        if (await fs.pathExists(p)) {
            await fs.remove(p);
        }
    }
}

async function downloadToFile(url: string, filePath: string, timeoutMs: number): Promise<void> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) {
            throw new Error(`cover download failed: ${res.status} ${res.statusText}`);
        }
        const buf = Buffer.from(await res.arrayBuffer());
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, buf);
    } finally {
        clearTimeout(t);
    }
}

async function itunesSearchArtwork(term: string, country: string, timeoutMs: number): Promise<string | null> {
    const q = new URLSearchParams({
        term,
        entity: 'podcast',
        limit: '3',
        country
    }).toString();
    const url = `https://itunes.apple.com/search?${q}`;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: ctrl.signal, headers: { 'Accept': 'application/json' } });
        if (!res.ok) return null;
        const j = await res.json() as any;
        const r = Array.isArray(j?.results) ? j.results : [];
        if (!r.length) return null;
        const first = r[0] || {};
        return first.artworkUrl600 || first.artworkUrl512 || first.artworkUrl100 || null;
    } catch {
        return null;
    } finally {
        clearTimeout(t);
    }
}

function toCoverRoute(fileName: string): string {
    // fileName contains extension already
    return `/covers/${encodeURIComponent(fileName)}`;
}

export async function resolveCoverForSource(source: PodcastSource): Promise<{ coverUrl?: string; coverCachePath?: string }> {
    const env = getEnvConfig();
    if (!env.REMOTE_COVER_ENABLED || env.REMOTE_COVER_PROVIDER === 'none') {
        return {};
    }

    const dirName = source.dirName;
    const baseName = dirName; // keep readable; relies on dir name being a safe file name (directory names are).
    const baseNoExt = path.join(coversDir(), baseName);

    // If already present and fresh (any supported extension), reuse it.
    for (const ext of ['.jpg', '.png', '.webp']) {
        const p = `${baseNoExt}${ext}`;
        if (await fs.pathExists(p) && await isFresh(p, env.REMOTE_COVER_TTL_DAYS)) {
            return { coverUrl: toCoverRoute(`${baseName}${ext}`), coverCachePath: p };
        }
    }

    // Prefer explicit cover URL from podcast.json
    const directUrl = (source.config.coverImageUrl || '').trim();
    let artworkUrl: string | null = null;
    if (directUrl) {
        artworkUrl = directUrl;
    } else {
        const term = (source.config.coverSearchTerm || source.config.title || source.dirName).trim();
        if (term) {
            artworkUrl = await itunesSearchArtwork(term, env.REMOTE_COVER_COUNTRY, env.REMOTE_COVER_TIMEOUT_MS);
        }
    }

    if (!artworkUrl) return {};

    const ext = guessExtFromUrl(artworkUrl);
    const cachePath = `${baseNoExt}${ext}`;

    try {
        await downloadToFile(artworkUrl, cachePath, env.REMOTE_COVER_TIMEOUT_MS);
        await cleanupOldVariants(baseNoExt, ext);
        return { coverUrl: toCoverRoute(`${baseName}${ext}`), coverCachePath: cachePath };
    } catch {
        return {};
    }
}

