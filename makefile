# Makefile for Nagoya GSL English website

## Node script directories

NODE_DIR = $(CURDIR)/tools/nodejs
NODE_MODULES = $(NODE_DIR)/node_modules


## (1) Source locations

### content
ifeq ($(shell test -f $(CURDIR)/src/content && echo -n yes),yes)
    CONTENT_SRC_DIR = $(shell head -1 $(CURDIR)/src/content)
    BLOG_SRC_DIR = $(shell head -1 $(CURDIR)/src/blog)
else
    CONTENT_SRC_DIR = $(CURDIR)/src/content
    BLOG_SRC_DIR = $(CURDIR)/src/blog
endif


## Targets

### directories
BUILD = $(CURDIR)/docs

BUILDDIRS = $(BUILD)/release \
			$(BUILD)/beta \
			$(BUILD)/jurism-docs \
			$(BUILD)/cslm-docs \
			$(BUILD)/indigobook \
			$(BUILD)/lrr \
			$(BUILD)/posts \
			$(BUILD)/latest \
			$(BUILD)/mail

## Main targets

.PHONY: all compass skeleton software top contacts contents clean redirects

help:
	@echo Command list:
	@echo "  "make all
	@echo "  "make clean"       "\(wipes out site build\)
	@echo "  "make distclean"   "\(wipes out site build and software dependencies\)

all: software compass skeleton \
	top \
	blogposts \
	bloglist \
	contents \
	redirects

clean-build:
	rm -fR $(BUILD)

clean-software:
	rm -fR $(NODE_MODULES)

clean: clean-build

distclean: clean-build clean-software



# Dependency targets

$(BUILDDIRS):
	mkdir -p $@


SKEL_FILES = $(shell find skeleton -type f | sed -e "s/^skeleton/docs/")

compass:
	cd scss; compass compile; cd ..

skeleton: $(BUILDDIRS) $(SKEL_FILES)

$(SKEL_FILES):
	mkdir -p $(shell dirname $@) && cp $(shell echo $@ | sed -e "s/^docs/skeleton/") $@

contents: $(BUILDDIRS)
	node ./tools/nodejs/contentPages.js -s $(CONTENT_SRC_DIR) -t $(BUILD)

blogposts: $(BUILDDIRS)
	node ./tools/nodejs/contentPages.js -s $(BLOG_SRC_DIR) -t $(BUILD)

bloglist: $(BUILDDIRS)
	node ./tools/nodejs/blogList.js

redirects:
	node ./tools/nodejs/setRedirects.js

top: 
	node ./tools/nodejs/outputTopPage.js

software: | $(NODE_MODULES)


$(NODE_MODULES):
	mkdir -p $(NODE_MODULES)
	npm install --prefix $(NODE_DIR)
