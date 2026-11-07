# Seguridad y despliegue

## Cambios incluidos

- Next.js y eslint-config-next 16.4.5; dependencias transitivas actualizadas. Un override acotado a typescript-estree usa minimatch 11.0.1 para corregir GHSA-g3hv-75wg-m249. Revisar y retirar el override cuando typescript-estree actualice su dependencia.
- Verificación TLS obligatoria para bases remotas. Los parámetros SSL de DATABASE_URL no pueden desactivar esta política. localhost, 127.0.0.1 y ::1 permiten PostgreSQL sin TLS.
- Mutaciones de API requieren Origin del sitio o Fetch Metadata same-origin; se rechazan orígenes externos. APP_ORIGIN permite definir el origen público detrás de un proxy. Los clientes de API propios deben enviar esa cabecera Origin.
- Cuerpos JSON de hasta 64 KiB medidos durante la lectura, incluso sin Content-Length. Se rechazan formularios y text/plain.
- Contraseñas limitadas a 72 bytes UTF-8 tanto en registro como en login para evitar truncamiento de bcrypt.
- Sesiones persistidas en PostgreSQL y revocadas en logout, al renovar la cookie y al eliminar la cuenta. Cada API consulta su vigencia. El proxy verifica el JWT solo para redirecciones optimistas.
- Login: 100 intentos por origen de conexión y 10 por correo cada 15 minutos. Registro: 20 por origen de conexión cada 15 minutos. Los contadores usan operaciones atómicas compartidas entre instancias, claves HMAC y respuestas 429 con Retry-After. Se cuentan también intentos exitosos; no se reinicia el contador al autenticarse.
- Sin TRUSTED_CLIENT_IP_HEADER, el límite por conexión se comparte globalmente. Con la variable configurada, la cabecera debe contener una sola IP válida; de lo contrario se responde 503. El hosting debe sobrescribirla y evitar el acceso directo que eluda el proxy. No confiar en X-Forwarded-For enviado por el cliente.
- Respuestas API privadas sin almacenamiento en caché. Cabeceras contra framing, detección incorrecta de contenido y acceso innecesario a cámara, micrófono y ubicación. La CSP añadida restringe frames, objetos y base URI; no es una política completa contra XSS.

## Antes de desplegar

1. Preparar DATABASE_CA_CERT si el proveedor usa una CA privada. La app fallará al conectar si el certificado no es confiable; no desactivar la verificación. La variable contiene el PEM completo, no la ruta del archivo. La CLI de Prisma usa DIRECT_URL y su propia configuración TLS.
2. Configurar APP_ORIGIN con el origen público y, tras verificar el comportamiento del proxy, TRUSTED_CLIENT_IP_HEADER. Sin esa cabecera confiable se mantiene el límite global conservador.
3. Aplicar las migraciones pendientes con `npx prisma migrate deploy` usando la conexión de migraciones correcta. Revisar también las migraciones anteriores que sigan pendientes. Esta actualización añade las tablas sessions y auth_rate_limits; no aplica migraciones automáticamente al arrancar ni al compilar.
4. Desplegar la nueva compilación y reiniciar todas las instancias. Las cookies anteriores no tienen identificador de sesión y se rechazan: todos deberán iniciar sesión otra vez.
5. Comprobar login, registro, onboarding, edición de tareas y logout contra la base migrada. Reutilizar una cookie copiada antes del logout debe devolver 401 en la API después del logout. Las pruebas locales usan almacenamiento simulado; falta verificar la integración real con PostgreSQL.

Las contraseñas antiguas de más de 72 bytes ya no se aceptan. Si existen cuentas afectadas, sus propietarios necesitarán restablecerlas; el proyecto todavía no tiene un flujo de recuperación por correo.

## Pendientes de infraestructura y producto

- Servir exclusivamente por HTTPS y configurar HSTS en el hosting tras verificar el dominio.
- Añadir límites en el proxy/WAF para conexiones, tamaño de peticiones y tráfico global. Los límites de aplicación requieren una consulta a PostgreSQL y no sustituyen la protección contra ataques volumétricos.
- El registro sigue mostrando si un correo ya existe. Ocultarlo de forma útil requiere un flujo de verificación por correo con una respuesta uniforme para cuentas nuevas y existentes.
- Configurar alertas y mantenimiento de datos de autenticación. La app elimina sesiones expiradas al emitir sesiones nuevas y contadores expirados después de admitir tráfico de autenticación.
- Mantener JWT_SECRET aleatorio y privado, de al menos 32 caracteres; rotarlo invalida todas las cookies y cambia las claves de los contadores.
