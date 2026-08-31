import psycopg2
import os
import sys

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("Error: DATABASE_URL environment variable is not set.")
    sys.exit(1)

conn = psycopg2.connect(db_url)
cursor = conn.cursor()

try:
    cursor.execute("""
        SELECT table_name, constraint_name 
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'PRIMARY KEY' 
        AND table_schema = 'public'
        AND table_name IN (
            'admin', 'daily_tasks', 'disease_scans', 'diseases', 'farms', 
            'government_schemes', 'notifications', 'reports', 'soil_reports', 
            'soil_analyses', 'soil_questionnaires', 'users', 'weather_records'
        );
    """)
    pks = cursor.fetchall()
    print("Primary keys found:")
    for pk in pks:
        print(f" - {pk[0]}: {pk[1]}")
finally:
    cursor.close()
    conn.close()
