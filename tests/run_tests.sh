#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
exec python tests/run_tests.py
