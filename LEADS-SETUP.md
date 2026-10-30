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

## Implementación preparada para Cloudflare Pages
Se añadieron:
- `functions/api/leads.js`: endpoint POST `/api/leads`, validación server-side, honeypot, inserción en D1, correo transaccional y sincronización opcional con Sheets.
- `migrations/0001_create_leads.sql`: tabla D1 `leads`. Cada prospecto es un registro/fila y cada campo una columna.
- `google-sheets/Code.gs`: Apps Script que agrega una fila horizontal por prospecto a la pestaña `Prospectos`.
- El formulario de `/cotizar/` ya intenta enviar JSON a `/api/leads`; no abre el correo local del visitante.

### Configuración que debe completarse en Cloudflare
1. En Cloudflare Pages, abre el proyecto conectado a este repositorio y confirma que el directorio de salida sea la raíz del repositorio y que no haya un comando de build.
2. Crea una base **D1** llamada `traveler-club-leads`.
3. En D1, ejecuta el contenido de `migrations/0001_create_leads.sql`.
4. En Pages > Settings > Functions > D1 database bindings, crea el binding con variable `DB` y selecciona esa base D1. También se puede configurar mediante Wrangler.
5. En Pages > Settings > Variables and Secrets, añade estos secretos/variables:
   - `RESEND_API_KEY` = API key privada de Resend.
   - `EMAIL_FROM` = remitente verificado, por ejemplo `Traveler Club <contacto@traveler-club.com>`.
   - `SHEETS_WEBHOOK_URL` = URL de despliegue del Apps Script (cuando esté listo).
   - `SHEETS_WEBHOOK_SECRET` = secreto aleatorio largo, igual al valor configurado en Apps Script.
6. Activa un nuevo deployment de Pages y prueba el formulario con datos ficticios. No usar datos reales hasta confirmar guardado y correo.

### Configurar Google Sheets
1. Crea una hoja de cálculo de Google para el equipo.
2. Abre Extensiones > Apps Script y pega `google-sheets/Code.gs`.
3. En Apps Script > Configuración del proyecto > Propiedades del script, crea `TRAVELER_SECRET` con el mismo secreto aleatorio configurado como `SHEETS_WEBHOOK_SECRET` en Cloudflare.
4. Implementa como Aplicación web, ejecutando como propietario y permitiendo acceso a cualquiera. La protección se realiza con el token compartido; no compartas el token.
5. Copia la URL de implementación en `SHEETS_WEBHOOK_URL` en Cloudflare y vuelve a desplegar.

La hoja crea una pestaña `Prospectos`, encabezados en la primera fila y cada nuevo cliente en una fila posterior. D1 es el registro principal; Sheets es una copia operativa. Si falla la sincronización, el registro de D1 no se pierde.

### Configurar correo
Verifica `traveler-club.com` en Resend y publica los registros DNS SPF/DKIM indicados por el proveedor. Después añade la API key como secreto en Cloudflare. El endpoint envía acuse al cliente y aviso interno a `contacto@traveler-club.com`. Si no hay API key o remitente configurado, el lead se guarda pero el correo no se envía.

### WhatsApp
No se envía ningún WhatsApp automático. El consentimiento queda guardado en la base. Activar mensajes requiere elegir WhatsApp Business Cloud API/proveedor y completar configuración de plantillas y webhooks.
