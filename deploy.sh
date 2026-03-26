#!/bin/bash
set -e
GH_TOKEN="ghu_ccIlTZWHWvKBwdx9hyIJf3nsQIWSvS0e3znv"
REPO="https://${GH_TOKEN}@github.com/puliy/fiber-gis.git"
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
  git clone "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"

echo "=== [4/6] .env ==="
cp .env.production .env

echo "=== [5/6] Nginx ==="
mkdir -p /var/www/certbot
cat > /etc/nginx/sites-available/fibergis << NGINXEOF
server {
    listen 80;
    server_name fibergis.ru www.fibergis.ru;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        client_max_body_size 50M;
    }
}
NGINXEOF
ln -sf /etc/nginx/sites-available/fibergis /etc/nginx/sites-enabled/fibergis
[ -f /etc/nginx/sites-enabled/default ] && unlink /etc/nginx/sites-enabled/default || true
nginx -t && systemctl reload nginx

echo "=== [6/6] Docker Compose ==="
docker compose down 2>/dev/null || true
docker compose up -d --build

echo ""
echo "=== Деплой завершён! ==="
docker compose ps
echo ""
echo "Сайт доступен: http://$DOMAIN"
echo ""
echo "Для HTTPS (после распространения DNS fibergis.ru):"
echo "  certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN"
