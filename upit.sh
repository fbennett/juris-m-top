#!/bin/bash

# http://support.google.com/a/bin/request.py?hl=en&contact_type=nonprofit

# rsync -av --delete --no-o --no-p --rsh="/usr/bin/sshpass -f .sshpass.txt /usr/bin/ssh -l en" law.nagoya-u.ac.jp:/var/www/html/en/index.html ./release/docroot/index.html

# rsync -av --delete /usr/bin/ssh /media/storage/src/gsl-build/build/ our.law.nagoya-u.ac.jp:/var/www/nginx/webtest


rsync -av --delete --no-o --no-p --rsh="ssh -l en" ./build/ www.law.nagoya-u.ac.jp:/var/www/html/en/

#rsync -av --delete --no-o --no-p --rsh="ssh -A -t our.law.nagoya-u.ac.jp -A -t ssh www.law.nagoya-u.ac.jp -l en" ./build/ www.law.nagoya-u.ac.jp:/var/www/html/en/

