FROM php:8.3-apache

RUN apt-get update && apt-get install -y \
    git curl unzip zip libpq-dev libzip-dev libonig-dev libxml2-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql zip

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

RUN a2enmod rewrite

# Đổi DocumentRoot sang public
RUN sed -ri -e 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/000-default.conf

# Cho phép .htaccess hoạt động trong thư mục public
RUN printf '<Directory /var/www/html/public>\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>\n' > /etc/apache2/conf-available/laravel.conf \
    && a2enconf laravel

RUN composer install --no-dev --optimize-autoloader

RUN php artisan config:clear || true
RUN php artisan route:clear || true
RUN php artisan view:clear || true

RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 80

CMD ["apache2-foreground"]
