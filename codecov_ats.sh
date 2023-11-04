#!/usr/bin/env bash

[[ $INPUTS_VERBOSE == true ]] && set -x

# Set colors
export TERM=xterm-color
b="\033[0;36m"
g="\033[0;32m"
r="\033[0;31m"
e="\033[0;90m"
y="\033[0;33m"
x="\033[0m"
say() {
  echo -e "$1"
}


# Set up token variables
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
    say "${r}Static token not provided or could not be found in environment. Exiting${x}"
    exit 1
else
    say "$b==>$x Static token of length ${#CODECOV_STATIC_TOKEN} detected"
fi

#Set up codecovcli arguments
codecovcli_args=""
[[ $INPUTS_VERBOSE == true ]] && codecovcli_args+="-v"
[[ -n $INPUTS_ENTERPRISE_URL ]] && codecovcli_args+="-u ${INPUTS_ENTERPRISE_URL}"

#Set up codecovcli command arguments
command_args=""
[[ -n $INPUTS_PARENT_SHA ]] && $command_args+=""

# Install Codecov CLI
pip install codecov-cli

codecovcli ${codecovcli_args} create-commit -t ${CODECOV_TOKEN} || say "${r}Codecov: Failed to properly create commit$x"
codecovcli ${codecovcli_args} create-report -t ${CODECOV_TOKEN} || say "${r}Codecov: Failed to properly create report$x"
codecovcli ${codecovcli_args} static-analysis --token=${CODECOV_STATIC_TOKEN} || say "${r}Codecov: Failed to properly execute static analysis"

base_commit_candidates=($(git log --format=%H | sed -n "1,10p")) # Get last 10 commits
for base_commit in ${base_commit_candidates[@]}
do
    say "$y==>$x Attempting label analysis with $b$base_commit$x"
    response=$(codecovcli ${codecovcli_args} label-analysis --token=${CODECOV_STATIC_TOKEN} --base-sha=$base_commit --dry-run --dry-run-format="json" || true)
    if [[ -n $response ]]; then
        break
    else
        say "$y ->$x  Attempt failed"
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

    if [[ -z $ats_tests_to_skip ]]; then
        say "$y==>$x No tests to skip, running all tests"
    else
        ats_tests_to_run=${ats_tests_to_skip_array[ $RANDOM % ${#ats_tests_to_skip_array[@]} ]}
    fi
fi

test_commands="$runner_options "
test_commands+=$ats_tests_to_run
say "${g}Arguments to run:$x"
echo "$test_commands"
