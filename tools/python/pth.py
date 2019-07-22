'''
  Pth: return the parent path of the script
'''
import os,sys,re
import ConfigParser

defaultconfig = '''
[Undergrad]
baseurl = http://law.nagoya-u.ac.jp/teacher
indexurl = http://law.nagoya-u.ac.jp/teacher/index.html

[Lawschool]
baseurl = http://www.law.nagoya-u.ac.jp/ls/teacher
indexurl = http://www.law.nagoya-u.ac.jp/ls/teacher/index.html
'''

class ConfigUrls:
    def __init__(self, config, section):
        self.indexurl = config.get(section, 'indexurl')
        self.baseurl = config.get(section, 'baseurl')

    def staffUrl(self, filename):
        return os.path.join(self.baseurl, filename)

class ConfigPaths:
    def __init__(self):
        self.pathbase = os.path.abspath(
            os.path.join(
                os.path.split(
                    os.path.abspath(sys.argv[0])
                )[0],
                '..',
                '..'
            )
        )
        #print self.pathbase
        self.setConfig()

    def setConfig(self):
        configbase = os.path.join(self.pathbase, 'tools', 'python', 'config')
        if not os.path.exists(configbase):
            os.mkdir(configbase)
        configpath = os.path.join(configbase, 'gslweb.txt')
        if not os.path.exists(configpath):
            open(configpath, 'w+').write(defaultconfig)
        config = ConfigParser.SafeConfigParser()
        config.readfp(open(configpath))
        self.ug = ConfigUrls(config, 'Undergrad')
        self.ls = ConfigUrls(config, 'Lawschool')

    def teacher(self, key):
        path = os.path.join('home', , 'bennett', 'ownCloud', '法学部教員情報')
        if not os.path.exists(path):
            os.mkdir(path)
        if key:
            return os.path.join(path, "%s.yml" % key)
        else:
            return path

    def csv(self, key):
        path = os.path.join(self.pathbase, 'csv')
        if not os.path.exists(path):
            os.mkdir(path)
        if key:
            return os.path.join(path, "%s.csv" % key)
        else:
            return path

    def build(self, key):
        path = os.path.join(self.pathbase, 'build')
        if not os.path.exists(path):
            os.mkdir(path)
        if key:
            return os.path.join(path, key)
        else:
            return path

    def nodejs(self, filename):
        path = os.path.join(self.pathbase, 'nodejs')
        if filename:
            return os.path.join(path, filename)
        else:
            return path

    def tools(self, elem):
        return os.path.join(self.pathbase, 'tools', 'python', elem)

    def source(self, key):
        path = os.path.join(self.pathbase, 'source')
        if not os.path.exists(path):
            os.mkdir(path)
        if key:
            return os.path.join(path, "%s.rst" % key)
        else:
            return path

    def fixEndings(self, filepath):
        #print filepath
        txt = open(filepath, 'r').read()
        # Force DOS line endings
        txt = re.sub('(?:\r\n)', '\n', txt)
        txt = re.sub('(?:\r)', '\n', txt)
        txt = re.split('[\n]', txt)
        txt = '\r\n'.join(txt)
        open(filepath, 'wb').write(txt)
