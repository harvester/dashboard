#!/usr/bin/env bash

yarn --pure-lockfile install

source scripts/version

if [[ $COMMIT_BRANCH == "master" ]]; then
  VERSION="latest"
else
  VERSION=$(cd pkg/$1; node -p -e "require('./package.json').version")
fi

echo "DRONE_TAG: ${DRONE_TAG}"
echo "GIT_TAG: ${GIT_TAG}"
echo "TAG_VERSION: ${TAG_VERSION}"

echo "Drone Build Args"
echo "COMMIT: ${COMMIT}"
echo "COMMIT_BRANCH: ${COMMIT_BRANCH}"
echo "VERSION: ${VERSION}"

if [ -n "$GIT_TAG" ]; then
  TAG_VERSION=$(cd pkg/$1; node -p -e "require('./package.json').version")
  COMMIT=$COMMIT COMMIT_BRANCH=$COMMIT_BRANCH VERSION=$TAG_VERSION ./shell/scripts/build-pkg.sh ${1} "true"
fi

# package, override version, commit for file in pkg root
# Note - in the future env vars should be moved to args and build-pkg should use getopts
COMMIT=$COMMIT COMMIT_BRANCH=$COMMIT_BRANCH VERSION=$VERSION ./shell/scripts/build-pkg.sh ${1} "true"
EXIT_CODE=$?

export PKG_NAME=${1}-${VERSION}
export PKG_TARBALL=${PKG_NAME}.tar.gz

export PKG_TAG_VERSION=${1}-${TAG_VERSION}
export PKG_TAG_TARBALL=${TAG_VERSION}.tar.gz

echo "Drone Build Artefacts"
echo "Package Directory: ${PKG_NAME}"
echo "Package Tarball: ${PKG_TARBALL}"
echo "Tag Package: ${PKG_TAG_VERSION} ${PKG_TAG_TARBALL}"

exit $EXIT_CODE