from passlib.context import CryptContext
import traceback

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def test():
    try:
        password = "123456"
        print(f"Testing hashing for: {password}")
        hashed = pwd_context.hash(password)
        print(f"Hashed: {hashed}")

        is_correct = pwd_context.verify(password, hashed)
        print(f"Verify self: {is_correct}")

    except Exception as e:
        print("Error during test:")
        traceback.print_exc()

if __name__ == "__main__":
    test()
