# Makefile for Nagoya GSL English website

## Node script directories

NODE_DIR = $(CURDIR)/tools/nodejs
NODE_MODULES = $(NODE_DIR)/node_modules


## (1) Source locations

### content
ifeq ($(shell test -f $(CURDIR)/src/content && echo -n yes),yes)
    CONTENT_SRC_DIR = $(shell head -1 $(CURDIR)/src/content)
else
    CONTENT_SRC_DIR = $(CURDIR)/src/content
endif


## Targets

### directories
BUILD = $(CURDIR)/build
CARDBASE_DIR = $(BUILD)/cards

BUILDDIRS = $(BUILD)/doc \
			$(BUILD)/doc/tutorials \
			$(BUILD)/doc/guides \
			$(BUILD)/doc/manuals \
			$(BUILD)/download \
			$(BUILD)/download/software \
			$(BUILD)/download/styles \
			$(BUILD)/download/jurisdictions \
			$(BUILD)/link \
			$(BUILD)/link/csl \
			$(BUILD)/link/ctr \
			$(BUILD)/link/zotero \
			$(BUILD)/support \
			$(BUILD)/support/blog \
			$(BUILD)/support/list \
			$(BUILD)/support/roadmap \
			$(BUILD)/cards

## Main targets

.PHONY: all compass skeleton software top contacts contents clean redirects

help:
	@echo Command list:
	@echo "  "make all
	@echo "  "make clean"       "\(wipes out site build\)
	@echo "  "make distclean"   "\(wipes out site build and software dependencies\)

all: software compass skeleton \
	top
#	cards \
#	contents \
#	contacts \
#	index \
#	redirects

clean-build:
	rm -fR $(BUILD)

clean-software:
	rm -fR $(NODE_MODULES)

clean: clean-build

distclean: clean-build clean-software



# Dependency targets

$(BUILDDIRS):
	mkdir -p $@


SKEL_FILES = $(shell find skeleton -type f | sed -e "s/^skeleton/build/")

compass:
	cd scss; compass compile; cd ..

skeleton: $(BUILDDIRS) $(SKEL_FILES)

$(SKEL_FILES):
	mkdir -p $(shell dirname $@) && cp $(shell echo $@ | sed -e "s/^build/skeleton/") $@

contents: $(BUILDDIRS)
	node ./tools/nodejs/contentPages.js -s $(CONTENT_SRC_DIR) -t $(BUILD) -i $(CENTERINFO_SRC_DIR)

redirects:
	node ./tools/nodejs/setRedirects.js

top: 
	node ./tools/nodejs/outputTopPage.js

cards: 
	node ./tools/nodejs/outputCardIndex.js

software: | $(NODE_MODULES)


$(NODE_MODULES):
	mkdir -p $(NODE_MODULES)
	npm install --prefix $(NODE_DIR)
