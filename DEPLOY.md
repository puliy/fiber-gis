# Деплой FiberGIS на VPS

## Требования к серверу

| Параметр | Минимум | Рекомендуется |
|---|---|---|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| SSD | 40 GB | 80 GB |
| ОС | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

**Провайдеры:** Selectel, Timeweb Cloud, Yandex Cloud, REG.RU

---

## 1. Подготовка сервера

```bash
# Обновляем систему
sudo apt update && sudo apt upgrade -y

# Устанавливаем Docker и Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Проверяем
docker --version
docker compose version
```

---

## 2. Клонируем репозиторий

```bash
git clone https://github.com/YOUR_ORG/fiber-gis.git
cd fiber-gis
```

---

## 3. Настраиваем переменные окружения

Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
nano .env
```

Обязательные переменные:

```env
DATABASE_URL=mysql://fiberuser:STRONG_PASSWORD@db:3306/fibergis
MYSQL_ROOT_PASSWORD=CHANGE_ME_ROOT
MYSQL_PASSWORD=STRONG_PASSWORD
JWT_SECRET=MINIMUM_32_CHARS_RANDOM_STRING
```

Для генерации JWT_SECRET:
```bash
openssl rand -hex 32
```

---

## 4. Настраиваем домен в nginx.conf

```bash
# Заменяем YOUR_DOMAIN.ru на ваш домен
sed -i 's/YOUR_DOMAIN.ru/yourdomain.ru/g' nginx.conf
```

---

## 5. Получаем SSL-сертификат (Let's Encrypt)

```bash
# Устанавливаем certbot
sudo apt install certbot -y

# Получаем сертификат (DNS должен уже указывать на сервер)
sudo certbot certonly --standalone -d yourdomain.ru

# Автообновление
sudo systemctl enable certbot.timer
```

---

## 6. Запускаем приложение

```bash
# Собираем и запускаем
docker compose up -d --build

# Проверяем статус
docker compose ps
docker compose logs -f app
```

---

## 7. Применяем миграции БД

После первого запуска выполните миграции:

```bash
# Заходим в контейнер приложения
docker compose exec app sh

# Применяем миграции
pnpm drizzle-kit migrate
exit
```

Или применяйте SQL-файлы из папки `drizzle/` напрямую через MySQL клиент.

---

## 8. Создание первого администратора

После регистрации через OAuth выполните:

```bash
docker compose exec db mysql -u fiberuser -p fibergis
```

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.ru';
```

---

## Обновление приложения

```bash
git pull
docker compose up -d --build
```

---

## Мониторинг и логи

```bash
# Логи приложения
docker compose logs -f app

# Логи nginx
docker compose logs -f nginx

# Статус всех сервисов
docker compose ps

# Использование ресурсов
docker stats
```

---

## Резервное копирование БД

```bash
# Создать дамп
docker compose exec db mysqldump -u fiberuser -p fibergis > backup_$(date +%Y%m%d).sql

# Восстановить из дампа
docker compose exec -T db mysql -u fiberuser -p fibergis < backup_20260101.sql
```

---

## Использование внешней MySQL (Selectel DBaaS / Yandex Managed MySQL)

Если используете managed MySQL, уберите сервис `db` из `docker-compose.yml` и укажите в `.env`:

```env
DATABASE_URL=mysql://user:password@your-managed-mysql-host:3306/fibergis
```

Это рекомендуемый подход для продакшн-окружения — managed MySQL обеспечивает автоматические бэкапы и репликацию.
