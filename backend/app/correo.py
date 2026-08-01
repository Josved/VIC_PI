import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr

from .configuracion import configuracion

registrador = logging.getLogger(__name__)


def smtp_configurado() -> bool:
    return bool(configuracion.smtp_host and configuracion.smtp_remitente)


def enviar_correo(destinatario: str, asunto: str, texto: str) -> bool:
    if not smtp_configurado():
        registrador.warning("SMTP no está configurado; no se envió el correo solicitado")
        return False

    mensaje = EmailMessage()
    mensaje["From"] = formataddr(
        (configuracion.smtp_nombre_remitente, configuracion.smtp_remitente),
    )
    mensaje["To"] = destinatario
    mensaje["Subject"] = asunto
    mensaje.set_content(texto)

    contexto_tls = ssl.create_default_context()
    try:
        if configuracion.smtp_usar_ssl:
            servidor = smtplib.SMTP_SSL(
                configuracion.smtp_host,
                configuracion.smtp_port,
                timeout=15,
                context=contexto_tls,
            )
        else:
            servidor = smtplib.SMTP(
                configuracion.smtp_host,
                configuracion.smtp_port,
                timeout=15,
            )

        with servidor:
            servidor.ehlo()
            if configuracion.smtp_usar_starttls and not configuracion.smtp_usar_ssl:
                servidor.starttls(context=contexto_tls)
                servidor.ehlo()
            if configuracion.smtp_usuario:
                servidor.login(
                    configuracion.smtp_usuario,
                    configuracion.smtp_contrasena,
                )
            servidor.send_message(mensaje)
        return True
    except (OSError, smtplib.SMTPException):
        registrador.exception("No se pudo enviar un correo de VIC por SMTP")
        return False


def enviar_codigo_recuperacion(destinatario: str, nombre: str, codigo: str) -> bool:
    minutos = configuracion.minutos_expiracion_recuperacion
    texto = (
        f"Hola, {nombre}.\n\n"
        "Recibimos una solicitud para restablecer tu contraseña de VIC.\n\n"
        f"Tu código de recuperación es: {codigo}\n\n"
        f"El código vence en {minutos} minutos y solo puede usarse una vez. "
        "Si no solicitaste este cambio, ignora este correo.\n\n"
        "VIC nunca te pedirá que compartas este código ni tu contraseña."
    )
    return enviar_correo(destinatario, "Código para recuperar tu cuenta VIC", texto)


def enviar_aviso_contrasena_actualizada(destinatario: str, nombre: str) -> bool:
    texto = (
        f"Hola, {nombre}.\n\n"
        "La contraseña de tu cuenta VIC se actualizó correctamente. "
        "Se cerraron las sesiones anteriores por seguridad.\n\n"
        "Si tú no hiciste este cambio, contacta de inmediato al administrador del sistema."
    )
    return enviar_correo(destinatario, "Tu contraseña de VIC fue actualizada", texto)
