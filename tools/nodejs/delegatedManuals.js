var fs = require('fs');
var path = require('path');
var nunjucks = require('nunjucks');
var csv = require('csv');
var scriptDir = path.dirname(require.main.filename);
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));
nunjucks.configure({
    lstripBlocks: true,
    trimBlocks: true
});
nunjucks.configure(p.templates, { autoescape: true });


var nussFormsStub = path.join(scriptDir, '..', '..', 'src', 'forms');
if (fs.statSync(nussFormsStub).isFile()) {
    nussFormsStub = fs.readFileSync(nussFormsStub).toString();
}
var nussDocumentsStub = path.join(scriptDir, '..', '..', 'src', 'documents');
if (fs.statSync(nussDocumentsStub).isFile()) {
    var nussDocumentsStub = fs.readFileSync(nussDocumentsStub).toString();
}

function generateReport(opts) {
    csv.parse(fs.readFileSync(path.join(scriptDir, "..", "..", "docs", "delegationManuals", "src", "document-and-link-listing.csv")), function(err, rows) {
        var data = {};
        var colNameList = [
            "doc_name",
            "language",
            "label",
            "doc_type",
            "archive_tanto",
            "update_req_date",
            "rev_tanto",
            "rev_deadline_date",
            "uploader",
            "top_fileid",
            "document_fileid",
            "description"
        ];
        var colLabelList = rows[0].slice();
        var monthList = [4,5,6,7,8,9,10,11,12,1,2,3];
        var colMap = {};
        for (var i=0,ilen=colNameList.length; i<ilen; i++) {
            colMap[colNameList[i]] = colLabelList[i];
        }
        var keynum = 0;
        for (var row of rows.slice(1)) {
            if (opts.tantousha && opts.tantousha !== row[9]) continue;
            if (!row[9]) continue;
            keynum++;
            var tanto = row[9];
            if (!data[tanto]) {
                data[tanto] = [];
            }
            // Ooh, this is crappy. Forms/Documents dirs could begin with anything.
            if (row[12].slice(0, 5) === "forms") {
                var descriptionPath = path.join(nussFormsStub, row[12].slice(5), "DESCRIPTION.txt");
            } else if (row[12].slice(0, 9) === "documents") {
                var descriptionPath = path.join(nussDocumentsStub, row[12].slice(9), "DESCRIPTION.txt");
            }
            if (fs.existsSync(descriptionPath)) {
                var description = fs.readFileSync(descriptionPath).toString();
            } else {
                console.log("Oops. No DESCRIPTION.txt where there should be one: " + descriptionPath);
                process.exit();
            }
            data[tanto].push(
                {
                    doc_name: row[0],
                    language: row[2],
                    label: row[3].replace("\n", "/"),
                    doc_type: row[4],
                    archive_tanto: row[5],
                    update_req_date: row[6],
                    rev_tanto: row[7],
                    rev_deadline_date: row[8],
                    uploader: row[9],
                    top_url: "https://nuss.nagoya-u.ac.jp/index.php/apps/files/?fileid=" + row[10],
                    document_url: "https://nuss.nagoya-u.ac.jp/index.php/apps/files/?fileid=" + row[11],
                    description: description,
                    entrykey: ("ch" + keynum)
                }
            );
        }
        for (var key in data) {
            console.log("writing "+key+".org");
            data[key].sort(function(a, b){
                if (a.update_req_date > b.update_req_date) {
                    return 1;
                } else if (a.update_req_date < b.update_req_date) {
                    return -1;
                } else {
                    return 0;
                }
            });
            var params = {
                recipient: key,
                col_map: colMap,
                info: data[key]
            };
            var txt = nunjucks.render("delegationManual.org", params);
            txt = txt.replace(/\|\|\|([^\|]+)\|\|\|/g, "{{{$1}}}")
            txt = txt.replace(/\|([^\|]+)\|/g, "{$1}")
            fs.writeFileSync(path.join(scriptDir, "..", "..", "docs", "delegationManuals", "raw", key + ".org"), txt.toString());
        }
    });
}

/*
 * Main
 */

var opt = require('node-getopt').create([
  ['t' 		, 'tantousha=ARG' , 'Person or center responsible for direct maintenance.'],
  ['h' 		, 'help'                , 'display this help']
])              // create Getopt instance
.bindHelp()     // bind option 'help' to default action
.parseSystem(); // parse command line

//if (!opt.options.tantousha) {
//    console.log("Error: -t argument is required.");
//    process.exit()
//}

generateReport(opt.options);
