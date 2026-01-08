import sqlite3
import os

db_path = os.path.join("c:\\Users\\jtsat\\Downloads\\Inovar Refrigeracao\\backend_python", "dev.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT id, email, full_name, role FROM users")
users = cursor.fetchall()

print("ID | Email | Name | Role")
print("-" * 50)
for u in users:
    print(f"{u[0]} | {u[1]} | {u[2]} | {u[3]}")

conn.close()
