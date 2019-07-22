#!/usr/bin/python
#-*- encoding: utf-8 -*-
'''
Scrape staff data

Visits staff pages of the Japanese website, scrapes available
data, and integrates it into staff profiles. Profiles are in
./teacher underneath the base directory set in the config.txt
file, which is located in the same directory as that from which
the script is run. Profiles are created from scratch if they
are missing.
'''

import os,re,sys
from urllib2 import urlopen
from lxml import etree
from lxml.html import html5parser
#html_parser = etree.HTMLParser()
#import ConfigParser
#import yaml
import ruamel.yaml
import romkan
from string import maketrans
import json

from pth import ConfigPaths
from StaffNamesMess import NameRemapper
import codecs

remap = NameRemapper()

NS = {
    '_': 'http://www.w3.org/1999/xhtml'
}

templateDir = u'/home/bennett/ownCloud/法学部教員情報/テンプレート'
staffRecord = codecs.open(templateDir, 'r', 'utf-8').read()

#staffRecord = staffRecord.strip();
#yobj = ruamel.yaml.load(staffRecord, ruamel.yaml.RoundTripLoader)
#ruamel.yaml.dump(yobj, codecs.open('TEST.yml', 'w+', 'utf8'), Dumper=ruamel.yaml.RoundTripDumper, allow_unicode=True)
#sys.exit()

postMap = {
    u'教授': 'Professor',
    u'准教授': 'Associate Professor'
}

postCulls = [
    u'名古屋大学大学院法学研究科　'
]

def getPostEnglish(post):
    if postMap.has_key(post):
        return postMap[post]
    else:
        return ''

def getPostJapanese(post):
    for cull in postCulls:
        if post.startswith(cull):
            return post.replace(cull, '')
    return post
    
def titleCase(str):
    str = romkan.to_hepburn(str.replace(u'　', ' '))
    str = str.replace('oo', u'ō').replace('ou', u'ō').replace('aa', u'ā').replace('uu', u'ū');
    lst = str.split(' ')
    for i in range(0, len(lst), 1):
        lst[i] = lst[i][0].upper() + lst[i][1:]
    return ' '.join(lst)

fullNums = u'０１２３４５６７８９'
halfNums = u'0123456789'
halfTable = dict((ord(fullNums[i]), halfNums[i]) for i in range(0,len(fullNums),1))

def makeHankaku(str):
    if type(str) != type(u'unicode'):
        str = str.decode('utf-8')
    return str.translate(halfTable)

pth = ConfigPaths()
staffPatchMap = json.load(codecs.open(pth.tools('staffPatchMap.json'), 'r', 'utf-8'))

pth = ConfigPaths()
fieldsMap = json.load(codecs.open(pth.tools('fieldsMap.json'), 'r', 'utf-8'))

def applyNamePatches(config, key):
    if staffPatchMap['nameFixes'].has_key(key):
        for subkey in staffPatchMap['nameFixes'][key]:
            config[subkey] = staffPatchMap['nameFixes'][key][subkey]
    if staffPatchMap['postFixes'].has_key(key):
        for subkey in staffPatchMap['postFixes'][key]:
            config[subkey] = staffPatchMap['postFixes'][key][subkey]

class ScrapeAll:
    def __init__(self):
        pass

    def run(self):
        print "Instantiating UndergradAll()"
        undergrad = UndergradAll()
        print "  Running UndergradAll()"
        undergrad.run()
        print "Instantiating LawschoolAll()"
        lawschool = LawschoolAll()
        lawschool.run()

class StaffBase:
    def __init__(self, filename):
        self.filename = filename
        self.key = remap.jaToEn(os.path.split(os.path.splitext(filename)[0])[1])
        self.data = {}
        self.config = ruamel.yaml.load(staffRecord, ruamel.yaml.RoundTripLoader)

    def getstaffdata(self):
        if not os.path.exists(self.teacher(self.key)):
            open(self.teacher(self.key), "w+").write(staffRecord)
        self.config = ruamel.yaml.load(open(self.teacher(self.key)), ruamel.yaml.RoundTripLoader)
        if not self.config:
            self.config = ruamel.yaml.load(staffRecord, ruamel.yaml.RoundTripLoader)


