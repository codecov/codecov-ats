#!/usr/bin/env bash

[[ $INPUTS_VERBOSE == true ]] && set -x

pip install codecov-cli

token=$( [[ -n $INPUTS_CODECOV_TOKEN ]] && echo $INPUTS_CODECOV_TOKEN || echo $CODECOV_TOKEN )
codecovcli create-commit -t ${token} || >&2 echo 'Codecov: Failed to properly create commit'
codecovcli create-report -t ${token} || >&2 echo 'Codecov: Failed to properly create report'

static_token=$( [[ -n $INPUTS_CODECOV_STATIC_TOKEN ]] && echo $INPUTS_CODECOV_STATIC_TOKEN || echo $CODECOV_STATIC_TOKEN )
codecovcli static-analysis --token=${static_token} || >&2 echo 'Codecov: Failed to properly execute static analysis'

#for now, get the last 10 commit SHAs
found_base_commit=false
base_commit_candidates=($(git log --format=%H | sed -n "2,10p"))

for base_commit in $base_commit_candidates
do
    echo $base_commit
    response=$(codecovcli label-analysis --token=${static_token} --base-sha=$base_commit --dry-run --dry-run-format="json")
    if [[ -n response ]]; then
        break
    fi
done

response=$(echo $response | sed 's/,//g')
runner_options=$(echo $response | sed 's/^.*runner_options\": \[//' | sed 's/\].*$//')
ats_tests_to_run=$(echo $response | sed 's/^.*ats_tests_to_run\": \[//' | sed 's/\].*$//')
ats_tests_to_skip=$(echo $response | sed 's/^.*ats_tests_to_skip\": \[//' | sed 's/\].*$//')

test_commands=$runner_options
test_commands+=$ats_tests_to_run

echo "CODECOV_ATS_TESTS=$test_commands" >> "$GITHUB_OUTPUT"
