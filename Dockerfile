# ─────────────────────────────────────────────
#  Imagen base: Python 3.12 slim
# ─────────────────────────────────────────────
FROM python:3.12-slim

# Variables de entorno para Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Directorio de trabajo
WORKDIR /app

# Dependencias del sistema para psycopg2 y python-ldap
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libpq-dev \
        gcc \
        libldap2-dev \
        libsasl2-dev \
        ldap-utils \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copiar codigo fuente
COPY . .

# Crear directorio para archivos media
RUN mkdir -p /app/media

# Dar permisos de ejecucion al entrypoint
RUN chmod +x /app/entrypoint.sh

# Puerto expuesto
EXPOSE 8000

# Punto de entrada
ENTRYPOINT ["/app/entrypoint.sh"]
