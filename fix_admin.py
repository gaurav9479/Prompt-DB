import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

async def fix():
    db_url = os.getenv("DATABASE_URL")
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        
    engine = create_async_engine(db_url)
    async with AsyncSession(engine) as session:
        # Check if shop 1 exists
        shop = await session.execute(text("SELECT id FROM shops WHERE id = 1"))
        if not shop.first():
            print("Shop 1 doesn't exist, creating a dummy one...")
            await session.execute(text("INSERT INTO shops (id, name, is_active, is_verified) VALUES (1, 'Main Shop', true, true)"))
        
        print("Updating admin shop_id to 1...")
        await session.execute(text("UPDATE users SET shop_id = 1 WHERE email = 'admin@promptdb.com'"))
        await session.commit()
        print("Admin user updated successfully!")

asyncio.run(fix())
