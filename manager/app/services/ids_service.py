import hashlib


class IdsService:
    @staticmethod
    def compute_environment_id(resolved_path: str) -> str:
        return hashlib.sha256(resolved_path.encode()).hexdigest()[:8]
