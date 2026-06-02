import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def fix():
    url = os.getenv("DATABASE_URL")
    conn = await asyncpg.connect(url)
    
    # Create shop 1 if it doesn't exist
    await conn.execute("INSERT INTO shops (id, name, is_active, is_verified) VALUES (1, 'Glamour Beauty Store', true, true) ON CONFLICT DO NOTHING")
    
    # Update admin user
    await conn.execute("UPDATE users SET shop_id = 1 WHERE email = 'admin@promptdb.com'")
    
    # Verify
    row = await conn.fetchrow("SELECT shop_id FROM users WHERE email = 'admin@promptdb.com'")
    print(f"Admin shop_id is now: {row['shop_id']}")
    await conn.close()

asyncio.run(fix())
