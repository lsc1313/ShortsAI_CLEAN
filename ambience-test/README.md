# Ambience V1 — zero-input test

Independent test module. Existing Shorts, HOTDEAL, longform, scheduler and upload code are untouched.

## Goal
Validate a fully unattended ambience production path before adding premium visual sourcing.

Pipeline:

theme config
→ procedural night-city background
→ animated rain layer
→ procedural rain/noise audio
→ FFmpeg encode
→ 30-second test MP4

No background image, audio file, paid API, or manual input is required.

## First theme
Rainy Night in a Cozy High-Rise Apartment — V1 technical prototype.

## Run
`npm run ambience-test`

## Output
`D:\ShortsAI_DATA\ambience-test\output\rainy-high-rise-auto-v1.mp4`

V1 is a pipeline/loop-quality test, not the final channel visual quality. After this runs unattended, the next stage replaces the procedural background with an automated high-quality visual source while preserving the same production pipeline.
