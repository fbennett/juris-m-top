#!/usr/bin/python
#-*- encoding: utf-8 -*-

import os, os.path, codecs
from ConfigParser import SafeConfigParser

def loadConfig(fn):
    config = SafeConfigParser()
    with codecs.open(fn, 'r', encoding='utf-8') as f:
        config.readfp(f)
    return config
                                            
for fn in os.listdir('./staffinfo'):
    if not fn.endswith('.txt'): continue
    fpath = os.path.join('./staffinfo', fn)
    config = loadConfig(fpath)
    name = config.get(u'名前', 'en')
    bar = '=' * len(name)
    title = '%s\n%s\n%s\n' % (bar, name, bar)
    open(os.path.join('staging', 'staff', 'rst', '%s.rst' % fn[:-4]), 'w+').write(title)
