#!/usr/bin/python
#-*- encoding: utf-8 -*-

import os,sys
from ConfigParser import SafeConfigParser
import codecs
from docutils import core
from pth import ConfigPaths

varMap = {
    u'名前': 'name',
    u'役職': 'post',
    u'専門分野・担当': 'specialism',
    u'研究テーマ': 'interests',
    u'学会': 'societies',
    u'略歴': 'history',
    u'著書・編書': 'books',
    u'論文': 'articles',
    u'教員からのメッセージ': 'message',
    u'並べ替えキー': 'sortkey',
    u'研究室': 'office',
    u'メール': 'email', 
    u'電話': 'tel',
    u'学生相談': 'officehours',
    u'資格': 'qualification'
}

class StaffUtil(ConfigPaths):
    def __init__(self, lang):
        ConfigPaths.__init__(self)
        self.data = {}
        self.lang = lang
        self.emptyVars = {}
        for filename in os.listdir(self.teacher(None)):
            if not filename.endswith('.txt'): continue
            filename = os.path.splitext(filename)[0]
            config = self.loadOne(filename)
            self.extractVariables(filename, config)
        self.decorateMultiline()


    def reST_to_html_fragment(self, a_str):
        parts = core.publish_parts(
            source=a_str,
            writer_name='html')
        return parts['body_pre_docinfo']+parts['fragment']
            
    def loadOne(self, filename):
        config = SafeConfigParser()
        with codecs.open(self.teacher(filename), 'r', encoding='utf-8') as f:
            config.readfp(f)
        return config
    
    def extractVariables(self, filename, config):
        self.data[filename] = {
            "filename": filename
        }
        for key in varMap:
            if config.has_section(key):
                self.data[filename][varMap[key]] = config.get(key, self.lang).strip()
                if key == u'名前':
                    self.data[filename]['kana'] = config.get(key, 'kana').strip()
            else:
                self.data[filename][varMap[key]] = ''

    def decorateMultiline(self):
        for filename in self.data.keys():
            for key in self.data[filename].keys():
                if not self.data[filename][key].strip():
                    self.emptyVars[key] = True
                if self.data[filename][key].count('\n') > 0:
                    lst = self.data[filename][key].split('\n')
                    for i in range(0, len(lst), 1):
                        if key == 'history' or key == 'books' or key == 'articles':
                            lst[i] = '<div>%s</div>' % lst[i]
                        else:
                            lst[i] = '　%s<br/>' % lst[i]
                    val = '\n'.join(lst)
                    self.data[filename][key] = val
                elif key == 'history' or key == 'books' or key == 'articles':
                    if self.lang == 'ja':
                        self.data[filename][key] = "<div>%s</div>" % self.data[filename][key]
