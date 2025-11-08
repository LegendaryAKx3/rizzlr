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

# Extensive name lists by gender
FEMALE_NAMES = [
    "Emma", "Olivia", "Ava", "Sophia", "Isabella", "Mia", "Charlotte", "Amelia", "Harper", "Evelyn",
    "Abigail", "Emily", "Elizabeth", "Sofia", "Avery", "Ella", "Scarlett", "Grace", "Chloe", "Victoria",
    "Riley", "Aria", "Lily", "Aubrey", "Zoey", "Penelope", "Lillian", "Addison", "Layla", "Natalie",
    "Camila", "Hannah", "Brooklyn", "Zoe", "Nora", "Leah", "Savannah", "Audrey", "Claire", "Eleanor",
    "Skylar", "Ellie", "Samantha", "Stella", "Paisley", "Violet", "Mila", "Allison", "Alexa", "Anna",
    "Hazel", "Aaliyah", "Ariana", "Lucy", "Caroline", "Sarah", "Genesis", "Kennedy", "Sadie", "Gabriella",
    "Madelyn", "Adeline", "Maya", "Autumn", "Aurora", "Piper", "Hailey", "Kaylee", "Ruby", "Serenity",
    "Eva", "Naomi", "Nevaeh", "Alice", "Luna", "Bella", "Quinn", "Madeline", "Peyton", "Rylee",
    "Mackenzie", "Jade", "Lydia", "Ivy", "Melanie", "Isla", "Reagan", "Julia", "Sophie", "Brielle",
    "Andrea", "Gianna", "Lila", "Kinsley", "Nina", "Sienna", "Delilah", "Willow", "Rose", "Elena",
    "Khloe", "Natalia", "Kylie", "Isabel", "Faith", "Alexandra", "Brianna", "Josephine", "Vivian", "Amy",
    "Rachel", "Jessica", "Lauren", "Isabelle", "Valeria", "Kate", "Makayla", "Nicole", "Isabela", "Kimberly",
    "Lyla", "Sara", "Melody", "Eliana", "Nicole", "Paige", "Rebecca", "Maria", "Mariah", "Trinity",
    "Ryleigh", "Katelyn", "Everly", "Alexis", "Valerie", "Jasmine", "Emilia", "Margaret", "Catherine", "Liliana",
    "Raegan", "Alina", "Iris", "June", "Freya", "Gemma", "Juliet", "Ada", "Olive", "Nora",
    "Esther", "Margot", "Diana", "Eloise", "Vera", "Hope", "Rosie", "Phoebe", "Daisy", "Harriet"
]

MALE_NAMES = [
    "Liam", "Noah", "Oliver", "Elijah", "James", "William", "Benjamin", "Lucas", "Henry", "Alexander",
    "Mason", "Michael", "Ethan", "Daniel", "Jacob", "Logan", "Jackson", "Levi", "Sebastian", "Mateo",
    "Jack", "Owen", "Theodore", "Aiden", "Samuel", "Joseph", "John", "David", "Wyatt", "Matthew",
    "Luke", "Asher", "Carter", "Julian", "Grayson", "Leo", "Jayden", "Gabriel", "Isaac", "Lincoln",
    "Anthony", "Hudson", "Dylan", "Ezra", "Thomas", "Charles", "Christopher", "Jaxon", "Maverick", "Josiah",
    "Isaiah", "Andrew", "Elias", "Joshua", "Nathan", "Caleb", "Ryan", "Adrian", "Miles", "Eli",
    "Nolan", "Christian", "Aaron", "Cameron", "Ezekiel", "Colton", "Luca", "Landon", "Hunter", "Jonathan",
    "Santiago", "Axel", "Easton", "Cooper", "Jeremiah", "Angel", "Roman", "Connor", "Jameson", "Robert",
    "Greyson", "Jordan", "Ian", "Carson", "Jaxson", "Leonardo", "Nicholas", "Dominic", "Austin", "Everett",
    "Brooks", "Xavier", "Kai", "Jose", "Parker", "Adam", "Jace", "Wesley", "Kayden", "Silas",
    "Bennett", "Declan", "Waylon", "Weston", "Evan", "Emmett", "Micah", "Ryder", "Beau", "Damian",
    "Brayden", "Gael", "Rowan", "Harrison", "Bryson", "Sawyer", "Amir", "Kingston", "Jason", "Giovanni",
    "Vincent", "Ayden", "Chase", "Myles", "Diego", "Nathaniel", "Legend", "Jonah", "River", "Tyler",
    "Cole", "Braxton", "George", "Milo", "Zachary", "Ashton", "Luis", "Jasper", "Kaiden", "Adriel",
    "Gavin", "Bentley", "Calvin", "Zion", "Juan", "Maxwell", "Max", "Ryker", "Carlos", "Emmanuel",
    "Jayce", "Lorenzo", "Ivan", "Jude", "August", "Kevin", "Malachi", "Elliott", "Rhett", "Archer"
]

