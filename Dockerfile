# ================================
# Stage 1: Build
# ================================
FROM node:22-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_OPTIONS="--max-old-space-size=8192"
ENV TZ=Asia/Shanghai

RUN apk add --no-cache git

RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

WORKDIR /app

# 复制源码
COPY . /app

# 安装依赖（使用缓存）
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# 构建前端
RUN pnpm run build --filter=@vben/web-antd

# ================================
# Stage 2: Runtime (Nginx)
# ================================
FROM nginx:stable-alpine AS production

# 时区
RUN apk add --no-cache tzdata \
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime

# 配置 nginx 支持 mjs
RUN echo "types { application/javascript js mjs; }" > /etc/nginx/conf.d/mjs.conf \
    && rm -rf /etc/nginx/conf.d/default.conf

# 复制构建产物
COPY --from=builder /app/apps/web-antd/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY scripts/deploy/nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
