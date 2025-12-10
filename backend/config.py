from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Model configuration
    MODEL_NAME: str = "kakaocorp/kanana-1.5-8b-instruct-2505"
    LORA_ADAPTER_PATH: str = "/home/gjfepfm/nugu/models/lora_adapters/kanana"

    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS
    CORS_ORIGINS: list = ["*"]  # Allow all origins for external access

    # Inference settings
    MAX_TEXT_LENGTH: int = 4096
    BATCH_SIZE: int = 1

    class Config:
        env_file = ".env"

settings = Settings()
