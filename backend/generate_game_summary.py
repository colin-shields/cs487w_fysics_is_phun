import pandas as pd
import os

def generate_excel_report(game_results: list):

    """
    Converts game results into an Excel file.
    Expects a list of dicts (Each dictionary in the list represents one row in a spreadsheet)
    One object per player per round

    Example input:
    game_results = [
        {
            "Round": 1,
            "Player_Name": "Wilson",
            "Submitted_Fake": "Gravity is a magnet", # The fake they created
            "Choice_Made": "Saturn",                # The answer they picked (Real or Fake)
            "Choice_Author": "System",              # Who wrote the answer they picked
            "Times_Fooled_Others": 2                # How many people picked Wilson's fake
        },
        {
            "Round": 1,
            "Player_Name": "Aland",
            "Submitted_Fake": "Air has no weight",
            "Choice_Made": "Gravity is a magnet",
            "Choice_Author": "Wilson",              # Aland was fooled by Wilson
            "Times_Fooled_Others": 0
        }
    ]

    """

    try:
        if not game_results:
            return None
            
        df = pd.DataFrame(game_results)
        
        # Ensure columns are in a logical order for the Professor
        column_order = [
            "Round", "Player_Name", "Submitted_Fake", 
            "Choice_Made", "Choice_Author", "Times_Fooled_Others"
        ]
        
        # Only reorder if the columns actually exist in the data
        existing_columns = [col for col in column_order if col in df.columns]
        df = df[existing_columns]
        
        output_file = "Fysics_Is_Phun_Summary.xlsx"
        df.to_excel(output_file, index=False)
        
        return output_file
    except Exception as e:
        print(f"Error generating export: {e}")
        return None