#!/bin/bash
# generate-sprites-curl.sh - Use curl to generate sprites via Gemini API

set -e

KEY="${GEMINI_API_KEY:?ERROR: GEMINI_API_KEY not set. Add it to game/.env or export it.}"
MODEL="gemini-3.1-flash-image-preview"
API_URL="https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}"

# Common prompts
CHAR_LOCK="ECHO character — follow EXACTLY: flat trapezoid body wide-at-top narrow-at-bottom, NO neck, head merged with body, THREE short thick antennae sticking upward from top of head, TWO white oval eyes with NO pupils, stubby arms, solid #895AFF purple body with halftone texture, circular cyan (#00ffcc) A2H badge on chest, NO nose, NO ears, NO pupils, comic book style with thick black 3-4px outlines"

STYLE="flat 2D comic illustration, NOT 3D, NOT rounded cartoon, cyberpunk aesthetic, halftone dot texture overlay, thick black outlines, flat cel shading, palette: #05050f dark background, #00ffcc cyan neon accents, #895AFF purple highlights"

BG_TRANSPARENT="CRITICAL: COMPLETELY TRANSPARENT BACKGROUND, PNG with alpha channel, NO checkerboard pattern, NO solid background color"

# Function to generate one sprite
generate_sprite() {
  local id=$1
  local prompt=$2
  local output=$3

  echo "Generating $id..."

  FULL_PROMPT="${CHAR_LOCK}. ${STYLE}. ${prompt}. ${BG_TRANSPARENT}"

  PAYLOAD=$(cat <<EOF
{
  "contents": [{
    "parts": [{
      "text": "${FULL_PROMPT}"
    }]
  }],
  "generationConfig": {
    "temperature": 0.4,
    "candidateCount": 1
  }
}
EOF
)

  RESPONSE=$(curl -s -X POST "${API_URL}" \
    -H "Content-Type: application/json" \
    -d "${PAYLOAD}")

  # Extract base64 image
  IMAGE_B64=$(echo "$RESPONSE" | jq -r '.candidates[0].content.parts[0].inlineData.data // .candidates[0].content.parts[0].inline_data.data // empty')

  if [ -z "$IMAGE_B64" ]; then
    echo "  ✗ Failed: No image data in response"
    echo "$RESPONSE" | jq '.' | head -20
    return 1
  fi

  # Decode and save
  echo "$IMAGE_B64" | base64 --decode > "$output"
  echo "  ✓ Saved to $output ($(du -h "$output" | cut -f1))"
}

cd "$(dirname "$0")/.."

# Generate ECHO sprites
generate_sprite "echo_blank" \
  "ECHO character, half-body portrait facing forward, expression: two white oval eyes with NO mouth visible (blank observation mode), neutral standing pose, arms at sides" \
  "assets/echo/echo_blank.png"

generate_sprite "echo_concern" \
  "ECHO character, half-body portrait facing forward, expression: two eyes squinting (shown as narrowed ovals or small filled dots), small downturned arc mouth showing concern, slight head tilt, one arm raised to chin in thinking gesture" \
  "assets/echo/echo_concern.png"

generate_sprite "echo_happy" \
  "ECHO character, half-body portrait facing forward, expression: two white oval eyes wide open, ONE wide white arc smile (thick and bold), arms raised in celebration pose showing joy" \
  "assets/echo/echo_happy.png"

# Generate KAI sprite
echo ""
echo "Generating KAI..."

KAI_PROMPT="KAI character: young Asian male freelancer age 25, short dark hair with purple highlights, sharp confident facial features, wearing black oversized hoodie with cyan neon edge lighting, small 'a2hmarket.ai' text logo on chest in cyan glow, hands in pockets or one hand visible, half-body portrait from waist up, cyberpunk comic style with thick black outlines, flat cel shading, semi-realistic anime influenced. ${BG_TRANSPARENT}"

KAI_PAYLOAD=$(cat <<EOF
{
  "contents": [{
    "parts": [{
      "text": "${KAI_PROMPT}"
    }]
  }],
  "generationConfig": {
    "temperature": 0.4,
    "candidateCount": 1
  }
}
EOF
)

KAI_RESPONSE=$(curl -s -X POST "${API_URL}" \
  -H "Content-Type: application/json" \
  -d "${KAI_PAYLOAD}")

KAI_IMAGE_B64=$(echo "$KAI_RESPONSE" | jq -r '.candidates[0].content.parts[0].inlineData.data // .candidates[0].content.parts[0].inline_data.data // empty')

if [ -z "$KAI_IMAGE_B64" ]; then
  echo "  ✗ Failed: No image data in response"
  echo "$KAI_RESPONSE" | jq '.' | head -20
else
  echo "$KAI_IMAGE_B64" | base64 --decode > "assets/partners/kai.png"
  echo "  ✓ Saved to assets/partners/kai.png ($(du -h assets/partners/kai.png | cut -f1))"
fi

echo ""
echo "Done! Verify files with: file assets/echo/*.png assets/partners/kai.png"
