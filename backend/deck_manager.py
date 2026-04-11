import pandas as pd
import os
from zipfile import ZipFile, ZIP_DEFLATED

REQUIRED_COLUMNS = ['Question_ID', 'Question_Text', 'Correct_Answer', 'Predefined_Fake']
#image_link is optional but if provided must be valid
def validate_and_parse_csv(file_path: str):
    try:
        # Use keep_default_na=False to prevent empty cells from becoming "NaN" objects
        df = pd.read_csv(file_path, keep_default_na=False)
        
        if not all(col in df.columns for col in REQUIRED_COLUMNS):
            missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
            return {"status": "error", "message": f"Missing columns: {missing}"}

        parsed_questions = []
        
        for _, row in df.iterrows():
            # Get value and convert to string, default to empty string if null
            raw_img = row.get('Image_Link', "")
            img_val = str(raw_img).strip() if raw_img else ""
            
            # Only process if there's actually text there
            if img_val and img_val != "" and img_val.lower() != "nan":
                # normalize: if already a full URL or starts with /assets/, leave it
                if img_val.lower().startswith("http"):
                    pass
                elif img_val.startswith("/assets/"):
                    # already has prefix, do nothing
                    pass
                else:
                    img_val = f"/assets/{img_val}"
            else:
                img_val = None # Keep it clean if empty

            parsed_questions.append({
                "Question_ID": str(row['Question_ID']),
                "Question_Text": row['Question_Text'],
                "Correct_Answer": row['Correct_Answer'],
                "Predefined_Fake": row['Predefined_Fake'],
                "Image_Link": img_val
            })

        return {"status": "success", "data": parsed_questions}
    
    except Exception as e:
        # This will now capture the EXACT line that failed
        return {"status": "error", "message": f"Parser Error: {str(e)}"}


def zip_deck(deck_path, zip_path):
    deck = pd.read_csv(deck_path)
    imgs = pd.unique(deck['Image_Link'])
    imgs = [img for img in imgs if pd.notna(img)]  # Remove NaN values
    imgs = [f"assets/{img}" for img in imgs]
    files_to_zip = imgs + [deck_path]
    with ZipFile(zip_path, 'w', compression=ZIP_DEFLATED) as zipf:
        for file in files_to_zip:
            zipf.write(file)
            # print(f"added {file}")    # debug
        



def extract_deck(zip_path):
    os.makedirs("decks", exist_ok=True)
    os.makedirs("assets", exist_ok=True)

    with ZipFile(zip_path, 'r', compression=ZIP_DEFLATED) as zipf:
        for member in zipf.infolist():
            name = member.filename.replace("\\", "/")
            if not name or name.endswith("/"):
                continue

            base_name = os.path.basename(name)
            if not base_name:
                continue

            if name.startswith("decks/"):
                target_path = os.path.join("decks", base_name)
            elif name.startswith("assets/"):
                target_path = os.path.join("assets", base_name)
            else:
                ext = os.path.splitext(base_name)[1].lower()
                if ext == ".csv":
                    target_path = os.path.join("decks", base_name)
                else:
                    target_path = os.path.join("assets", base_name)

            with zipf.open(member) as src, open(target_path, "wb") as dst:
                dst.write(src.read())
