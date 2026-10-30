# Traveler Club — configuración de gestión de prospectos

## Estado de la primera entrega
- Página principal con llamadas a la acción hacia `/cotizar/`.
- Landing de cotización responsive con regreso a la página principal.
- Campos: nombre, WhatsApp, correo, destino, viajeros, fechas y notas.
- Validación de fechas y consentimiento separado para contacto por WhatsApp.
- En esta primera versión el formulario prepara un correo a `contacto@traveler-club.com`; el visitante debe enviarlo desde su aplicación de correo.
- No se guardan datos en el navegador ni se afirma que exista un envío automático.

## Pendiente para activar el flujo automático
El repositorio actualmente es una web estática (HTML, CSS e imágenes); no contiene backend ni configuración de hosting identificable. Antes de activar persistencia y acuses automáticos hay que confirmar dónde está desplegado el dominio y provisionar servicios.

### Arquitectura propuesta
1. **Base de datos:** Supabase Postgres, tabla `leads`.
2. **Correo transaccional:** Resend (o proveedor equivalente), remitente verificado `contacto@traveler-club.com`.
3. **Google Sheets:** sincronización server-side desde el backend o Apps Script protegido; nunca publicar una hoja con datos personales.
4. **WhatsApp:** pendiente de decisión. No enviar mensajes hasta seleccionar WhatsApp Business Cloud API o proveedor y obtener consentimiento válido.
5. **Agenda:** integración posterior con Google Calendar mediante OAuth/API desde backend.

### Esquema sugerido para `leads`
`id`, `created_at`, `nombre`, `whatsapp`, `email`, `destino`, `viajeros`, `fecha_inicio`, `fecha_fin`, `mensaje`, `privacy_consent`, `whatsapp_consent`, `preferred_contact_time`, `status`, `email_status`, `whatsapp_status`, `source`, `internal_notes`.

Estados iniciales: Nuevo prospecto, Confirmación enviada, Esperando respuesta, Contacto programado, Cotización enviada, En negociación, Venta cerrada, No concretada.

### Seguridad obligatoria
- Validación server-side, límites de frecuencia y honeypot/CAPTCHA.
- RLS activa en Supabase y acceso de lectura restringido al equipo.
- La clave service-role, claves de correo y tokens nunca deben estar en HTML/JavaScript público.
- Publicar aviso de privacidad completo y registrar fecha/versión del consentimiento.
- Probar con datos ficticios antes de producción.

## Datos que faltan para cerrar la automatización
- Confirmar proveedor/hosting del dominio y acceso a su configuración.
- Crear o autorizar el proyecto Supabase.
- Verificar el dominio de correo en el proveedor transaccional y configurar DNS.
- Decidir más adelante el proveedor oficial de WhatsApp.
- Definir la cuenta de Google que será propietaria de la hoja de seguimiento y permisos del equipo.
