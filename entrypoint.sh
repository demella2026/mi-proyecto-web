#!/bin/bash

set -e

echo "⏳ Esperando a que PostgreSQL esté disponible..."
while ! python -c "
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    s.connect(('${POSTGRES_HOST:-db}', ${POSTGRES_PORT:-5432}))
    s.close()
    exit(0)
except:
    exit(1)
" 2>/dev/null; do
    echo "   PostgreSQL no está listo. Reintentando en 2 segundos..."
    sleep 2
done

echo "✅ PostgreSQL disponible. Ejecutando migraciones..."
python manage.py migrate --noinput

echo "📦 Recopilando archivos estáticos..."
python manage.py collectstatic --noinput

echo "🚀 Iniciando Gunicorn..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -