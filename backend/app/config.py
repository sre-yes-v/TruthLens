from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "data" / "uploads"

# Upload Rules
MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB
ALLOWED_FORMATS = {
    "JPEG" : {"ext" : ".jpg", "mime" : "image/jpeg"},
    "PNG" : {"ext" : ".png", "mime" : "image/png"},
    "WEBP" : {"ext" : ".webp", "mime" : "image/webp"},
}
FRONTEND_ORIGINS = ["http://localhost:3000"]

# Authenticity Weights
WEIGHTS = {"forensic" : 0.35, "ai" : 0.30, "metadata" : 0.20, "ocr" : 0.15}

# AI probability clue weights 
AI_CLUE_WEIGHTS = {"classifier" : 0.50, "metadata" : 0.20, "ela" : 0.20, "ocr" : 0.10}

# Forensic Score
ELA_QUANITY = 90
ELA_BLOCK_SIZE = 16
ELA_SIGMA_MULTIPLIER = 2
ELA_UNUSUAL_BLOCK_FRACTION_FOR_MAX = 0.10
FORENSIC_WEIGHTS = {"ela" : 0.5, "double_compression" : 0.3, "contradiction" : 0.2}

# OCR Consistency
OCR_MIN_WORDS = 5

# Privacy risk severities 
PRIVACY_SEVERITY = {
    "id_document" : 0.90,
    "gps" : 0.70,
    "address" : 0.60,
    "face" : 0.60,
    "plate" : 0.50,
    "phone" : 0.40,
    "email" : 0.40,
    "name" : 0.30,
    "certificate" : 0.30,
    "qr" : 0.30
}

# Metadata risk points
METADATA_POINTS = {
    "ai_generator" : 60,
    "editing_software" : 40,
    "time_mismatch" : 20,
    "no_metadata" : 15,
    "no_camera" : 10,
}
TIME_MISMATCH_SECONDS = 24 * 60 * 60

# Shared image detection 
SHARED_IMAGE_SIZES = {1080, 1280, 1600, 2048}
SHARED_FILENAME_PATTERNS = [
    r"^(IMG|VID)-\d{8}-WA\d+",   # WhatsApp
    r"^WhatsApp Image",
    r"^FB_IMG_",                  # Facebook
    r"^received_\d+",             # Messenger
    r"^telegram",                 # Telegram
]

EDITING_KEYWORDS = [
    "photoshop", "gimp", "paint.net", "pixlr", "canva", "lightroom", "affinity photo",
    "corel paintshop", "capture one", "darktable", "fotor", "inpaint", "luminar",
    "on1 photo", "picmonkey", "snappa", "vsco", "photopea","picsart","snapseed","capture one"
]
AI_GENERATOR_KEYWORDS = [
    "stable diffusion", "midjourney", "dall-e", "dalle", "comfyui",
    "automatic1111", "firefly", "novelai", "leonardo.ai", "stability.ai", "sdxl",
]

#PNG text chunks that AI tools commonly write
AI_PNG_KEYS = {"parameters", "prompt", "workflow"}

# safety net: catches a typo in the weights the moment the app starts 
assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9, "Weights must add up to 1.0"
assert abs(sum(AI_CLUE_WEIGHTS.values()) - 1.0) < 1e-9, "AI clue weights must add up to 1.0"