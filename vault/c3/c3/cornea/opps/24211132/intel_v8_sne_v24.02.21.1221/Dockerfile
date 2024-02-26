FROM locked-registry.c3.ai/c3:8.3.2-rc_1715

# Add local files file system
USER root
#======================================================================
# System setup
#======================================================================

ENV C3_USER BA
ENV C3_PASSWORD BA
ENV C3_DIR /home/c3/
ENV C3_APPS_ROOT /home/c3/c3base
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8
ENV DB_DIR=${C3_DIR}/postgres/data
ENV LOG_DIR=${C3_DIR}/postgres/log

ENV USER_HOME /home/c3
ENV C3_SERVER_JAR_HOME /usr/local/lib/c3

RUN yum install sudo -y   
RUN yum repolist enabled
RUN yum makecache --refresh

RUN yum install python3 python3-pip git git-lfs wget vim libgfortran procps -y

# Java Coretto
RUN rpm --import https://yum.corretto.aws/corretto.key && \
    curl -L -o /etc/yum.repos.d/corretto.repo https://yum.corretto.aws/corretto.repo && \
    yum install -y java-17-amazon-corretto-devel
ENV JAVA_HOME=/usr/lib/jvm/java-17-amazon-corretto

# Node
RUN yum install https://rpm.nodesource.com/pub_16.x/nodistro/repo/nodesource-release-nodistro-1.noarch.rpm -y && \
    yum install nodejs -y --setopt=nodesource-nodejs.module_hotfixes=1 --nogpgcheck

# Make dir structure so we can run ./v8
RUN mkdir -p /usr/local/share/c3 && \
    chown -R c3:root /usr/local/share/c3

#======================================================================
# C3 User setup
#======================================================================
RUN echo 'c3 ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers
ENV USER_HOME /home/c3
ENV C3_SERVER_JAR_HOME /usr/local/lib/c3/
RUN echo ${USER_HOME}
RUN mkdir -p ${USER_HOME}/.ssh/
RUN touch $USER_HOME/.ssh/id_rsa
COPY id_rsa $USER_HOME/.ssh/id_rsa
COPY config $USER_HOME/.ssh/config
COPY authorized_keys $USER_HOME/.ssh/authorized_keys
RUN chmod 600 $USER_HOME/.ssh/id_rsa $USER_HOME/.ssh/authorized_keys  && \
    chmod 655 $USER_HOME/.ssh/config && \
    chmod a+rwx $USER_HOME
WORKDIR $USER_HOME

USER c3 
# Install Homebrew
RUN NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
# Set up Homebrew in PATH
RUN echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> /home/c3/.bashrc
RUN /home/linuxbrew/.linuxbrew/bin/brew install ranger

# Setup env.
ENV C3_SERVER_ROOT=/home/c3/c3server
ENV C3_BUILD_TOOL=gradle
ENV C3_DIR=/usr/local/share/c3

# #============================================================================================================
# # Env Vars
# #============================================================================================================
ENV VERBOSE true
ENV LANG en_US.UTF-8
ENV LC_ALL en_US.UTF-8
RUN source ~/.bash_profile
ENTRYPOINT ["/usr/lib/jvm/java-17-amazon-corretto/bin/java", "-jar", "/usr/local/lib/c3/java/v8-server-8.3.2-rc+1715.jar"]
