deploy:
	$(eval VERSION := $(shell cat package.json | grep '"version": ' | cut -d\" -f4))
	git tag -d v0
	git push origin :v0
	git tag v0
	git tag v$(VERSION) -s -m ""
	git push origin --tags
