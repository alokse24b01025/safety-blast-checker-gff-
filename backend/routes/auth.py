from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import Optional
import hashlib
import bcrypt
import random
import smtplib
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from twilio.rest import Client

from database_mongo import get_mongo_db
from schemas import UserRegisterRequest, LoginOTPRequest, LoginPasswordRequest, VerifyOTPRequest, ForgotPasswordRequest, ResetPasswordRequest, UserProfileResponse, TokenResponse
from config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# --- Self-Contained In-Memory Rate Limiter ---
class RateLimiter:
    def __init__(self, limit: int, window: int):
        self.limit = limit
        self.window = window
        self.requests = {} # ip -> [timestamps]
        
    def check(self, ip: str):
        now = time.time()
        if ip not in self.requests:
            self.requests[ip] = []
        # Filter request timestamps outside the window
        self.requests[ip] = [t for t in self.requests[ip] if now - t < self.window]
        if len(self.requests[ip]) >= self.limit:
            raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
        self.requests[ip].append(now)

auth_limiter = RateLimiter(limit=15, window=60) # 15 request requests per minute max

def hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode('utf-8')).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=60 * 24) # 24 Hours
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

# Real SMTP email transmitter
def send_email_otp(to_email: str, otp: str) -> bool:
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"\n[SMTP NOT CONFIGURED ERROR] Cannot send OTP email to {to_email}.")
        return False
    
    try:
        msg = MIMEMultipart()
        msg['From'] = settings.SMTP_FROM or settings.SMTP_USER
        msg['To'] = to_email
        msg['Subject'] = "Mining Intelligence Platform - Verification OTP Code"
        
        body = f"""Hello,
        
Your 6-digit OTP verification code is: {otp}

This code is valid for 5 minutes. Do NOT share this code with anyone.

Best regards,
Mining Safety & Operations Control
"""
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(msg['From'], to_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"[SMTP SEND ERROR] Failed to send email to {to_email}. Error: {str(e)}")
        return False

# Real Twilio SMS transmitter
def send_sms_otp(phone_number: str, otp: str) -> bool:
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN or not settings.TWILIO_PHONE_NUMBER:
        print(f"\n[TWILIO NOT CONFIGURED ERROR] Cannot send OTP SMS to {phone_number}.")
        return False
    
    try:
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        client.messages.create(
            body=f"Mining Intelligence Platform - Verification OTP Code: {otp} (Valid 5 mins)",
            from_=settings.TWILIO_PHONE_NUMBER,
            to=phone_number
        )
        return True
    except Exception as e:
        print(f"[TWILIO SEND ERROR] Failed to send SMS to {phone_number}. Error: {str(e)}")
        return False

# Dependency to check user session (reading from HttpOnly cookie first)
async def get_current_user(request: Request, db = Depends(get_mongo_db)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token = request.cookies.get("access_token")
    
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if not token:
        raise credentials_exception
        
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = await db.users.find_one({"email": email.lower()})
    if user is None:
        raise credentials_exception
        
    user["id"] = str(user["_id"])
    return user

def require_role(role: str):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action requires role: {role}"
            )
        return current_user
    return role_checker

@router.post("/register")
async def register(user_data: UserRegisterRequest, request: Request, db = Depends(get_mongo_db)):
    auth_limiter.check(request.client.host)
    email_clean = user_data.email.strip().lower()
    
    # Check if user already exists
    existing = await db.users.find_one({"email": email_clean})
    if existing:
        raise HTTPException(status_code=400, detail="Account already exists.")
        
    # Generate 6-digit OTP
    otp = f"{random.randint(100000, 999999)}"
    otp_hash = hash_otp(otp)
    otp_expiry = datetime.utcnow() + timedelta(minutes=5)
    
    pending_user = {
        "email": email_clean,
        "password_hash": get_password_hash(user_data.password),
        "full_name": user_data.full_name,
        "company": user_data.company,
        "designation": user_data.designation,
        "phone": user_data.phone.strip(),
        "country": user_data.country,
        "otp_hash": otp_hash,
        "otp_expiry": otp_expiry,
        "otp_attempts": 0,
        "created_at": datetime.utcnow()
    }
    
    await db.pending_users.update_one(
        {"email": email_clean},
        {"$set": pending_user},
        upsert=True
    )
    
    # Dispatch OTP via Email
    success = send_email_otp(email_clean, otp)
    if not success:
        raise HTTPException(
            status_code=500, 
            detail="Failed to deliver registration OTP email. Please ensure SMTP keys are valid."
        )
        
    return {"message": "OTP verification code sent to your email."}

