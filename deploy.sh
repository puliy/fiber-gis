#!/bin/bash
set -e
APP_DIR="/opt/fibergis"
DOMAIN="fibergis.ru"

echo "=== [1/6] Зависимости ==="
apt-get update -qq
apt-get install -y git curl ca-certificates gnupg nginx certbot python3-certbot-nginx

echo "=== [2/6] Docker ==="
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker && systemctl start docker
fi
if ! docker compose version &>/dev/null 2>&1; then
  mkdir -p /usr/local/lib/docker/cli-plugins
  curl -SL "https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi
echo "Docker: $(docker --version)"
echo "Compose: $(docker compose version)"

echo "=== [3/6] Код ==="
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR" && git pull
else
  git clone https://github.com/puliy/fiber-gis.git "$APP_DIR"
fi
cd "$APP_DIR"

echo "=== [4/6] .env ==="
cp .env.production .env

echo "=== [5/6] Nginx (HTTP) ==="
mkdir -p /var/www/certbot
# Используем HTTP-only конфиг (без SSL) для первого запуска
cp "$APP_DIR/nginx-http.conf" /etc/nginx/sites-available/fibergis
ln -sf /etc/nginx/sites-available/fibergis /etc/nginx/sites-enabled/fibergis
[ -f /etc/nginx/sites-enabled/default ] && unlink /etc/nginx/sites-enabled/default || true
nginx -t && systemctl reload nginx

echo "=== [6/6] Docker Compose ==="
# Для первого запуска без SSL используем nginx-http.conf внутри контейнера
cp "$APP_DIR/nginx-http.conf" "$APP_DIR/nginx.conf"
docker compose down 2>/dev/null || true
docker compose up -d --build

echo ""
echo "=== Деплой завершён! ==="
sleep 5
docker compose ps
echo ""
echo "Сайт доступен: http://$DOMAIN"
echo ""
echo "Для HTTPS (после распространения DNS fibergis.ru → 188.225.84.38):"
echo "  certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN"
echo "  # После certbot восстановите nginx.conf с SSL:"
echo "  cp $APP_DIR/nginx.conf.bak $APP_DIR/nginx.conf 2>/dev/null || true"
echo "  docker compose restart nginx"
