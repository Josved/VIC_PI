from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from .autenticacion import obtener_usuario_actual
from .configuracion import configuracion
from .esquemas import EvidenciaRespuesta
from .modelos import Usuario

enrutador = APIRouter(prefix="/archivos", tags=["archivos"])

TIPOS_PERMITIDOS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
TAMANO_MAXIMO = 8 * 1024 * 1024


@enrutador.post("/evidencias", response_model=EvidenciaRespuesta)
async def subir_evidencia(
    archivo: UploadFile = File(...),
    _usuario: Usuario = Depends(obtener_usuario_actual),
):
    extension = TIPOS_PERMITIDOS.get(archivo.content_type or "")
    if not extension:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="La evidencia debe ser JPG, PNG o WEBP",
        )

    contenido = await archivo.read(TAMANO_MAXIMO + 1)
    if len(contenido) > TAMANO_MAXIMO:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="La evidencia no puede superar 8 MB",
        )

    directorio = Path(configuracion.directorio_evidencias)
    directorio.mkdir(parents=True, exist_ok=True)
    nombre = f"{uuid4().hex}{extension}"
    (directorio / nombre).write_bytes(contenido)
    return EvidenciaRespuesta(
        url=f"{configuracion.url_publica_evidencias.rstrip('/')}/{nombre}",
    )
