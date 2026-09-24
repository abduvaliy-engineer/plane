#!/usr/bin/env bash
set -euo pipefail

target_branch=${1:?Usage: sync-upstream.sh TARGET_BRANCH UPSTREAM_BRANCH}
upstream_branch=${2:?Usage: sync-upstream.sh TARGET_BRANCH UPSTREAM_BRANCH}
upstream_url=${UPSTREAM_URL:-https://github.com/makeplane/plane.git}

git check-ref-format --branch "$target_branch" >/dev/null
git check-ref-format --branch "$upstream_branch" >/dev/null

if [[ $(git symbolic-ref --quiet --short HEAD) != "$target_branch" ]]; then
  echo "Check out $target_branch before syncing." >&2
  exit 1
fi

if [[ -n $(git status --porcelain) ]]; then
  echo "The working tree must be clean before syncing." >&2
  exit 1
fi

git fetch --no-tags origin "refs/heads/$target_branch:refs/remotes/origin/$target_branch"
if [[ $(git rev-parse HEAD) != $(git rev-parse "refs/remotes/origin/$target_branch") ]]; then
  echo "$target_branch has moved or has local commits. Update it before retrying." >&2
  exit 1
fi

git fetch --no-tags "$upstream_url" "refs/heads/$upstream_branch"
upstream_head=$(git rev-parse FETCH_HEAD)

if git merge-base --is-ancestor "$upstream_head" HEAD; then
  echo "$target_branch already contains the latest upstream/$upstream_branch."
  exit 0
fi

if ! git merge --no-edit --no-gpg-sign "$upstream_head"; then
  if git rev-parse --verify -q MERGE_HEAD >/dev/null; then
    git merge --abort
  fi
  echo "Upstream merge needs manual conflict resolution; nothing was pushed." >&2
  exit 1
fi

git push origin "HEAD:refs/heads/$target_branch"
echo "Updated origin/$target_branch from upstream/$upstream_branch."
