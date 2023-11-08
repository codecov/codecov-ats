deploy:
	$(eval VERSION := $(shell cat VERSION))
	git tag -d v0
	git push origin :v0
	git tag v0
	git tag v$(VERSION) -s -m ""
	git push origin --tags
