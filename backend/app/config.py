from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "VIC API"
    database_url: str = "sqlite:///./vic.db"
    jwt_secret: str = "change-this-secret-before-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24


settings = Settings()

