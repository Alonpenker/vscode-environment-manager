from routes.health import router as health_router
from routes.environments import router as environments_router

__all__ = ["health_router", "environments_router"]
