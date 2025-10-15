### This file is generated from
### tools/ansible/roles/dockerfile/templates/Dockerfile.j2
###
### DO NOT EDIT
###

# Build container
FROM quay.io/centos/centos:stream9 as builder

ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8
ENV AWX_LOGGING_MODE stdout


USER root

# Import the gpg key for DNF to work
RUN rpm --import /etc/pki/rpm-gpg/RPM-GPG-KEY-centosofficial

# Install build dependencies
RUN dnf -y update && dnf install -y 'dnf-command(config-manager)' && \
    dnf config-manager --set-enabled crb && \
    dnf -y install \
    iputils \
    gcc \
    gcc-c++ \
    git-core \
    gettext \
    glibc-langpack-en \
    libffi-devel \
    libtool-ltdl-devel \
    make \
    nodejs \
    nss \
    openldap-devel \
    openssl \
    patch \
    postgresql \
    postgresql-devel \
    python3.11 \
    "python3.11-devel" \
    "python3.11-pip" \
    "python3.11-setuptools" \
    "python3.11-packaging" \
    "python3.11-psycopg2" \
    swig \
    unzip \
    xmlsec1-devel \
    xmlsec1-openssl-devel

RUN pip3.11 install -vv build


# Install & build requirements
ADD Makefile /tmp/Makefile
RUN mkdir /tmp/requirements
ADD requirements/requirements.txt \
    requirements/requirements_tower_uninstall.txt \
    requirements/requirements_git.txt \
    /tmp/requirements/

RUN cd /tmp && make requirements_awx

ARG VERSION
ARG SETUPTOOLS_SCM_PRETEND_VERSION
ARG HEADLESS

# Use the distro provided npm to bootstrap our required version of node

RUN npm install -g n && n 20.18.1

# Copy source into builder, build sdist, install it into awx venv
COPY . /tmp/src/
WORKDIR /tmp/src/
RUN make sdist && /var/lib/awx/venv/awx/bin/pip install dist/awx.tar.gz

RUN DJANGO_SETTINGS_MODULE=awx.settings.defaults SKIP_SECRET_KEY_CHECK=yes SKIP_PG_VERSION_CHECK=yes /var/lib/awx/venv/awx/bin/awx-manage collectstatic --noinput --clear


# Final container(s)
FROM quay.io/centos/centos:stream9

ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8
ENV AWX_LOGGING_MODE stdout

USER root

# Import the gpg key for DNF to work
RUN rpm --import /etc/pki/rpm-gpg/RPM-GPG-KEY-centosofficial

ADD https://copr.fedorainfracloud.org/coprs/ansible/Rsyslog/repo/epel-9/ansible-Rsyslog-epel-9.repo /etc/yum.repos.d/ansible-Rsyslog-epel-9.repo

# Install runtime requirements
RUN dnf -y update && dnf install -y 'dnf-command(config-manager)' && \
    dnf config-manager --set-enabled crb && \
    dnf -y install acl \
    git-core \
    git-lfs \
    glibc-langpack-en \
    krb5-workstation \
    nginx \
    "openldap >= 2.6.2-3" \
    openssl \
    postgresql \
    python3.11 \
    "python3.11-devel" \
    "python3.11-pip*" \
    "python3.11-setuptools" \
    "python3.11-packaging" \
    "python3.11-psycopg2" \
    rsync \
    rsyslog-8.2102.0-106.el9 \
    subversion \
    sudo \
    vim-minimal \
    which \
    unzip \
    xmlsec1-openssl && \
    dnf -y clean all

RUN pip3.11 install -vv virtualenv supervisor dumb-init build

RUN rm -rf /root/.cache && rm -rf /tmp/*


# Copy app from builder
COPY --from=builder /var/lib/awx /var/lib/awx

RUN ln -s /var/lib/awx/venv/awx/bin/awx-manage /usr/bin/awx-manage



ADD tools/ansible/roles/dockerfile/files/rsyslog.conf /var/lib/awx/rsyslog/rsyslog.conf
ADD tools/ansible/roles/dockerfile/files/wait-for-migrations /usr/local/bin/wait-for-migrations
ADD tools/ansible/roles/dockerfile/files/stop-supervisor /usr/local/bin/stop-supervisor

ADD tools/ansible/roles/dockerfile/files/uwsgi.ini /etc/tower/uwsgi.ini

## File mappings
ADD tools/ansible/roles/dockerfile/files/launch_awx_web.sh /usr/bin/launch_awx_web.sh
ADD tools/ansible/roles/dockerfile/files/launch_awx_task.sh /usr/bin/launch_awx_task.sh
ADD tools/ansible/roles/dockerfile/files/launch_awx_rsyslog.sh /usr/bin/launch_awx_rsyslog.sh
ADD tools/scripts/rsyslog-4xx-recovery /usr/bin/rsyslog-4xx-recovery
ADD _build/supervisor_web.conf /etc/supervisord_web.conf
ADD _build/supervisor_task.conf /etc/supervisord_task.conf
ADD _build/supervisor_rsyslog.conf /etc/supervisord_rsyslog.conf
ADD tools/scripts/awx-python /usr/bin/awx-python


# Pre-create things we need to access
RUN for dir in \
      /var/lib/awx \
      /var/lib/awx/rsyslog \
      /var/lib/awx/rsyslog/conf.d \
      /var/lib/awx/.local/share/containers/storage \
      /var/run/awx-rsyslog \
      /var/log/nginx \
      /var/lib/pgsql \
      /var/run/supervisor \
      /var/run/awx-receptor \
      /var/lib/nginx ; \
    do mkdir -m 0775 -p $dir ; chmod g+rwx $dir ; chgrp root $dir ; done && \
    for file in \
      /etc/subuid \
      /etc/subgid \
      /etc/group \
      /etc/passwd \
      /var/lib/awx/rsyslog/rsyslog.conf ; \
    do touch $file ; chmod g+rw $file ; chgrp root $file ; done


RUN ln -sf /dev/stdout /var/log/nginx/access.log && \
    ln -sf /dev/stderr /var/log/nginx/error.log

ENV HOME="/var/lib/awx"

USER 1000
EXPOSE 8052

ENTRYPOINT ["dumb-init", "--"]
VOLUME /var/lib/nginx
VOLUME /var/lib/awx/.local/share/containers
