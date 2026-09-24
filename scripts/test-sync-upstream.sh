#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
test_root=$(mktemp -d)
trap 'rm -rf "$test_root"' EXIT

setup_case() {
  local case_dir=$1
  mkdir -p "$case_dir"
  git init -q --bare "$case_dir/origin.git"
  git init -q --bare "$case_dir/upstream.git"
  git init -q -b main "$case_dir/work"
  git -C "$case_dir/work" config user.name "Sync test"
  git -C "$case_dir/work" config user.email "sync-test@example.com"
  printf 'base\n' >"$case_dir/work/shared.txt"
  git -C "$case_dir/work" add shared.txt
  git -C "$case_dir/work" commit -qm base
  git -C "$case_dir/work" remote add origin "$case_dir/origin.git"
  git -C "$case_dir/work" push -q origin main
  git -C "$case_dir/work" remote add upstream "$case_dir/upstream.git"
  git -C "$case_dir/work" push -q upstream main:preview
  git clone -q -b preview "$case_dir/upstream.git" "$case_dir/upstream-work"
  git -C "$case_dir/upstream-work" config user.name "Sync test"
  git -C "$case_dir/upstream-work" config user.email "sync-test@example.com"
}

success_dir="$test_root/success"
setup_case "$success_dir"
printf 'local\n' >"$success_dir/work/local.txt"
git -C "$success_dir/work" add local.txt
git -C "$success_dir/work" commit -qm local
git -C "$success_dir/work" push -q origin main
printf 'upstream\n' >"$success_dir/upstream-work/upstream.txt"
git -C "$success_dir/upstream-work" add upstream.txt
git -C "$success_dir/upstream-work" commit -qm upstream
git -C "$success_dir/upstream-work" push -q origin preview

(
  cd "$success_dir/work"
  UPSTREAM_URL="$success_dir/upstream.git" bash "$script_dir/sync-upstream.sh" main preview
  test -f local.txt
  test -f upstream.txt
  test "$(git rev-parse HEAD)" = "$(git ls-remote origin refs/heads/main | cut -f1)"
  UPSTREAM_URL="$success_dir/upstream.git" bash "$script_dir/sync-upstream.sh" main preview
  test -z "$(git status --porcelain)"
)

conflict_dir="$test_root/conflict"
setup_case "$conflict_dir"
printf 'local\n' >"$conflict_dir/work/shared.txt"
git -C "$conflict_dir/work" add shared.txt
git -C "$conflict_dir/work" commit -qm local
git -C "$conflict_dir/work" push -q origin main
printf 'upstream\n' >"$conflict_dir/upstream-work/shared.txt"
git -C "$conflict_dir/upstream-work" add shared.txt
git -C "$conflict_dir/upstream-work" commit -qm upstream
git -C "$conflict_dir/upstream-work" push -q origin preview

(
  cd "$conflict_dir/work"
  before=$(git rev-parse HEAD)
  if UPSTREAM_URL="$conflict_dir/upstream.git" bash "$script_dir/sync-upstream.sh" main preview; then
    echo "Expected the conflicting merge to fail." >&2
    exit 1
  fi
  test "$(git rev-parse HEAD)" = "$before"
  test "$(git ls-remote origin refs/heads/main | cut -f1)" = "$before"
  test -z "$(git status --porcelain)"
)

echo "Sync script tests passed."
