from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings:
    API_PREFIX = "/api"
    TITLE = "VS Code Environment Manager"


class Settings(BaseSettings):
    base_public_url: str
    workspace_root: str

    managed_network_name: str = 'vscode-manager-net'
    workspace_container_root: str = "/workspaces"
    vscode_image: str = "gitpod/openvscode-server:latest"
    vscode_container_port: int = 3000
    container_name_prefix: str = "vscode-env-"
    env_label_prefix: str = "com.vscode-manager"
    max_environments: int = 10
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
