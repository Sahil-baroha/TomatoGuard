import psycopg2
from passlib.context import CryptContext
import os
import sys

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("Error: DATABASE_URL environment variable is not set.")
    sys.exit(1)

admin_pwd = os.environ.get("ADMIN_BOT_PASSWORD")
if not admin_pwd:
    print("Error: ADMIN_BOT_PASSWORD environment variable is not set.")
    sys.exit(1)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
admin_hash = pwd_context.hash(admin_pwd)

conn = psycopg2.connect(db_url)
conn.autocommit = False
cursor = conn.cursor()

try:
    # Delete the existing admin row(s) to reset
    cursor.execute("DELETE FROM admin;")
    deleted_count = cursor.rowcount
    print(f"Deleted {deleted_count} existing admin row(s).")
    
    # Insert the new admin row with the secure hash
    admin_seed = """
    INSERT INTO admin (name, email, password_hash)
    VALUES ('Admin Name', 'admin@tomatoguard.app', %s);
    """
    cursor.execute(admin_seed, (admin_hash,))
    
    conn.commit()
    print("Admin seed applied successfully with the new secure password.")
except Exception as e:
    conn.rollback()
    print(f"Error occurred, rolling back: {e}")
finally:
    cursor.close()
    conn.close()
