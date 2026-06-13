import os
import mimetypes
import hashlib
from pathlib import Path
from typing import Optional, List
from datetime import datetime
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image

app = FastAPI(title="Tailnet Drive", description="Tailscale-secured Read-only File Browser")

# Base directory for shared files
BASE_DIR = Path("/app/files").resolve()
# Base directory for caching thumbnails
THUMBNAIL_DIR = Path("/app/.thumbnails").resolve()
THUMBNAIL_DIR.mkdir(parents=True, exist_ok=True)

# Helper function to validate path and prevent path traversal
def get_safe_path(relative_path: str) -> Path:
    # Resolve relative path, handling URL decoding issues if any
    clean_rel = relative_path.lstrip("/")
    safe_path = Path(os.path.normpath(BASE_DIR / clean_rel))
    # Ensure resolved path is under BASE_DIR
    if not str(safe_path).startswith(str(BASE_DIR)):
        raise HTTPException(status_code=403, detail="Access denied (path traversal prevented)")
    return safe_path


@app.get("/api/files")
def list_files(path: str = ""):
    try:
        target_dir = get_safe_path(path)
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid path format")

    if not target_dir.exists():
        raise HTTPException(status_code=404, detail="Directory not found")
    
    if not target_dir.is_dir():
        raise HTTPException(status_code=400, detail="Target is a file, not a directory")

    folders = []
    files = []

    # Calculate breadcrumbs
    breadcrumbs = []
    parts = [p for p in path.strip("/").split("/") if p]
    current_accum = []
    breadcrumbs.append({"name": "My Drive", "path": ""})
    for part in parts:
        current_accum.append(part)
        breadcrumbs.append({"name": part, "path": "/".join(current_accum)})

    try:
        for entry in os.scandir(target_dir):
            # Skip hidden files
            if entry.name.startswith('.'):
                continue
                
            stat = entry.stat()
            modified_time = stat.st_mtime
            
            # Format time beautifully
            dt = datetime.fromtimestamp(modified_time)
            formatted_date = dt.strftime("%b %d, %Y, %I:%M %p")
            
            rel_entry_path = os.path.relpath(entry.path, BASE_DIR)
            
            if entry.is_dir():
                folders.append({
                    "name": entry.name,
                    "path": rel_entry_path,
                    "modified": formatted_date,
                    "timestamp": modified_time
                })
            else:
                # Get file size
                size_bytes = stat.st_size
                # Format file size
                if size_bytes < 1024:
                    size_str = f"{size_bytes} B"
                elif size_bytes < 1024 * 1024:
                    size_str = f"{size_bytes / 1024:.1f} KB"
                else:
                    size_str = f"{size_bytes / (1024 * 1024):.1f} MB"
                
                # Check mime type
                mime_type, _ = mimetypes.guess_type(entry.name)
                is_image = False
                width, height = None, None
                
                if mime_type and mime_type.startswith("image/"):
                    is_image = True
                    try:
                        with Image.open(entry.path) as img:
                            width, height = img.size
                    except Exception:
                        pass
                
                files.append({
                    "name": entry.name,
                    "path": rel_entry_path,
                    "size_bytes": size_bytes,
                    "size": size_str,
                    "modified": formatted_date,
                    "timestamp": modified_time,
                    "is_image": is_image,
                    "mime_type": mime_type or "application/octet-stream",
                    "width": width,
                    "height": height
                })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read directory: {str(e)}")

    # Sort folders and files by name by default
    folders.sort(key=lambda x: x["name"].lower())
    files.sort(key=lambda x: x["name"].lower())

    return {
        "current_path": path,
        "breadcrumbs": breadcrumbs,
        "folders": folders,
        "files": files
    }

@app.get("/api/raw/{file_path:path}")
def get_raw_file(file_path: str):
    target_file = get_safe_path(file_path)
    if not target_file.exists() or not target_file.is_file():
        raise HTTPException(status_code=404, detail="File not found")
        
    mime_type, _ = mimetypes.guess_type(target_file.name)
    return FileResponse(
        path=target_file,
        media_type=mime_type or "application/octet-stream",
        filename=target_file.name
    )

@app.get("/api/thumbnail/{file_path:path}")
def get_thumbnail(file_path: str, width: int = 250, height: int = 250):
    target_file = get_safe_path(file_path)
    if not target_file.exists() or not target_file.is_file():
        raise HTTPException(status_code=404, detail="File not found")
        
    # Check if image
    mime_type, _ = mimetypes.guess_type(target_file.name)
    if not mime_type or not mime_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Requested file is not an image")
        
    # Generate a cache key based on path, size, and modification time
    mtime = target_file.stat().st_mtime
    file_hash = hashlib.md5(f"{file_path}_{width}_{height}_{mtime}".encode()).hexdigest()
    cached_thumb_path = THUMBNAIL_DIR / f"{file_hash}.png"
    
    if cached_thumb_path.exists():
        return FileResponse(cached_thumb_path, media_type="image/png")
        
    try:
        with Image.open(target_file) as img:
            # Maintain aspect ratio using thumbnail method
            img.thumbnail((width, height), Image.Resampling.LANCZOS)
            # Save to cache
            img.save(cached_thumb_path, format="PNG")
        return FileResponse(cached_thumb_path, media_type="image/png")
    except Exception:
        # Fallback to serving original file
        return FileResponse(target_file, media_type=mime_type)

# Mount the static directory so style.css and app.js can be loaded
app.mount("/static", StaticFiles(directory="/app/static"), name="static")

# Fallback route to serve index.html for frontend routing
@app.get("/{catchall:path}")
def read_root(catchall: str = ""):
    # Serve index.html
    index_path = Path("/app/static/index.html")
    if not index_path.exists():
        return HTMLResponse("<h1>Frontend not found. Please build frontend first.</h1>")
    return FileResponse(index_path)
