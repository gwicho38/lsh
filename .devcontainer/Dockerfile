FROM "mcr.microsoft.com/devcontainers/javascript-node:0-18-bullseye"

# Avoid warnings by switching to noninteractive
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies required for adding Python PPA and installing Python 3.12
RUN apt-get update \
    && apt-get install -y software-properties-common \
    && add-apt-repository ppa:deadsnakes/ppa \
    && apt-get update \
    && apt-get install -y python3.12 python3.12-venv python3.12-dev

RUN mkdir -p $NVM_DIR \
    && curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash \
    && . $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm install 16.15.1 \
    && nvm alias default 16.15.1 \
    && nvm use default
# Add nvm.sh to .zshrc for interactive shell support
RUN echo 'export NVM_DIR="/usr/local/share/nvm"' >> /home/node/.zshrc \
    && echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> /home/node/.zshrc # This loads nvm
# Setting the PATH to include global npm binaries and the npm cache
ENV PATH="/home/node/.nvm/versions/node/v${NODE_VERSION}/bin:${PATH}"

RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.12 1
