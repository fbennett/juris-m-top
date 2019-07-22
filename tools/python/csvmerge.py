#!/usr/bin/python
#-*- encoding: utf-8 -*-

import os,sys
import csv
import ConfigParser
from pth import ConfigPaths

class Merge(ConfigPaths):

    def __init__(self):
        ConfigPaths.__init__(self)
        self.configs = {}
        self.sections = {}

    def loadConfigs(self):
        for filename in os.listdir(self.teacher(None)):
            if not filename.endswith('.txt'): continue
            filename = filename[0:-4]
            print filename
            self.configs[filename] = ConfigParser.ConfigParser()
            self.configs[filename].readfp(open(self.teacher(filename)))

    def loadCSV(self):
        for filename in os.listdir(self.csv(None)):
            if not filename.endswith('.csv'): continue
            filename = filename[0:-4]
            self.sections[filename] = {}
            rows = csv.reader(open(self.csv(filename)))
            for row in rows:
                self.sections[filename][row[0]] = {
                    'ja': '',
                    'en': ''
                }
                if len(row) > 1:
                    self.sections[filename][row[0]]['ja'] = row[1]
                if len(row) > 2:
                    self.sections[filename][row[0]]['en'] = row[2]

    def merge(self):
        for section in self.sections:
            for filename in self.sections[section]:
                if self.sections[section][filename]['ja']:
                    self.configs[filename].set(section, 'ja', self.sections[section][filename]['ja'])
                if self.sections[section][filename]['en']:
                    self.configs[filename].set(section, 'en', self.sections[section][filename]['en'])

    def output(self):
        for filename in self.configs:
            self.configs[filename].write(open(self.teacher(filename), 'w+'))
            self.fixEndings(self.teacher(filename))
        
    def run(self):
        self.loadConfigs()
        self.loadCSV()
        self.merge()
        self.output()

if __name__ == "__main__":

    from optparse import OptionParser

    os.environ['LANG'] = "en_US.UTF-8"

    usage = './tools/csvmerge.py'

    description="Merge CSV data into CFG files"

    parser = OptionParser(usage=usage,description=description,epilog="Happy grinding!")

    (opt, args) = parser.parse_args()

    merge = Merge()
    merge.run()
