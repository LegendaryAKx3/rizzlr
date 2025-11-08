#!/usr/bin/env python3
import json, os, random, argparse, time, sys
from datetime import date
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Cached Groq client
_groq_client = None

AGE_MIN, AGE_MAX = 18, 23
DEFAULT_MODEL = "llama-3.3-70b-versatile"

# Expanded tones and occupations for variety
TONES = [
    "flirty","witty","curious","supportive","calm","sarcastic","poetic","confident",
    "mysterious","goofy","sincere","deadpan","bold","romantic","adventurous","nerdy",
    "spicy","wholesome","teasing","playful","snarky","dreamy","chaotic"
]

OCCUPATION_SEEDS = [
    # students
    "computer science student","electrical engineering student","mechanical engineering student",
    "biomedical science student","psychology student","economics student","finance student",
    "marketing student","architecture student","industrial design student","journalism student",
    "film student","music conservatory student","art history student","nursing student",
    # part-time / early career
    "barista","mixology trainee","line cook","photography assistant","wedding videography assistant",
    "personal trainer","yoga instructor trainee","camp counselor","research assistant",
    "lab technician","bookstore clerk","vintage shop associate","social media coordinator",
    "junior data analyst","frontend intern","backend intern","product design intern",
    "sales development rep","customer success rep","tour guide","museum docent",
    "bike courier","lifeguard","tutor","math TA","resident advisor"
]

TEXTING_STYLES = [
    "playful and flirty with quick replies",
    "warm, curious, asks specific follow-ups",
    "dry wit, short messages, teasing humor",
    "enthusiastic and supportive",
    "chill, lowercase, concise",
    "story-first with little scene-painting"
]

# Boundaries excluding any PG/explicit language rule
BOUNDARIES = [
    "no requests for personal contact info",
    "no financial asks",
    "keep conversation within app"
]

# Example flirty pickup line openers
EXAMPLE_OPENERS = [
    "Are you a magician? Because whenever I look at your profile, everyone else disappears",
    "Do you believe in love at first swipe, or should I unmatch and swipe right again?",
    "I'm not a photographer, but I can definitely picture us together"
]

def has_api():
    return bool(os.getenv("GROQ_API_KEY"))

def get_groq_client():
    """Get cached Groq client instance"""
    global _groq_client
    if _groq_client is None:
        from groq import Groq
        _groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    return _groq_client

def call_llm(prompt, model, max_tokens=700, temperature=0.95):
    client = get_groq_client()
    resp = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return resp.choices[0].message.content.strip()

def ensure_json(text):
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        text = text[start:end+1]
    return json.loads(text)

def random_age():
    return random.randint(AGE_MIN, AGE_MAX)

def generate_variety_hints():
    # Extra knobs the LLM can pick up for image variety
    shot_type = random.choice([
        "torso-up", "half-body", "three-quarter", "portrait orientation"
    ])
    angle = random.choice([
        "eye-level", "slight high-angle", "slight low-angle", "candid over-shoulder"
    ])
    time_of_day = random.choice([
        "morning light", "soft midday shade", "golden hour", "blue hour", "neon-lit evening"
    ])
    lighting = random.choice([
        "soft natural light", "window light", "backlit rim light", "open shade", "gentle overcast"
    ])
    background = random.choice([
        "cafe interior with depth-of-field bokeh",
        "city sidewalk with soft bokeh",
        "park greenery at golden hour",
        "brick wall with soft shadows",
        "minimal apartment backdrop",
        "beach boardwalk",
        "festival lights"
    ])
    outfit = random.choice([
        "casual tee and denim", "light knit sweater", "button-up and rolled sleeves",
        "summer dress", "athleisure hoodie", "streetwear jacket", "linen shirt",
        "graphic tee and layered necklace"
    ])
    palette = random.choice([
        "neutral earth tones", "soft pastels", "warm oranges and ambers",
        "cool blues and teals", "monochrome minimal"
    ])
    hair = random.choice([
        "short textured", "fade with curls", "medium wavy", "long straight",
        "curly bob", "messy bun", "loose waves"
    ])
    expression = random.choice([
        "soft smile", "smirk", "laughing candid", "gentle grin", "thoughtful gaze"
    ])
    accessories = random.choice([
        "small hoops", "simple pendant", "watch", "rings", "beanie", "sunglasses on head", "none"
    ])
    composition = random.choice([
        "rule of thirds", "centered composition", "leading lines", "shallow depth of field"
    ])
    return {
        "shot_type": shot_type,
        "angle": angle,
        "time_of_day": time_of_day,
        "lighting": lighting,
        "background": background,
        "outfit": outfit,
        "palette": palette,
        "hair": hair,
        "expression": expression,
        "accessories": accessories,
        "composition": composition
    }

