# ─────────────────────────────────────────────
#  Imagen base: Python 3.12 slim
# ─────────────────────────────────────────────
FROM python:3.12-slim

# Variables de entorno para Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Directorio de trabajo
WORKDIR /app

# Dependencias del sistema para psycopg2
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libpq-dev \
        gcc \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copiar código fuente
COPY . .

# Dar permisos de ejecución al entrypoint
RUN chmod +x /app/entrypoint.sh

# Puerto expuesto
EXPOSE 8000

# Punto de entrada
ENTRYPOINT ["/app/entrypoint.sh"]