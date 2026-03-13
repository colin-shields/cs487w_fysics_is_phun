from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Header, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
from deck_manager import validate_and_parse_csv
from generate_game_summary import generate_excel_report
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from typing import List, Optional
import pandas as pd
from dotenv import load_dotenv
load_dotenv()
from host_auth import validate_host_code

import shutil
import os
import uuid


app = FastAPI()
# CORS: allow the Vite dev server (React) to call this API from the browser.
# Vite default dev URL is http://localhost:5173
# If your dev server runs on a different port, update this list.

# Ensure folders exist before mounting
if not os.path.exists("assets"): os.makedirs("assets")
if not os.path.exists("decks"): os.makedirs("decks")

#
class QuestionModel(BaseModel):
    Question_ID: str
    Question_Text: str
    Correct_Answer: str
    Predefined_Fake: str
    Image_Link: Optional[str] = ""

class CreateDeckRequest(BaseModel):
    name: str  # e.g., "science_quiz.csv"
    questions: List[QuestionModel]

# This makes the images accessible at http://localhost:8000/assets/saturn.jpg
app.mount("/assets", StaticFiles(directory="assets"), name="assets")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://cs487wfysicsisphun.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def require_host(x_host_code: str = Header(None, alias="X-Host-Code")):
    """
    Simple API-key gate:
    - frontend sends: X-Host-Code: <code>
    - backend checks against HOST_CODE in .env
    """
    if not validate_host_code(x_host_code):
        raise HTTPException(status_code=401, detail="Invalid or missing host code")
    return True

@app.get("/")
async def root():
    """Verify the server is alive."""
    return {"message": "Backend API is active"}

@app.get("/host/verify")
async def host_verify(_ok: bool = Depends(require_host)):
    """
    Returns 200 only if X-Host-Code is correct.
    Frontend uses this to validate the code during "login".
    """
    return {"ok": True}

