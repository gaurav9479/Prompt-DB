import importlib
import sys
from pathlib import Path
import uvicorn


def ensure_project_root_on_path() -> None:
    """Ensure the project root (parent of this file's parent) is on sys.path.
    This makes `import backend.*` work when running `python run.py` from
    the `backend/` directory.
    """
    project_root = Path(__file__).resolve().parent.parent
    project_root_str = str(project_root)
    if project_root_str not in sys.path:
        sys.path.insert(0, project_root_str)


def _uvicorn_target() -> str:
    # Always use the package-qualified import for the app.
    return "backend.main:app"


if __name__ == "__main__":
    ensure_project_root_on_path()
    uvicorn.run(
        _uvicorn_target(),
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