# Comprehensive interests pool
ALL_INTERESTS = [
    # Sports & Fitness
    "trail running", "bouldering", "rock climbing", "pilates", "hot yoga", "CrossFit", "kickboxing", "swimming",
    "beach volleyball", "ultimate frisbee", "soccer", "basketball", "tennis", "badminton", "pickleball",
    "skateboarding", "longboarding", "roller skating", "ice skating", "snowboarding", "skiing", "surfing",
    "boxing", "MMA", "jiu-jitsu", "muay thai", "capoeira", "parkour", "slacklining", "paddle boarding",
    # Arts & Creativity
    "film photography", "digital art", "watercolor painting", "ceramics", "pottery", "sculpting", "woodworking",
    "embroidery", "knitting", "crocheting", "jewelry making", "candle making", "soap making", "scrapbooking",
    "calligraphy", "lettering", "graffiti", "street art", "mural painting", "printmaking", "illustration",
    # Food & Drink
    "third wave coffee", "matcha lattes", "bubble tea", "craft beer", "wine tasting", "mixology", "cocktail making",
    "sushi omakase", "ramen hopping", "taco hunting", "izakaya bars", "dim sum", "pho", "Korean BBQ", "Ethiopian food",
    "sourdough baking", "pasta making", "fermentation", "pickling", "smoking meats", "BBQ", "meal prepping",
    "vegan cooking", "keto baking", "Thai food", "Indian cuisine", "sushi rolling", "cheese making", "kombucha brewing",
    # Music & Performance
    "indie concerts", "jazz clubs", "EDM festivals", "metal shows", "punk shows", "classical concerts", "opera",
    "karaoke", "open mic nights", "poetry slams", "improv comedy", "stand-up comedy", "theater", "musicals",
    "DJing", "producing beats", "piano", "guitar", "drums", "ukulele", "singing", "beatboxing",
    "bass guitar", "violin", "cello", "saxophone", "trumpet", "DJ scratching", "electronic music production",
    # Culture & Learning
    "museum hopping", "art galleries", "street art tours", "architecture tours", "historical sites",
    "street festivals", "food trucks", "farmers markets", "flea markets", "vintage shopping", "thrifting", "record stores",
    "language exchange", "learning Spanish", "learning Japanese", "learning French", "learning Korean", "Duolingo streaks",
    "philosophy reading", "poetry writing", "creative writing", "blogging", "podcasting", "documentary watching",
    # Nature & Outdoors
    "houseplants", "succulents", "gardening", "urban farming", "composting", "bonsai trees",
    "weekend road trips", "camping", "hiking", "backpacking", "van life", "travel hacking", "spontaneous adventures",
    "sunset watching", "stargazing", "astrophotography", "nature photography", "bird watching", "foraging",
    "kayaking", "canoeing", "fishing", "mountain biking", "trail biking", "overlanding", "geocaching",
    # Games & Entertainment
    "retro gaming", "board game nights", "D&D", "Magic the Gathering", "chess", "escape rooms", "trivia nights",
    "video game speedruns", "Pokemon", "Animal Crossing", "Zelda", "Dark Souls", "indie games", "VR gaming",
    "tabletop RPGs", "card games", "puzzle solving", "Rubik's cubes", "sudoku", "crosswords",
    # Wellness & Mindfulness
    "cold plunges", "sauna sessions", "meditation", "breathwork", "journaling", "bullet journaling",
    "yoga nidra", "sound baths", "reiki", "aromatherapy", "crystal healing", "tarot reading", "astrology",
    # Fashion & Style
    "vintage fashion", "streetwear", "sneaker culture", "thrift flips", "upcycling", "DIY projects",
    "minimalist wardrobe", "sustainable fashion", "Y2K fashion", "cottagecore", "dark academia", "indie fashion",
    # Media & Pop Culture
    "true crime podcasts", "horror movies", "anime", "manga", "graphic novels", "sci-fi books", "fantasy novels",
    "K-dramas", "reality TV", "cooking shows", "true crime documentaries", "film analysis", "movie marathons",
    "comic books", "webtoons", "audiobooks", "book clubs", "literary fiction", "mystery novels",
    # Tech & Digital
    "coding", "web development", "app development", "game development", "3D modeling", "video editing",
    "photo editing", "digital marketing", "crypto", "NFTs", "AI art", "drone photography", "streaming",
    # Social & Community
    "volunteering", "community organizing", "activism", "environmental conservation", "animal rescue",
    "mentoring", "coaching", "teaching", "tutoring", "public speaking", "networking events",
    # Nightlife & Social
    "techno raves", "house music", "vinyl collecting", "cassette tapes", "concert photography", "festival hopping",
    "bar hopping", "brewery tours", "wine bars", "speakeasies", "rooftop bars", "dive bars", "live music venues",
    # Hobbies & Collections
    "coin collecting", "stamp collecting", "action figures", "Funko Pops", "vintage toys", "sneaker collecting",
    "vinyl records", "rare books", "antiques", "watches", "fountain pens", "Lego building", "model trains"
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

def llm_make_profile(idx, model, gender):
    # Construct hints for more varied prompts
    tone_hint = random.choice(TONES)
    texting_style = random.choice(TEXTING_STYLES)
    occupation_hint = random.choice(OCCUPATION_SEEDS)
    variety = generate_variety_hints()
    
    # Pick name, age, and interests based on gender
    name = random.choice(FEMALE_NAMES if gender == "female" else MALE_NAMES)
    age = random_age()
    interests = random.sample(ALL_INTERESTS, k=3)

    system_msg = (
        "You generate fictional dating-app profiles for adults aged 18–23. "
        "Create engaging, specific content. Avoid public figures. "
        "No city field. Keep bios SHORT - maximum 2 sentences. Use natural, flirt-forward style. "
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
- id: {idx} (just the number)
- display_name: "{name}" (already chosen)
- age: {age} (already set)
- gender: "{gender}" (already set)
- interests: {interests} (already chosen - use these exact interests)
- keep bio to MAXIMUM 2 SHORT SENTENCES, should NOT contain their name
- no city field
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
"id": {idx},
"display_name": "{name}",
"age": {age},
"gender": "{gender}",
"occupation": "short phrase",
"interests": {interests} (use these EXACT interests),
"texting_style": "short phrase",
"bio": "MAXIMUM 2 short sentences, specific and flirty - do NOT mention {name}",
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
            obj["id"] = idx
            obj["display_name"] = name
            obj["gender"] = gender
            obj["interests"] = interests
            obj["age"] = age
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
                obj["id"] = idx
                obj["display_name"] = name
                obj["gender"] = gender
                return obj
            except Exception:
                continue
    raise RuntimeError(f"Failed to create profile {idx}: {last_err}")

def local_fallback(idx, gender):
    # Fallback when no API key. Short bios, varied tones and occupations.
    name = random.choice(FEMALE_NAMES if gender == "female" else MALE_NAMES)
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
        f"dating-app portrait, {gender}, appears {age}, {v['shot_type']}, {v['angle']}, "
        f"{v['time_of_day']}, {v['lighting']}, {v['background']}, outfit {v['outfit']}, "
        f"palette {v['palette']}, hair {v['hair']}, expression {v['expression']}, "
        f"accessories {v['accessories']}, {v['composition']}, realistic skin texture, shallow depth of field"
    )
    return {
        "id": idx,
        "display_name": name,
        "age": age,
        "gender": gender,
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
        gender = genders[i-1]  # Pick gender FIRST
        if has_api():
            p = llm_make_profile(i, model=model, gender=gender)
        else:
            p = local_fallback(i, gender=gender)
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
