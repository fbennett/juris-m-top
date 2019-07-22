#!/usr/bin/python
#-*- encoding: utf-8 -*-

import os,sys,re
from subprocess import Popen, PIPE
from ConfigParser import SafeConfigParser
import json
import codecs
from pth import ConfigPaths

class BibConfigs(ConfigPaths):
    def __init__(self):
        ConfigPaths.__init__(self)
        self.staffBibs = {}

    def getStaffIDs(self):
        ret = []
        for filename in os.listdir(self.teacher(None)):
            if not filename.endswith('.txt'): continue
            filename = filename[0:-4]
            print filename
            config = SafeConfigParser()
            with codecs.open(self.teacher(filename), 'r', encoding='utf-8') as f:
                config.readfp(f)
            if config.has_option(u'データ', 'zotero') and config.getboolean(u'データ', 'zotero'):
                ret.append(filename)
        return ret
                
    def getBibEntries(self):
        for staffID in self.staffIDs:
            print [self.nodejs('getitems.js'), '-t', 'au:%s' % staffID]
            process = Popen([self.nodejs('getitems.js'), '-t', 'au:%s' % staffID], stdout=PIPE, stderr=PIPE)
            stdout, stderr = process.communicate()
            #print staffID
            res = json.loads(stdout)
            for category in ['books', 'others']:
                for lang in ['ja', 'en']:
                    for i in range(0, len(res[category][lang]), 1):
                        res[category][lang][i] = res[category][lang][i][25:-7].replace("=", "᐀").decode('utf-8')
            self.staffBibs[staffID] = res

    def setBibEntries(self, bibEntries):
        for staffID in self.staffBibs:
            # Get config
            config = SafeConfigParser()
            with codecs.open(self.teacher(staffID), 'r', encoding='utf-8') as f:
                config.readfp(f)
            # Compile bibs and set on config
            config.set(u'著書・編書', 'en', '\n'.join(self.staffBibs[staffID]['books']['en']))
            config.set(u'論文', 'en', '\n'.join(self.staffBibs[staffID]['others']['en']))
            config.set(u'著書・編書', 'ja', '\n'.join(self.staffBibs[staffID]['books']['ja']))
            config.set(u'論文', 'ja', '\n'.join(self.staffBibs[staffID]['others']['ja']))
            # Save config
            config.write(open(self.teacher(staffID), 'w+'))
            self.fixEndings(self.teacher(staffID))

    def run(self):
        self.staffIDs = self.getStaffIDs()
        bibEntries = self.getBibEntries()
        self.setBibEntries(bibEntries)

if __name__ == "__main__":

    bibConfigs = BibConfigs()
    bibConfigs.run()
