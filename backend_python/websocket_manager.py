"""
WebSocket Connection Manager for Real-time Notifications.
Simplified version for monolithic, single-tenant architecture.
"""
import json
import logging
from typing import Dict, Set, Optional, Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    """
    Manages WebSocket connections for real-time broadcasts and user-targeted notifications.
    """

    def __init__(self):
        # Maps user_id -> set of active WebSocket connections
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # Track user_id for each connection for efficient disconnect
        self.connection_to_user: Dict[WebSocket, int] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        """Accepts and registers a new WebSocket connection for a user."""
        await websocket.accept()

        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()

        self.active_connections[user_id].add(websocket)
        self.connection_to_user[websocket] = user_id

        logger.info(f"User {user_id} connected via WebSocket. Active users: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Removes a WebSocket connection."""
        user_id = self.connection_to_user.get(websocket)
        if user_id is not None:
            if user_id in self.active_connections:
                self.active_connections[user_id].discard(websocket)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]

            del self.connection_to_user[websocket]
            logger.info(f"User {user_id} disconnected from WebSocket.")

    async def send_to_user(self, user_id: int, message: Dict[str, Any]):
        """Sends a JSON message to all active connections of a specific user."""
        if user_id not in self.active_connections:
            return

        dead_connections = set()
        for websocket in self.active_connections[user_id]:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send WS message to user {user_id}: {e}")
                dead_connections.add(websocket)

        for ws in dead_connections:
            self.disconnect(ws)

    async def broadcast(self, message: Dict[str, Any], exclude_user_id: Optional[int] = None):
        """Broadcasts a JSON message to all connected users."""
        dead_connections = []

        for user_id, connections in self.active_connections.items():
            if exclude_user_id and user_id == exclude_user_id:
                continue

            for websocket in connections:
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to broadcast WS message: {e}")
                    dead_connections.append(websocket)

        for ws in dead_connections:
            self.disconnect(ws)

    def get_active_user_count(self) -> int:
        """Returns the number of unique users currently connected."""
        return len(self.active_connections)

# Singleton instance
manager = ConnectionManager()
