#!/bin/bash

#git add  build
git commit -m "Updating site" public
git subtree push --prefix=build git@github.com:fbennett/juris-m-top.git gh-pages --squash
#git subtree push --prefix=build git@github.com:fbennett/juris-m-top.git gh-pages
