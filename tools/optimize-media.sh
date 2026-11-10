#!/usr/bin/env bash
# Make videos and photos sharp AND light. Needs ffmpeg (https://ffmpeg.org).
#   bash tools/optimize-media.sh path/to/original.mp4  videos/hero-video.mp4
#   bash tools/optimize-media.sh path/to/photo.jpg     products/img/cereals.jpg
set -e
in="$1"; out="$2"
[ -z "$in" ] || [ -z "$out" ] && { echo "usage: $0 <input> <output>"; exit 1; }
case "${out,,}" in
  *.mp4)
    # 1920px wide, high quality (CRF 20), no audio, starts playing before fully downloaded
    ffmpeg -y -i "$in" -vf "scale='min(1920,iw)':-2:flags=lanczos,format=yuv420p" \
      -c:v libx264 -preset slow -crf 20 -profile:v high -movflags +faststart -an "$out" ;;
  *.jpg|*.jpeg)
    # 2000px on the long side, quality 88, sharpened slightly after resizing
    ffmpeg -y -i "$in" -vf "scale='if(gt(iw,ih),min(2000,iw),-2)':'if(gt(iw,ih),-2,min(2000,ih))':flags=lanczos,unsharp=3:3:0.4" -q:v 3 "$out" ;;
  *) echo "Output must be .mp4 or .jpg"; exit 1 ;;
esac
ls -lh "$out"