@app.post("/upload-deck")
async def upload_deck(
    file: UploadFile = File(...), 
    images: Optional[List[UploadFile]] = None,

    _ok: bool = Depends(require_host), #protected endpoint
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

# Websocket connections per room code (uppercase)
session_sockets: Dict[str, List[WebSocket]] = {}

class SessionRequest(BaseModel):
    deck_id: str
    enable_worst_fake: bool = False

@app.post("/create-session")
async def create_session(request: SessionRequest):
    # Use the deck_id from the request body
    deck_id = request.deck_id
    
    room_code = str(uuid.uuid4())[:4].upper()
    
    active_sessions[room_code] = {
        "deck_id": deck_id,
        "players": [],
        "player_avatars": {},
        "jurors": [],
        "status": "lobby",
        "enable_worst_fake": request.enable_worst_fake,
        "current_index": None,
        "current_correct_answer": "",
        "submissions": {},       # questionIndex -> [ {player, text}, ... ]
        "choices": {},           # questionIndex -> { player: answer }
        "scores": {},            # player -> float score
        "jury_votes": {},        # questionIndex -> { juror_name: { best: player_name, worst: player_name|None } }
        "round_breakdown": {},   # questionIndex -> { player: { correct_pts, fool_pts, jury_best_pts, jury_worst_pts } }
    }
    
    return {"room_code": room_code}

# A simple model to handle the incoming player data
class JoinRequest(BaseModel):
    player_type: Optional[str] = None  # "player" or "juror"
    room_code: str
    player_name: str
    avatar_url: Optional[str] = None

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
    if request.player_type == "player" or not request.player_type:
        active_sessions[code]["players"].append(request.player_name)
        avatar_url = (request.avatar_url or "").strip()
        if avatar_url:
            active_sessions[code].setdefault("player_avatars", {})[request.player_name] = avatar_url
    
    elif request.player_type == "juror":
        active_sessions[code]["jurors"].append(request.player_name)

    return {
        "message": f"Welcome {request.player_name}!",
        "current_players": active_sessions[code]["players"],
        "current_jurors": active_sessions[code]["jurors"],
        "avatar_url": active_sessions[code].get("player_avatars", {}).get(request.player_name, ""),
    }

@app.get("/session-status/{room_code}")
async def get_session_status(room_code: str):
    """Returns the current list of players and game status for a specific room."""
    code = room_code.upper()
    if code not in active_sessions:
        raise HTTPException(status_code=404, detail="Room not found")
    
    sess = active_sessions[code]

    ret = {
        "room_code": code,
        "status": sess["status"],
        "players": sess["players"],
        "player_avatars": sess.get("player_avatars", {}),
        "jurors": sess["jurors"],
        "scores": sess["scores"],
        "enable_worst_fake": sess.get("enable_worst_fake", False),
        "scoreboard": list(zip(sess["scores"].keys(), sess["scores"].values())),
        "submissions": sess.get("submissions", {}),
        "choices": sess.get("choices", {}),
        "round_breakdown": sess.get("round_breakdown", {}),
    }  
    if sess.get("current_index") is not None:
        ret["current_index"] = sess["current_index"]
    return ret

@app.delete("/session/{room_code}")
async def cancel_session(room_code: str, _ok: bool = Depends(require_host)):
    """
    Cancels/terminates a session. Sets status to 'cancelled' so players are notified.
    Host can call this when exiting the lobby to end the game.
    """
    code = room_code.upper()
    if code not in active_sessions:
        raise HTTPException(status_code=404, detail="Room not found")
    
    active_sessions[code]["status"] = "cancelled"
    # also notify connected websockets
    if code in session_sockets:
        for ws in session_sockets[code][:]:
            try:
                await ws.send_json({"type": "cancelled"})
            except Exception:
                pass
    
    return {"message": f"Session {code} has been cancelled"}



@app.websocket("/ws/session/{room_code}")
async def session_ws(websocket: WebSocket, room_code: str):
    # debug info for every handshake attempt
    print(f"WebSocket connect attempt room={room_code}, origin={websocket.headers.get('origin')}")
    # Upgrade connection
    await websocket.accept()
    print(f"WebSocket accepted for room={room_code}")

    code = room_code.upper()
    # reject if session doesn't exist
    if code not in active_sessions:
        print(f"WebSocket rejected: room {code} not found")
        await websocket.close(code=1008)
        return

    # register
    session_sockets.setdefault(code, []).append(websocket)
    print(f"Registered socket for {code}; total connections={len(session_sockets[code])}")

    # send current question immediately if one exists
    sess = active_sessions.get(code)
    if sess:
        idx = sess.get("current_index")
        if idx is not None:
            payload = {"type": "question", "index": idx}
            if "current_question" in sess:
                payload["question"] = sess["current_question"]
            await websocket.send_json(payload)
            print(f"Sent initial question payload to new client for room={code}")

    try:
        while True:
            msg = await websocket.receive_json()
            print(f"Received ws msg for room={code}: {msg}")
            # expected format: {type:'question', index:..., question: {...}}
            if msg.get("type") == "question":
                # update session data
                active_sessions[code]["status"] = "in-progress"
                active_sessions[code]["current_index"] = msg.get("index")
                active_sessions[code]["current_question"] = msg.get("question")
                active_sessions[code]["current_correct_answer"] = msg.get("correctAnswer")
                # broadcast to all peers except sender
                for ws in session_sockets.get(code, [])[:]:
                    if ws is websocket:
                        continue
                    try:
                        await ws.send_json(msg)
                    except WebSocketDisconnect:
                        session_sockets[code].remove(ws)
                    except Exception:
                        pass
            elif msg.get("type") == "cancelled": # host is cancelling the game
                for ws in session_sockets.get(code, [])[:]: # broadcast to all peers except sender
                    if ws is websocket: 
                        continue
                    try:
                        await ws.send_json({"type":"cancelled"}) # notify clients to exit
                    except Exception:
                        pass
            elif msg.get("type") == "fake":
                # a player submitted a fake answer
                player = msg.get("player")
                text = msg.get("text")
                idx = active_sessions[code].get("current_index") # which question index is this for?
                subs = active_sessions[code].setdefault("submissions", {}) # questionIndex -> [ {player, text}, ... ]. setdefault works by returning the existing value if key exists, or setting it to the provided default (empty dict here) and returning that if key doesn't exist. This way we ensure there's always a dict to work with for "submissions".
                subs.setdefault(idx, []).append({"player": player, "text": text}) # store the submission in our session state for later retrieval during answer reveal
                # broadcast to host (and others) that a submission arrived
                for ws in session_sockets.get(code, [])[:]:
                    if ws is websocket:
                        continue
                    try:
                        await ws.send_json({"type": "submission", "player": player})
                    except Exception:
                        pass
            elif msg.get("type") == "answers":
                # host is requesting answer reveal; msg.answers contains the base list (correct + predefined)
                idx = active_sessions[code].get("current_index")
                # gather player-submitted fakes for this question
                subs = active_sessions[code].get("submissions", {}).get(idx, [])
                const_list = list(msg.get("answers") or []) # start with the correct + predefined fakes sent by host
                for entry in subs:
                    # entry has {player, text}
                    const_list.append(entry.get("text"))
                # optional: randomize order to hide which is correct
                import random
                random.shuffle(const_list)
                # broadcast final list
                for ws in session_sockets.get(code, [])[:]:
                    try:
                        await ws.send_json({"type": "answers", "answers": const_list})
                    except Exception:
                        pass
            elif msg.get("type") == "choice":
                # player chose an answer during answer phase
                player = msg.get("player")
                choice = msg.get("answer")
                idx = active_sessions[code].get("current_index")
                correct = active_sessions[code].get("current_correct_answer", "")
                if choice and correct and choice.strip().lower() == correct.strip().lower():
                    # correct answer chosen — +1 to this player
                    active_sessions[code]["scores"][player] = active_sessions[code]["scores"].get(player, 0) + 1
                elif choice:
                    # wrong answer — find which player submitted this as their fake and give them +1
                    subs = active_sessions[code].get("submissions", {}).get(idx, [])
                    for entry in subs:
                        if entry.get("text", "").strip().lower() == choice.strip().lower():
                            author = entry.get("player")
                            if author and author != player:
                                active_sessions[code]["scores"][author] = active_sessions[code]["scores"].get(author, 0) + 1
                            break
                # record the choice for stats
                choices = active_sessions[code].setdefault("choices", {})
                choices.setdefault(idx, []).append({"player": player, "text": choice})
            elif msg.get("type") == "results_request":
                # host wants to see results for current question
                idx = active_sessions[code].get("current_index")
                correct = active_sessions[code].get("current_correct_answer")
                # attempt to read correct from stored question object if saved
                # but simpler: host will resend correct as part of message
                # server can compute stats based on stored choices
                stats = {}
                choices = active_sessions[code].get("choices", {}).get(idx, {})
                for choice in choices:     
                    stats[choice["text"]] = stats.get(choice["text"], 0) + 1
                # broadcast results
                for ws in session_sockets.get(code, [])[:]:
                    if ws is websocket:
                        try:
                            await ws.send_json({"type": "results", "stats": stats})
                        except Exception:
                            pass
                    else:
                        #the players should get whether they were correct or not, so include the correct answer in the payload for them but not for the host since they already know it
                        try:
                            await ws.send_json({"type": "results", "correct": correct})
                        except Exception:
                            pass
            elif msg.get("type") == "jury_phase":
                # host starts jury voting phase — compile player fakes and broadcast to all (jurors will handle it)
                idx = active_sessions[code].get("current_index")
                subs = active_sessions[code].get("submissions", {}).get(idx, [])
                fakes = [{"player": e["player"], "text": e["text"]} for e in subs if e.get("player") and e.get("text")]
                enable_worst_fake = active_sessions[code].get("enable_worst_fake", False)
                payload = {"type": "jury_phase", "fakes": fakes, "enable_worst_fake": enable_worst_fake}
                for ws in session_sockets.get(code, [])[:]:
                    try:
                        await ws.send_json(payload)
                    except Exception:
                        pass
            elif msg.get("type") == "jury_vote":
                # a juror submitted their vote
                idx = active_sessions[code].get("current_index")
                juror_name = msg.get("juror_name", "").strip()
                best = msg.get("best_fake_player")
                worst = msg.get("worst_fake_player")
                if juror_name:
                    jury_votes = active_sessions[code].setdefault("jury_votes", {})
                    jury_votes.setdefault(idx, {})[juror_name] = {"best": best, "worst": worst}
                    # broadcast vote count to all (host uses it to track progress)
                    total_jurors = len(active_sessions[code].get("jurors", []))
                    vote_count = len(jury_votes.get(idx, {}))
                    for ws in session_sockets.get(code, [])[:]:
                        try:
                            await ws.send_json({"type": "jury_vote_count", "count": vote_count, "total_jurors": total_jurors})
                        except Exception:
                            pass
            elif msg.get("type") == "jury_results":
                # host requests jury scoring — compute fractional points and broadcast round_scores
                idx = active_sessions[code].get("current_index")
                jurors_registered = active_sessions[code].get("jurors", [])
                total_jurors = len(jurors_registered) or 1  # avoid divide-by-zero
                jury_votes_for_q = active_sessions[code].get("jury_votes", {}).get(idx, {})
                enable_worst_fake = active_sessions[code].get("enable_worst_fake", False)

                # tally jury votes
                best_tally = {}   # player -> count of best votes
                worst_tally = {}  # player -> count of worst votes
                for vote in jury_votes_for_q.values():
                    b = vote.get("best")
                    w = vote.get("worst")
                    if b:
                        best_tally[b] = best_tally.get(b, 0) + 1
                    if w and enable_worst_fake:
                        worst_tally[w] = worst_tally.get(w, 0) + 1

                # apply fractional jury scores
                for player, count in best_tally.items():
                    pts = count / total_jurors
                    active_sessions[code]["scores"][player] = active_sessions[code]["scores"].get(player, 0) + pts
                for player, count in worst_tally.items():
                    pts = count / total_jurors
                    active_sessions[code]["scores"][player] = active_sessions[code]["scores"].get(player, 0) - pts

                # build per-player round breakdown
                correct = active_sessions[code].get("current_correct_answer", "")
                choices_for_q = active_sessions[code].get("choices", {}).get(idx, [])
                subs_for_q = active_sessions[code].get("submissions", {}).get(idx, [])

                all_players = set(active_sessions[code].get("players", []))
                breakdown = {}
                for p in all_players:
                    # correct pts: did this player guess correctly?
                    correct_pts = 0
                    for c in choices_for_q:
                        if c.get("player") == p and correct and c.get("text", "").strip().lower() == correct.strip().lower():
                            correct_pts = 1
                            break

                    # fool pts: how many players chose this player's fake?
                    fool_pts = 0
                    p_fake_text = None
                    for s in subs_for_q:
                        if s.get("player") == p:
                            p_fake_text = s.get("text", "").strip().lower()
                            break
                    if p_fake_text:
                        for c in choices_for_q:
                            if c.get("text", "").strip().lower() == p_fake_text and c.get("player") != p:
                                fool_pts += 1

                    jury_best_pts = round(best_tally.get(p, 0) / total_jurors, 4)
                    jury_worst_pts = round(worst_tally.get(p, 0) / total_jurors, 4) if enable_worst_fake else 0
                    round_total = round(correct_pts + fool_pts + jury_best_pts - jury_worst_pts, 4)
                    breakdown[p] = {
                        "correct_pts": correct_pts,
                        "fool_pts": fool_pts,
                        "jury_best_pts": jury_best_pts,
                        "jury_worst_pts": jury_worst_pts,
                        "round_total": round_total,
                    }

                # store breakdown
                active_sessions[code].setdefault("round_breakdown", {})[idx] = breakdown

                # broadcast round_scores to all
                scores_snapshot = dict(active_sessions[code]["scores"])
                payload = {
                    "type": "round_scores",
                    "breakdown": breakdown,
                    "scores": scores_snapshot,
                    "correct_answer": correct,
                }
                for ws in session_sockets.get(code, [])[:]:
                    try:
                        await ws.send_json(payload)
                    except Exception:
                        pass
            elif msg.get("type") == "game_finished":
                # host is ending the game; broadcast to all players
                active_sessions[code]["status"] = "finished"
                for ws in session_sockets.get(code, [])[:]:
                    try:
                        await ws.send_json({"type": "game_finished"})
                    except Exception:
                        pass
            # ignore other message types for now
    except WebSocketDisconnect:
        print(f"WebSocketDisconnect for room={code}")
        session_sockets[code].remove(websocket)
        # cleanup empty list
        if not session_sockets[code]:
            del session_sockets[code]
        print(f"Socket removed for {code}; remaining={len(session_sockets.get(code, []))}")

@app.get("/decks")
async def list_decks(_ok: bool = Depends(require_host)):
    """
    Returns a list of all CSV files in the /decks folder.
    Use this to show a 'Library' view.
    """
    if not os.path.exists("decks"):
        return {"decks": []}
    
    filenames = [f for f in os.listdir("decks") if f.endswith(".csv")]

    # for i, f in enumerate(filenames):
    #     filenames[i] = pd.read_csv(f"decks/{f}") #
    return {"decks": filenames}

@app.get("/decks/{filename}")
async def get_deck_details(filename: str, _ok: bool = Depends(require_host)):
    """
    Parses a specific CSV and returns the JSON data.
    Useful for 'Edit Mode' in the frontend.
    """
    file_path = f"decks/{filename}"
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Deck file not found")
    
    result = validate_and_parse_csv(file_path)

    return {"deck_id": filename, "questions": result}

@app.post("/save-deck")
async def save_new_deck(deck_data: CreateDeckRequest, _ok: bool = Depends(require_host)):
    """
    Allows creation a brand new CSV from a JSON array or update an existing one.
    """
    try:
        # Ensure filename ends in .csv
        fname = deck_data.name if deck_data.name.endswith(".csv") else f"{deck_data.name}.csv"
        file_path = f"decks/{fname}"

        # Convert list of Pydantic models to a list of dicts
        data = [q.dict() for q in deck_data.questions]
        
        # Create DataFrame and save to CSV
        df = pd.DataFrame(data)
        df.to_csv(file_path, index=False)
        
        return {"status": "success", "filename": fname}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save deck: {str(e)}")

@app.put("/decks/{filename}")
async def update_deck(filename: str, deck_data: CreateDeckRequest, _ok: bool = Depends(require_host)):
    """
    Overwrites an existing deck CSV with updated question data.
    Returns 404 if the deck does not exist.
    """
    file_path = f"decks/{filename}"
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail=f"Deck '{filename}' not found")
    try:
        df = pd.DataFrame([q.dict() for q in deck_data.questions])
        df.to_csv(file_path, index=False)
        return {"status": "success", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update deck: {str(e)}")

@app.delete("/decks/{filename}")
async def delete_deck(filename: str, _ok: bool = Depends(require_host)):
    """
    Deletes a deck file.
    """
    file_path = f"decks/{filename}"
    if os.path.exists(file_path):
        os.remove(file_path)
        return {"message": f"Deleted {filename}"}
    else:
        raise HTTPException(status_code=404, detail="File not found")

@app.get("/decks/{filename}/download")
async def download_deck_csv(filename: str, _ok: bool = Depends(require_host)):
    """
    Triggers a browser download of the specific CSV file.
    """
    file_path = f"decks/{filename}"
    
    # Check if the file actually exists on the server
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Deck file not found")
    
    # return the file as a downloadable response
    return FileResponse(
        path=file_path, 
        filename=filename, 
        media_type='text/csv'
    )

@app.post("/upload-asset")
async def upload_asset(file: UploadFile = File(...), _ok: bool = Depends(require_host)):
    """
    A dedicated endpoint for just uploading an image. 
    Use this when a user adds an image to a specific question.
    """
    file_path = f"assets/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Return the filename for storing it in the 'Image_Link' field of the CSV
    return {"filename": file.filename, "url": f"/assets/{file.filename}"}

class HostLoginRequest(BaseModel):
    host_code: str