def llm_make_profile(idx, model):
    # Construct hints for more varied prompts
    tone_hint = random.choice(TONES)
    texting_style = random.choice(TEXTING_STYLES)
    occupation_hint = random.choice(OCCUPATION_SEEDS)
    variety = generate_variety_hints()

    system_msg = (
        "You generate fictional dating-app profiles for adults aged 18–23. "
        "Create engaging, specific content. Avoid public figures. "
        "Generate a realistic full name that matches the gender (male or female only). "
        "No city field. Keep bios short. Use natural, flirt-forward style if it fits the persona. "
        "Return strict JSON only with the specified fields."
    )

    schema_keys = [
        "id","display_name","age","gender","occupation",
        "interests","texting_style","bio",
        "image_prompt","boundaries","created_on",
        "persona_card"
    ]

    # Ask the LLM to produce short, punchy bios and a richly varied image prompt
    prompt = f"""
System:
{system_msg}

User:
Create one profile. Follow this contract:
- display_name: generate a realistic full name that clearly matches the gender
- age: integer between {AGE_MIN} and {AGE_MAX}
- gender: ONLY "female" or "male" (no nonbinary option)
- keep bio to 1–2 sentences
- no city field
- interests: 5–8 concrete items
- texting_style: concise description of how they text
- image_prompt: dating-profile portrait prompt that integrates visual details
- persona_card.voice should match texting_style
- persona_card.tone should be one of {TONES}
- persona_card.opener_examples: 3 FLIRTY PICKUP LINES (not questions, actual pickup lines)

Example pickup lines:
{EXAMPLE_OPENERS}

Variety hints you may use:
tone: {tone_hint}
occupation seed: {occupation_hint}
texting_style seed: {texting_style}
image variety:
- shot_type: {variety['shot_type']}
- angle: {variety['angle']}
- time_of_day: {variety['time_of_day']}
- lighting: {variety['lighting']}
- background: {variety['background']}
- outfit: {variety['outfit']}
- palette: {variety['palette']}
- hair: {variety['hair']}
- expression: {variety['expression']}
- accessories: {variety['accessories']}
- composition: {variety['composition']}

Output:
Return only a minified JSON object with these exact keys in any order:
{schema_keys}

Field details:
"id": "profile_{idx}",
"display_name": "generate realistic full name matching gender",
"age": integer,
"gender": "female|male",
"occupation": "short phrase",
"interests": ["..."],
"texting_style": "short phrase",
"bio": "1–2 sentences, specific, flirty, engaging",
"image_prompt": "explicit, richly detailed portrait prompt that includes age appearance, gender presentation, {variety['shot_type']}, {variety['angle']}, {variety['time_of_day']}, {variety['lighting']}, {variety['background']}, {variety['outfit']}, {variety['palette']}, {variety['hair']}, {variety['expression']}, {variety['accessories']}, {variety['composition']}, realistic skin texture, shallow depth of field",
"boundaries": {BOUNDARIES},
"created_on": "{str(date.today())}",
"persona_card": {{
  "voice": "reuse texting_style",
  "tone": "{tone_hint}",
  "opener_examples": ["3 flirty pickup lines - NOT questions, actual pickup lines like the examples"],
  "hard_boundaries": {BOUNDARIES},
  "soft_prefs": ["keep replies under 2 sentences when possible", "avoid using emojis unless it really makes sense"]
}}
"""

    last_err = None
    for _ in range(3):
        try:
            raw = call_llm(prompt, model=model, max_tokens=700, temperature=0.95)
            obj = ensure_json(raw)

            # Post-fixes
            obj["id"] = f"profile_{idx}"
            obj["age"] = int(obj.get("age", random_age()))
            if obj["age"] < AGE_MIN or obj["age"] > AGE_MAX:
                obj["age"] = random_age()
            obj.setdefault("boundaries", BOUNDARIES)
            obj.setdefault("created_on", str(date.today()))
            pc = obj.get("persona_card", {})
            pc.setdefault("voice", obj.get("texting_style", texting_style))
            # ensure tone is from our list
            if pc.get("tone") not in TONES:
                pc["tone"] = random.choice(TONES)
            # remove any follow-up instruction if model added it
            sp = pc.get("soft_prefs", [])
            sp = [s for s in sp if "follow-up" not in s.lower() and "follow up" not in s.lower()]
            if not sp:
                sp = ["keep replies under 2 sentences when possible"]
            pc["soft_prefs"] = sp
            obj["persona_card"] = pc
            return obj
        except Exception as e:
            last_err = e
            try:
                fix = call_llm(
                    f"Return valid JSON only for this malformed output:\n{raw}",
                    model=model,
                    max_tokens=600,
                    temperature=0.0
                )
                obj = ensure_json(fix)
                obj["id"] = f"profile_{idx}"
                return obj
            except Exception:
                continue
    raise RuntimeError(f"Failed to create profile {idx}: {last_err}")

