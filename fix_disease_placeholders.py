import psycopg2
import os
import sys

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("Error: DATABASE_URL environment variable is not set.")
    sys.exit(1)

conn = psycopg2.connect(db_url)
conn.autocommit = False
cursor = conn.cursor()

try:
    cursor.execute("""
        UPDATE diseases 
        SET symptoms = NULL, 
            causes = NULL, 
            prevention = NULL,
            treatment = NULL 
        WHERE symptoms = '...';
    """)
    rows_updated = cursor.rowcount
    conn.commit()
    print(f"Rows updated: {rows_updated}")
except Exception as e:
    conn.rollback()
    print(f"Error occurred, rolling back: {e}")
finally:
    cursor.close()
    conn.close()
