# The WebAssembly bundle in web/ is a prebuilt, architecture-independent
# Emscripten build. nginx:1.29-alpine is published for every architecture
# listed in config.yaml, so this add-on builds on all supported HAOS systems.
FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY web/ /usr/share/nginx/html/

EXPOSE 8099
