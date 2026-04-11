FROM php:8.3-apache

RUN { \
  echo 'upload_max_filesize=30M'; \
  echo 'post_max_size=30M'; \
  echo 'memory_limit=256M'; \
  echo 'max_execution_time=120'; \
  echo 'max_input_time=120'; \
} > /usr/local/etc/php/conf.d/uploads.ini

RUN apt-get update && apt-get install -y \
    git curl unzip zip libpq-dev libzip-dev libonig-dev libxml2-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql zip

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

RUN a2enmod rewrite

RUN sed -ri -e 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/000-default.conf

RUN printf '<Directory /var/www/html/public>\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>\n' > /etc/apache2/conf-available/laravel.conf \
    && a2enconf laravel

RUN composer install --no-dev --optimize-autoloader

RUN rm -rf /var/www/html/public/storage \
    && php artisan storage:link \
    && chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chown -h www-data:www-data /var/www/html/public/storage || true

# Tạo đủ thư mục Laravel cần để chạy runtime
RUN mkdir -p \
    /var/www/html/storage/framework/cache \
    /var/www/html/storage/framework/sessions \
    /var/www/html/storage/framework/views \
    /var/www/html/storage/logs \
    /var/www/html/bootstrap/cache

RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
RUN chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

RUN php artisan config:clear || true
RUN php artisan route:clear || true
RUN php artisan view:clear || true

EXPOSE 80

CMD ["sh", "-c", "php artisan migrate --force && apache2-foreground"]
