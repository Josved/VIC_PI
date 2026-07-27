from fastapi import Depends, HTTPException, status

from .autenticacion import obtener_usuario_actual
from .modelos import Usuario


def requiere_rol(*roles_permitidos: str):
    def verificar(usuario_actual: Usuario = Depends(obtener_usuario_actual)) -> Usuario:
        if usuario_actual.rol not in roles_permitidos:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para esta accion")
        return usuario_actual

    return verificar
