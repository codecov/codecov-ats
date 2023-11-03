set -x

echo "token:"
echo $CODECOV_TOKEN


pip install codecov-cli

TOKEN=${$INPUTS_CODECOV_TOKEN || $CODECOV_TOKEN}
codecovcli create-commit -t ${TOKEN} || >&2 echo 'Codecov: Failed to properly create commit'
codecovcli create-report -t ${TOKEN} || >&2 echo 'Codecov: Failed to properly create report'

# codecovcli static-analysis --token=${STATIC_TOKEN} || >&2 echo 'Codecov: Failed to properly execute static analysis'
