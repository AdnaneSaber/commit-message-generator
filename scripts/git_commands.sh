# scripts/git_commands.sh
function git_commit_default() {
    current_branch=$(git branch --show-current)
    echo -n "Which branch do you desire to push this commit to? (default: ${current_branch}): "
    read target_branch
    target_branch=${target_branch:-$current_branch}

    git checkout -B "$target_branch" && git add . && git commit -m "PLACEHOLDER" && git push origin "$target_branch"
}

function git_commit_custom() {
    if [[ -z "$1" ]]; then
        echo "Usage: git_commit_custom 'commit message'"
        return 1
    fi

    current_branch=$(git branch --show-current)
    echo -n "Which branch do you desire to push this commit to? (default: ${current_branch}): "
    read target_branch
    target_branch=${target_branch:-$current_branch}

    git add . && git commit -m "$1" --amend && git push origin "$target_branch" -f
}
