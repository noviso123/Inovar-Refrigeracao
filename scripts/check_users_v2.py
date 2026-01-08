import sqlite3
import os

db_path = os.path.join("c:\\Users\\jtsat\\Downloads\\Inovar Refrigeracao\\backend_python", "dev.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT id, email, full_name, role FROM users")
users = cursor.fetchall()

print("--- USERS IN DB ---")
for u in users:
    print(f"ID: {u[0]} | Email: {u[1]} | Name: {u[2]} | Role: {u[3]}")
print("-------------------")

conn.close()
