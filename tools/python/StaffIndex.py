#!/usr/bin/python
#-*- encoding: utf-8 -*-

import os,sys,ConfigParser,re
from pth import ConfigPaths
from StaffNamesMess import NameRemapper

remap = NameRemapper()

data = {
    'professor': [],
    'adjunct': [],
    'associate_professor': [],
    'lecturer': []
}

markup_ja = '''
<tr><th><a href="%s">%s</th><td><div class="balloon">%s</div></td></tr>
'''.strip()

markup_en = '''
<li><div class="sbox1"><a class="fullname" onmouseover="document.body.style.cursor='pointer';" onmouseout="document.body.style.cursor='default';" onClick="kyoinPopup('/en/faculty/member/gsli%s.html');return false;" href="/en/faculty/member/gsli%s.html">%s</a><div class="status">%s</div><div class="interests" style="padding-left:1em;padding-right:4px;">%s</div></div></li>
'''.strip()

class StaffIndex(ConfigPaths):
    def __init__(self, lang):
        ConfigPaths.__init__(self)
        self.lang = lang

    def load(self):
        for filename in os.listdir(self.teacher(None)):
            if not filename.endswith('.txt'): continue
            filename = filename[0:-4]
            print filename
            config = ConfigParser.ConfigParser()
            config.readfp(open(self.teacher(filename)))
            name = config.get('名前', self.lang)
            sortkey = config.get('並べ替え', self.lang)
            field = config.get('専門分野・担当', self.lang)
            post = config.get('役職', 'ja')
            qualification = config.get('資格', self.lang)
            if self.lang == 'en' and not qualification:
                qualification = config.get('資格', 'ja')
            bundle = {
                'sortkey': sortkey,
                'name': name,
                'field': field,
                'filename': ''
            }
            if self.lang == 'ja':
                bundle['filename'] = "%s.html" % remap.enToJa(filename)
                bundle['post'] = post
            else:
                bundle['filename'] = filename
                bundle['post'] = remap.jaToEn(post)

            if not qualification:
                if post == '教授':
                    data['professor'].append(bundle)
                elif post == '准教授':
                    data['associate_professor'].append(bundle)
                elif post == '講師':
                    data['lecturer'].append(bundle)
                else:
                    print 'ERROR: invalid entry'
                    sys.exit()
            else:
                if not bundle['field']:
                    bundle['field'] = qualification
                    data['adjunct'].append(bundle)

    def sort(self):

        def sortfunc(a, b):
            if a['sortkey'] > b['sortkey']:
                return 1
            elif a['sortkey'] < b['sortkey']:
                return -1
            else:
                return 0
        for key in data.keys():
            data[key].sort(sortfunc)

    def output(self):
        for key in data.keys():
            lines = []
            for line in data[key]:
                if self.lang == 'ja':
                    lines.append(markup_ja % (line['filename'], line['name'], line['field']))
                else:
                    lines.append(markup_en % (line['filename'], line['filename'], line['name'], line['post'], line['field']))
            if self.lang == 'ja':
                data[key] = '\n'.join(lines)
            else:
                data[key] = ''.join(lines)
        page = open('themes/gsl-staff-index-%s/layout.html' % self.lang).read()
        for key in data.keys():
            page = re.sub('{{ %s }}' % key, data[key], page)

        open(self.build('index.html'), 'w+').write(page)

    def run(self):
        self.load()
        self.sort()
        self.output()

if __name__ == "__main__":

    from optparse import OptionParser

    os.environ['LANG'] = "en_US.UTF-8"

    usage = './tools/StaffIndex.py'

    description="Generate staff index file for a language"

    parser = OptionParser(usage=usage,description=description,epilog="Happy grinding!")

    parser.add_option("-l", "--language", dest="lang",
                      default="en",
                      help='Language to generate. Valid entries are "en" (default), and "ja"')

    (opt, args) = parser.parse_args()

    if not (opt.lang == 'en' or opt.lang == 'ja'):
        print 'Invalid option: -l must be one of "en" or "ja"'
        sys.exit()

    indexpage = StaffIndex(opt.lang)
    indexpage.run()
