# codecov-ats
GitHub Action that uploads returns selected test labels to CI ☂️

This Action is currently in beta. Currently, it has only been tested on `linux` builds using `python` and `pytest`.

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

6. Update your `pytest` run to include the tests selected from ATS. You will need to add the `CODECOV_ATS_TESTS_TO_RUN` variable like below.

```yaml
- name: Run tests and collect coverage
  run: pytest --cov app ${{ env.CODECOV_ATS_TESTS }}
```

7. If you are not already using the Codecov CLI to upload coverage, you can update the Codecov Action to `v4-beta`

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
