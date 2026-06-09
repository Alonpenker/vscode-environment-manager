from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    base_public_url: str = "http://localhost"
    workspace_root: str = "./workspaces"
    managed_network_name: str = "vscode-manager-net"

    vscode_image: str = "gitpod/openvscode-server:latest"
    vscode_container_port: int = 3000
    container_name_prefix: str = "vscode-env-"
    env_label_prefix: str = "com.vscode-manager"
    max_environments: int = 10
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
