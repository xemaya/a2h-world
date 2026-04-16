#!/bin/bash
# remove-bg-v2.sh - Remove ONLY checkerboard background, preserve character

set -e

echo "Removing checkerboard backgrounds (v2 - more conservative)..."

# Function to remove checkerboard specifically
remove_checkerboard() {
  local input=$1
  local output=$2

  echo "Processing $input..."

  # Target specific grey shades of the checkerboard pattern
  # Use lower fuzz to be more selective
  magick "$input" \
    -fuzz 15% -transparent '#666666' \
    -fuzz 15% -transparent '#999999' \
    -fuzz 15% -transparent '#cccccc' \
    -fuzz 15% -transparent '#333333' \
    "$output"

  file "$output"
  echo "  ✓ Saved"
}

cd "$(dirname "$0")/.."

# Backup originals if they're JPEG
for f in assets/echo/echo_*.png assets/partners/kai.png; do
  if file "$f" | grep -q "JPEG"; then
    mv "$f" "${f%.png}_jpeg_backup.png"
    echo "Backed up JPEG: $f"
  fi
done

# Process ECHO sprites
remove_checkerboard "assets/echo/echo_blank_jpeg_backup.png" "assets/echo/echo_blank.png"
remove_checkerboard "assets/echo/echo_concern_jpeg_backup.png" "assets/echo/echo_concern.png"
remove_checkerboard "assets/echo/echo_happy_jpeg_backup.png" "assets/echo/echo_happy.png"

# Process KAI
remove_checkerboard "assets/partners/kai_jpeg_backup.png" "assets/partners/kai.png"

echo ""
echo "Done! Check results with: file assets/echo/*.png assets/partners/kai.png"
echo "If satisfied, delete backups: rm assets/**/*_jpeg_backup.png"
