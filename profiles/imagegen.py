#!/usr/bin/env python3
import os, json, requests, argparse, time
from pathlib import Path
from typing import List, Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

API_URL = "https://api.stability.ai/v2beta/stable-image/generate/core"
DEFAULT_MODEL = "sd3.5-flash"

def gen_image(prompt: str, seed: int, out_path: Path, model: str, aspect_ratio: str, cfg_scale: float, steps: int) -> None:
    headers = {
        "authorization": f"Bearer {os.environ['STABILITY_API_KEY']}",
        "accept": "image/*"
    }
    data = {
        "prompt": prompt,
        "output_format": "jpeg",
        "aspect_ratio": aspect_ratio,
        "seed": seed,
        "negative_prompt": (
            "bad anatomy, deformed, extra limbs, watermark, text, logo, "
            "crooked eyes, unrealistic skin, blurry, duplicate face"
        ),
    }
    # multipart/form-data requires a files part; a dummy key is fine when not uploading images/masks
    r = requests.post(API_URL, headers=headers, data=data, files={"none": ""}, timeout=90)
    
    if r.status_code != 200:
        print(f"[ERROR] Status code: {r.status_code}")
        print(f"[ERROR] Response: {r.text}")
        try:
            print(f"[ERROR] JSON: {r.json()}")
        except:
            pass
    
    r.raise_for_status()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "wb") as f:
        f.write(r.content)

def update_profiles_json(profiles: List[Dict[str, Any]], output_path: Path) -> None:
    tmp = output_path.with_suffix(".tmp.json")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(profiles, f, ensure_ascii=False, indent=2)
    tmp.replace(output_path)

def process(
    input_path: Path,
    output_path: Path,
    images_dir: Path,
    limit: int,
    overwrite: bool,
    model: str,
    aspect_ratio: str,
    cfg_scale: float,
    steps: int,
    delay: float,
    seed_base: int,
):
    with open(input_path, "r", encoding="utf-8") as f:
        profiles = json.load(f)

    processed = 0
    for i, p in enumerate(profiles, 1):
        if limit and processed >= limit:
            break

        pid = p.get("id") or f"profile_{i}"
        img_path = images_dir / f"{pid}.jpg"

        if not overwrite and p.get("image_url"):
            continue  # already has an image_url

        prompt = p.get("image_prompt")
        if not prompt:
            # Fallback to a minimal prompt if missing
            prompt = "portrait, half-body, natural light, shallow depth of field"
        
        # Add "looking at camera" to all prompts
        prompt = f"{prompt}, looking at camera"

        # Stable seed per profile for reproducibility
        seed = seed_base + i

        # Try up to 3 times
        for attempt in range(3):
            try:
                print(f"[INFO] Processing {pid}: {prompt[:80]}...")
                gen_image(prompt, seed, img_path, model, aspect_ratio, cfg_scale, steps)
                p["image_url"] = str(img_path.as_posix())
                processed += 1
                print(f"[SUCCESS] {pid}")
                break
            except Exception as e:
                print(f"[ERROR] Attempt {attempt + 1}/3 for {pid}: {e}")
                if attempt == 2:
                    print(f"[FAILED] {pid}: giving up after 3 attempts")
                time.sleep(0.6)

        if delay:
            time.sleep(delay)

    update_profiles_json(profiles, output_path)
    print(f"Done. Updated {processed} profile(s). JSON saved to {output_path}")

def main():
    ap = argparse.ArgumentParser(description="Batch-generate images via Stability SD 3.5 Flash and update profiles.json")
    ap.add_argument("--input", type=Path, default=Path("profiles.json"), help="Input profiles JSON")
    ap.add_argument("--output", type=Path, default=Path("profiles.json"), help="Output profiles JSON (updated in place by default)")
    ap.add_argument("--images-dir", type=Path, default=Path("images"), help="Directory to save images")
    ap.add_argument("--limit", type=int, default=0, help="Max number of profiles to process (0 = no limit)")
    ap.add_argument("--overwrite", action="store_true", help="Regenerate even if image_url already exists")
    ap.add_argument("--model", type=str, default=DEFAULT_MODEL, help="Model name, e.g. sd3.5-flash")
    ap.add_argument("--aspect-ratio", type=str, default="2:3", help="Aspect ratio: 21:9, 16:9, 3:2, 5:4, 1:1, 4:5, 2:3, 9:16, 9:21")
    ap.add_argument("--cfg-scale", type=float, default=1.2, help="CFG guidance scale (1.0–1.5 recommended)")
    ap.add_argument("--steps", type=int, default=4, help="Diffusion steps (4 for Flash)")
    ap.add_argument("--delay", type=float, default=0.0, help="Sleep between requests to ease rate limits")
    ap.add_argument("--seed-base", type=int, default=10000, help="Base seed added to profile index")
    args = ap.parse_args()

    if "STABILITY_API_KEY" not in os.environ:
        raise SystemExit("Missing STABILITY_API_KEY")

    process(
        input_path=args.input,
        output_path=args.output,
        images_dir=args.images_dir,
        limit=args.limit,
        overwrite=args.overwrite,
        model=args.model,
        aspect_ratio=args.aspect_ratio,
        cfg_scale=args.cfg_scale,
        steps=args.steps,
        delay=args.delay,
        seed_base=args.seed_base,
    )

if __name__ == "__main__":
    main()
