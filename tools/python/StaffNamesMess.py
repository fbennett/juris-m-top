import json
from pth import ConfigPaths

myfh = open("dump.txt", "w+");

class NameRemapper(ConfigPaths):
    def __init__(self):
        ConfigPaths.__init__(self)
        self.mainmap = {}
        self.lawschoolmap = {}
        self.revmap = {}
        self.initNames()
        self.initPosts()

    def initNames(self):
        mymap = json.loads(open(self.tools('staffMap.json')).read())
        for key in mymap:
            myfh.write(key+'\n')
            self.mainmap[key] = mymap[key]["ja_filename"]
            if mymap[key].has_key("ls_filename"):
                self.lawschoolmap[key] = mymap[key]["ls_filename"]
            else:
                self.lawschoolmap[key] = mymap[key]["ja_filename"]
        for key in mymap:
            self.revmap[mymap[key]['ja_filename']] = key
            if mymap[key].has_key("ls_filename"):
                self.revmap[mymap[key]['ls_filename']] = key
        
    def initPosts(self):
        mymap = json.loads(open(self.tools('postsMap.json')).read())
        for key in mymap:
            self.mainmap[mymap[key].encode('utf-8')] = key.encode('utf-8')
        for key in mymap:
            self.revmap[key.encode('utf-8')] = mymap[key].encode('utf-8')
        
    def enToJa(self, ekey):
        return self.mainmap[ekey]

    def enToLS(self, ekey):
        return self.lawschoolmap[ekey]

    def jaToEn(self, jkey):
        return self.revmap[jkey]
