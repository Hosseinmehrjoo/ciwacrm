FROM public.ecr.aws/docker/library/php:8.3-apache

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    git unzip curl libzip-dev libpng-dev libicu-dev libxml2-dev libonig-dev \
  && docker-php-ext-install pdo_mysql mysqli gd intl zip mbstring \
  && a2enmod rewrite headers expires \
  && printf '%s\n' \
    '<Directory /var/www/html>' \
    '  AllowOverride All' \
    '  Require all granted' \
    '</Directory>' \
    > /etc/apache2/conf-available/ciwa-override.conf \
  && a2enconf ciwa-override \
  && printf '%s\n' 'memory_limit=512M' 'upload_max_filesize=32M' 'post_max_size=32M' \
    > /usr/local/etc/php/conf.d/ciwa.ini \
  && rm -rf /var/lib/apt/lists/*

RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

COPY entrypoint.sh /usr/local/bin/ciwa-entrypoint
COPY install-cli.php /opt/ciwa/install-cli.php
COPY seed-oauth-client.php /opt/ciwa/seed-oauth-client.php
COPY generate-oauth-keys.php /opt/ciwa/generate-oauth-keys.php
RUN chmod +x /usr/local/bin/ciwa-entrypoint

WORKDIR /var/www/html
RUN printf '%s\n' 'display_errors=Off' 'log_errors=On' 'error_reporting=E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED' > /usr/local/etc/php/conf.d/ciwa-errors.ini
EXPOSE 80
ENTRYPOINT ["ciwa-entrypoint"]
