pip install codecov-cli

codecovcli create-commit -t ${CODECOV_TOKEN} || >&2 echo 'Codecov: Failed to properly create commit'
codecovcli create-report -t ${CODECOV_TOKEN} || >&2 echo 'Codecov: Failed to properly create report'

# codecovcli static-analysis --token=${CODECOV_STATIC_TOKEN} || >&2 echo 'Codecov: Failed to properly execute static analysis'
