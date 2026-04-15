#!/bin/bash
# generate-sprites-solid-bg.sh - Generate sprites with SOLID BLACK background for Canvas removal

set -e

KEY="REDACTED_GOOGLE_API_KEY"
MODEL="gemini-3.1-flash-image-preview"
API_URL="https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}"

CHAR_LOCK="ECHO character — follow EXACTLY: flat trapezoid body wide-at-top narrow-at-bottom, NO neck, head merged with body, THREE separate short thick antennae/antennas sticking straight upward from top of head (CRITICAL: must show all three antenna clearly, they are ECHO's signature feature), TWO white oval eyes with NO pupils, stubby arms, solid #895AFF purple body with halftone dot texture, CIRCULAR CYAN GLOWING BADGE ON CHEST CENTER with 'A2H' text inside (CRITICAL: badge is mandatory, must be visible and prominent, cyan color #00ffcc), NO nose, NO ears, NO pupils, comic book style with thick black 3-4px outlines"

STYLE="flat 2D comic illustration, NOT 3D, NOT rounded cartoon, cyberpunk aesthetic, halftone dot texture overlay, thick black outlines, flat cel shading"

# CRITICAL: Request solid black background instead of transparent
BG_SOLID="CRITICAL: SOLID PURE BLACK BACKGROUND (#000000), completely flat black color, NO gradients, NO checkerboard, NO transparency, pure matte black"

generate_sprite() {
  local id=$1
  local prompt=$2
  local output=$3

  echo "Generating $id with solid black bg..."

  FULL_PROMPT="${CHAR_LOCK}. ${STYLE}. ${prompt}. ${BG_SOLID}"

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

  IMAGE_B64=$(echo "$RESPONSE" | jq -r '.candidates[0].content.parts[0].inlineData.data // .candidates[0].content.parts[0].inline_data.data // empty')

  if [ -z "$IMAGE_B64" ]; then
    echo "  ✗ Failed: No image data"
    echo "$RESPONSE" | jq '.' | head -20
    return 1
  fi

  mkdir -p "$(dirname "$output")"
  echo "$IMAGE_B64" | base64 --decode > "$output"
  echo "  ✓ $output ($(du -h "$output" | cut -f1))"
}

cd "$(dirname "$0")/.."

# Create temp directory for raw outputs
mkdir -p assets/temp_raw

echo "Generating sprites with SOLID BLACK background..."
echo "These will need Canvas processing to remove background."
echo ""

generate_sprite "echo_blank" \
  "ECHO character, half-body portrait facing forward, expression: two white oval eyes with NO mouth visible (blank observation mode), neutral standing pose, arms at sides, isolated centered subject" \
  "assets/temp_raw/echo_blank_raw.png"

generate_sprite "echo_concern" \
  "ECHO character, half-body portrait facing forward, expression: two eyes squinting (shown as narrowed ovals or small filled dots), small downturned arc mouth showing concern, slight head tilt, one arm raised to chin in thinking gesture, isolated centered subject" \
  "assets/temp_raw/echo_concern_raw.png"

generate_sprite "echo_happy" \
  "ECHO character, half-body portrait facing forward, expression: two white oval eyes wide open, ONE wide white arc smile (thick and bold), arms raised in celebration pose showing joy, isolated centered subject" \
  "assets/temp_raw/echo_happy_raw.png"

echo ""
echo "Generating KAI with solid black bg..."

KAI_PROMPT="KAI character: young Asian male freelancer age 25, short dark hair with purple highlights, sharp confident facial features, wearing black oversized hoodie with cyan neon edge lighting, small 'a2hmarket.ai' text logo on chest in cyan glow, hands in pockets or one hand visible, half-body portrait from waist up, cyberpunk comic style with thick black outlines, flat cel shading, semi-realistic anime influenced, isolated centered subject. ${BG_SOLID}"

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
  echo "  ✗ Failed"
else
  echo "$KAI_IMAGE_B64" | base64 --decode > "assets/temp_raw/kai_raw.png"
  echo "  ✓ assets/temp_raw/kai_raw.png ($(du -h assets/temp_raw/kai_raw.png | cut -f1))"
fi

echo ""
echo "✅ Done! Raw sprites saved to assets/temp_raw/"
echo ""
echo "Next steps:"
echo "1. Open build/remove-solid-bg.html in browser"
echo "2. Upload files from assets/temp_raw/"
echo "3. Set target color to '0,0,0' (black)"
echo "4. Adjust tolerance (try 20-40)"
echo "5. Download processed files"
echo "6. Move to assets/echo/ and assets/partners/"
