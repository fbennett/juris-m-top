#!/usr/bin/python
#-*- encoding: utf-8 -*-

import os,sys
import subprocess
from staffutil import StaffUtil
from StaffNamesMess import NameRemapper
from StaffIndex import StaffIndex


remap = NameRemapper()

class StaffData(StaffUtil):

    def __init__(self, lang):
        StaffUtil.__init__(self, lang)
        print self.data.keys()

    def purgeOldFiles(self):
        for filename in os.listdir(self.source(None)):
            if not filename.endswith('.rst'): continue
            if filename == 'deleteme.rst': continue
            filename = filename[0:-4]
            os.unlink(self.source(filename))
        # Remove cache and member build subdirectories and their contents if present
        if os.path.exists(self.build('member')):
            for filename in os.listdir(self.build('member')):
                if not filename.endswith('.html'): continue
                if filename == 'index.html': continue
                os.unlink(os.path.join(self.build('member'), filename))
            os.rmdir(self.build('member'))
        if os.path.exists(self.build('cache')):
            for filename in os.listdir(self.build('cache')):
                if not filename.endswith('.html'): continue
                if filename == 'index.html': continue
                os.unlink(os.path.join(self.build('cache'), filename))
            os.rmdir(self.build('cache'))
        # Then remove the parent
        for filename in os.listdir(self.build(None)):
            if not filename.endswith('.html'): continue
            if filename == 'index.html': continue
            os.unlink(self.build(filename))
        
    
    def setSourceFiles(self):
        for filename in self.data.keys():
            print filename
            name = self.data[filename]['name']
            line = '-' * len(name)
            txt = '%s\n%s\n%s\n' % (line, name, line)
            if self.lang == 'ja':
                filename = remap.enToJa(filename)
                open(self.source(filename), 'w+').write(txt)
            else:
                open(self.source("gli%s" % filename), 'w+').write(txt)
                

    def getVariables(self, uid):
        variables = []
        for key in self.data[uid]:
            variables.append('-A')
            #if self.data[uid][key].count('=') > 0:
            #    print "ERROR processing '%s' in teacher/%s.txt. Field values cannot contain the '=' sign." % (key, uid)
            #    print self.data[uid][key]
            #    sys.exit()
            variables.append('%s=%s' % (key, self.data[uid][key]))
        return variables

    def writeStaffPages(self, pagemode=None):
        if pagemode:
            builddir = os.path.join('build', pagemode)
        else:
            builddir = 'build'
        for key in self.emptyVars.keys():
            print key
        for filename in os.listdir(self.source(None)):
            if not filename.endswith('.rst'): continue
            if filename == 'deleteme.rst': continue
            filename = filename[0:-4]
            if self.lang == 'ja':
                uid = remap.jaToEn(filename)
            else:
                uid = filename[3:]
            variables = self.getVariables(uid)
            path = self.source(filename)
            print "BUILDING: %s" % filename
            args = ['sphinx-build']
            args.extend(['-d', './.doctrees'])
            if pagemode:
                args.extend(['-A', 'pagemode=%s' % pagemode])
            args.extend(['-D', 'html_theme=gsl-staff-profiles-%s' % self.lang])
            args.extend(variables)
            args.extend(['source'])
            args.extend([builddir])
            args.extend([path])
            subprocess.call(args)

    def _tidyUpAfter(self, targetdir):
        strayDirs = ['_sources', '_static']
        strayFiles = ['deleteme.html', 'search.html', 'searchindex.js', 'objects.inv', '.buildinfo']
        for d in strayDirs:
            fulldir = os.path.join(targetdir, d)
            if os.path.exists(fulldir):
                for f in os.listdir(fulldir):
                    os.unlink(os.path.join(fulldir, f))
                os.rmdir(fulldir)
        for f in strayFiles:
            fullfilepath = os.path.join(targetdir, f)
            if os.path.exists(fullfilepath):
                os.unlink(fullfilepath)

    def tidyUpAfter(self):
        for d in [self.build(None), self.build('member'), self.build('cache')]:
            self._tidyUpAfter(d)

    def run(self):
        self.purgeOldFiles()
        self.setSourceFiles()
        if self.lang == 'en':
            self.writeStaffPages(pagemode='member')
            self.writeStaffPages(pagemode='cache')
        else:
            self.writeStaffPages()
        indexpage = StaffIndex(self.lang)
        indexpage.run()
        self.tidyUpAfter()

if __name__ == "__main__":

    from optparse import OptionParser

    os.environ['LANG'] = "en_US.UTF-8"

    usage = './tools/staffProfiles.py -l <language_code>'

    description="Generate Japanese or English website pages from CFG files"

    parser = OptionParser(usage=usage,description=description,epilog="Happy grinding!")

    # Language will be one option, there may be others.
    parser.add_option("-l", "--lang", dest="lang",
                      default=None,
                      help='Set the output language (required)')

    (opt, args) = parser.parse_args()

    if opt.lang not in ['ja', 'en']:
        parser.print_help()
        sys.exit()

    staffdata = StaffData(opt.lang)
    staffdata.run()