class LawschoolAll(ConfigPaths):
    def __init__(self):
        ConfigPaths.__init__(self)
        self.staffType = {
            "bk355": "LS",
            "bk1998": "PRO",
            "bk1997": "GSL",
            "bk1940": "OTHER"
        }

    def run(self):
        ifh = urlopen(self.ls.indexurl)
        page = ifh.read()
        ifh.close()
        doc = html5parser.fromstring(page)
        for blockid in self.staffType.keys():
            nodes = doc.xpath('//_:div[@id="%s"]//_:th//_:a' % blockid, namespaces=NS)
            data = []
            for node in nodes:
                data.append({
                    'href': node.attrib['href'],
                    'staffName': node.text,
                    'staffType': self.staffType[blockid]
                })
            for datum in data:
                if datum['href'].endswith('.pdf'):
                    staffscraper = Lawschool(datum)
                    staffscraper.run(staffName=datum['staffName'])
                elif datum['href'].endswith('.html'):
                    staffscraper = Lawschool(datum)
                    staffscraper.run()
                # Implicit continue

# 
# 

class Lawschool(StaffBase, ConfigPaths):
    def __init__(self, datum):
        filename = datum['href']
        self.staffType = datum['staffType']
        StaffBase.__init__(self, filename)
        ConfigPaths.__init__(self)
        print "DOING: ls " + self.staffType + " " + filename

    def multiscrape(self, name, shy=False):
        if shy and self.config.has_key(name) and self.config[name]['ja']:
            return
        if name != u'名前' and name != u'ふりがな':
            nodes = self.root.xpath("//_:li/_:strong[contains(text(), '%s')]/following-sibling::_:ul/_:li|//_:h4[contains(text(), '%s')]/following-sibling::_:p" % (name, name), namespaces=NS)
        else:
            nodes = self.root.xpath("//_:h3", namespaces=NS)
        if not nodes:
            return

        iterator = nodes[0].itertext()
        val = ''
        l = []
        while 1:
            try:
                val = iterator.next()
                val = re.sub(u'^[　 \r\n]+', '', val)
                val = re.sub(u'[　 \r\n]+$', '', val)
                if val:
                    l.append(val)
            except:
                break

        val = re.sub('^[　 \n]*(.*?)[　 \n]*$', '\\1', '\n'.join(l))
        
        val = val.strip()
        val = makeHankaku(val)
        
        if name == u'名前':
            lst = val.split('\n')
            if not self.config.has_key(name):
                self.config[name] = {}
            self.config[name]['ja'] = lst[0]
        elif name == u'ふりがな' and not shy:
            if not self.config.has_key(u'名前'):
                self.config[u'名前'] = {}
            lst = val.split('\n')
            if len(lst) > 1:
                suzure = lst[1].replace(u'　', '').replace(' ', '')
                self.config[u'名前']['kana'] = lst[1]
                self.config[u'名前']['en'] = titleCase(lst[1])
                self.config[u'並べ替え']['ja'] = romkan.to_katakana(romkan.to_kunrei(suzure))
                self.config[u'並べ替え']['en'] = romkan.to_roma(suzure)
            else:
                self.config[u'名前']['kana'] = ''
        elif name == u'所属':
            if not self.config.has_key(u'所属'):
                self.config[u'所属'] = {}
            if self.staffType == 'LS' or self.staffType == 'PRO':
                self.config[u'所属']['ja'] = u'法科大学院'
                self.config[u'所属']['en'] = 'Law School (professional course)'
        elif name == u'役職':
            if not self.config.has_key(u'役職'):
                self.config[u'役職'] = {}
            self.config[u'役職']['ja'] = getPostJapanese(val)
            self.config[u'役職']['en'] = getPostEnglish(self.config[u'役職']['ja'])
            
        elif name == u'所属学会':
            if not self.config.has_key(u'学会'):
                self.config[u'学会'] = {}
            if len(val.split('\n')) > 1:
                self.config[u'学会']['ja'] = val.split('\n')
            else:
                self.config[u'学会']['ja'] = val
        elif name == u'教員からのメッセージ':
            if not self.config.has_key(u'法科大学院メッセージ'):
                self.config[u'法科大学院メッセージ'] = {}
            self.config[u'法科大学院メッセージ']['ja'] = val.split('\n')
        elif name == u'リンク':
            for node in nodes:
                subnode = node.xpath('.//_:a[@href]', namespaces=NS)
                if subnode and len(subnode):
                    self.config[u'ホームページ']['ja'] = subnode[0].text
                    self.config[u'ホームページ'][u'リンク'] = subnode[0].attrib['href']
                    break
        else:
            if not self.config.has_key(name):
                self.config[name] = {}
            if len(val.split('\n')) > 1:
                self.config[name]['ja'] = val.split('\n')
                if name == u'専門分野' and self.config[name]['ja'][0]:
                    self.config[name]['en'] = fieldsMap[self.config[name]['ja'][0]]
            else:
                self.config[name]['ja'] = val
                if name == u'専門分野' and self.config[name]['ja']:
                    self.config[name]['en'] = fieldsMap[self.config[name]['ja']]


    def output(self):
        ruamel.yaml.dump(self.config, codecs.open(self.teacher(self.key), 'w+', 'utf8'), Dumper=ruamel.yaml.RoundTripDumper, allow_unicode=True)
        self.fixEndings(self.teacher(self.key))

    def run(self, staffName=None):
        self.getstaffdata()
        if staffName:
            if not self.config.has_key(u'名前'):
                self.config[u'名前'] = {}
            print "Recording " + staffName
            self.config[u'名前']['ja'] = staffName
        else:
            mypath = self.filename
            if not self.filename.startswith('http'):
                mypath = os.path.join(self.ls.baseurl, self.filename)
            ifh = urlopen(mypath)
            page = ifh.read()
            self.root = html5parser.fromstring(page)
            
            self.multiscrape(u'名前')
            self.multiscrape(u'ふりがな')
            self.multiscrape(u'役職')
            self.multiscrape(u'所属')
            self.multiscrape(u'所属学会')
            self.multiscrape(u'専門分野')
            self.multiscrape(u'研究テーマ')
            self.multiscrape(u'教員からのメッセージ')
            self.multiscrape(u'略歴')
            self.multiscrape(u'主要業績')
            self.multiscrape(u'リンク')
        applyNamePatches(self.config, self.key)
        self.output()

