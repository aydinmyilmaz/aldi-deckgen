import type { SlideImageAsset } from '@/types/render';

interface PexelsSearchResponse {
  photos?: PexelsPhoto[];
}

interface PexelsPhoto {
  alt?: string;
  photographer?: string;
  photographer_url?: string;
  url?: string;
  width?: number;
  src?: {
    original?: string;
    large2x?: string;
    large?: string;
    landscape?: string;
    medium?: string;
    small?: string;
  };
}

export interface PexelsPickedImage {
  query: string;
  imageUrl: string;
  thumbUrl: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
  pexelsUrl: string;
  attributionLine: string;
}

interface SearchOptions {
  page?: number;
  perPage?: number;
  excludeImageUrl?: string;
}

function encodeQuery(query: string): string {
  return query.replace(/\s+/g, ' ').trim();
}

function pickImageUrl(photo: PexelsPhoto): string | null {
  return (
    photo.src?.landscape ??
    photo.src?.large ??
    photo.src?.large2x ??
    photo.src?.medium ??
    photo.src?.original ??
    null
  );
}

function pickThumbUrl(photo: PexelsPhoto): string | null {
  return (
    photo.src?.small ??
    photo.src?.medium ??
    photo.src?.landscape ??
    photo.src?.large ??
    null
  );
}

function normalizePickedImage(photo: PexelsPhoto, query: string): PexelsPickedImage | null {
  const imageUrl = pickImageUrl(photo);
  const thumbUrl = pickThumbUrl(photo);
  if (!imageUrl || !thumbUrl) return null;

  const photographer = (photo.photographer ?? 'Unknown').trim();
  const pexelsUrl = photo.url ?? 'https://www.pexels.com';
  const photographerUrl = photo.photographer_url ?? 'https://www.pexels.com';

  return {
    query,
    imageUrl,
    thumbUrl,
    alt: photo.alt?.trim() || query,
    photographer,
    photographerUrl,
    pexelsUrl,
    attributionLine: `Image credit: Photo by ${photographer} on Pexels (${pexelsUrl})`,
  };
}

async function fetchImageAsDataUri(imageUrl: string): Promise<string | null> {
  const imageRes = await fetch(imageUrl, { cache: 'no-store' });
  if (!imageRes.ok) return null;
  const contentType = (imageRes.headers.get('content-type') ?? 'image/jpeg').split(';')[0].trim();
  const bytes = Buffer.from(await imageRes.arrayBuffer());
  return `data:${contentType};base64,${bytes.toString('base64')}`;
}

export async function searchPexelsImage(
  query: string,
  apiKey: string,
  options: SearchOptions = {}
): Promise<PexelsPickedImage | null> {
  const cleanQuery = encodeQuery(query);
  if (!cleanQuery) return null;

  const perPage = options.perPage ?? 12;
  const page = options.page ?? 1;
  const searchParams = new URLSearchParams({
    query: cleanQuery,
    orientation: 'landscape',
    size: 'medium',
    per_page: String(perPage),
    page: String(page),
    locale: 'en-US',
  });

  const searchRes = await fetch(`https://api.pexels.com/v1/search?${searchParams.toString()}`, {
    headers: {
      Authorization: apiKey,
    },
    cache: 'no-store',
  });

  if (!searchRes.ok) return null;

  const searchData = (await searchRes.json()) as PexelsSearchResponse;
  const candidates = (searchData.photos ?? [])
    .map((photo) => normalizePickedImage(photo, cleanQuery))
    .filter((photo): photo is PexelsPickedImage => Boolean(photo))
    .filter((photo) => (options.excludeImageUrl ? photo.imageUrl !== options.excludeImageUrl : true));

  if (candidates.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex];
}

export async function imageAssetFromPickedImage(
  picked: PexelsPickedImage
): Promise<SlideImageAsset | null> {
  const dataUri = await fetchImageAsDataUri(picked.imageUrl);
  if (!dataUri) return null;

  return {
    query: picked.query,
    dataUri,
    alt: picked.alt,
    photographer: picked.photographer,
    photographerUrl: picked.photographerUrl,
    pexelsUrl: picked.pexelsUrl,
    attributionLine: picked.attributionLine,
  };
}

export async function imageAssetFromUrl(
  imageUrl: string,
  metadata: {
    query: string;
    alt?: string;
    attributionLine?: string;
  }
): Promise<SlideImageAsset | null> {
  const cleanUrl = imageUrl.trim();
  if (!cleanUrl) return null;
  const dataUri = await fetchImageAsDataUri(cleanUrl);
  if (!dataUri) return null;

  return {
    query: metadata.query,
    dataUri,
    alt: metadata.alt || metadata.query,
    photographer: '',
    photographerUrl: '',
    pexelsUrl: '',
    attributionLine: metadata.attributionLine || '',
  };
}

export async function fetchPexelsImageAsset(
  query: string,
  apiKey: string
): Promise<SlideImageAsset | null> {
  const picked = await searchPexelsImage(query, apiKey);
  if (!picked) return null;
  return imageAssetFromPickedImage(picked);
}
