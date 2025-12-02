#!/bin/sh
set -e

CONF_DIR="/etc/nginx/conf.d"
CONF_FILE="${CONF_DIR}/default.conf"
SNIPPETS_DIR="/etc/nginx/server.d"

mkdir -p "${CONF_DIR}" "${SNIPPETS_DIR}"

normalize_path() {
    value="$1"
    if [ -z "${value}" ]; then
        value="/"
    fi
    case "${value}" in
        /*) : ;;
        *) value="/${value}" ;;
    esac
    printf "%s" "${value}"
}

path_with_slash() {
    value=$(normalize_path "$1")
    case "${value}" in
        */) : ;;
        *) value="${value}/" ;;
    esac
    printf "%s" "${value}"
}

path_no_slash() {
    value=$(normalize_path "$1")
    value="${value%/}"
    if [ -z "${value}" ]; then
        value="/"
    fi
    printf "%s" "${value}"
}

listen_port="${NGINX_LISTEN_PORT:-80}"
root_dir="${NGINX_ROOT:-/usr/share/nginx/html}"

cat > "${CONF_FILE}" <<EOF
server {
    listen ${listen_port};
    root ${root_dir};
    index index.html;

    error_log /dev/stdout info;
    access_log /dev/stdout;

    location / {
        try_files \$uri \$uri/ =404;
    }
EOF

append_proxy_block() {
    block="$1"
    cat >> "${CONF_FILE}" <<EOF
${block}
EOF
}

if [ "${ENABLE_PIHOLE_PROXY:-true}" != "false" ]; then
    pihole_path=$(path_with_slash "${PIHOLE_PROXY_PATH:-/pi-api/}")
    pihole_regex=$(path_no_slash "${PIHOLE_PROXY_PATH:-/pi-api/}")
    pihole_target="${PIHOLE_PROXY_TARGET:-https://pihole}"
    pihole_host_header="${PIHOLE_HOST_HEADER:-pi.hole}"
    pihole_ssl_verify="${PIHOLE_SSL_VERIFY:-off}"

    append_proxy_block "
    location ${pihole_path} {
        rewrite ^${pihole_regex}/(.*) /\$1 break;

        proxy_pass ${pihole_target};

        proxy_ssl_verify ${pihole_ssl_verify};
        proxy_ssl_server_name on;
        proxy_set_header Host ${pihole_host_header};

        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
"
fi

if [ "${ENABLE_DELUGE_PROXY:-true}" != "false" ]; then
    deluge_path=$(path_with_slash "${DELUGE_PROXY_PATH:-/deluge-api/}")
    deluge_regex=$(path_no_slash "${DELUGE_PROXY_PATH:-/deluge-api/}")
    deluge_target="${DELUGE_PROXY_TARGET:-http://deluge:8112/}"
    deluge_host_header="${DELUGE_HOST_HEADER:-\\$host}"

    append_proxy_block "
    location ${deluge_path} {
        proxy_pass ${deluge_target};

        proxy_set_header Host ${deluge_host_header};
        proxy_set_header X-Real-IP \$remote_addr;

        proxy_cookie_path / ${deluge_path};
    }
"
fi

if [ "${ENABLE_JELLYFIN_PROXY:-true}" != "false" ]; then
    jellyfin_path=$(path_with_slash "${JELLYFIN_PROXY_PATH:-/jellyfin-api/}")
    jellyfin_target="${JELLYFIN_PROXY_TARGET:-http://jellyfin:8096/}"
    jellyfin_host_header="${JELLYFIN_HOST_HEADER:-\\$host}"

    append_proxy_block "
    location ${jellyfin_path} {
        proxy_pass ${jellyfin_target};
        proxy_set_header Host ${jellyfin_host_header};
        proxy_set_header X-Real-IP \$remote_addr;
    }
"
fi

cat >> "${CONF_FILE}" <<'EOF'

    include /etc/nginx/server.d/*.conf;
}
EOF
