from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket_manager import manager
from app.schemas import OutgoingMessage, ErrorMessage
import json
import asyncio
import logging
import jwt
from app.mock_stream import generate_mock_events
from app.utils.auth import SECRET_KEY, ALGORITHM

logger = logging.getLogger(__name__)

router = APIRouter()

# Global reference to keep the task alive
mock_task = None


def _authenticate_ws(websocket: WebSocket) -> bool:
    """Validate the auth JWT on a WebSocket handshake.

    The socket exposes the same `token` cookie the HTTP APIs use; browsers send
    it automatically on same-origin upgrades. Fall back to an `Authorization:
    Bearer` header or a `?token=` query param for non-browser clients. Returns
    True only for a well-formed, unexpired token that carries a subject — this
    gates out anonymous connections that could otherwise drive broadcast/echo.
    """
    token = websocket.cookies.get("token")
    if not token:
        auth_header = websocket.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    if not token:
        token = websocket.query_params.get("token")
    if not token:
        return False
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return bool(payload.get("sub"))
    except jwt.PyJWTError:
        return False


@router.on_event("startup")
async def startup_event():
    global mock_task
    # Start the mock stream in the background when the server starts
    mock_task = asyncio.create_task(generate_mock_events())

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Reject unauthenticated sockets before accepting the handshake so anonymous
    # clients can't drive ping/echo/broadcast. 1008 = policy violation.
    if not _authenticate_ws(websocket):
        await websocket.close(code=1008)
        return

    # Defaulting to global room for now
    room_id = "global"
    await manager.connect(websocket, room_id)
    
    # Send welcome message
    welcome_msg = OutgoingMessage(type="welcome", content="Connected to IntervieHire server").model_dump_json()
    await manager.send_personal_message(welcome_msg, websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg_data = json.loads(data)
                msg_type = msg_data.get("type")
                
                if msg_type == "ping":
                    pong_msg = OutgoingMessage(type="pong", content="").model_dump_json()
                    await manager.send_personal_message(pong_msg, websocket)
                    
                elif msg_type == "echo":
                    content = msg_data.get("content", "")
                    echo_msg = OutgoingMessage(type="echo", content=f"Echo: {content}").model_dump_json()
                    await manager.send_personal_message(echo_msg, websocket)
                    
                elif msg_type == "broadcast":
                    content = msg_data.get("content", "")
                    broadcast_msg = OutgoingMessage(type="broadcast", content=content, sender="Client").model_dump_json()
                    await manager.broadcast(broadcast_msg, room_id)
                    
                else:
                    err_msg = ErrorMessage(code=4001, content=f"Unknown message type: {msg_type}").model_dump_json()
                    await manager.send_personal_message(err_msg, websocket)
            except json.JSONDecodeError:
                err_msg = ErrorMessage(code=4000, content="Invalid JSON payload").model_dump_json()
                await manager.send_personal_message(err_msg, websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
