# Simulación AWS de VIC sin gasto real

Esta carpeta prepara el despliegue equivalente a las dos máquinas de
VirtualBox, pero **no crea recursos automáticamente**.

```text
Internet
   |
   v
EC2 vic-publico (Nginx, frontend, TLS y Node Exporter)
   |
   | Security Groups + red privada 10.30.1.0/24
   v
EC2 vic-privado (API x2, SQLite, Prometheus y Grafana)
```

La plantilla evita deliberadamente NAT Gateway, Elastic IP, balanceador AWS y
RDS. Nginx realiza el balanceo y SQLite conserva la base de demostración. De
este modo se reducen los servicios que consumen créditos.

Para permitir actualizaciones sin pagar un NAT Gateway, la instancia privada
recibe una IPv4 pública temporal, pero su Security Group no acepta ninguna
entrada desde Internet: SSH, API y Grafana solo admiten como origen el grupo de
seguridad del servidor público. Es una decisión exclusiva del laboratorio, no
una recomendación para producción.

## Modo seguro actual

Ejecutar únicamente la validación local:

```powershell
cd "C:\PROGRAMACION\PI\PROYECTO INTEGRADOR"
powershell -ExecutionPolicy Bypass -File .\infra\aws\validar-simulacion.ps1
```

Este comando no inicia sesión en AWS y no crea recursos. La simulación
ejecutable continúa siendo `vic-publico` + `vic-privado` en VirtualBox.

## Cuando se autorice AWS

1. Crear una cuenta nueva seleccionando **Free account plan**.
2. Activar MFA en la cuenta raíz.
3. Configurar alertas de Free Tier y un presupuesto de gasto cero.
4. Crear una llave EC2 y obtener la IP pública del administrador como `/32`.
5. Revisar los créditos disponibles y la región antes de crear una pila.
6. Crear la pila solamente durante la demostración y eliminarla al terminar.

La plantilla usa dos instancias y discos EBS cifrados. Aunque estén diseñados
para una práctica pequeña, **una validación no garantiza que crear la pila sea
gratis**. AWS no proporciona un sandbox de CloudFormation sin consumo.

No se incluye intencionalmente ningún comando `aws cloudformation deploy`. La
creación real debe hacerse únicamente con confirmación expresa después de
revisar la cuenta y sus límites.
