#!/usr/bin/python
#-*- encoding: utf-8 -*-

import ruamel.yaml
import os,sys,os.path
from tabulate import tabulate
import codecs
import jaconv
from subprocess import call
import re

class StaffEngine:
    def __init__(self, inDir, outDir):
        if not os.path.exists(outDir):
            os.makedirs(outDir)
        self.inDir = inDir
        self.outDir = outDir

    def runAll(self):
        for inFile in os.listdir(self.inDir):
            #if not inFile.startswith('Masuda_T'): continue
            if not inFile.endswith('.yml'): continue
            inp = os.path.join(self.inDir, inFile)
            outp = os.path.join(self.outDir, os.path.splitext(inFile)[0] + '.pdf')
            self.run(inp, outp)

    def run(self, inp, outp):
        obj = ruamel.yaml.load(open(inp), ruamel.yaml.RoundTripLoader)
        output = ''
        for key in obj:
            if key == u'主要業績':
                continue
            output += u'##' + key + '\n\n'
            table = []
            for subkey in obj[key]:
                val = obj[key][subkey]
                if type(subkey) == type(u'unicode'):
                    subkey = jaconv.z2h(subkey)
                if key == u'名前' and subkey == 'ja':
                    output = '# %s\n\n--------------\n\n%s' % (val, output)
                if not val or (type(val) == type('string') and not val.strip()):
                    #DO empty
                    table.append(['**%s**' % subkey, 'XXXXX'])
                elif type(val) == type(u'unicode') or type(val) == type('string'):
                    #DO string
                    table.append(['**%s**' % subkey, val])
                else:
                    #DO list
                    table.append(['**%s**' % subkey, val[0]])
                    for i in range(1, len(val), 1):
                        table.append(['', val[i]])
            output += tabulate(table) + '\n\n'
        
        codecs.open('mytable.md', 'w+', 'utf-8').write(output)
        call(["pandoc", "-f", "markdown", "-t", "html5", "-s", "--css", "page.css", "-o", "mytable.html", "mytable.md"])
        txt = open('mytable.html').read()
        txt = re.sub('style=\"[^\"]+\"', '', txt)
        txt = txt.replace('XXXXX', '&nbsp;')
        open('mytable.html', 'w+').write(txt)
        call(["wkhtmltopdf", "mytable.html", outp])
        os.remove('mytable.html')
        os.remove('mytable.md')
        #call(["evince", "mytable.pdf"])

staffEngine = StaffEngine('staffinfo', 'pdf')
staffEngine.runAll()
