FROM node:18

# Install system dependencies for Chromium/Playwright
RUN apt-get update && apt-get install -y \
    libgbm1 \
    libasound2 \
    libx11-xcb1 \
    libxcb1 \
    libxrandr2 \
    libxkbcommon0 \
    libpango-1.0-0 \
    libcairo2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxshmfence1 \
    xvfb \
    wget \
    fonts-liberation \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Install the tool globally
RUN npm install -g .

# Set environment variables
ENV CHROMIUM_PATH=/usr/bin/chromium
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV DISPLAY=:99

# Create state directory
RUN mkdir -p /tmp/lobster-state

# Run Xvfb in background
CMD sh -c "Xvfb :99 -screen 0 1920x1080x24 & lobster-browser-tool start"
