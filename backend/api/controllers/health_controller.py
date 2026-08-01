from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

async def health_check(db: AsyncSession):
    db_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
        
    return {
        "status": "healthy",
        "service": "Prompt-DB",
        "database": db_status
    }
