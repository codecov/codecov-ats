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

error() {
    echo -e "${r}$*${e}" >&2
}

# Set up token variables
if [[ -n $INPUTS_CODECOV_TOKEN ]]; then
    CODECOV_TOKEN=$INPUTS_CODECOV_TOKEN
fi
if [[ -z $CODECOV_TOKEN ]]; then
    error "Token not provided or could not be found in environment. Exiting"
    exit 1
else
    say "$b==>$x Token of length ${#CODECOV_TOKEN} detected"
fi

if [[ -n $INPUTS_CODECOV_STATIC_TOKEN ]]; then
    CODECOV_STATIC_TOKEN=$INPUTS_CODECOV_STATIC_TOKEN
fi
if [[ -z $CODECOV_STATIC_TOKEN ]]; then
    error "Static token not provided or could not be found in environment. Exiting"
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

create_commit_args="--fail-on-error "
[[ -n $INPUTS_OVERRIDE_PARENT ]] && create_commit_args+="--parent-sha ${INPUTS_OVERRIDE_PARENT} "
[[ -n $INPUTS_OVERRIDE_PR ]] && create_commit_args+="-P ${INPUTS_OVERRIDE_PR} "
[[ -n $INPUTS_OVERRIDE_BRANCH ]] && create_commit_args+="-B ${INPUTS_OVERRIDE_BRANCH} "
[[ -n $INPUTS_OVERRIDE_COMMIT ]] && create_commit_args+="-C ${INPUTS_OVERRIDE_COMMIT} "
[[ -n $INPUTS_OVERRIDE_SLUG ]] && create_commit_args+="-r ${INPUTS_OVERRIDE_SLUG} "

# create-report
create_report_args="--fail-on-error "
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
 	error "Codecov: Failed to properly create commit"
  exit 1
fi

if $(codecovcli ${codecovcli_args}create-report ${create_report_args}-t ${CODECOV_TOKEN}); then
	say "${g}Codecov: Successfully created report record$x"
else
 	error "Codecov: Failed to properly create report"
  exit 1
fi

codecovcli ${codecovcli_args}static-analysis ${static_analysis_args}--token ${CODECOV_STATIC_TOKEN}
if [[ $? == 0 ]]; then
	say "${g}Codecov: Successfully ran static analysis$x"
else
 	error "Codecov: Failed to run static analysis"
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
 	error "Codecov: Failed to run label analysis. Please select a different base commit."
	exit 1
fi

# Post process label-analysis response

# Create directory to put result files
mkdir codecov_ats
# Export tests to run and tests to skip into respective files
jq <<< "$response" '.runner_options + .ats_tests_to_run | @json' --raw-output > codecov_ats/tests_to_run.json
jq <<< "$response" '.runner_options + .ats_tests_to_run | @sh' --raw-output > codecov_ats/tests_to_run.txt
jq <<< "$response" '.runner_options + .ats_tests_to_skip | @json' --raw-output > codecov_ats/tests_to_skip.json
jq <<< "$response" '.runner_options + .ats_tests_to_skip | @sh' --raw-output > codecov_ats/tests_to_skip.txt


# Statistics on the test selection
testcount() { jq <<< "$response" ".$1 | length"; }
run_count=$(testcount ats_tests_to_run)
skip_count=$(testcount ats_tests_to_skip)
# Parse any potential errors that made ATS fallback to running all tests and surface them
ats_fallback_reason=$(jq <<< "$response" '.ats_fallback_reason')
if [ "$ats_fallback_reason" == "null" ]; then
    ats_success=true
else
    ats_success=false
fi
tee <<< \
    "{\"ats_success\": $ats_success, \"error\": $ats_fallback_reason, \"tests_to_run\": $run_count, \"tests_analyzed\": $((run_count+skip_count))}" \
    "$GITHUB_STEP_SUMMARY" \
    "codecov_ats/result.json"

echo "Tests to run exported to ./codecov_ats/tests_to_run.txt"
echo "Tests to run exported to ./codecov_ats/tests_to_skip.txt"
