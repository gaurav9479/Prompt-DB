from fastapi import APIRouter

from typing import Optional, Dict, Any, List


from backend.services.command_suggestions import CommandSuggestionService

router = APIRouter()
command_suggestion_service = CommandSuggestionService()


session_context: Dict[str, Any] = {}


async def health_check():
    return {"status": "healthy", "service": "Prompt-DB"}


