#!/usr/bin/python
#-*- encoding: utf-8 -*-

import os,sys
import ConfigParser
from pth import ConfigPaths
import csv

data = {
    '名前': [],
    '並べ替え': [],
    '役職': [],
    '資格': [],
    '学生相談': [],
    '専門分野・担当': [],
    '研究テーマ': [],
    '学会': [],
    '略歴': [],
    '教員からのメッセージ': []
}

class Splits(ConfigPaths):
    def __init__(self):
        ConfigPaths.__init__(self)
        self.lst = []
        for filename in os.listdir(self.teacher(None)):
            self.lst.append(filename)
        self.lst.sort()



    def run(self):
        for filename in self.lst:
            if not filename.endswith('.txt'): continue
            filename = filename[0:-4]
            print filename
            config = ConfigParser.ConfigParser()
            config.readfp(open(self.teacher(filename)))
            for section in data.keys():
                if config.has_section(section) and  config.has_option(section, 'ja'):
                    data[section].append([filename, config.get(section, 'ja')])
                else:
                    data[section].append("")

            for section in data:
                csv.writer(open(self.csv(section), "w+")).writerows(data[section])

if __name__ == "__main__":

    from optparse import OptionParser

    os.environ['LANG'] = "en_US.UTF-8"

    usage = './tools/csvsplits.py'

    description="Splits Japanese field data to CSV for translation maintenance"

    parser = OptionParser(usage=usage,description=description,epilog="Happy grinding!")

    (opt, args) = parser.parse_args()

    splits = Splits()
    splits.run()
