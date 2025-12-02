FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*
COPY . /usr/share/nginx/html/
COPY default.conf /etc/nginx/conf.d/default.conf
COPY docker/entrypoint/10-generate-config.sh /docker-entrypoint.d/10-generate-config.sh
RUN chmod +x /docker-entrypoint.d/10-generate-config.sh
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]