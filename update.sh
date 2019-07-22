#!/bin/bash

UPDATES=$(node ./tools/nodejs/validateAllYAML.js)

if [ "$?" -eq "0" ]; then
    echo success $UPDATES
    # Everything validates, run the suggested updates
    make clean-build
    make pages
    make staff
    mv .TIMESTAMP TIMESTAMP
    cd build
    zip -r allsite.zip *
    scp allsite.zip our.law.nagoya-u.ac.jp:.
    ssh our.law.nagoya-u.ac.jp
else
    echo failure
    rm -f .TIMESTAMP
    # Only the validation report will be pushed
fi

# Push whatever we have to the site
