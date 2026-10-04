#!/bin/sh
set -eu

cd /var/www/html

if [ -n "${HOST_UID:-}" ]; then
  usermod -u "$HOST_UID" www-data || true
  groupmod -g "${HOST_GID:-$HOST_UID}" www-data || true
fi

if [ ! -f vendor/autoload.php ]; then
  composer install --no-dev --no-interaction --prefer-dist
fi

if [ ! -f config.php ]; then
  php /opt/ciwa/install-cli.php
fi

php /opt/ciwa/generate-oauth-keys.php
php /opt/ciwa/seed-oauth-client.php

for path in vendor cache custom upload config.php config_override.php .htaccess Api/V8/OAuth2/private.key Api/V8/OAuth2/public.key; do
  if [ -e "$path" ]; then
    chown -R www-data:www-data "$path" || true
  fi
done

exec apache2-foreground
