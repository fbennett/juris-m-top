#!/usr/bin/env python3

import sys
import os

curpath = os.path.dirname(os.path.realpath(__file__))

from pdfrw import PdfReader, PdfWriter
from pdfrw.findobjs import find_objects
from pdfrw.objects import PdfName

for annot in find_objects(
  PdfReader(os.path.join(curpath, "libreform.pdf")).pages, 
  valid_types=(PdfName.XObject,PdfName.Annot,), 
  valid_subtypes=(PdfName.Widget,)
):
  if (annot.FT == '/Btn'):
    AP = annot.AP
    print(AP)

outfn = sys.argv[2]
inpfn = sys.argv[1]
pdf = PdfReader(inpfn)
pages = pdf.pages
for annot in find_objects(
  pages, 
  valid_types=(PdfName.XObject, None), 
  valid_subtypes=(PdfName.Widget,)
):
  if (annot.FT == '/Btn'):
    annot.AP = AP
    annot.Type = "/Annot"
    print(annot)

writer = PdfWriter(outfn, trailer=pdf)
writer.write()
