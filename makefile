# Makefile for Nagoya GSL English website

## Node script directories

NODE_DIR = $(CURDIR)/tools/nodejs
NODE_MODULES = $(NODE_DIR)/node_modules


## (1) Source locations

### contacts
ifeq ($(shell test -f $(CURDIR)/src/contacts && echo -n yes),yes)
    CONTACTS_SRC_DIR = $(shell head -1 $(CURDIR)/src/contacts)
else
    CONTACTS_SRC_DIR = $(CURDIR)/src/contacts
endif

### content
ifeq ($(shell test -f $(CURDIR)/src/content && echo -n yes),yes)
    CONTENT_SRC_DIR = $(shell head -1 $(CURDIR)/src/content)
else
    CONTENT_SRC_DIR = $(CURDIR)/src/content
endif

### center info
ifeq ($(shell test -f $(CURDIR)/src/centerinfo && echo -n yes),yes)
    CENTERINFO_SRC_DIR = $(shell head -1 $(CURDIR)/src/centerinfo)
else
    CENTERINFO_SRC_DIR = $(CURDIR)/src/centerinfo
endif


## Targets

### directories
BUILD = $(CURDIR)/build
BIB_CACHE = $(CURDIR)/bib-cache

GSL_DIR = $(BUILD)/directory/gsl
UNI_DIR = $(BUILD)/directory/university
EXT_DIR = $(BUILD)/directory/external
ANN_DIR = $(BUILD)/announcements
EVT_DIR = $(BUILD)/events
DOCBASE_DIR = $(BUILD)/resources
DOC_DIR = $(DOCBASE_DIR)/documents
FRM_DIR = $(DOCBASE_DIR)/forms

BUILDDIRS = $(BUILD)/alumni \
			$(BUILD)/curriculum \
			$(BUILD)/directory \
			$(BUILD)/programs \
			$(DOCBASE_DIR) \
			$(DOC_DIR) \
			$(FRM_DIR) \
			$(GSL_DIR) \
			$(UNI_DIR) \
			$(EXT_DIR)

## Main targets

.PHONY: all compass skeleton software news contacts contents clean redirects

help:
	@echo Command list:
	@echo "  "make all
	@echo "    "make contents
	@echo "    "make contacts
	@echo "    "make news
	@echo "  "make clean"       "\(deletes ordinary pages, including news\)
	@echo "  "make clean-build" "\(wipes out entire site build\)
	@echo "  "make distclean"   "\(wipes out site build and software dependencies\)

all: software compass skeleton \
	news
#	contents \
#	contacts \
#	index \
#	redirects

clean: clean-local

distclean: clean-build clean-software

clean-local:
	find build -mindepth 1 -name 'publications' -prune -o -print | sort --reverse | grep -v '^build/directory$$' | xargs rm -fR

clean-build:
	rm -fR $(BUILD)

clean-software:
	rm -fR $(NODE_MODULES)


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

news:
	rm -fR $(ANN_DIR); mkdir -p $(ANN_DIR)
	rm -fR $(EVT_DIR); mkdir -p $(EVT_DIR)
	node ./tools/nodejs/eventsAndAnnouncements.js

# LEGACY
docs:
	rm -fR $(FRM_DIR); mkdir -p $(FRM_DIR)
	rm -fR $(DOC_DIR); mkdir -p $(DOC_DIR)
	node ./tools/nodejs/documentsAndForms.js -s $(CENTERINFO_SRC_DIR) -t $(DOCBASE_DIR)

contacts:
	rm -fR $(GSL_DIR); mkdir -p $(GSL_DIR)
	node ./tools/nodejs/contactsPage.js -c gsl -s $(CONTACTS_SRC_DIR)/index.yml -t $(GSL_DIR)
	rm -fR $(UNI_DIR); mkdir -p $(UNI_DIR)
	node ./tools/nodejs/contactsPage.js -c university -s $(CONTACTS_SRC_DIR)/index.yml -t $(UNI_DIR)
	rm -fR $(EXT_DIR); mkdir -p $(EXT_DIR)
	node ./tools/nodejs/contactsPage.js -c external -s $(CONTACTS_SRC_DIR)/index.yml -t $(EXT_DIR)

index:
	node ./tools/nodejs/generateIndex.js


software: | $(NODE_MODULES)


$(NODE_MODULES):
	mkdir -p $(NODE_MODULES)
	npm install --prefix $(NODE_DIR)
