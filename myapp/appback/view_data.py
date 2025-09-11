import os
import psycopg2
import dotenv

def main():
    dotenv.load_dotenv()
    
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        print("DATABASE_URL not found in .env file")
        return

    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        tables_to_check = ["artisans_artisan", "products_product", "jobs_job", "jobs_servicerate"]
        
        for table in tables_to_check:
            print(f"\n--- First 5 rows from {table} ---")
            cursor.execute(f"SELECT * FROM {table} LIMIT 5;")
            rows = cursor.fetchall()
            for row in rows:
                print(row)
        
        cursor.close()
        conn.close()
        
    except psycopg2.Error as e:
        print(f"Error connecting to the database: {e}")

if __name__ == "__main__":
    main()

