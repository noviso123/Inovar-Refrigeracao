"""
WebSocket Connection Manager for Real-time Notifications
Manages WebSocket connections for broadcasting notifications to connected clients.
"""
from fastapi import WebSocket
from typing import Dict, List, Set
import logging
import json

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections grouped by company_id for multi-tenant support.
    """
    
    def __init__(self):
        # Maps company_id -> set of active WebSocket connections
        self.company_connections: Dict[int, Set[WebSocket]] = {}
        # Maps user_id -> WebSocket connection (for direct messages)
        self.user_connections: Dict[int, WebSocket] = {}
        # Track connection metadata
        self.connection_info: Dict[WebSocket, dict] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int, company_id: int):
        """Accept and register a new WebSocket connection"""
        await websocket.accept()
        
        # Add to company connections
        if company_id not in self.company_connections:
            self.company_connections[company_id] = set()
        self.company_connections[company_id].add(websocket)
        
        # Add to user connections
        self.user_connections[user_id] = websocket
        
        # Store connection metadata
        self.connection_info[websocket] = {
            "user_id": user_id,
            "company_id": company_id
        }
        
        logger.info(f"WebSocket connected: user_id={user_id}, company_id={company_id}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        info = self.connection_info.get(websocket)
        if info:
            user_id = info["user_id"]
            company_id = info["company_id"]
            
            # Remove from company connections
            if company_id in self.company_connections:
                self.company_connections[company_id].discard(websocket)
                if not self.company_connections[company_id]:
                    del self.company_connections[company_id]
            
            # Remove from user connections
            if user_id in self.user_connections:
                del self.user_connections[user_id]
            
            # Remove metadata
            del self.connection_info[websocket]
            
            logger.info(f"WebSocket disconnected: user_id={user_id}, company_id={company_id}")
    
    async def send_to_user(self, user_id: int, message: dict):
        """Send a message directly to a specific user"""
        websocket = self.user_connections.get(user_id)
        if websocket:
            try:
                await websocket.send_json(message)
                logger.debug(f"Sent message to user {user_id}")
            except Exception as e:
                logger.error(f"Error sending to user {user_id}: {e}")
                self.disconnect(websocket)
    
    async def broadcast_to_company(self, company_id: int, message: dict, exclude_user_id: int = None):
        """Broadcast a message to all users in a company"""
        connections = self.company_connections.get(company_id, set())
        disconnected = []
        
        for websocket in connections:
            info = self.connection_info.get(websocket)
            if info and exclude_user_id and info["user_id"] == exclude_user_id:
                continue  # Skip the sender
                
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to company {company_id}: {e}")
                disconnected.append(websocket)
        
        # Clean up disconnected
        for ws in disconnected:
            self.disconnect(ws)
        
        logger.debug(f"Broadcast to company {company_id}: {len(connections) - len(disconnected)} recipients")
    
    async def broadcast_global(self, message: dict):
        """Broadcast a message to all connected users (e.g., system announcements)"""
        all_connections = list(self.connection_info.keys())
        disconnected = []
        
        for websocket in all_connections:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error in global broadcast: {e}")
                disconnected.append(websocket)
        
        for ws in disconnected:
            self.disconnect(ws)
        
        logger.info(f"Global broadcast: {len(all_connections) - len(disconnected)} recipients")
    
    def get_stats(self) -> dict:
        """Get connection statistics"""
        total_connections = len(self.connection_info)
        companies_with_connections = len(self.company_connections)
        
        return {
            "total_connections": total_connections,
            "companies_connected": companies_with_connections,
            "connections_by_company": {
                cid: len(conns) for cid, conns in self.company_connections.items()
            }
        }


# Global singleton instance
manager = ConnectionManager()
