set -x

echo "token:"
echo $CODECOV_TOKEN


pip install codecov-cli

if [ -z $INPUTS_CODECOV_TOKEN ]; then
  token=$CODECOV_TOKEN
else
  token=$INPUTS_CODECOV_TOKEN
fi
codecovcli create-commit -t ${token} || >&2 echo 'Codecov: Failed to properly create commit'
codecovcli create-report -t ${token} || >&2 echo 'Codecov: Failed to properly create report'

# codecovcli static-analysis --token=${STATIC_TOKEN} || >&2 echo 'Codecov: Failed to properly execute static analysis'
