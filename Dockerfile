# ============================================================
# E&U Transport — Static site container
# Serve pure HTML/CSS/JS via Nginx Alpine (klein & snel)
# ============================================================
FROM nginx:1.27-alpine

# Verwijder default site en plaats onze eigen config
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Kopieer alle statische bestanden naar de webroot
COPY . /usr/share/nginx/html

# Dockerfile & compose zelf niet serveren
RUN rm -f /usr/share/nginx/html/Dockerfile \
          /usr/share/nginx/html/docker-compose.yml \
          /usr/share/nginx/html/.dockerignore \
          /usr/share/nginx/html/nginx.conf

EXPOSE 80

# Healthcheck zodat NPM / Docker weet dat de container gezond is
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/ >/dev/null || exit 1
