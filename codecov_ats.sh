#!/usr/bin/env bash

[[ $INPUTS_VERBOSE == true ]] && set -x

# Set colors
b="\033[0;36m"
g="\033[0;32m"
r="\033[0;31m"
e="\033[0;90m"
y="\033[0;33m"
x="\033[0m"
say() {
  echo -e "$1"
}


# Install Codecov CLI
pip install codecov-cli

# Set up Codecov token
if [[ -n $INPUTS_CODECOV_TOKEN ]]; then
    CODECOV_TOKEN=$INPUTS_CODECOV_TOKEN
fi
if [[ -z $CODECOV_TOKEN ]]; then
    say "${r}Token not provided or could not be found in environment. Exiting${x}"
    exit 1
else
    say "$b==>$x Token of length ${#CODECOV_TOKEN} detected"
fi

if [[ -n $INPUTS_CODECOV_STATIC_TOKEN ]]; then
    CODECOV_STATIC_TOKEN=$INPUTS_CODECOV_STATIC_TOKEN
fi
if [[ -z $CODECOV_STATIC_TOKEN ]]; then
    say "${r}Token not provided or could not be found in environment. Exiting${x}"
    exit 1
else
    say "$b==>$x Token of length ${#CODECOV_STATIC_TOKEN} detected"
fi
base_commit_candidates=($(git log --format=%H | sed -n "2,10p")) # Get last 10 commits

codecovcli create-commit -t ${CODECOV_TOKEN} || say "${r}Codecov: Failed to properly create commit$x"
codecovcli create-report -t ${CODECOV_TOKEN} || say "${r}Codecov: Failed to properly create report$x"
codecovcli static-analysis --token=${CODECOV_STATIC_TOKEN} || say "${r}Codecov: Failed to properly execute static analysis"

for base_commit in $base_commit_candidates
do
    say "$y==>$x Attempting label analysis with $b$base_commit$x"
    response=$(codecovcli label-analysis --token=${CODECOV_STATIC_TOKEN} --base-sha=$base_commit --dry-run --dry-run-format="json" || "")
    if [[ -n $response ]]; then
        break
    fi
done

response=$(echo $response | sed 's/,//g')
runner_options=$(echo $response | sed 's/^.*runner_options\": \[//' | sed 's/\].*$//')
ats_tests_to_run=$(echo $response | sed 's/^.*ats_tests_to_run\": \[//' | sed 's/\].*$//')
ats_tests_to_skip=$(echo $response | sed 's/^.*ats_tests_to_skip\": \[//' | sed 's/\].*$//')

if [[ -z $runner_options ]]; then
    say "$y==>$x Could not find 'runner_options', defaulting to '--cov-context=test'"
    runner_options="--cov-context=test"
fi

if [[ -z $ats_tests_to_run ]]; then
    say "$y==>$x No tests to run, picking random test"
    ats_tests_to_skip_array=($ats_tests_to_skip)
    ats_tests_to_run=${ats_tests_to_skip_array[ $RANDOM % ${#ats_tests_to_skip_array[@]} ]}
fi

test_commands="$runner_options "
test_commands+=$ats_tests_to_run
say "$gArguments to run:$x"
echo "$test_commands"
