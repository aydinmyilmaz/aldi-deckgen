# Pexels Image Integration (MVP)

## What it does

- Optional image-query generation in content pipeline (`imageQueryPlanner` node).
- Optional Pexels search/fetch in render pipeline (`searchImages` node).
- If an image is found, it is embedded in the slide.
- If image search fails, deck generation continues without breaking.

## Required env var

Set in `.env.local`:

```bash
PEXELS_API_KEY=your_pexels_api_key
```

If this key is missing, image mode is silently skipped.

## User flow

1. Enable `Related Images (Pexels)` on the input screen.
2. Generate slide content.
3. Export `.pptx`.

## Slide card image actions

- In `Outline & Content`, each slide card now has an image panel.
- If image exists: click `Refresh` to fetch a different related image.
- If image is missing: click `Generate` to create query + fetch image for that slide.
- Endpoint: `POST /api/slide-image`

## Notes

- Images are only attempted when `useRelatedImages = true`.
- Existing behavior remains unchanged by default (`false`).
- Image attribution is appended to slide speaker notes when an image is used.
