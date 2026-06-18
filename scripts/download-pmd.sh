#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LIB_DIR="$PROJECT_DIR/lib"
JAR_NAME="p3c-pmd-2.1.1-jar-with-dependencies.jar"
JAR_PATH="$LIB_DIR/$JAR_NAME"
MAVEN_URL="https://repo1.maven.org/maven2/com/alibaba/p3c/p3c-pmd/2.1.1/p3c-pmd-2.1.1-jar-with-dependencies.jar"

mkdir -p "$LIB_DIR"

if [ -f "$JAR_PATH" ]; then
  echo "P3C PMD JAR already exists at $JAR_PATH"
  exit 0
fi

echo "Downloading P3C PMD JAR (v2.1.1)..."
curl -fSL -o "$JAR_PATH" "$MAVEN_URL"
echo "Downloaded to $JAR_PATH"
