# codecov-ats
GitHub Action that uploads returns selected test labels to CI ☂️

This Action is currently in beta. Currently, it has only been tested on `linux` and `macos` builds using `python` and `pytest`.

If you have feedback or issues with running this action, please don't hesitate to let us know by creating a Github Issue against this repo.

### Usage
1. Update the `checkout` step in GitHub actions to include `fetch-depth: 0`

```
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
```

2. Add in `CODECOV_TOKEN` and `CODECOV_STATIC_TOKEN` secrets from the Codecov UI to GitHub.
You can find the `CODECOV_STATIC_TOKEN` as the `Static analysis token`

Set the Static analysis token to `CODECOV_STATIC_TOKEN` in your repository secrets.

3. Update your `codecov.yml` by adding the following

```yaml
flag_management:
  individual_flags:
    - name: smart-tests
      carryforward: true
      carryforward_mode: "labels"
      statuses:
        - type: "project"
        - type: "patch"

cli:
  plugins:
    pycoverage:
      report_type: "json"
```

4. If `pytest-cov` is not a dependency, add it to your `requirements.txt` file, or run the following after you install your python dependencies in your GitHub Actions workflow.

```yaml
- name: Install pytest
  run: pip install pytest-cov
```

5. Add the Codecov ATS Action to your CI. This should happen after you install python dependencies, but before you run tests.
This action will populate files in `codecov_ats` folder with the tests to run.

```yaml
- name: Run ATS
  uses: codecov/codecov-ats@v0
  env:
    CODECOV_STATIC_TOKEN: ${{ secrets.CODECOV_STATIC_TOKEN }}
    CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}
# This is an example, do not copy below.
# - name: Run tests.
#   run: pytest ...
```

6. Update your `pytest` run to include the tests selected from ATS. You will read the list of tests that were selected to run by ATS.
These tests are exported to `codecov_ats/tests_to_run.json`. Skips running tests if no tests were selected.
(You can copy the same step and use the `codecov_ats/tests_to_skip.json` file to run the tests selected to be skipped)

```yaml
- name: Run tests and collect coverage
  run: |
    length_of_tests=$(cat codecov_ats/tests_to_run.json | jq 'length')
    # The 1st value doesn't count, it's '--cov-context=test' (hence -gt 1)
    if [ $length_of_tests -gt 1 ]; then
      echo "Running $length_of_tests tests"
      # --raw-output0 doesn't work.
      cat codecov_ats/tests_to_run.json | jq 'join("\u0000")' --raw-output | tr -d '\n' | xargs -r0 pytest --cov app
    else
      echo "No tests to run"
    fi
```

1. If you are not already using the Codecov CLI to upload coverage, you can update the Codecov Action to `v4-beta`

```yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4-beta
  env:
    CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}
  with:
    flags: smart-tests
    plugins: pycoverage,compress-pycoverage
```

8. Run your CI! On your first run, Codecov will not have any labels data and will have to run all tests. However, once all following commits or pull requests are rebased on top of this commit, you should be able to see the benefits of ATS.

### Output

This action creates a `codecov_ats` folder in the current directory and populates it with 3 files:
1. `codecov_ats/tests_to_run.json` - List of tests selected by Automated Test Selection that should be executed
2. `codecov_ats/tests_to_skip.json` - List of tests that are being skiped
3. `codecov_ats/result.json` - Summary of results for test selection