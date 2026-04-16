#!/bin/bash
# remove-bg.sh - Remove checkerboard background from sprites using ImageMagick

set -e

echo "Removing checkerboard backgrounds from sprites..."

# Function to remove checkerboard and make transparent
remove_bg() {
  local input=$1
  local output=$2

  echo "Processing $input..."

  # Convert to PNG, remove grey checkerboard pattern, make it transparent
  magick "$input" \
    -fuzz 40% -transparent '#666666' \
    -fuzz 40% -transparent '#999999' \
    -fuzz 40% -transparent '#808080' \
    -fuzz 40% -transparent '#555555' \
    -fuzz 40% -transparent '#777777' \
    -fuzz 40% -transparent '#888888' \
    -fuzz 40% -transparent '#444444' \
    -fuzz 40% -transparent '#aaaaaa' \
    -fuzz 40% -transparent '#bbbbbb' \
    -fuzz 40% -transparent '#cccccc' \
    "$output"

  # Verify it's real PNG
  file "$output"
  echo "  ✓ Saved to $output"
}

cd "$(dirname "$0")/.."

# Process ECHO sprites
remove_bg "assets/echo/echo_blank.png" "assets/echo/echo_blank_clean.png"
remove_bg "assets/echo/echo_concern.png" "assets/echo/echo_concern_clean.png"
remove_bg "assets/echo/echo_happy.png" "assets/echo/echo_happy_clean.png"

# Process KAI
remove_bg "assets/partners/kai.png" "assets/partners/kai_clean.png"

echo ""
echo "All sprites processed!"
echo "Replace originals with: "
echo "  mv assets/echo/*_clean.png assets/echo/"
echo "  mv assets/partners/*_clean.png assets/partners/"