class UndergradAll(ConfigPaths):

    def __init__(self):
        ConfigPaths.__init__(self)
        
    def run(self):
        ifh = urlopen(self.ug.indexurl)
        page = ifh.read()
        ifh.close()
        doc = html5parser.fromstring(page)
        nodes = doc.xpath('//_:th/_:a[@href]', namespaces=NS)
        data = []
        for node in nodes:
            data.append({
                'href': node.attrib['href']
            })
        #if len(data) == 0:
            #print page
            #print len(nodes)
            #print "*** Nothing found. Check the xpath against the source."
        for datum in data:
            if not datum['href'].endswith('.html'): continue
            staffscraper = Undergrad(datum['href'])
            staffscraper.run()
        #sys.exit()

class Undergrad(StaffBase, ConfigPaths):
    def __init__(self, filename):
        StaffBase.__init__(self, filename)
        ConfigPaths.__init__(self)
        print "DOING ug: " + filename
        ifh = urlopen(self.ug.staffUrl(filename))
        page = ifh.read()
        self.root = html5parser.fromstring(page)
        #print self.ug.staffUrl(filename)

    def multiscrape(self, name, shy=False):
        if shy and self.config.has_key(name) and self.config[name]['ja']:
            return
        if name != u'名前' and name != u'ふりがな':
            nodes = self.root.xpath("//_:h4[contains(text(), '%s')]/following-sibling::_:p" % name, namespaces=NS)
        else:
            nodes = self.root.xpath("//_:h3", namespaces=NS)
        if not nodes:
            return

        iterator = nodes[0].itertext()
        val = ''
        l = []
        while 1:
            try:
                val = iterator.next()
                val = re.sub(u'^[　 \r\n]+', '', val)
                val = re.sub(u'[　 \r\n]+$', '', val)
                if val:
                    l.append(val)
            except:
                break

        val = re.sub('^[　 \n]*(.*?)[　 \n]*$', '\\1', '\n'.join(l))

        val = val.strip()
        val = makeHankaku(val)

        if name == u'名前':
            lst = val.split('\n')
            if not self.config.has_key(name):
                self.config[name] = {}
            self.config[name]['ja'] = lst[0]
        elif name == u'ふりがな' and not shy:
            if not self.config.has_key(u'名前'):
                self.config[u'名前'] = {}
            lst = val.split('\n')
            if len(lst) > 1:
                suzure = lst[1].replace(u'　', '').replace(' ', '')
                self.config[u'名前']['kana'] = lst[1]
                self.config[u'名前']['en'] = titleCase(romkan.to_hepburn(lst[1].replace(u'　', ' ')))
                self.config[u'並べ替え']['ja'] = romkan.to_katakana(romkan.to_kunrei(suzure))
                self.config[u'並べ替え']['en'] = romkan.to_roma(suzure)
            else:
                self.config[u'名前']['kana'] = ''
        elif name == u'教員からのメッセージ':
            if not self.config.has_key(u'学部メセージ'):
                self.config[u'学部メッセージ'] = {}
            self.config[u'学部メッセージ']['ja'] = val.split('\n')
        elif name == u'役職':
            if not self.config.has_key(u'役職'):
                self.config[u'役職'] = {}
            self.config[u'役職']['ja'] = getPostJapanese(val)
            self.config[u'役職']['en'] = getPostEnglish(self.config[u'役職']['ja'])
        elif name == u'主要':
            if len(val.split('\n')) > 1:
                self.config[u'主要業績']['ja'] = val.split('\n')
            else:
                self.config[u'主要業績']['ja'] = val
            
            
        else:
            if not self.config.has_key(name):
                self.config[name] = {}
            if len(val.split('\n')) > 1:
                self.config[name]['ja'] = val.split('\n')
                if name == u'専門分野' and self.config[name]['ja'][0]:
                    self.config[name]['en'] = fieldsMap[self.config[name]['ja'][0]]
            else:
                self.config[name]['ja'] = val
                if name == u'専門分野' and self.config[name]['ja']:
                    self.config[name]['en'] = fieldsMap[self.config[name]['ja']]

    def output(self):
        ruamel.yaml.dump(self.config, codecs.open(self.teacher(self.key), 'w+', 'utf8'), Dumper=ruamel.yaml.RoundTripDumper, allow_unicode=True)
        self.fixEndings(self.teacher(self.key))
    
    def run(self):
        self.getstaffdata()
        ifh = urlopen(os.path.join(self.ug.baseurl, self.filename))
        page = ifh.read()
        self.root = html5parser.fromstring(page)

        self.multiscrape(u'名前')
        self.multiscrape(u'ふりがな')
        self.multiscrape(u'役職')
        self.multiscrape(u'専門分野')
        self.multiscrape(u'研究テーマ')
        self.multiscrape(u'学会')
        self.multiscrape(u'略歴')
        self.multiscrape(u'教員からのメッセージ')
        self.multiscrape(u'主要')
        applyNamePatches(self.config, self.key)
        self.output()


if __name__ == "__main__":

    from optparse import OptionParser

    os.environ['LANG'] = "en_US.UTF-8"

    usage = './tools/scrape.py'

    description="Scrapes data from Japanese staff pages live on 2016-07-22"

    parser = OptionParser(usage=usage,description=description,epilog="Happy grinding!")

    (opt, args) = parser.parse_args()

    scraper = ScrapeAll()
    scraper.run()

