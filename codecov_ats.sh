set -x

echo "token:"
echo $CODECOV_TOKEN


pip install codecov-cli

token=$( [ -n $INPUTS_CODECOV_TOKEN ] && echo $INPUTS_CODECOV_TOKEN || echo $CODECOV_TOKEN )
codecovcli create-commit -t ${token} || >&2 echo 'Codecov: Failed to properly create commit'
codecovcli create-report -t ${token} || >&2 echo 'Codecov: Failed to properly create report'

# codecovcli static-analysis --token=${STATIC_TOKEN} || >&2 echo 'Codecov: Failed to properly execute static analysis'
