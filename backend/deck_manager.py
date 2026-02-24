import pandas as pd
import os

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
                if not img_val.lower().startswith("http"):
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