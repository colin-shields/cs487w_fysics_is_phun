from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
from deck_manager import validate_and_parse_csv
from generate_game_summary import generate_excel_report
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from typing import List, Optional

import shutil
import os
import uuid

load_dotenv()

app = FastAPI()
# CORS: allow the Vite dev server (React) to call this API from the browser.
# Vite default dev URL is http://localhost:5173
# If your dev server runs on a different port, update this list.

# Ensure folders exist before mounting
if not os.path.exists("assets"): os.makedirs("assets")
if not os.path.exists("decks"): os.makedirs("decks")

# This makes the images accessible at http://localhost:8000/assets/saturn.jpg
app.mount("/assets", StaticFiles(directory="assets"), name="assets")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Verify the server is alive."""
    return {"message": "Backend API is active"}

@app.post("/upload-deck")
async def upload_deck(
    file: UploadFile = File(...), 
    images: Optional[List[UploadFile]] = None 
):
    try:
        # 1. Create folders if they don't exist
        if not os.path.exists("decks"): os.makedirs("decks")
        if not os.path.exists("assets"): os.makedirs("assets")

        # 2. Save the CSV
        csv_path = f"decks/{file.filename}"
        with open(csv_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 3. Save Images only if they exist
        if images:
            for img in images:
                if img.filename:
                    img_path = f"assets/{img.filename}"
                    with open(img_path, "wb") as buffer:
                        shutil.copyfileobj(img.file, buffer)

        # 4. Parse the CSV
        # We wrap this in a sub-try so we can tell if the CSV parser is the culprit
        try:
            result = validate_and_parse_csv(csv_path)
        except Exception as parse_error:
            return {"deck_id": file.filename, "error": f"CSV Parse Failed: {str(parse_error)}"}
        
        return {"deck_id": file.filename, "questions": result}

    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        return {"error": str(e)}
    
# Temporary storage for active games
active_sessions = {}

class SessionRequest(BaseModel):
    deck_id: str

@app.post("/create-session")
async def create_session(request: SessionRequest):
    # Use the deck_id from the request body
    deck_id = request.deck_id
    
    room_code = str(uuid.uuid4())[:4].upper()
    
    active_sessions[room_code] = {
        "deck_id": deck_id,
        "players": [],
        "status": "lobby"
    }
    
    return {"room_code": room_code}

# A simple model to handle the incoming player data
class JoinRequest(BaseModel):
    room_code: str
    player_name: str

@app.post("/join-session")
async def join_session(request: JoinRequest):
    """
    Allows a player to join a lobby using a 4-character room code.
    """
    code = request.room_code.upper()
    
    # 1. Check if the room exists in our active_sessions dictionary
    if code not in active_sessions:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # 2. Check if the game is already started
    if active_sessions[code]["status"] != "lobby":
        raise HTTPException(status_code=400, detail="Game already in progress")
    
    # 3. Add the player to the list
    active_sessions[code]["players"].append(request.player_name)
    
    return {
        "message": f"Welcome {request.player_name}!",
        "current_players": active_sessions[code]["players"]
    }

@app.get("/session-status/{room_code}")
async def get_session_status(room_code: str):
    """Returns the current list of players and game status for a specific room."""
    code = room_code.upper()
    if code not in active_sessions:
        raise HTTPException(status_code=404, detail="Room not found")
    
    return {
        "room_code": code,
        "status": active_sessions[code]["status"],
        "players": active_sessions[code]["players"]
    }