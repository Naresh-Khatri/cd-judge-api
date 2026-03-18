FROM node:23-bookworm

# ─── System dependencies for isolate + language runtimes ───
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    libcap-dev \
    libsystemd-dev \
    bc \
    unzip \
    curl \
    # Language runtimes
    python3 \
    default-jdk-headless \
    g++ \
    gcc \
    ruby \
    php-cli \
    && rm -rf /var/lib/apt/lists/*

# ─── Install isolate ───
RUN git clone https://github.com/ioi/isolate.git /tmp/isolate \
    && cd /tmp/isolate \
    && make install \
    && rm -rf /tmp/isolate

# ─── Install Go ───
ARG GO_VERSION=1.24.4
RUN curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-$(dpkg --print-architecture).tar.gz" \
    | tar -C /usr/local -xz
ENV PATH="/usr/local/go/bin:${PATH}"

# ─── Install Rust (actual rustc binary, not the rustup shim) ───
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal \
    && cp /root/.rustup/toolchains/stable-*/bin/rustc /usr/local/bin/rustc \
    && cp -r /root/.rustup/toolchains/stable-*/lib/* /usr/local/lib/ \
    && ldconfig \
    && rm -rf /root/.rustup /root/.cargo


WORKDIR /app

# Install only the runtime dependencies needed by the worker.
# We use a standalone package.json to avoid workspace resolution issues.
RUN npm install --save bullmq@^5.4.0 ioredis@^5.3.2 tsx@^4.19.0 @t3-oss/env-core@^0.13.8 zod@^4.1.13

# Copy worker source
COPY packages/jobs/src/ src/

CMD ["npx", "tsx", "src/worker.ts"]
