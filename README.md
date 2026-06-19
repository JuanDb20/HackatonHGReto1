# LitigIA

**Legal Hack Icesi 2026 · Reto 1: Litigio Masivo · Hurtado Gandini Abogados S.A.S.**

## El problema

Hurtado Gandini maneja entre 30 y 80 demandas simultáneas por abogado. Cada contestación se redacta desde cero o adaptando una plantilla anterior, lo que toma entre 2 y 4 horas por expediente, gestionado en PDFs sueltos y hojas de cálculo internas. El riesgo principal no es la calidad del argumento jurídico, sino la caducidad del término de contestación y la extemporaneidad de las excepciones.

## La solución

LitigIA es una plataforma interna que genera, en minutos, un borrador completo de contestación de demanda a partir del PDF de la demanda, con la estructura exacta del artículo 96 del Código General del Proceso.

Por debajo no hay un chatbot genérico: hay un árbol de decisión jurídico real que valida competencia (CPACA si el demandado es entidad pública), mérito ejecutivo en pólizas, prevalencia de materia sobre cuantía para fijar juez y trámite (familia, art. 390 CGP), y solo al final clasifica entre verbal y ordinario. El sistema también propone de oficio las excepciones que el juez nunca declara por su cuenta (prescripción, compensación, nulidad relativa) cuando los hechos las sugieren.

La solución no entrega contestaciones sin validación humana: el botón de exportar permanece bloqueado hasta que el abogado marca como revisada cada sección crítica, y cada documento se firma con la cédula, tarjeta profesional y firma real del abogado registrado — nunca con datos inventados por la IA.

Adicionalmente, cada demanda procesada queda registrada como caso, y el abogado puede activar un seguimiento de términos: LitigIA calcula la fecha límite real en días hábiles colombianos (festivos incluidos) y alerta al entrar a la plataforma cuando un término está por vencer.

### Funcionalidades principales

- Generación de borrador de contestación a partir de un PDF de demanda (Claude API).
- Motor de clasificación jurídica: CPACA, mérito ejecutivo, materia vs. cuantía, verbal/ordinario.
- Alertas críticas de riesgo procesal y bloqueo de exportación hasta revisión humana completa.
- Perfil de abogado con cédula, tarjeta profesional, firma digital y foto — autocompletados en cada documento.
- Seguimiento de términos: cálculo de vencimientos en días hábiles colombianos y banner de alerta.
- Dashboard de impacto económico y modelo de negocio (SaaS B2B para otras firmas).
- Autenticación por sesión (JWT) — acceso exclusivo a abogados de la firma, sin registro externo.

## Stack tecnológico

- **Frontend / Backend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4.
- **IA:** Anthropic Claude API, con prompt caching.
- **Base de datos:** Postgres serverless (Neon).
- **Autenticación:** JWT (`jose`) + `bcryptjs`, cookie de sesión.
- **Almacenamiento de archivos:** Amazon S3 (fotos de perfil).
- **Editor de documentos:** TipTap.
- **Despliegue:** Render.

## Cómo ejecutarlo localmente

### 1. Requisitos

- Node.js 18 o superior.
- Una base de datos Postgres (se usó [Neon](https://neon.tech), capa gratuita suficiente).
- Una API key de [Anthropic](https://console.anthropic.com).
- (Opcional) Un bucket de Amazon S3 si se quiere habilitar la foto de perfil.

### 2. Clonar e instalar dependencias

```bash
git clone https://github.com/JuanDb20/HackatonHGReto1.git
cd HackatonHGReto1
npm install
```

### 3. Variables de entorno

Crear un archivo `.env` en la raíz del proyecto con:

```bash
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://usuario:password@host/basededatos
JWT_SECRET=una-cadena-aleatoria-larga

# Opcional — solo necesario para foto de perfil en /perfil
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
AWS_S3_BUCKET=...
```

### 4. Levantar el servidor de desarrollo

```bash
npm run dev
```

La app queda disponible en [http://localhost:3000](http://localhost:3000).

### 5. Inicializar la base de datos

Las tablas se crean de forma idempotente visitando estos endpoints una sola vez (en el navegador o con `curl`), en este orden:

```bash
curl http://localhost:3000/api/auth/setup   # crea litigia_users y siembra usuarios de demo
curl http://localhost:3000/api/casos/setup  # crea litigia_casos (seguimiento de términos)
```

El endpoint `/api/auth/setup` devuelve los correos y contraseñas de los usuarios de prueba creados — úsalos para iniciar sesión en `/login`.

### 6. Probar el flujo completo

1. Inicia sesión en `/login` con uno de los usuarios sembrados.
2. En `/inicio`, sube un PDF de demanda (o usa el botón de demo de ejemplo).
3. Revisa el borrador generado, marca cada sección como revisada y exporta el documento.
4. Activa el seguimiento de términos del caso y revisa `/terminos` para ver el vencimiento calculado.

## Estructura del proyecto

```
app/
  api/            Rutas de API (auth, generación con Claude, casos/términos)
  inicio/         Pantalla principal — subir demanda y generar contestación
  editor/         Editor del borrador con control de revisión humana
  terminos/       Seguimiento de vencimientos por caso
  perfil/         Datos del abogado (cédula, T.P., firma, foto)
  dashboard/      Impacto económico y modelo de negocio
lib/
  prompts.ts      Prompt jurídico del modelo (árbol de decisión, normativa)
  diasHabilesCo.ts Cálculo de días hábiles colombianos (festivos, Ley Emiliani)
  db.ts / auth.ts Conexión a Postgres y manejo de sesión
docs/             Normativa de referencia y documentos del equipo
```

## Licencia y propiedad

Proyecto desarrollado para el Legal Hack Icesi 2026, organizado por Hurtado Gandini Abogados S.A.S. en alianza con la Universidad Icesi. El equipo conserva la propiedad intelectual de la solución conforme al Reglamento Oficial del evento.
