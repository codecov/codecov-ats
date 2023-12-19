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
[[ $INPUTS_VERBOSE == true ]] && codecovcli_args+="-v "
[[ -n $INPUTS_ENTERPRISE_URL ]] && codecovcli_args+="-u ${INPUTS_ENTERPRISE_URL} "

# Install Codecov CLI
pip install codecov-cli

create_commit_args=""
[[ -n $INPUTS_FAIL_ON_ERROR ]] && create_commit_args+="-Z "
[[ -n $INPUTS_OVERRIDE_PARENT ]] && create_commit_args+="--parent-sha ${INPUTS_OVERRIDE_PARENT} "
[[ -n $INPUTS_OVERRIDE_PR ]] && create_commit_args+="-P ${INPUTS_OVERRIDE_PR} "
[[ -n $INPUTS_OVERRIDE_BRANCH ]] && create_commit_args+="-B ${INPUTS_OVERRIDE_BRANCH} "
[[ -n $INPUTS_OVERRIDE_COMMIT ]] && create_commit_args+="-C ${INPUTS_OVERRIDE_COMMIT} "
[[ -n $INPUTS_OVERRIDE_SLUG ]] && create_commit_args+="-r ${INPUTS_OVERRIDE_SLUG} "

# create-report
create_report_args=""
[[ -n $INPUTS_FAIL_ON_ERROR ]] && create_report_args+="-Z "
[[ -n $INPUTS_OVERRIDE_COMMIT ]] && create_report_args+="-C ${INPUTS_OVERRIDE_COMMIT} "
[[ -n $INPUTS_OVERRIDE_SLUG ]] && create_report_args+="-r ${INPUTS_OVERRIDE_SLUG} "

# static-analysis
static_analysis_args=""
[[ -n $INPUTS_STATIC_FOLDERS_TO_EXCLUDE ]] && static_analysis_args+="--folders-to-exclude ${INPUTS_STATIC_FOLDERS_TO_EXCLUDE} "
[[ -n $INPUTS_STATIC_FOLDER_TO_SEARCH ]] && static_analysis_args+="--foldertosearch ${INPUTS_STATIC_FOLDER_TO_SEARCH} "
[[ -n $INPUTS_STATIC_NUMBER_PROCESSES ]] && static_analysis_args+="--numberprocesses ${INPUTS_STATIC_NUMBER_PROCESSES} "
[[ -n $INPUTS_STATIC_OVERRIDE_COMMIT ]] && static_analysis_args+="-C ${INPUTS_STATIC_OVERRIDE_COMMIT} "
[[ -n $INPUTS_STATIC_SEARCH_PATTERN ]] && static_analysis_args+="--pattern ${INPUTS_STATIC_SEARCH_PATTERN} "
[[ -n $INPUTS_STATIC_STATIC_FORCE ]] && static_analysis_args+="--force "

# label-analysis
label_analysis_args=""
[[ -n $INPUTS_LABEL_MAX_WAIT_TIME ]] && label_analysis_args+="--max-wait-time ${INPUTS_LABEL_MAX_WAIT_TIME} "

if $(codecovcli ${codecovcli_args}create-commit ${create_commit_args}-t ${CODECOV_TOKEN}); then
	say "${g}Codecov: Successfully created commit record$x"
else
 	say "${r}Codecov: Failed to properly create commit$x"
  exit 1
fi

if $(codecovcli ${codecovcli_args}create-report ${create_report_args}-t ${CODECOV_TOKEN}); then
	say "${g}Codecov: Successfully created report record$x"
else
 	say "${r}Codecov: Failed to properly create report$x"
  exit 1
fi

codecovcli ${codecovcli_args}static-analysis ${static_analysis_args}--token ${CODECOV_STATIC_TOKEN}
if [[ $? == 0 ]]; then
	say "${g}Codecov: Successfully ran static analysis$x"
else
 	say "${r}Codecov: Failed to run static analysis$x"
  exit 1
fi

if [[ -n $INPUTS_OVERRIDE_BASE_COMMIT ]]; then
    base_commit_candidates=($INPUTS_OVERRIDE_BASE_COMMIT)
else
		base_commit_candidates=($(git log --format=%H | sed -n "1,10p")) # Get last 10 commits
fi

for base_commit in ${base_commit_candidates[@]}
do
    say "$y==>$x Attempting label analysis with $b$base_commit$x"
    response=$(codecovcli ${codecovcli_args}label-analysis ${label_analysis_args}--token=${CODECOV_STATIC_TOKEN} --base-sha=$base_commit --dry-run --dry-run-format="json" || true)
    if [[ -n $response ]]; then
        break
    else
        say "$y ->$x  Attempt failed"
    fi
done

if [[ -z $response && -n $INPUTS_OVERRIDE_BASE_COMMIT ]]; then
 	say "${r}Codecov: Failed to run label analysis. Please select a different base commit.$x"
	exit 1
fi

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
elif [[ -z $ats_tests_to_skip ]]; then
    say "$y==>$x No tests are skipped, running all"
    ats_tests_to_run=""
fi

test_commands="$runner_options "
test_commands+=$ats_tests_to_run
say "${g}Arguments to run:$x"
echo "$test_commands"
