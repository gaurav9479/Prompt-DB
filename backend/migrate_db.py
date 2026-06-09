import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

async def run_migration():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found in environment!")
        return

    from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode
    parsed = urlparse(db_url)
    query_items = dict(parse_qsl(parsed.query, keep_blank_values=True))

    connect_args = {}
    for unwanted in ("sslmode", "channel_binding"):
        if unwanted in query_items:
            val = query_items.pop(unwanted)
            if unwanted == "sslmode" and val and val.lower() in ("require", "verify-ca", "verify-full"):
                connect_args["ssl"] = True

    new_query = urlencode(query_items)
    new_parsed = parsed._replace(scheme=parsed.scheme.replace("postgresql", "postgresql+asyncpg"), query=new_query)
    DATABASE_URL = urlunparse(new_parsed)

    print(f"Connecting to database to run migrations...")
    engine = create_async_engine(DATABASE_URL, connect_args=connect_args)
    async with AsyncSession(engine) as session:
        # 1. Alter users table to add columns if they do not exist
        print("Adding columns to users table...")
        columns_to_add = [
            ("gst_number", "VARCHAR(15)"),
            ("shop_name", "VARCHAR(255)"),
            ("shop_type", "VARCHAR(50)"),
            ("address_line1", "TEXT"),
            ("city", "VARCHAR(100)"),
            ("state", "VARCHAR(100)"),
            ("pincode", "VARCHAR(10)"),
            ("pan_number", "VARCHAR(10)"),
            ("bank_account_name", "VARCHAR(255)"),
            ("bank_account_number", "VARCHAR(30)"),
            ("ifsc_code", "VARCHAR(11)"),
            ("upi_id", "VARCHAR(100)"),
            ("business_description", "TEXT"),
            ("operating_since", "INTEGER"),
            ("employee_count_range", "VARCHAR(20)"),
            ("encrypted_db_string", "TEXT"),
            ("db_connected", "BOOLEAN DEFAULT FALSE"),
            ("company_code", "VARCHAR(10)"),
            ("employer_id", "INTEGER REFERENCES users(id) ON DELETE SET NULL"),
            ("profile_complete", "BOOLEAN DEFAULT FALSE"),
            ("profile_photo_url", "TEXT"),
            ("id_proof_type", "VARCHAR(30)"),
            ("id_proof_number", "VARCHAR(50)"),
        ]

        for col_name, col_type in columns_to_add:
            try:
                # PostgreSQL ALTER TABLE ADD COLUMN IF NOT EXISTS
                query = f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type}"
                await session.execute(text(query))
                print(f"  ✓ Column {col_name} checked/added")
            except Exception as e:
                print(f"  ✗ Error adding column {col_name}: {e}")

        # 2. Alter orders table to add admin_id
        print("Adding admin_id to orders table...")
        try:
            await session.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL"))
            print("  ✓ Column admin_id checked/added")
        except Exception as e:
            print(f"  ✗ Error adding admin_id to orders: {e}")

        # 3. Create branches table if it does not exist
        print("Creating branches table...")
        create_branches_query = """
        CREATE TABLE IF NOT EXISTS branches (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            address TEXT,
            branch_type VARCHAR(50),
            admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
        """
        try:
            await session.execute(text(create_branches_query))
            print("  ✓ branches table checked/created")
        except Exception as e:
            print(f"  ✗ Error creating branches table: {e}")

        await session.commit()
        print("Migrations applied successfully!")

if __name__ == "__main__":
    asyncio.run(run_migration())
