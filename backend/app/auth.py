from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .models import Usuario
from .schemas import AuthSession, ForgotPasswordIn, LoginIn, RegisterIn, ResetPasswordIn, UserOut
from .security import create_access_token, decode_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer()


def build_session(user: Usuario) -> AuthSession:
    return AuthSession(accessToken=create_access_token(str(user.id)), user=UserOut.model_validate(user))


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> Usuario:
    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido")

    user = db.get(Usuario, int(user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")

    return user


@router.post("/register", response_model=AuthSession, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    existing = db.scalar(select(Usuario).where(Usuario.correo == payload.correo.lower()))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El correo ya esta registrado")

    user = Usuario(
        nombre=payload.nombre.strip(),
        apellidos=payload.apellidos.strip(),
        correo=payload.correo.lower(),
        password_hash=hash_password(payload.password),
        rol=payload.rol,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return build_session(user)


@router.post("/login", response_model=AuthSession)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(Usuario).where(Usuario.correo == payload.correo.lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")

    return build_session(user)


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordIn):
    return {"message": "Si el correo existe, se enviaran instrucciones de recuperacion", "correo": payload.correo}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordIn):
    return {"message": "Endpoint preparado para integrar tokens de recuperacion"}


@router.get("/me", response_model=UserOut)
def me(current_user: Usuario = Depends(get_current_user)):
    return current_user