def local_fallback(idx):
    # Fallback when no API key. Short bios, varied tones and occupations.
    g = random.choice(["female","male"])
    
    # Gender-appropriate names
    if g == "female":
        firsts = ["Maya","Elena","Zara","Nina","Ivy","Anya","Mila","Freya","Sofia","Yara","Mina","Chloe","Stella","Jade","Ruby","Iris","Hazel","Violet","Aria","Sienna","Luna"]
    else:
        firsts = ["Liam","Noah","Jonah","Felix","Kenji","Theo","Hugo","Ishaan","Levi","Rohan","Niko","Kai","Ezra","Jude","Finn","Asher","Elias","Oliver","Miles","Leo","Max"]
    
    lasts = ["Smith","Johnson","Garcia","Lopez","Nguyen","Martin","Brown","Davis","Lee","Wilson","Anderson","Taylor","Moore","Jackson","Perez","Clark","Lewis","Walker","Young","Allen","Rivera","Cruz","Ramirez","Brooks"]
    name = f"{random.choice(firsts)} {random.choice(lasts)}"
    age = random.randint(AGE_MIN, AGE_MAX)
    occ = random.choice(OCCUPATION_SEEDS)
    interests = random.sample([
        "trail running","bouldering","pilates","tennis","film photography","ceramics",
        "third wave coffee","sushi omakase","ramen hopping","indie concerts","stand-up comedy",
        "museum hopping","street festivals","karaoke","thrifting","houseplants","weekend road trips",
        "language exchange","learning Spanish","learning Japanese","DJing","piano","guitar","beach volleyball",
        "retro games","board game nights","sunset picnics","cold plunges"
    ], k=7)
    values = random.sample([
        "curiosity","kindness","humor","honesty","loyalty","ambition","playfulness",
        "adventure","spontaneity","learning","health","empathy","authenticity","creativity",
        "confidence","openness","growth","independence","respect"
    ], k=4)
    style = random.choice(TEXTING_STYLES)
    bio = f"{name.split()[0]}, {age}. {occ.capitalize()} who plans weekends around {interests[0]} and {interests[1]}. I’m big on {values[0]} and {values[1]}. Steal my hoodie or my playlist if you dare."
    # Build varied prompt
    v = generate_variety_hints()
    image_prompt = (
        f"dating-app portrait, {g}, appears {age}, {v['shot_type']}, {v['angle']}, "
        f"{v['time_of_day']}, {v['lighting']}, {v['background']}, outfit {v['outfit']}, "
        f"palette {v['palette']}, hair {v['hair']}, expression {v['expression']}, "
        f"accessories {v['accessories']}, {v['composition']}, realistic skin texture, shallow depth of field"
    )
    return {
        "id": f"profile_{idx}",
        "display_name": name,
        "age": age,
        "gender": g,
        "occupation": occ,
        "interests": interests,
        "texting_style": style,
        "bio": bio,
        "image_prompt": image_prompt,
        "boundaries": BOUNDARIES,
        "created_on": str(date.today()),
        "persona_card": {
            "voice": style,
            "tone": random.choice(TONES),
            "opener_examples": EXAMPLE_OPENERS,
            "hard_boundaries": BOUNDARIES,
            "soft_prefs": ["keep replies under 2 sentences when possible"]
        }
    }

def print_progress_bar(current, total, bar_length=40):
    """Print a progress bar to stdout"""
    percent = current / total
    filled = int(bar_length * percent)
    bar = '█' * filled + '░' * (bar_length - filled)
    sys.stdout.write(f'\r[{bar}] {current}/{total} ({percent*100:.1f}%)')
    sys.stdout.flush()
    if current == total:
        sys.stdout.write('\n')

def generate_profiles(count, model, sleep_s):
    profiles = []
    # 50-50 male/female split only
    half = count // 2
    genders = ["male"] * half + ["female"] * (count - half)
    random.shuffle(genders)

    print(f"Generating {count} profiles...")
    for i in range(1, count + 1):
        if has_api():
            p = llm_make_profile(i, model=model)
            p["gender"] = genders[i-1]  # enforce split
        else:
            p = local_fallback(i)
            p["gender"] = genders[i-1]
        profiles.append(p)
        print_progress_bar(i, count)
        if sleep_s > 0:
            time.sleep(sleep_s)
    return profiles

def main():
    ap = argparse.ArgumentParser(description="LLM-first dating-app profile seeder with richer tones and image prompts")
    ap.add_argument("--count", type=int, default=300)
    ap.add_argument("--output", type=str, default="profiles.json")
    ap.add_argument("--model", type=str, default=DEFAULT_MODEL)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--sleep", type=float, default=0.0, help="sleep between LLM calls")
    args = ap.parse_args()

    random.seed(args.seed)
    
    start_time = time.time()
    profiles = generate_profiles(args.count, args.model, args.sleep)
    elapsed = time.time() - start_time

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(profiles, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ Successfully wrote {len(profiles)} profiles to {args.output}")
    print(f"⏱️  Time elapsed: {elapsed:.2f} seconds ({elapsed/len(profiles):.2f}s per profile)")

if __name__ == "__main__":
    main()