@router.post("/verify-registration", response_model=TokenResponse)
async def verify_registration(payload: VerifyOTPRequest, response: Response, request: Request, db = Depends(get_mongo_db)):
    auth_limiter.check(request.client.host)
    identifier_clean = payload.identifier.strip().lower()
    
    # Find pending record
    pending = await db.pending_users.find_one({"email": identifier_clean})
    if not pending:
        raise HTTPException(status_code=404, detail="No pending registration found.")
        
    # Check attempt limit
    attempts = pending.get("otp_attempts", 0)
    if attempts >= 3:
        await db.pending_users.delete_one({"email": identifier_clean})
        raise HTTPException(status_code=400, detail="Too many verification failures. Registration invalidated.")
        
    # Verify OTP
    stored_hash = pending.get("otp_hash")
    stored_expiry = pending.get("otp_expiry")
    
    if not stored_hash or stored_hash != hash_otp(payload.otp):
        # Increment attempt count
        await db.pending_users.update_one({"email": identifier_clean}, {"$inc": {"otp_attempts": 1}})
        raise HTTPException(status_code=400, detail="Invalid OTP code.")
        
    if not stored_expiry or datetime.utcnow() > stored_expiry:
        raise HTTPException(status_code=400, detail="OTP code has expired. Please register again.")
        
    # Save verified user to main users collection
    new_user = {
        "email": identifier_clean,
        "password_hash": pending["password_hash"],
        "full_name": pending["full_name"],
        "company": pending["company"],
        "designation": pending["designation"],
        "phone": pending["phone"],
        "country": pending["country"],
        "role": "OFFICER",
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(new_user)
    await db.pending_users.delete_one({"email": identifier_clean})
    
    # Generate JWT
    token = create_access_token(data={"sub": identifier_clean, "role": "OFFICER"})
    
    # Set HttpOnly Cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=3600 * 24,
        samesite="lax",
        secure=False,
        path="/"
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "email": identifier_clean,
            "phone": pending.get("phone", ""),
            "full_name": pending.get("full_name", ""),
            "company": pending.get("company", "Independent"),
            "designation": pending.get("designation", "Staff"),
            "country": pending.get("country", "Unknown"),
            "role": "OFFICER"
        }
    }

@router.post("/login-password", response_model=TokenResponse)
async def login_with_password(payload: LoginPasswordRequest, response: Response, request: Request, db = Depends(get_mongo_db)):
    auth_limiter.check(request.client.host)
    identifier_clean = payload.email.strip()
    user = await db.users.find_one({
        "$or": [
            {"email": identifier_clean.lower()},
            {"phone": identifier_clean}
        ]
    })
    if not user:
        raise HTTPException(status_code=404, detail="Account not found. Please check your credentials or register.")
    
    if not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid password. Please check and try again.")
    
    role = user.get("role", "OFFICER")
    access_token = create_access_token(data={"sub": user["email"], "role": role})
    
    # Set HttpOnly Cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=3600 * 24,
        samesite="lax",
        secure=False,
        path="/"
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": user.get("email", ""),
            "phone": user.get("phone", ""),
            "full_name": user.get("full_name", ""),
            "company": user.get("company", "Independent"),
            "designation": user.get("designation", "Staff"),
            "country": user.get("country", "Unknown"),
            "role": role
        }
    }

@router.post("/login-otp")
async def login_otp_request(payload: LoginOTPRequest, request: Request, db = Depends(get_mongo_db)):
    auth_limiter.check(request.client.host)
    identifier_clean = payload.identifier.strip()
    
    # Find user in users collection
    if payload.method == "email":
        user = await db.users.find_one({"email": identifier_clean.lower()})
    else:
        user = await db.users.find_one({"phone": identifier_clean})
        
    if not user:
        raise HTTPException(status_code=404, detail="Account not found. Please register first.")
        
    # Generate OTP
    otp = f"{random.randint(100000, 999999)}"
    otp_hash = hash_otp(otp)
    otp_expiry = datetime.utcnow() + timedelta(minutes=5)
    
    # Store OTP and reset attempts
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "otp_hash": otp_hash,
            "otp_expiry": otp_expiry,
            "otp_attempts": 0
        }}
    )
    
    # Send OTP
    success = False
    if payload.method == "email":
        success = send_email_otp(user["email"], otp)
    else:
        success = send_sms_otp(user["phone"], otp)
        
    if not success:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to dispatch verification OTP via {payload.method}. Please configure SMTP/Twilio credentials in backend/.env."
        )
        
    return {"message": f"Verification code sent via {payload.method}."}

@router.post("/verify-login", response_model=TokenResponse)
async def verify_login(payload: VerifyOTPRequest, response: Response, request: Request, db = Depends(get_mongo_db)):
    auth_limiter.check(request.client.host)
    identifier_clean = payload.identifier.strip()
    
    # Find user
    user = await db.users.find_one({
        "$or": [
            {"email": identifier_clean.lower()},
            {"phone": identifier_clean}
        ]
    })
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    # Check attempts
    attempts = user.get("otp_attempts", 0)
    if attempts >= 3:
        # Reset OTP to block it
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$unset": {"otp_hash": "", "otp_expiry": ""}}
        )
        raise HTTPException(status_code=400, detail="Too many validation failures. Request a new OTP code.")
        
    # Verify OTP
    stored_hash = user.get("otp_hash")
    stored_expiry = user.get("otp_expiry")
    
    if not stored_hash or stored_hash != hash_otp(payload.otp):
        await db.users.update_one({"_id": user["_id"]}, {"$inc": {"otp_attempts": 1}})
        raise HTTPException(status_code=400, detail="Invalid OTP code.")
        
    if not stored_expiry or datetime.utcnow() > stored_expiry:
        raise HTTPException(status_code=400, detail="OTP code has expired.")
        
    # Clear OTP fields on success
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$unset": {"otp_hash": "", "otp_expiry": "", "otp_attempts": ""}}
    )
    
    role = user.get("role", "OFFICER")
    access_token = create_access_token(data={"sub": user["email"], "role": role})
    
    # Set HttpOnly Cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=3600 * 24,
        samesite="lax",
        secure=False,
        path="/"
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": user.get("email", ""),
            "phone": user.get("phone", ""),
            "full_name": user.get("full_name", ""),
            "company": user.get("company", "Independent"),
            "designation": user.get("designation", "Staff"),
            "country": user.get("country", "Unknown"),
            "role": role
        }
    }

@router.post("/forgot-password")
async def forgot_password_request(payload: ForgotPasswordRequest, request: Request, db = Depends(get_mongo_db)):
    auth_limiter.check(request.client.host)
    identifier_clean = payload.identifier.strip()
    
    if payload.method == "email":
        user = await db.users.find_one({"email": identifier_clean.lower()})
    else:
        user = await db.users.find_one({"phone": identifier_clean})
        
    if not user:
        raise HTTPException(status_code=404, detail="Account not found.")
        
    # Generate OTP
    otp = f"{random.randint(100000, 999999)}"
    otp_hash = hash_otp(otp)
    otp_expiry = datetime.utcnow() + timedelta(minutes=5)
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "reset_otp_hash": otp_hash,
            "reset_otp_expiry": otp_expiry,
            "reset_otp_attempts": 0
        }}
    )
    
    success = False
    if payload.method == "email":
        success = send_email_otp(user["email"], otp)
    else:
        success = send_sms_otp(user["phone"], otp)
        
    if not success:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to deliver password reset verification code via {payload.method}. Please configure SMTP/Twilio credentials in backend/.env."
        )
        
    return {"message": "Reset verification OTP code sent."}

@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, request: Request, db = Depends(get_mongo_db)):
    auth_limiter.check(request.client.host)
    identifier_clean = payload.identifier.strip()
    
    user = await db.users.find_one({
        "$or": [
            {"email": identifier_clean.lower()},
            {"phone": identifier_clean}
        ]
    })
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    attempts = user.get("reset_otp_attempts", 0)
    if attempts >= 3:
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$unset": {"reset_otp_hash": "", "reset_otp_expiry": "", "reset_otp_attempts": ""}}
        )
        raise HTTPException(status_code=400, detail="Too many attempts. Request a new reset verification code.")
        
    stored_hash = user.get("reset_otp_hash")
    stored_expiry = user.get("reset_otp_expiry")
    
    if not stored_hash or stored_hash != hash_otp(payload.otp):
        await db.users.update_one({"_id": user["_id"]}, {"$inc": {"reset_otp_attempts": 1}})
        raise HTTPException(status_code=400, detail="Invalid verification code.")
        
    if not stored_expiry or datetime.utcnow() > stored_expiry:
        raise HTTPException(status_code=400, detail="Verification code has expired.")
        
    # Reset password with bcrypt
    password_hash = get_password_hash(payload.new_password)
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": password_hash},
         "$unset": {"reset_otp_hash": "", "reset_otp_expiry": "", "reset_otp_attempts": ""}}
    )
    
    return {"message": "Password reset successfully. You can now log in."}

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserProfileResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "email": current_user["email"],
        "phone": current_user.get("phone", ""),
        "full_name": current_user["full_name"],
        "company": current_user.get("company", "Independent"),
        "designation": current_user.get("designation", "Staff"),
        "country": current_user.get("country", "Unknown"),
        "role": current_user.get("role", "OFFICER")
    }
