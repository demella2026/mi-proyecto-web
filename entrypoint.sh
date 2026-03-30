#!/bin/bash
set -e

# Forzamos que si estamos en Docker, el HOST sea 'db' si no se detecta otro
DB_HOST=${POSTGRES_HOST:-db}
DB_PORT=${POSTGRES_PORT:-5432}

echo "⏳ Esperando a que PostgreSQL esté disponible en $DB_HOST:$DB_PORT..."

while ! python -c "
import socket
import sys
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    # Usamos las variables definidas arriba
    s.connect(('$DB_HOST', int('$DB_PORT')))
    s.close()
    sys.exit(0)
except Exception as e:
    sys.exit(1)
" 2>/dev/null; do
    echo "   PostgreSQL ($DB_HOST) no está listo. Reintentando en 2 segundos..."
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