# Ambience V1 test

Independent test module. It does not modify Shorts, HOTDEAL, longform, scheduler, or upload code.

## First theme
Rainy Night in a Cozy High-Rise Apartment

## Input
Place a 16:9 background image at:
`D:\ShortsAI_DATA\ambience-test\input\background.jpg`

Optional real rain audio:
`D:\ShortsAI_DATA\ambience-test\input\rain.wav`

If rain.wav is absent, the test generator creates a neutral filtered-noise rain bed with FFmpeg.

## Run
`npm run ambience-test`

Output:
`D:\ShortsAI_DATA\ambience-test\output\rainy-high-rise-loop.mp4`
