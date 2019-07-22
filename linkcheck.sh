#!/bin/bash


linkchecker \
            --timeout=5 \
	    -Fhtml/UTF-8/linkcheck.html \
	    --ignore-url=^mailto: \
	    https://www.law.nagoya-u.ac.jp/en/index.html
	    
