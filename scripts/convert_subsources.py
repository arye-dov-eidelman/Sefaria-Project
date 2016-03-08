# -*- coding: utf-8 -*-
"""
Convert subsources to regular sources with an indentation level.

Needs to be run multiple times for subsources nested within subsources. 9i.e. no recursion built in.
"""
import sys
import os
import itertools



path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, path)
sys.path.insert(0, path + "/sefaria")

from sefaria.system.database import db

#sheets = db.sheets.find({"sources.subsources": { $exists: true } })

sheets = db.sheets.find({ "id": 876 })


for sheet in sheets:
	olddoc = sheet;
	newdoc = {};
	newsource = [];
	oldsources = olddoc["sources"];

	for source in oldsources:
		subsourcestoadd = []
		if "subsources" in source:
			for subsource in source["subsources"]:
				if source["options"]["indented"] == "indented-3":
					subsource["options"]["indented"] = "indented-3"
				elif source["options"]["indented"] == "indented-2":
					subsource["options"]["indented"] = "indented-3"
				elif source["options"]["indented"] == "indented-1":
					subsource["options"]["indented"] = "indented-2"
				else:
					subsource["options"]["indented"] = "indented-1"
					
					
				subsourcestoadd.append(subsource)
			del source["subsources"]
		
		newsource.append(source)
		newsource.extend(subsourcestoadd)
		
	newdoc = olddoc
	newdoc["sources"] = newsource




#	print newdoc

	db.sheets.update({'_id': olddoc["_id"]}, newdoc );
	
